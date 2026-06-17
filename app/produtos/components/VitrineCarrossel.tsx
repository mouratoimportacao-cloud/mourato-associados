"use client";

import { useRef, useEffect } from "react";

function moeda(valor: number | null | undefined) {
  return valor ? `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sob consulta";
}

function precoPromocional(produto: any) {
  const preco = Number(produto.preco || 0);
  const desconto = Number(produto.descontoPercentual || 0);

  if (!produto.promocaoAtiva || !preco || !desconto) {
    return null;
  }

  return preco * (1 - desconto / 100);
}

export default function VitrineCarrossel({ produtos }: { produtos: any[] }) {
  const carrosselRef = useRef<HTMLDivElement>(null);
  const autoScrollPausedRef = useRef(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Triplicamos os produtos para criar um efeito de loop infinito perfeito no scroll
  const displayProdutos = [...produtos, ...produtos, ...produtos];

  const temporarilyPauseAutoScroll = () => {
    autoScrollPausedRef.current = true;
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    pauseTimeoutRef.current = setTimeout(() => {
      autoScrollPausedRef.current = false;
    }, 6000); // Pausa a rolagem automática por 6 segundos na interação manual
  };

  useEffect(() => {
    const container = carrosselRef.current;
    if (!container || produtos.length === 0) return;

    let intervalId: NodeJS.Timeout;
    let isMouseOver = false;

    const startAutoScroll = () => {
      intervalId = setInterval(() => {
        if (!isMouseOver && !autoScrollPausedRef.current && container) {
          const singleWidth = container.scrollWidth / 3;

          // Se passou de 2/3 da largura total, retrocede de forma invisível para 1/3
          if (container.scrollLeft >= singleWidth * 2) {
            container.scrollLeft = container.scrollLeft - singleWidth;
          }

          container.scrollLeft += 1;
        }
      }, 35); // velocidade do marquee contínuo (~28px por segundo)
    };

    const handleMouseEnter = () => {
      isMouseOver = true;
    };

    const handleMouseLeave = () => {
      isMouseOver = false;
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    startAutoScroll();

    // Posiciona o scroll inicial no centro (1/3) para permitir navegação imediata em ambas direções
    const initTimeout = setTimeout(() => {
      if (container) {
        container.scrollLeft = container.scrollWidth / 3;
      }
    }, 100);

    return () => {
      clearInterval(intervalId);
      clearTimeout(initTimeout);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
      if (container) {
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [produtos]);

  const scrollLeft = () => {
    temporarilyPauseAutoScroll();
    if (carrosselRef.current) {
      const container = carrosselRef.current;
      const singleWidth = container.scrollWidth / 3;

      // Se voltar 300px for ficar abaixo de 1/3, ajusta o scroll avançando 1/3 para manter espaço
      if (container.scrollLeft - 300 < singleWidth) {
        container.scrollLeft = container.scrollLeft + singleWidth;
      }

      container.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    temporarilyPauseAutoScroll();
    if (carrosselRef.current) {
      const container = carrosselRef.current;
      const singleWidth = container.scrollWidth / 3;

      // Se avançar 300px for ultrapassar 2/3, recua 1/3 para continuar o movimento contínuo
      if (container.scrollLeft + 300 > singleWidth * 2) {
        container.scrollLeft = container.scrollLeft - singleWidth;
      }

      container.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="relative group">
      {/* Setas de navegação */}
      <button
        onClick={scrollLeft}
        aria-label="Anterior"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-gold hover:text-black border border-zinc-800 text-white rounded-full p-2.5 shadow-lg transition duration-300 -translate-x-1/2 opacity-0 group-hover:opacity-100 cursor-pointer flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={scrollRight}
        aria-label="Próximo"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-gold hover:text-black border border-zinc-800 text-white rounded-full p-2.5 shadow-lg transition duration-300 translate-x-1/2 opacity-0 group-hover:opacity-100 cursor-pointer flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Grid horizontal de produtos */}
      <div
        ref={carrosselRef}
        className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-none py-4 px-2"
        style={{ scrollbarWidth: "none" }}
      >
        {displayProdutos.map((produto: any, index: number) => {
          const promoPrice = precoPromocional(produto);
          return (
            <article
              key={`${produto.id}-${index}`}
              className="w-64 shrink-0 overflow-hidden border border-zinc-900 bg-neutral-950 hover:border-gold/30 hover:scale-[1.01] transition-all duration-300 shadow-2xl relative rounded-2xl"
            >
              {produto.promocaoAtiva && produto.descontoPercentual ? (
                <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                  -{produto.descontoPercentual}%
                </div>
              ) : null}
              <div className="aspect-[4/5] overflow-hidden bg-neutral-900/50 flex items-center justify-center border-b border-zinc-900">
                {produto.imagem ? (
                  <img src={produto.imagem} alt={produto.nome} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-zinc-700 italic font-serif">
                    M&A
                  </div>
                )}
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between gap-3 items-center">
                  <span className="text-[9px] font-bold text-gold uppercase tracking-widest">{produto.marca}</span>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest">{produto.categoria}</span>
                </div>
                <h3 className="text-md font-serif text-gray-100 leading-snug h-12 overflow-hidden line-clamp-2">{produto.nome}</h3>
                <div className="border-t border-zinc-900 pt-3 space-y-3">
                  {promoPrice ? (
                    <div className="rounded-xl bg-red-950/40 border border-red-900/50 px-3 py-2 text-white shadow-md">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Oferta</span>
                        <span className="text-[10px] line-through text-zinc-500">{moeda(produto.preco)}</span>
                      </div>
                      <div className="text-lg font-black text-red-500 mt-0.5">{moeda(promoPrice)}</div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-zinc-900 px-3 py-2 bg-neutral-900/30">
                      <span className="text-[10px] uppercase tracking-widest text-zinc-500">Preço</span>
                      <span className="text-sm font-bold text-gray-200">{moeda(produto.preco)}</span>
                    </div>
                  )}
                  <a
                    href={`#produto-${produto.id}`}
                    className="block w-full rounded-full bg-gold hover:bg-white text-black font-bold text-center text-[9px] py-2 px-3 uppercase tracking-widest transition-all"
                  >
                    Comprar
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
