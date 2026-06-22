"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function NavbarBusca() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState(() => searchParams.get("busca") || "");

  // Envia evento de busca dinâmica ao digitar
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBusca(val);
    window.dispatchEvent(new CustomEvent("search-changed", { detail: val }));
  };

  // Trata envio do formulário (Enter ou clique no ícone)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isCatalogPage = pathname === "/produtos" || pathname.startsWith("/r/");
    if (!isCatalogPage) {
      router.push(`/produtos?busca=${encodeURIComponent(busca)}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex-grow max-w-lg md:max-w-xl mx-auto w-full group"
    >
      <input
        type="text"
        value={busca}
        onChange={handleChange}
        placeholder="Buscar perfume, marca, fragrância..."
        className="w-full h-9 sm:h-10 rounded-full border border-zinc-600 bg-zinc-800 px-4 sm:px-5 pr-10 sm:pr-12 text-[11px] sm:text-xs text-white placeholder-zinc-400 shadow-inner outline-none transition duration-300 focus:border-gold focus:ring-1 focus:ring-gold/30"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-gold/10 hover:bg-gold text-gold hover:text-black flex items-center justify-center transition-all duration-300 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    </form>
  );
}
