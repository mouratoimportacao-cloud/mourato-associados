"use client";

import { useState } from "react";
import Link from "next/link";
import OptimizedImage from "../../components/OptimizedImage";

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

function moeda(valor: number | null | undefined) {
  return valor ? `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sob consulta";
}

function precoPromocional(produto: Produto) {
  const preco = Number(produto.preco || 0);
  const desconto = Number(produto.descontoPercentual || 0);
  if (!produto.promocaoAtiva || !preco || !desconto) return null;
  return preco * (1 - desconto / 100);
}

export default function ProdutoDetalheClient({ produto }: { produto: Produto }) {
  const [quantidade, setQuantidade] = useState(1);
  const [addedToast, setAddedToast] = useState(false);
  const promoPrice = precoPromocional(produto);

  const handleAddToCart = (openCart: boolean) => {
    try {
      const cartRaw = localStorage.getItem("ma-cart") || "[]";
      let cart: Array<Record<string, unknown>> = [];

      try {
        const parsed = JSON.parse(cartRaw);
        cart = Array.isArray(parsed) ? parsed : [];
      } catch {
        cart = [];
      }

      const existingIndex = cart.findIndex((item) => item.id === produto.id);
      const valorAtual = promoPrice || Number(produto.preco || 0);

      if (existingIndex >= 0) {
        const quantidadeAtual = Number(cart[existingIndex].quantidade || 0);
        const novaQuantidade = quantidadeAtual + quantidade;
        if (novaQuantidade > produto.estoque) {
          alert(`Estoque insuficiente. Limite de ${produto.estoque} unidades.`);
          return;
        }
        cart[existingIndex] = { ...cart[existingIndex], quantidade: novaQuantidade };
      } else {
        cart.push({
          id: produto.id,
          codigo: produto.codigo,
          nome: produto.nome,
          marca: produto.marca,
          categoria: produto.categoria,
          volume: produto.volume,
          preco: valorAtual,
          precoOriginal: Number(produto.preco || 0),
          imagem: produto.imagem,
          quantidade,
          estoqueMaximo: produto.estoque,
        });
      }

      localStorage.setItem("ma-cart", JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent("cart-updated"));

      if (openCart) {
        window.dispatchEvent(new CustomEvent("open-cart"));
      } else {
        setAddedToast(true);
        window.setTimeout(() => setAddedToast(false), 3000);
      }
    } catch (error) {
      console.error("Erro ao adicionar ao carrinho:", error);
      alert("Não foi possível adicionar o produto. Tente novamente.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-gold/40 bg-zinc-900 px-5 py-4 text-white shadow-2xl">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">✓</span>
          <div>
            <p className="text-xs font-bold">Adicionado ao carrinho</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{quantidade}x {produto.nome}</p>
          </div>
        </div>
      )}

      <Link href="/produtos" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-gold">
        ← Voltar ao catálogo
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-zinc-900 bg-neutral-900/50">
          <OptimizedImage
            src={produto.imagem}
            alt={produto.nome}
            fill
            preload
            sizes="(max-width: 1024px) 100vw, 50vw"
            quality={80}
            className="object-cover"
            fallbackText="Maison Mourato"
          />
        </div>

        <div className="space-y-6">
          <div>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-luxury-gold sm:text-xs">{produto.marca}</span>
            <h1 className="text-3xl font-serif tracking-tight text-white sm:text-4xl">{produto.nome}</h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:text-sm">
              {produto.volume} • {produto.categoria}
            </p>
          </div>

          <div className="border-t border-zinc-900 pt-6">
            {promoPrice ? (
              <div className="inline-block rounded-2xl border border-red-900/40 bg-red-950/20 p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">Oferta -{produto.descontoPercentual}%</span>
                  <span className="text-xs text-zinc-500 line-through">{moeda(produto.preco)}</span>
                </div>
                <div className="mt-1 text-3xl font-black leading-none text-red-500">{moeda(promoPrice)}</div>
              </div>
            ) : (
              <div className="text-3xl font-bold text-gold">{moeda(produto.preco)}</div>
            )}
            {produto.estoque > 0 ? (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-green-500">Estoque disponível: {produto.estoque} unidades</p>
            ) : (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-500">Não disponível: 0 unidades</p>
            )}
          </div>

          {produto.descricao && (
            <section className="space-y-2 border-t border-zinc-900 pt-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Sobre o produto</h2>
              <p className="text-sm font-light leading-relaxed text-zinc-400">{produto.descricao}</p>
            </section>
          )}

          {(produto.concentracao || produto.notas_topo || produto.notas_coracao || produto.notas_fundo || produto.similaridade_inspiracao || produto.descricao_olfativa) && (
            <section className="space-y-4 border-t border-zinc-900 pt-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Informações olfativas</h2>
              <div className="space-y-3 text-xs text-zinc-400">
                {produto.descricao_olfativa && <p className="border-l border-gold/40 bg-neutral-900/20 py-1 pl-3 italic text-zinc-300">{produto.descricao_olfativa}</p>}
                {produto.concentracao && <p><span className="text-zinc-500">Concentração:</span> <span className="text-zinc-200">{produto.concentracao}</span></p>}
                {produto.notas_topo && <p><span className="text-zinc-500">Notas de topo:</span> <span className="text-zinc-300">{produto.notas_topo}</span></p>}
                {produto.notas_coracao && <p><span className="text-zinc-500">Notas de coração:</span> <span className="text-zinc-300">{produto.notas_coracao}</span></p>}
                {produto.notas_fundo && <p><span className="text-zinc-500">Notas de fundo:</span> <span className="text-zinc-300">{produto.notas_fundo}</span></p>}
                {produto.similaridade_inspiracao && <p><span className="text-zinc-500">Inspirado em:</span> <span className="text-zinc-200">{produto.similaridade_inspiracao}</span></p>}
              </div>
            </section>
          )}

          <div className="space-y-4 border-t border-zinc-900 pt-6">
            <div className="flex items-center gap-4">
              <div className={`flex items-center overflow-hidden rounded-full border bg-neutral-950 ${produto.estoque > 0 ? "border-zinc-800" : "border-zinc-900 opacity-50 pointer-events-none"}`}>
                <button type="button" aria-label="Diminuir quantidade" disabled={produto.estoque <= 0} onClick={() => setQuantidade((q) => Math.max(1, q - 1))} className="min-h-11 px-4 font-bold text-zinc-500 hover:text-white">−</button>
                <span className="w-10 text-center text-xs font-bold text-white">{produto.estoque > 0 ? quantidade : 0}</span>
                <button type="button" aria-label="Aumentar quantidade" disabled={produto.estoque <= 0} onClick={() => setQuantidade((q) => Math.min(produto.estoque, q + 1))} className="min-h-11 px-4 font-bold text-zinc-500 hover:text-white">+</button>
              </div>
              <span className="text-xs font-light text-zinc-500">Selecione a quantidade</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button 
                type="button" 
                disabled={produto.estoque <= 0} 
                onClick={() => handleAddToCart(true)} 
                className={`w-full rounded-full py-3.5 text-xs font-black uppercase tracking-widest transition-colors ${
                  produto.estoque > 0 
                    ? "bg-gold text-black hover:bg-white" 
                    : "bg-neutral-900 text-zinc-500 cursor-not-allowed pointer-events-none"
                }`}
              >
                {produto.estoque > 0 ? "Comprar" : "Indisponível"}
              </button>
              <button 
                type="button" 
                disabled={produto.estoque <= 0} 
                onClick={() => handleAddToCart(false)} 
                className={`w-full rounded-full py-3.5 text-xs font-black uppercase tracking-widest transition-colors ${
                  produto.estoque > 0 
                    ? "border border-zinc-800 bg-neutral-950 text-white hover:border-zinc-600" 
                    : "border border-zinc-900 bg-neutral-900/50 text-zinc-500 cursor-not-allowed pointer-events-none"
                }`}
              >
                {produto.estoque > 0 ? "Adicionar ao carrinho" : "Reposição"}
              </button>
            </div>

            <p className="rounded-xl border border-zinc-900 bg-neutral-900/30 px-4 py-3 text-[10px] leading-relaxed text-zinc-500">
              Pagamento seguro: o checkout está preparado para receber o Mercado Pago. Até a ativação das credenciais, o pedido será registrado para atendimento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
