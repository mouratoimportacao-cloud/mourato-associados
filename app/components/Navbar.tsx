import Link from "next/link";
import { Suspense } from "react";
import { getSocialLinks } from "../../lib/site-config";
import CarrinhoButton from "./CarrinhoButton";
import CarrinhoWidget from "./CarrinhoWidget";
import NavbarBusca from "./NavbarBusca";
import NavbarCategorias from "./NavbarCategorias";

export default async function Navbar() {
  const socialLinks = await getSocialLinks();
  const socials = [
    { label: "Facebook", icon: "/social/facebook.svg", href: socialLinks.facebook },
    { label: "Instagram", icon: "/social/instagram.svg", href: socialLinks.instagram },
    { label: "WhatsApp", icon: "/social/whatsapp.svg", href: socialLinks.whatsapp },
    { label: "X", icon: "/social/x.svg", href: socialLinks.x },
    { label: "TikTok", icon: "/social/tiktok.svg", href: socialLinks.tiktok },
  ];

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 bg-white/98 backdrop-blur-md flex flex-col">
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 bg-[#0A0A0A]">
        {/* Linha Principal (Amazon Style) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-6 py-1.5 md:py-5 min-h-12 md:min-h-[100px]">
          
          {/* Logo Mourato & Associados */}
          <div className="flex justify-between items-center w-full md:w-auto flex-shrink-0">
            <Link
              href="/"
              className="flex items-center transition-all duration-300"
            >
              <img src="/brand/logomarca1.png" alt="Mourato & Associados" className="h-10 sm:h-[60px] md:h-[70px] w-auto rounded-full" />
            </Link>

            {/* Mobile Actions: Carrinho */}
            <div className="flex md:hidden items-center gap-2">
              <CarrinhoButton />
            </div>
          </div>

          {/* Barra de Busca Centralizada (Ocupa ~50% no Desktop) */}
          <div className="w-full md:flex-grow md:max-w-sm lg:max-w-md">
            <Suspense fallback={<div className="h-10 bg-zinc-800 rounded-full w-full animate-pulse border border-zinc-600" />}>
              <NavbarBusca />
            </Suspense>
          </div>

          {/* Ações e Redes Sociais no Desktop */}
          <div className="hidden md:flex items-center justify-end gap-3 flex-shrink-0">
            <Link
              href="/lojista"
              className="text-[10px] uppercase tracking-widest text-zinc-300 hover:text-gold transition-colors font-bold mr-1"
            >
              Área Lojista
            </Link>

            {/* Redes Sociais - Baixo Destaque */}
            <div className="flex items-center gap-1.5 mr-1">
              {socials.map((social) =>
                social.href ? (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    title={social.label}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-zinc-600 hover:border-gold bg-transparent p-2 transition-all hover:scale-105"
                  >
                    <img src={social.icon} alt="" className="h-full w-full object-contain hover:scale-105 transition-transform duration-300" />
                  </a>
                ) : null
              )}
            </div>

            <Link
              href="/admin"
              className="text-[9px] border border-zinc-600 text-zinc-400 px-2.5 py-1.5 uppercase tracking-wider hover:bg-gold hover:text-black hover:border-gold transition-all font-bold rounded opacity-50 hover:opacity-100"
            >
              Admin
            </Link>

            <CarrinhoButton />
          </div>

        </div>
      </div>

      {/* Linha Inferior: Categorias */}
      <Suspense fallback={<div className="h-[40px] bg-[#0A0A0A] border-t border-zinc-800 w-full animate-pulse" />}>
        <NavbarCategorias />
      </Suspense>

      </nav>
      <CarrinhoWidget />
    </>
  );
}
