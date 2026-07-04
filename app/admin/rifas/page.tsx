import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, logoutAdmin } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import GerenciadorRifas from "./components/GerenciadorRifas";
import AdminMobileHeader from "@/components/AdminMobileHeader";

export const metadata = {
  title: "Rifas & Sorteios | Mourato & Associados",
};

export const dynamic = "force-dynamic";

export default async function RifasAdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  // Buscar todas as rifas e bilhetes cadastrados
  let rifas: any[] = [];
  let bilhetes: any[] = [];

  try {
    const allRifas = await prisma.rifa.findMany();
    rifas = allRifas.sort((a: any, b: any) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    });

    const allBilhetes = await prisma.bilhete.findMany();
    bilhetes = allBilhetes.sort((a: any, b: any) => b.id - a.id);
  } catch (error) {
    console.error("Erro ao buscar dados de rifas:", error);
  }

  async function handleLogout() {
    "use server";
    await logoutAdmin();
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <AdminMobileHeader currentPath="/admin/rifas" />

      {/* SIDEBAR DESKTOP */}
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
          <Link href="/admin/rifas" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium">
            <span>🎟️</span> Rifas e Sorteios
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

      {/* CONTEÚDO PRINCIPAL */}
      <main className="admin-main flex-grow p-3 md:p-5">
        <header className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 mb-10">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Rifas e Sorteios</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Link
              href="/"
              className="bg-white border border-gray-100 shadow-sm px-5 py-3 rounded-2xl text-center font-bold text-gray-700 text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Voltar ao Site
            </Link>
            <div className="flex items-center gap-4 sm:ml-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{session.nome}</span>
              <div className="w-10 h-10 bg-luxury-gold rounded-full flex items-center justify-center text-white font-bold uppercase">
                {session.nome.substring(0, 1)}
              </div>
            </div>
          </div>
        </header>

        <GerenciadorRifas rifas={rifas} bilhetes={bilhetes} />
      </main>
    </div>
  );
}
