import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { prisma } from "../../../lib/prisma";
import { atualizarStatusPedido } from "../../../app/admin/pedidos/actions";
import { criarPedidoLojista, confirmarVendaLojista } from "../../../app/lojista/painel/actions";
import { registrarIntencaoCompraCarrinho } from "../../../app/produtos/actions";
import { calcularFinanceiro } from "../../../lib/financeiro";

// Configura o banco local isolando do cache
const globalStore = globalThis as any;
const storePath = join(process.cwd(), ".data", "store.json");
let originalStoreBackup = "";

function cleanCache() {
  globalStore.memoryDb = undefined;
  globalStore.storeLoaded = false;
  globalStore.loadingStore = undefined;
  globalStore.lastLoadedAt = undefined;
}

// Backup da base atual
if (existsSync(storePath)) {
  originalStoreBackup = readFileSync(storePath, "utf8");
}

async function main() {
  console.log("=== INICIANDO VERIFICAÇÃO DOS AJUSTES DOS FLUXOS (CODEX) ===");

  // 1. Limpa banco de teste
  cleanCache();
  const emptyDb = {
    rows: {
      Produto: [],
      Pedido: [],
      Usuario: [],
      Despesa: [],
      FechamentoMensal: [],
      LancamentoFinanceiro: [],
      FechamentoFinanceiro: [],
      Lead: [],
    },
    seq: {
      Produto: 0,
      Pedido: 0,
      Usuario: 0,
      Despesa: 0,
      FechamentoMensal: 0,
      LancamentoFinanceiro: 0,
      FechamentoFinanceiro: 0,
      Lead: 0,
    }
  };
  writeFileSync(storePath, JSON.stringify(emptyDb, null, 2));
  cleanCache();

  // 2. Setup dos dados
  // Lojista: ID 1
  const lojista = await prisma.usuario.create({
    data: {
      nome: "Lojista Teste",
      email: "lojista@teste.com",
      senha: "123",
      tipo: "lojista",
      status: "aprovado",
      codigoRevenda: "LOJ10",
      estoquePessoal: {},
      limiteAprovado: 5000,
    }
  });

  // Produto: ID 1, estoque global inicial do ADM = 15
  const produto = await prisma.produto.create({
    data: {
      nome: "Perfume Importado Teste",
      marca: "Marca Teste",
      categoria: "Perfume",
      volume: "100ml",
      preco: 300,        // Varejo
      precoAtacado: 200, // Atacado
      estoque: 15,       // Estoque do ADM
      estoqueLojista: 15,
    }
  });

  const prodId = produto.id;

  console.log(`\n[SETUP] Produto cadastrado: ${produto.nome} (ID: ${prodId})`);
  console.log(`  Estoque Global ADM Inicial: ${produto.estoque}`);

  // Simular sessão
  globalStore.mockSession = { id: lojista.id, nome: lojista.nome };

  // ─────────────────────────────────────────────────────────────────────────────
  // FLUXO 1: Lojista compra do Fornecedor/ADM (Atacado)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- VERIFICANDO FLUXO 1: Lojista compra do Fornecedor/ADM (Atacado) ---");
  
  // Criar pedido de 5 unidades via Action real de lojista
  const formDataF1 = new FormData();
  formDataF1.append("produtoId", String(prodId));
  formDataF1.append("quantidade", "5");
  formDataF1.append("pagamento", "Pedido ao fornecedor");
  
  const resF1 = await criarPedidoLojista(formDataF1);
  if (!resF1.success) {
    throw new Error(`Falha ao criar pedido lojista: ${resF1.error}`);
  }

  let prodAposCriarF1 = await prisma.produto.findUnique({ where: { id: prodId } });
  let lojAposCriarF1 = await prisma.usuario.findUnique({ where: { id: lojista.id } });
  let pedidoF1 = await prisma.pedido.findFirst({ where: { usuarioId: lojista.id, tipoFluxo: "compra_fornecedor" } });

  console.log(`[Lojista enviou pedido F1] Status inicial: ${pedidoF1?.status}, observacao: ${pedidoF1?.observacao}`);
  console.log(`  Estoque Global ADM: ${prodAposCriarF1?.estoque} (Esperado: 10)`);
  console.log(`  Estoque Pessoal Lojista: ${JSON.stringify(lojAposCriarF1?.estoquePessoal)} (Esperado: {"${prodId}":5})`);

  // Admin altera status para 'pago' (financeiro registra pago, estoque não duplica)
  const formDataAdminF1 = new FormData();
  formDataAdminF1.append("pedidoId", String(pedidoF1?.id));
  formDataAdminF1.append("status", "pago");
  formDataAdminF1.append("desconto", "0");
  
  await atualizarStatusPedido(formDataAdminF1);

  let prodAposPagoF1 = await prisma.produto.findUnique({ where: { id: prodId } });
  let lojAposPagoF1 = await prisma.usuario.findUnique({ where: { id: lojista.id } });
  let pedidoF1Pago = await prisma.pedido.findUnique({ where: { id: pedidoF1?.id } });

  console.log(`[Admin atualizou F1 para PAGO] Status: ${pedidoF1Pago?.status}, observacao: ${pedidoF1Pago?.observacao}`);
  console.log(`  Estoque Global ADM: ${prodAposPagoF1?.estoque} (Esperado: 10)`);
  console.log(`  Estoque Pessoal Lojista: ${JSON.stringify(lojAposPagoF1?.estoquePessoal)} (Esperado: {"${prodId}":5})`);
  console.log(`  Financeiro: Pago = R$ ${pedidoF1Pago?.totalPagoFornecedor}, Saldo em aberto = R$ ${pedidoF1Pago?.saldoFornecedor} (Esperado: Pago=1000, Saldo=0)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // FLUXO 2: Cliente compra via QR Code do Lojista (venda_qr)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- VERIFICANDO FLUXO 2: Cliente compra via QR Code do Lojista ---");
  
  // Utilizando registrarIntencaoCompraCarrinho simulando QR
  const resIntencaoQR = await registrarIntencaoCompraCarrinho(
    [{ id: prodId, quantidade: 1 }],
    "LOJ10",
    null
  );
  if (!resIntencaoQR.success) {
    throw new Error(`Falha ao registrar intencao QR: ${resIntencaoQR.message}`);
  }

  let pedidoQR = await prisma.pedido.findFirst({ where: { usuarioId: lojista.id, tipoFluxo: "venda_qr" } });
  let prodAposCriarQR = await prisma.produto.findUnique({ where: { id: prodId } });
  let lojAposCriarQR = await prisma.usuario.findUnique({ where: { id: lojista.id } });

  console.log(`[Cliente abriu intenção QR] Status inicial: ${pedidoQR?.status}`);
  console.log(`  Estoque Global ADM: ${prodAposCriarQR?.estoque} (Esperado: 10 - nunca debita do fornecedor)`);
  console.log(`  Estoque Pessoal Lojista: ${JSON.stringify(lojAposCriarQR?.estoquePessoal)} (Esperado: {"${prodId}":5} - ainda não baixou)`);

  // Lojista confirma a venda aplicando desconto
  const formDataConfirmarQR = new FormData();
  formDataConfirmarQR.append("pedidoId", String(pedidoQR?.id));
  formDataConfirmarQR.append("pagamento", "Pix");
  formDataConfirmarQR.append("descontoValor", "20"); // R$ 20 de desconto

  const resConfirmarQR = await confirmarVendaLojista(formDataConfirmarQR);
  if (!resConfirmarQR.success) {
    throw new Error(`Falha ao confirmar venda lojista: ${resConfirmarQR.error}`);
  }

  let pedidoQRConfirmado = await prisma.pedido.findUnique({ where: { id: pedidoQR?.id } });
  let prodAposConfirmQR = await prisma.produto.findUnique({ where: { id: prodId } });
  let lojAposConfirmQR = await prisma.usuario.findUnique({ where: { id: lojista.id } });

  console.log(`[Lojista confirmou venda QR] Status final: ${pedidoQRConfirmado?.status}, Total Pago: ${pedidoQRConfirmado?.total}, Desconto: ${pedidoQRConfirmado?.descontoConcedido}`);
  console.log(`  Estoque Global ADM: ${prodAposConfirmQR?.estoque} (Esperado: 10)`);
  console.log(`  Estoque Pessoal Lojista: ${JSON.stringify(lojAposConfirmQR?.estoquePessoal)} (Esperado: {"${prodId}":4})`);

  // ─────────────────────────────────────────────────────────────────────────────
  // FLUXO 3: ADM Vende Direto para Cliente (intencao_site) com Lead
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- VERIFICANDO FLUXO 3: ADM Vende Direto para Cliente (Site Varejo) + Lead ---");

  const clienteInfo = {
    nome: "Cliente Varejo Teste",
    contato: "11999999999",
    cep: "01001-000",
    rua: "Praça da Sé",
    numero: "100",
    bairro: "Sé",
    cidade: "São Paulo",
    estado: "SP"
  };

  const resIntencaoSite = await registrarIntencaoCompraCarrinho(
    [{ id: prodId, quantidade: 1 }],
    null,
    clienteInfo
  );
  if (!resIntencaoSite.success) {
    throw new Error(`Falha ao registrar intencao Site: ${resIntencaoSite.message}`);
  }

  let pedidoSite = await prisma.pedido.findFirst({ where: { usuarioId: 0, tipoFluxo: "intencao_site" } });
  let prodAposCriarSite = await prisma.produto.findUnique({ where: { id: prodId } });
  let lojAposCriarSite = await prisma.usuario.findUnique({ where: { id: lojista.id } });
  let leadSite = await prisma.lead.findFirst({ where: { nome: "Cliente Varejo Teste" } });

  console.log(`[Cliente abriu intenção no Site] Status inicial: ${pedidoSite?.status}`);
  console.log(`  Estoque Global ADM: ${prodAposCriarSite?.estoque} (Esperado: 9 - debita na criação como reserva)`);
  console.log(`  Estoque Pessoal Lojista: ${JSON.stringify(lojAposCriarSite?.estoquePessoal)} (Esperado: {"${prodId}":4})`);
  console.log(`  Lead Criado: ${leadSite ? "SIM (Sucesso)" : "NÃO (Erro)"}`);
  if (leadSite) {
    console.log(`    Nome: ${leadSite.nome}, Contato: ${leadSite.contato}, Produtos: ${leadSite.produtos}, Total: ${leadSite.total}`);
  }

  // Admin atualiza status para 'entregue' (estoque não duplica)
  const formDataAdminSite = new FormData();
  formDataAdminSite.append("pedidoId", String(pedidoSite?.id));
  formDataAdminSite.append("status", "entregue");
  formDataAdminSite.append("desconto", "0");

  await atualizarStatusPedido(formDataAdminSite);

  let pedidoSiteEntregue = await prisma.pedido.findUnique({ where: { id: pedidoSite?.id } });
  let prodAposConfirmSite = await prisma.produto.findUnique({ where: { id: prodId } });

  console.log(`[Admin entregou pedido do Site] Status final: ${pedidoSiteEntregue?.status}`);
  console.log(`  Estoque Global ADM: ${prodAposConfirmSite?.estoque} (Esperado: 9)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // ESTORNO: Admin cancela o pedido do lojista F1 (Estorna o estoque)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- VERIFICANDO ESTORNO: Admin cancela o pedido do lojista F1 ---");

  const formDataCancelF1 = new FormData();
  formDataCancelF1.append("pedidoId", String(pedidoF1?.id));
  formDataCancelF1.append("status", "cancelado");
  formDataCancelF1.append("desconto", "0");

  await atualizarStatusPedido(formDataCancelF1);

  let prodAposCancelF1 = await prisma.produto.findUnique({ where: { id: prodId } });
  let lojAposCancelF1 = await prisma.usuario.findUnique({ where: { id: lojista.id } });
  let pedidoF1Cancelado = await prisma.pedido.findUnique({ where: { id: pedidoF1?.id } });

  console.log(`[Admin cancelou F1] Status: ${pedidoF1Cancelado?.status}, observacao: ${pedidoF1Cancelado?.observacao}`);
  console.log(`  Estoque Global ADM: ${prodAposCancelF1?.estoque} (Esperado: 14 - devolveu as 5 unidades do F1, menos a 1 do site = 14)`);
  console.log(`  Estoque Pessoal Lojista: ${JSON.stringify(lojAposCancelF1?.estoquePessoal)} (Esperado: {"${prodId}":0} -> pois removeu as 5, como tinha 4 de saldo devido à venda QR, ficou com 0)`);
}

main()
  .then(() => console.log("\n=== TESTE FINALIZADO COM SUCESSO! ==="))
  .catch((e) => {
    console.error("ERRO NO TESTE:", e);
    process.exit(1);
  })
  .finally(() => {
    // Restaurar base de dados original
    if (originalStoreBackup) {
      writeFileSync(storePath, originalStoreBackup, "utf8");
      console.log("\n[INFO] Base de dados restaurada para o estado original.");
    }
    cleanCache();
  });
