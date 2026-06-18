"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ListaProdutosLojista from "./ListaProdutosLojista";
import ConfirmarVendaForm from "./ConfirmarVendaForm";
import AutoRefresh from "../../../components/AutoRefresh";
import { confirmarVendaLojista, criarPedidosLojistaCarrinho } from "../actions";
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

export default function PainelLojistaClient({
  produtos,
  lojistaAtual,
  pedidos,
  session,
}: Props) {
  const router = useRouter();

  // ─── ABA ATIVA E ESTADOS DE NAVEGAÇÃO ─────────────────────────────────────────
  const [activeTab, setActiveTabState] = useState<"inicio" | "produtos" | "carrinho" | "financeiro" | "perfil">("inicio");

  useEffect(() => {
    const saved = localStorage.getItem("lojista-active-tab");
    if (saved && ["inicio", "produtos", "carrinho", "financeiro", "perfil"].includes(saved)) {
      setActiveTabState(saved as any);
    }
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
    try {
      const saved = localStorage.getItem("lojista-cart");
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Erro ao carregar carrinho:", e);
    }
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
    const existingIndex = cart.findIndex((item) => item.produtoId === produtoId);
    let newCart = [...cart];
    if (existingIndex > -1) {
      newCart[existingIndex].quantidade += quantidade;
    } else {
      newCart.push({ produtoId, quantidade });
    }
    saveCart(newCart);
    showToast("Produto adicionado ao pedido!");
  };

  const handleUpdateQuantity = (produtoId: number, delta: number) => {
    const newCart = cart.map((item) => {
      if (item.produtoId === produtoId) {
        const newQty = item.quantidade + delta;
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
  const [popupDescontoPercentual, setPopupDescontoPercentual] = useState<number>(0);
  const [popupPagamento, setPopupPagamento] = useState<string>("Dinheiro");

  // ─── CÁLCULOS FINANCEIROS EM TEMPO REAL ───────────────────────────────────────
  const estoquePessoal = useMemo(() => (lojistaAtual?.estoquePessoal || {}) as Record<string, number>, [lojistaAtual]);

  const totalEstoqueDisponivel = useMemo(() => {
    return Object.values(estoquePessoal).reduce((acc, val) => acc + Number(val || 0), 0);
  }, [estoquePessoal]);

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
    return Math.max(0, 10000 - saldoDevedor);
  }, [saldoDevedor]);

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
    const totalPedidos = pedidos.filter((p) => p.status !== "cancelado").length;

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
    const receitaBruta = vendasQrConfirmadas.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const cmv = vendasQrConfirmadas.reduce((acc, p) => {
      const prod = p.produtoId ? produtoMap.get(p.produtoId) : null;
      return acc + Number(prod?.precoAtacado || 0) * Number(p.quantidade || 1);
    }, 0);
    const lucroBruto = receitaBruta - cmv;

    // Custos simulados (mock) com base no faturamento
    const fretes = receitaBruta > 0 ? Math.round(receitaBruta * 0.015) : 0; // 1.5%
    const taxasGateway = receitaBruta > 0 ? Math.round(receitaBruta * 0.03) : 0; // 3%
    const despesasGerais = receitaBruta > 0 ? 150 : 0; // Fixo se vendeu algo

    const lucroOperacional = lucroBruto - fretes - taxasGateway - despesasGerais;
    const lucroLiquido = lucroOperacional;

    return {
      receitaBruta,
      cmv,
      lucroBruto,
      fretes,
      taxasGateway,
      despesasGerais,
      lucroOperacional,
      lucroLiquido,
    };
  }, [vendasQrConfirmadas, produtoMap]);

  // Preview do Carrinho no rodapé
  const cartTotals = useMemo(() => {
    let itemsCount = 0;
    let totalValue = 0;
    cart.forEach((item) => {
      const prod = produtoMap.get(item.produtoId);
      if (prod) {
        itemsCount += item.quantidade;
        totalValue += Number(prod.precoAtacado || 0) * item.quantidade;
      }
    });
    return { itemsCount, totalValue };
  }, [cart, produtoMap]);

  // Produtos formatados com estoque pessoal do lojista
  const produtosComEstoquePessoal = useMemo(() => {
    return produtos.map((produto) => ({
      ...produto,
      estoqueLojista: Number(estoquePessoal[String(produto.id)] ?? produto.estoqueLojista ?? 0),
    }));
  }, [produtos, estoquePessoal]);

  const aguardandoLojista = useMemo(() => {
    return pedidos.filter((pedido) => pedido.status === "aguardando lojista");
  }, [pedidos]);

  // Efeito de detecção de novo pedido pendente para popup
  useEffect(() => {
    if (aguardandoLojista.length > 0) {
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
        showToast("Venda confirmada!");
        router.refresh();
      } else {
        setPopupErro(result.error || "Erro ao confirmar venda.");
      }
    });
  }

  function handleDispensarPopup() {
    if (activePopupOrder) {
      setDismissedOrderIds((prev) => [...prev, activePopupOrder.id]);
      setActivePopupOrder(null);
    }
  }

  const popupProduto = activePopupOrder?.produtoId ? produtoMap.get(activePopupOrder.produtoId) : null;
  const popupCustoUnitario = popupProduto?.precoAtacado || 0;
  const popupPrecoTabela = popupProduto?.preco || 0;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-black antialiased">
      {/* ─── TOAST NOTIFICATION DE ESTADO ─── */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-stone-950 font-black px-6 py-3 rounded-full shadow-2xl border border-amber-300/30 text-xs tracking-widest uppercase animate-bounce">
          ✨ {toastMessage}
        </div>
      )}

      {/* Conteúdo Centralizado ou em Painel de Tela Cheia */}
      <div className="fixed inset-0 w-full bg-stone-950 flex flex-col overflow-hidden z-50">
        
        {/* HEADER DE LUXO (Black & Gold) */}
        <header className="bg-stone-900/90 backdrop-blur-md text-white px-4 py-4 flex items-center justify-between border-b border-amber-500/10 shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <img src="/brand/logo-ma.png" alt="Mourato & Associados" className="relative h-11 w-auto object-contain" />
            </div>
            <div>
              <p className="text-[8px] text-amber-500/70 font-black uppercase tracking-[0.25em]">Mourato & Associados</p>
              <h1 className="text-xs font-bold text-white max-w-[150px] truncate">{lojistaAtual.nome}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-500 uppercase tracking-widest">
              🏆 {nivelParceiro}
            </span>
            <button
              onClick={async () => {
                await logoutLojista();
                window.location.href = "/lojista";
              }}
              className="bg-red-600/10 border border-red-500/10 text-red-400 rounded-lg p-2.5 hover:bg-red-600/20 transition-all text-xs shadow-inner cursor-pointer"
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
                <div className="relative group overflow-hidden rounded-2xl border border-red-500/20 bg-red-950/20 p-4 shadow-2xl flex items-center justify-between gap-4 animate-pulse">
                  <div>
                    <h3 className="text-xs font-black text-red-500 uppercase tracking-wider">Ação Necessária!</h3>
                    <p className="text-[10px] text-red-200/80 mt-1">Você possui {aguardandoLojista.length} venda(s) de clientes aguardando sua liberação de estoque.</p>
                  </div>
                  <button
                    onClick={() => {
                      const firstPending = aguardandoLojista[0];
                      setActivePopupOrder(firstPending);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white font-black text-[9px] px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                  >
                    Liberar
                  </button>
                </div>
              )}

              {/* Informações de Perfil e Link QR */}
              {linkRevenda && (
                <div className="rounded-2xl border border-amber-500/10 bg-stone-900/40 p-4 shadow-xl flex items-center justify-between gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500">Seu Link de Vendas</p>
                    <h2 className="mt-1 text-sm font-serif font-bold text-stone-100 truncate">Catálogo Digital Lojista</h2>
                    <p className="mt-1.5 text-[10px] text-stone-400 truncate max-w-[200px]">{linkRevenda}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(linkRevenda);
                        showToast("Link copiado!");
                      }}
                      className="mt-3.5 bg-gradient-to-r from-amber-500/10 to-yellow-600/10 hover:from-amber-500/20 hover:to-yellow-600/20 border border-amber-500/20 text-amber-500 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Copiar Link
                    </button>
                  </div>
                  <div className="relative group shrink-0">
                    <div className="absolute -inset-0.5 bg-amber-500/20 rounded-xl blur opacity-30 group-hover:opacity-100 transition"></div>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(linkRevenda)}&color=d4af37&bgcolor=1c1917`}
                      alt="QR Code Revenda"
                      className="relative h-20 w-20 rounded-xl border border-stone-800 bg-stone-900 p-1.5"
                    />
                  </div>
                </div>
              )}

              {/* CARDS PRINCIPAIS DE DESEMPENHO */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 mb-2">Desempenho Comercial</h3>
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Vendas do Mês */}
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-md flex flex-col justify-between h-28 hover:border-amber-500/20 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Vendas do Mês</p>
                    <div>
                      <p className="text-sm font-serif font-black text-amber-500">R$ {faturamentoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-stone-500 mt-1 uppercase">Vendas QR confirmadas</p>
                    </div>
                  </div>

                  {/* Lucro Atual */}
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-md flex flex-col justify-between h-28 hover:border-amber-500/20 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Lucro Atual</p>
                    <div>
                      <p className="text-sm font-serif font-black text-emerald-500">R$ {lucroMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-stone-500 mt-1 uppercase">Ganhos do mês corrente</p>
                    </div>
                  </div>

                  {/* Pedidos Realizados */}
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-md flex flex-col justify-between h-28 hover:border-amber-500/20 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Pedidos Realizados</p>
                    <div>
                      <p className="text-lg font-serif font-black text-stone-100">{pedidosRealizados}</p>
                      <p className="text-[8px] text-stone-500 mt-1 uppercase">Total de compras/vendas</p>
                    </div>
                  </div>

                  {/* Estoque Disponível */}
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-md flex flex-col justify-between h-28 hover:border-amber-500/20 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Estoque Pessoal</p>
                    <div>
                      <p className="text-lg font-serif font-black text-stone-100">{totalEstoqueDisponivel} un.</p>
                      <p className="text-[8px] text-stone-500 mt-1 uppercase">Unidades sob custódia</p>
                    </div>
                  </div>

                  {/* Saldo Devedor */}
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-md flex flex-col justify-between h-28 hover:border-amber-500/20 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Saldo Devedor</p>
                    <div>
                      <p className="text-sm font-serif font-black text-red-500">R$ {saldoDevedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-stone-500 mt-1 uppercase">Pendente com fornecedor</p>
                    </div>
                  </div>

                  {/* Limite Disponível */}
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-md flex flex-col justify-between h-28 hover:border-amber-500/20 transition-all duration-300">
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Crédito Disponível</p>
                    <div>
                      <p className="text-sm font-serif font-black text-blue-400">R$ {limiteDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-stone-500 mt-1 uppercase">De limite de R$ 10.000</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Atalho Site Final */}
              <Link
                href="/"
                className="block w-full bg-stone-900 border border-stone-800 rounded-2xl p-4 text-center text-xs font-black text-amber-500 hover:bg-stone-850 hover:border-amber-500/20 transition-all uppercase tracking-widest shadow-lg cursor-pointer"
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
          {/* TELA 3: CARRINHO DO LOJISTA                                        */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {activeTab === "carrinho" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-sm font-serif font-bold text-stone-100 uppercase tracking-wider">🛒 Carrinho de Estoque</h2>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">{cart.length} itens no rascunho</span>
              </div>

              {orderSent ? (
                <div className="rounded-2xl border border-amber-500/20 bg-stone-900/60 p-8 text-center space-y-4 shadow-xl">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                    <span className="text-3xl">✨</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-serif font-bold text-stone-100">Pedido Enviado com Sucesso!</h3>
                    <div className="inline-flex rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-xs font-black text-amber-500 uppercase tracking-widest">
                      Status: Aguardando Aprovação do Fornecedor
                    </div>
                    <p className="text-[10px] text-stone-400 mt-2 leading-relaxed">Seu pedido foi registrado no sistema e aguarda a validação do administrador para o envio dos produtos ao seu estoque pessoal.</p>
                  </div>
                  <button
                    onClick={() => {
                      setOrderSent(false);
                      setActiveTab("produtos");
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-[10px] py-3.5 rounded-xl uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    Voltar ao Catálogo
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-800 bg-stone-900/20 p-10 text-center text-stone-400 space-y-4">
                  <span className="text-4xl block">🛍️</span>
                  <p className="text-xs italic">Seu carrinho está vazio.</p>
                  <button
                    onClick={() => setActiveTab("produtos")}
                    className="inline-flex items-center justify-center bg-stone-900 border border-stone-800 hover:border-amber-500/20 text-amber-500 font-bold text-[10px] px-6 py-3 rounded-xl uppercase tracking-widest transition-all cursor-pointer"
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
                        <div key={item.produtoId} className="rounded-xl border border-stone-800 bg-stone-900/40 p-3 shadow-md flex justify-between items-center gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-stone-800 bg-stone-900/60 p-1">
                              {prod.imagem ? (
                                <img src={prod.imagem} alt={prod.nome} className="h-full w-full object-cover rounded" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-stone-600 italic font-serif text-[10px]">M&A</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-stone-100 text-xs truncate">{prod.nome}</h4>
                              <p className="text-[9px] text-stone-400 mt-0.5">{prod.marca} - {prod.volume}</p>
                              <p className="text-[9px] text-amber-500 font-bold mt-1">Atacado: R$ {unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {/* Controle de quantidade */}
                            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg p-1">
                              <button
                                onClick={() => handleUpdateQuantity(item.produtoId, -1)}
                                className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-stone-100">{item.quantidade}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item.produtoId, 1)}
                                className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-stone-200">R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                              <button
                                onClick={() => handleRemoveItem(item.produtoId)}
                                className="text-red-400 hover:text-red-300 text-xs p-1 cursor-pointer"
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
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-400">Total do Lote:</span>
                      <span className="font-serif font-black text-amber-500 text-sm">R$ {cartTotals.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p className="text-[8px] text-stone-400/80 leading-relaxed uppercase tracking-wider">
                      ℹ️ O envio gerará um pedido pendente de aprovação do fornecedor. Não há necessidade de escolha de forma de pagamento agora (a ser combinada após a liberação).
                    </p>

                    {orderError && (
                      <div className="rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs font-bold text-red-400 text-center">
                        ⚠️ {orderError}
                      </div>
                    )}

                    <button
                      onClick={handleEnviarPedido}
                      disabled={isSendingOrder}
                      className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-stone-950 font-black text-[10px] py-3.5 rounded-xl uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg cursor-pointer"
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
                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 mb-2">Resumo Financeiro</h3>
                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 space-y-3.5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Total Comprado</p>
                      <p className="font-serif font-black text-stone-100 text-sm mt-0.5">R$ {totalComprado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Total Pago</p>
                      <p className="font-serif font-black text-emerald-500 text-sm mt-0.5">R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Saldo Devedor</p>
                      <p className="font-serif font-black text-red-500 text-sm mt-0.5">R$ {saldoDevedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Status Financeiro</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider mt-1.5 ${
                        saldoDevedor > 0
                          ? "bg-red-500/10 border border-red-500/20 text-red-400"
                          : "bg-green-500/10 border border-green-500/20 text-green-400"
                      }`}>
                        {saldoDevedor > 0 ? "Pendente" : "Quitado"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DRE COMERCIAL */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 mb-2">Demonstrativo DRE (Comercial)</h3>
                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-xl space-y-3 text-xs">
                  <div className="flex justify-between font-bold border-b border-stone-800 pb-2">
                    <span className="text-stone-300">Receita Bruta (Vendas)</span>
                    <span className="text-stone-100">R$ {dreReport.receitaBruta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>(-) Custo de Mercadorias (CMV)</span>
                    <span className="text-red-400">- R$ {dreReport.cmv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold border-y border-stone-800/80 py-2 my-1">
                    <span className="text-stone-200">(=) Lucro Bruto</span>
                    <span className="text-amber-500">R$ {dreReport.lucroBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>(-) Custos de Frete (Mock 1.5%)</span>
                    <span className="text-red-400/80">- R$ {dreReport.fretes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>(-) Taxas Gateway (Mock 3%)</span>
                    <span className="text-red-400/80">- R$ {dreReport.taxasGateway.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-stone-400 border-b border-stone-800 pb-2 mb-1">
                    <span>(-) Despesas Gerais (Mock)</span>
                    <span className="text-red-400/80">- R$ {dreReport.despesasGerais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-black border-t border-amber-500/10 pt-2 text-sm">
                    <span className="text-amber-500">(=) Lucro Líquido Operacional</span>
                    <span className="text-emerald-400 font-serif">R$ {dreReport.lucroLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Histórico de Pagamentos */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 mb-2">Histórico de Pagamentos (Amortizações)</h3>
                <div className="space-y-2.5">
                  {historicoPagamentos.map((pag, idx) => (
                    <div key={idx} className="rounded-xl border border-stone-800/80 bg-stone-900/40 p-3 shadow-md flex justify-between items-center gap-3">
                      <div>
                        <p className="text-xs font-bold text-stone-100">{pag.descricao}</p>
                        <p className="text-[9px] text-stone-500 mt-0.5">Lote pago em {pag.data}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-500">+ R$ {pag.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}

                  {historicoPagamentos.length === 0 && (
                    <div className="rounded-xl border border-dashed border-stone-800 bg-stone-900/10 p-6 text-center text-xs text-stone-500 italic">
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
              <h2 className="text-sm font-serif font-bold text-stone-100 uppercase tracking-wider mb-2">👤 Dados Cadastrais</h2>

              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
                
                {[
                  ["Nome Completo", lojistaAtual.nome],
                  ["E-mail", lojistaAtual.email],
                  ["Documento (CPF/CNPJ)", lojistaAtual.documento || "Não cadastrado"],
                  ["Telefone de Contato", lojistaAtual.telefone || "Não cadastrado"],
                  ["Endereço Completo", lojistaAtual.endereco || "Não cadastrado"],
                  ["Cidade / UF", lojistaAtual.cidade ? `${lojistaAtual.cidade} - ${lojistaAtual.estado || ""}` : "Não cadastrado"],
                  ["CEP", lojistaAtual.cep || "Não cadastrado"],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-stone-800/60 pb-3 last:border-b-0 last:pb-0">
                    <p className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-bold text-stone-200 mt-1">{value}</p>
                  </div>
                ))}
              </div>

              {/* Botão de Logout Principal */}
              <button
                onClick={async () => {
                  await logoutLojista();
                  window.location.href = "/lojista";
                }}
                className="w-full mt-4 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 font-black text-[10px] py-4 rounded-xl uppercase tracking-widest transition-all cursor-pointer shadow-lg text-center"
              >
                🚪 Sair da Conta do Lojista
              </button>
            </div>
          )}

        </main>

        {/* ─── PREVIEW FLUTUANTE DO CARRINHO (Meu Pedido) ─── */}
        {activeTab !== "carrinho" && cart.length > 0 && (
          <div className="fixed bottom-20 left-4 right-4 z-40 bg-stone-900 border border-amber-500/20 shadow-2xl rounded-2xl p-3.5 flex justify-between items-center gap-3 animate-in slide-in-from-bottom duration-300">
            <div>
              <p className="text-[8px] font-black uppercase text-amber-500 tracking-wider">Meu Pedido Atual</p>
              <p className="text-xs font-bold text-stone-100 mt-0.5">
                {cartTotals.itemsCount} {cartTotals.itemsCount === 1 ? "Item" : "Itens"}
                <span className="mx-2 text-stone-600">|</span>
                R$ {cartTotals.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("carrinho")}
              className="bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-stone-950 font-black text-[9px] px-4 py-2.5 rounded-xl uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Finalizar Pedido
            </button>
          </div>
        )}

        {/* 📱 MENU INFERIOR DE 5 ABAS TÁTEIS (Responsivo/Celular) */}
        <nav className="bg-stone-900/95 backdrop-blur-md border-t border-stone-800/80 h-16 w-full flex justify-around items-center px-2 shrink-0 shadow-2xl z-30">
          {[
            { id: "inicio", label: "Início", icon: "🏠", badge: aguardandoLojista.length },
            { id: "produtos", label: "Produtos", icon: "🛍️" },
            { id: "carrinho", label: "Carrinho", icon: "🛒", badge: cart.length },
            { id: "financeiro", label: "Financeiro", icon: "📊" },
            { id: "perfil", label: "Perfil", icon: "👤" },
          ].map((tab) => {
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
                  isSelected ? "text-amber-500 scale-105" : "text-stone-500 hover:text-stone-400"
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

      {/* 🚨 WINDOW POPUP AUTOMÁTICO DE NOVO PEDIDO DO QR CODE 🚨 */}
      {activePopupOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-stone-900 p-5 shadow-2xl border border-amber-500/20 animate-in fade-in zoom-in duration-200 flex flex-col gap-4 text-stone-100">
            
            {/* Cabeçalho */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">🚨</span>
                <div>
                  <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest">Novo Pedido no QR!</h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">Aguardando sua confirmação</p>
                </div>
              </div>
              <button
                onClick={handleDispensarPopup}
                className="text-stone-400 hover:text-stone-200 text-sm font-bold p-1 rounded-full hover:bg-stone-850 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Informações do Pedido */}
            <div className="rounded-xl bg-stone-850 border border-stone-800 p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-400 font-medium">Produto:</span>
                <span className="font-bold text-stone-200 truncate max-w-[180px]">{activePopupOrder.produtoNome || "Produto"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400 font-medium">Quantidade:</span>
                <span className="font-bold text-stone-200">{activePopupOrder.quantidade || 1} un.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400 font-medium">Total Sugerido:</span>
                <span className="font-black text-amber-500 text-sm">R$ {Number(activePopupOrder.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Configurações de Venda do Lojista */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-stone-400 mb-1">Forma de Pagamento Recebida</label>
                <select
                  value={popupPagamento}
                  onChange={(e) => setPopupPagamento(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-stone-800 bg-stone-850 px-3 py-2.5 text-xs font-bold text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Dinheiro">💵 Dinheiro</option>
                  <option value="Pix">📱 Pix</option>
                  <option value="Débito">💳 Débito</option>
                  <option value="Crédito à vista">💳 Crédito à vista</option>
                  <option value="Crédito parcelado">💳 Crédito parcelado</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-stone-400 mb-1">Aplicar Desconto (%)</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="1"
                  placeholder="0"
                  value={popupDescontoPercentual || ""}
                  onChange={(e) => setPopupDescontoPercentual(Math.min(90, Math.max(0, Number(e.target.value))))}
                  disabled={isPending}
                  className="w-full rounded-lg border border-stone-800 bg-stone-850 px-3 py-2.5 text-xs font-bold text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {popupCustoUnitario > 0 && popupPrecoTabela > 0 && (
                  <span className="text-[9px] text-stone-500 block text-right mt-1.5 uppercase">
                    Custo Mínimo: R$ {popupCustoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            {/* Alerta de erro do popup */}
            {popupErro && (
              <div className="rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs font-bold text-red-400 text-center">
                ⚠️ {popupErro}
              </div>
            )}

            {/* Ações */}
            <div className="grid grid-cols-2 gap-2.5 mt-1">
              <button
                onClick={handleDispensarPopup}
                disabled={isPending}
                className="rounded-xl border border-stone-800 bg-stone-850 py-3 text-xs font-black uppercase tracking-wider text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-all cursor-pointer disabled:opacity-50"
              >
                Ignorar
              </button>
              <button
                onClick={handleConfirmarVendaPopup}
                disabled={isPending}
                className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-stone-950 py-3 text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
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
