"use client";

import Image from "next/image";
import { useState } from "react";

type Produto = {
  id: number;
  codigo?: number | null;
  nome: string;
  marca: string;
  categoria: string;
  volume: string;
  preco: number | null;
  estoque: number;
  descricao: string | null;
  imagem: string | null;
  promocaoAtiva?: boolean;
  descontoPercentual?: number | null;
  concentracao?: string | null;
  notas_topo?: string | null;
  notas_coracao?: string | null;
  notas_fundo?: string | null;
  similaridade_inspiracao?: string | null;
  descricao_olfativa?: string | null;
};

type CardVariant = "full" | "compact";

interface CardProdutoProps {
  produto: Produto;
  variant?: CardVariant;
  onAddToCart?: (produto: Produto) => void;
}

function moeda(valor: number | null | undefined) {
  return valor ? `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sob consulta";
}

function precoPromocional(produto: Produto) {
  const preco = Number(produto.preco || 0);
  const desconto = Number(produto.descontoPercentual || 0);
  if (!produto.promocaoAtiva || !preco || !desconto) return null;
  return preco * (1 - desconto / 100);
}

export default function CardProduto({ produto, variant = "full", onAddToCart }: CardProdutoProps) {
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const valorAtual = precoPromocional(produto);
  const isCompact = variant === "compact";

  const temDetalhes = produto.descricao || produto.concentracao || produto.notas_topo || produto.notas_coracao || produto.notas_fundo || produto.similaridade_inspiracao || produto.descricao_olfativa;

  return (
    <div
      id={!isCompact ? `produto-${produto.id}` : undefined}
      className={`${isCompact ? "w-64 shrink-0 overflow-hidden" : "group/card flex flex-col h-full overflow-visible"} border border-zinc-800 bg-[#111111] shadow-lg hover:shadow-xl hover:border-gold/30 rounded-2xl transition-all duration-300 text-white`}
    >
      {/* Imagem */}
      <div className={`relative ${isCompact ? "aspect-[4/5]" : "aspect-[3/4]"} overflow-hidden bg-neutral-900/50 ${isCompact ? "" : "m-2 rounded-xl border border-zinc-800/50"}`}>
        {produto.promocaoAtiva && produto.descontoPercentual ? (
          <div className="absolute right-2 top-2 z-10 rounded-full bg-red-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
            -{produto.descontoPercentual}%
          </div>
        ) : null}
        {produto.imagem ? (
          <Image
            src={produto.imagem}
            alt={produto.nome}
            fill
            sizes={isCompact ? "256px" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
            className="object-cover transition-transform duration-500 group-hover/card:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 italic font-serif text-sm">
            M&A
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-col flex-grow p-4 space-y-3">
        {/* Nome + Marca */}
        <div>
          <p className="text-[9px] font-bold text-gold uppercase tracking-widest mb-1">{produto.marca}</p>
          <h3 className="text-sm sm:text-base font-serif text-gray-100 leading-tight line-clamp-2">
            {produto.nome}
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1">{produto.volume}</p>
        </div>

        {/* Preço */}
        <div className="mt-auto pt-3 border-t border-zinc-800">
          {valorAtual ? (
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Oferta</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-red-500">{moeda(valorAtual)}</span>
                <span className="text-[10px] line-through text-zinc-500">{moeda(produto.preco)}</span>
              </div>
            </div>
          ) : (
            <span className="text-lg font-bold text-white">{moeda(produto.preco)}</span>
          )}
          {!isCompact && (
            <span className={`block mt-1 text-[9px] font-bold uppercase tracking-widest ${produto.estoque > 0 ? "text-green-500" : "text-red-400"}`}>
              {produto.estoque > 0 ? "Pronta entrega" : "Esgotado"}
            </span>
          )}
        </div>

        {/* Botão Detalhes (hover para abrir dropdown) */}
        {!isCompact && temDetalhes && (
          <div
            className="relative"
            onMouseEnter={() => setDetalhesAberto(true)}
            onMouseLeave={() => setDetalhesAberto(false)}
            onClick={() => setDetalhesAberto(!detalhesAberto)}
            ref={(el) => {
              if (el && detalhesAberto) {
                const rect = el.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const dropEl = el.querySelector('[data-dropdown]') as HTMLElement;
                if (dropEl) {
                  if (spaceBelow < 200) {
                    dropEl.style.top = 'auto';
                    dropEl.style.bottom = '100%';
                    dropEl.style.marginBottom = '8px';
                    dropEl.style.marginTop = '0';
                  } else {
                    dropEl.style.top = '100%';
                    dropEl.style.bottom = 'auto';
                    dropEl.style.marginTop = '8px';
                    dropEl.style.marginBottom = '0';
                  }
                }
              }
            }}
          >
            <button
              type="button"
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-gold transition-colors cursor-pointer"
            >
              <span>Detalhes</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-3 w-3 transition-transform duration-200 ${detalhesAberto ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown desktop / Bottom sheet mobile */}
            {detalhesAberto && (
              <>
                {/* Desktop dropdown */}
                <div data-dropdown className="hidden sm:block absolute left-0 right-0 z-20 bg-[#0D0D0D] border border-gold/20 rounded-xl p-4 shadow-2xl space-y-2.5 text-[11px]">
                  {produto.descricao && (
                    <p className="leading-relaxed text-white">{produto.descricao}</p>
                  )}
                  {produto.descricao_olfativa && (
                    <p className="italic text-gold/80">&ldquo;{produto.descricao_olfativa}&rdquo;</p>
                  )}
                  {produto.concentracao && (
                    <div><span className="text-gold font-bold">Concentração:</span> <span className="text-white">{produto.concentracao}</span></div>
                  )}
                  {(produto.notas_topo || produto.notas_coracao || produto.notas_fundo) && (
                    <div className="space-y-1">
                      <span className="text-gold font-bold block">Notas Olfativas:</span>
                      <div className="pl-2 border-l-2 border-gold/50 space-y-1">
                        {produto.notas_topo && <div><span className="text-gold/70 font-medium">Topo:</span> <span className="text-white">{produto.notas_topo}</span></div>}
                        {produto.notas_coracao && <div><span className="text-gold/70 font-medium">Coração:</span> <span className="text-white">{produto.notas_coracao}</span></div>}
                        {produto.notas_fundo && <div><span className="text-gold/70 font-medium">Fundo:</span> <span className="text-white">{produto.notas_fundo}</span></div>}
                      </div>
                    </div>
                  )}
                  {produto.similaridade_inspiracao && (
                    <div><span className="text-gold font-bold">Inspirado em:</span> <span className="text-white">{produto.similaridade_inspiracao}</span></div>
                  )}
                </div>

                {/* Mobile bottom sheet */}
                <div className="sm:hidden fixed inset-0 z-50" onClick={() => setDetalhesAberto(false)}>
                  <div className="absolute inset-0 bg-black/60" />
                  <div className="absolute bottom-0 left-0 right-0 bg-[#0D0D0D] border-t border-gold/20 rounded-t-2xl p-5 space-y-3 text-[12px] max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-3" />
                    <h4 className="text-sm font-serif text-white font-bold">{produto.nome}</h4>
                    {produto.descricao && (
                      <p className="leading-relaxed text-zinc-300">{produto.descricao}</p>
                    )}
                    {produto.descricao_olfativa && (
                      <p className="italic text-gold/80">&ldquo;{produto.descricao_olfativa}&rdquo;</p>
                    )}
                    {produto.concentracao && (
                      <div><span className="text-gold font-bold">Concentração:</span> <span className="text-white">{produto.concentracao}</span></div>
                    )}
                    {(produto.notas_topo || produto.notas_coracao || produto.notas_fundo) && (
                      <div className="space-y-1">
                        <span className="text-gold font-bold block">Notas Olfativas:</span>
                        <div className="pl-3 border-l-2 border-gold/50 space-y-1">
                          {produto.notas_topo && <div><span className="text-gold/70 font-medium">Topo:</span> <span className="text-white">{produto.notas_topo}</span></div>}
                          {produto.notas_coracao && <div><span className="text-gold/70 font-medium">Coração:</span> <span className="text-white">{produto.notas_coracao}</span></div>}
                          {produto.notas_fundo && <div><span className="text-gold/70 font-medium">Fundo:</span> <span className="text-white">{produto.notas_fundo}</span></div>}
                        </div>
                      </div>
                    )}
                    {produto.similaridade_inspiracao && (
                      <div><span className="text-gold font-bold">Inspirado em:</span> <span className="text-white">{produto.similaridade_inspiracao}</span></div>
                    )}
                    <button
                      type="button"
                      onClick={() => setDetalhesAberto(false)}
                      className="block w-full rounded-full py-3 mt-3 text-center text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Botão comprar */}
        <div className="pt-2">
          {isCompact ? (
            <a
              href={`#produto-${produto.id}`}
              className="block w-full rounded-full bg-gold hover:bg-white text-black font-bold text-center text-[9px] py-2.5 uppercase tracking-widest transition-all"
            >
              Comprar
            </a>
          ) : produto.estoque > 0 ? (
            <button
              type="button"
              onClick={() => onAddToCart?.(produto)}
              className="block w-full rounded-full py-3 text-center text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer bg-gold text-black hover:bg-white"
            >
              Adicionar ao carrinho
            </button>
          ) : (
            <a
              href={`https://wa.me/5511978990034?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${produto.nome} (${produto.volume}) - ${moeda(produto.preco)}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-full py-3 text-center text-[10px] sm:text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer bg-green-600 text-white hover:bg-green-500"
            >
              <span className="hidden sm:inline">Encomendar via WhatsApp</span>
              <span className="sm:hidden">Encomendar</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
