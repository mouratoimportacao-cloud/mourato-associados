"use client";

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
  const mostrarVitrine = produtos.length > 0;

  return (
    <div className="space-y-12">
      {/* Destaques */}
      {mostrarVitrine && (
        <section className="mb-8 bg-[#1A1A1A] rounded-2xl border border-gold/15 shadow-lg overflow-hidden">
          <VitrineCarrossel produtos={produtos} />
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
