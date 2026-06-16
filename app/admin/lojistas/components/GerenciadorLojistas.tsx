"use client";

import { useState } from "react";
import FormLojista from "./FormLojista";
import ListaLojistas from "./ListaLojistas";

interface Lojista {
  id: number;
  nome: string;
  email: string;
  documento: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  status: string | null;
  tipo: string;
  createdAt: Date;
}

export default function GerenciadorLojistas({ lojistas }: { lojistas: Lojista[] }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Janela de lojistas</h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Cadastros e validações em uma lista com rolagem própria</p>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="bg-luxury-black text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-luxury-gold transition-colors"
        >
          Novo Lojista
        </button>
      </div>

      <ListaLojistas lojistas={lojistas} />

      {isFormOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm p-4 flex items-start justify-center overflow-y-auto">
          <div className="w-full max-w-3xl my-6">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-700 shadow hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>
            <FormLojista onSaved={() => setIsFormOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
