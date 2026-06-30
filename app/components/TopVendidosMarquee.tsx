"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Produto {
  id: number;
  nome: string;
  marca: string;
  preco: number | null;
  imagem: string | null;
  slug: string;
}

function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function TopVendidosMarquee({ produtos }: { produtos: Produto[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % produtos.length);
    }, 3500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, produtos.length]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Cards grid */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-5 md:overflow-visible md:gap-4 lg:gap-5 -mx-1 px-1">
        {produtos.map((produto, index) => {
          const isActive = index === activeIndex;

          return (
            <Link
              key={produto.id}
              href={`/produto/${slugify(produto.nome)}`}
              className="group relative flex-shrink-0 w-36 sm:w-40 md:w-auto snap-center"
              onMouseEnter={() => {
                setPaused(true);
                setActiveIndex(index);
              }}
              onTouchStart={() => {
                setPaused(true);
                setActiveIndex(index);
              }}
            >
              <div
                className={`relative overflow-hidden rounded-lg bg-gradient-to-b from-neutral-900 to-black shadow-lg transition-all duration-700 ease-in-out ${
                  isActive
                    ? "border-luxury-gold/60 border shadow-[0_0_20px_rgba(197,160,40,0.15)] scale-[1.03] z-10"
                    : "border border-white/5 opacity-55 scale-100"
                }`}
              >
                {/* Badge posição */}
                <div className="absolute top-1.5 left-1.5 z-10">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black shadow-md transition-all duration-700 ${
                      isActive
                        ? "bg-luxury-gold text-black"
                        : "bg-neutral-800 text-gray-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>

                {/* Imagem */}
                <div className="aspect-square overflow-hidden bg-neutral-900">
                  {produto.imagem ? (
                    <img
                      src={produto.imagem}
                      alt={produto.nome}
                      className={`w-full h-full object-cover transition-transform duration-700 ${
                        isActive ? "scale-105" : "scale-100"
                      }`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                      Sem foto
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2 sm:p-3 space-y-0.5">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-luxury-gold/70 font-medium truncate">
                    {produto.marca}
                  </p>
                  <p
                    className={`text-[11px] sm:text-xs font-bold truncate transition-colors duration-700 ${
                      isActive ? "text-luxury-gold" : "text-white"
                    }`}
                  >
                    {produto.nome}
                  </p>
                  {produto.preco && (
                    <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                      R$ {Number(produto.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                {/* Glow overlay no ativo */}
                <div
                  className={`absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-700 ${
                    isActive
                      ? "opacity-100 bg-[radial-gradient(ellipse_at_bottom,_rgba(197,160,40,0.08)_0%,_transparent_60%)]"
                      : "opacity-0"
                  }`}
                ></div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Indicadores de progresso */}
      <div className="flex justify-center gap-2 mt-4">
        {produtos.map((_, index) => (
          <button
            key={index}
            onClick={() => { setActiveIndex(index); setPaused(true); setTimeout(() => setPaused(false), 5000); }}
            className={`h-1 rounded-full transition-all duration-500 cursor-pointer ${
              index === activeIndex
                ? "w-6 bg-luxury-gold"
                : "w-2 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Produto ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
