"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import FiltrosProdutos from "../../components/FiltrosProdutos";

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
  const [filtros, setFiltros] = useState<any>({
    origem: "todos",
    genero: "todos",
    concentracao: "todos",
    categoriaPrincipal: "todos",
    tags: [],
    familiaOlfativa: [],
    ocasiaoUso: []
  });
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
      // 1. Filtragem da Categoria do Menu/Navbar (Legado)
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

      // 3. Filtragem de Categoria Principal Avançada
      if (filtros.categoriaPrincipal !== "todos") {
        const cat = produto.categoria_principal || produto.categoria || "";
        if (cat.toLowerCase() !== filtros.categoriaPrincipal.toLowerCase()) return false;
      }

      // 4. Origem
      if (filtros.origem !== "todos") {
        if (produto.origem !== filtros.origem) return false;
      }

      // 5. Gênero
      if (filtros.genero !== "todos") {
        if (produto.genero !== filtros.genero) return false;
      }

      // 6. Concentração
      if (filtros.concentracao !== "todos") {
        if (produto.concentracao !== filtros.concentracao) return false;
      }

      // 7. Tags (MultiSelect)
      if (filtros.tags && filtros.tags.length > 0) {
        const pTags = getArrayValue(produto.tags);
        const match = filtros.tags.every((t: string) => pTags.includes(t));
        if (!match) return false;
      }

      // 8. Família Olfativa (MultiSelect)
      if (filtros.familiaOlfativa && filtros.familiaOlfativa.length > 0) {
        const pFamilias = getArrayValue(produto.familia_olfativa);
        const match = filtros.familiaOlfativa.every((f: string) => pFamilias.includes(f));
        if (!match) return false;
      }

      // 9. Ocasião de Uso (MultiSelect)
      if (filtros.ocasiaoUso && filtros.ocasiaoUso.length > 0) {
        const pOcasioes = getArrayValue(produto.ocasiao_uso);
        const match = filtros.ocasiaoUso.every((o: string) => pOcasioes.includes(o));
        if (!match) return false;
      }

      return true;
    });
  }, [busca, categoria, filtros, produtosOrdenados]);

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
          <h2 className="text-4xl font-serif text-white">Escolha sua fragrância</h2>
        </div>
        <Link href="/lojista" className="btn-luxury-outline text-center">Área Lojista</Link>
      </section>

      <div className="mb-8">
        <FiltrosProdutos theme="dark" onChange={setFiltros} />
      </div>

      <p className="mb-8 text-xs font-bold uppercase tracking-widest text-zinc-500 font-sans">
        {produtosFiltrados.length} {produtosFiltrados.length === 1 ? "produto encontrado" : "produtos encontrados"}
      </p>

      <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 sm:gap-x-8 sm:gap-y-16">
        {produtosFiltrados.map((produto) => {
          const valorAtual = precoPromocional(produto);

          return (
            <div id={`produto-${produto.id}`} key={produto.id} className="group scroll-mt-32 flex flex-col h-full border border-zinc-900 bg-neutral-950 p-2.5 sm:p-4 shadow-2xl hover:shadow-gold/5 hover:border-gold/30 rounded-xl sm:rounded-2xl transition-all duration-500 text-white">
              <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900/50 mb-3 sm:mb-6 border border-zinc-900 rounded-lg sm:rounded-xl transition-all duration-500">
                {produto.promocaoAtiva && produto.descontoPercentual ? (
                  <div className="absolute right-2 top-2 sm:right-3 sm:top-3 z-10 rounded-full bg-red-600 px-2 py-1 sm:px-3 sm:py-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                    -{produto.descontoPercentual}%
                  </div>
                ) : null}
                {produto.imagem ? (
                  <img
                    src={produto.imagem}
                    alt={produto.nome}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900/30 text-zinc-500 italic font-serif text-xs">
                    Maison Mourato
                  </div>
                )}
              </div>

              <div className="flex flex-col flex-grow space-y-2">
                <div className="flex justify-between items-start gap-1">
                  <span className="text-[8px] sm:text-[10px] font-bold text-luxury-gold uppercase tracking-widest truncate max-w-[50%]">{produto.marca}</span>
                  <span className="text-[8px] sm:text-[10px] text-zinc-500 font-medium uppercase tracking-tighter truncate max-w-[50%]">{produto.categoria}</span>
                </div>
                <h3 className="text-xs sm:text-lg font-serif text-gray-100 leading-tight group-hover:text-gold transition-colors line-clamp-2">
                  <span className="mr-1 rounded bg-neutral-900 px-1 py-0.5 text-[8px] sm:text-[10px] font-black text-zinc-400 font-sans">Cód. {produto.codigo ?? produto.id}</span>
                  {produto.nome}
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-500 font-light italic">{produto.volume}</p>
                {produto.descricao && <p className="hidden sm:block text-xs text-zinc-400 font-light leading-relaxed line-clamp-3">{produto.descricao}</p>}

                <div className="pt-2 sm:pt-4 mt-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-t border-zinc-900">
                  {valorAtual ? (
                    <div className="rounded-xl bg-red-950/40 border border-red-900/50 p-1.5 sm:p-2 text-white shadow-md w-full sm:w-auto">
                      <div className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-red-400">Oferta</div>
                      <div className="text-[8px] sm:text-[10px] line-through text-zinc-500">{moeda(produto.preco)}</div>
                      <div className="text-xs sm:text-lg font-black leading-none text-red-500">{moeda(valorAtual)}</div>
                    </div>
                  ) : (
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-gold w-fit">
                      {moeda(produto.preco)}
                    </span>
                  )}
                  <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${produto.estoque > 0 ? "text-green-500" : "text-red-400"}`}>
                    {produto.estoque > 0 ? "Disponível" : "Esgotado"}
                  </span>
                </div>
                <div className="mt-2 sm:mt-3">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(produto)}
                    disabled={produto.estoque <= 0}
                    className={`block w-full rounded-full py-2.5 sm:py-3 text-center text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
                    produto.estoque > 0
                      ? "bg-gold text-black hover:bg-white hover:text-black font-bold"
                      : "bg-neutral-900 text-zinc-500 pointer-events-none"
                  }`}
                  >
                    {produto.estoque > 0 ? "Adicionar ao carrinho" : "Reposição"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {produtosFiltrados.length === 0 && (
        <div className="py-32 text-center">
          <p className="text-gray-400 font-serif italic text-xl">Nenhum produto encontrado com esse filtro.</p>
        </div>
      )}
    </>
  );
}
