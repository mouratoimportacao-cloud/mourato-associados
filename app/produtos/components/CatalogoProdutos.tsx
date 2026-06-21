"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import FiltrosProdutos from "../../components/FiltrosProdutos";
import CardProduto from "../../components/CardProduto";

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
  categoria_principal?: string | null;
  tags?: string[] | null;
  concentracao?: string | null;
  origem?: string | null;
  tipo_perfume?: string | null;
  genero?: string | null;
  familia_olfativa?: string[] | null;
  notas_topo?: string | null;
  notas_coracao?: string | null;
  notas_fundo?: string | null;
  fixacao_estimada?: string | null;
  projecao?: string | null;
  ocasiao_uso?: string[] | null;
  similaridade_inspiracao?: string | null;
  descricao_olfativa?: string | null;
};

function moeda(valor: number | null | undefined) {
  return valor ? `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sob consulta";
}

function precoPromocional(produto: Produto) {
  const preco = Number(produto.preco || 0);
  const desconto = Number(produto.descontoPercentual || 0);

  if (!produto.promocaoAtiva || !preco || !desconto) {
    return null;
  }

  return preco * (1 - desconto / 100);
}

export default function CatalogoProdutos({ 
  produtos, 
  lojistaId 
}: { 
  produtos: Produto[]; 
  lojistaId?: number | null; 
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todos");
  const [quantidade, setQuantidade] = useState(8);
  const searchParams = useSearchParams();

  // Sincroniza busca da URL
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

  const getArrayValue = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    if (typeof val === "string") {
      return val.split(",").map(v => v.trim()).filter(Boolean);
    }
    return [];
  };

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return produtosOrdenados.filter((produto) => {
      // 1. Filtragem da Categoria do Menu/Navbar
      if (categoria !== "todos") {
        if (categoria === "Promoções") {
          if (!produto.promocaoAtiva) return false;
        } else if (categoria === "Kits") {
          const isKit =
            produto.nome.toLowerCase().includes("kit") ||
            produto.volume.toLowerCase().includes("kit") ||
            produto.categoria.toLowerCase().includes("kit") ||
            (produto.categoria_principal || "").toLowerCase().includes("kit");
          if (!isKit) return false;
        } else if (categoria === "Perfume Árabe") {
          const isArab = 
            produto.categoria === "Perfume Árabe" || 
            getArrayValue(produto.tags).includes("Perfume Árabe");
          if (!isArab) return false;
        } else {
          const matchesLegacyCat = 
            produto.categoria === categoria || 
            produto.categoria_principal === categoria;
          if (!matchesLegacyCat) return false;
        }
      }

      // 2. Filtragem de Busca
      const passaBusca =
        !termo ||
        produto.nome.toLowerCase().includes(termo) ||
        produto.marca.toLowerCase().includes(termo) ||
        produto.categoria.toLowerCase().includes(termo) ||
        (produto.categoria_principal || "").toLowerCase().includes(termo) ||
        (produto.descricao || "").toLowerCase().includes(termo) ||
        (produto.similaridade_inspiracao || "").toLowerCase().includes(termo);
      if (!passaBusca) return false;

      return true;
    });
  }, [busca, categoria, produtosOrdenados]);

  const produtosVisiveis = useMemo(() => {
    return produtosFiltrados.slice(0, quantidade);
  }, [produtosFiltrados, quantidade]);

  function handleAddToCart(produto: Produto) {
    try {
      const cartRaw = localStorage.getItem("ma-cart") || "[]";
      let cart: any[] = [];
      try {
        cart = JSON.parse(cartRaw);
      } catch (e) {
        cart = [];
      }

      const valorAtual = precoPromocional(produto) || Number(produto.preco || 0);
      const existingIndex = cart.findIndex((item) => item.id === produto.id);

      if (existingIndex > -1) {
        const newQty = cart[existingIndex].quantidade + 1;
        if (newQty > produto.estoque) {
          alert(`Desculpe, estoque insuficiente. Limite de ${produto.estoque} unidades.`);
          return;
        }
        cart[existingIndex].quantidade = newQty;
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
          quantidade: 1,
          estoqueMaximo: produto.estoque,
        });
      }

      localStorage.setItem("ma-cart", JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent("cart-updated"));
      window.dispatchEvent(new CustomEvent("open-cart"));
    } catch (error) {
      console.error("Erro ao adicionar ao carrinho:", error);
    }
  }

  return (
    <>
      <section className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.3em] mb-3 block font-sans">Catálogo Completo</span>
          <h2 className="text-4xl font-serif text-[#1A1A1A]">Escolha sua fragrância</h2>
        </div>
        <Link href="/lojista" className="btn-luxury-outline text-center">Área Lojista</Link>
      </section>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-sans">
          {produtosFiltrados.length} {produtosFiltrados.length === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
        <FiltrosProdutos total={produtosFiltrados.length} quantidade={quantidade} onChange={setQuantidade} />
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 sm:gap-x-8 sm:gap-y-16">
        {produtosVisiveis.map((produto) => (
          <CardProduto
            key={produto.id}
            produto={produto}
            variant="full"
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>

      {produtosFiltrados.length === 0 && (
        <div className="py-32 text-center">
          <p className="text-gray-400 font-serif italic text-xl">Nenhum produto encontrado com esse filtro.</p>
        </div>
      )}
    </>
  );
}
