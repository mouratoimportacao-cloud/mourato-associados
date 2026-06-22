"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const CATEGORIAS = [
  { label: "Ver Todos", value: "todos" },
  { label: "Masculinos", value: "Masculino" },
  { label: "Femininos", value: "Feminino" },
  { label: "Árabes", value: "Perfume Árabe" },
  { label: "Cosméticos", value: "Cosmético" },
  { label: "Kits & Presentes", value: "Kits" },
  { label: "Promoções", value: "Promoções" },
];

export default function NavbarCategorias() {
  const [activeCategory, setActiveCategory] = useState("todos");
  const pathname = usePathname();
  const router = useRouter();

  // Escuta se a categoria for redefinida externamente
  useEffect(() => {
    const handleCategoryReset = (e: Event) => {
      setActiveCategory((e as CustomEvent<string>).detail || "todos");
    };
    window.addEventListener("category-reset", handleCategoryReset);
    return () => window.removeEventListener("category-reset", handleCategoryReset);
  }, []);

  const handleCategorySelect = (value: string) => {
    setActiveCategory(value);

    // Se o usuário não estiver nas páginas de catálogo, redireciona primeiro
    const isCatalogPage = pathname === "/produtos" || pathname.startsWith("/r/");
    if (!isCatalogPage) {
      router.push(`/produtos`);
      // Espera um pouco para disparar o evento após a navegação
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("category-changed", { detail: value }));
      }, 300);
    } else {
      window.dispatchEvent(new CustomEvent("category-changed", { detail: value }));
    }
  };

  return (
    <div className="w-full bg-neutral-950/90 border-t border-zinc-900/60 overflow-x-auto scrollbar-none scroll-smooth">
      <div className="max-w-7xl mx-auto flex items-center gap-6 sm:gap-8 px-4 sm:px-8 py-2.5 whitespace-nowrap min-h-[40px] justify-start md:justify-center">
        {CATEGORIAS.map((cat) => {
          const isActive = activeCategory === cat.value;
          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => handleCategorySelect(cat.value)}
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 pb-0.5 cursor-pointer hover:text-gold ${
                isActive
                  ? "text-gold border-b border-gold font-extrabold"
                  : "text-zinc-400"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
