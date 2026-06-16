"use client";

import { useMemo, useState, useTransition } from "react";
import { criarPedidoLojista } from "../actions";

interface Produto {
  id: number;
  codigo?: number | null;
  nome: string;
  marca: string;
  categoria: string;
  volume: string;
  preco: number | null;
  precoAtacado: number | null;
  estoque: number;
  estoqueLojista: number;
  promocaoAtiva?: boolean;
  descontoPercentual?: number | null;
  imagem: string | null;
  descricao: string | null;
}

const categoriasBase = ["Perfume", "Perfume Feminino", "Perfume Masculino", "Perfume Árabe", "Oud", "Cosmético", "Skincare", "Outros"];

function moeda(valor: number | null | undefined) {
  return valor ? `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Consultar";
}

function precoPromocional(produto: Produto) {
  const preco = Number(produto.preco || 0);
  const desconto = Number(produto.descontoPercentual || 0);

  if (!produto.promocaoAtiva || !preco || !desconto) {
    return null;
  }

  return preco * (1 - desconto / 100);
}

export default function ListaProdutosLojista({ produtos }: { produtos: Produto[] }) {
  const [categoria, setCategoria] = useState("todos");
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleComprarSubmit(event: React.FormEvent<HTMLFormElement>, produtoNome: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const quantidade = String(formData.get("quantidade") || "1");

    if (!window.confirm(`Deseja comprar ${quantidade} unidade(s) de ${produtoNome} do fornecedor?`)) {
      return;
    }

    startTransition(async () => {
      await criarPedidoLojista(formData);
      window.location.reload();
    });
  }

  const categorias = useMemo(
    () => ["todos", ...Array.from(new Set([...categoriasBase, ...produtos.map((produto) => produto.categoria).filter(Boolean)])).sort()],
    [produtos]
  );
  const produtosFiltrados = useMemo(
    () => {
      const ordenados = [...produtos].sort((a, b) => {
        const promoA = a.promocaoAtiva ? 1 : 0;
        const promoB = b.promocaoAtiva ? 1 : 0;
        if (promoA !== promoB) return promoB - promoA;
        return a.nome.localeCompare(b.nome, "pt-BR");
      });
      return categoria === "todos" ? ordenados : ordenados.filter((produto) => produto.categoria === categoria);
    },
    [categoria, produtos]
  );

  return (
    <>
      <section className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Lista de produtos</h2>
            <p className="text-xs text-gray-500">Mostrando {produtosFiltrados.length} de {produtos.length} produtos disponíveis para lojista</p>
          </div>
          <select
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            className="w-full md:w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-luxury-gold"
          >
            {categorias.map((item) => (
              <option key={item} value={item}>
                {item === "todos" ? "Todos os tipos" : item}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-table-scroll max-h-[72vh] overflow-auto hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Produto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Valores</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Disponível</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Comprar do fornecedor</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {produtosFiltrados.map((produto) => {
                const valorPromocional = precoPromocional(produto);

                return (
                  <tr key={produto.id} className="hover:bg-gray-50 transition-colors align-middle">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {produto.imagem ? (
                            <img src={produto.imagem} alt={produto.nome} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-300 italic font-serif text-xs">M&A</div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            <span className="mr-2 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500">
                              Cód. {produto.codigo ?? produto.id}
                            </span>
                            {produto.nome}
                          </div>
                          <div className="text-xs text-gray-500">{produto.marca} - {produto.volume}</div>
                          <button
                            type="button"
                            onClick={() => setSelectedProduto(produto)}
                            className="mt-1 text-xs font-bold text-luxury-gold hover:text-luxury-black uppercase tracking-widest"
                          >
                            Ver produto
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {produto.categoria}
                      </span>
                      {produto.promocaoAtiva && produto.descontoPercentual ? (
                        <div className="mt-2 w-fit px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-100">
                          Promo {produto.descontoPercentual}%
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-black text-gray-900">Custo: {moeda(produto.precoAtacado)}</div>
                      {valorPromocional ? (
                        <div className="text-xs text-red-600 font-bold">
                          Sugestão: {moeda(valorPromocional)} <span className="text-gray-400 line-through">{moeda(produto.preco)}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">Sugestão: {moeda(produto.preco)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={produto.estoque > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                        Fornecedor: {produto.estoque || 0} un.
                      </span>
                      <div className="text-xs text-gray-500">Meu estoque: {produto.estoqueLojista || 0} un.</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <form
                        onSubmit={(e) => handleComprarSubmit(e, produto.nome)}
                        className="admin-action-row justify-end"
                      >
                        <input type="hidden" name="produtoId" value={produto.id} />
                        <input
                          name="quantidade"
                          type="number"
                          min={1}
                          defaultValue={1}
                          disabled={isPending}
                          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-luxury-gold disabled:bg-gray-100 font-bold"
                        />
                        <select
                          name="pagamento"
                          disabled={isPending}
                          className="w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-luxury-gold disabled:bg-gray-100 font-bold"
                        >
                          <option value="Pedido ao fornecedor">Fornecedor</option>
                          <option value="Pix fornecedor">Pix fornecedor</option>
                          <option value="Acerto local">Acerto local</option>
                        </select>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="rounded-lg bg-luxury-black px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-luxury-gold disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]"
                        >
                          {isPending ? "Processando…" : "Comprar estoque"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {produtosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 italic">
                    Nenhum produto encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW (Fornecedor) */}
        <div className="md:hidden space-y-4 max-h-[70vh] overflow-y-auto p-1.5 bg-gray-50">
          {produtosFiltrados.map((produto) => {
            const valorPromocional = precoPromocional(produto);
            return (
              <div key={produto.id} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm space-y-3">
                {/* 1. Header: Foto + Nome */}
                <div className="flex gap-3 items-start">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {produto.imagem ? (
                      <img src={produto.imagem} alt={produto.nome} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-300 italic font-serif text-[10px]">M&A</div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[8px] font-black text-gray-500 uppercase">
                        Cód. {produto.codigo ?? produto.id}
                      </span>
                      <span className="px-2 py-0.5 text-[8px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 inline-block uppercase">
                        {produto.categoria}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 truncate mt-1">{produto.nome}</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">{produto.marca} - {produto.volume}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedProduto(produto)}
                      className="mt-1 text-[10px] font-black text-luxury-gold hover:text-luxury-black uppercase tracking-wider block"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>

                {/* 2. Grid de Valores e Estoque */}
                <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-3 text-[10px]">
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Preços</p>
                    <p className="font-black text-gray-900 text-xs mt-0.5">Custo: {moeda(produto.precoAtacado)}</p>
                    {valorPromocional ? (
                      <p className="text-[9px] text-red-600 font-bold mt-0.5">
                        Sugestão: {moeda(valorPromocional)} <span className="text-gray-400 line-through text-[8px]">{moeda(produto.preco)}</span>
                      </p>
                    ) : (
                      <p className="text-[9px] text-gray-500 mt-0.5">Sugestão: {moeda(produto.preco)}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Disponibilidade</p>
                    <p className={`font-bold mt-0.5 text-xs ${produto.estoque > 0 ? "text-green-600" : "text-red-500"}`}>
                      Fornecedor: {produto.estoque || 0} un.
                    </p>
                    <p className="text-[9px] text-gray-500 mt-0.5 font-semibold">Meu Estoque: {produto.estoqueLojista || 0} un.</p>
                  </div>
                </div>

                {/* 3. Formulário de Compra */}
                <form
                  onSubmit={(e) => handleComprarSubmit(e, produto.nome)}
                  className="flex flex-col gap-2 pt-1.5 border-t border-gray-100"
                >
                  <input type="hidden" name="produtoId" value={produto.id} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-black uppercase text-gray-400 tracking-wider mb-1">Quantidade</label>
                      <input
                        name="quantidade"
                        type="number"
                        min={1}
                        defaultValue={1}
                        disabled={isPending}
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-luxury-gold bg-white font-bold disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-gray-400 tracking-wider mb-1">Pagamento</label>
                      <select
                        name="pagamento"
                        disabled={isPending}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-luxury-gold font-bold disabled:bg-gray-100"
                      >
                        <option value="Pedido ao fornecedor">Fornecedor</option>
                        <option value="Pix fornecedor">Pix fornecedor</option>
                        <option value="Acerto local">Acerto local</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-lg bg-luxury-black py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-luxury-gold active:bg-luxury-gold disabled:opacity-50"
                  >
                    {isPending ? "Processando…" : "Comprar estoque"}
                  </button>
                </form>
              </div>
            );
          })}

          {produtosFiltrados.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-400 italic">
              Nenhum produto encontrado para este filtro.
            </div>
          )}
        </div>
      </section>

      {selectedProduto && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm p-4 flex items-start justify-center overflow-y-auto">
          <div className="w-full max-w-3xl my-6 rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex justify-end p-4">
              <button
                type="button"
                onClick={() => setSelectedProduto(null)}
                className="rounded-full bg-gray-100 px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-700 hover:bg-gray-200"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-0">
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                {selectedProduto.imagem ? (
                  <img src={selectedProduto.imagem} alt={selectedProduto.nome} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-300 italic font-serif">Mourato</div>
                )}
              </div>
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-luxury-gold uppercase tracking-widest">{selectedProduto.marca}</span>
                <h3 className="text-3xl font-serif text-gray-900">{selectedProduto.nome}</h3>
                <p className="text-sm text-gray-500">{selectedProduto.volume} | {selectedProduto.categoria}</p>
                {selectedProduto.descricao && <p className="text-sm leading-relaxed text-gray-600">{selectedProduto.descricao}</p>}
                <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Custo lojista</span>
                    <span className="font-black text-gray-900">{moeda(selectedProduto.precoAtacado)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sugestão ao cliente</span>
                    <span className="font-bold text-gray-900">{moeda(precoPromocional(selectedProduto) || selectedProduto.preco)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Disponível</span>
                    <span className={selectedProduto.estoque > 0 ? "font-bold text-green-600" : "font-bold text-red-500"}>
                      Fornecedor: {selectedProduto.estoque || 0} un.
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Meu estoque</span>
                    <span className="font-bold text-gray-900">{selectedProduto.estoqueLojista || 0} un.</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  O valor lojista é fixo. Você pode definir sua margem de venda acima da sugestão.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
