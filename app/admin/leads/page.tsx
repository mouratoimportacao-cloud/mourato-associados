import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, logoutAdmin } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { atualizarStatusLead, excluirLead } from "./actions";

export const metadata = {
  title: "Leads | Mourato & Associados",
};

export const dynamic = "force-dynamic";

export default async function LeadsAdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  // Busca todos os leads cadastrados
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  const totalLeads = leads.length;
  const leadsNovos = leads.filter((l: any) => l.status === "Novo").length;
  const leadsEmAtendimento = leads.filter((l: any) => l.status === "Em Atendimento").length;
  const leadsConvertidos = leads.filter((l: any) => l.status === "Convertido").length;

  async function handleLogout() {
    "use server";
    await logoutAdmin();
    redirect("/admin/login");
  }

  async function handleStatusChange(formData: FormData) {
    "use server";
    const leadId = Number(formData.get("leadId"));
    const status = String(formData.get("status"));
    if (leadId && status) {
      await atualizarStatusLead(leadId, status);
    }
  }

  async function handleExcluir(formData: FormData) {
    "use server";
    const leadId = Number(formData.get("leadId"));
    if (leadId) {
      await excluirLead(leadId);
    }
  }

  const statusOptions = ["Novo", "Em Atendimento", "Convertido", "Perdido"];

  return (
    <div className="admin-shell min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
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
          <Link href="/admin/leads" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium">
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

      {/* Main Content */}
      <main className="admin-main flex-grow p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Leads & Intenções de Compra</h1>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mt-1">
              Gerencie contatos capturados do site público
            </p>
          </div>
        </header>

        {/* Módulos de Resumo */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total de Leads</span>
            <span className="text-3xl font-bold text-gray-800 mt-2">{totalLeads}</span>
          </div>
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col justify-between">
            <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Novos Leads</span>
            <span className="text-3xl font-bold text-blue-800 mt-2">{leadsNovos}</span>
          </div>
          <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 flex flex-col justify-between">
            <span className="text-yellow-600 text-xs font-semibold uppercase tracking-wider">Em Atendimento</span>
            <span className="text-3xl font-bold text-yellow-800 mt-2">{leadsEmAtendimento}</span>
          </div>
          <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex flex-col justify-between">
            <span className="text-green-600 text-xs font-semibold uppercase tracking-wider">Convertidos</span>
            <span className="text-3xl font-bold text-green-800 mt-2">{leadsConvertidos}</span>
          </div>
        </section>

        {/* Tabela de Leads */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">Listagem de Contatos</h2>
          </div>
          {leads.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhum lead capturado até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-4">Cliente / Contato</th>
                    <th className="p-4">Localização / Endereço</th>
                    <th className="p-4">Produtos Desejados</th>
                    <th className="p-4">Total Pretendido</th>
                    <th className="p-4">Data</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {leads.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{lead.nome}</div>
                        <div className="text-gray-500 text-xs mt-1">{lead.contato}</div>
                      </td>
                      <td className="p-4 text-gray-600">
                        <div className="font-medium">{lead.cidade}/{lead.estado}</div>
                        <div className="text-gray-400 text-xs mt-1 max-w-xs truncate" title={lead.endereco}>{lead.endereco}</div>
                      </td>
                      <td className="p-4 text-gray-600 max-w-xs font-medium">
                        <div className="truncate" title={lead.produtos}>{lead.produtos}</div>
                      </td>
                      <td className="p-4 font-bold text-gray-800">
                        R$ {Number(lead.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-gray-500 text-xs">
                        {new Date(lead.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <form action={handleStatusChange} className="inline-block">
                          <input type="hidden" name="leadId" value={lead.id} />
                          <select
                            name="status"
                            defaultValue={lead.status}
                            onChange={(e) => e.target.form?.requestSubmit()}
                            className={`text-xs font-bold rounded-full px-3 py-1 border ${
                              lead.status === "Novo"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : lead.status === "Em Atendimento"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                : lead.status === "Convertido"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-700 border-gray-300"
                            }`}
                          >
                            {statusOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </form>
                      </td>
                      <td className="p-4 text-center">
                        <form action={handleExcluir} className="inline-block">
                          <input type="hidden" name="leadId" value={lead.id} />
                          <ConfirmSubmitButton
                            message="Tem certeza que deseja excluir permanentemente este lead?"
                            className="text-xs text-red-600 hover:text-red-800 hover:underline uppercase font-bold tracking-wider cursor-pointer"
                          >
                            Excluir
                          </ConfirmSubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
