"use client";

import { useRef } from "react";

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

  const scrollLeft = () => {
    if (carrosselRef.current) {
      carrosselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carrosselRef.current) {
      carrosselRef.current.scrollBy({ left: 300, behavior: "smooth" });
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
        {produtos.map((produto: any) => {
          const promoPrice = precoPromocional(produto);
          return (
            <article
              key={produto.id}
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
