"use client";

import { useEffect, useState } from "react";

export default function CarrinhoButton() {
  const [mounted, setMounted] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  const updateCartCount = () => {
    try {
      const cartRaw = localStorage.getItem("ma-cart");
      if (cartRaw) {
        const cart = JSON.parse(cartRaw);
        if (Array.isArray(cart)) {
          const total = cart.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
          setItemCount(total);
          return;
        }
      }
      setItemCount(0);
    } catch (e) {
      console.error("Erro ao ler ma-cart:", e);
      setItemCount(0);
    }
  };

  useEffect(() => {
    setMounted(true);
    updateCartCount();

    window.addEventListener("cart-updated", updateCartCount);
    return () => {
      window.removeEventListener("cart-updated", updateCartCount);
    };
  }, []);

  const handleOpenCart = () => {
    window.dispatchEvent(new CustomEvent("open-cart"));
  };

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="h-10 px-3.5 inline-flex items-center gap-2 rounded-lg border border-zinc-900 bg-[#0D0D0D] text-[9px] sm:text-xs font-bold uppercase tracking-widest text-zinc-600 opacity-50 cursor-default"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="#555" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span>Carrinho</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpenCart}
      aria-label={`Carrinho de Compras, ${itemCount} itens`}
      title="Ver meu carrinho de compras"
      className="relative h-10 px-3.5 inline-flex items-center gap-2 rounded-lg border border-gold/15 hover:border-gold/60 bg-[#0D0D0D] hover:bg-gold/5 text-gold text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer shadow-md active:scale-95"
    >
      <div className="relative h-5 w-5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full object-contain"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-black text-white ring-1 ring-black">
            {itemCount}
          </span>
        )}
      </div>
      <span>Carrinho</span>
    </button>
  );
}
