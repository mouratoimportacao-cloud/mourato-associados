"use client";

import { useRef, useEffect } from "react";
import CardProduto from "../../components/CardProduto";

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
        {displayProdutos.map((produto: any, index: number) => (
          <CardProduto
            key={`${produto.id}-${index}`}
            produto={produto}
            variant="compact"
          />
        ))}
      </div>
    </div>
  );
}
