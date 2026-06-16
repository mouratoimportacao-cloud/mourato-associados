"use client";

import { useState } from "react";
import FormProduto from "./FormProduto";
import ListaProdutos from "./ListaProdutos";

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

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setEditingProduto(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Janela de estoque</h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Role a lista sem perder os botões de ação</p>
        </div>
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
