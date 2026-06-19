"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todos");
  const searchParams = useSearchParams();

  // Carrega busca da URL se houver
  useEffect(() => {
    const query = searchParams.get("busca") || "";
    setBusca(query);
  }, [searchParams]);

  // Escuta os eventos globais da Navbar (Busca e Categoria)
  useEffect(() => {
    const handleSearch = (e: Event) => {
      setBusca((e as CustomEvent<string>).detail || "");
    };
    const handleCategory = (e: Event) => {
      setCategoria((e as CustomEvent<string>).detail || "todos");
    };

    window.addEventListener("search-changed", handleSearch);
    window.addEventListener("category-changed", handleCategory);

    return () => {
      window.removeEventListener("search-changed", handleSearch);
      window.removeEventListener("category-changed", handleCategory);
    };
  }, []);

  const produtosOrdenados = useMemo(
    () => [...produtos].sort((a, b) => a.id - b.id),
    [produtos]
  );

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return produtosOrdenados.filter((produto) => {
      // 1. Filtragem de Categoria
      let passaCategoria = false;
      if (categoria === "todos") {
        passaCategoria = true;
      } else if (categoria === "Promoções") {
        passaCategoria = Boolean(produto.promocaoAtiva);
      } else if (categoria === "Kits") {
        passaCategoria =
          produto.nome.toLowerCase().includes("kit") ||
          produto.volume.toLowerCase().includes("kit") ||
          produto.categoria.toLowerCase().includes("kit");
      } else {
        passaCategoria = produto.categoria === categoria;
      }

      // 2. Filtragem de Busca
      const passaBusca =
        !termo ||
        produto.nome.toLowerCase().includes(termo) ||
        produto.marca.toLowerCase().includes(termo) ||
        produto.categoria.toLowerCase().includes(termo);

      return passaCategoria && passaBusca;
    });
  }, [busca, categoria, produtosOrdenados]);

  const produtosVitrine = useMemo(
    () => produtos.filter((produto) => Boolean(produto.vitrine) && (produto.estoque || 0) > 0),
    [produtos]
  );

  return (
    <div className="space-y-12">
      {/* Vitrine de Destaques */}
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

      {/* Grade Principal de Produtos */}
      <section>
        <CatalogoProdutos 
          produtos={produtosFiltrados} 
          lojistaId={lojistaId} 
        />
      </section>
    </div>
  );
}
