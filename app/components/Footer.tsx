import Link from "next/link";
import { getSocialLinks } from "../../lib/site-config";

export default async function Footer() {
  const socialLinks = await getSocialLinks();
  const socials = [
    { label: "Instagram", icon: "/social/instagram.svg", href: socialLinks.instagram },
    { label: "WhatsApp", icon: "/social/whatsapp.svg", href: socialLinks.whatsapp },
    { label: "Facebook", icon: "/social/facebook.svg", href: socialLinks.facebook },
    { label: "TikTok", icon: "/social/tiktok.svg", href: socialLinks.tiktok },
  ];

  return (
    <footer className="bg-[#1A1A1A] text-white border-t border-gold/20">
      {/* Logo — full width */}
      <div className="flex flex-col items-center bg-[#0A0A0A] py-6">
        <img src="/brand/logomarca1.png" alt="Mourato & Associados" className="h-24 sm:h-28 w-auto rounded-full mb-3" />
        <p className="text-[11px] text-zinc-400 text-center max-w-sm">
          Curadoria exclusiva de perfumes de nicho, cosméticos e skincare premium.
        </p>
      </div>

      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 py-10 bg-[#0A0A0A]">

        {/* Links + Redes + QR Code */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-zinc-800 pt-6">
          {/* Links */}
          <div className="flex flex-wrap justify-center gap-4 text-[11px] text-zinc-400">
            <Link href="/produtos" className="hover:text-gold transition-colors">Catálogo</Link>
            <Link href="/lojista" className="hover:text-gold transition-colors">Área do Lojista</Link>
            <Link href="/lojista/cadastro" className="hover:text-gold transition-colors">Seja um Revendedor</Link>
          </div>

          {/* Redes sociais */}
          <div className="flex items-center gap-2">
            {socials.map((social) =>
              social.href ? (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-zinc-700 hover:border-gold bg-[#111] p-1.5 transition-all hover:scale-105"
                >
                  <img src={social.icon} alt="" className="h-full w-full object-contain" />
                </a>
              ) : null
            )}
            <a href="https://wa.me/5511978990034" target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-400 hover:text-gold transition-colors ml-2">
              WhatsApp
            </a>
          </div>

          {/* QR Code */}
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-gold/30 bg-white p-1.5 shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(socialLinks.siteUrl)}`}
                alt="QR Code"
                className="h-14 w-14 object-contain"
              />
            </div>
            <p className="text-[9px] text-zinc-400 max-w-[70px] leading-tight">Escaneie para acessar</p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-zinc-800 mt-6 pt-4 text-center">
          <p className="text-[10px] text-zinc-500">
            © 2026 Mourato & Associados. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
