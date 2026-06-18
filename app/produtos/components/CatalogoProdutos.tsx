"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { registrarIntencaoCompra } from "../actions";

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
};

const categoriasBase = ["Perfume", "Perfume Feminino", "Perfume Masculino", "Perfume Árabe", "Oud", "Cosmético", "Skincare", "Outros"];

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
  lojistaId, 
  hideSearch = false 
}: { 
  produtos: Produto[]; 
  lojistaId?: number | null; 
  hideSearch?: boolean; 
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todos");
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const produtosOrdenados = useMemo(
    () => [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [produtos]
  );

  const categorias = useMemo(
    () => ["todos", ...Array.from(new Set([...categoriasBase, ...produtosOrdenados.map((produto) => produto.categoria).filter(Boolean)])).sort()],
    [produtosOrdenados]
  );

  const produtosFiltrados = useMemo(() => {
    if (hideSearch) return produtosOrdenados;

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
  }, [busca, categoria, produtosOrdenados, hideSearch]);

  function openDetails(produto: Produto) {
    setSelectedProduto(produto);
    setPaymentMessage("");
  }

  function handlePayment(produto: Produto) {
    setSelectedProduto(produto);
    setPaymentMessage("");

    startTransition(async () => {
      const result = await registrarIntencaoCompra(produto.id, lojistaId || null);
      setPaymentMessage(result.message);

      if (result.success) {
        if (typeof window !== "undefined" && (window as any).triggerPwaInstall) {
          (window as any).triggerPwaInstall();
        }
      }
    });
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

      {!hideSearch && (
        <section className="mb-10 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 bg-neutral-950 p-4 border border-zinc-900 rounded-3xl shadow-2xl">
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
      )}

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
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-black/90 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => openDetails(produto)}
                    className="w-full py-1.5 sm:py-2 bg-neutral-900 text-gold text-[8px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-gold hover:text-black transition-colors rounded cursor-pointer"
                  >
                    Ver Detalhes
                  </button>
                </div>
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
                <div className="mt-2 sm:mt-3 grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => openDetails(produto)}
                    className="block w-full rounded-full border border-zinc-800 py-2 sm:py-3 text-center text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors hover:bg-neutral-900 hover:text-white cursor-pointer"
                  >
                    Ver detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePayment(produto)}
                    disabled={produto.estoque <= 0 || isPending}
                    className={`block w-full rounded-full py-2 sm:py-3 text-center text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
                    produto.estoque > 0
                      ? "bg-gold text-black hover:bg-white hover:text-black font-bold"
                      : "bg-neutral-900 text-zinc-500 pointer-events-none"
                  }`}
                  >
                    {produto.estoque > 0 ? (isPending ? "Registrando..." : "Pagamento") : "Reposição"}
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

      {selectedProduto && (
        <div className="fixed inset-0 z-50 bg-black/80 px-3 py-4 sm:px-6 sm:py-8 backdrop-blur-sm overflow-y-auto">
          <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
            <div className="relative w-full overflow-hidden rounded-none sm:rounded-2xl bg-white border border-gray-200 text-gray-900 shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedProduto(null)}
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-2xl leading-none text-gray-700 border border-gray-200 shadow-md hover:bg-gray-200 cursor-pointer"
                aria-label="Fechar detalhes"
              >
                ×
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="min-h-80 bg-gray-50 border-r border-gray-100 flex items-center justify-center">
                  {selectedProduto.imagem ? (
                    <img src={selectedProduto.imagem} alt={selectedProduto.nome} className="h-full max-h-[70vh] w-full object-cover" />
                  ) : (
                    <div className="flex min-h-80 h-full items-center justify-center text-4xl font-serif italic text-zinc-400">
                      M&A
                    </div>
                  )}
                </div>

                <div className="flex flex-col p-6 sm:p-8 lg:p-10">
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gold border border-gold/20">
                      {selectedProduto.categoria}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      selectedProduto.estoque > 0 ? "bg-green-50 text-green-750 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {selectedProduto.estoque > 0 ? "Disponível" : "Esgotado"}
                    </span>
                    {selectedProduto.promocaoAtiva && selectedProduto.descontoPercentual ? (
                      <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                        -{selectedProduto.descontoPercentual}% OFF
                      </span>
                    ) : null}
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">{selectedProduto.marca}</p>
                  <h3 className="mt-2 text-3xl sm:text-4xl font-serif leading-tight text-gray-900">{selectedProduto.nome}</h3>
                  <p className="mt-2 text-sm font-light italic text-gray-500">Código {selectedProduto.codigo ?? selectedProduto.id} / {selectedProduto.volume}</p>

                  <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/50 p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Descrição</p>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                      {selectedProduto.descricao || "Descrição em atualização. Consulte nossa equipe para confirmar notas, fixação e disponibilidade."}
                    </p>
                  </div>

                  <div className="mt-6">
                    {precoPromocional(selectedProduto) ? (
                      <div className="rounded-3xl bg-red-50 border border-red-100 p-5 text-red-700 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-widest text-red-600">Oferta Especial</span>
                          <span className="text-sm line-through text-gray-400">{moeda(selectedProduto.preco)}</span>
                        </div>
                        <div className="mt-2 text-3xl font-black text-red-750">{moeda(precoPromocional(selectedProduto))}</div>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-gold/30 bg-gold/10 p-5">
                        <p className="text-xs font-black uppercase tracking-widest text-gold">Preço</p>
                        <div className="mt-2 text-3xl font-black text-gold">{moeda(selectedProduto.preco)}</div>
                      </div>
                    )}
                  </div>

                  {paymentMessage && (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-850">
                      {paymentMessage}
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handlePayment(selectedProduto)}
                      disabled={selectedProduto.estoque <= 0 || isPending}
                      className={`rounded-full px-5 py-4 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer ${
                        selectedProduto.estoque > 0
                          ? "bg-gold text-black hover:bg-white hover:text-black font-bold"
                          : "bg-gray-100 text-gray-400 pointer-events-none"
                      }`}
                    >
                      {selectedProduto.estoque > 0 ? (isPending ? "Registrando..." : "Pagamento") : "Reposição"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProduto(null)}
                      className="rounded-full border border-gray-200 px-5 py-4 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                    >
                      Voltar ao catálogo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
