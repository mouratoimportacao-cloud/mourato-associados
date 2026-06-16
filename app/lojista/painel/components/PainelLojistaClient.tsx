"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ListaProdutosLojista from "./ListaProdutosLojista";
import ConfirmarVendaForm from "./ConfirmarVendaForm";
import AutoRefresh from "../../../components/AutoRefresh";
import { confirmarVendaLojista } from "../actions";
import { logoutLojista } from "../../../../lib/auth";

interface Produto {
  id: number;
  codigo?: number | null;
  nome: string;
  marca: string;
  categoria: string;
  volume: string;
  preco: number | null;
  precoAtacado: number | null;
  estoque: number;
  estoqueLojista: number;
  imagem: string | null;
  descricao: string | null;
}

interface Pedido {
  id: number;
  usuarioId: number;
  produtoId?: number;
  produtoNome?: string;
  quantidade?: number;
  precoUnitario?: number;
  precoTabela?: number | null;
  custoUnitario?: number | null;
  descontoConcedido?: number | null;
  lucroBruto?: number | null;
  tipoFluxo?: string | null;
  quantidadePagaFornecedor?: number | null;
  totalPagoFornecedor?: number | null;
  saldoFornecedor?: number | null;
  pagamento?: string;
  observacao?: string | null;
  total: number;
  status: string;
  createdAt: Date | string;
}

interface Props {
  produtos: Produto[];
  lojistaAtual: {
    id: number;
    nome: string;
    email: string;
    codigoRevenda?: string | null;
    estoquePessoal?: Record<string, number> | null;
  };
  pedidos: Pedido[];
  session: {
    id: number;
    nome: string;
  };
}

