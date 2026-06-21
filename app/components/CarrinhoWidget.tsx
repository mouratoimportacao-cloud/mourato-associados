"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { obterLojistaPorCodigo, registrarIntencaoCompraCarrinho } from "../produtos/actions";
import OptimizedImage from "./OptimizedImage";

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
    }, 0);

    return () => window.clearTimeout(resetTimeout);
  }, [checkoutSuccess]);

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
    const initialLoad = window.setTimeout(loadCart, 0);

    // Eventos customizados para abrir e atualizar carrinho
    const handleOpen = () => {
      loadCart();
      setIsOpen(true);
      setCheckoutSuccess(null); // Reseta mensagens de sucesso anteriores
      setShowAddressForm(false);
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

      const res = await registrarIntencaoCompraCarrinho(
        itemsPayload,
        params.codigo || null,
        clienteInfo
      );

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
          ) : showAddressForm ? (
            /* Form de Entrega */
            <form onSubmit={onSubmitCheckout} className="space-y-4 text-white text-left">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <h3 className="text-sm font-serif font-bold text-gold uppercase tracking-wider">Dados de Entrega & Contato</h3>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
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
        {!checkoutSuccess && cartItems.length > 0 && !showAddressForm && (
          <div className="p-6 border-t border-zinc-900 bg-neutral-950/80 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Subtotal</span>
              <span className="text-lg font-serif text-gold font-black">{formatMoeda(subtotal)}</span>
            </div>

            <p className="text-[10px] text-zinc-500 font-light leading-relaxed">
              Checkout preparado para Mercado Pago. Até a ativação das credenciais, o pedido será registrado para atendimento e confirmação.
            </p>

            <button
              type="button"
              onClick={() => setShowAddressForm(true)}
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

            <a
              href={`https://wa.me/5511999999999?text=${encodeURIComponent(
                `Olá! Gostaria de finalizar meu pedido:\n\n${cartItems.map(item => `• ${item.nome} (${item.volume}) x${item.quantidade} - ${formatMoeda(item.preco * item.quantidade)}`).join('\n')}\n\nTotal: ${formatMoeda(subtotal)}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] uppercase tracking-widest transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.634-1.215A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.115 0-4.142-.57-5.913-1.652l-.424-.253-4.396 1.153 1.174-4.291-.278-.441A9.72 9.72 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z"/>
              </svg>
              Enviar pedido via WhatsApp
            </a>
          </div>
        )}
      </div>
    </>
  );
}
