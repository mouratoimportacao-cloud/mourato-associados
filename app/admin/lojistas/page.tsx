import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, logoutAdmin } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import GerenciadorLojistas from "./components/GerenciadorLojistas";

export const metadata = {
  title: "Lojistas | Mourato & Associados",
};

export const dynamic = "force-dynamic";

export default async function LojistasAdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const lojistas = await prisma.usuario.findMany({
    where: { tipo: "lojista" },
    orderBy: { createdAt: "desc" },
  });
  const pendentes = lojistas.filter((lojista: any) => lojista.status !== "aprovado").length;

  async function handleLogout() {
    "use server";
    await logoutAdmin();
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell min-h-screen bg-gray-50 flex">
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

      <main className="admin-main flex-grow p-3 md:p-5">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Cadastro de Lojistas</h1>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-1">
              Crie acessos comerciais e acompanhe os cadastros
            </p>
          </div>
          <div className="bg-white border border-gray-100 shadow-sm px-6 py-3 rounded-2xl flex items-center gap-3">
            <span className="flex h-2 w-2 rounded-full bg-luxury-gold"></span>
            <span className="font-bold text-gray-700 text-xs uppercase tracking-widest">
              {lojistas.length} {lojistas.length === 1 ? "Lojista" : "Lojistas"}
            </span>
          </div>
        </header>

        <section className={`mb-8 rounded-2xl border p-6 ${
          pendentes > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="font-bold text-gray-800">Caixa de correspondência dos cadastros</h2>
              <p className="text-sm text-gray-600 mt-1">
                {pendentes > 0
                  ? `${pendentes} lojista enviou cadastro pelo site e aguarda aprovação.`
                  : "Quando um lojista se cadastrar pelo site ou QR Code, o pedido aparece aqui."}
              </p>
            </div>
            <span className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${
              pendentes > 0 ? "bg-amber-500 text-white" : "bg-green-50 text-green-700"
            }`}>
              {pendentes > 0 ? "Novas mensagens" : "Sem pendências"}
            </span>
          </div>
        </section>

        <GerenciadorLojistas lojistas={lojistas} />
      </main>
    </div>
  );
}
