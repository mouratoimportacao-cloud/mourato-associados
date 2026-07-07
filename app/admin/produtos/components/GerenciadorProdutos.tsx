"use client";

import { useState } from "react";
import FormProduto from "./FormProduto";
import ListaProdutos from "./ListaProdutos";
import ImportPreviewModal from "./ImportPreviewModal";
import { updateProduto } from "../actions";

interface Produto {
  id: number;
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
}

export default function GerenciadorProdutos({
  produtos,
  pendentePorProduto,
}: {
  produtos: any[];
  pendentePorProduto?: Record<number, { qtd: number; saldo: number; lojistas: string[] }>;
}) {
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [importBase64, setImportBase64] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [produtoEntrada, setProdutoEntrada] = useState<any | null>(null);
  const [qtdEntrada, setQtdEntrada] = useState("");
  const [salvandoEntrada, setSalvandoEntrada] = useState(false);

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setEditingProduto(null);
    setIsFormOpen(false);
  };

  const handleConfirmarEntrada = async () => {
    if (!produtoEntrada || !qtdEntrada) return;
    const qtd = parseInt(qtdEntrada);
    if (isNaN(qtd) || qtd <= 0) { alert("Quantidade inválida."); return; }
    setSalvandoEntrada(true);
    const formData = new FormData();
    formData.set("nome", produtoEntrada.nome);
    formData.set("marca", produtoEntrada.marca);
    formData.set("categoria_principal", produtoEntrada.categoria_principal || produtoEntrada.categoria || "Perfume");
    formData.set("volume", produtoEntrada.volume);
    formData.set("preco", String(produtoEntrada.preco || 0));
    formData.set("precoAtacado", String(produtoEntrada.precoAtacado || 0));
    formData.set("estoque", String((produtoEntrada.estoque || 0) + qtd));
    formData.set("estoqueLojista", String(produtoEntrada.estoqueLojista || 0));
    formData.set("descricao", produtoEntrada.descricao || "");
    const res = await updateProduto(produtoEntrada.id, formData);
    setSalvandoEntrada(false);
    if (res.success) {
      alert(`+${qtd} un. adicionadas a "${produtoEntrada.nome}". Novo estoque: ${(produtoEntrada.estoque || 0) + qtd}`);
      setProdutoEntrada(null);
      setQtdEntrada("");
    } else {
      alert(res.error || "Erro ao atualizar estoque.");
    }
  };

  const handleImportPlanilha = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      setImportBase64(base64Data);
      setIsReadingFile(false);
      event.target.value = ""; // Reset file input
    };
    reader.onerror = () => {
      alert("Erro ao ler o arquivo.");
      setIsReadingFile(false);
      event.target.value = "";
    };
  };

  return (
    <div className="admin-produtos-manager space-y-2">
      <div className="admin-produtos-toolbar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-800">Janela de estoque</h2>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">Role a lista sem perder os botões de ação</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <label className={`relative flex items-center justify-center bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-colors cursor-pointer ${isReadingFile ? 'opacity-50 cursor-wait' : ''}`}>
            <span>{isReadingFile ? "Lendo arquivo..." : "Importar Planilha"}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.ods,.csv"
              disabled={isReadingFile}
              onChange={handleImportPlanilha}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setEditingProduto(null);
              setIsFormOpen(true);
            }}
            className="bg-luxury-black text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-luxury-gold transition-colors"
          >
            Novo Produto
          </button>
        </div>
      </div>

      <div className="admin-produtos-list-wrap">
        <ListaProdutos produtos={produtos} onEditProduct={handleEdit} onEntradaEstoque={(p: any) => setProdutoEntrada(p)} pendentePorProduto={pendentePorProduto} />
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm p-4 flex items-start justify-center overflow-y-auto">
          <div className="w-full max-w-4xl my-6">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-700 shadow hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>
            <FormProduto key={editingProduto ? editingProduto.id : 'new'} editingProduto={editingProduto} onCancelEdit={handleCancel} todosProdutos={produtos} />
          </div>
        </div>
      )}

      {importBase64 && (
        <ImportPreviewModal
          base64Data={importBase64}
          onClose={() => setImportBase64(null)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* Entrada de estoque inline - aparece acima da lista */}
      {produtoEntrada && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm p-4 flex items-start justify-center overflow-y-auto">
          <div className="w-full max-w-md my-6 bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Entrada de Estoque</h3>
              <button onClick={() => { setProdutoEntrada(null); setQtdEntrada(""); }} className="text-gray-400 hover:text-gray-700 text-xl cursor-pointer">✕</button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Produto</p>
              <p className="text-lg font-bold text-gray-800">#{produtoEntrada.codigo ?? produtoEntrada.id} — {produtoEntrada.nome}</p>
              <p className="text-sm text-gray-600">{produtoEntrada.marca} · {produtoEntrada.volume}</p>
              <p className="text-sm text-gray-600 mt-1">Estoque atual: <strong>{produtoEntrada.estoque}</strong> un.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Quantidade a adicionar</label>
              <input
                type="number"
                min="1"
                value={qtdEntrada}
                onChange={(e) => setQtdEntrada(e.target.value)}
                autoFocus
                placeholder="Ex: 5"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              {qtdEntrada && parseInt(qtdEntrada) > 0 && (
                <p className="text-xs text-green-600 font-semibold">Novo estoque: {(produtoEntrada.estoque || 0) + parseInt(qtdEntrada)} un.</p>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setProdutoEntrada(null); setQtdEntrada(""); }} className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">← Voltar</button>
              <button type="button" onClick={handleConfirmarEntrada} disabled={salvandoEntrada || !qtdEntrada || parseInt(qtdEntrada) <= 0} className="flex-1 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
                {salvandoEntrada ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
