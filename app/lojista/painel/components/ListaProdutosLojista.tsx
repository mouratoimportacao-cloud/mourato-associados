"use client";

import { useMemo, useState } from "react";
import FiltrosProdutos from "../../../components/FiltrosProdutos";

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
          if (produto.genero !== filtros.genero) return false;
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

        <div className="admin-table-scroll max-h-[72vh] overflow-auto hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Produto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Preço Lojista</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Estoque Fornecedor</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Ações</th>
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-black text-gray-900">
                      {moeda(produto.precoAtacado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={produto.estoque > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                        {produto.estoque || 0} un.
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <input
                          id={`qty-desktop-${produto.id}`}
                          type="number"
                          min={1}
                          defaultValue={1}
                          className="w-16 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-luxury-gold font-bold text-center"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const inputEl = document.getElementById(`qty-desktop-${produto.id}`) as HTMLInputElement;
                            const qty = Number(inputEl?.value || 1);
                            onAddToCart(produto.id, qty);
                          }}
                          className="rounded-lg bg-luxury-black hover:bg-luxury-gold text-white hover:text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          Adicionar ao Pedido
                        </button>
                      </div>
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
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Preço Lojista</p>
                    <p className="font-black text-gray-900 text-xs mt-0.5">{moeda(produto.precoAtacado)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Estoque Fornecedor</p>
                    <p className={`font-bold mt-0.5 text-xs ${produto.estoque > 0 ? "text-green-600" : "text-red-500"}`}>
                      {produto.estoque || 0} un.
                    </p>
                  </div>
                </div>

                {/* 3. Mobile Add to Order */}
                <div className="flex gap-2 pt-2 border-t border-gray-100 items-end">
                  <div className="w-20">
                    <label className="block text-[8px] font-black uppercase text-gray-400 tracking-wider mb-1">Qtd</label>
                    <input
                      id={`qty-mobile-${produto.id}`}
                      type="number"
                      min={1}
                      defaultValue={1}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-luxury-gold bg-white font-bold text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const inputEl = document.getElementById(`qty-mobile-${produto.id}`) as HTMLInputElement;
                      const qty = Number(inputEl?.value || 1);
                      onAddToCart(produto.id, qty);
                    }}
                    className="flex-grow rounded-lg bg-luxury-black py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-luxury-gold transition-colors cursor-pointer text-center"
                  >
                    Adicionar ao Pedido
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
