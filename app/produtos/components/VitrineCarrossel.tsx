"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface Produto {
  id: number;
  nome: string;
  marca: string;
  preco: number | null;
  imagem: string | null;
  promocaoAtiva?: boolean;
  descontoPercentual?: number | null;
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

// IDs dos 5 produtos em destaque
const DESTAQUE_IDS = [26, 24, 23, 22, 18];

export default function VitrineCarrossel({ produtos }: { produtos: Produto[] }) {
  const [atual, setAtual] = useState(0);

  const destaques = DESTAQUE_IDS
    .map(id => produtos.find(p => p.id === id))
    .filter(Boolean) as Produto[];

  useEffect(() => {
    if (destaques.length <= 1) return;

    const interval = setInterval(() => {
      setAtual(prev => (prev + 1) % destaques.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [destaques.length]);

  if (destaques.length === 0) return null;

  const produto = destaques[atual];
  const promo = precoPromocional(produto);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-[#111] min-h-[300px] sm:min-h-[400px]">
      {/* Imagem com fade */}
      {destaques.map((p, i) => (
        <div
          key={p.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === atual ? "opacity-100" : "opacity-0"}`}
        >
          {p.imagem ? (
            <Image
              src={p.imagem}
              alt={p.nome}
              fill
              sizes="100vw"
              className="object-cover opacity-60"
              priority={i === 0}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800" />
          )}
        </div>
      ))}

      {/* Overlay gradiente */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-col justify-end h-full p-6 sm:p-10">
        <div className="max-w-lg">
          <p className="text-gold text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-2">
            {produto.marca}
          </p>
          <h3 className="text-2xl sm:text-4xl font-serif text-white font-black leading-tight mb-3">
            {produto.nome}
          </h3>
          <div className="flex items-baseline gap-3 mb-4">
            {promo ? (
              <>
                <span className="text-2xl sm:text-3xl font-black text-red-500">{moeda(promo)}</span>
                <span className="text-sm line-through text-zinc-400">{moeda(produto.preco)}</span>
                <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded-full">
                  -{produto.descontoPercentual}%
                </span>
              </>
            ) : (
              <span className="text-2xl sm:text-3xl font-black text-white">{moeda(produto.preco)}</span>
            )}
          </div>
          <a
            href={`#produto-${produto.id}`}
            className="inline-block rounded-full bg-gold hover:bg-white text-black font-bold text-[10px] sm:text-xs py-3 px-6 uppercase tracking-widest transition-all"
          >
            Ver produto
          </a>
        </div>
      </div>

      {/* Indicadores */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex gap-2 z-10">
        {destaques.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setAtual(i)}
            className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all cursor-pointer ${
              i === atual ? "bg-gold scale-125" : "bg-zinc-500 hover:bg-zinc-300"
            }`}
            aria-label={`Ir para destaque ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
