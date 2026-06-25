import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, logoutAdmin } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { atualizarStatusPedido, deletePedidoAction } from "./actions";
import { limparTodosPedidosAction } from "./clearActions";
import { registrarPagamentoFornecedor } from "../lojistas/actions";

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
  // ── Agrupamentos de pedidos ───────────────────────────────────────────────
  // Novos: precisam de ação imediata do Admin
  const statusConcluidos = ["entregue", "cancelado", "rejeitado"];
  const pedidosPendentesCount = pedidos.filter((pedido: any) => !statusConcluidos.includes(pedido.status)).length;

  async function handleLogout() {
    "use server";
    await logoutAdmin();
    redirect("/admin/login");
  }

  const statuses = [
    "pendente fornecedor",
    "aguardando confirmacao admin",
    "intencao de compra",
    "aguardando lojista",
    "aguardando pagamento",
    "pago",
    "enviado",
    "entregue",
    "cancelado",
    "rejeitado"
  ];

  // Novos: ação imediata (B2B pendente, QR aguardando, intenção de compra)
  const pedidosNovos = pedidos.filter((pedido: any) => !statusConcluidos.includes(pedido.status));

  // Pendentes públicos: ainda não concluídos (exclui lojistas)
  const pedidosPendentesAgrupados = pedidos.filter((pedido: any) =>
    pedido.usuarioId === 0 && !statusConcluidos.includes(pedido.status)
  );

  // Lojista (QR): vendas concluídas via QR Code pelo lojista
  const pedidosLojista = pedidos.filter((pedido: any) =>
    String(pedido.tipoFluxo || "") === "venda_qr" &&
    ["entregue", "cancelado", "rejeitado"].includes(pedido.status)
  );

  // Concluídos: B2B / site finalizados (não-QR)
  const pedidosConcluidos = pedidos.filter((pedido: any) =>
    ["entregue", "cancelado", "rejeitado"].includes(pedido.status) &&
    String(pedido.tipoFluxo || "") !== "venda_qr"
  );

  return (
    <div className="admin-shell min-h-screen bg-gray-50 flex">
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
          <Link href="/admin/pedidos" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium">
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
                requiredPassword="1307"
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
            ["Aguardando ação", pedidosPendentesCount],
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
            titulo="🔔 Novos"
            descricao="Pedidos em andamento: pendente, pendente de entrega, enviado, concluído."
            pedidos={pedidosNovos}
            userMap={userMap}
            statuses={statuses}
            vazio="Nenhum pedido aguardando ação."
            corHeader="bg-amber-50 border-amber-100"
          />
          <PedidosGrupo
            titulo="⏳ Pendentes"
            descricao="Pedidos públicos pendentes: pendente, aguardando pagamento, aguardando entrega."
            pedidos={pedidosPendentesAgrupados}
            userMap={userMap}
            statuses={statuses}
            vazio="Nenhum pedido em andamento."
            corHeader="bg-blue-50 border-blue-100"
          />
          <PedidosGrupo
            titulo="🏪 Lojista (QR)"
            descricao="Vendas concluídas via QR Code pelos lojistas."
            pedidos={pedidosLojista}
            userMap={userMap}
            statuses={statuses}
            vazio="Nenhuma venda QR concluída."
            corHeader="bg-indigo-50 border-indigo-100"
          />
          <PedidosGrupo
            titulo="✅ Concluídos"
            descricao="Pedidos B2B e site — pagos, entregues ou cancelados."
            pedidos={pedidosConcluidos}
            userMap={userMap}
            statuses={statuses}
            vazio="Nenhum pedido concluído até agora."
            corHeader="bg-gray-50 border-gray-200"
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
  corHeader = "bg-gray-50 border-gray-100",
}: {
  titulo: string;
  descricao: string;
  pedidos: any[];
  userMap: Map<any, any>;
  statuses: string[];
  vazio: string;
  corHeader?: string;
}) {
  return (
    <section className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b px-5 py-4 ${corHeader}`}>
        <div>
          <h2 className="text-lg font-black text-gray-900">{titulo}</h2>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">{descricao}</p>
        </div>
        <span className="w-fit rounded-full bg-luxury-black px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
          {pedidos.length} pedido(s)
        </span>
      </div>
      <div className="admin-table-scroll overflow-hidden">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th style={{ width: "var(--admin-col-ped-id)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pedido</th>
              <th style={{ width: "var(--admin-col-ped-loj)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lojista</th>
              <th style={{ width: "var(--admin-col-ped-prod)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Produto</th>
              <th style={{ width: "var(--admin-col-ped-pgt)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pagamento</th>
              <th style={{ width: "var(--admin-col-ped-tot)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
              <th style={{ width: "var(--admin-col-ped-sts)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {pedidos.map((pedido: any) => {
              const lojista = userMap.get(pedido.usuarioId);
              const isPublicIntent = pedido.status === "intencao de compra" || Number(pedido.usuarioId) === 0;
              const aguardandoDecisaoLojista =
                pedido.tipoFluxo === "venda_qr" && pedido.status === "aguardando pagamento";
              return (
                <tr key={pedido.id} className="hover:bg-gray-50 transition-colors align-middle">
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <div className="font-mono text-xs font-bold text-gray-900">#{pedido.id}</div>
                    <div className="text-[10px] text-gray-400 font-medium">{new Date(pedido.createdAt).toLocaleDateString("pt-BR")}</div>
                  </td>
                  <td className="px-2 py-1.5 min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate" title={isPublicIntent ? "Cliente do site" : lojista?.nome || `Lojista #${pedido.usuarioId}`}>
                      {isPublicIntent ? "Cliente do site" : lojista?.nome || `Lojista #${pedido.usuarioId}`}
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium truncate" title={isPublicIntent ? "Direto" : lojista?.email || ""}>
                      {lojista?.telefone ? `${lojista.telefone} · ` : ""}{isPublicIntent ? "Direto" : lojista?.email || "Sem e-mail"}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 min-w-0">
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="truncate max-w-[10rem]" title={pedido.produtoNome}>{pedido.produtoNome || "Produto"}</span>
                      <span className="text-[10px] text-gray-500 font-normal">
                        ({pedido.quantidade || 0} un. x R$ {Number(pedido.precoUnitario || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                      </span>
                      {pedido.descontoConcedido ? (
                        <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-amber-50 text-amber-800 border border-amber-100">
                          -R$ {Number(pedido.descontoConcedido || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      ) : null}
                    </div>
                    {pedido.observacao && (
                      <details className="text-[10px] text-gray-500 mt-1 cursor-pointer select-none">
                        <summary className="font-bold text-amber-700 hover:text-amber-800 hover:underline">Dados de Entrega</summary>
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
                          return <span className="block p-1 bg-gray-50 border border-gray-100 rounded mt-1">Obs: {pedido.observacao}</span>;
                        })()}
                      </details>
                    )}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-600">{pedido.pagamento || "Pix / Nubank"}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-xs font-bold text-gray-900">
                    <div>R$ {Number(pedido.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                    {pedido.tipoFluxo === "compra_fornecedor" && (
                      <div className="text-[9px] font-normal mt-0.5">
                        <div className="text-green-700">Pago: R$ {Number(pedido.totalPagoFornecedor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                        <div className="text-amber-700">Saldo: R$ {Number(pedido.saldoFornecedor ?? pedido.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {aguardandoDecisaoLojista ? (
                          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">
                            Lojista pendente
                          </span>
                        ) : (
                          <form action={atualizarStatusPedido} className="flex items-center gap-1">
                            <input type="hidden" name="pedidoId" value={pedido.id} />
                            <select name="status" defaultValue={pedido.status} className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-bold uppercase bg-white text-gray-800 cursor-pointer">
                              {statuses.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              name="desconto"
                              step="0.01"
                              min="0"
                              defaultValue={pedido.descontoConcedido || 0}
                              placeholder="Desconto"
                              className="w-16 rounded border border-gray-200 px-1 py-0.5 text-[10px] font-bold bg-white text-gray-800"
                            />
                            <ConfirmSubmitButton
                              message={`Confirmar alteração do pedido #${pedido.id}?`}
                              className="rounded bg-luxury-black px-2 py-0.5 text-[10px] font-bold uppercase text-white hover:bg-luxury-gold transition-colors cursor-pointer"
                            >
                              Salvar
                            </ConfirmSubmitButton>
                          </form>
                        )}
                      </div>
                      {pedido.tipoFluxo === "compra_fornecedor" && (
                        <form action={registrarPagamentoFornecedor} className="flex items-center gap-1 border-t border-gray-100 pt-1">
                          <input type="hidden" name="pedidoId" value={pedido.id} />
                          <input
                            name="quantidadePaga"
                            type="number"
                            min="1"
                            max={Math.max(0, Number(pedido.quantidade || 0) - Number(pedido.quantidadePagaFornecedor || 0))}
                            placeholder="Qtd paga"
                            className="w-16 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-bold bg-white text-gray-800"
                          />
                          <ConfirmSubmitButton
                            message={`Confirmar baixa deste pedido? Isso reduz o saldo do lojista com o fornecedor e credita o estoque pessoal dele conforme a quantidade informada.`}
                            className="rounded bg-green-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white hover:bg-green-800 transition duration-150 cursor-pointer"
                          >
                            Baixar
                          </ConfirmSubmitButton>
                        </form>
                      )}
                      {!["pago","enviado","entregue","rejeitado","cancelado"].includes(pedido.status) && !aguardandoDecisaoLojista && (
                        <form action={deletePedidoAction} className="inline">
                          <input type="hidden" name="pedidoId" value={pedido.id} />
                          <ConfirmSubmitButton
                            message={`Confirmar exclusão do pedido #${pedido.id}?`}
                            className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white hover:bg-red-700 transition-colors cursor-pointer"
                          >
                            Excluir
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
