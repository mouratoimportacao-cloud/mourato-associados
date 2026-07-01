"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/admin", icon: "🏠", label: "Dashboard" },
  { href: "/admin/produtos", icon: "📦", label: "Produtos" },
  { href: "/admin/lojistas", icon: "🏪", label: "Lojistas" },
  { href: "/admin/pedidos", icon: "🛒", label: "Pedidos" },
  { href: "/admin/leads", icon: "👥", label: "Leads" },
  { href: "/admin/radar", icon: "🎯", label: "Radar" },
  { href: "/admin/dre", icon: "💰", label: "Financeiro" },
  { href: "/admin/configurar", icon: "⚙️", label: "Configurar", external: true },
];

export default function AdminMobileHeader({ currentPath }: { currentPath: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between bg-gray-900 px-4 py-3 shadow-md">
        <Link href="/" className="flex items-center gap-2">
          <img src="/brand/logo-ma.png" alt="M&A" className="h-8 w-auto brightness-0 invert" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Admin</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col gap-1.5 p-2 cursor-pointer"
          aria-label="Abrir menu"
        >
          <span className="block h-0.5 w-6 bg-white rounded" />
          <span className="block h-0.5 w-6 bg-white rounded" />
          <span className="block h-0.5 w-4 bg-white rounded" />
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-[9999] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

          {/* Drawer */}
          <nav className="relative z-10 ml-auto w-72 h-full bg-gray-900 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Painel de Gestão</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {NAV_LINKS.map((link) => {
                const isActive = currentPath === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "bg-white/10 text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/10">
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white text-xs uppercase tracking-widest transition-colors"
              >
                ← Voltar ao Dashboard
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
