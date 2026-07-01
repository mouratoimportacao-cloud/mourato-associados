"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { slugify } from "../../lib/slug";
import OptimizedImage from "./OptimizedImage";

interface ProdutoPreview {
  id: number;
  nome: string;
  marca: string;
  preco: number | null;
  imagem: string | null;
}

export default function NavbarBusca() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState(() => searchParams.get("busca") || "");
  const [preview, setPreview] = useState<ProdutoPreview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fecha preview ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowPreview(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBusca(val);
    window.dispatchEvent(new CustomEvent("search-changed", { detail: val }));

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim() || val.trim().length < 2) {
      setPreview([]);
      setShowPreview(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val)}&preview=1`);
        if (res.ok) {
          const data = await res.json();
          setPreview(data.results || []);
          setShowPreview(true);
        }
      } catch {
        setPreview([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowPreview(false);
    if (!busca.trim()) return;
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(busca)}`);
      if (res.ok) {
        const { slug } = await res.json();
        router.push(`/produto/${slug}`);
        return;
      }
    } catch {}
    router.push(`/produtos?busca=${encodeURIComponent(busca)}`);
  };

  const handleSelectProduto = (produto: ProdutoPreview) => {
    setShowPreview(false);
    setBusca("");
    router.push(`/produto/${slugify(produto.nome)}`);
  };

  return (
    <div ref={wrapperRef} className="relative flex-grow max-w-lg md:max-w-xl mx-auto w-full">
      <form onSubmit={handleSubmit} className="relative group">
        <input
          type="text"
          value={busca}
          onChange={handleChange}
          onFocus={() => preview.length > 0 && setShowPreview(true)}
          placeholder="Buscar perfume, marca, fragrância..."
          style={{ fontSize: "16px" }}
          className="w-full h-10 rounded-full border border-zinc-800 bg-neutral-900 px-5 pr-12 text-base md:text-xs text-white placeholder-zinc-500 shadow-inner outline-none transition duration-300 focus:border-gold focus:ring-1 focus:ring-gold/30"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-gold/10 hover:bg-gold text-gold hover:text-black flex items-center justify-center transition-all duration-300 cursor-pointer"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
      </form>

      {/* Dropdown Preview */}
      {showPreview && preview.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-950 border border-zinc-800 rounded-2xl shadow-2xl z-[200] overflow-hidden">
          {preview.map((produto) => (
            <button
              key={produto.id}
              type="button"
              onClick={() => handleSelectProduto(produto)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-900 transition-colors text-left cursor-pointer border-b border-zinc-900 last:border-b-0"
            >
              <div className="relative h-10 w-8 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-neutral-900">
                <OptimizedImage
                  src={produto.imagem}
                  alt={produto.nome}
                  fill
                  sizes="32px"
                  className="object-cover"
                  fallbackText="M"
                />
              </div>
              <div className="flex-grow min-w-0">
                <p className="text-xs font-bold text-white truncate">{produto.nome}</p>
                <p className="text-[10px] text-zinc-500">{produto.marca}</p>
              </div>
              {produto.preco && (
                <span className="text-xs font-bold text-gold flex-shrink-0">
                  R$ {Number(produto.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setShowPreview(false); router.push(`/produtos?busca=${encodeURIComponent(busca)}`); }}
            className="w-full px-4 py-2.5 text-[10px] font-bold text-zinc-400 hover:text-gold text-center transition-colors cursor-pointer"
          >
            Ver todos os resultados para "{busca}" →
          </button>
        </div>
      )}
    </div>
  );
}
