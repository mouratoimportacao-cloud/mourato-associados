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

export default function CatalogoProdutos({ produtos, lojistaId }: { produtos: Produto[]; lojistaId?: number | null }) {
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
        // Direcionar automaticamente para baixar/adicionar o atalho da página ao confirmar
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
          <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.3em] mb-3 block">Catálogo Completo</span>
          <h2 className="text-4xl font-serif text-luxury-black">Escolha sua fragrância</h2>
        </div>
        <Link href="/lojista" className="btn-luxury-outline text-center">Área Lojista</Link>
      </section>

      <section className="mb-10 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
        <input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por perfume, marca ou tipo"
          className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-luxury-gold focus:ring-2 focus:ring-luxury-gold/20"
        />
        <select
          value={categoria}
          onChange={(event) => setCategoria(event.target.value)}
          className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm outline-none transition focus:border-luxury-gold focus:ring-2 focus:ring-luxury-gold/20"
        >
          {categorias.map((item) => (
            <option key={item} value={item}>
              {item === "todos" ? "Todos os produtos" : item}
            </option>
          ))}
        </select>
      </section>

      <p className="mb-8 text-xs font-bold uppercase tracking-widest text-gray-400">
        {produtosFiltrados.length} {produtosFiltrados.length === 1 ? "produto encontrado" : "produtos encontrados"}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
        {produtosFiltrados.map((produto) => {
          const valorAtual = precoPromocional(produto);

          return (
            <div id={`produto-${produto.id}`} key={produto.id} className="group scroll-mt-32 flex flex-col h-full border border-gray-100 bg-white p-4 shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 mb-6 luxury-shadow transition-all duration-500">
                {produto.promocaoAtiva && produto.descontoPercentual ? (
                  <div className="absolute right-3 top-3 z-10 rounded-full bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
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
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 italic font-serif text-sm">
                    Maison Mourato
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-luxury-white/90 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => openDetails(produto)}
                    className="w-full py-2 bg-luxury-black text-luxury-white text-[10px] font-bold uppercase tracking-widest hover:bg-luxury-gold transition-colors"
                  >
                    Ver Detalhes
                  </button>
                </div>
              </div>

              <div className="flex flex-col flex-grow space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-luxury-gold uppercase tracking-widest">{produto.marca}</span>
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{produto.categoria}</span>
                </div>
                <h3 className="text-lg font-serif text-luxury-black leading-tight group-hover:text-luxury-gold transition-colors">
                  <span className="mr-2 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500">Cód. {produto.codigo ?? produto.id}</span>
                  {produto.nome}
                </h3>
                <p className="text-xs text-gray-500 font-light italic">{produto.volume}</p>
                {produto.descricao && <p className="text-xs text-gray-500 font-light leading-relaxed line-clamp-3">{produto.descricao}</p>}

                <div className="pt-4 mt-auto flex justify-between items-center gap-3 border-t border-gray-100">
                  {valorAtual ? (
                    <div className="rounded-2xl bg-red-600 px-4 py-3 text-white shadow-md ring-2 ring-red-100">
                      <div className="text-[10px] font-black uppercase tracking-widest">Oferta Especial</div>
                      <div className="text-[10px] line-through opacity-75">{moeda(produto.preco)}</div>
                      <div className="text-lg font-black leading-none">{moeda(valorAtual)}</div>
                    </div>
                  ) : (
                    <span className="rounded-full border border-luxury-gold/30 bg-luxury-gold/10 px-4 py-2 text-sm font-bold text-luxury-black">
                      {moeda(produto.preco)}
                    </span>
                  )}
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${produto.estoque > 0 ? "text-green-600" : "text-red-400"}`}>
                    {produto.estoque > 0 ? "Disponível" : "Esgotado"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => openDetails(produto)}
                    className="block w-full rounded-full border border-luxury-black px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-luxury-black transition-colors hover:bg-luxury-black hover:text-white"
                  >
                    Ver detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePayment(produto)}
                    disabled={produto.estoque <= 0 || isPending}
                    className={`block w-full rounded-full px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest transition-colors ${
                    produto.estoque > 0
                      ? "bg-luxury-black text-white hover:bg-luxury-gold"
                      : "bg-gray-100 text-gray-400 pointer-events-none"
                  }`}
                  >
                    {produto.estoque > 0 ? (isPending ? "Registrando..." : "Pagamento") : "Aguardando reposição"}
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
        <div className="fixed inset-0 z-50 bg-luxury-black/70 px-3 py-4 sm:px-6 sm:py-8 backdrop-blur-sm overflow-y-auto">
          <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
            <div className="relative w-full overflow-hidden rounded-none sm:rounded-2xl bg-white shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedProduto(null)}
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl leading-none text-luxury-black shadow-md hover:bg-luxury-gold"
                aria-label="Fechar detalhes"
              >
                ×
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="min-h-80 bg-gray-50">
                  {selectedProduto.imagem ? (
                    <img src={selectedProduto.imagem} alt={selectedProduto.nome} className="h-full max-h-[70vh] w-full object-cover" />
                  ) : (
                    <div className="flex min-h-80 h-full items-center justify-center text-4xl font-serif italic text-gray-300">
                      M&A
                    </div>
                  )}
                </div>

                <div className="flex flex-col p-6 sm:p-8 lg:p-10">
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-luxury-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-luxury-gold">
                      {selectedProduto.categoria}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      selectedProduto.estoque > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    }`}>
                      {selectedProduto.estoque > 0 ? "Disponível" : "Esgotado"}
                    </span>
                    {selectedProduto.promocaoAtiva && selectedProduto.descontoPercentual ? (
                      <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                        -{selectedProduto.descontoPercentual}% OFF
                      </span>
                    ) : null}
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-luxury-gold">{selectedProduto.marca}</p>
                  <h3 className="mt-2 text-3xl sm:text-4xl font-serif leading-tight text-luxury-black">{selectedProduto.nome}</h3>
                  <p className="mt-2 text-sm font-light italic text-gray-500">Código {selectedProduto.codigo ?? selectedProduto.id} / {selectedProduto.volume}</p>

                  <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Descrição</p>
                    <p className="mt-3 text-sm leading-relaxed text-gray-700">
                      {selectedProduto.descricao || "Descrição em atualização. Consulte nossa equipe para confirmar notas, fixação e disponibilidade."}
                    </p>
                  </div>

                  <div className="mt-6">
                    {precoPromocional(selectedProduto) ? (
                      <div className="rounded-3xl bg-red-600 p-5 text-white shadow-xl">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-widest">Oferta Especial</span>
                          <span className="text-sm line-through opacity-75">{moeda(selectedProduto.preco)}</span>
                        </div>
                        <div className="mt-2 text-3xl font-black">{moeda(precoPromocional(selectedProduto))}</div>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-luxury-gold/30 bg-luxury-gold/10 p-5">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Preço</p>
                        <div className="mt-2 text-3xl font-black text-luxury-black">{moeda(selectedProduto.preco)}</div>
                      </div>
                    )}
                  </div>

                  {paymentMessage && (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-900">
                      {paymentMessage}
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handlePayment(selectedProduto)}
                      disabled={selectedProduto.estoque <= 0 || isPending}
                      className={`rounded-full px-5 py-4 text-xs font-black uppercase tracking-widest transition-colors ${
                        selectedProduto.estoque > 0
                          ? "bg-luxury-black text-white hover:bg-luxury-gold"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {selectedProduto.estoque > 0 ? (isPending ? "Registrando..." : "Pagamento") : "Aguardando reposição"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProduto(null)}
                      className="rounded-full border border-gray-200 px-5 py-4 text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50"
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
