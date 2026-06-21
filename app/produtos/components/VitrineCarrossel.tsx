"use client";

import { useEffect, useRef } from "react";
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

function ProdutoCard({ produto, instance }: { produto: any; instance: string }) {
  const promoPrice = precoPromocional(produto);

  return (
    <article className="relative w-64 shrink-0 overflow-hidden rounded-2xl border border-zinc-900 bg-neutral-950 shadow-2xl transition-colors hover:border-gold/30">
      {produto.promocaoAtiva && produto.descontoPercentual ? (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
          -{produto.descontoPercentual}%
        </div>
      ) : null}

      <Link href={`/produto/${slugify(produto.nome)}`} aria-label={`Consultar ${produto.nome}`} data-carousel-instance={instance} className="relative block aspect-[4/5] overflow-hidden border-b border-zinc-900 bg-neutral-900/50">
        <OptimizedImage src={produto.imagem} alt={produto.nome} fill sizes="256px" quality={75} className="object-cover transition-transform duration-500 hover:scale-105" fallbackText="M&A" />
      </Link>

      <div className="space-y-3 p-5">
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
  const carrosselRef = useRef<HTMLDivElement>(null);
  const primeiroGrupoRef = useRef<HTMLDivElement>(null);
  const pausadoRef = useRef(false);

  const scroll = (direction: -1 | 1) => {
    carrosselRef.current?.scrollBy({ left: direction * 288, behavior: "smooth" });
  };

  useEffect(() => {
    if (produtos.length <= 1) return;

    let animationFrame = 0;
    let previousTime = 0;
    const pixelsPerSecond = 36;

    const animate = (time: number) => {
      const container = carrosselRef.current;
      const firstGroup = primeiroGrupoRef.current;

      if (container && firstGroup) {
        if (!previousTime) previousTime = time;
        const elapsedSeconds = Math.min((time - previousTime) / 1000, 0.05);
        previousTime = time;

        if (!pausadoRef.current) {
          container.scrollLeft += pixelsPerSecond * elapsedSeconds;
          const loopWidth = firstGroup.scrollWidth + 24;
          if (container.scrollLeft >= loopWidth) {
            container.scrollLeft -= loopWidth;
          }
        }
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [produtos.length]);

  return (
    <div
      className="group relative"
      onMouseEnter={() => { pausadoRef.current = true; }}
      onMouseLeave={() => { pausadoRef.current = false; }}
      onTouchStart={() => { pausadoRef.current = true; }}
      onTouchEnd={() => { pausadoRef.current = false; }}
    >
      {produtos.length > 1 && (
        <>
          <button type="button" onClick={() => scroll(-1)} aria-label="Produto anterior" className="absolute left-1 top-1/2 z-20 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-800 bg-black/80 text-white shadow-lg transition-colors hover:bg-gold hover:text-black">
            ‹
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Próximo produto" className="absolute right-1 top-1/2 z-20 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-800 bg-black/80 text-white shadow-lg transition-colors hover:bg-gold hover:text-black">
            ›
          </button>
        </>
      )}

      <div ref={carrosselRef} className="overflow-x-auto px-2 py-4 [scrollbar-width:none]">
        <div className="flex w-max gap-6">
          <div ref={primeiroGrupoRef} className="flex shrink-0 gap-6">
            {produtos.map((produto: any) => (
              <ProdutoCard key={`principal-${produto.id}`} produto={produto} instance="principal" />
            ))}
          </div>
          {produtos.length > 1 && (
            <div className="flex shrink-0 gap-6" aria-hidden="true">
              {produtos.map((produto: any) => (
                <ProdutoCard key={`loop-${produto.id}`} produto={produto} instance="loop" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
