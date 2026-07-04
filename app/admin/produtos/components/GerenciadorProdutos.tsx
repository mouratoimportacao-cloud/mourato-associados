"use client";

import { useState } from "react";
import FormProduto from "./FormProduto";
import ListaProdutos from "./ListaProdutos";
import ImportPreviewModal from "./ImportPreviewModal";

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

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setEditingProduto(null);
    setIsFormOpen(false);
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
        <ListaProdutos produtos={produtos} onEditProduct={handleEdit} pendentePorProduto={pendentePorProduto} />
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
            <FormProduto key={editingProduto ? editingProduto.id : 'new'} editingProduto={editingProduto} onCancelEdit={handleCancel} />
          </div>
        </div>
      )}

      {importBase64 && (
        <ImportPreviewModal
          base64Data={importBase64}
          onClose={() => setImportBase64(null)}
          onSuccess={() => {
            // Trigger a page reload to fetch the newly imported products
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
