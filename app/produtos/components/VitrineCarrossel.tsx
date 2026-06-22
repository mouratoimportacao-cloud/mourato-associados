"use client";

import { useRef, useEffect, useCallback } from "react";
import CardProduto from "../../components/CardProduto";

export default function VitrineCarrossel({ produtos }: { produtos: any[] }) {
  const carrosselRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);

  const pauseAutoScroll = useCallback(() => {
    isPausedRef.current = true;
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      isPausedRef.current = false;
    }, 6000);
  }, []);

  useEffect(() => {
    const container = carrosselRef.current;
    if (!container || produtos.length <= 1) return;

    const cardWidth = 300 + 24;

    intervalRef.current = setInterval(() => {
      if (isPausedRef.current || !container) return;

      const maxScroll = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, 4000);

    const handleInteraction = () => pauseAutoScroll();

    container.addEventListener("mouseenter", handleInteraction);
    container.addEventListener("touchstart", handleInteraction);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
      container.removeEventListener("mouseenter", handleInteraction);
      container.removeEventListener("touchstart", handleInteraction);
    };
  }, [produtos, pauseAutoScroll]);

  const scrollLeft = () => {
    pauseAutoScroll();
    if (carrosselRef.current) {
      carrosselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    pauseAutoScroll();
    if (carrosselRef.current) {
      carrosselRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  if (produtos.length === 0) return null;

  return (
    <div className="relative">
      {/* Setas — só desktop */}
      <button
        onClick={scrollLeft}
        aria-label="Anterior"
        className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-[#1A1A1A] hover:bg-gold hover:text-black border border-zinc-700 text-white rounded-full p-2.5 shadow-lg transition duration-300 -translate-x-1/2 cursor-pointer items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={scrollRight}
        aria-label="Próximo"
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-[#1A1A1A] hover:bg-gold hover:text-black border border-zinc-700 text-white rounded-full p-2.5 shadow-lg transition duration-300 translate-x-1/2 cursor-pointer items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Cards — touch no mobile, snap scroll */}
      <div
        ref={carrosselRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-4 px-[calc(50%-140px)] sm:px-6 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {produtos.map((produto: any) => (
          <div key={produto.id} className="snap-center shrink-0 w-[280px] sm:w-[300px]">
            <CardProduto
              produto={produto}
              variant="compact"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
