import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, logoutAdmin } from "../../../lib/auth";
import {
  calcularFinanceiro,
  normalizarCompetencia,
} from "../../../lib/financeiro";
import { prisma } from "../../../lib/prisma";
import FinanceiroClient from "./FinanceiroClient";

export const metadata = {
  title: "Financeiro | Mourato & Associados",
};

export const dynamic = "force-dynamic";

export default async function FinanceiroAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { mes } = await searchParams;
  const competencia = normalizarCompetencia(mes);
  const [produtos, pedidos, lancamentos, fechamentos] = await Promise.all([
    prisma.produto.findMany(),
    prisma.pedido.findMany(),
    prisma.lancamentoFinanceiro.findMany(),
    prisma.fechamentoFinanceiro.findMany({
      orderBy: { competencia: "desc" },
    }),
  ]);

  const fechamento = fechamentos.find(
    (item: any) => item.competencia === competencia
  );
  const calculado = calcularFinanceiro({
    produtos,
    pedidos,
    lancamentos,
    competencia,
  });
  const resumo = fechamento
    ? {
        ...calculado,
        receitaAtacado: Number(fechamento.receitaAtacado || 0),
        receitaSite: Number(fechamento.receitaSite || 0),
        receitaTotal: Number(fechamento.receitaTotal || 0),
        cmv: Number(fechamento.cmv || 0),
        estoque: Number(fechamento.estoque || 0),
        contasReceber: Number(fechamento.contasReceber || 0),
        totalDespesas: Number(fechamento.totalDespesas || 0),
        saldoBancario: Number(fechamento.saldoBancario || 0),
        resultadoOperacional: Number(fechamento.resultadoOperacional || 0),
        despesasPorCategoria: fechamento.despesasPorCategoria || {},
      }
    : calculado;

  async function handleLogout() {
    "use server";
    await logoutAdmin();
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell min-h-screen bg-[#f7f7f5] lg:flex">
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
          <Link href="/admin/radar" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>🎯</span> Radar
          </Link>
          <Link href="/admin/dre" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium">
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

      <main className="admin-main min-w-0 flex-grow p-3 sm:p-5 lg:p-7">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <Link href="/admin" className="text-sm font-black text-gray-800">
              ← Painel
            </Link>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">
              Financeiro
            </span>
          </div>
          <FinanceiroClient
            competencia={competencia}
            resumo={resumo as any}
            fechado={Boolean(fechamento)}
            fechamentos={fechamentos as any[]}
          />
        </div>
      </main>
    </div>
  );
}
