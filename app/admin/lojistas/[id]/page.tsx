import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, logoutAdmin } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { atualizarStatusPedido } from "../../pedidos/actions";
import { 
  registrarPagamentoFornecedor, 
  updateLojistaLimiteAction, 
  registrarPagamentoParcialLojistaAction, 
  quitarSaldoLojistaAction 
} from "../actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

const statusEmAberto = ["pendente fornecedor", "aguardando pagamento"];
const statusQuitados = ["pago", "enviado", "entregue"];
const statusFornecedor = ["pendente fornecedor", "aguardando pagamento", "pago", "enviado", "entregue", "cancelado"];

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default async function LojistaDetalhePage({ params }: PageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const lojistaId = Number(id);

  if (!lojistaId) {
    redirect("/admin/lojistas");
  }

  const lojista = await prisma.usuario.findUnique({
    where: { id: lojistaId },
  });

  if (!lojista || lojista.tipo !== "lojista") {
    redirect("/admin/lojistas");
  }

  const produtos = await prisma.produto.findMany({
    orderBy: { nome: "asc" },
  });

  const pedidos = await prisma.pedido.findMany({
    where: { usuarioId: lojista.id },
    orderBy: { createdAt: "desc" },
  });

  const produtoMap = new Map(produtos.map((produto: any) => [produto.id, produto]));
  const estoquePessoal = (lojista.estoquePessoal || {}) as Record<string, number>;
  const linkRevenda = lojista.codigoRevenda ? `https://mouratoassociados.com.br/r/${lojista.codigoRevenda}` : "";
  
  const comprasFornecedor = pedidos.filter((pedido: any) =>
    String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
    String(pedido.pagamento || "").includes("Pedido ao fornecedor") ||
    String(pedido.pagamento || "").includes("Compra do fornecedor") ||
    pedido.status === "pendente fornecedor"
  );
  
  const vendasCliente = pedidos.filter((pedido: any) =>
    String(pedido.tipoFluxo || "") === "venda_qr" ||
    String(pedido.pagamento || "").includes("Venda via QR do lojista")
  );

  const estoqueRows = produtos
    .map((produto: any) => {
      const quantidade = Number(estoquePessoal[String(produto.id)] || 0);
      const custo = Number(produto.precoAtacado || 0);

      return {
        produto,
        quantidade,
        custo,
        total: quantidade * custo,
      };
    })
    .filter((row) => row.quantidade > 0);

  const valorEstoque = estoqueRows.reduce((acc, row) => acc + row.total, 0);
  
  const valorEmAberto = comprasFornecedor.reduce((acc: number, pedido: any) => {
    if (pedido.status === "cancelado") return acc;
    if (pedido.saldoFornecedor !== null && pedido.saldoFornecedor !== undefined) {
      return acc + Number(pedido.saldoFornecedor || 0);
    }
    return statusEmAberto.includes(pedido.status) ? acc + Number(pedido.total || 0) : acc;
  }, 0);

  const valorQuitado = comprasFornecedor.reduce((acc: number, pedido: any) => {
    if (pedido.status === "cancelado") return acc;
    if (pedido.totalPagoFornecedor !== null && pedido.totalPagoFornecedor !== undefined) {
      return acc + Number(pedido.totalPagoFornecedor || 0);
    }
    return statusQuitados.includes(pedido.status) ? acc + Number(pedido.total || 0) : acc;
  }, 0);

  const vendasConfirmadas = vendasCliente.filter((pedido: any) => ["pago", "enviado", "entregue"].includes(pedido.status));
  const totalVendido = vendasConfirmadas.reduce((acc: number, pedido: any) => acc + Number(pedido.total || 0), 0);
  const custoVendido = vendasConfirmadas.reduce((acc: number, pedido: any) => {
    return acc + Number(pedido.custoUnitario || 0) * Number(pedido.quantidade || 1);
  }, 0);
  const descontoConcedido = vendasConfirmadas.reduce((acc: number, pedido: any) => {
    return acc + Number(pedido.descontoConcedido || 0);
  }, 0);
  const lucroBruto = vendasConfirmadas.reduce((acc: number, pedido: any) => {
    return acc + Number(pedido.lucroBruto || 0);
  }, 0);

  const rankingProdutos = Array.from(vendasConfirmadas.reduce((map: Map<string, number>, pedido: any) => {
    const nome = String(pedido.produtoNome || "Produto");
    map.set(nome, (map.get(nome) || 0) + Number(pedido.quantidade || 1));
    return map;
  }, new Map<string, number>()).entries())
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 6);
  const maiorRanking = Math.max(1, ...rankingProdutos.map((item) => item.quantidade));

  // calculations for reseller limit
  const limiteAprovado = Number(lojista.limiteAprovado || 0);
  const saldoDevedor = valorEmAberto;
  const isExcedido = saldoDevedor > limiteAprovado;
  const creditoDisponivel = limiteAprovado === 0 ? 0 : (isExcedido ? 0 : limiteAprovado - saldoDevedor);
  const historicoPagamentos = Array.isArray(lojista.historicoPagamentos) ? lojista.historicoPagamentos : [];

  async function handleLogout() {
    "use server";
    await logoutAdmin();
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell min-h-screen bg-gray-50 flex">
      {/* SIDEBAR */}
      <aside className="admin-sidebar w-64 bg-luxury-black text-white hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-8 border-b border-white/5">
          <Link href="/" className="block">
            <img src="/brand/logo-ma.webp" alt="Mourato & Associados" className="h-20 w-auto brand-logo-relief admin-brand-logo" />
          </Link>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">Painel de Gestão</p>
        </div>

        <nav className="flex-grow p-4 space-y-2 mt-6">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>🏠</span> Dashboard
          </Link>
          <Link href="/admin/produtos" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>📦</span> Produtos
          </Link>
          <Link href="/admin/lojistas" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium">
            <span>🏪</span> Lojistas
          </Link>
          <Link href="/admin/pedidos" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>🛒</span> Pedidos
          </Link>
          <Link href="/admin/radar" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>🎯</span> Radar
          </Link>
          <Link href="/admin/dre" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>📊</span> DRE
          </Link>
          <Link href="/admin/configurar" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>⚙️</span> Configurar
          </Link>
        </nav>

        <div className="p-4 border-t border-white/5">
          <form action={handleLogout}>
            <button type="submit" className="w-full text-left flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white text-xs uppercase tracking-widest transition-colors cursor-pointer">
              🚪 Sair do Painel
            </button>
          </form>
        </div>
      </aside>

      <main className="admin-main flex-grow p-3 md:p-5">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <Link href="/admin/lojistas" className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-700">
              Voltar para lojistas
            </Link>
            <h1 className="mt-1 text-xl font-bold text-gray-800 tracking-tight">{lojista.nome}</h1>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-1">
              Consulta individual, estoque pessoal e pendências
            </p>
          </div>
          <span className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${
            lojista.status === "aprovado" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
          }`}>
            {lojista.status === "aprovado" ? "Aprovado" : "Aguardando aprovação"}
          </span>
        </header>

        {/* CADASTRO CARD */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
          <div className="xl:col-span-8 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-gray-800 mb-3">Dados do cadastro</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
              <Info label="Nome / loja" value={lojista.nome} />
              <Info label="E-mail" value={lojista.email} />
              <Info label="CPF/CNPJ" value={lojista.documento || "Não informado"} />
              <Info label="WhatsApp" value={lojista.telefone || "Não informado"} />
              <Info label="Endereço" value={lojista.endereco || "Não informado"} />
              <Info label="Cidade / UF" value={[lojista.cidade, lojista.estado].filter(Boolean).join(" / ") || "Não informado"} />
              <Info label="CEP" value={lojista.cep || "Não informado"} />
              <Info label="Cadastro" value={formatDate(lojista.createdAt)} />
            </div>

            {/* EDITAR LIMITE APROVADO */}
            <form action={updateLojistaLimiteAction} className="flex items-end gap-2 mt-4 max-w-sm border-t border-gray-100 pt-4">
              <input type="hidden" name="lojistaId" value={lojista.id} />
              <div className="flex-grow">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                  Limite Aprovado pelo Fornecedor
                </label>
                <input
                  type="number"
                  name="limiteAprovado"
                  defaultValue={limiteAprovado}
                  min="0"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                />
              </div>
              <button 
                type="submit" 
                className="bg-luxury-black hover:bg-luxury-gold text-white hover:text-black font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all cursor-pointer whitespace-nowrap"
              >
                Definir Limite
              </button>
            </form>
          </div>

          <div className="xl:col-span-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-black text-gray-800">QR de revenda</h2>
              <p className="mt-1 text-xs text-gray-500">Link usado pelo cliente para entrar pela página deste lojista.</p>
              {linkRevenda ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(linkRevenda)}`}
                    alt="QR Code de revenda"
                    className="h-20 w-20 rounded-lg border border-gray-100 bg-white p-1"
                  />
                  <a href={linkRevenda} target="_blank" className="break-all text-xs font-bold text-indigo-600 hover:text-indigo-800">
                    {linkRevenda}
                  </a>
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">QR ainda não gerado para este cadastro.</p>
              )}
            </div>
            
            {/* QUITAR SALDO DEVEDOR */}
            {saldoDevedor > 0 && (
              <form action={quitarSaldoLojistaAction} className="mt-4 pt-3 border-t border-gray-100">
                <input type="hidden" name="lojistaId" value={lojista.id} />
                <ConfirmSubmitButton
                  message={`Confirmar a quitação integral do saldo devedor de ${formatMoney(saldoDevedor)} de ${lojista.nome}?`}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase tracking-widest py-2.5 rounded-lg transition-all text-center cursor-pointer"
                >
                  Quitar Todo o Saldo
                </ConfirmSubmitButton>
              </form>
            )}
          </div>
        </section>

        {/* CARDS FINANCEIROS DO LOJISTA */}
        <section className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
          <Resumo label="Itens em estoque pessoal" value={estoqueRows.reduce((acc, row) => acc + row.quantidade, 0)} />
          <Resumo label="Valor do estoque pessoal" value={formatMoney(valorEstoque)} />
          <Resumo label="Valor em aberto" value={formatMoney(valorEmAberto)} destaque />
          <Resumo label="Valor quitado" value={formatMoney(valorQuitado)} />
          <Resumo label="Saldo devedor" value={formatMoney(saldoDevedor)} destaque={saldoDevedor > 0} />
          <Resumo label="Limite aprovado" value={formatMoney(limiteAprovado)} />
          <div className={`rounded-xl border p-3 shadow-sm ${
            isExcedido ? "border-red-200 bg-red-50 text-red-700" : "border-gray-100 bg-white text-gray-800"
          }`}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Crédito disponível</p>
            <p className="mt-1 text-base font-black">
              {isExcedido ? "Limite Excedido" : formatMoney(creditoDisponivel)}
            </p>
          </div>
        </section>

        {/* GERENCIAMENTO DE PAGAMENTOS PARCIAIS */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          {/* REGISTRAR PAGAMENTO PARCIAL */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-black text-gray-800 uppercase tracking-wider">Lançar Pagamento Parcial</h2>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Reduz o saldo devedor amortizando faturas ativas</p>
            </div>
            
            <form action={registrarPagamentoParcialLojistaAction} className="space-y-3 mt-4">
              <input type="hidden" name="lojistaId" value={lojista.id} />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Valor do Pagamento</label>
                  <input
                    type="number"
                    name="valorPagamento"
                    step="0.01"
                    min="0.01"
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                    placeholder="Ex: 500,00"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Observação / Descrição</label>
                  <input
                    type="text"
                    name="observacao"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                    placeholder="Ex: Pix Nubank"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-green-700 hover:bg-green-800 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-lg transition-all cursor-pointer text-center"
              >
                Confirmar Recebimento
              </button>
            </form>
          </div>

          {/* LISTA HISTÓRICO DE PAGAMENTOS */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-base font-black text-gray-800 uppercase tracking-wider">Histórico de Pagamentos</h2>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Histórico de amortizações lançadas pelo administrador</p>
            
            <div className="mt-4 max-h-[16vh] overflow-y-auto space-y-2 pr-1 admin-table-scroll">
              {historicoPagamentos.map((pag: any) => (
                <div key={pag.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50/60">
                  <div>
                    <p className="font-bold text-gray-800">{formatMoney(pag.valor)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{pag.observacao || "Pagamento registrado"}</p>
                  </div>
                  <span className="text-[9px] font-mono text-gray-400">{formatDate(pag.data)}</span>
                </div>
              ))}
              {historicoPagamentos.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-6">Nenhum pagamento manual lançado.</p>
              )}
            </div>
          </div>
        </section>

        {/* ESTOQUE E COMPRAS DE ESTOQUE */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-black text-gray-800">Estoque pessoal do lojista</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Produtos que aparecem para venda pelo QR do lojista</p>
            </div>
            <div className="overflow-x-auto max-h-[46vh] admin-table-scroll">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Produto</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Qtd</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Custo</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {estoqueRows.map(({ produto, quantidade, custo, total }) => (
                    <tr key={produto.id}>
                      <td className="px-4 py-2">
                        <p className="text-sm font-bold text-gray-900">{produto.nome}</p>
                        <p className="text-xs text-gray-500">{produto.marca} / {produto.categoria}</p>
                      </td>
                      <td className="px-4 py-2 text-sm font-bold text-gray-900">{quantidade}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{formatMoney(custo)}</td>
                      <td className="px-4 py-2 text-sm font-bold text-gray-900">{formatMoney(total)}</td>
                    </tr>
                  ))}
                  {estoqueRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500 italic">
                        Este lojista ainda não tem estoque pessoal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-black text-gray-800">Compras e pendências com fornecedor</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Ao marcar como pago/entregue, o valor sai do aberto</p>
            </div>
            <div className="overflow-x-auto max-h-[46vh] admin-table-scroll">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Pedido</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Produto</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comprasFornecedor.map((pedido: any) => {
                    const produto = pedido.produtoId ? produtoMap.get(pedido.produtoId) : null;
                    const totalPagoPedido = pedido.totalPagoFornecedor !== null && pedido.totalPagoFornecedor !== undefined
                      ? Number(pedido.totalPagoFornecedor || 0)
                      : statusQuitados.includes(pedido.status)
                        ? Number(pedido.total || 0)
                        : 0;
                    const saldoPedido = pedido.saldoFornecedor !== null && pedido.saldoFornecedor !== undefined
                      ? Number(pedido.saldoFornecedor || 0)
                      : pedido.status === "pendente fornecedor"
                        ? Number(pedido.total || 0)
                        : 0;
                    const quantidadeRestante = Math.max(0, Number(pedido.quantidade || 0) - Number(pedido.quantidadePagaFornecedor || 0));

                    return (
                      <tr key={pedido.id}>
                        <td className="px-4 py-2">
                          <p className="text-sm font-bold text-gray-900">#{pedido.id}</p>
                          <p className="text-xs text-gray-500">{formatDate(pedido.createdAt)}</p>
                        </td>
                        <td className="px-4 py-2">
                          <p className="text-sm font-bold text-gray-900">{pedido.produtoNome || produto?.nome || "Produto"}</p>
                          <p className="text-xs text-gray-500">{pedido.quantidade || 0} un. x {formatMoney(Number(pedido.precoUnitario || 0))}</p>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <p className="font-black text-gray-900">{formatMoney(Number(pedido.total || 0))}</p>
                          <p className="text-xs text-green-700">
                            Pago: {formatMoney(totalPagoPedido)}
                          </p>
                          <p className="text-xs text-amber-700">
                            Saldo: {formatMoney(saldoPedido)}
                          </p>
                        </td>
                        <td className="px-4 py-2">
                          <form action={atualizarStatusPedido} className="admin-action-row flex flex-col gap-1.5">
                            <input type="hidden" name="pedidoId" value={pedido.id} />
                            <select
                              name="status"
                              defaultValue={pedido.status}
                              className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs font-bold uppercase tracking-widest bg-white"
                            >
                              {statusFornecedor.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <ConfirmSubmitButton
                              message={`Confirmar alteração do pedido #${pedido.id} para o status selecionado?`}
                              className="rounded-lg bg-luxury-black px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-luxury-gold transition duration-150 cursor-pointer"
                            >
                              Salvar
                            </ConfirmSubmitButton>
                          </form>
                          <form action={registrarPagamentoFornecedor} className="admin-action-row mt-2 flex items-center gap-1">
                            <input type="hidden" name="pedidoId" value={pedido.id} />
                            <input
                              name="quantidadePaga"
                              type="number"
                              min="1"
                              max={quantidadeRestante}
                              placeholder="Qtd paga"
                              className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-xs font-bold"
                            />
                            <ConfirmSubmitButton
                              message={`Confirmar baixa deste pedido? Isso reduz o saldo do lojista com o fornecedor e baixa o estoque geral conforme a quantidade informada.`}
                              className="rounded-lg bg-green-700 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white hover:bg-green-800 transition duration-150 cursor-pointer"
                            >
                              Baixar
                            </ConfirmSubmitButton>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                  {comprasFornecedor.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500 italic">
                        Nenhuma compra ao fornecedor registrada para este lojista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* RESUMO FINANCEIRO DO PARCEIRO */}
        <section id="dre-lojista" className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-luxury-gold">Resumo Financeiro do Parceiro</span>
              <h2 className="mt-1 font-black text-gray-800">Resultado das vendas pelo QR & Balanço</h2>
              <p className="mt-1 text-xs text-gray-500">Fluxo financeiro individual calculado exclusivamente para este lojista.</p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Resumo label="Receita gerada pelo QR" value={formatMoney(totalVendido)} />
            <Resumo label="Vendas registradas" value={vendasCliente.length} />
            <Resumo label="Unidades vendidas" value={vendasCliente.reduce((acc: number, pedido: any) => acc + Number(pedido.quantidade || 0), 0)} />
            <Resumo label="Custo das vendas (QR)" value={formatMoney(custoVendido)} />
            <Resumo label="Descontos dados" value={formatMoney(descontoConcedido)} />
            <Resumo label="Lucro bruto (QR)" value={formatMoney(lucroBruto)} destaque />
            <Resumo label="Compras com fornecedor" value={formatMoney(comprasFornecedor.reduce((acc: number, pedido: any) => acc + Number(pedido.total || 0), 0))} />
            <Resumo label="Valor quitado fornecedor" value={formatMoney(valorQuitado)} />
            <Resumo label="Valor em aberto fornecedor" value={formatMoney(valorEmAberto)} destaque={valorEmAberto > 0} />
            <Resumo label="Valor do estoque pessoal" value={formatMoney(valorEstoque)} />
            <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Margem bruta (QR)</p>
              <p className="mt-1 text-base font-black text-gray-800">
                {totalVendido > 0 ? ((lucroBruto / totalVendido) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "0"}%
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-gray-100 pt-5">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-bold text-gray-900">Produtos mais vendidos</h3>
              <div className="mt-3 space-y-3">
                {rankingProdutos.map((item) => (
                  <div key={item.nome}>
                    <div className="mb-1 flex justify-between gap-3 text-xs font-bold text-gray-500">
                      <span className="truncate">{item.nome}</span>
                      <span>{item.quantidade} un.</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-luxury-gold" style={{ width: `${(item.quantidade / maiorRanking) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {rankingProdutos.length === 0 && (
                  <p className="rounded-lg bg-white p-4 text-center text-xs italic text-gray-500">
                    Ainda não há vendas para montar o gráfico.
                  </p>
                )}
              </div>
            </div>
            
            <div className="rounded-xl border border-gray-100 bg-luxury-black p-4 text-white flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold">Balanço individual</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Estoque pessoal</span>
                    <span className="font-bold">{formatMoney(valorEstoque)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Aberto com fornecedor</span>
                    <span className="font-bold text-luxury-gold">{formatMoney(valorEmAberto)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Quitado com fornecedor</span>
                    <span className="font-bold">{formatMoney(valorQuitado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Margem bruta</span>
                    <span className="font-bold">
                      {totalVendido > 0 ? ((lucroBruto / totalVendido) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "0"}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-gray-800 truncate" title={value}>{value}</p>
    </div>
  );
}

function Resumo({ label, value, destaque = false }: { label: string; value: string | number; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${
      destaque ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white"
    }`}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`mt-1 text-base font-black ${destaque ? "text-amber-700" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}
