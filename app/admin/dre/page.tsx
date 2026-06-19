import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, logoutAdmin } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const metadata = {
  title: "DRE Consolidada | Mourato & Associados",
};

export const dynamic = "force-dynamic";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DreAdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  // Fetch all necessary data
  const produtos = await prisma.produto.findMany();
  const pedidos = await prisma.pedido.findMany();

  const produtoMap = new Map(produtos.map((p: any) => [p.id, p]));
  const pedidosValidos = pedidos.filter((p: any) => p.status !== "cancelado");

  // Filter reseller purchase orders vs QR client sales
  const comprasFornecedor = pedidosValidos.filter((pedido: any) =>
    String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
    String(pedido.pagamento || "").includes("Pedido ao fornecedor") ||
    String(pedido.pagamento || "").includes("Compra do fornecedor") ||
    pedido.status === "pendente fornecedor"
  );

  const vendasQrConfirmadas = pedidosValidos.filter((pedido: any) =>
    (String(pedido.tipoFluxo || "") === "venda_qr" || String(pedido.pagamento || "").includes("Venda via QR do lojista")) &&
    ["pago", "enviado", "entregue"].includes(String(pedido.status || ""))
  );

  // 1. Receita Bruta Total = Faturamento de atacado com lojistas + Vendas diretas por QR
  const faturamentoAtacado = comprasFornecedor.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const faturamentoVendasQr = vendasQrConfirmadas.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const receitaBrutaTotal = faturamentoAtacado + faturamentoVendasQr;

  // 2. Custo dos Produtos Vendidos (CMV)
  // Para atacado: custo real de importação (custoDolar * cotacaoDolar) ou mock de 60% do atacado se zerado
  const cmvCompras = comprasFornecedor.reduce((acc, p) => {
    const prod = p.produtoId ? produtoMap.get(p.produtoId) : null;
    const itemCost = Number(prod?.custoDolar || 0) * Number(prod?.cotacaoDolar || 0) || (Number(p.precoUnitario || prod?.precoAtacado || 0) * 0.6);
    return acc + itemCost * Number(p.quantidade || 1);
  }, 0);

  // Para vendas QR: custo de atacado do lojista
  const cmvVendasQr = vendasQrConfirmadas.reduce((acc, p) => {
    const prod = p.produtoId ? produtoMap.get(p.produtoId) : null;
    return acc + Number(p.custoUnitario || prod?.precoAtacado || 0) * Number(p.quantidade || 1);
  }, 0);

  const cmvGeral = cmvCompras + cmvVendasQr;

  // 3. Lucro Bruto
  const lucroBruto = receitaBrutaTotal - cmvGeral;

  // 4. Descontos concedidos (em QR sales)
  const descontos = vendasQrConfirmadas.reduce((acc, p) => acc + Number(p.descontoConcedido || 0), 0);

  // 5. Fretes mockados (2% do faturamento)
  const fretes = receitaBrutaTotal > 0 ? Math.round(receitaBrutaTotal * 0.02) : 0;

  // 6. Taxas mockadas (3.5% do faturamento)
  const taxas = receitaBrutaTotal > 0 ? Math.round(receitaBrutaTotal * 0.035) : 0;

  // 7. Despesas operacionais fixas
  const despesasOperacionais = receitaBrutaTotal > 0 ? 1500 : 0;

  // 8. Resultado Operacional
  const resultadoOperacional = lucroBruto - descontos - fretes - taxas - despesasOperacionais;

  // 9. Total quitado e total em aberto pelos lojistas
  const totalPagoLojistas = comprasFornecedor.reduce((acc, p) => {
    const total = Number(p.total || 0);
    const totalPago = p.totalPagoFornecedor !== null && p.totalPagoFornecedor !== undefined
      ? Number(p.totalPagoFornecedor || 0)
      : ["pago", "enviado", "entregue"].includes(p.status) ? total : 0;
    return acc + totalPago;
  }, 0);

  const totalEmAbertoLojistas = comprasFornecedor.reduce((acc, p) => {
    const total = Number(p.total || 0);
    const totalPago = p.totalPagoFornecedor !== null && p.totalPagoFornecedor !== undefined
      ? Number(p.totalPagoFornecedor || 0)
      : ["pago", "enviado", "entregue"].includes(p.status) ? total : 0;
    return acc + (total - totalPago);
  }, 0);

  const contasAReceber = totalEmAbertoLojistas;
  const resultadoLiquido = resultadoOperacional;

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
          <Link href="/admin/lojistas" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>🏪</span> Lojistas
          </Link>
          <Link href="/admin/pedidos" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>🛒</span> Pedidos
          </Link>
          <Link href="/admin/radar" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>🎯</span> Radar
          </Link>
          <Link href="/admin/dre" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium">
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

      {/* MAIN CONTENT */}
      <main className="admin-main flex-grow p-3 md:p-5">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-luxury-gold">DRE Fornecedor Consolidada</span>
            <h1 className="mt-1 text-2xl font-bold text-gray-800 tracking-tight">Resultado Contábil da Empresa</h1>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-1">
              Demonstrativo financeiro geral unificando todos os parceiros lojistas
            </p>
          </div>
          <Link href="/admin" className="bg-white border border-gray-100 shadow-sm px-6 py-3 rounded-2xl text-center font-bold text-gray-700 text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors">
            Voltar ao Dashboard
          </Link>
        </header>

        {/* CARDS RESUMO DO DRE */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Receita Bruta Total</p>
            <h3 className="text-xl font-bold text-gray-800 mt-1">{formatMoney(receitaBrutaTotal)}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">CMV Consolidado</p>
            <h3 className="text-xl font-bold text-gray-800 mt-1 text-red-600">{formatMoney(cmvGeral)}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total em Aberto</p>
            <h3 className="text-xl font-bold text-gray-800 mt-1 text-amber-600">{formatMoney(totalEmAbertoLojistas)}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Resultado Líquido</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-1">{formatMoney(resultadoLiquido)}</h3>
          </div>
        </section>

        {/* DEMONSTRATIVO DRE COMPLETO */}
        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-black text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3 mb-2">Estrutura do DRE Comercial</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between font-bold border-b border-gray-100 pb-2">
              <span className="text-gray-700">Receita Bruta Total</span>
              <span className="text-gray-900">{formatMoney(receitaBrutaTotal)}</span>
            </div>
            
            <div className="pl-4 space-y-2 text-xs text-gray-500 border-l border-gray-100">
              <div className="flex justify-between">
                <span>Vendas de Estoque (Lojistas)</span>
                <span>{formatMoney(faturamentoAtacado)}</span>
              </div>
              <div className="flex justify-between">
                <span>Vendas Diretas / QR Code</span>
                <span>{formatMoney(faturamentoVendasQr)}</span>
              </div>
            </div>

            <div className="flex justify-between text-red-600 mt-2">
              <span>(-) Custo dos Produtos Vendidos (CMV)</span>
              <span>- {formatMoney(cmvGeral)}</span>
            </div>

            <div className="flex justify-between font-bold border-y border-gray-200 py-2.5 my-1 bg-gray-50 px-3 rounded-lg">
              <span className="text-gray-800">(=) Lucro Bruto</span>
              <span className="text-luxury-gold">{formatMoney(lucroBruto)}</span>
            </div>

            <div className="flex justify-between text-red-500/80">
              <span>(-) Descontos Concedidos</span>
              <span>- {formatMoney(descontos)}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>(-) Fretes (Mock 2%)</span>
              <span>- {formatMoney(fretes)}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>(-) Taxas (Mock 3.5%)</span>
              <span>- {formatMoney(taxas)}</span>
            </div>

            <div className="flex justify-between text-gray-600 border-b border-gray-100 pb-2">
              <span>(-) Despesas Operacionais (Mock Fixo)</span>
              <span>- {formatMoney(despesasOperacionais)}</span>
            </div>

            <div className="flex justify-between font-black border-t-2 border-double border-gray-300 pt-3 text-base">
              <span className="text-gray-900">(=) Resultado Líquido da Operação</span>
              <span className="text-emerald-600">{formatMoney(resultadoLiquido)}</span>
            </div>
          </div>
        </section>

        {/* BALANÇO FINANCEIRO DE DEVEDORES */}
        <section className="mt-6 bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-black text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-3 mb-2">Balanço de Pagamentos dos Lojistas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Faturado Atacado</p>
              <p className="text-lg font-black text-gray-800 mt-1">{formatMoney(faturamentoAtacado)}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-green-50/50">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Total Quitado pelos Lojistas</p>
              <p className="text-lg font-black text-green-700 mt-1">{formatMoney(totalPagoLojistas)}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-amber-50/50">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Contas a Receber (Em Aberto)</p>
              <p className="text-lg font-black text-amber-700 mt-1">{formatMoney(contasAReceber)}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
