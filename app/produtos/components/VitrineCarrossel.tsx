"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { slugify } from "../../../lib/slug";
import OptimizedImage from "../../components/OptimizedImage";

function moeda(valor: number | null | undefined) {
  return valor ? `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sob consulta";
}

function precoPromocional(produto: any) {
  const preco = Number(produto.preco || 0);
  const desconto = Number(produto.descontoPercentual || 0);
  if (!produto.promocaoAtiva || !preco || !desconto) return null;
  return preco * (1 - desconto / 100);
}

function ProdutoCard({ produto }: { produto: any }) {
  const promoPrice = precoPromocional(produto);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <article className="relative w-56 sm:w-64 shrink-0 overflow-hidden rounded-2xl border border-zinc-900 bg-neutral-950 shadow-2xl transition-colors hover:border-gold/30">
      {mounted && produto.promocaoAtiva && produto.descontoPercentual ? (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
          -{produto.descontoPercentual}%
        </div>
      ) : null}

      <Link href={`/produto/${slugify(produto.nome)}`} aria-label={`Consultar ${produto.nome}`} className="relative block aspect-[4/5] overflow-hidden border-b border-zinc-900 bg-neutral-900/50">
        <OptimizedImage src={produto.imagem} alt={produto.nome} fill sizes="256px" quality={75} className="object-cover transition-transform duration-500 hover:scale-105" fallbackText="M&A" />
      </Link>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gold">{produto.marca}</span>
          <span className="text-[9px] uppercase tracking-widest text-zinc-500">{produto.categoria}</span>
        </div>
        <h3 className="h-12 overflow-hidden text-md font-serif leading-snug text-gray-100 line-clamp-2">{produto.nome}</h3>
        <div className="space-y-3 border-t border-zinc-900 pt-3">
          {promoPrice ? (
            <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2">
              <span className="text-[10px] text-zinc-500 line-through">{moeda(produto.preco)}</span>
              <div className="text-lg font-black text-red-500">{moeda(promoPrice)}</div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-neutral-900/30 px-3 py-2">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">Preço</span>
              <span className="text-sm font-bold text-gray-200">{moeda(produto.preco)}</span>
            </div>
          )}
          <Link href={`/produto/${slugify(produto.nome)}`} className="block w-full rounded-full bg-gold px-3 py-2 text-center text-[9px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-white">
            Consultar produto
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function VitrineCarrossel({ produtos }: { produtos: any[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  // Medir largura do primeiro grupo para o loop
  useEffect(() => {
    if (trackRef.current) {
      const firstGroup = trackRef.current.querySelector("[data-group='first']") as HTMLElement;
      if (firstGroup) {
        setTrackWidth(firstGroup.offsetWidth);
      }
    }
  }, [produtos.length]);

  // Scroll manual com botões
  const scroll = (direction: -1 | 1) => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const current = parseFloat(getComputedStyle(track).getPropertyValue("--scroll-offset") || "0");
    const newOffset = current + direction * 280;
    track.style.setProperty("--scroll-offset", `${newOffset}px`);
  };

  if (produtos.length <= 1) {
    return (
      <div className="flex justify-center py-4">
        {produtos.map((produto: any) => (
          <ProdutoCard key={produto.id} produto={produto} />
        ))}
      </div>
    );
  }

  // Duração da animação baseada na quantidade de produtos
  const duration = produtos.length * 8;

  return (
    <div
      className="group relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => {
        // Delay para não despausar imediatamente no iOS
        setTimeout(() => setPaused(false), 4000);
      }}
    >
      {/* Setas */}
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Produto anterior"
        className="absolute left-1 top-1/2 z-20 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-800 bg-black/80 text-white shadow-lg transition-colors hover:bg-gold hover:text-black"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Próximo produto"
        className="absolute right-1 top-1/2 z-20 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-800 bg-black/80 text-white shadow-lg transition-colors hover:bg-gold hover:text-black"
      >
        ›
      </button>

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-neutral-950 to-transparent pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-neutral-950 to-transparent pointer-events-none"></div>

      {/* Track com CSS animation */}
      <div className="py-4 px-2">
        <div
          ref={trackRef}
          className="flex w-max gap-5"
          style={{
            animation: `vitrine-scroll ${duration}s linear infinite`,
            animationPlayState: paused ? "paused" : "running",
            WebkitAnimation: `vitrine-scroll ${duration}s linear infinite`,
            WebkitAnimationPlayState: paused ? "paused" : "running",
          }}
        >
          {/* Primeiro grupo */}
          <div data-group="first" className="flex shrink-0 gap-5">
            {produtos.map((produto: any) => (
              <ProdutoCard key={`a-${produto.id}`} produto={produto} />
            ))}
          </div>
          {/* Duplicado para loop infinito */}
          <div className="flex shrink-0 gap-5" aria-hidden="true">
            {produtos.map((produto: any) => (
              <ProdutoCard key={`b-${produto.id}`} produto={produto} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