export default function PainelLojistaClient({
  produtos,
  lojistaAtual,
  pedidos,
  session,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTabState] = useState<"hub" | "caixa" | "estoque" | "dre" | "fornecedor">("hub");

  useEffect(() => {
    const saved = localStorage.getItem("lojista-active-tab");
    if (saved && ["hub", "caixa", "estoque", "dre", "fornecedor"].includes(saved)) {
      setActiveTabState(saved as any);
    }
  }, []);

  const setActiveTab = (tab: "hub" | "caixa" | "estoque" | "dre" | "fornecedor") => {
    setActiveTabState(tab);
    localStorage.setItem("lojista-active-tab", tab);
  };

  // Estados para Pop-up Automático
  const [dismissedOrderIds, setDismissedOrderIds] = useState<number[]>([]);
  const [activePopupOrder, setActivePopupOrder] = useState<Pedido | null>(null);
  
  // Estados de confirmação da venda do pop-up
  const [isPending, startTransition] = useTransition();
  const [popupErro, setPopupErro] = useState<string | null>(null);
  const [popupDescontoPercentual, setPopupDescontoPercentual] = useState<number>(0);
  const [popupPagamento, setPopupPagamento] = useState<string>("Dinheiro");

  // Lógica de cálculo compartilhada
  const estoquePessoal = useMemo(() => (lojistaAtual?.estoquePessoal || {}) as Record<string, number>, [lojistaAtual]);

  const produtosComEstoquePessoal = useMemo(() => {
    return produtos.map((produto) => ({
      ...produto,
      estoqueLojista: Number(estoquePessoal[String(produto.id)] ?? produto.estoqueLojista ?? 0),
    }));
  }, [produtos, estoquePessoal]);

  const linkRevenda = useMemo(() => {
    return lojistaAtual?.codigoRevenda ? `https://mouratoassociados.com.br/r/${lojistaAtual.codigoRevenda}` : "";
  }, [lojistaAtual]);

  const produtoMap = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const comprasFornecedor = useMemo(() => {
    return pedidos.filter((pedido) =>
      String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
      String(pedido.pagamento || "").includes("Pedido ao fornecedor") ||
      pedido.status === "pendente fornecedor"
    );
  }, [pedidos]);

  const vendasQr = useMemo(() => {
    return pedidos.filter((pedido) =>
      String(pedido.tipoFluxo || "") === "venda_qr" ||
      String(pedido.pagamento || "").includes("Venda via QR do lojista")
    );
  }, [pedidos]);

  const vendasQrConfirmadas = useMemo(() => {
    return vendasQr.filter((pedido) => ["pago", "enviado", "entregue"].includes(String(pedido.status || "")));
  }, [vendasQr]);

  const estoqueRows = useMemo(() => {
    return produtos
      .map((produto) => {
        const quantidade = Number(estoquePessoal[String(produto.id)] || 0);
        return {
          produto,
          quantidade,
          custo: Number(produto.precoAtacado || 0),
          valorVenda: Number(produto.preco || 0),
        };
      })
      .filter((row) => row.quantidade > 0);
  }, [produtos, estoquePessoal]);

  const aguardandoLojista = useMemo(() => {
    return pedidos.filter((pedido) => pedido.status === "aguardando lojista");
  }, [pedidos]);

  const aguardandoAdmin = useMemo(() => {
    return pedidos.filter((pedido) => pedido.status === "aguardando confirmacao admin").length;
  }, [pedidos]);

  const concluidos = useMemo(() => {
    return pedidos.filter((pedido) => ["pago", "enviado", "entregue"].includes(pedido.status)).length;
  }, [pedidos]);

  const maxBar = useMemo(() => Math.max(1, aguardandoLojista.length, aguardandoAdmin, concluidos), [aguardandoLojista, aguardandoAdmin, concluidos]);
  const totalEstoquePessoal = useMemo(() => estoqueRows.reduce((acc, row) => acc + row.quantidade * row.custo, 0), [estoqueRows]);

  const custoVendido = useMemo(() => {
    return vendasQrConfirmadas.reduce((acc: number, pedido) => {
      const produto = pedido.produtoId ? produtoMap.get(pedido.produtoId) : null;
      return acc + Number(produto?.precoAtacado || 0) * Number(pedido.quantidade || 1);
    }, 0);
  }, [vendasQrConfirmadas, produtoMap]);

  const receitaQr = useMemo(() => {
    return vendasQrConfirmadas.reduce((acc: number, pedido) => acc + Number(pedido.total || 0), 0);
  }, [vendasQrConfirmadas]);

  const descontoQr = useMemo(() => {
    return vendasQrConfirmadas.reduce((acc: number, pedido) => {
      const produto = pedido.produtoId ? produtoMap.get(pedido.produtoId) : null;
      const precoTabela = Number(pedido.precoTabela || produto?.preco || 0);
      const precoVendido = Number(pedido.precoUnitario || 0);
      return acc + (precoTabela > precoVendido ? (precoTabela - precoVendido) * Number(pedido.quantidade || 1) : 0);
    }, 0);
  }, [vendasQrConfirmadas, produtoMap]);

  const lucroQr = useMemo(() => receitaQr - custoVendido, [receitaQr, custoVendido]);

  const valorAbertoFornecedor = useMemo(() => {
    return comprasFornecedor.reduce((acc: number, pedido) => {
      if (pedido.status === "cancelado") return acc;
      if (pedido.saldoFornecedor !== null && pedido.saldoFornecedor !== undefined) {
        return acc + Number(pedido.saldoFornecedor || 0);
      }
      return pedido.status === "pendente fornecedor" ? acc + Number(pedido.total || 0) : acc;
    }, 0);
  }, [comprasFornecedor]);

  const produtosMaisVendidos = useMemo(() => {
    return vendasQrConfirmadas.reduce((map: Map<string, number>, pedido) => {
      const nome = String(pedido.produtoNome || "Produto");
      map.set(nome, (map.get(nome) || 0) + Number(pedido.quantidade || 1));
      return map;
    }, new Map<string, number>());
  }, [vendasQrConfirmadas]);

  const rankingProdutos = useMemo(() => {
    return Array.from(produtosMaisVendidos.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [produtosMaisVendidos]);

  const maiorRanking = useMemo(() => Math.max(1, ...rankingProdutos.map((item) => item.quantidade)), [rankingProdutos]);

  // Efeito para detectar novos pedidos e abrir o popup
  useEffect(() => {
    if (aguardandoLojista.length > 0) {
      // Encontrar o primeiro pedido aguardando lojista que ainda não foi dispensado
      const novoPedido = aguardandoLojista.find(
        (pedido) => !dismissedOrderIds.includes(pedido.id)
      );
      if (novoPedido) {
        setActivePopupOrder(novoPedido);
        setPopupErro(null);
        setPopupDescontoPercentual(0);
        setPopupPagamento("Dinheiro");
      } else {
        setActivePopupOrder(null);
      }
    } else {
      setActivePopupOrder(null);
    }
  }, [aguardandoLojista, dismissedOrderIds]);

  // Função para confirmar venda do Popup
  function handleConfirmarVendaPopup() {
    if (!activePopupOrder) return;
    setPopupErro(null);

    const formData = new FormData();
    formData.append("pedidoId", String(activePopupOrder.id));
    formData.append("pagamento", popupPagamento);
    formData.append("descontoPercentual", String(popupDescontoPercentual));

    startTransition(async () => {
      const result = await confirmarVendaLojista(formData);
      if (result.success) {
        setDismissedOrderIds((prev) => [...prev, activePopupOrder.id]);
        setActivePopupOrder(null);
        window.location.reload();
      } else {
        setPopupErro(result.error || "Erro ao confirmar venda.");
      }
    });
  }

  // Dispensar popup temporariamente
  function handleDispensarPopup() {
    if (activePopupOrder) {
      setDismissedOrderIds((prev) => [...prev, activePopupOrder.id]);
      setActivePopupOrder(null);
    }
  }

  // Preço e custo unitário para validação rápida no popup
  const popupProduto = activePopupOrder?.produtoId ? produtoMap.get(activePopupOrder.produtoId) : null;
  const popupCustoUnitario = popupProduto?.precoAtacado || 0;
  const popupPrecoTabela = popupProduto?.preco || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 📱 Abas Individuais e Fluxo unificado ocupando Tela Cheia (Full Screen) */}
      <div className="fixed inset-0 w-full bg-gray-50 flex flex-col overflow-hidden z-50">
        
        {/* Header Fixo no Topo do Celular */}
        <header className="bg-luxury-black text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <img src="/brand/logo-ma.png" alt="Mourato & Associados" className="h-10 w-auto brand-logo-relief" />
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest">Painel Lojista</p>
              <h1 className="text-xs font-bold text-white max-w-[150px] truncate">{session.nome}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== "hub" && (
              <button
                onClick={() => setActiveTab("hub")}
                className="bg-white/10 text-white rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider hover:bg-white/20 transition-colors"
              >
                ← Voltar
              </button>
            )}
            <button
              onClick={async () => {
                await logoutLojista();
                window.location.href = "/lojista";
              }}
              className="bg-red-600/10 text-red-400 rounded-lg p-1.5 hover:bg-red-600/20 transition-colors text-xs"
              title="Sair"
            >
              🚪
            </button>
          </div>
        </header>

        {/* Conteúdo Rolável da Aba Ativa */}
        <div className="flex-grow overflow-y-auto p-4 pb-20">
          
          {/* 1. ABA HUB (Menu Principal do Celular) */}
          {activeTab === "hub" && (
            <div className="space-y-4">
              {/* Seção Link de Venda QR */}
              {linkRevenda && (
                <div className="rounded-xl border border-luxury-gold/20 bg-white p-3 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex-grow">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-luxury-gold">Link de Cliente</p>
                    <h2 className="mt-0.5 text-sm font-bold text-gray-900">Vendas via QR Code</h2>
                    <p className="mt-1 text-[10px] text-gray-400 truncate max-w-[200px]">{linkRevenda}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(linkRevenda);
                        alert("Link copiado para a área de transferência!");
                      }}
                      className="mt-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider transition-colors"
                    >
                      Copiar Link
                    </button>
                  </div>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(linkRevenda)}`}
                    alt="QR Code"
                    className="h-16 w-16 rounded-lg border border-gray-100 bg-white p-1"
                  />
                </div>
              )}

              {/* Grid de Botões/Abas */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* Caixa de Vendas Card */}
                <button
                  onClick={() => setActiveTab("caixa")}
                  className="rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm hover:border-luxury-gold/30 hover:shadow transition-all relative flex flex-col justify-between h-32 text-left"
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-2xl">🛒</span>
                    {aguardandoLojista.length > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white animate-pulse">
                        {aguardandoLojista.length}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mt-2">Caixa de Vendas</h3>
                    <p className="text-[10px] text-gray-400 mt-1">{vendasQr.length} vendas registradas</p>
                  </div>
                </button>

                {/* Estoque Card */}
                <button
                  onClick={() => setActiveTab("estoque")}
                  className="rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm hover:border-luxury-gold/30 hover:shadow transition-all flex flex-col justify-between h-32 text-left"
                >
                  <span className="text-2xl">📦</span>
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mt-2">Meu Estoque</h3>
                    <p className="text-[10px] text-gray-400 mt-1">{estoqueRows.length} itens cadastrados</p>
                  </div>
                </button>

                {/* DRE Card */}
                <button
                  onClick={() => setActiveTab("dre")}
                  className="rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm hover:border-luxury-gold/30 hover:shadow transition-all flex flex-col justify-between h-32 text-left"
                >
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mt-2">Meu DRE</h3>
                    <p className="text-[10px] text-gray-400 mt-1 text-green-600 font-bold">Lucro: R$ {lucroQr.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
                  </div>
                </button>

                {/* Fornecedor Card */}
                <button
                  onClick={() => setActiveTab("fornecedor")}
                  className="rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm hover:border-luxury-gold/30 hover:shadow transition-all flex flex-col justify-between h-32 text-left"
                >
                  <span className="text-2xl">🏛️</span>
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mt-2">Comprar Estoque</h3>
                    <p className="text-[10px] text-gray-400 mt-1">{produtos.length} no fornecedor</p>
                  </div>
                </button>

              </div>

              {/* Atalho Site Final */}
              <Link
                href="/"
                className="block w-full bg-white border border-gray-200 rounded-xl p-3 text-center text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors uppercase tracking-widest shadow-sm"
              >
                🌐 Ver Site Final de Clientes
              </Link>
            </div>
          )}

          {/* 2. ABA CAIXA DE VENDAS */}
          {activeTab === "caixa" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">🛒 Caixa de Vendas</h2>
                <span className="text-[10px] font-bold text-gray-500">{vendasQr.length} vendas</span>
              </div>

              {vendasQr.map((pedido) => {
                const custoUnitario = Number(pedido.custoUnitario || (pedido.produtoId ? produtoMap.get(pedido.produtoId)?.precoAtacado : 0) || 0);
                const precoTabela = Number(pedido.precoTabela || (pedido.produtoId ? produtoMap.get(pedido.produtoId)?.preco : 0) || 0);
                const isPendente = pedido.status === "aguardando lojista";
                return (
                  <div key={pedido.id} className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col gap-2 ${isPendente ? "border-amber-300 bg-amber-50/20" : ""}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-xs">{pedido.produtoNome || "Produto"}</h3>
                        <p className="text-[9px] text-gray-500">{new Date(pedido.createdAt).toLocaleDateString("pt-BR")} | {pedido.quantidade || 1} un.</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                        isPendente
                          ? "bg-amber-100 text-amber-700"
                          : ["entregue","pago"].includes(pedido.status)
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {pedido.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-end border-t border-gray-100 pt-2 mt-1 gap-2">
                      <div>
                        <p className="text-[10px] text-gray-900 font-bold">R$ {Number(pedido.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        {Number(pedido.descontoConcedido || 0) > 0 && (
                          <p className="text-[9px] text-amber-600">Desc: R$ {Number(pedido.descontoConcedido).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        )}
                      </div>

                      <div>
                        {isPendente ? (
                          <ConfirmarVendaForm
                            pedidoId={pedido.id}
                            produtoNome={pedido.produtoNome || "Produto"}
                            custoUnitario={custoUnitario}
                            precoTabela={precoTabela}
                          />
                        ) : (
                          <div className="text-right">
                            {pedido.pagamento && (
                              <span className="text-[9px] text-gray-500 block">{pedido.pagamento}</span>
                            )}
                            <span className="text-[9px] text-gray-400">Concluído</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {vendasQr.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-400">
                  Nenhuma venda pelo QR Code registrada ainda.
                </div>
              )}
            </div>
          )}

          {/* 3. ABA ESTOQUE PESSOAL */}
          {activeTab === "estoque" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">📦 Meu Estoque Pessoal</h2>
                <span className="text-[10px] font-bold text-gray-500">R$ {totalEstoquePessoal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>

              {estoqueRows.map((row) => (
                <div key={row.produto.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm flex justify-between items-center gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xs">{row.produto.nome}</h3>
                    <p className="text-[9px] text-gray-500">{row.produto.marca} | {row.produto.categoria}</p>
                    <p className="text-[9px] text-gray-400 mt-1">Custo: R$ {row.custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-900">{row.quantidade} un.</p>
                    <p className="text-[10px] font-bold text-luxury-gold">R$ {(row.quantidade * row.custo).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
                  </div>
                </div>
              ))}

              {estoqueRows.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-400">
                  Seu estoque pessoal está vazio. Compre produtos do fornecedor para revender.
                </div>
              )}
            </div>
          )}

          {/* 4. ABA DRE DO LOJISTA */}
          {activeTab === "dre" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">📊 DRE do Lojista</h2>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Vendas QR", vendasQr.length],
                  ["Receita", `R$ ${receitaQr.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`],
                  ["Lucro Líquido", `R$ ${lucroQr.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`],
                  ["Descontos Dadas", `R$ ${descontoQr.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`],
                  ["Estoque (Custo)", `R$ ${totalEstoquePessoal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`],
                  ["Aberto Fornecedor", `R$ ${valorAbertoFornecedor.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white border border-gray-100 p-3 shadow-sm">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                    <p className="mt-1.5 text-sm font-black text-gray-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Produtos Mais Vendidos</h3>
                <div className="space-y-2.5">
                  {rankingProdutos.map((item) => (
                    <div key={item.nome}>
                      <div className="mb-0.5 flex justify-between gap-3 text-[10px] font-bold text-gray-500">
                        <span className="truncate">{item.nome}</span>
                        <span>{item.quantidade} un.</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-luxury-gold" style={{ width: `${(item.quantidade / maiorRanking) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  {rankingProdutos.length === 0 && (
                    <p className="text-center text-[10px] italic text-gray-400 py-3">Sem vendas no momento.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. ABA FORNECEDOR (Comprar Estoque) */}
          {activeTab === "fornecedor" && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">🏛️ Catálogo do Fornecedor</h2>
              <ListaProdutosLojista produtos={produtosComEstoquePessoal} />
            </div>
          )}

        </div>

        {/* Footer/Barra de Navegação Fixo para Celulares */}
        <nav className="bg-white border-t border-gray-200 h-16 w-full flex justify-around items-center px-2 shrink-0 shadow-lg z-20">
          {[
            { id: "hub", label: "Hub", icon: "🏠" },
            { id: "caixa", label: "Caixa", icon: "🛒", badge: aguardandoLojista.length },
            { id: "estoque", label: "Estoque", icon: "📦" },
            { id: "dre", label: "DRE", icon: "📊" },
            { id: "fornecedor", label: "Fornecedor", icon: "🏛️" },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center flex-1 h-full relative ${
                  isSelected ? "text-luxury-gold" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[9px] font-bold mt-0.5">{tab.label}</span>
                {Boolean(tab.badge) && (
                  <span className="absolute top-2 right-4 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 🚨 WINDOW/POPUP AUTOMÁTICO DE NOVO PEDIDO (Para celular e desktop)      */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activePopupOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-amber-200 animate-in fade-in zoom-in duration-200 flex flex-col gap-4">
            
            {/* Cabeçalho */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">🚨</span>
                <div>
                  <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">Novo Pedido Recebido!</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Aguardando sua confirmação</p>
                </div>
              </div>
              <button
                onClick={handleDispensarPopup}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Informações do Pedido */}
            <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Produto:</span>
                <span className="font-bold text-gray-900 truncate max-w-[180px]">{activePopupOrder.produtoNome || "Produto"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Quantidade:</span>
                <span className="font-bold text-gray-900">{activePopupOrder.quantidade || 1} un.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Total Sugerido:</span>
                <span className="font-black text-gray-900 text-sm">R$ {Number(activePopupOrder.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Configurações de Venda do Lojista */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Forma de Pagamento</label>
                <select
                  value={popupPagamento}
                  onChange={(e) => setPopupPagamento(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold bg-white"
                >
                  <option value="Dinheiro">💵 Dinheiro</option>
                  <option value="Pix">📱 Pix</option>
                  <option value="Débito">💳 Débito</option>
                  <option value="Crédito à vista">💳 Crédito à vista</option>
                  <option value="Crédito parcelado">💳 Crédito parcelado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Aplicar Desconto (%)</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="1"
                  placeholder="0"
                  value={popupDescontoPercentual || ""}
                  onChange={(e) => setPopupDescontoPercentual(Math.min(90, Math.max(0, Number(e.target.value))))}
                  disabled={isPending}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold"
                />
                {popupCustoUnitario > 0 && popupPrecoTabela > 0 && (
                  <span className="text-[9px] text-gray-400 block text-right mt-0.5">
                    Valor mínimo (custo): R$ {popupCustoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            {/* Alerta de erro do popup */}
            {popupErro && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 text-center">
                ⚠️ {popupErro}
              </div>
            )}

            {/* Ações */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={handleDispensarPopup}
                disabled={isPending}
                className="rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Ignorar
              </button>
              <button
                onClick={handleConfirmarVendaPopup}
                disabled={isPending}
                className="rounded-xl bg-green-600 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isPending ? "Processando…" : "Confirmar Venda"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Auto-refresh silencioso a cada 30s para detectar novos pedidos */}
      <AutoRefresh interval={30000} />
    </div>
  );
}
