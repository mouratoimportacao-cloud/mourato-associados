"use client";

import { useRef, useEffect, useState, useMemo } from "react";

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

  const [isMobile, setIsMobile] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTouchActive, setIsTouchActive] = useState(false);

  // Detect mobile screen size (width < 768)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Desktop uses triplicated list for infinite loop continuous marquee
  const displayProdutos = useMemo(() => {
    return [...produtos, ...produtos, ...produtos];
  }, [produtos]);

  const itemsToRender = isMobile ? produtos : displayProdutos;

  // Temporarily pause autoplay on manual interaction
  const temporarilyPauseAutoScroll = () => {
    autoScrollPausedRef.current = true;
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    pauseTimeoutRef.current = setTimeout(() => {
      autoScrollPausedRef.current = false;
    }, 6000); // 6 seconds pause
  };

  // 1. Desktop Autoplay (Continuous marquee)
  useEffect(() => {
    const container = carrosselRef.current;
    if (!container || produtos.length === 0 || isMobile) return;

    let intervalId: NodeJS.Timeout;
    let isMouseOver = false;

    const startAutoScroll = () => {
      intervalId = setInterval(() => {
        if (!isMouseOver && !autoScrollPausedRef.current && container) {
          const singleWidth = container.scrollWidth / 3;
          if (container.scrollLeft >= singleWidth * 2) {
            container.scrollLeft = container.scrollLeft - singleWidth;
          }
          container.scrollLeft += 1;
        }
      }, 35);
    };

    const handleMouseEnter = () => { isMouseOver = true; };
    const handleMouseLeave = () => { isMouseOver = false; };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    startAutoScroll();

    const initTimeout = setTimeout(() => {
      if (container) {
        container.scrollLeft = container.scrollWidth / 3;
      }
    }, 100);

    return () => {
      clearInterval(intervalId);
      clearTimeout(initTimeout);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [produtos, isMobile]);

  // Helper to scroll to specific index on mobile
  const scrollToItemMobile = (index: number) => {
    const container = carrosselRef.current;
    if (container && isMobile) {
      const items = Array.from(container.children);
      const targetItem = items[index] as HTMLElement;
      if (targetItem) {
        container.scrollTo({
          left: targetItem.offsetLeft - container.offsetLeft,
          behavior: "smooth",
        });
        setActiveIndex(index);
      }
    }
  };

  // 2. Mobile Autoplay (Every 4 seconds, page-by-page)
  useEffect(() => {
    if (!isMobile || produtos.length === 0) return;

    const intervalId = setInterval(() => {
      if (!isTouchActive && !autoScrollPausedRef.current) {
        const nextIndex = (activeIndex + 1) % produtos.length;
        scrollToItemMobile(nextIndex);
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [isMobile, activeIndex, isTouchActive, produtos.length]);

  // Track active index on scroll (for mobile dot highlighting)
  const handleScroll = () => {
    const container = carrosselRef.current;
    if (!container || !isMobile || produtos.length === 0) return;

    const items = Array.from(container.children);
    if (items.length === 0) return;

    const scrollLeft = container.scrollLeft;
    const containerLeft = container.offsetLeft;

    let closestIndex = 0;
    let minDiff = Infinity;

    items.forEach((item, idx) => {
      const itemLeft = (item as HTMLElement).offsetLeft - containerLeft;
      const diff = Math.abs(itemLeft - scrollLeft);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    if (closestIndex !== activeIndex && closestIndex < produtos.length) {
      setActiveIndex(closestIndex);
    }
  };

  // Desktop & Mobile Navigation Buttons
  const handlePrev = () => {
    temporarilyPauseAutoScroll();
    const container = carrosselRef.current;
    if (!container) return;

    if (isMobile) {
      const prevIndex = (activeIndex - 1 + produtos.length) % produtos.length;
      scrollToItemMobile(prevIndex);
    } else {
      const singleWidth = container.scrollWidth / 3;
      if (container.scrollLeft - 300 < singleWidth) {
        container.scrollLeft = container.scrollLeft + singleWidth;
      }
      container.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const handleNext = () => {
    temporarilyPauseAutoScroll();
    const container = carrosselRef.current;
    if (!container) return;

    if (isMobile) {
      const nextIndex = (activeIndex + 1) % produtos.length;
      scrollToItemMobile(nextIndex);
    } else {
      const singleWidth = container.scrollWidth / 3;
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
        onClick={handlePrev}
        aria-label="Anterior"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-gold hover:text-black border border-zinc-800 text-white rounded-full p-2.5 shadow-lg transition duration-300 md:-translate-x-1/2 md:opacity-0 md:group-hover:opacity-100 max-md:opacity-100 max-md:left-1 cursor-pointer flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={handleNext}
        aria-label="Próximo"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-gold hover:text-black border border-zinc-800 text-white rounded-full p-2.5 shadow-lg transition duration-300 md:translate-x-1/2 md:opacity-0 md:group-hover:opacity-100 max-md:opacity-100 max-md:right-1 cursor-pointer flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Grid horizontal de produtos */}
      <div
        ref={carrosselRef}
        onScroll={handleScroll}
        onTouchStart={() => {
          setIsTouchActive(true);
          temporarilyPauseAutoScroll();
        }}
        onTouchEnd={() => {
          setIsTouchActive(false);
        }}
        className={`flex gap-6 overflow-x-auto scroll-smooth scrollbar-none py-4 px-2 ${
          isMobile ? "snap-x snap-mandatory" : ""
        }`}
        style={{ scrollbarWidth: "none" }}
      >
        {itemsToRender.map((produto: any, index: number) => {
          const promoPrice = precoPromocional(produto);
          return (
            <article
              key={`${produto.id}-${index}`}
              className="w-64 shrink-0 overflow-hidden border border-zinc-900 bg-neutral-950 hover:border-gold/30 hover:scale-[1.01] transition-all duration-300 shadow-2xl relative rounded-2xl snap-start"
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

      {/* Indicadores de posição com bolinhas (Apenas no celular) */}
      {isMobile && produtos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {produtos.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                temporarilyPauseAutoScroll();
                scrollToItemMobile(i);
              }}
              aria-label={`Ir para slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === activeIndex ? "w-4 bg-gold" : "w-1.5 bg-zinc-700 hover:bg-zinc-500"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
