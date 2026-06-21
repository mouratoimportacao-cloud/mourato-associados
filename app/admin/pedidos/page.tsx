import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, logoutAdmin } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { atualizarStatusPedido, deletePedidoAction } from "./actions";
import { limparTodosPedidosAction } from "./clearActions";

export const metadata = {
  title: "Pedidos | Mourato & Associados",
};

export const dynamic = "force-dynamic";

// Helper to parse client shipping details from order observation
const parseClienteInfo = (obs?: string | null) => {
  if (!obs) return null;
  const match = obs.match(/Cliente:\s*(.*?)\s*-\s*Tel:\s*(.*?)\s*-\s*Endereço:\s*(.*?)\s*-\s*Bairro:\s*(.*?)\s*-\s*(.*?)\s*-\s*CEP:\s*([^\s|]*)/);
  if (match) {
    return {
      nome: match[1].trim(),
      contato: match[2].trim(),
      endereco: match[3].trim(),
      bairro: match[4].trim(),
      cidadeEstado: match[5].trim(),
      cep: match[6].trim()
    };
  }
  
  if (obs.includes("Cliente:")) {
    const idx = obs.indexOf("Cliente:");
    return {
      nome: "Cliente",
      contato: "",
      endereco: obs.substring(idx).trim(),
      bairro: "",
      cidadeEstado: "",
      cep: ""
    };
  }
  return null;
};

