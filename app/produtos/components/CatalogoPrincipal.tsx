"use client";

import { useMemo } from "react";
import VitrineCarrossel from "./VitrineCarrossel";
import CatalogoProdutos from "./CatalogoProdutos";

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
  const produtosVitrine = useMemo(
    () => produtos.filter((produto) => Boolean(produto.vitrine)),
    [produtos]
  );

  return (
    <div className="space-y-12">
      {/* Destaques */}
      {produtosVitrine.length > 0 && (
        <section className="mb-8 bg-[#1A1A1A] rounded-2xl p-5 sm:p-8 border border-gold/15 shadow-lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-6 w-1 bg-gold rounded-full" />
            <div>
              <span className="text-gold text-[9px] font-bold uppercase tracking-[0.35em] block font-sans">
                Destaques
              </span>
              <h2 className="text-xl sm:text-2xl font-serif text-white">Em Destaque</h2>
            </div>
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
