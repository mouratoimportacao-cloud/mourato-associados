"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { obterLojistaPorCodigo, registrarIntencaoCompraCarrinho } from "../produtos/actions";

interface CartItem {
  id: number;
  codigo?: number | null;
  nome: string;
  marca: string;
  categoria: string;
  volume: string;
  preco: number;
  precoOriginal: number;
  imagem: string | null;
  quantidade: number;
  estoqueMaximo: number;
}

export default function CarrinhoWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lojistaInfo, setLojistaInfo] = useState<{ id: number; nome: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [checkoutSuccess, setCheckoutSuccess] = useState<{ message: string } | null>(null);
  const params = useParams<{ codigo?: string }>();

  // Sincroniza itens do localStorage
  const loadCart = () => {
    try {
      const cartRaw = localStorage.getItem("ma-cart");
      if (cartRaw) {
        const parsed = JSON.parse(cartRaw);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
          return;
        }
      }
      setCartItems([]);
    } catch (e) {
      console.error("Erro ao carregar carrinho:", e);
      setCartItems([]);
    }
  };

  useEffect(() => {
    loadCart();

    // Eventos customizados para abrir e atualizar carrinho
    const handleOpen = () => {
      loadCart();
      setIsOpen(true);
      setCheckoutSuccess(null); // Reseta mensagens de sucesso anteriores
    };

    const handleUpdate = () => {
      loadCart();
    };

    window.addEventListener("open-cart", handleOpen);
    window.addEventListener("cart-updated", handleUpdate);

    return () => {
      window.removeEventListener("open-cart", handleOpen);
      window.removeEventListener("cart-updated", handleUpdate);
    };
  }, []);

  // Busca informações do lojista se houver código de revenda
  useEffect(() => {
    if (params.codigo) {
      obterLojistaPorCodigo(params.codigo).then((lojista) => {
        if (lojista) {
          setLojistaInfo(lojista);
        }
      });
    } else {
      setLojistaInfo(null);
    }
  }, [params.codigo]);

  // Atualiza quantidade no localStorage e estado
  const updateQuantity = (itemId: number, newQty: number, maxStock: number) => {
    if (newQty < 1) return;
    if (newQty > maxStock) {
      alert(`Desculpe, estoque insuficiente. Limite de ${maxStock} unidades.`);
      return;
    }

    const updated = cartItems.map((item) => {
      if (item.id === itemId) {
        return { ...item, quantidade: newQty };
      }
      return item;
    });

    setCartItems(updated);
    localStorage.setItem("ma-cart", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  };

  // Remove item do carrinho
  const removeItem = (itemId: number) => {
    const updated = cartItems.filter((item) => item.id !== itemId);
    setCartItems(updated);
    localStorage.setItem("ma-cart", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  };

  // Calcula subtotal
  const subtotal = cartItems.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  // Envia o pedido agrupado
  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    startTransition(async () => {
      const itemsPayload = cartItems.map((item) => ({
        id: item.id,
        quantidade: item.quantidade,
      }));

      const res = await registrarIntencaoCompraCarrinho(itemsPayload, params.codigo || null);

      if (res.success) {
        setCheckoutSuccess({ message: res.message });
        // Limpa carrinho
        localStorage.removeItem("ma-cart");
        setCartItems([]);
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        alert(res.message);
      }
    });
  };

  const formatMoeda = (valor: number) => {
    return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-300"
        />
      )}

      {/* Drawer Lateral */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-neutral-950 border-l border-gold/15 shadow-2xl z-50 flex flex-col transition-transform duration-300 transform ${
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none invisible"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-black/50">
          <div>
            <h2 className="text-xl font-serif text-white font-black tracking-wide">Meu Carrinho</h2>
            {lojistaInfo && (
              <p className="text-[10px] text-gold uppercase tracking-wider font-bold mt-1">
                Revendedor: {lojistaInfo.nome}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Fechar carrinho"
            className="text-zinc-500 hover:text-white p-2 rounded-full hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {checkoutSuccess ? (
            /* Sucesso de Compra */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-4">
              <div className="h-16 w-16 bg-green-950/50 border border-green-500/30 rounded-full flex items-center justify-center text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-serif text-white font-bold">Pedido Registrado!</h3>
              <p className="text-sm text-zinc-400 font-light leading-relaxed">
                {checkoutSuccess.message}
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-luxury w-full mt-6 cursor-pointer"
              >
                Voltar ao Catálogo
              </button>
            </div>
          ) : cartItems.length === 0 ? (
            /* Carrinho Vazio */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="font-serif italic text-lg">Seu carrinho está vazio</p>
              <p className="text-xs max-w-[250px] font-light">Adicione fragrâncias exclusivas para iniciar o seu pedido.</p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-4 border border-zinc-800 hover:border-gold hover:text-gold text-zinc-400 font-bold tracking-widest text-[10px] uppercase py-2.5 px-6 rounded-full transition-all cursor-pointer"
              >
                Continuar Comprando
              </button>
            </div>
          ) : (
            /* Lista de Itens */
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 rounded-xl border border-zinc-900 bg-neutral-900/30 hover:border-zinc-800/80 transition-all duration-300"
                >
                  {/* Imagem do Produto */}
                  <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-900 bg-neutral-900 flex items-center justify-center">
                    {item.imagem ? (
                      <img src={item.imagem} alt={item.nome} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-zinc-700 font-serif italic">M&A</span>
                    )}
                  </div>

                  {/* Informações */}
                  <div className="flex-grow flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[8px] font-bold text-gold uppercase tracking-wider truncate max-w-[70%]">
                          {item.marca}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remover ${item.nome}`}
                          className="text-zinc-600 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <h4 className="text-xs sm:text-sm font-serif text-white leading-tight truncate mt-0.5">
                        {item.nome}
                      </h4>
                      <p className="text-[9px] text-zinc-500 font-light italic mt-0.5">{item.volume}</p>
                    </div>

                    <div className="flex justify-between items-end mt-2">
                      {/* Seletor de Quantidade */}
                      <div className="flex items-center border border-zinc-800 rounded-full bg-black/30 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantidade - 1, item.estoqueMaximo)}
                          aria-label="Diminuir quantidade"
                          className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-neutral-900 transition-colors font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-bold text-white text-center min-w-[20px]">
                          {item.quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantidade + 1, item.estoqueMaximo)}
                          aria-label="Aumentar quantidade"
                          className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-neutral-900 transition-colors font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Preço */}
                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-200">
                          {formatMoeda(item.preco * item.quantidade)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!checkoutSuccess && cartItems.length > 0 && (
          <div className="p-6 border-t border-zinc-900 bg-neutral-950/80 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Subtotal</span>
              <span className="text-lg font-serif text-gold font-black">{formatMoeda(subtotal)}</span>
            </div>

            <p className="text-[10px] text-zinc-500 font-light leading-relaxed">
              * O atendimento será encaminhado de forma segura e personalizada pelo WhatsApp. Sem taxas adicionais online.
            </p>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={isPending}
              className={`w-full btn-luxury flex items-center justify-center gap-2 cursor-pointer py-4.5 ${
                isPending ? "opacity-75 pointer-events-none" : ""
              }`}
            >
              {isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </>
              ) : (
                "Finalizar Pedido"
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
