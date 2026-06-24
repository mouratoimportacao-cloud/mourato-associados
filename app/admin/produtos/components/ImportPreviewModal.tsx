"use client";

import { useState, useEffect, useTransition } from "react";
import { analisarPlanilhaAction, executarImportacaoAction } from "../actions";

interface ImportPreviewModalProps {
  base64Data: string;
  onClose: () => void;
  onSuccess: () => void;
}

const targetFields = [
  { key: "codigo", label: "Código / ID", desc: "Identificador único (opcional)", required: false },
  { key: "nome", label: "Nome do Produto", desc: "Nome completo do item (obrigatório)", required: true },
  { key: "marca", label: "Marca", desc: "Fabricante (se vazio, tenta extrair do nome)", required: false },
  { key: "categoria", label: "Categoria", desc: "Perfume, Oud, Cosmético, etc. (se vazio, usa Perfume)", required: false },
  { key: "volume", label: "Volume", desc: "Ex: 100ml, 75ml (se vazio, tenta extrair do nome)", required: false },
  { key: "custoDolar", label: "Custo USD ($)", desc: "Custo unitário em Dólar (obrigatório se não houver Custo BRL)", required: false },
  { key: "cotacaoDolar", label: "Cotação USD (R$)", desc: "Cotação do dólar para conversão (padrão: 1.0)", required: false },
  { key: "precoCusto", label: "Custo BRL (R$)", desc: "Custo em Reais (obrigatório se não houver Custo USD)", required: false },
  { key: "precoLojista", label: "Preço Lojista (R$)", desc: "Preço de atacado (opcional, se vazio calcula automático)", required: false },
  { key: "precoSugerido", label: "Preço Sugerido / Venda (R$)", desc: "Preço de venda ao consumidor (obrigatório)", required: true },
  { key: "estoqueGeral", label: "Estoque Geral", desc: "Quantidade no estoque principal", required: false },
  { key: "estoqueLojista", label: "Estoque Lojista", desc: "Quantidade separada para lojistas", required: false },
  { key: "imagem", label: "Imagem (URL)", desc: "Link para foto do produto", required: false },
  { key: "descricao", label: "Descrição", desc: "Notas olfativas e detalhes", required: false },
  { key: "categoria_principal", label: "Categoria Principal", desc: "Perfume, Cosmético, Acessório, Kit", required: false },
  { key: "tags", label: "Tags / Etiquetas", desc: "Separe por vírgula ou '+'", required: false },
  { key: "concentracao", label: "Concentração", desc: "Body Splash, Cologne, EDT, EDP, Parfum, Extrait", required: false },
  { key: "origem", label: "Origem", desc: "Nacional, Importado, Árabe, Inspirado", required: false },
  { key: "tipo_perfume", label: "Tipo de Perfume", desc: "Designer, Nicho, Contratipo, Inspirado, Exclusivo", required: false },
  { key: "genero", label: "Gênero", desc: "Masculino, Feminino, Unissex", required: false },
  { key: "familia_olfativa", label: "Família Olfativa", desc: "Oriental, Amadeirado, etc. (separe por vírgula)", required: false },
  { key: "notas_topo", label: "Notas de Topo", desc: "Notas de saída", required: false },
  { key: "notas_coracao", label: "Notas de Coração", desc: "Notas de corpo", required: false },
  { key: "notas_fundo", label: "Notas de Fundo", desc: "Notas de base", required: false },
  { key: "fixacao_estimada", label: "Fixação Estimada", desc: "Ex: 6h, 12h", required: false },
  { key: "projecao", label: "Projeção", desc: "Rastro do perfume", required: false },
  { key: "ocasiao_uso", label: "Ocasião de Uso", desc: "Dia, Noite, etc. (separe por vírgula)", required: false },
  { key: "similaridade_inspiracao", label: "Similaridade / Inspiração", desc: "Perfume no qual é inspirado", required: false },
  { key: "descricao_olfativa", label: "Descrição Olfativa", desc: "Características olfativas detalhadas", required: false },
];

