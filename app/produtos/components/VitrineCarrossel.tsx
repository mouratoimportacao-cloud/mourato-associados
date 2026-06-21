"use client";

import { useRef, useEffect } from "react";
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

export default function VitrineCarrossel({ produtos }: { produtos: any[] }) {
  const carrosselRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: -1 | 1) => {
    carrosselRef.current?.scrollBy({ left: direction * 288, behavior: "smooth" });
  };

  useEffect(() => {
    if (!carrosselRef.current || produtos.length <= 1) return;

    const interval = window.setInterval(() => {
      const container = carrosselRef.current;
      if (!container) return;
      const firstCard = container.children[0] as HTMLElement | null;
      if (!firstCard) return;

      const cardWidth = firstCard.offsetWidth + 24; // gap-6 = 1.5rem
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [produtos.length]);

  return (
    <div className="group relative">
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

      <div ref={carrosselRef} className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-2 py-4 [scrollbar-width:none]">
        {produtos.map((produto: any) => {
          const promoPrice = precoPromocional(produto);
          return (
            <article key={produto.id} className="relative w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-900 bg-neutral-950 shadow-2xl transition-colors hover:border-gold/30">
              {produto.promocaoAtiva && produto.descontoPercentual ? (
                <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                  -{produto.descontoPercentual}%
                </div>
              ) : null}

              <Link href={`/produto/${slugify(produto.nome)}`} className="relative block aspect-[4/5] overflow-hidden border-b border-zinc-900 bg-neutral-900/50">
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
        })}
      </div>
    </div>
  );
}
