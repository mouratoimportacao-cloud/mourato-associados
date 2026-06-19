"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { slugify } from "../../../lib/slug";

type Produto = {
  id: number;
  codigo?: number | null;
  nome: string;
  marca: string;
  categoria: string;
  volume: string;
  preco: number | null;
  estoque: number;
  descricao: string | null;
  imagem: string | null;
  promocaoAtiva?: boolean;
  descontoPercentual?: number | null;
  categoria_principal?: string | null;
  tags?: string[] | null;
  concentracao?: string | null;
  origem?: string | null;
  tipo_perfume?: string | null;
  genero?: string | null;
  familia_olfativa?: string[] | null;
  notas_topo?: string | null;
  notas_coracao?: string | null;
  notas_fundo?: string | null;
  fixacao_estimada?: string | null;
  projecao?: string | null;
  ocasiao_uso?: string[] | null;
  similaridade_inspiracao?: string | null;
  descricao_olfativa?: string | null;
};

function moeda(valor: number | null | undefined) {
  return valor ? `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sob consulta";
}

function precoPromocional(produto: Produto) {
  const preco = Number(produto.preco || 0);
  const desconto = Number(produto.descontoPercentual || 0);

  if (!produto.promocaoAtiva || !preco || !desconto) {
    return null;
  }

  return preco * (1 - desconto / 100);
}

export default function ProdutoDetalheClient({
  produto,
  relatedProducts,
}: {
  produto: Produto;
  relatedProducts: Produto[];
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [quantidade, setQuantidade] = useState(1);
  const [addedToast, setAddedToast] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const getArrayValue = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    if (typeof val === "string") {
      return val.split(",").map(v => v.trim()).filter(Boolean);
    }
    return [];
  };

  // Generate 3 slides for the gallery using variations
  const slides = useMemo(() => {
    return [
      { type: "image", src: produto.imagem || null, alt: `${produto.nome} - Imagem Principal`, brand: "", category: "" },
      { type: "image-zoom", src: produto.imagem || null, alt: `${produto.nome} - Detalhes`, brand: "", category: "" },
      { type: "brand-seal", brand: produto.marca, category: produto.categoria, src: null as string | null, alt: "" }
    ];
  }, [produto]);

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }
  };

  const handleAddToCart = (showCart = false) => {
    try {
      const cartRaw = localStorage.getItem("ma-cart") || "[]";
      let cart: any[] = [];
      try {
        cart = JSON.parse(cartRaw);
      } catch (e) {
        cart = [];
      }

      const valorAtual = precoPromocional(produto) || Number(produto.preco || 0);
      const existingIndex = cart.findIndex((item) => item.id === produto.id);
      const requestedQty = quantidade;

      if (existingIndex > -1) {
        const newQty = cart[existingIndex].quantidade + requestedQty;
        if (newQty > produto.estoque) {
          alert(`Desculpe, estoque insuficiente. Limite de ${produto.estoque} unidades.`);
          return;
        }
        cart[existingIndex].quantidade = newQty;
      } else {
        if (requestedQty > produto.estoque) {
          alert(`Desculpe, estoque insuficiente. Limite de ${produto.estoque} unidades.`);
          return;
        }
        cart.push({
          id: produto.id,
          codigo: produto.codigo,
          nome: produto.nome,
          marca: produto.marca,
          categoria: produto.categoria,
          volume: produto.volume,
          preco: valorAtual,
          precoOriginal: Number(produto.preco || 0),
          imagem: produto.imagem,
          quantidade: requestedQty,
          estoqueMaximo: produto.estoque,
        });
      }

      localStorage.setItem("ma-cart", JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent("cart-updated"));

      if (showCart) {
        window.dispatchEvent(new CustomEvent("open-cart"));
      } else {
        setAddedToast(true);
        setTimeout(() => setAddedToast(false), 3000);
      }
    } catch (error) {
      console.error("Erro ao adicionar ao carrinho:", error);
    }
  };

  const promoPrice = precoPromocional(produto);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Floating success toast */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-zinc-900 border border-gold/40 px-5 py-4 text-white shadow-2xl flex items-center gap-3 animate-slide-up">
          <div className="h-6 w-6 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center text-gold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold font-sans">Adicionado ao carrinho!</p>
            <p className="text-[10px] text-zinc-500 font-light mt-0.5">{quantidade}x {produto.nome}</p>
          </div>
        </div>
      )}

      {/* Voltar link */}
      <div>
        <Link href="/produtos" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 hover:text-gold transition-colors font-bold font-sans">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar ao Catálogo
        </Link>
      </div>

      {/* Main product columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Left: Gallery */}
        <div className="space-y-4">
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative aspect-[4/5] overflow-hidden bg-neutral-900/50 border border-zinc-900 rounded-3xl flex items-center justify-center select-none"
          >
            {/* Gallery setas */}
            <button
              onClick={handlePrevSlide}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-gold hover:text-black border border-zinc-800 text-white rounded-full p-2.5 shadow-lg transition-colors cursor-pointer flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={handleNextSlide}
              aria-label="Próxima foto"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-gold hover:text-black border border-zinc-800 text-white rounded-full p-2.5 shadow-lg transition-colors cursor-pointer flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Slides */}
            <div className="w-full h-full relative">
              {slides.map((slide, idx) => {
                if (idx !== activeSlide) return null;

                if (slide.type === "image" && slide.src) {
                  return (
                    <img
                      key={idx}
                      src={slide.src}
                      alt={slide.alt || ""}
                      loading="lazy"
                      className="w-full h-full object-cover animate-fade-in"
                    />
                  );
                }

                if (slide.type === "image-zoom" && slide.src) {
                  return (
                    <div key={idx} className="w-full h-full overflow-hidden flex items-center justify-center animate-fade-in">
                      <img
                        src={slide.src}
                        alt={slide.alt || ""}
                        loading="lazy"
                        className="w-full h-full object-cover scale-[1.5] origin-center"
                      />
                    </div>
                  );
                }

                if (slide.type === "brand-seal") {
                  return (
                    <div key={idx} className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-neutral-900 to-neutral-950 text-center space-y-4 animate-fade-in select-none">
                      <div className="w-16 h-16 rounded-full border border-gold/30 bg-gold/5 flex items-center justify-center text-gold text-lg font-serif">
                        M&A
                      </div>
                      <div>
                        <h4 className="text-luxury-gold uppercase tracking-[0.25em] text-[10px] font-bold font-sans">Garantia de Autenticidade</h4>
                        <h3 className="text-xl font-serif text-white mt-1">{slide.brand}</h3>
                        <p className="text-zinc-500 text-xs mt-2 font-light max-w-[200px]">
                          Curadoria de alta perfumaria {slide.category.toLowerCase()}.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="w-full h-full flex items-center justify-center bg-neutral-900/30 text-zinc-500 italic font-serif text-xs">
                    Maison Mourato
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gallery thumbnails */}
          <div className="flex gap-3 justify-center">
            {slides.map((slide, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`w-16 h-20 rounded-xl overflow-hidden bg-neutral-950 border transition-all cursor-pointer ${
                  idx === activeSlide ? "border-gold/60 ring-1 ring-gold/20" : "border-zinc-900 hover:border-zinc-700"
                }`}
              >
                {slide.type === "image" && slide.src ? (
                  <img src={slide.src} alt="Miniatura" loading="lazy" className="w-full h-full object-cover" />
                ) : slide.type === "image-zoom" && slide.src ? (
                  <div className="w-full h-full overflow-hidden flex items-center justify-center scale-150">
                    <img src={slide.src} alt="Miniatura zoom" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900/30 text-gold text-[8px] font-bold font-sans p-1">
                    SELO
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Info */}
        <div className="space-y-6">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-luxury-gold uppercase tracking-[0.3em] font-sans block mb-1">
              {produto.marca}
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif text-white tracking-tight">{produto.nome}</h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1 uppercase font-semibold font-sans tracking-wide">
              {produto.volume} • {produto.categoria}
            </p>
          </div>

          <div className="border-t border-zinc-900 pt-6">
            {promoPrice ? (
              <div className="rounded-2xl bg-red-950/20 border border-red-900/40 p-4 inline-block shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-red-600 px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-widest">
                    Oferta -{produto.descontoPercentual}%
                  </span>
                  <span className="text-xs line-through text-zinc-500 font-sans">{moeda(produto.preco)}</span>
                </div>
                <div className="text-3xl font-black text-red-500 mt-1 leading-none">{moeda(promoPrice)}</div>
              </div>
            ) : (
              <div className="text-3xl font-bold text-gold font-sans">{moeda(produto.preco)}</div>
            )}
            <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-green-500 flex items-center gap-1.5 font-sans">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Estoque disponível: {produto.estoque} unidades
            </div>
          </div>

          {produto.descricao && (
            <div className="space-y-2 border-t border-zinc-900 pt-6">
              <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider font-sans">Sobre o produto</h4>
              <p className="text-zinc-400 text-sm leading-relaxed font-light">{produto.descricao}</p>
            </div>
          )}

          {/* Olfactory fields */}
          {(produto.concentracao || produto.notas_topo || produto.notas_coracao || produto.notas_fundo || produto.similaridade_inspiracao || produto.descricao_olfativa) && (
            <div className="space-y-4 border-t border-zinc-900 pt-6">
              <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider font-sans">Informações Olfativas</h4>
              <div className="text-xs space-y-3 text-zinc-400 font-sans">
                {produto.descricao_olfativa && (
                  <p className="text-zinc-300 italic leading-relaxed bg-neutral-900/20 border-l border-gold/40 pl-3 py-1">
                    "{produto.descricao_olfativa}"
                  </p>
                )}

                {produto.concentracao && (
                  <div>
                    <span className="text-zinc-500 font-medium">Concentração:</span>{" "}
                    <span className="text-zinc-200">{produto.concentracao}</span>
                  </div>
                )}

                {(produto.notas_topo || produto.notas_coracao || produto.notas_fundo) && (
                  <div className="space-y-1">
                    <span className="text-zinc-500 font-medium block">Notas Olfativas:</span>
                    <div className="pl-3 border-l border-gold/30 space-y-0.5">
                      {produto.notas_topo && (
                        <div>
                          <span className="text-zinc-500">Topo:</span>{" "}
                          <span className="text-zinc-300">{produto.notas_topo}</span>
                        </div>
                      )}
                      {produto.notas_coracao && (
                        <div>
                          <span className="text-zinc-500">Coração:</span>{" "}
                          <span className="text-zinc-300">{produto.notas_coracao}</span>
                        </div>
                      )}
                      {produto.notas_fundo && (
                        <div>
                          <span className="text-zinc-500">Fundo:</span>{" "}
                          <span className="text-zinc-300">{produto.notas_fundo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {produto.similaridade_inspiracao && (
                  <div>
                    <span className="text-zinc-500 font-medium">Inspirado em:</span>{" "}
                    <span className="text-zinc-200">{produto.similaridade_inspiracao}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add to cart panel */}
          <div className="border-t border-zinc-900 pt-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-zinc-800 rounded-full bg-neutral-950 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  className="px-4 py-2.5 text-zinc-500 hover:text-white font-bold transition-colors cursor-pointer select-none"
                >
                  -
                </button>
                <span className="w-10 text-center text-xs font-bold text-white font-sans">{quantidade}</span>
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.min(produto.estoque, q + 1))}
                  className="px-4 py-2.5 text-zinc-500 hover:text-white font-bold transition-colors cursor-pointer select-none"
                >
                  +
                </button>
              </div>

              <span className="text-xs text-zinc-500 font-light font-sans">
                Selecione a quantidade para o pedido
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleAddToCart(true)}
                className="w-full rounded-full bg-gold hover:bg-white text-black font-black text-center py-3.5 text-xs uppercase tracking-widest transition-all cursor-pointer font-sans"
              >
                Comprar
              </button>
              <button
                type="button"
                onClick={() => handleAddToCart(false)}
                className="w-full rounded-full border border-zinc-800 hover:border-zinc-700 bg-neutral-950 text-white font-black text-center py-3.5 text-xs uppercase tracking-widest transition-all cursor-pointer font-sans"
              >
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related products section */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-zinc-900 pt-16 space-y-8">
          <div>
            <span className="text-[10px] font-bold text-luxury-gold uppercase tracking-[0.35em] block mb-2 font-sans">
              Recomendações
            </span>
            <h2 className="text-2xl font-serif text-white">Produtos Relacionados</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((related) => {
              const relPromoPrice = precoPromocional(related);
              return (
                <div key={related.id} className="group border border-zinc-900 bg-neutral-950 p-3 rounded-2xl flex flex-col h-full hover:border-gold/30 transition-all duration-300">
                  <Link href={`/produto/${slugify(related.nome)}`} className="relative aspect-[3/4] overflow-hidden bg-neutral-900/50 rounded-xl mb-3 block">
                    {related.promocaoAtiva && related.descontoPercentual ? (
                      <div className="absolute right-2 top-2 z-10 rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-xl">
                        -{related.descontoPercentual}%
                      </div>
                    ) : null}
                    {related.imagem ? (
                      <img src={related.imagem} alt={related.nome} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-900/30 text-zinc-500 italic font-serif text-[10px]">M&A</div>
                    )}
                  </Link>

                  <div className="space-y-1.5 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[8px] uppercase tracking-wider font-bold text-gold">
                        <span>{related.marca}</span>
                      </div>
                      <Link href={`/produto/${slugify(related.nome)}`} className="text-xs font-serif text-gray-100 hover:text-gold block leading-tight mt-1 line-clamp-2">
                        {related.nome}
                      </Link>
                    </div>

                    <div className="pt-2 border-t border-zinc-900 flex justify-between items-center mt-3">
                      {relPromoPrice ? (
                        <div className="text-left">
                          <span className="text-[8px] line-through text-zinc-500 block">{moeda(related.preco)}</span>
                          <span className="text-xs font-bold text-red-500 block leading-none">{moeda(relPromoPrice)}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-gray-200">{moeda(related.preco)}</span>
                      )}
                      <span className="text-[8px] uppercase tracking-widest text-green-500 font-bold">Ativo</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
