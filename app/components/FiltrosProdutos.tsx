"use client";

import { useState, useEffect } from "react";

interface FiltrosState {
  origem: string;
  genero: string;
  concentracao: string;
  categoriaPrincipal: string;
  tags: string[];
  familiaOlfativa: string[];
  ocasiaoUso: string[];
}

interface FiltrosProdutosProps {
  theme?: "light" | "dark";
  onChange: (filtros: FiltrosState) => void;
}

const origens = ["Nacional", "Importado", "Árabe", "Inspirado"];
const generos = ["Masculino", "Feminino", "Unissex"];
const categorias = ["Perfume", "Cosmético", "Acessório", "Kit"];
const concentracoes = [
  "Body Splash",
  "Eau de Cologne",
  "Eau de Toilette (EDT)",
  "Eau de Parfum (EDP)",
  "Parfum",
  "Extrait de Parfum"
];
const familias = [
  "Oriental",
  "Amadeirado",
  "Aromático",
  "Floral",
  "Cítrico",
  "Gourmand",
  "Aquático",
  "Frutado",
  "Fougère",
  "Especiado"
];
const tags = [
  "Perfume Árabe",
  "Importado",
  "Feminino",
  "Masculino",
  "Unissex"
];
const ocasioes = ["Dia", "Noite", "Trabalho", "Academia", "Festa", "Encontro", "Verão", "Inverno"];

export default function FiltrosProdutos({ theme = "light", onChange }: FiltrosProdutosProps) {
  const [isOpen, setIsOpen] = useState(false);

  // States for each filter dimension
  const [origem, setOrigem] = useState("todos");
  const [genero, setGenero] = useState("todos");
  const [concentracao, setConcentracao] = useState("todos");
  const [categoriaPrincipal, setCategoriaPrincipal] = useState("todos");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFamilias, setSelectedFamilias] = useState<string[]>([]);
  const [selectedOcasioes, setSelectedOcasioes] = useState<string[]>([]);

  // Count active filters
  const activeCount =
    (origem !== "todos" ? 1 : 0) +
    (genero !== "todos" ? 1 : 0) +
    (concentracao !== "todos" ? 1 : 0) +
    (categoriaPrincipal !== "todos" ? 1 : 0) +
    selectedTags.length +
    selectedFamilias.length +
    selectedOcasioes.length;

  // Notify parent component on filter state change
  useEffect(() => {
    onChange({
      origem,
      genero,
      concentracao,
      categoriaPrincipal,
      tags: selectedTags,
      familiaOlfativa: selectedFamilias,
      ocasiaoUso: selectedOcasioes
    });
  }, [
    origem,
    genero,
    concentracao,
    categoriaPrincipal,
    selectedTags,
    selectedFamilias,
    selectedOcasioes
  ]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleToggleFamilia = (fam: string) => {
    setSelectedFamilias((prev) =>
      prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam]
    );
  };

  const handleToggleOcasiao = (oca: string) => {
    setSelectedOcasioes((prev) =>
      prev.includes(oca) ? prev.filter((o) => o !== oca) : [...prev, oca]
    );
  };

  const handleClearAll = () => {
    setOrigem("todos");
    setGenero("todos");
    setConcentracao("todos");
    setCategoriaPrincipal("todos");
    setSelectedTags([]);
    setSelectedFamilias([]);
    setSelectedOcasioes([]);
  };

  // Color classes mapping based on theme
  const containerClasses =
    theme === "dark"
      ? "bg-neutral-950 border border-zinc-900 rounded-2xl p-4 shadow-xl"
      : "bg-white border border-gray-250 rounded-2xl p-4 shadow-sm";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-zinc-400" : "text-gray-500";
  const bgInput = theme === "dark" ? "bg-neutral-900 border-zinc-800" : "bg-white border-gray-200";
  const selectTextColor = theme === "dark" ? "text-white" : "text-gray-700";
  const checkboxLabelColor = theme === "dark" ? "text-zinc-300" : "text-gray-600";
  const activeLabelBg = theme === "dark" ? "bg-zinc-900 border-zinc-800" : "bg-gray-100 border-gray-200";

  return (
    <div className={containerClasses}>
      {/* FILTER BAR HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest cursor-pointer hover:text-gold transition-colors ${textPrimary}`}
        >
          <span>🔍</span> Filtros Avançados
          {activeCount > 0 && (
            <span className="bg-gold text-black rounded-full px-2 py-0.5 text-[9px] font-black leading-none">
              {activeCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              theme === "dark"
                ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                : "bg-gray-100 border-gray-200 hover:bg-gray-250 text-gray-700"
            }`}
          >
            {isOpen ? "Ocultar Filtros" : "Mostrar Filtros"}
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE ACCORDION AREA */}
      {isOpen && (
        <div className="mt-5 pt-5 border-t border-zinc-900/60 dark:border-zinc-800/40 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* CATEGORIA PRINCIPAL */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${textSecondary}`}>
                Categoria
              </label>
              <select
                value={categoriaPrincipal}
                onChange={(e) => setCategoriaPrincipal(e.target.value)}
                className={`w-full text-xs font-semibold rounded-lg p-2 focus:ring-1 focus:ring-gold ${bgInput} ${selectTextColor}`}
              >
                <option value="todos">Todas as Categorias</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* CONCENTRAÇÃO */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${textSecondary}`}>
                Concentração
              </label>
              <select
                value={concentracao}
                onChange={(e) => setConcentracao(e.target.value)}
                className={`w-full text-xs font-semibold rounded-lg p-2 focus:ring-1 focus:ring-gold ${bgInput} ${selectTextColor}`}
              >
                <option value="todos">Todas as Concentrações</option>
                {concentracoes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {/* TAGS */}
            <label className={`text-[10px] font-bold uppercase tracking-wider block ${textSecondary}`}>
              Tags
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-3 bg-neutral-900/10 dark:bg-neutral-900/40 rounded-xl border border-zinc-900/40">
              {tags.map((tag) => {
                const checked = selectedTags.includes(tag);
                return (
                  <label key={tag} className="flex items-center gap-2 text-[11px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleTag(tag)}
                      className="h-3.5 w-3.5 rounded border-zinc-800 text-gold focus:ring-gold bg-zinc-950"
                    />
                    <span className={checked ? "font-bold text-gold" : checkboxLabelColor}>{tag}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
