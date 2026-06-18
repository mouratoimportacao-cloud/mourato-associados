import { prisma } from "../../../lib/prisma";
import GerenciadorProdutos from "./components/GerenciadorProdutos";
import Link from "next/link";
import { getAdminSession, logoutAdmin } from "../../../lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Gerenciar Produtos | Mourato & Associados",
};

export const dynamic = "force-dynamic";

export default async function ProdutosAdmin() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const produtos = await prisma.produto.findMany({
    orderBy: {
      id: "asc",
    },
  });

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
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>🏠</span> Dashboard
          </Link>
          <Link href="/admin/produtos" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium">
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
          <Link href="/admin#dre" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
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
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Gestão de Catálogo</h1>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-1">Controle de Inventário e Vitrine</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/admin"
              className="bg-white border border-gray-100 shadow-sm px-6 py-3 rounded-2xl text-center font-bold text-gray-700 text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Voltar ao Painel
            </Link>
            <div className="bg-white border border-gray-100 shadow-sm px-6 py-3 rounded-2xl flex items-center justify-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="font-bold text-gray-700 text-xs uppercase tracking-widest">
                {produtos.length} {produtos.length === 1 ? 'Produto' : 'Produtos'}
              </span>
            </div>
          </div>
        </header>

        <section className="mt-8">
          <GerenciadorProdutos produtos={produtos} />
        </section>
      </main>
    </div>
  );
}
