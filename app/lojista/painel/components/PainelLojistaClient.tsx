"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OptimizedImage from "../../../components/OptimizedImage";
import ListaProdutosLojista from "./ListaProdutosLojista";
import AutoRefresh from "../../../components/AutoRefresh";
import { confirmarVendaLojista, criarPedidosLojistaCarrinho, rejeitarVendaLojista } from "../actions";
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
    documento?: string | null;
    telefone?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
    codigoRevenda?: string | null;
    estoquePessoal?: Record<string, number> | null;
    limiteAprovado?: number | null;
  };
  pedidos: Pedido[];
  session: {
    id: number;
    nome: string;
  };
}

interface CartItem {
  produtoId: number;
  quantidade: number;
}

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

export default function PainelLojistaClient({
  produtos,
  lojistaAtual,
  pedidos,
}: Props) {
  const router = useRouter();

  // ─── ABA ATIVA E ESTADOS DE NAVEGAÇÃO ─────────────────────────────────────────
  const [activeTab, setActiveTabState] = useState<"inicio" | "produtos" | "estoque" | "carrinho" | "financeiro" | "perfil">("inicio");

  useEffect(() => {
    const loadTab = window.setTimeout(() => {
      const saved = localStorage.getItem("lojista-active-tab");
      if (saved && ["inicio", "produtos", "estoque", "carrinho", "financeiro", "perfil"].includes(saved)) {
        setActiveTabState(saved as any);
      }
    }, 0);
    return () => window.clearTimeout(loadTab);
  }, []);

  const setActiveTab = (tab: "inicio" | "produtos" | "carrinho" | "financeiro" | "perfil") => {
    setActiveTabState(tab);
    localStorage.setItem("lojista-active-tab", tab);
  };

  // ─── ESTADO DO CARRINHO (LocalStorage) ────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderSent, setOrderSent] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isSendingOrder, startSendTransition] = useTransition();

  useEffect(() => {
    const loadCart = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("lojista-cart");
        if (saved) {
          setCart(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Erro ao carregar carrinho:", e);
      }
    }, 0);
    return () => window.clearTimeout(loadCart);
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem("lojista-cart", JSON.stringify(newCart));
    } catch (e) {
      console.error("Erro ao salvar carrinho:", e);
    }
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddToCart = (produtoId: number, quantidade: number) => {
    const prod = produtoMap.get(produtoId);
    if (!prod) return;
    const maxStock = Number(prod.estoque || 0);

    const existingIndex = cart.findIndex((item) => item.produtoId === produtoId);
    const newCart = [...cart];
    
    let currentQty = 0;
    if (existingIndex > -1) {
      currentQty = newCart[existingIndex].quantidade;
    }
    
    const totalRequested = currentQty + quantidade;
    if (totalRequested > maxStock) {
      showToast(`Estoque de atacado máximo: ${maxStock} un.`);
      if (existingIndex > -1) {
        newCart[existingIndex].quantidade = maxStock;
      } else if (maxStock > 0) {
        newCart.push({ produtoId, quantidade: maxStock });
      }
    } else {
      if (existingIndex > -1) {
        newCart[existingIndex].quantidade = totalRequested;
      } else {
        newCart.push({ produtoId, quantidade });
      }
      showToast("Produto adicionado ao pedido!");
    }
    saveCart(newCart);
  };

  const handleUpdateQuantity = (produtoId: number, delta: number) => {
    const prod = produtoMap.get(produtoId);
    const maxStock = prod ? Number(prod.estoque || 0) : 999990;

    const newCart = cart.map((item) => {
      if (item.produtoId === produtoId) {
        const newQty = item.quantidade + delta;
        if (newQty > maxStock) {
          showToast(`Estoque máximo do fornecedor: ${maxStock} un.`);
          return { ...item, quantidade: maxStock };
        }
        return { ...item, quantidade: Math.max(1, newQty) };
      }
      return item;
    });
    saveCart(newCart);
  };

  const handleRemoveItem = (produtoId: number) => {
    const newCart = cart.filter((item) => item.produtoId !== produtoId);
    saveCart(newCart);
    showToast("Item removido do carrinho");
  };

  const handleEnviarPedido = () => {
    if (cart.length === 0) return;
    setOrderError(null);
    startSendTransition(async () => {
      const res = await criarPedidosLojistaCarrinho(cart);
      if (res.success) {
        saveCart([]);
        setOrderSent(true);
        showToast("Pedido enviado com sucesso!");
        router.refresh();
      } else {
        setOrderError(res.error || "Erro ao enviar pedido.");
      }
    });
  };

  // ─── ESTADOS PARA POP-UP AUTOMÁTICO DE VENDAS ──────────────────────────────────
  const [dismissedOrderIds, setDismissedOrderIds] = useState<number[]>([]);
  const [activePopupOrder, setActivePopupOrder] = useState<Pedido | null>(null);
  const [isPending, startTransition] = useTransition();
  const [popupErro, setPopupErro] = useState<string | null>(null);
  const [popupDescontoValor, setPopupDescontoValor] = useState<number>(0);
  const [popupPagamento, setPopupPagamento] = useState<string>("Dinheiro");

  // ─── CÁLCULOS FINANCEIROS EM TEMPO REAL ───────────────────────────────────────
  const estoquePessoal = useMemo(() => (lojistaAtual?.estoquePessoal || {}) as Record<string, number>, [lojistaAtual]);

  const totalEstoqueDisponivel = useMemo(() => {
    return Object.values(estoquePessoal).reduce((acc, val) => acc + Number(val || 0), 0);
  }, [estoquePessoal]);

  const linkRevenda = useMemo(() => {
    return lojistaAtual?.codigoRevenda ? `https://mouratoassociados.com.br/r/${lojistaAtual.codigoRevenda}` : "";
  }, [lojistaAtual]);

  const produtoMap = new Map(produtos.map((p) => [p.id, p]));

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

  const vendasQrConfirmadas = vendasQr.filter((pedido) => ["pago", "enviado", "entregue"].includes(String(pedido.status || "")));

  const totalComprado = useMemo(() => {
    return comprasFornecedor
      .filter((p) => p.status !== "cancelado")
      .reduce((acc, p) => acc + Number(p.total || 0), 0);
  }, [comprasFornecedor]);

  const totalPago = useMemo(() => {
    return comprasFornecedor
      .filter((p) => p.status !== "cancelado")
      .reduce((acc, p) => {
        const pago = Number(p.total || 0) - Number(p.saldoFornecedor ?? 0);
        return acc + Math.max(0, pago);
      }, 0);
  }, [comprasFornecedor]);

  const saldoDevedor = useMemo(() => {
    return comprasFornecedor
      .filter((p) => p.status !== "cancelado")
      .reduce((acc, p) => acc + Number(p.saldoFornecedor ?? p.total ?? 0), 0);
  }, [comprasFornecedor]);

  const limiteDisponivel = useMemo(() => {
    const limiteAprovado = Number(lojistaAtual?.limiteAprovado ?? 0);
    return Math.max(0, limiteAprovado - saldoDevedor);
  }, [lojistaAtual?.limiteAprovado, saldoDevedor]);

  // Níveis de Parceiro: Bronze (< 2k), Prata (< 5k), Ouro (< 10k), Diamante (>= 10k)
  const nivelParceiro = useMemo(() => {
    if (totalComprado >= 10000) return "Diamante";
    if (totalComprado >= 5000) return "Ouro";
    if (totalComprado >= 2000) return "Prata";
    return "Bronze";
  }, [totalComprado]);

  // Vendas do Mês e Lucro do Mês corrente (Mês Atual do servidor/local)
  const { faturamentoMes, lucroMes, pedidosRealizados } = useMemo(() => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    const doMes = vendasQrConfirmadas.filter((p) => {
      const dt = new Date(p.createdAt);
      return dt.getMonth() === mesAtual && dt.getFullYear() === anoAtual;
    });

    const faturamento = doMes.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const lucro = doMes.reduce((acc, p) => acc + Number(p.lucroBruto || 0), 0);
    const totalPedidos = pedidos.filter(
      (p) => !["cancelado", "rejeitado"].includes(p.status)
    ).length;

    return {
      faturamentoMes: faturamento,
      lucroMes: lucro,
      pedidosRealizados: totalPedidos,
    };
  }, [vendasQrConfirmadas, pedidos]);

  // Histórico de pagamentos amortizados
  const historicoPagamentos = useMemo(() => {
    return comprasFornecedor
      .filter((p) => p.status !== "cancelado" && Number(p.total || 0) - Number(p.saldoFornecedor ?? 0) > 0)
      .map((p) => {
        const valorPago = Number(p.total || 0) - Number(p.saldoFornecedor ?? 0);
        return {
          id: p.id,
          data: new Date(p.createdAt).toLocaleDateString("pt-BR"),
          valor: valorPago,
          descricao: `Amortização pedido #${p.id} - ${p.produtoNome || "Lote de estoque"}`,
        };
      })
      .sort((a, b) => b.id - a.id);
  }, [comprasFornecedor]);

  // DRE Comercial
  const dreReport = useMemo(() => {
    let receitaSugerida = 0;
    let custoCompra = 0;
    let descontoConcedido = 0;

    vendasQrConfirmadas.forEach((p) => {
      const qty = Number(p.quantidade || 1);
      const precoTab = Number(p.precoTabela || p.precoUnitario || 0);
      const desc = Number(p.descontoConcedido || 0);
      
      const totalSugerido = p.precoTabela ? (precoTab * qty) : (Number(p.total || 0) + desc);
      
      receitaSugerida += totalSugerido;
      custoCompra += Number(p.custoUnitario || 0) * qty;
      descontoConcedido += desc;
    });

    const receitaReal = receitaSugerida - descontoConcedido;
    const lucroLiquido = receitaReal - custoCompra;

    return {
      receitaSugerida,
      custoCompra,
      descontoConcedido,
      receitaReal,
      lucroLiquido,
    };
  }, [vendasQrConfirmadas]);

  // Preview do Carrinho no rodapé
  const cartTotals = useMemo(() => {
    let itemsCount = 0;
    let totalValue = 0;
    cart.forEach((item) => {
      const prod = produtos.find((produto) => produto.id === item.produtoId);
      if (prod) {
        itemsCount += item.quantidade;
        totalValue += Number(prod.precoAtacado || 0) * item.quantidade;
      }
    });
    return { itemsCount, totalValue };
  }, [cart, produtos]);

  // Produtos formatados com estoque pessoal do lojista
  const produtosComEstoquePessoal = useMemo(() => {
    return produtos.map((produto) => ({
      ...produto,
      estoqueLojista: Number(estoquePessoal[String(produto.id)] ?? produto.estoqueLojista ?? 0),
    }));
  }, [produtos, estoquePessoal]);

  const estoquePessoalRows = useMemo(() => {
    return produtos
      .map((produto) => {
        const quantidade = Number(estoquePessoal[String(produto.id)] || 0);
        const custo = Number(produto.precoAtacado || 0);
        return {
          produto,
          quantidade,
          custo,
          total: quantidade * custo,
        };
      })
      .filter((row) => row.quantidade > 0);
  }, [produtos, estoquePessoal]);

  const aguardandoLojista = useMemo(() => {
    return pedidos.filter((pedido) => pedido.status === "aguardando lojista");
  }, [pedidos]);

  const navTabs = [
    { id: "inicio", label: "Início", icon: "🏠", badge: aguardandoLojista.length },
    { id: "produtos", label: "Produtos", icon: "🛍️" },
    { id: "estoque", label: "Estoque", icon: "📦" },
    { id: "carrinho", label: "Carrinho", icon: "🛒", badge: cart.length },
    { id: "financeiro", label: "Financeiro", icon: "📊" },
    { id: "perfil", label: "Perfil", icon: "👤" },
  ];

  // Efeito de detecção de novo pedido pendente para popup
  useEffect(() => {
    const syncPopup = window.setTimeout(() => {
      if (aguardandoLojista.length > 0) {
        const novoPedido = aguardandoLojista.find(
          (pedido) => !dismissedOrderIds.includes(pedido.id)
        );
        if (novoPedido) {
          setActivePopupOrder(novoPedido);
          setPopupErro(null);
          setPopupDescontoValor(0);
          setPopupPagamento("Dinheiro");
        } else {
          setActivePopupOrder(null);
        }
      } else {
        setActivePopupOrder(null);
      }
    }, 0);
    return () => window.clearTimeout(syncPopup);
  }, [aguardandoLojista, dismissedOrderIds]);

  function handleConfirmarVendaPopup() {
    if (!activePopupOrder) return;
    setPopupErro(null);

    const formData = new FormData();
    formData.append("pedidoId", String(activePopupOrder.id));
    formData.append("pagamento", popupPagamento);
    formData.append("descontoValor", String(popupDescontoValor));

    startTransition(async () => {
      const result = await confirmarVendaLojista(formData);
      if (result.success) {
        setDismissedOrderIds((prev) => [...prev, activePopupOrder.id]);
        setActivePopupOrder(null);
        showToast("Venda confirmada!");
        router.refresh();
      } else {
        setPopupErro(result.error || "Erro ao confirmar venda.");
      }
    });
  }

  function handleFecharPopup() {
    if (!activePopupOrder) return;
    setDismissedOrderIds((prev) => [...prev, activePopupOrder.id]);
    setActivePopupOrder(null);
  }

  function handleRejeitarVendaPopup() {
    if (!activePopupOrder) return;
    setPopupErro(null);

    startTransition(async () => {
      const result = await rejeitarVendaLojista(activePopupOrder.id);
      if (result.success) {
        setDismissedOrderIds((prev) => [...prev, activePopupOrder.id]);
        setActivePopupOrder(null);
        showToast("Pedido rejeitado sem baixar estoque.");
        router.refresh();
      } else {
        setPopupErro(result.error || "Erro ao rejeitar pedido.");
      }
    });
  }

  const popupProduto = activePopupOrder?.produtoId ? produtoMap.get(activePopupOrder.produtoId) : null;
  const popupCustoUnitario = popupProduto?.precoAtacado || 0;
  const popupPrecoTabela = popupProduto?.preco || 0;
  const popupQuantidade = activePopupOrder?.quantidade || 1;
  const popupTotalSugerido = Number(activePopupOrder?.total || 0);
  const popupTotalCusto = popupCustoUnitario * popupQuantidade;
  const popupPrecoFinalEstimado = Math.max(popupTotalCusto, popupTotalSugerido - popupDescontoValor);
  const popupLucroEstimado = popupPrecoFinalEstimado - popupTotalCusto;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-zinc-900 selection:text-white antialiased">
      {/* ─── TOAST NOTIFICATION DE ESTADO ─── */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-white text-zinc-950 font-black px-6 py-3 rounded-full shadow-2xl border border-zinc-200 text-xs tracking-widest uppercase animate-bounce">
          ✨ {toastMessage}
        </div>
      )}

      {/* Conteúdo Centralizado ou em Painel de Tela Cheia */}
      <div className="fixed inset-0 w-full bg-stone-50 flex overflow-hidden z-50">
        <aside className="hidden lg:flex lg:w-72 xl:w-80 flex-col bg-white text-stone-900 sticky top-0 h-screen border-r border-stone-200">
          <div className="p-6 border-b border-stone-200">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-24 flex-shrink-0 flex items-center">
                <img
                  src="/brand/logo-ma.png"
                  alt="Mourato & Associados"
                  className="h-14 w-auto object-contain brand-logo-relief"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold">Painel do Lojista</p>
                <h2 className="text-sm font-bold text-stone-900 truncate max-w-[190px]">{lojistaAtual.nome}</h2>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navTabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${isSelected ? "bg-white text-zinc-950 border border-zinc-200 shadow-md font-bold" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
                >
                  <span className="flex items-center gap-3">
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </span>
                  {tab.badge ? (
                    <span className="min-w-[24px] rounded-full bg-red-500 text-[10px] font-black text-white px-2 py-1 text-center">{tab.badge}</span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-stone-200 space-y-3">
            <Link
              href="/"
              className="block w-full text-center bg-stone-100 text-stone-900 border border-stone-200 rounded-2xl px-4 py-3 text-sm font-bold transition hover:bg-stone-200"
            >
              Voltar ao Site
            </Link>
            <button
              onClick={async () => {
                await logoutLojista();
                window.location.href = "/lojista";
              }}
              className="w-full bg-red-50 text-red-650 border border-red-100 rounded-2xl px-4 py-3 text-sm font-bold transition hover:bg-red-100"
            >
              Sair do Painel
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          {/* HEADER DE LUXO (White & Stone) */}
          <header className="bg-white/95 backdrop-blur-md text-stone-900 px-4 py-4 flex items-center justify-between border-b border-stone-200 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <OptimizedImage
                src="/brand/logo-ma.png"
                alt="Mourato & Associados"
                width={180}
                height={60}
                priority
                className="relative h-16 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-[8px] text-stone-500 font-black uppercase tracking-[0.25em]">Painel Lojista</p>
              <h1 className="text-xs font-bold text-stone-900 max-w-[150px] truncate">{lojistaAtual.nome}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[10px] font-black text-stone-800 uppercase tracking-widest">
              🏆 {nivelParceiro}
            </span>
            <button
              onClick={async () => {
                await logoutLojista();
                window.location.href = "/lojista";
              }}
              className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-2.5 hover:bg-red-100 transition-all text-xs cursor-pointer"
              title="Sair do Painel"
            >
              🚪
            </button>
          </div>
        </header>

        {/* CONTAINER DO CONTEÚDO ATIVO */}
        <main className="flex-grow overflow-y-auto p-4 pb-28">

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TELA 1: INÍCIO (HUB DO LOJISTA)                                     */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {activeTab === "inicio" && (
             <div className="space-y-5">
              
              {/* Alerta de Vendas Aguardando Confirmação */}
              {aguardandoLojista.length > 0 && (
                <div className="relative group overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-4 shadow-md flex items-center justify-between gap-4 animate-pulse">
                  <div>
                    <h3 className="text-xs font-black text-red-650 uppercase tracking-wider">Ação Necessária!</h3>
                    <p className="text-[10px] text-red-800 mt-1">Você possui {aguardandoLojista.length} venda(s) de clientes aguardando sua liberação de estoque.</p>
                  </div>
                  <button
                    onClick={() => {
                      const firstPending = aguardandoLojista[0];
                      setActivePopupOrder(firstPending);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-black text-[9px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border border-red-500 shadow-sm"
                  >
                    Liberar
                  </button>
                </div>
              )}

              {/* Informações de Perfil e Link QR */}
              {linkRevenda && (
                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex items-center justify-between gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-stone-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-500">Seu Link de Vendas</p>
                    <h2 className="mt-1 text-sm font-serif font-bold text-stone-900 truncate">Catálogo Digital Lojista</h2>
                    <p className="mt-1.5 text-[10px] text-stone-500 truncate max-w-[200px]">{linkRevenda}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(linkRevenda);
                        showToast("Link copiado!");
                      }}
                      className="mt-3.5 bg-white hover:bg-stone-50 text-zinc-950 border border-zinc-200 text-[9px] font-black px-3.5 py-2 rounded-lg uppercase tracking-widest transition-all cursor-pointer shadow-sm"
                    >
                      Copiar Link
                    </button>
                  </div>
                  <div className="relative group shrink-0">
                    <div className="absolute -inset-0.5 bg-stone-200 rounded-xl blur opacity-30 group-hover:opacity-100 transition"></div>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(linkRevenda)}&color=1c1917&bgcolor=ffffff`}
                      alt="QR Code Revenda"
                      className="relative h-20 w-20 rounded-xl border border-stone-200 bg-white p-1.5"
                    />
                  </div>
                </div>
              )}

              {/* CARDS PRINCIPAIS DE DESEMPENHO */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">Desempenho Comercial</h3>
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Vendas do Mês */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col justify-between h-28 hover:border-stone-300 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Vendas do Mês</p>
                    <div>
                      <p className="text-sm font-serif font-black text-stone-900">R$ {faturamentoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-stone-400 mt-1 uppercase">Vendas QR confirmadas</p>
                    </div>
                  </div>

                  {/* Lucro Atual */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col justify-between h-28 hover:border-stone-300 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Lucro Atual</p>
                    <div>
                      <p className="text-sm font-serif font-black text-emerald-650">R$ {lucroMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-stone-400 mt-1 uppercase">Ganhos do mês corrente</p>
                    </div>
                  </div>

                  {/* Pedidos Realizados */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col justify-between h-28 hover:border-stone-300 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Pedidos Realizados</p>
                    <div>
                      <p className="text-lg font-serif font-black text-stone-900">{pedidosRealizados}</p>
                      <p className="text-[8px] text-stone-400 mt-1 uppercase">Total de compras/vendas</p>
                    </div>
                  </div>

                  {/* Estoque Disponível */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col justify-between h-28 hover:border-stone-300 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Estoque Pessoal</p>
                    <div>
                      <p className="text-lg font-serif font-black text-stone-900">{totalEstoqueDisponivel} un.</p>
                      <p className="text-[8px] text-stone-400 mt-1 uppercase">Unidades sob custódia</p>
                    </div>
                  </div>

                  {/* Saldo Devedor */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col justify-between h-28 hover:border-stone-300 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Saldo Devedor</p>
                    <div>
                      <p className="text-sm font-serif font-black text-red-600">R$ {saldoDevedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-stone-400 mt-1 uppercase">Pendente com fornecedor</p>
                    </div>
                  </div>

                  {/* Limite Disponível */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col justify-between h-28 hover:border-stone-300 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Crédito Disponível</p>
                    <div>
                      <p className="text-sm font-serif font-black text-blue-650">R$ {limiteDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-stone-400 mt-1 uppercase">De limite de R$ {Number(lojistaAtual?.limiteAprovado ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Atalho Site Final */}
              <Link
                href="/"
                className="block w-full bg-white border border-zinc-200 rounded-2xl p-4 text-center text-xs font-black text-zinc-950 hover:bg-stone-50 transition-all uppercase tracking-widest shadow-md cursor-pointer"
              >
                🌐 Acessar Catálogo de Clientes
              </Link>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TELA 2: PRODUTOS (CATÁLOGO DO FORNECEDOR)                          */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {activeTab === "produtos" && (
            <div className="space-y-4">
              <ListaProdutosLojista produtos={produtosComEstoquePessoal} onAddToCart={handleAddToCart} />
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TELA: ESTOQUE PESSOAL DO LOJISTA                                   */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {activeTab === "estoque" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h2 className="text-sm font-serif font-bold text-stone-900 uppercase tracking-wider">📦 Meu Estoque Pessoal</h2>
                  <p className="text-[10px] text-stone-500 mt-0.5 uppercase tracking-wider">Produtos físicos pronta entrega sob sua custódia</p>
                </div>
                <span className="text-[10px] font-black bg-stone-100 border border-stone-200 text-stone-700 rounded-full px-2.5 py-1 uppercase tracking-wider">
                  {estoquePessoalRows.length} itens distintos
                </span>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-stone-200 text-left">
                    <thead className="bg-stone-100/80 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-[9px] font-black text-stone-600 uppercase tracking-wider">Produto</th>
                        <th className="px-4 py-3 text-[9px] font-black text-stone-600 uppercase tracking-wider text-center">Quantidade</th>
                        <th className="px-4 py-3 text-[9px] font-black text-stone-600 uppercase tracking-wider text-right">Custo Unitário</th>
                        <th className="px-4 py-3 text-[9px] font-black text-stone-600 uppercase tracking-wider text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {estoquePessoalRows.map((row) => (
                        <tr key={row.produto.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs font-bold text-stone-900">{row.produto.nome}</p>
                            <p className="text-[9px] text-stone-400 mt-0.5">{row.produto.marca} / {row.produto.volume}</p>
                          </td>
                          <td className="px-4 py-3 text-xs font-black text-stone-800 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded bg-stone-100 border border-stone-200">
                              {row.quantidade} un.
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-stone-700 text-right font-medium">
                            R$ {row.custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-xs font-black text-stone-900 text-right font-serif">
                            R$ {row.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}

                      {estoquePessoalRows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-xs text-stone-400 italic">
                            Você não possui produtos em seu estoque pessoal.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {estoquePessoalRows.length > 0 && (
                  <div className="bg-stone-50 px-4 py-3.5 border-t border-stone-200 flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px]">Valor Total Investido:</span>
                    <span className="font-serif font-black text-stone-900 text-sm">
                      R$ {estoquePessoalRows.reduce((acc, r) => acc + r.total, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TELA 3: CARRINHO DO LOJISTA                                        */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {activeTab === "carrinho" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-sm font-serif font-bold text-stone-900 uppercase tracking-wider">🛒 Carrinho de Estoque</h2>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{cart.length} itens no rascunho</span>
              </div>

              {orderSent ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center space-y-4 shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 border border-stone-200">
                    <span className="text-3xl">✨</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-serif font-bold text-stone-900">Pedido Enviado com Sucesso!</h3>
                    <div className="inline-flex rounded-full bg-stone-100 border border-stone-200 px-4 py-1.5 text-xs font-black text-stone-700 uppercase tracking-widest">
                      Status: Aguardando Aprovação do Fornecedor
                    </div>
                    <p className="text-[10px] text-stone-500 mt-2 leading-relaxed">Seu pedido foi registrado no sistema e aguarda a validação do administrador para o envio dos produtos ao seu estoque pessoal.</p>
                  </div>
                  <button
                    onClick={() => {
                      setOrderSent(false);
                      setActiveTab("produtos");
                    }}
                    className="w-full bg-white border border-zinc-200 hover:bg-stone-50 text-zinc-950 font-black text-[10px] py-3.5 rounded-xl uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
                  >
                    Voltar ao Catálogo
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500 space-y-4 shadow-sm">
                  <span className="text-4xl block">🛍️</span>
                  <p className="text-xs italic">Seu carrinho está vazio.</p>
                  <button
                    onClick={() => setActiveTab("produtos")}
                    className="inline-flex items-center justify-center bg-white border border-zinc-200 text-zinc-950 hover:bg-stone-50 font-bold text-[10px] px-6 py-3 rounded-xl uppercase tracking-widest transition-all cursor-pointer shadow-sm"
                  >
                    Adicionar Produtos
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Itens do carrinho */}
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const prod = produtoMap.get(item.produtoId);
                      if (!prod) return null;
                      const unitPrice = Number(prod.precoAtacado || 0);
                      const subtotal = unitPrice * item.quantidade;

                      return (
                        <div key={item.produtoId} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm flex justify-between items-center gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 p-1">
                              <OptimizedImage
                                src={prod.imagem}
                                alt={prod.nome}
                                fill
                                sizes="56px"
                                className="object-cover rounded"
                                fallbackText="M&A"
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-stone-900 text-xs truncate">{prod.nome}</h4>
                              <p className="text-[9px] text-stone-500 mt-0.5">{prod.marca} - {prod.volume}</p>
                              <p className="text-[9px] text-stone-900 font-bold mt-1">Atacado: R$ {unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {/* Controle de quantidade */}
                            <div className="flex items-center gap-1.5 bg-stone-105 border border-stone-200 rounded-lg p-1">
                              <button
                                onClick={() => handleUpdateQuantity(item.produtoId, -1)}
                                className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-stone-900">{item.quantidade}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item.produtoId, 1)}
                                className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-stone-900">R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                              <button
                                onClick={() => handleRemoveItem(item.produtoId)}
                                className="text-red-650 hover:text-red-500 text-xs p-1 cursor-pointer"
                                title="Remover item"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Resumo de valores */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500">Total do Lote:</span>
                      <span className="font-serif font-black text-stone-900 text-sm">R$ {cartTotals.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p className="text-[8px] text-stone-500 leading-relaxed uppercase tracking-wider">
                      ℹ️ O envio gerará um pedido pendente de aprovação do fornecedor. Não há necessidade de escolha de forma de pagamento agora (a ser combinada após a liberação).
                    </p>

                    {orderError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 text-center">
                        ⚠️ {orderError}
                      </div>
                    )}

                    <button
                      onClick={handleEnviarPedido}
                      disabled={isSendingOrder}
                      className="w-full bg-white border border-zinc-200 hover:bg-stone-50 text-zinc-950 font-black text-[10px] py-3.5 rounded-xl uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-md cursor-pointer"
                    >
                      {isSendingOrder ? "Processando..." : "Enviar Pedido de Estoque"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TELA 4: FINANCEIRO DO LOJISTA                                      */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {activeTab === "financeiro" && (
            <div className="space-y-5">
              
              {/* Resumo Financeiro */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">Resumo Financeiro</h3>
                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3.5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-stone-500/5 rounded-full blur-2xl"></div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Total Comprado</p>
                      <p className="font-serif font-black text-stone-900 text-sm mt-0.5">R$ {totalComprado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Total Pago</p>
                      <p className="font-serif font-black text-emerald-650 text-sm mt-0.5">R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Saldo Devedor</p>
                      <p className="font-serif font-black text-red-600 text-sm mt-0.5">R$ {saldoDevedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Status Financeiro</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider mt-1.5 ${
                        saldoDevedor > 0
                          ? "bg-red-50 border border-red-100 text-red-600"
                          : "bg-green-50 border border-green-100 text-green-700"
                      }`}>
                        {saldoDevedor > 0 ? "Pendente" : "Quitado"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DRE COMERCIAL */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">Demonstrativo DRE (Comercial)</h3>
                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3 text-xs">
                  <div className="flex justify-between font-bold border-b border-stone-100 pb-2">
                    <span className="text-stone-700">Receita Estimada (Valor Sugerido)</span>
                    <span className="text-stone-900">R$ {dreReport.receitaSugerida.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>(-) Custo da Compra (Fornecedor)</span>
                    <span className="text-red-650">- R$ {dreReport.custoCompra.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>(-) Descontos Concedidos</span>
                    <span className="text-red-650">- R$ {dreReport.descontoConcedido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold border-y border-stone-100 py-2 my-1">
                    <span className="text-stone-850">(=) Preço Final Vendido</span>
                    <span className="text-stone-900">R$ {dreReport.receitaReal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-black border-t border-stone-200 pt-2 text-sm">
                    <span className="text-stone-900">(=) Lucro Líquido Real</span>
                    <span className="text-emerald-650 font-serif">R$ {dreReport.lucroLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Histórico de Pagamentos */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">Histórico de Pagamentos (Amortizações)</h3>
                <div className="space-y-2.5">
                  {historicoPagamentos.map((pag, idx) => (
                    <div key={idx} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm flex justify-between items-center gap-3">
                      <div>
                        <p className="text-xs font-bold text-stone-900">{pag.descricao}</p>
                        <p className="text-[9px] text-stone-400 mt-0.5">Lote pago em {pag.data}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-650">+ R$ {pag.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}

                  {historicoPagamentos.length === 0 && (
                    <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center text-xs text-stone-400 italic">
                      Nenhum registro de pagamento amortizado.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* TELA 5: PERFIL DO LOJISTA                                          */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {activeTab === "perfil" && (
            <div className="space-y-4">
              <h2 className="text-sm font-serif font-bold text-stone-900 uppercase tracking-wider mb-2">👤 Dados Cadastrais</h2>

              <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-stone-500/5 rounded-full blur-3xl"></div>
                
                {[
                  ["Nome Completo", lojistaAtual.nome],
                  ["E-mail", lojistaAtual.email],
                  ["Documento (CPF/CNPJ)", lojistaAtual.documento || "Não cadastrado"],
                  ["Telefone de Contato", lojistaAtual.telefone || "Não cadastrado"],
                  ["Endereço Completo", lojistaAtual.endereco || "Não cadastrado"],
                  ["Cidade / UF", lojistaAtual.cidade ? `${lojistaAtual.cidade} - ${lojistaAtual.estado || ""}` : "Não cadastrado"],
                  ["CEP", lojistaAtual.cep || "Não cadastrado"],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-stone-100 pb-3 last:border-b-0 last:pb-0">
                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-bold text-stone-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>

              {/* Botão de Logout Principal */}
              <button
                onClick={async () => {
                  await logoutLojista();
                  window.location.href = "/lojista";
                }}
                className="w-full mt-4 bg-red-50 border border-red-100 hover:bg-red-100 text-red-655 font-black text-[10px] py-4 rounded-xl uppercase tracking-widest transition-all cursor-pointer shadow-sm text-center"
              >
                🚪 Sair da Conta do Lojista
              </button>
            </div>
          )}

        </main>

        {/* ─── PREVIEW FLUTUANTE DO CARRINHO (Meu Pedido) ─── */}
        {activeTab !== "carrinho" && cart.length > 0 && (
          <div className="fixed bottom-20 left-4 right-4 z-40 bg-white border border-stone-200 shadow-2xl rounded-2xl p-3.5 flex justify-between items-center gap-3 animate-in slide-in-from-bottom duration-300">
            <div>
              <p className="text-[8px] font-black uppercase text-stone-500 tracking-wider">Meu Pedido Atual</p>
              <p className="text-xs font-bold text-stone-900 mt-0.5">
                {cartTotals.itemsCount} {cartTotals.itemsCount === 1 ? "Item" : "Itens"}
                <span className="mx-2 text-stone-300">|</span>
                R$ {cartTotals.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("carrinho")}
              className="bg-white border border-zinc-200 hover:bg-stone-50 text-zinc-950 font-black text-[9px] px-4 py-2.5 rounded-xl uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
            >
              Finalizar Pedido
            </button>
          </div>
        )}

        {/* 📱 MENU INFERIOR DE 5 ABAS TÁTEIS (Responsivo/Celular) */}
        <nav className="lg:hidden bg-white/95 backdrop-blur-md border-t border-stone-200 h-16 w-full flex justify-around items-center px-2 shrink-0 shadow-sm z-30">
          {navTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === "carrinho") {
                    setOrderSent(false); // Reset confirmation state if navigating to cart tab
                  }
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-300 cursor-pointer ${
                  isSelected ? "text-zinc-950 font-bold scale-105" : "text-stone-500 hover:text-stone-750"
                }`}
              >
                <span className="text-xl mb-0.5">{tab.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-wider">{tab.label}</span>
                {Boolean(tab.badge) && (
                  <span className="absolute top-1 right-3 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white animate-pulse shadow-md">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </div>
      </div>

      {/* 🚨 WINDOW POPUP AUTOMÁTICO DE NOVO PEDIDO DO QR CODE 🚨 */}
      {activePopupOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-200 flex flex-col gap-4 text-stone-900">
            
            {/* Cabeçalho */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">🚨</span>
                <div>
                  <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest">Novo Pedido no QR!</h3>
                  <p className="text-[10px] text-stone-500 mt-0.5">Aguardando sua confirmação</p>
                </div>
              </div>
              <button
                onClick={handleFecharPopup}
                className="text-stone-500 hover:text-stone-850 text-sm font-bold p-1 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Informações do Pedido */}
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Produto:</span>
                <span className="font-bold text-stone-900 truncate max-w-[180px]">{activePopupOrder.produtoNome || "Produto"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Quantidade:</span>
                <span className="font-bold text-stone-900">{activePopupOrder.quantidade || 1} un.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Total Sugerido:</span>
                <span className="font-black text-stone-900 text-sm">R$ {Number(activePopupOrder.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Informações do Cliente */}
            {(() => {
              const parsedInfo = activePopupOrder.observacao ? parseClienteInfo(activePopupOrder.observacao) : null;
              if (!parsedInfo) return null;
              return (
                <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs space-y-1.5 text-left">
                  <p className="text-[9px] font-black text-stone-700 uppercase tracking-wider mb-1">Dados de Entrega do Cliente</p>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Nome:</span>
                    <span className="font-bold text-stone-900">{parsedInfo.nome}</span>
                  </div>
                  {parsedInfo.contato && (
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-medium">Contato:</span>
                      <a
                        href={`https://wa.me/${parsedInfo.contato.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-zinc-950 font-bold hover:underline transition-colors"
                      >
                        {parsedInfo.contato}
                      </a>
                    </div>
                  )}
                  {parsedInfo.endereco ? (
                    <div className="flex flex-col gap-0.5 pt-1 border-t border-stone-200 mt-1">
                      <span className="text-[9px] text-stone-500 font-medium uppercase tracking-wider">Endereço de Entrega:</span>
                      <span className="font-bold text-stone-900 leading-tight">
                        {parsedInfo.endereco}
                      </span>
                      {parsedInfo.bairro && (
                        <span className="text-stone-800">
                          {parsedInfo.bairro} - {parsedInfo.cidadeEstado}
                        </span>
                      )}
                      {parsedInfo.cep && (
                        <span className="text-stone-700">
                          CEP: {parsedInfo.cep}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="pt-1 border-t border-stone-200 mt-1">
                      <span className="text-stone-500 text-[10px] italic">{parsedInfo.endereco}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Configurações de Venda do Lojista */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-stone-500 mb-1">Forma de Pagamento Recebida</label>
                <select
                  value={popupPagamento}
                  onChange={(e) => setPopupPagamento(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="Dinheiro">💵 Dinheiro</option>
                  <option value="Pix">📱 Pix</option>
                  <option value="Débito">💳 Débito</option>
                  <option value="Crédito à vista">💳 Crédito à vista</option>
                  <option value="Crédito parcelado">💳 Crédito parcelado</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-stone-500 mb-1">Aplicar Desconto (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={popupDescontoValor || ""}
                  onChange={(e) => setPopupDescontoValor(Math.max(0, Number(e.target.value)))}
                  disabled={isPending}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                {popupCustoUnitario > 0 && (
                  <span className="text-[9px] text-stone-500 block text-right mt-1.5 uppercase">
                    Custo do Fornecedor: R$ {popupTotalCusto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              {/* Simulação em Tempo Real */}
              <div className="rounded-xl bg-stone-100 border border-stone-200 p-3 text-xs space-y-1.5 text-left">
                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider mb-1">Resumo da Simulação</p>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Preço Final Cliente:</span>
                  <span className="font-bold text-stone-900">R$ {popupPrecoFinalEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Seu Lucro Líquido:</span>
                  <span className="font-black text-emerald-700">R$ {popupLucroEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Alerta de erro do popup */}
            {popupErro && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-650 text-center">
                ⚠️ {popupErro}
              </div>
            )}

            {/* Ações */}
            <div className="grid grid-cols-2 gap-2.5 mt-1">
              <button
                onClick={handleRejeitarVendaPopup}
                disabled={isPending}
                className="rounded-xl border border-red-200 bg-red-50 py-3 text-xs font-black uppercase tracking-wider text-red-600 hover:bg-red-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Rejeitar Pedido
              </button>
              <button
                onClick={handleConfirmarVendaPopup}
                disabled={isPending}
                className="rounded-xl bg-white border border-zinc-200 hover:bg-stone-50 text-zinc-950 py-3 text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 shadow-sm"
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
