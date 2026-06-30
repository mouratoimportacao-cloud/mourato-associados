import Link from "next/link";
import { Suspense } from "react";
import { getSocialLinks } from "../../lib/site-config";
import TopVendidos from "./TopVendidos";

export default async function Footer() {
  const socialLinks = await getSocialLinks();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(socialLinks.siteUrl)}`;
  const socials = [
    { label: "Facebook", icon: "/social/facebook.svg", href: socialLinks.facebook },
    { label: "Instagram", icon: "/social/instagram.svg", href: socialLinks.instagram },
    { label: "WhatsApp", icon: "/social/whatsapp.svg", href: socialLinks.whatsapp },
    { label: "X", icon: "/social/x.svg", href: socialLinks.x },
    { label: "TikTok", icon: "/social/tiktok.svg", href: socialLinks.tiktok },
  ].filter((s) => s.href);

  return (
    <footer className="bg-black text-white py-16 border-t border-gold/10">
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">

          {/* Coluna 1: Logo + descrição */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <img
              src="/brand/logo-ma.png"
              alt="Mourato & Associados"
              className="h-16 sm:h-20 w-auto object-contain mb-4"
            />
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed font-light">
              Redefinindo o conceito de luxo e sofisticação em perfumaria e cuidados pessoais.
            </p>

            {/* Redes Sociais */}
            {socials.length > 0 && (
              <div className="flex gap-2.5 mt-6">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    title={social.label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full social-embossed p-2"
                  >
                    <img src={social.icon} alt="" className="h-full w-full object-contain" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Coluna 2: Links */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-5 text-luxury-gold">
              Explorar
            </h3>
            <ul className="space-y-3 text-sm text-gray-400 font-light">
              <li>
                <Link href="/produtos" className="hover:text-luxury-gold transition-colors">
                  Catálogo Completo
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-luxury-gold transition-colors">
                  Entrar (Admin / Lojista)
                </Link>
              </li>
              <li>
                <Link href="/lojista/cadastro" className="hover:text-luxury-gold transition-colors">
                  Cadastro de Lojista
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: QR Code — Ponto de Venda */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-5 text-luxury-gold">
              Compre Aqui
            </h3>
            <div className="inline-block rounded-xl border border-luxury-gold/30 bg-neutral-900/80 p-4 shadow-[0_0_20px_rgba(197,160,40,0.08)]">
              <img
                src={qrUrl}
                alt="QR Code — Escaneie para comprar"
                className="h-28 w-28 object-contain filter invert"
              />
            </div>
            <p className="mt-3 text-[10px] text-gray-400 max-w-[10rem] leading-relaxed">
              Escaneie com a câmera e compre direto pelo catálogo digital
            </p>
          </div>
        </div>

        {/* Top 5 Mais Vendidos */}
        <Suspense fallback={<div className="border-t border-white/5 mt-12 pt-10 pb-6 animate-pulse"><div className="h-48 bg-neutral-900 rounded-xl"></div></div>}>
          <TopVendidos />
        </Suspense>
      </div>
    </footer>
  );
}
