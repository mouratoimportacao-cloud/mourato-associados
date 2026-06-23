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
      <nav className="fixed left-0 right-0 top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gold/15 flex flex-col">
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16">
        {/* Linha Principal (Amazon Style) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 py-3 min-h-20">
          
          {/* Logo Mourato & Associados */}
          <div className="flex justify-between items-center w-full md:w-auto flex-shrink-0">
            <Link
              href="/"
              className="block transition-all duration-300"
            >
              <img
                src="/brand/logo-ma.png"
                alt="Mourato & Associados"
                className="h-10 sm:h-12 w-auto object-contain brand-logo-relief"
              />
            </Link>

            {/* Mobile Actions: Carrinho e Redes Sociais */}
            <div className="flex md:hidden items-center gap-2">
              <div className="flex items-center gap-1">
                {socials.slice(0, 3).map((social) =>
                  social.href ? (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      title={social.label}
                      className="h-6 w-6 inline-flex items-center justify-center rounded-full social-embossed p-1"
                    >
                      <img src={social.icon} alt="" className="h-full w-full object-contain" />
                    </a>
                  ) : null
                )}
              </div>
              <CarrinhoButton />
            </div>
          </div>

          {/* Barra de Busca Centralizada (Ocupa ~50% no Desktop) */}
          <div className="w-full md:flex-grow md:max-w-xl lg:max-w-2xl">
            <Suspense fallback={<div className="h-10 bg-neutral-900 rounded-full w-full animate-pulse border border-zinc-800" />}>
              <NavbarBusca />
            </Suspense>
          </div>

          {/* Ações e Redes Sociais no Desktop */}
          <div className="hidden md:flex items-center justify-end gap-3 flex-shrink-0">
            <Link
              href="/lojista"
              className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-gold transition-colors font-bold mr-1"
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
                    className="h-8 w-8 inline-flex items-center justify-center rounded-full social-embossed p-2"
                  >
                    <img src={social.icon} alt="" className="h-full w-full object-contain hover:scale-105 transition-transform duration-300" />
                  </a>
                ) : null
              )}
            </div>

            <Link
              href="/admin"
              className="text-[9px] border border-gold/30 text-gold px-2.5 py-1.5 uppercase tracking-wider hover:bg-gold hover:text-black transition-all font-bold rounded"
            >
              Restrito
            </Link>

            <CarrinhoButton />
          </div>

        </div>
      </div>

      {/* Linha Inferior: Categorias */}
      <Suspense fallback={<div className="h-[40px] bg-neutral-950/90 border-t border-zinc-900/60 w-full animate-pulse" />}>
        <NavbarCategorias />
      </Suspense>

      </nav>
      <CarrinhoWidget />
    </>
  );
}
