"use client";

import { useMemo, useState } from "react";
import FiltrosProdutos from "../../../components/FiltrosProdutos";
import OptimizedImage from "../../../components/OptimizedImage";

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
  // Campos novos
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
}

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

export default function ListaProdutosLojista({ 
  produtos,
  onAddToCart
}: { 
  produtos: Produto[];
  onAddToCart: (produtoId: number, quantidade: number) => void;
}) {
  const [filtros, setFiltros] = useState<any>({
    origem: "todos",
    genero: "todos",
    concentracao: "todos",
    categoriaPrincipal: "todos",
    tags: [],
    familiaOlfativa: [],
    ocasiaoUso: []
  });
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

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
  
  const produtosFiltrados = useMemo(
    () => {
      const ordenados = [...produtos].sort((a, b) => {
        const promoA = a.promocaoAtiva ? 1 : 0;
        const promoB = b.promocaoAtiva ? 1 : 0;
        if (promoA !== promoB) return promoB - promoA;
        return a.nome.localeCompare(b.nome, "pt-BR");
      });

      return ordenados.filter((produto) => {
        // Categoria Principal
        if (filtros.categoriaPrincipal !== "todos") {
          const cat = produto.categoria_principal || produto.categoria || "";
          if (cat.toLowerCase() !== filtros.categoriaPrincipal.toLowerCase()) return false;
        }
        
        // Origem
        if (filtros.origem !== "todos") {
          if (produto.origem !== filtros.origem) return false;
        }
        
        // Gênero
        if (filtros.genero !== "todos") {
          const matchGender =
            produto.genero === filtros.genero ||
            getArrayValue(produto.tags).includes(filtros.genero);
          if (!matchGender) return false;
        }
        
        // Concentração
        if (filtros.concentracao !== "todos") {
          if (produto.concentracao !== filtros.concentracao) return false;
        }
        
        // Tags
        if (filtros.tags && filtros.tags.length > 0) {
          const pTags = getArrayValue(produto.tags);
          const match = filtros.tags.every((t: string) => pTags.includes(t));
          if (!match) return false;
        }
        
        // Família Olfativa
        if (filtros.familiaOlfativa && filtros.familiaOlfativa.length > 0) {
          const pFamilias = getArrayValue(produto.familia_olfativa);
          const match = filtros.familiaOlfativa.every((f: string) => pFamilias.includes(f));
          if (!match) return false;
        }
        
        // Ocasião de Uso
        if (filtros.ocasiaoUso && filtros.ocasiaoUso.length > 0) {
          const pOcasioes = getArrayValue(produto.ocasiao_uso);
          const match = filtros.ocasiaoUso.every((o: string) => pOcasioes.includes(o));
          if (!match) return false;
        }
        
        return true;
      });
    },
    [filtros, produtos]
  );

  return (
    <>
      <section className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-800 font-sans">Produtos do Fornecedor</h2>
              <p className="text-xs text-gray-500 font-sans">Mostrando {produtosFiltrados.length} de {produtos.length} produtos disponíveis</p>
            </div>
          </div>
          <FiltrosProdutos theme="light" onChange={setFiltros} />
        </div>

        <div className="max-h-[72vh] overflow-y-auto hidden md:block">
          <table className="w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[38%]">Produto</th>
                <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[14%]">Tipo</th>
                <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[14%]">Preço</th>
                <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[10%]">Estoque</th>
                <th className="px-2 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[24%]">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {produtosFiltrados.map((produto) => (
                <tr key={produto.id} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        <OptimizedImage src={produto.imagem} alt={produto.nome} fill sizes="40px" className="object-cover" fallbackText="M&A" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">
                          <span className="mr-1 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-black text-gray-500">#{produto.codigo ?? produto.id}</span>
                          {produto.nome}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">{produto.marca} · {produto.volume}</div>
                        <button type="button" onClick={() => setSelectedProduto(produto)} className="text-[9px] font-bold text-stone-500 hover:text-stone-900 uppercase underline">
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <span className="px-2 py-0.5 text-[9px] font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 block w-fit max-w-full break-words">{produto.categoria}</span>
                  </td>
                  <td className="px-2 py-3 text-xs font-black text-gray-900">{moeda(produto.precoAtacado)}</td>
                  <td className="px-2 py-3">
                    <span className={`text-xs font-bold ${produto.estoque > 0 ? "text-green-600" : "text-red-500"}`}>{produto.estoque || 0}</span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1.5 justify-end flex-wrap">
                      <input
                        id={`qty-desktop-${produto.id}`}
                        type="number" min={1} max={produto.estoque} defaultValue={1}
                        disabled={produto.estoque <= 0}
                        className="w-12 rounded border border-gray-200 px-1.5 py-1 text-xs bg-white focus:outline-none font-bold text-center disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const inputEl = document.getElementById(`qty-desktop-${produto.id}`) as HTMLInputElement;
                          const qty = Number(inputEl?.value || 1);
                          if (qty > produto.estoque) { alert(`Estoque máximo: ${produto.estoque} un.`); return; }
                          onAddToCart(produto.id, qty);
                        }}
                        disabled={produto.estoque <= 0}
                        className={`rounded px-2 py-1.5 text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                          produto.estoque > 0 ? "bg-white hover:bg-stone-50 text-zinc-950 border border-zinc-200" : "bg-stone-100 text-stone-400 pointer-events-none"
                        }`}
                      >
                        {produto.estoque > 0 ? "+ Pedido" : "Indispon."}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
        <div className="md:hidden space-y-5 p-2 bg-stone-50">
          {produtosFiltrados.map((produto) => {
            return (
              <div key={produto.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-4 max-w-sm mx-auto flex flex-col">
                {/* 1. Imagem do Produto (Grande) */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-stone-100 bg-stone-50">
                  <OptimizedImage
                    src={produto.imagem}
                    alt={produto.nome}
                    fill
                    sizes="(max-width: 640px) 100vw, 350px"
                    className="object-cover"
                    fallbackText="M&A"
                  />
                </div>

                {/* 2. Textos e Detalhes */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded bg-stone-100 border border-stone-200 px-2 py-0.5 text-[8px] font-black text-stone-600 uppercase">
                      Cód. {produto.codigo ?? produto.id}
                    </span>
                    <span className="px-2 py-0.5 text-[8px] font-bold rounded-full bg-zinc-950 text-white inline-block uppercase">
                      {produto.categoria}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 leading-tight mt-1">{produto.nome}</h3>
                  <p className="text-[10px] text-stone-500 font-medium">{produto.marca} — {produto.volume}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedProduto(produto)}
                    className="text-[9px] font-black text-gold hover:text-stone-900 uppercase tracking-widest block underline pt-1"
                  >
                    Ver detalhes do produto
                  </button>
                </div>

                {/* 3. Grid de Valores e Estoque */}
                <div className="grid grid-cols-2 gap-2 bg-stone-50 border border-stone-150 rounded-xl p-3 text-[10px]">
                  <div>
                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Preço Lojista</p>
                    <p className="font-serif font-black text-stone-900 text-sm mt-0.5">{moeda(produto.precoAtacado)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Estoque Fornecedor</p>
                    <p className={`font-black mt-0.5 text-xs ${produto.estoque > 0 ? "text-green-600" : "text-red-500"}`}>
                      {produto.estoque || 0} un.
                    </p>
                  </div>
                </div>

                {/* 4. Ações: Qtd + Adicionar */}
                <div className="flex gap-3 pt-2 border-t border-stone-100 items-end">
                  <div className="w-20 shrink-0">
                    <label className="block text-[8px] font-black uppercase text-stone-400 tracking-wider mb-1">Qtd</label>
                    <input
                      id={`qty-mobile-${produto.id}`}
                      type="number"
                      min={1}
                      max={produto.estoque}
                      defaultValue={1}
                      disabled={produto.estoque <= 0}
                      className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-950 bg-white font-bold text-center disabled:opacity-50 disabled:bg-gray-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const inputEl = document.getElementById(`qty-mobile-${produto.id}`) as HTMLInputElement;
                      const qty = Number(inputEl?.value || 1);
                      if (qty > produto.estoque) {
                        alert(`Quantidade solicitada (${qty} un.) excede o estoque disponível do fornecedor (${produto.estoque} un.).`);
                        return;
                      }
                      onAddToCart(produto.id, qty);
                    }}
                    disabled={produto.estoque <= 0}
                    className={`flex-grow rounded-lg py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors text-center cursor-pointer ${
                      produto.estoque > 0
                        ? "bg-zinc-950 text-white hover:bg-zinc-800 transition-colors shadow-sm"
                        : "bg-stone-50 text-stone-400 pointer-events-none"
                    }`}
                  >
                    {produto.estoque > 0 ? "Adicionar ao Pedido" : "Indisponível"}
                  </button>
                </div>
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
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                <OptimizedImage
                  src={selectedProduto.imagem}
                  alt={selectedProduto.nome}
                  fill
                  sizes="(max-width: 768px) 100vw, 350px"
                  className="object-cover"
                  fallbackText="Mourato"
                />
              </div>
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-luxury-gold uppercase tracking-widest">{selectedProduto.marca}</span>
                <h3 className="text-3xl font-serif text-gray-900">{selectedProduto.nome}</h3>
                <p className="text-sm text-gray-500">{selectedProduto.volume} | {selectedProduto.categoria}</p>
                {selectedProduto.descricao && <p className="text-sm leading-relaxed text-gray-600">{selectedProduto.descricao}</p>}
                
                {/* OLFACTORY DETAILS BLOCK */}
                {(selectedProduto.concentracao || selectedProduto.notas_topo || selectedProduto.notas_coracao || selectedProduto.notas_fundo || selectedProduto.similaridade_inspiracao || selectedProduto.descricao_olfativa) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs space-y-3 text-gray-600 font-sans">
                    {selectedProduto.descricao_olfativa && (
                      <p className="text-gray-700 italic leading-relaxed">
                        {selectedProduto.descricao_olfativa}
                      </p>
                    )}

                    {selectedProduto.concentracao && (
                      <div>
                        <span className="text-gray-500 font-medium">Concentração:</span>{" "}
                        <span className="text-gray-900 font-semibold">{selectedProduto.concentracao}</span>
                      </div>
                    )}

                    {(selectedProduto.notas_topo || selectedProduto.notas_coracao || selectedProduto.notas_fundo) && (
                      <div className="space-y-1">
                        <span className="text-gray-500 font-medium block">Notas Olfativas:</span>
                        <div className="pl-2.5 border-l border-luxury-gold/40 space-y-0.5">
                          {selectedProduto.notas_topo && (
                            <div>
                              <span className="text-gray-500">Topo:</span>{" "}
                              <span className="text-gray-800">{selectedProduto.notas_topo}</span>
                            </div>
                          )}
                          {selectedProduto.notas_coracao && (
                            <div>
                              <span className="text-gray-500">Coração:</span>{" "}
                              <span className="text-gray-800">{selectedProduto.notas_coracao}</span>
                            </div>
                          )}
                          {selectedProduto.notas_fundo && (
                            <div>
                              <span className="text-gray-500">Fundo:</span>{" "}
                              <span className="text-gray-800">{selectedProduto.notas_fundo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedProduto.similaridade_inspiracao && (
                      <div>
                        <span className="text-gray-500 font-medium">Inspirado em:</span>{" "}
                        <span className="text-gray-900 font-semibold">{selectedProduto.similaridade_inspiracao}</span>
                      </div>
                    )}
                  </div>
                )}

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
                    <span className="text-gray-500">Estoque Fornecedor</span>
                    <span className={selectedProduto.estoque > 0 ? "font-bold text-green-600" : "font-bold text-red-500"}>
                      {selectedProduto.estoque || 0} un.
                    </span>
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
