"use client";

import { deleteProduto } from "../actions";
import { useMemo, useState, useTransition } from "react";

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
  custoDolar: number | null;
  cotacaoDolar: number | null;
  estoque: number;
  estoqueLojista: number;
  vitrine?: boolean;
  promocaoAtiva?: boolean;
  descontoPercentual?: number | null;
  imagem: string | null;
  descricao: string | null;
  createdAt: Date;
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

interface ListaProdutosProps {
  produtos: Produto[];
  onEditProduct: (produto: Produto) => void;
}

export default function ListaProdutos({ produtos, onEditProduct }: ListaProdutosProps) {
  const [isPending, startTransition] = useTransition();
  const [filtros, setFiltros] = useState<any>({
    origem: "todos",
    genero: "todos",
    concentracao: "todos",
    categoriaPrincipal: "todos",
    tags: [],
    familiaOlfativa: [],
    ocasiaoUso: []
  });

  const moeda = (valor: number | null | undefined) =>
    valor ? `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Consultar";

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
    return produtos.filter((produto) => {
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
      
      // Tags (MultiSelect)
      if (filtros.tags && filtros.tags.length > 0) {
        const pTags = getArrayValue(produto.tags);
        const match = filtros.tags.every((t: string) => pTags.includes(t));
        if (!match) return false;
      }
      
      // Família Olfativa (MultiSelect)
      if (filtros.familiaOlfativa && filtros.familiaOlfativa.length > 0) {
        const pFamilias = getArrayValue(produto.familia_olfativa);
        const match = filtros.familiaOlfativa.every((f: string) => pFamilias.includes(f));
        if (!match) return false;
      }
      
      // Ocasião de Uso (MultiSelect)
      if (filtros.ocasiaoUso && filtros.ocasiaoUso.length > 0) {
        const pOcasioes = getArrayValue(produto.ocasiao_uso);
        const match = filtros.ocasiaoUso.every((o: string) => pOcasioes.includes(o));
        if (!match) return false;
      }
      
      return true;
    });
  }, [produtos, filtros]);

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este produto do catálogo?")) {
      startTransition(async () => {
        const result = await deleteProduto(id);
        if (!result.success) {
          alert(result.error);
        }
      });
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-gray-800 font-sans">Filtro de produtos</h3>
            <p className="text-xs text-gray-500 font-sans">Mostrando {produtosFiltrados.length} de {produtos.length} produtos</p>
          </div>
        </div>
        {/* Filtros removidos - categorias no navbar */}
      </div>
      <div className="admin-table-scroll max-h-[70vh] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Produto</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Categoria</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Estoque</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Preços</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Custo Estoque</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {produtosFiltrados.map((produto) => {
              const custoReal = (produto.custoDolar || 0) * (produto.cotacaoDolar || 0);
              const totalEstoque = custoReal * (produto.estoque || 0);

              return (
              <tr key={produto.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="relative h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                      <OptimizedImage
                        src={produto.imagem}
                        alt={produto.nome}
                        fill
                        sizes="40px"
                        className="object-cover"
                        fallbackText="N/A"
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-gray-900">
                        <span className="mr-2 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500">
                          Cód. {produto.codigo ?? produto.id}
                        </span>
                        {produto.nome}
                      </div>
                      <div className="text-xs text-gray-500">{produto.marca} - {produto.volume}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {produto.categoria}
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {produto.vitrine && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        Vitrine
                      </span>
                    )}
                    {produto.promocaoAtiva && produto.descontoPercentual ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-100">
                        Promo {produto.descontoPercentual}%
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className={`text-sm font-medium flex items-center gap-1.5 ${produto.estoque <= 0 ? 'text-red-600 font-bold' : produto.estoque < 5 ? 'text-amber-600' : 'text-gray-700'}`}>
                      <span>Geral: {produto.estoque} un.</span>
                      {produto.estoque <= 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-red-100 text-red-700 border border-red-200">
                          Esgotado
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Lojista: {produto.estoqueLojista || 0} un.
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">
                    Sugerido: {moeda(produto.preco)}
                  </div>
                  <div className="text-xs font-semibold text-indigo-700">
                    Custo lojista: {moeda(produto.precoAtacado)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">
                    {custoReal ? moeda(custoReal) : "Sem cotacao"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Total: {totalEstoque ? moeda(totalEstoque) : "R$ 0,00"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => onEditProduct(produto)}
                    disabled={isPending}
                    className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(produto.id)}
                    disabled={isPending}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
              );
            })}
            {produtosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 italic">
                  Nenhum produto encontrado para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
