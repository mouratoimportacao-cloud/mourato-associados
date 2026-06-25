import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { getAdminSession, logoutAdmin } from "../../lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard Admin | Mourato & Associados",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  const countProdutos = await prisma.produto.count();
  const countPedidos = await prisma.pedido.count();
  const countLojistas = await prisma.usuario.count({
    where: { tipo: "lojista" },
  });
  const todosLojistas = await prisma.usuario.findMany({
    where: { tipo: "lojista" },
    select: { status: true },
  });
  const countLojistasPendentes = todosLojistas.filter((lojista: { status?: string | null }) => lojista.status !== "aprovado").length;
  const produtos = await prisma.produto.findMany();

  const pedidos = await prisma.pedido.findMany();
  const pedidosValidos = pedidos.filter((pedido: any) => pedido.status !== "cancelado");
  const produtoMap = new Map(produtos.map((produto: any) => [produto.id, produto]));
  const comprasFornecedor = pedidosValidos.filter((pedido: any) =>
    String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
    String(pedido.pagamento || "").includes("Pedido ao fornecedor") ||
    String(pedido.pagamento || "").includes("Compra do fornecedor")
  );
  const vendasSiteDireto = pedidosValidos.filter((pedido: any) =>
    String(pedido.tipoFluxo || "") === "intencao_site" &&
    ["pago", "enviado", "entregue"].includes(String(pedido.status || ""))
  );

  const faturamentoAtacado = comprasFornecedor.reduce((acc: number, pedido: any) => acc + Number(pedido.total || 0), 0);
  const faturamentoVendasSiteDireto = vendasSiteDireto.reduce((acc: number, pedido: any) => acc + Number(pedido.total || 0), 0);

  const totalPagoLojistas = comprasFornecedor.reduce((acc: number, pedido: any) => {
    if (pedido.totalPagoFornecedor !== null && pedido.totalPagoFornecedor !== undefined) {
      return acc + Number(pedido.totalPagoFornecedor || 0);
    }
    return ["pago", "enviado", "entregue"].includes(String(pedido.status || "")) ? acc + Number(pedido.total || 0) : acc;
  }, 0);

  const totalFaturamento = faturamentoAtacado + faturamentoVendasSiteDireto;
  
  const custoMercadorias = comprasFornecedor.concat(vendasSiteDireto).reduce((acc: number, pedido: any) => {
    const prod = pedido.produtoId ? produtoMap.get(pedido.produtoId) : null;
    const itemCost = Number(prod?.custoDolar || 0) * Number(prod?.cotacaoDolar || 0) || (Number(pedido.precoUnitario || prod?.precoAtacado || 0) * 0.6);
    return acc + itemCost * Number(pedido.quantidade || 1);
  }, 0);

  const descontoConcedido = pedidosValidos.reduce((acc: number, pedido: any) => acc + Number(pedido.descontoConcedido || 0), 0);

  const lucroBruto = totalFaturamento - custoMercadorias;

  const valorEmAbertoFornecedor = comprasFornecedor.reduce((acc: number, pedido: any) => {
    if (pedido.saldoFornecedor !== null && pedido.saldoFornecedor !== undefined) {
      return acc + Number(pedido.saldoFornecedor || 0);
    }
    return pedido.status === "pendente fornecedor" ? acc + Number(pedido.total || 0) : acc;
  }, 0);

  const totalQuitado = totalPagoLojistas + faturamentoVendasSiteDireto;
  const totalPendente = valorEmAbertoFornecedor;
  const receitaBruta = totalFaturamento;

  const comprasEfetivadas = comprasFornecedor
    .filter((pedido: any) => ["pago", "enviado", "entregue"].includes(String(pedido.status || "")))
    .concat(vendasSiteDireto);
  const produtosVendidos = comprasEfetivadas.reduce((map: Map<string, number>, pedido: any) => {
    const nome = String(pedido.produtoNome || "Produto");
    map.set(nome, (map.get(nome) || 0) + Number(pedido.quantidade || 1));
    return map;
  }, new Map<string, number>());
  const rankingProdutos = Array.from(produtosVendidos.entries())
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 6);
  const maiorVendaProduto = Math.max(1, ...rankingProdutos.map((item) => item.quantidade));

  const ultimosPedidos = await prisma.pedido.findMany({
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
  });

  // Fetch usernames for orders if possible
  const userIds = ultimosPedidos.map((p: { usuarioId: number }) => p.usuarioId);
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nome: true, email: true }
  });
  const userMap = new Map<number, { id: number; nome: string; email: string }>(
    usuarios.map((u: { id: number; nome: string; email: string }) => [u.id, u])
  );

  const metrics = [
    { label: "Produtos", value: countProdutos, icon: "📦", color: "bg-blue-50 text-blue-600" },
    { label: "Pedidos", value: countPedidos, icon: "🛒", color: "bg-green-50 text-green-600" },
    { label: "Lojistas", value: countLojistas, icon: "🏪", color: "bg-purple-50 text-purple-600" },
    { 
      label: "Faturamento Total", 
      value: `R$ ${totalFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 
      icon: "💰", 
      color: "bg-amber-50 text-amber-600" 
    },
    { 
      label: "Faturamento em Aberto", 
      value: `R$ ${valorEmAbertoFornecedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 
      icon: "⏳", 
      color: "bg-red-50 text-red-600" 
    },
    { 
      label: "Total Quitado", 
      value: `R$ ${totalQuitado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 
      icon: "✅", 
      color: "bg-green-50 text-green-600" 
    },
    { 
      label: "Total Pendente", 
      value: `R$ ${totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 
      icon: "⚠️", 
      color: "bg-amber-50 text-amber-600" 
    },
    { 
      label: "Receita Bruta", 
      value: `R$ ${receitaBruta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 
      icon: "📊", 
      color: "bg-indigo-50 text-indigo-600" 
    },
    { 
      label: "Lucro Bruto", 
      value: `R$ ${lucroBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 
      icon: "📈", 
      color: "bg-emerald-50 text-emerald-600" 
    },
  ];

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
            <img src="/brand/logo-ma.png" alt="Mourato & Associados" className="h-20 w-auto brand-logo-relief admin-brand-logo" />
          </Link>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">Painel de Gestão</p>
        </div>
        
        <nav className="flex-grow p-4 space-y-2 mt-6">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium">
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
          <Link href="/admin/leads" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>👥</span> Leads
          </Link>
          <Link href="/admin/radar" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>🎯</span> Radar
          </Link>
          <Link href="/admin/dre" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>💰</span> Financeiro
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
        <header className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 mb-10">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Visão Geral</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Link
              href="/"
              className="bg-white border border-gray-100 shadow-sm px-5 py-3 rounded-2xl text-center font-bold text-gray-700 text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Voltar ao Site
            </Link>
            <Link
              href="/produtos"
              className="bg-luxury-black border border-luxury-black shadow-sm px-5 py-3 rounded-2xl text-center font-bold text-white text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Ver Mercadorias
            </Link>
            <div className="flex items-center gap-4 sm:ml-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{session.nome}</span>
              <div className="w-10 h-10 bg-luxury-gold rounded-full flex items-center justify-center text-white font-bold uppercase">
                {session.nome.substring(0, 1)}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {metrics.map((metric, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${metric.color} text-xl`}>
                  {metric.icon}
                </div>
              </div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{metric.label}</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{metric.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* ATALHOS RÁPIDOS */}
            <div className={`rounded-2xl shadow-sm border p-8 ${
              countLojistasPendentes > 0
                ? "bg-amber-50 border-amber-200"
                : "bg-white border-gray-100"
            }`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${countLojistasPendentes > 0 ? "bg-amber-500 animate-pulse" : "bg-green-500"}`}></span>
                    Caixa de Entrada
                  </h3>
                  <p className="text-sm text-gray-600">
                    {countLojistasPendentes > 0
                      ? `${countLojistasPendentes} cadastro de lojista aguardando validação.`
                      : "Nenhum cadastro novo aguardando validação."}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Todo cliente/lojista que se cadastra pelo QR Code entra aqui para o administrador aprovar.
                  </p>
                </div>
                <Link
                  href="/admin/lojistas"
                  className="bg-luxury-black border border-luxury-black shadow-sm px-5 py-3 rounded-2xl text-center font-bold text-white text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  Ver Cadastros
                </Link>
              </div>
            </div>



            {/* ÚLTIMOS PEDIDOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
                Últimos Pedidos
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3">Pedido ID</th>
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Total</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ultimosPedidos.map((pedido: { id: number; usuarioId: number; total: number; status: string }) => {
                      const user = userMap.get(pedido.usuarioId);
                      return (
                        <tr key={pedido.id} className="text-sm">
                          <td className="py-3 font-mono font-bold text-gray-700">#{pedido.id}</td>
                          <td className="py-3 text-gray-600">{user ? user.nome : `Cliente #${pedido.usuarioId}`}</td>
                          <td className="py-3 font-bold text-gray-800">R$ {pedido.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              pedido.status === "pago" || pedido.status === "entregue"
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}>
                              {pedido.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {ultimosPedidos.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                          Nenhum pedido registrado no momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            {/* SISTEMA */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
               <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-luxury-gold rounded-full"></span>
                Sistema
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Versão</span>
              <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-1 rounded">v0.6.0-dre</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Ambiente</span>
                  <span className="text-green-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Operação</span>
                  <span className="text-gray-800 font-medium">Local</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="dre" className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-luxury-gold">Financeiro</span>
              <h2 className="mt-2 text-2xl font-black text-gray-900">Resultado operacional</h2>
              <p className="mt-1 text-sm text-gray-500">Leitura contábil geral do fornecedor, lojistas e pedidos registrados.</p>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 w-full lg:max-w-4xl">
              {[
                ["Receita", totalFaturamento],
                ["Custo", custoMercadorias],
                ["Descontos", descontoConcedido],
                ["Lucro bruto", lucroBruto],
                ["Em aberto", valorEmAbertoFornecedor],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                  <p className="mt-2 text-lg font-black text-gray-900">
                    R$ {Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-gray-900">Produtos mais vendidos</h3>
              <div className="mt-4 space-y-3">
                {rankingProdutos.map((item) => (
                  <div key={item.nome}>
                    <div className="mb-1 flex justify-between gap-4 text-xs font-bold text-gray-500">
                      <span className="truncate">{item.nome}</span>
                      <span>{item.quantidade} un.</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-luxury-gold" style={{ width: `${(item.quantidade / maiorVendaProduto) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {rankingProdutos.length === 0 && (
                  <p className="rounded-xl bg-gray-50 p-6 text-center text-sm italic text-gray-500">
                    Ainda não há vendas suficientes para montar o gráfico.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-luxury-black p-6 text-white">
              <h3 className="font-bold">Leitura do balanço</h3>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-gray-400">Pedidos considerados</span>
                  <span className="font-bold">{pedidosValidos.length}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-gray-400">Margem bruta</span>
                  <span className="font-bold">
                    {totalFaturamento > 0 ? ((lucroBruto / totalFaturamento) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "0"}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-gray-400">Estoque principal</span>
                  <span className="font-bold">{produtos.reduce((acc: number, produto: any) => acc + Number(produto.estoque || 0), 0)} un.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Valor em aberto</span>
                  <span className="font-bold text-luxury-gold">
                    R$ {valorEmAbertoFornecedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
