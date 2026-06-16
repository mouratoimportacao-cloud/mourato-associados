"use client";

import { useState } from "react";

export default function BuscaExternaWidget() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-luxury-gold">Pesquisa Direta</span>
          <h2 className="mt-2 text-2xl font-black text-gray-900">Busca Externa de Preços</h2>
          <p className="mt-1 text-sm text-gray-500">Digite o nome do perfume para comparar preços reais no Google Shopping e Mercado Livre.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do perfume (ex: Sauvage Dior, Yara Lattafa...)"
              className="w-full rounded-2xl border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold px-5 py-4 border transition-all text-sm pr-12 text-gray-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <a
              href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchTerm.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!searchTerm.trim()) {
                  e.preventDefault();
                  alert("Por favor, digite o nome do produto para buscar.");
                }
              }}
              className="bg-luxury-black border border-luxury-black shadow-sm px-6 py-4 rounded-xl font-bold text-white text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 text-center"
            >
              🔍 Comparar no Google Shopping
            </a>
            <a
              href={`https://lista.mercadolivre.com.br/${encodeURIComponent(searchTerm.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!searchTerm.trim()) {
                  e.preventDefault();
                  alert("Por favor, digite o nome do produto para buscar.");
                }
              }}
              className="bg-white border border-gray-200 shadow-sm px-6 py-4 rounded-xl font-bold text-gray-700 text-xs uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 text-center"
            >
              📦 Consultar no Mercado Livre
            </a>
          </div>
        </div>
      </form>
    </div>
  );
}
