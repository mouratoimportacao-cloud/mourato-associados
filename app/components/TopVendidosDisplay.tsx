"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface ProdutoTop {
  id: number;
  nome: string;
  marca: string;
  imagem: string | null;
  porcentagem: number;
}

function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function TopVendidosDisplay({ produtos }: { produtos: ProdutoTop[] }) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto flex flex-col gap-3">
      {produtos.map((produto, index) => {
        const isActive = index === activeIndex;

        return (
          <Link
            key={produto.id}
            href={`/produto/${slugify(produto.nome)}`}
            className={`group flex items-center gap-3 sm:gap-4 transition-all duration-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: `${index * 100}ms` }}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(-1)}
            onTouchStart={() => setActiveIndex(index)}
            onTouchEnd={() => setActiveIndex(-1)}
          >
            {/* Imagem fora do card */}
            <div
              className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-500 ${
                isActive
                  ? "border-2 border-luxury-gold shadow-[0_0_14px_rgba(197,160,40,0.3)] scale-110"
                  : "border border-white/10 scale-100"
              }`}
            >
              {produto.imagem ? (
                <img
                  src={produto.imagem}
                  alt={produto.nome}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-gray-600 text-[8px]">
                  M&A
                </div>
              )}
            </div>

            {/* Card com dados */}
            <div
              className={`flex items-center gap-3 sm:gap-4 flex-grow p-3 sm:p-4 rounded-xl border transition-all duration-500 ${
                isActive
                  ? "bg-neutral-900 border-luxury-gold/40 shadow-[0_0_12px_rgba(197,160,40,0.06)]"
                  : "bg-neutral-900/40 border-white/5"
              }`}
            >
              {/* Badge */}
              <span
                className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-black shadow-md flex-shrink-0 transition-all duration-500 ${
                  isActive
                    ? "bg-gradient-to-br from-luxury-gold to-yellow-600 text-black"
                    : "bg-neutral-800 text-gray-400"
                }`}
              >
                {index + 1}
              </span>

              {/* Nome + Marca + Barra */}
              <div className="flex-grow min-w-0">
                <p
                  className={`text-xs sm:text-sm font-bold truncate max-w-[10rem] sm:max-w-[16rem] md:max-w-none transition-colors duration-500 ${
                    isActive ? "text-luxury-gold" : "text-white"
                  }`}
                  title={produto.nome}
                >
                  {produto.nome}
                </p>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-luxury-gold/60 font-medium mb-1.5">
                  {produto.marca}
                </p>

                {/* Barra */}
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      isActive
                        ? "bg-gradient-to-r from-luxury-gold to-yellow-400"
                        : "bg-gradient-to-r from-luxury-gold/50 to-yellow-600/30"
                    }`}
                    style={{
                      width: isVisible ? `${produto.porcentagem}%` : "0%",
                      transitionDelay: `${index * 120 + 200}ms`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Porcentagem */}
              <span
                className={`text-lg sm:text-xl font-black flex-shrink-0 transition-all duration-500 ${
                  isActive ? "text-luxury-gold" : "text-gray-500"
                } ${isVisible ? "opacity-100" : "opacity-0"}`}
                style={{ transitionDelay: `${index * 120 + 400}ms` }}
              >
                {produto.porcentagem}%
              </span>
            </div>
          </Link>
        );
      })}

      {/* Rodapé */}
      <p className="text-[9px] text-gray-500 text-center mt-3 italic">
        *Porcentagem baseada no volume de vendas. Atualizado em {today}
      </p>
    </div>
  );
}
