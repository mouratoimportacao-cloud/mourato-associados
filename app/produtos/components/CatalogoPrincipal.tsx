"use client";

import { useMemo } from "react";
import VitrineCarrossel from "./VitrineCarrossel";
import CatalogoProdutos from "./CatalogoProdutos";
import { useSearchParams } from "next/navigation";

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
  vitrine?: boolean;
};

export default function CatalogoPrincipal({ produtos, lojistaId }: { produtos: Produto[]; lojistaId?: number | null }) {
  const searchParams = useSearchParams();
  // Vitrine: produtos marcados com vitrine=true, em ordem aleatória
  const produtosVitrine = useMemo(
    () => produtos
      .filter((produto) => Boolean(produto.vitrine))
      .sort(() => Math.random() - 0.5),
    [produtos]
  );
  const busca = searchParams.get('busca')?.trim() ?? '';

  return (
    <div className="space-y-12">
      {!busca && produtosVitrine.length > 0 && (
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-gold/30 bg-neutral-950 p-6 md:p-8 lg:p-10 shadow-[0_0_35px_rgba(212,175,55,0.07)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent"></div>
          
          <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <div>
              <span className="text-gold text-[10px] font-bold uppercase tracking-[0.35em] block mb-2 font-sans">
                Destaques & Promoções
              </span>
            </div>
            <p className="hidden md:block text-zinc-500 text-xs font-light max-w-md">
              Deslize ou use as setas laterais para consultar nossos destaques e ofertas.
            </p>
          </div>
          <VitrineCarrossel produtos={produtosVitrine} />
        </section>
      )}

      {/* Grade Principal de Produtos */}
      <section>
        <CatalogoProdutos 
          produtos={produtos}
          lojistaId={lojistaId} 
        />
      </section>
    </div>
  );
}
