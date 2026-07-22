"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { obterLojistaPorCodigo, registrarIntencaoCompraCarrinho } from "../produtos/actions";
import { processarPagamentoCartao, gerarPixCarrinho } from "../checkout/actions";
import OptimizedImage from "./OptimizedImage";

declare global {
  interface Window { MercadoPago: any; }
}

const BANDEIRAS: { id: string; nome: string; regex: RegExp }[] = [
  { id: "visa",      nome: "Visa",             regex: /^4/ },
  { id: "master",    nome: "Mastercard",        regex: /^5[1-5]|^2[2-7]/ },
  { id: "elo",       nome: "Elo",              regex: /^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/ },
  { id: "amex",      nome: "American Express", regex: /^3[47]/ },
  { id: "hipercard", nome: "Hipercard",         regex: /^606282|^3841/ },
  { id: "diners",    nome: "Diners Club",       regex: /^3(0[0-5]|[68])/ },
];

function detectarBandeira(numero: string) {
  const clean = numero.replace(/\D/g, "");
  return BANDEIRAS.find(b => b.regex.test(clean)) || null;
}

function formatarCartao(valor: string) {
  return valor.replace(/\D/g, "").substring(0, 16).replace(/(\d{4})/g, "$1 ").trim();
}

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
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const params = useParams<{ codigo?: string }>();

  // Estados do formulário de entrega do cliente
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cepError, setCepError] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Estados do pagamento transparente
  type Etapa = "itens" | "endereco" | "pagamento" | "pix";
  const [etapa, setEtapa] = useState<Etapa>("itens");
  const [metodoPagamento, setMetodoPagamento] = useState<"cartao" | "pix" | null>(null);
  // Cartão
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardParcelas, setCardParcelas] = useState(1);
  const [cardCpf, setCardCpf] = useState("");
  const [cardError, setCardError] = useState("");
  const [bandeira, setBandeira] = useState<{ id: string; nome: string } | null>(null);
  // Pix
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixQrBase64, setPixQrBase64] = useState<string | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  // Ref do checkout atual
  const [checkoutRefAtual, setCheckoutRefAtual] = useState<string | null>(null);
  const [clienteInfoAtual, setClienteInfoAtual] = useState<any>(null);

  // Reseta campos ao finalizar com sucesso
  useEffect(() => {
    if (!checkoutSuccess) return;

    const resetTimeout = window.setTimeout(() => {
      setShowAddressForm(false);
      setNome("");
      setContato("");
      setCep("");
      setRua("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setEstado("");
      setCepError("");
      setValidationError("");
      setEtapa("itens");
      setMetodoPagamento(null);
      setCardNumber(""); setCardName(""); setCardExpiry(""); setCardCvv(""); setCardCpf(""); setCardParcelas(1); setCardError(""); setBandeira(null); setSdkReady(false);
      setPixQrCode(null); setPixQrBase64(null); setPixCopiado(false);
      setCheckoutRefAtual(null); setClienteInfoAtual(null);
    }, 0);

    return () => window.clearTimeout(resetTimeout);
  }, [checkoutSuccess]);

  const [sdkReady, setSdkReady] = useState(false);

  // Carrega SDK do Mercado Pago dinamicamente quando chega na etapa de pagamento
  useEffect(() => {
    if (etapa !== "pagamento") return;
    if (window.MercadoPago) { setSdkReady(true); return; }
    const existing = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
    if (existing) {
      existing.addEventListener("load", () => setSdkReady(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => setCardError("Falha ao carregar SDK do Mercado Pago. Recarregue a página.");
    document.head.appendChild(script);
  }, [etapa]);
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
    const initialLoad = window.setTimeout(loadCart, 0);

    // Eventos customizados para abrir e atualizar carrinho
    const handleOpen = () => {
      loadCart();
      setIsOpen(true);
      setCheckoutSuccess(null);
      setCheckoutError(null);
      setCheckoutLoading(false);
      setShowAddressForm(false);
      setEtapa("itens");
      setMetodoPagamento(null);
    };

    const handleUpdate = () => {
      loadCart();
    };

    window.addEventListener("open-cart", handleOpen);
    window.addEventListener("cart-updated", handleUpdate);

    return () => {
      window.clearTimeout(initialLoad);
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
      const clearLojista = window.setTimeout(() => setLojistaInfo(null), 0);
      return () => window.clearTimeout(clearLojista);
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
  const handleCheckout = (clienteInfo: any) => {
    if (cartItems.length === 0) return;

    startTransition(async () => {
      const itemsPayload = cartItems.map((item) => ({
        id: item.id,
        quantidade: item.quantidade,
      }));

      // 1. Registra pedido no banco
      const res = await registrarIntencaoCompraCarrinho(
        itemsPayload,
        params.codigo || null,
        clienteInfo
      );

      if (!res.success) {
        alert(res.message);
        return;
      }

      // Se for compra via canal de lojista
      if (params.codigo) {
        setCheckoutSuccess({ message: res.message });
        localStorage.removeItem("ma-cart");
        setCartItems([]);
        window.dispatchEvent(new CustomEvent("cart-updated"));
        return;
      }

      // Se anti-duplicação bloqueou
      if (!res.checkoutRef) {
        setCheckoutSuccess({ message: res.message });
        localStorage.removeItem("ma-cart");
        setCartItems([]);
        window.dispatchEvent(new CustomEvent("cart-updated"));
        return;
      }

      // Salva ref e info do cliente para usar no pagamento
      setCheckoutRefAtual(res.checkoutRef);
      setClienteInfoAtual(clienteInfo);
      setEtapa("pagamento");
    });
  };

  const handlePagarCartao = () => {
    setCardError("");
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.length < 13) { setCardError("Número do cartão inválido."); return; }
    if (!cardName.trim()) { setCardError("Informe o nome do titular."); return; }
    if (cardExpiry.length < 5) { setCardError("Data de validade inválida."); return; }
    if (cardCvv.length < 3) { setCardError("CVV inválido."); return; }
    if (!bandeira) { setCardError("Bandeira do cartão não reconhecida."); return; }
    const cleanCpf = cardCpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) { setCardError("CPF inválido. Digite 11 dígitos."); return; }

    const [expMonth, expYear] = cardExpiry.split("/");
    const publicKey = (process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || "").trim();

    if (!sdkReady || !window.MercadoPago) {
      setCardError("SDK do Mercado Pago ainda carregando. Aguarde um instante e tente novamente.");
      return;
    }

    startTransition(async () => {
      try {
        setCheckoutLoading(true);

        const mp = new window.MercadoPago(publicKey);
        const tokenResult = await mp.createCardToken({
          cardNumber: cleanNumber,
          cardExpirationMonth: expMonth?.trim(),
          cardExpirationYear: `20${expYear?.trim()}`,
          securityCode: cardCvv,
          cardholderName: cardName.trim(),
          identification: { type: "CPF", number: cleanCpf },
        });

        if (!tokenResult?.id) {
          throw new Error("Não foi possível tokenizar o cartão. Verifique os dados e tente novamente.");
        }

        const mpItems = cartItems.map(i => ({ nome: i.nome, quantidade: i.quantidade, preco: i.preco }));
        const res = await processarPagamentoCartao(
          tokenResult.id,
          bandeira.id,
          cardParcelas,
          mpItems,
          clienteInfoAtual,
          checkoutRefAtual || undefined,
          cardCpf
        );

        setCheckoutLoading(false);

        if (res.success) {
          localStorage.removeItem("ma-cart");
          setCartItems([]);
          window.dispatchEvent(new CustomEvent("cart-updated"));
          setCheckoutSuccess({
            message: res.status === "approved"
              ? "Pagamento aprovado! Em breve entraremos em contato para combinar a entrega."
              : "Pagamento em análise. Você receberá a confirmação em breve."
          });
        } else {
          setCheckoutError(res.error || "Pagamento recusado. Verifique os dados do cartão.");
        }
      } catch (err: any) {
        setCheckoutLoading(false);
        const msg = err?.message || err?.cause?.message || JSON.stringify(err) || "Erro ao processar cartão.";
        console.error("Erro cartao detalhado:", err);
        // Erros do createCardToken mostrar no formulário, não na tela de erro genérica
        setCardError(msg);
        setEtapa("pagamento");
        setMetodoPagamento("cartao");
      }
    });
  };

  const handleGerarPix = () => {
    startTransition(async () => {
      setCheckoutLoading(true);
      const mpItems = cartItems.map(i => ({ nome: i.nome, quantidade: i.quantidade, preco: i.preco }));
      const res = await gerarPixCarrinho(mpItems, clienteInfoAtual, checkoutRefAtual || undefined);
      setCheckoutLoading(false);

      if (res.success && res.qrCode) {
        setPixQrCode(res.qrCode);
        setPixQrBase64(res.qrCodeBase64);
        setEtapa("pix");
        localStorage.removeItem("ma-cart");
        setCartItems([]);
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        setCheckoutError(res.error || "Não foi possível gerar o Pix.");
      }
    });
  };

  const handleCepChange = async (val: string) => {
    const cleanCep = val.replace(/\D/g, "");
    
    // Mask format: XXXXX-XXX
    let formatted = cleanCep;
    if (cleanCep.length > 5) {
      formatted = `${cleanCep.substring(0, 5)}-${cleanCep.substring(5, 8)}`;
    }
    setCep(formatted.substring(0, 9));
    
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      setCepError("");
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (data.erro) {
          setCepError("CEP inválido ou não encontrado.");
        } else {
          setRua(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setEstado(data.uf || "");
          setCepError("");
        }
      } catch (err) {
        console.error("Erro no CEP lookup:", err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const onSubmitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (
      !nome.trim() ||
      !contato.trim() ||
      !cep.trim() ||
      !rua.trim() ||
      !numero.trim() ||
      !bairro.trim() ||
      !cidade.trim() ||
      !estado.trim()
    ) {
      setValidationError("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setValidationError("O CEP informado é inválido. Digite 8 dígitos.");
      return;
    }

    if (cepError) {
      setValidationError("O CEP informado não foi encontrado. Por favor, verifique.");
      return;
    }

    const clienteInfo = {
      nome: nome.trim(),
      contato: contato.trim(),
      cep: `${cleanCep.substring(0, 5)}-${cleanCep.substring(5, 8)}`,
      rua: rua.trim(),
      numero: numero.trim(),
      complemento: complemento.trim() || undefined,
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      estado: estado.trim()
    };

    handleCheckout(clienteInfo);
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
          {checkoutLoading ? (
            /* TELA DE LOADING — Preparando pagamento */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-zinc-800 border-t-gold animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-serif text-white">Preparando seu pagamento...</h3>
                <p className="text-xs text-zinc-500 max-w-[260px]">Estamos conectando com o Mercado Pago. Isso leva só alguns segundos.</p>
              </div>
            </div>
          ) : checkoutError ? (
            /* TELA DE ERRO */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
              <div className="text-5xl">😕</div>
              <div className="space-y-2">
                <h3 className="text-lg font-serif text-white">Ops, algo não saiu como esperado</h3>
                <p className="text-xs text-zinc-400 max-w-[280px] leading-relaxed">
                  Não conseguimos processar o pagamento agora, mas seu pedido já foi registrado. Você pode tentar novamente ou finalizar pelo WhatsApp.
                </p>
              </div>
              <div className="w-full max-w-[260px] space-y-3 pt-2">
                <button type="button" onClick={() => { setCheckoutError(null); setEtapa("pagamento"); }} className="w-full btn-luxury cursor-pointer py-3">
                  Tentar Novamente
                </button>
                <a href="https://wa.me/5511978990034?text=Ol%C3%A1%2C+fiz+um+pedido+no+site+e+preciso+de+ajuda+com+o+pagamento." target="_blank" rel="noopener noreferrer" className="block w-full text-center border border-zinc-800 hover:border-green-600 text-zinc-300 hover:text-green-400 font-bold tracking-widest text-[10px] uppercase py-3 rounded-full transition-all">
                  Falar no WhatsApp
                </a>
              </div>
            </div>

          ) : etapa === "pix" ? (
            /* TELA PIX — QR Code */
            <div className="flex flex-col items-center space-y-5 py-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-serif text-white font-bold">Pague com Pix</h3>
                <p className="text-xs text-zinc-400">Escaneie o QR Code ou copie o código abaixo</p>
              </div>
              {pixQrBase64 && (
                <div className="bg-white p-3 rounded-xl">
                  <img src={`data:image/png;base64,${pixQrBase64}`} alt="QR Code Pix" className="w-48 h-48" />
                </div>
              )}
              {pixQrCode && (
                <div className="w-full space-y-2">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Código Pix Copia e Cola</p>
                  <div className="bg-neutral-900 border border-zinc-800 rounded-lg p-3 text-[10px] text-zinc-300 break-all leading-relaxed">
                    {pixQrCode}
                  </div>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(pixQrCode); setPixCopiado(true); setTimeout(() => setPixCopiado(false), 3000); }}
                    className="w-full border border-zinc-700 hover:border-gold text-zinc-300 hover:text-gold font-bold tracking-widest text-[10px] uppercase py-2.5 rounded-full transition-all cursor-pointer"
                  >
                    {pixCopiado ? "✅ Código Copiado!" : "Copiar Código Pix"}
                  </button>
                </div>
              )}
              <p className="text-[10px] text-zinc-500 text-center leading-relaxed max-w-[260px]">
                Após o pagamento, confirmaremos seu pedido em até alguns minutos.
              </p>
              <button type="button" onClick={() => setIsOpen(false)} className="w-full btn-luxury cursor-pointer py-3">
                Fechar
              </button>
            </div>

          ) : etapa === "pagamento" ? (
            /* TELA DE ESCOLHA + PAGAMENTO */
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <h3 className="text-sm font-serif font-bold text-gold uppercase tracking-wider">Forma de Pagamento</h3>
                <button type="button" onClick={() => { setEtapa("endereco"); setShowAddressForm(true); setMetodoPagamento(null); }} className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer">
                  ← Voltar
                </button>
              </div>

              {/* Seleção do método */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMetodoPagamento("cartao")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
                    metodoPagamento === "cartao" ? "border-gold bg-gold/10 text-gold" : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider">Cartão</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPagamento("pix")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
                    metodoPagamento === "pix" ? "border-gold bg-gold/10 text-gold" : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.354 2.646a.9.9 0 0 1 1.292 0l2.122 2.122a3.1 3.1 0 0 0 2.19.908h.63a.9.9 0 0 1 .9.9v.63a3.1 3.1 0 0 0 .908 2.19l2.122 2.122a.9.9 0 0 1 0 1.292l-2.122 2.122a3.1 3.1 0 0 0-.908 2.19v.63a.9.9 0 0 1-.9.9h-.63a3.1 3.1 0 0 0-2.19.908l-2.122 2.122a.9.9 0 0 1-1.292 0l-2.122-2.122a3.1 3.1 0 0 0-2.19-.908h-.63a.9.9 0 0 1-.9-.9v-.63a3.1 3.1 0 0 0-.908-2.19L2.482 13.28a.9.9 0 0 1 0-1.292l2.122-2.122A3.1 3.1 0 0 0 5.512 7.676v-.63a.9.9 0 0 1 .9-.9h.63a3.1 3.1 0 0 0 2.19-.908z"/>
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider">Pix</span>
                </button>
              </div>

              {/* Formulário Cartão */}
              {metodoPagamento === "cartao" && (
                <div className="space-y-3 text-xs">
                  {cardError && (
                    <p className="text-xs text-red-500 font-bold bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg">⚠️ {cardError}</p>
                  )}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Número do Cartão</label>
                    <div className="relative">
                      <input
                        type="text" inputMode="numeric" maxLength={19}
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={e => { const f = formatarCartao(e.target.value); setCardNumber(f); setBandeira(detectarBandeira(f)); }}
                        className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold pr-20"
                      />
                      {bandeira && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gold">{bandeira.nome}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome no Cartão</label>
                    <input
                      type="text" placeholder="Como está no cartão"
                      value={cardName}
                      onChange={e => setCardName(e.target.value.toUpperCase())}
                      className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Validade</label>
                      <input
                        type="text" placeholder="MM/AA" maxLength={5}
                        value={cardExpiry}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, "").substring(0, 4);
                          setCardExpiry(v.length > 2 ? `${v.substring(0,2)}/${v.substring(2)}` : v);
                        }}
                        className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CVV</label>
                      <input
                        type="text" inputMode="numeric" placeholder="123" maxLength={4}
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, "").substring(0, 4))}
                        className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CPF do Titular *</label>
                    <input
                      type="text" inputMode="numeric" placeholder="000.000.000-00" maxLength={14}
                      value={cardCpf}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, "").substring(0, 11);
                        const f = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                                   .replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3")
                                   .replace(/(\d{3})(\d{1,3})/, "$1.$2");
                        setCardCpf(f);
                      }}
                      className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Parcelas</label>
                    <select
                      value={cardParcelas}
                      onChange={e => setCardParcelas(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <option key={n} value={n}>{n}x {n === 1 ? "sem juros" : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pt-3 border-t border-zinc-900 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total</span>
                      <span className="text-base font-serif text-gold font-black">{formatMoeda(subtotal)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handlePagarCartao}
                      disabled={isPending || !sdkReady}
                      className={`w-full btn-luxury flex items-center justify-center gap-2 cursor-pointer py-4 ${isPending || !sdkReady ? "opacity-70 pointer-events-none" : ""}`}
                    >
                      {isPending ? "Processando..." : !sdkReady ? "Carregando..." : "Pagar com Cartão"}
                    </button>
                  </div>
                </div>
              )}

              {/* Botão Pix */}
              {metodoPagamento === "pix" && (
                <div className="space-y-4">
                  <div className="bg-neutral-900 border border-zinc-800 rounded-xl p-4 text-center space-y-2">
                    <p className="text-xs text-zinc-300">Você será redirecionado para um QR Code Pix gerado na hora.</p>
                    <p className="text-[10px] text-zinc-500">O pagamento é confirmado automaticamente.</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total</span>
                    <span className="text-base font-serif text-gold font-black">{formatMoeda(subtotal)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGerarPix}
                    disabled={isPending}
                    className={`w-full btn-luxury flex items-center justify-center gap-2 cursor-pointer py-4 ${isPending ? "opacity-70 pointer-events-none" : ""}`}
                  >
                    {isPending ? "Gerando Pix..." : "Gerar QR Code Pix"}
                  </button>
                </div>
              )}
            </div>
          ) : checkoutSuccess ? (
            <div className="flex flex-col items-center space-y-4 p-6">
              <div className="h-16 w-16 bg-green-950/50 border border-green-500/30 rounded-full flex items-center justify-center text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-serif text-white font-bold">Pedido Registrado!</h3>
              <p className="text-sm text-zinc-400 font-light leading-relaxed">{checkoutSuccess.message}</p>
              <button type="button" onClick={() => setIsOpen(false)} className="btn-luxury w-full mt-6 cursor-pointer">
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
          ) : etapa === "endereco" ? (
            /* Form de Entrega */
            <form onSubmit={onSubmitCheckout} className="space-y-4 text-white text-left">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <h3 className="text-sm font-serif font-bold text-gold uppercase tracking-wider">Dados de Entrega & Contato</h3>
                <button
                  type="button"
                  onClick={() => setEtapa("itens")}
                  className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← Voltar
                </button>
              </div>

              {validationError && (
                <p className="text-xs text-red-500 font-bold bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg">
                  ⚠️ {validationError}
                </p>
              )}

              <div className="space-y-3 text-xs">
                {/* Nome */}
                <div className="space-y-1">
                  <label htmlFor="checkout-nome" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome Completo *</label>
                  <input
                    id="checkout-nome"
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Contato (WhatsApp/Celular) */}
                <div className="space-y-1">
                  <label htmlFor="checkout-contato" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">WhatsApp / Celular *</label>
                  <input
                    id="checkout-contato"
                    type="tel"
                    required
                    placeholder="Ex: (11) 99999-9999"
                    value={contato}
                    onChange={(e) => setContato(e.target.value)}
                    className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                  />
                </div>

                {/* CEP */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label htmlFor="checkout-cep" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CEP *</label>
                    {loadingCep && <span className="text-[10px] text-gold animate-pulse">Buscando CEP...</span>}
                  </div>
                  <input
                    id="checkout-cep"
                    type="text"
                    required
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                  />
                  {cepError && <p className="text-[10px] text-red-500 font-bold">{cepError}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Estado */}
                  <div className="space-y-1 col-span-1">
                    <label htmlFor="checkout-estado" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">UF *</label>
                    <input
                      id="checkout-estado"
                      type="text"
                      required
                      maxLength={2}
                      placeholder="SP"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold uppercase"
                    />
                  </div>
                  {/* Cidade */}
                  <div className="space-y-1 col-span-2">
                    <label htmlFor="checkout-cidade" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cidade *</label>
                    <input
                      id="checkout-cidade"
                      type="text"
                      required
                      placeholder="Ex: São Paulo"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                {/* Bairro */}
                <div className="space-y-1">
                  <label htmlFor="checkout-bairro" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Bairro *</label>
                  <input
                    id="checkout-bairro"
                    type="text"
                    required
                    placeholder="Ex: Centro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Rua */}
                <div className="space-y-1">
                  <label htmlFor="checkout-rua" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Logradouro / Rua *</label>
                  <input
                    id="checkout-rua"
                    type="text"
                    required
                    placeholder="Ex: Avenida Paulista"
                    value={rua}
                    onChange={(e) => setRua(e.target.value)}
                    className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Número */}
                  <div className="space-y-1 col-span-1">
                    <label htmlFor="checkout-numero" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Número *</label>
                    <input
                      id="checkout-numero"
                      type="text"
                      required
                      placeholder="Ex: 100"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                  />
                  </div>
                  {/* Complemento */}
                  <div className="space-y-1 col-span-2">
                    <label htmlFor="checkout-complemento" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Complemento</label>
                    <input
                      id="checkout-complemento"
                      type="text"
                      placeholder="Ex: Apto 12"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="w-full bg-neutral-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total do Pedido</span>
                  <span className="text-base font-serif text-gold font-black">{formatMoeda(subtotal)}</span>
                </div>

                <button
                  type="submit"
                  disabled={isPending || loadingCep}
                  className={`w-full btn-luxury flex items-center justify-center gap-2 cursor-pointer py-4 ${
                    isPending || loadingCep ? "opacity-70 pointer-events-none" : ""
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
            </form>
          ) : (
            /* Lista de Itens */
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 rounded-xl border border-zinc-900 bg-neutral-900/30 hover:border-zinc-800/80 transition-all duration-300"
                >
                  {/* Imagem do Produto */}
                  <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-900 bg-neutral-900 flex items-center justify-center">
                    <OptimizedImage
                      src={item.imagem}
                      alt={item.nome}
                      fill
                      sizes="64px"
                      className="object-cover"
                      fallbackText="M&A"
                    />
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
        {!checkoutSuccess && cartItems.length > 0 && etapa === "itens" && (
          <div className="p-6 border-t border-zinc-900 bg-neutral-950/80 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Subtotal</span>
              <span className="text-lg font-serif text-gold font-black">{formatMoeda(subtotal)}</span>
            </div>

            <p className="text-[10px] text-zinc-500 font-light leading-relaxed">
              Pagamento seguro via Mercado Pago. Aceita PIX, cartão de crédito e débito.
            </p>

            <button
              type="button"
              onClick={() => setEtapa("endereco")}
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
                "Continuar compra"
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
