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
      <aside className="admin-sidebar hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white text-gray-900 lg:sticky lg:top-0 lg:flex">
        <div className="border-b border-gray-100 p-7">
          <Link href="/" className="block">
            <img
              src="/brand/logo-ma.png"
              alt="Mourato & Associados"
              className="h-16 w-auto object-contain"
            />
          </Link>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Painel de Gestão
          </p>
        </div>
        <nav className="flex-grow space-y-1 p-4">
          {[
            ["/admin", "🏠", "Dashboard"],
            ["/admin/produtos", "📦", "Produtos"],
            ["/admin/lojistas", "🏪", "Lojistas"],
            ["/admin/pedidos", "🛒", "Pedidos"],
            ["/admin/radar", "🎯", "Radar"],
          ].map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100"
            >
              <span>{icon}</span> {label}
            </Link>
          ))}
          <Link
            href="/admin/dre"
            className="flex items-center gap-3 rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white"
          >
            <span>💰</span> Financeiro
          </Link>
          <Link
            href="/admin/configurar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100"
          >
            <span>⚙️</span> Configurar
          </Link>
        </nav>
        <div className="border-t border-gray-100 p-4">
          <form action={handleLogout}>
            <button className="w-full rounded-xl px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100">
              🚪 Sair do Painel
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-grow p-3 sm:p-5 lg:p-7">
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
