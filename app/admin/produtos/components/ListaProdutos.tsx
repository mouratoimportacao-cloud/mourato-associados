"use client";

import { deleteProduto, toggleVitrine } from "../actions";
import { useMemo, useState, useTransition } from "react";
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
  pendentePorProduto?: Record<number, { qtd: number; saldo: number; lojistas: string[] }>;
}

export default function ListaProdutos({ produtos, onEditProduct, pendentePorProduto }: ListaProdutosProps) {
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
        const matchGender =
          produto.genero === filtros.genero ||
          getArrayValue(produto.tags).includes(filtros.genero);
        if (!matchGender) return false;
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
        <FiltrosProdutos theme="light" onChange={setFiltros} />
      </div>
      <div className="admin-table-scroll max-h-[70vh] overflow-auto">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th style={{ width: "var(--admin-col-prod-nome)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Produto</th>
              <th style={{ width: "var(--admin-col-prod-cat)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Categoria</th>
              <th style={{ width: "var(--admin-col-prod-est)" }} className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estoque</th>
              <th style={{ width: "var(--admin-col-prod-prc)" }} className="px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Preços</th>
              <th style={{ width: "var(--admin-col-prod-cst)" }} className="px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Custo Estoque</th>
              <th style={{ width: "var(--admin-col-prod-act)" }} className="px-2 py-1.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {produtosFiltrados.map((produto) => {
              const custoReal = (produto.custoDolar || 0) * (produto.cotacaoDolar || 0);
              const totalEstoque = custoReal * (produto.estoque || 0);

              return (
              <tr key={produto.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-2 py-1.5 min-w-0">
                  <div className="flex items-center min-w-0">
                    <div className="relative h-8 w-8 flex-shrink-0 bg-gray-100 rounded overflow-hidden border border-gray-200">
                      <OptimizedImage
                        src={produto.imagem}
                        alt={produto.nome}
                        fill
                        sizes="32px"
                        className="object-cover"
                        fallbackText="N/A"
                      />
                    </div>
                    <div className="ml-2">
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <button
                          type="button"
                          title={produto.vitrine ? "Remover do carrossel" : "Adicionar ao carrossel"}
                          onClick={() => startTransition(() => toggleVitrine(produto.id, !produto.vitrine))}
                          disabled={isPending}
                          className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${
                            produto.vitrine
                              ? "bg-amber-500 border-amber-600 text-white"
                              : "bg-white border-gray-300 hover:border-amber-400"
                          }`}
                        >
                          {produto.vitrine && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <span className="rounded bg-gray-100 px-1 py-0.2 text-[9px] font-black text-gray-500">
                          #{produto.codigo ?? produto.id}
                        </span>
                        <span className="truncate max-w-[15rem]" title={produto.nome}>{produto.nome}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium">{produto.marca} · {produto.volume}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <div className="flex items-center gap-1 flex-wrap max-w-[12rem]">
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {produto.categoria}
                    </span>
                    {produto.vitrine && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-100">
                        Vitrine
                      </span>
                    )}
                    {produto.promocaoAtiva && produto.descontoPercentual ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-50 text-red-700 border border-red-100">
                        -{produto.descontoPercentual}%
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`font-bold ${produto.estoque <= 0 ? 'text-red-600' : produto.estoque < 5 ? 'text-amber-600' : 'text-gray-700'}`}>
                        G: {produto.estoque} un.
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500 font-medium">
                        L: {produto.estoqueLojista || 0} un.
                      </span>
                      {produto.estoque <= 0 && (
                        <span className="px-1 py-0.2 text-[8px] font-black uppercase rounded bg-red-100 text-red-700 border border-red-200">
                          Falta
                        </span>
                      )}
                    </div>
                    {pendentePorProduto?.[produto.id] && (
                      <div
                        className="flex items-center gap-1 mt-0.5"
                        title={`Pedido(s) pendente(s) de: ${pendentePorProduto[produto.id].lojistas.join(", ") || "Lojista"}`}
                      >
                        <span className="animate-pulse inline-block h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        <span className="text-[9px] font-black uppercase text-amber-700 tracking-wide">
                          {pendentePorProduto[produto.id].qtd} un. pendentes
                        </span>
                        <span className="text-[9px] text-amber-600 font-medium">
                          · R$ {Number(pendentePorProduto[produto.id].saldo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs">
                    <span className="font-bold text-gray-900">S: {moeda(produto.preco)}</span>
                    <span className="text-gray-300">|</span>
                    <span className="font-semibold text-indigo-700">C: {moeda(produto.precoAtacado)}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs">
                    <span className="font-bold text-gray-900">U: {custoReal ? moeda(custoReal) : "-"}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500 font-semibold">T: {totalEstoque ? moeda(totalEstoque) : "R$ 0,00"}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-right text-xs font-medium space-x-1">
                  <button
                    onClick={() => onEditProduct(produto)}
                    disabled={isPending}
                    className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-2 py-0.5 rounded transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(produto.id)}
                    disabled={isPending}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded transition-all disabled:opacity-50 cursor-pointer"
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