export default function ImportPreviewModal({ base64Data, onClose, onSuccess }: ImportPreviewModalProps) {
  const [isAnalyzing, startAnalysis] = useTransition();
  const [isImporting, startImport] = useTransition();
  
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [processedRows, setProcessedRows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [activeTab, setActiveTab] = useState<"new" | "update" | "error">("new");
  const [step, setStep] = useState<"mapping" | "preview" | "result">("mapping");
  const [finalReport, setFinalReport] = useState<any>(null);

  // Initial analysis
  useEffect(() => {
    startAnalysis(async () => {
      const res = await analisarPlanilhaAction(base64Data);
      if (res.success) {
        setHeaders(res.headers || []);
        setMapping(res.mapping || {});
        setProcessedRows(res.processedRows || []);
        setStats(res.stats || null);
        
        // Auto-select tab with most items or default to "new"
        if (res.stats) {
          if (res.stats.new > 0) setActiveTab("new");
          else if (res.stats.update > 0) setActiveTab("update");
          else if (res.stats.error > 0) setActiveTab("error");
        }
      } else {
        setErrorMessage(res.error || "Erro ao analisar o arquivo.");
      }
    });
  }, [base64Data]);

  // Re-analyze on mapping change
  const handleMappingChange = (fieldKey: string, headerValue: string) => {
    const nextMapping = { ...mapping, [fieldKey]: headerValue };
    setMapping(nextMapping);
    
    startAnalysis(async () => {
      const res = await analisarPlanilhaAction(base64Data, nextMapping);
      if (res.success) {
        setProcessedRows(res.processedRows || []);
        setStats(res.stats || null);
      } else {
        setErrorMessage(res.error || "Erro ao re-analisar dados.");
      }
    });
  };

  const handleConfirmImport = () => {
    if (stats?.error > 0) {
      if (!window.confirm(`Existem ${stats.error} erro(s) encontrados na planilha. Essas linhas serão IGNORADAS. Deseja continuar?`)) {
        return;
      }
    }

    startImport(async () => {
      try {
        const res = await executarImportacaoAction(base64Data, mapping);
        if (res.success) {
          setFinalReport(res);
          setStep("result");
        } else {
          alert("Erro na importação: " + res.error);
        }
      } catch (err: any) {
        alert("Erro crítico: " + err.message);
      }
    });
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "Consultar";
    return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter preview items
  const filteredRows = processedRows.filter((r) => {
    if (activeTab === "new") return r.status === "new";
    if (activeTab === "update") return r.status === "update";
    return r.status === "error" || r.warnings.length > 0; // Warnings & Errors tab
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-neutral-950 border border-zinc-800 rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* MODAL HEADER */}
        <header className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/30">
          <div>
            <h2 className="text-xl font-serif font-black text-white flex items-center gap-2">
              <span className="w-2 h-6 rounded-full bg-gold"></span>
              Importação Inteligente de Planilha
            </h2>
            <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider">
              {step === "mapping" && "Etapa 1: Confirmar o mapeamento de colunas"}
              {step === "preview" && "Etapa 2: Validar produtos e prévia de alteração"}
              {step === "result" && "Etapa 3: Relatório final da importação"}
            </p>
          </div>
          {step !== "result" && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full transition-colors"
            >
              ✕
            </button>
          )}
        </header>

        {/* ERROR SCREEN */}
        {errorMessage && (
          <div className="p-8 text-center space-y-4">
            <div className="text-red-500 text-5xl">⚠️</div>
            <h3 className="text-lg font-bold text-white">Falha ao analisar a planilha</h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">{errorMessage}</p>
            <button
              onClick={onClose}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Fechar e Tentar Novamente
            </button>
          </div>
        )}

        {/* LOADING ANIMATION */}
        {!errorMessage && isAnalyzing && step !== "result" && (
          <div className="flex-grow flex flex-col items-center justify-center p-12 space-y-4 bg-zinc-950/80">
            <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-400 font-medium animate-pulse">Processando dados e aplicando inteligência artificial...</p>
          </div>
        )}

        {/* MAIN BODY */}
        {!errorMessage && (!isAnalyzing || step === "result") && (
          <div className="flex-grow overflow-y-auto p-6 space-y-6">
            
            {/* STEP 1: COLUMN MAPPING */}
            {step === "mapping" && (
              <div className="space-y-4">
                <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl">
                  <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                    💡 Dica do Sistema
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    O sistema tentou mapear as colunas da planilha automaticamente com base no nome de cada cabeçalho.
                    Revise os mapeamentos abaixo e ajuste se for necessário antes de seguir para a prévia.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {targetFields.map((field) => {
                    const isMapped = !!mapping[field.key];
                    return (
                      <div
                        key={field.key}
                        className={`p-4 rounded-2xl border transition-all ${
                          field.required && !isMapped
                            ? "bg-red-950/10 border-red-900/30"
                            : "bg-zinc-900/20 border-zinc-900"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-sm font-bold text-white flex items-center gap-1.5">
                              {field.label}
                              {field.required && (
                                <span className="text-red-500 font-bold text-xs" title="Obrigatório">*</span>
                              )}
                            </span>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{field.desc}</p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <select
                            value={mapping[field.key] || ""}
                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                            className="w-full bg-neutral-905 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:ring-1 focus:ring-gold"
                          >
                            <option value="">-- Ignorar este campo --</option>
                            {headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: PREVIEW */}
            {step === "preview" && (
              <div className="space-y-6">
                {/* KPI SUMMARY CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Novos Produtos</span>
                    <span className="text-2xl font-black text-emerald-500 mt-1 block">{stats?.new || 0}</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Serão inseridos no catálogo</span>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Produtos a Atualizar</span>
                    <span className="text-2xl font-black text-blue-400 mt-1 block">{stats?.update || 0}</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Produtos duplicados identificados</span>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Campos Faltando / Alertas</span>
                    <span className="text-2xl font-black text-amber-500 mt-1 block">{stats?.warning || 0}</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Auto-preenchidos ou avisos</span>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-2xl">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Erros Impeditivos</span>
                    <span className="text-2xl font-black text-red-500 mt-1 block">{stats?.error || 0}</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Linhas que serão descartadas</span>
                  </div>
                </div>

                {/* TAB SELECTOR */}
                <div className="flex border-b border-zinc-900">
                  <button
                    onClick={() => setActiveTab("new")}
                    className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === "new"
                        ? "border-emerald-500 text-white"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Novos ({stats?.new || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("update")}
                    className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === "update"
                        ? "border-blue-400 text-white"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Atualizações ({stats?.update || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("error")}
                    className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === "error"
                        ? "border-red-500 text-white"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Erros & Alertas ({ (stats?.error || 0) + (stats?.warning > 0 ? processedRows.filter(r => r.warnings.length > 0).length : 0) })
                  </button>
                </div>

                {/* TAB CONTENT TABLES */}
                <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950">
                  <div className="max-h-[350px] overflow-auto">
                    {filteredRows.length === 0 ? (
                      <div className="p-10 text-center text-zinc-500 text-xs italic">
                        Nenhum produto nesta categoria.
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-zinc-900">
                        <thead className="bg-zinc-900/50 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left w-12">Linha</th>
                            <th className="px-4 py-3 text-left">Produto</th>
                            <th className="px-4 py-3 text-left">Marca / Categoria</th>
                            {activeTab === "new" && (
                              <>
                                <th className="px-4 py-3 text-right">Preço Sugerido</th>
                                <th className="px-4 py-3 text-right">Preço Lojista</th>
                                <th className="px-4 py-3 text-right">Custo USD</th>
                                <th className="px-4 py-3 text-right">Cotação</th>
                                <th className="px-4 py-3 text-right">Custo Real</th>
                                <th className="px-4 py-3 text-center">Estoque</th>
                              </>
                            )}
                            {activeTab === "update" && (
                              <>
                                <th className="px-4 py-3 text-left">Preços & Estoque (Alterações Detectadas)</th>
                              </>
                            )}
                            {activeTab === "error" && (
                              <th className="px-4 py-3 text-left">Problemas Encontrados</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900 text-xs">
                          {filteredRows.map((row) => (
                            <tr key={row.index} className="hover:bg-zinc-900/20 transition-colors">
                              <td className="px-4 py-3.5 font-bold text-zinc-500">#{row.index}</td>
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-white">{row.mappedData.nome || "(Sem nome)"}</div>
                                <div className="text-[10px] text-zinc-500 mt-0.5">
                                  Vol: {row.mappedData.volume || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="font-medium">{row.mappedData.marca}</div>
                                <span className="inline-block px-2 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 mt-1">
                                  {row.mappedData.categoria}
                                </span>
                              </td>
                              
                              {/* NEW PRODUCT VALUES */}
                              {activeTab === "new" && (
                                <>
                                  <td className="px-4 py-3.5 text-right font-bold text-white">{formatCurrency(row.mappedData.precoSugerido)}</td>
                                  <td className="px-4 py-3.5 text-right font-medium text-indigo-400">{formatCurrency(row.mappedData.precoLojista)}</td>
                                  <td className="px-4 py-3.5 text-right text-zinc-400">
                                    {row.mappedData.custoDolar ? `U$ ${row.mappedData.custoDolar.toFixed(2)}` : "-"}
                                  </td>
                                  <td className="px-4 py-3.5 text-right text-zinc-400">
                                    {row.mappedData.cotacaoDolar ? `${row.mappedData.cotacaoDolar.toFixed(2)}` : "-"}
                                  </td>
                                  <td className="px-4 py-3.5 text-right text-zinc-300 font-semibold">{formatCurrency(row.mappedData.precoCusto)}</td>
                                  <td className="px-4 py-3.5 text-center">
                                    <div className="font-bold">{row.mappedData.estoqueGeral} un</div>
                                    <div className="text-[10px] text-zinc-500">Lojista: {row.mappedData.estoqueLojista}</div>
                                  </td>
                                </>
                              )}

                              {/* UPDATE PRODUCT DIFFS */}
                              {activeTab === "update" && (
                                <td className="px-4 py-3.5">
                                  <div className="space-y-1.5">
                                    {Object.keys(row.diff).length === 0 ? (
                                      <span className="text-[10px] text-zinc-500 italic">Nenhuma mudança de valor detectada (estoque e preços idênticos)</span>
                                    ) : (
                                      Object.entries(row.diff).map(([key, value]: [string, any]) => {
                                        const label = 
                                          key === "precoSugerido" ? "Preço Sugerido" :
                                          key === "precoLojista" ? "Preço Lojista" :
                                          key === "precoCusto" ? "Preço Custo" :
                                          key === "custoDolar" ? "Custo USD" :
                                          key === "cotacaoDolar" ? "Cotação" :
                                          key === "estoqueGeral" ? "Estoque Geral" : "Estoque Lojista";
                                        const isMoney = key.startsWith("preco") || key === "custoDolar";
                                        const isDolar = key === "custoDolar";
                                        return (
                                          <div key={key} className="flex items-center gap-2 text-[11px]">
                                            <span className="font-semibold text-zinc-400">{label}:</span>
                                            <span className="text-red-400 line-through">
                                              {isMoney ? (isDolar ? `U$ ${value.old?.toFixed(2)}` : formatCurrency(value.old)) : `${value.old ?? 0} un`}
                                            </span>
                                            <span className="text-zinc-500">➔</span>
                                            <span className="text-emerald-400 font-bold">
                                              {isMoney ? (isDolar ? `U$ ${value.new?.toFixed(2)}` : formatCurrency(value.new)) : `${value.new} un`}
                                            </span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </td>
                              )}

                              {/* ERRORS & WARNINGS */}
                              {activeTab === "error" && (
                                <td className="px-4 py-3.5">
                                  <div className="space-y-1">
                                    {row.errors.map((err: string, idx: number) => (
                                      <div key={idx} className="text-red-400 font-medium flex items-center gap-1.5">
                                        <span className="text-xs">✕</span> {err}
                                      </div>
                                    ))}
                                    {row.warnings.map((warn: string, idx: number) => (
                                      <div key={idx} className="text-amber-500 font-medium flex items-center gap-1.5">
                                        <span className="text-xs">⚠</span> {warn}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: FINAL REPORT */}
            {step === "result" && finalReport && (
              <div className="space-y-6 text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-400 text-3xl font-bold mb-2">
                  ✓
                </div>
                <h3 className="text-2xl font-serif font-black text-white">Importação Concluída com Sucesso!</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  A planilha foi processada com sucesso. Os dados no catálogo e estoque foram atualizados.
                </p>

                <div className="max-w-md mx-auto bg-zinc-900/30 border border-zinc-900 rounded-3xl p-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Novos</span>
                    <span className="text-xl font-black text-emerald-400 mt-1 block">{finalReport.summary.created}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Atualizados</span>
                    <span className="text-xl font-black text-blue-400 mt-1 block">{finalReport.summary.updated}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Descartados</span>
                    <span className="text-xl font-black text-red-400 mt-1 block">{finalReport.summary.ignored}</span>
                  </div>
                </div>

                <div className="max-w-lg mx-auto bg-zinc-950 border border-zinc-900 rounded-2xl p-4 text-left">
                  <div className="flex justify-between items-center text-xs border-b border-zinc-900 pb-2 mb-2">
                    <span className="font-bold text-zinc-400">Relatório Registrado</span>
                    <span className="font-mono text-zinc-500">{finalReport.reportFilename}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 leading-relaxed">
                    Você pode encontrar este arquivo JSON no diretório de dados local (<code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-400">.data/import-reports/</code>) contendo o log completo de cada linha e o respectivo diff efetuado no banco.
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* MODAL FOOTER */}
        <footer className="p-6 border-t border-zinc-900 bg-zinc-900/10 flex justify-between items-center">
          <div>
            {step === "mapping" && (
              <p className="text-[11px] text-zinc-500 leading-relaxed max-w-sm hidden sm:block">
                Campos obrigatórios sem correspondência impedirão a importação.
              </p>
            )}
            {step === "preview" && (
              <p className="text-[11px] text-zinc-500 leading-relaxed max-w-sm hidden sm:block">
                Revise os dados cuidadosamente. Nenhuma alteração foi gravada ainda.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {step === "mapping" && (
              <>
                <button
                  onClick={onClose}
                  className="bg-neutral-900 border border-zinc-800 hover:bg-zinc-800 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-zinc-300 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep("preview")}
                  disabled={!mapping["nome"] || !mapping["precoCusto"] || !mapping["precoLojista"] || !mapping["precoSugerido"]}
                  className={`px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-black transition-all cursor-pointer ${
                    !mapping["nome"] || !mapping["precoCusto"] || !mapping["precoLojista"] || !mapping["precoSugerido"]
                      ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                      : "bg-gold hover:bg-white active:scale-95"
                  }`}
                >
                  Ver Prévia da Importação
                </button>
              </>
            )}

            {step === "preview" && (
              <>
                <button
                  onClick={() => setStep("mapping")}
                  disabled={isImporting}
                  className="bg-neutral-900 border border-zinc-800 hover:bg-zinc-800 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-zinc-300 transition-all cursor-pointer disabled:opacity-50"
                >
                  Voltar ao Mapeamento
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className={`bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
                    isImporting ? "opacity-50 cursor-wait" : "active:scale-95"
                  }`}
                >
                  {isImporting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processando...
                    </>
                  ) : (
                    "Confirmar Importação"
                  )}
                </button>
              </>
            )}

            {step === "result" && (
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="bg-gold hover:bg-white text-black px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Concluir
              </button>
            )}
          </div>
        </footer>

      </div>
    </div>
  );
}