export default async function PedidosAdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const pedidos = await prisma.pedido.findMany({
    orderBy: { createdAt: "desc" },
  });

  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: pedidos.map((pedido: any) => pedido.usuarioId) } },
    select: { id: true, nome: true, email: true, telefone: true },
  });
  const userMap = new Map(usuarios.map((usuario: any) => [usuario.id, usuario]));
  const totalPedidos = pedidos.length;
  const totalVendido = pedidos
    .filter((pedido: any) => !["cancelado", "rejeitado"].includes(pedido.status))
    .reduce((acc: number, pedido: any) => acc + Number(pedido.total || 0), 0);
  const unidadesVendidas = pedidos
    .filter((pedido: any) => !["cancelado", "rejeitado"].includes(pedido.status))
    .reduce((acc: number, pedido: any) => acc + Number(pedido.quantidade || 0), 0);
  const pedidosPendentes = pedidos.filter((pedido: any) => pedido.status === "aguardando pagamento").length;

  async function handleLogout() {
    "use server";
    await logoutAdmin();
    redirect("/admin/login");
  }


  const statuses = ["intencao de compra", "pendente fornecedor", "aguardando lojista", "rejeitado", "aguardando confirmacao admin", "aguardando pagamento", "pago", "enviado", "entregue", "cancelado"];
  const statusConcluidos = ["pago", "enviado", "entregue", "rejeitado", "cancelado"];
  const statusNovos = ["pendente fornecedor", "aguardando lojista", "intencao de compra"];
  const pedidosNovos = pedidos.filter((pedido: any) => statusNovos.includes(String(pedido.status || "")));
  const pedidosConcluidos = pedidos.filter((pedido: any) => statusConcluidos.includes(String(pedido.status || "")));
  const pedidosPendentesAgrupados = pedidos.filter((pedido: any) => {
    const status = String(pedido.status || "");
    return !statusNovos.includes(status) && !statusConcluidos.includes(status);
  });

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
          <Link href="/admin/lojistas" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
            <span>🏪</span> Lojistas
          </Link>
          <Link href="/admin/pedidos" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium">
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
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Pedidos e Intenções de Compra</h1>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-1">
              Controle de pagamento, envio e transição de estoque
            </p>
          </div>
          <div className="flex gap-2">
            <form action={limparTodosPedidosAction}>
              <ConfirmSubmitButton
                message="ATENÇÃO: Isto irá deletar TODOS os pedidos do sistema e zerar os estoques dos lojistas permanentemente. Deseja continuar?"
                className="bg-red-50 border border-red-200 shadow-sm px-6 py-3 rounded-2xl text-center font-bold text-red-600 text-xs uppercase tracking-widest hover:bg-red-100 transition-colors"
              >
                🚨 Zerar Base
              </ConfirmSubmitButton>
            </form>
            <Link href="/admin" className="bg-white border border-gray-100 shadow-sm px-6 py-3 rounded-2xl text-center font-bold text-gray-700 text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors">
              Voltar ao Painel
            </Link>
          </div>
        </header>

        <section className="admin-card-grid grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
          {[
            ["Pedidos", totalPedidos],
            ["Aguardando", pedidosPendentes],
            ["Unidades baixadas", unidadesVendidas],
            ["Total vendido", `R$ ${totalVendido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
              <p className="mt-2 text-xl font-black text-gray-800">{value}</p>
            </div>
          ))}
        </section>

        <div className="space-y-4">
          <PedidosGrupo
            titulo="Novos"
            descricao="Pedidos recém-abertos pelo lojista, QR Code ou site. Resolva estes primeiro."
            pedidos={pedidosNovos}
            userMap={userMap}
            statuses={statuses}
            vazio="Nenhum pedido novo no momento."
          />
          <PedidosGrupo
            titulo="Pendentes"
            descricao="Pedidos em andamento que ainda não foram concluídos."
            pedidos={pedidosPendentesAgrupados}
            userMap={userMap}
            statuses={statuses}
            vazio="Nenhum pedido pendente no momento."
          />
          <PedidosGrupo
            titulo="Concluídos"
            descricao="Pedidos pagos, entregues, enviados ou cancelados."
            pedidos={pedidosConcluidos}
            userMap={userMap}
            statuses={statuses}
            vazio="Nenhum pedido concluído até agora."
          />
        </div>
      </main>
    </div>
  );
}

function PedidosGrupo({
  titulo,
  descricao,
  pedidos,
  userMap,
  statuses,
  vazio,
}: {
  titulo: string;
  descricao: string;
  pedidos: any[];
  userMap: Map<any, any>;
  statuses: string[];
  vazio: string;
}) {
  return (
    <section className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-gray-100 bg-gray-50 px-5 py-4">
        <div>
          <h2 className="text-lg font-black text-gray-900">{titulo}</h2>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{descricao}</p>
        </div>
        <span className="w-fit rounded-full bg-luxury-black px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
          {pedidos.length} pedido(s)
        </span>
      </div>
      <div className="admin-table-scroll">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Pedido</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Lojista</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Produto</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Pagamento</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Total</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {pedidos.map((pedido: any) => {
              const lojista = userMap.get(pedido.usuarioId);
              const isPublicIntent = pedido.status === "intencao de compra" || Number(pedido.usuarioId) === 0;
              const aguardandoDecisaoLojista =
                pedido.tipoFluxo === "venda_qr" && pedido.status === "aguardando lojista";
              return (
                <tr key={pedido.id} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-sm font-bold text-gray-900">#{pedido.id}</div>
                    <div className="text-xs text-gray-500">{new Date(pedido.createdAt).toLocaleDateString("pt-BR")}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">
                      {isPublicIntent ? "Cliente do site" : lojista?.nome || `Lojista #${pedido.usuarioId}`}
                    </div>
                    <div className="text-xs text-gray-500">{isPublicIntent ? "Intenção de compra pública" : lojista?.email || "Sem e-mail"}</div>
                    <div className="text-xs text-gray-500">{lojista?.telefone || ""}</div>
                  </td>
                  <td className="px-6 py-4 min-w-[16rem] max-w-[28rem]">
                    <div className="text-sm font-bold text-gray-900">{pedido.produtoNome || "Produto"}</div>
                    <div className="text-xs text-gray-500">
                      {pedido.quantidade || 0} un. x R$ {Number(pedido.precoUnitario || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    {pedido.descontoConcedido ? (
                      <div className="mt-1 text-xs font-bold text-amber-700">
                        Desconto: R$ {Number(pedido.descontoConcedido || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    ) : null}
                    {pedido.observacao && (
                      <div className="text-xs text-gray-500 mt-1.5">
                        {(() => {
                          const parsed = parseClienteInfo(pedido.observacao);
                          if (parsed && parsed.endereco) {
                            return (
                              <div className="bg-amber-50/70 border border-amber-200/50 rounded-lg p-2.5 mt-1 space-y-1 text-gray-700 text-left">
                                <p className="font-bold text-amber-800 text-[9px] uppercase tracking-wider">Dados de Entrega do Cliente</p>
                                <p><span className="font-semibold text-gray-800">Nome:</span> {parsed.nome}</p>
                                {parsed.contato && (
                                  <p>
                                    <span className="font-semibold text-gray-800">Contato:</span>{" "}
                                    <a href={`https://wa.me/${parsed.contato.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-amber-700 underline font-semibold hover:text-amber-800 transition-colors">
                                      {parsed.contato}
                                    </a>
                                  </p>
                                )}
                                <p><span className="font-semibold text-gray-800">Endereço:</span> {parsed.endereco}</p>
                                {parsed.bairro && <p><span className="font-semibold text-gray-800">Bairro:</span> {parsed.bairro}</p>}
                                {parsed.cidadeEstado && <p><span className="font-semibold text-gray-800">Cidade/UF:</span> {parsed.cidadeEstado}</p>}
                                {parsed.cep && <p><span className="font-semibold text-gray-800">CEP:</span> {parsed.cep}</p>}
                              </div>
                            );
                          }
                          return <span>Obs: {pedido.observacao}</span>;
                        })()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{pedido.pagamento || "Pix / Nubank"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    R$ {Number(pedido.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                                         <div className="flex flex-col gap-2">
                        {aguardandoDecisaoLojista ? (
                          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-700">
                            Decisão exclusiva do lojista
                          </span>
                        ) : (
                          <form action={atualizarStatusPedido} className="admin-action-row flex items-end gap-2">
                            <input type="hidden" name="pedidoId" value={pedido.id} />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                              <select name="status" defaultValue={pedido.status} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-white text-gray-800">
                                {statuses.map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Desconto (R$)</span>
                              <input
                                type="number"
                                name="desconto"
                                step="0.01"
                                min="0"
                                defaultValue={pedido.descontoConcedido || 0}
                                placeholder="0.00"
                                className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold bg-white text-gray-800"
                              />
                            </div>
                            <ConfirmSubmitButton
                              message={`Confirmar alteração do pedido #${pedido.id} para o status e desconto selecionados?`}
                              className="rounded-lg bg-luxury-black px-3 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-luxury-gold transition-colors"
                            >
                              📥 Salvar
                            </ConfirmSubmitButton>
                          </form>
                        )}
                         {!["pago","enviado","entregue","rejeitado","cancelado"].includes(pedido.status) && !aguardandoDecisaoLojista && (
                          <form action={deletePedidoAction} className="inline">
                            <input type="hidden" name="pedidoId" value={pedido.id} />
                            <ConfirmSubmitButton
                              message={`Confirmar exclusão do pedido #${pedido.id}?`}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-700 transition-colors"
                            >
                              🗑️ Excluir
                            </ConfirmSubmitButton>
                          </form>
                        )}
                      </div>
                  </td>
                </tr>
              );
            })}
            {pedidos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500 italic">
                  {vazio}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
