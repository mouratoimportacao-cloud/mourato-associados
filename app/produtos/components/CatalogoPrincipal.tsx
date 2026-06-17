"use client";

import { useState, useMemo } from "react";
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

const categoriasBase = ["Perfume", "Perfume Feminino", "Perfume Masculino", "Perfume Árabe", "Oud", "Cosmético", "Skincare", "Outros"];

export default function CatalogoPrincipal({ produtos, lojistaId }: { produtos: Produto[]; lojistaId?: number | null }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todos");

  const produtosOrdenados = useMemo(
    () => [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [produtos]
  );

  const categorias = useMemo(
    () => ["todos", ...Array.from(new Set([...categoriasBase, ...produtosOrdenados.map((produto) => produto.categoria).filter(Boolean)])).sort()],
    [produtosOrdenados]
  );

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return produtosOrdenados.filter((produto) => {
      const passaCategoria = categoria === "todos" || produto.categoria === categoria;
      const passaBusca =
        !termo ||
        produto.nome.toLowerCase().includes(termo) ||
        produto.marca.toLowerCase().includes(termo) ||
        produto.categoria.toLowerCase().includes(termo);

      return passaCategoria && passaBusca;
    });
  }, [busca, categoria, produtosOrdenados]);

  const produtosVitrine = useMemo(
    () => produtos.filter((produto) => produto.vitrine || produto.promocaoAtiva),
    [produtos]
  );

  return (
    <div className="space-y-12">
      {/* 1. Busca e Filtros - Posicionados acima da Vitrine */}
      <section className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 bg-neutral-950 p-4 border border-zinc-900 rounded-3xl shadow-2xl">
        <input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por perfume, marca ou tipo..."
          className="w-full rounded-full border border-zinc-800 bg-black px-6 py-3 text-sm text-gray-200 placeholder-gray-500 shadow-inner outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
        <select
          value={categoria}
          onChange={(event) => setCategoria(event.target.value)}
          className="w-full rounded-full border border-zinc-800 bg-black px-6 py-3 text-sm font-semibold text-gray-400 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 cursor-pointer"
        >
          {categorias.map((item) => (
            <option key={item} value={item} className="bg-black text-gray-200">
              {item === "todos" ? "Todas as categorias" : item}
            </option>
          ))}
        </select>
      </section>

      {/* 2. Vitrine de Destaques (Carrossel Interativo com Setas) Envelopada em Arco Dourado */}
      {produtosVitrine.length > 0 && (
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-gold/30 bg-neutral-950 p-6 md:p-8 lg:p-10 shadow-[0_0_35px_rgba(212,175,55,0.07)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent"></div>
          
          <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <div>
              <span className="text-gold text-[10px] font-bold uppercase tracking-[0.35em] block mb-2 font-sans">
                Destaques & Promoções
              </span>
              <h2 className="text-3xl font-serif text-white">Vitrine M&A Fragrâncias</h2>
            </div>
            <p className="text-zinc-500 text-xs font-light max-w-md">
              Deslize ou use as setas laterais para visualizar nossos perfumes mais procurados e ofertas ativas.
            </p>
          </div>
          <VitrineCarrossel produtos={produtosVitrine} />
        </section>
      )}

      {/* 3. Grade Principal de Produtos */}
      <section>
        <CatalogoProdutos 
          produtos={produtosFiltrados} 
          lojistaId={lojistaId} 
          hideSearch={true} // Oculta a busca padrão interna
        />
      </section>
    </div>
  );
}
