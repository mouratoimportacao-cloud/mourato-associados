"use client";

import { useState, useTransition } from "react";
import FormProduto from "./FormProduto";
import ListaProdutos from "./ListaProdutos";
import { importarProdutosPlanilha } from "../actions";

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

export default function GerenciadorProdutos({ produtos }: { produtos: any[] }) {
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporting, startImportTransition] = useTransition();

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

    if (!window.confirm("Deseja realmente atualizar o estoque e preços dos produtos usando as informações desta planilha?")) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];

      startImportTransition(async () => {
        try {
          const res = await importarProdutosPlanilha(base64Data);
          if (res.success) {
            let msg = `Planilha processada com sucesso!\n\n- Produtos atualizados: ${res.updatedCount}\n- Linhas ignoradas: ${res.ignoredCount}`;
            if (res.warnings && res.warnings.length > 0) {
              msg += `\n\nAlertas:\n${res.warnings.slice(0, 5).join("\n")}`;
              if (res.warnings.length > 5) msg += `\n...e mais ${res.warnings.length - 5} alertas.`;
            }
            alert(msg);
          } else {
            alert("Erro na importação: " + res.error);
          }
        } catch (err: any) {
          alert("Erro catastrófico ao importar: " + err.message);
        } finally {
          event.target.value = "";
        }
      });
    };
    reader.onerror = () => {
      alert("Erro ao ler o arquivo.");
      event.target.value = "";
    };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Janela de estoque</h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Role a lista sem perder os botões de ação</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <label className={`relative flex items-center justify-center bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-colors cursor-pointer ${isImporting ? 'opacity-50 cursor-wait' : ''}`}>
            <span>{isImporting ? "Importando..." : "Importar Planilha"}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.ods,.csv"
              disabled={isImporting}
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
            className="bg-luxury-black text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-luxury-gold transition-colors"
          >
            Novo Produto
          </button>
        </div>
      </div>

      <div>
        <ListaProdutos produtos={produtos} onEditProduct={handleEdit} />
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
            <FormProduto editingProduto={editingProduto} onCancelEdit={handleCancel} />
          </div>
        </div>
      )}
    </div>
  );
}
