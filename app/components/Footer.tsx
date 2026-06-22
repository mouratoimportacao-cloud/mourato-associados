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
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 py-8">
        {/* Logo topo */}
        <div className="mb-5">
          <h2 className="text-lg font-serif font-black brand-text-relief-gold">
            MOURATO & ASSOCIADOS
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1">
            Curadoria exclusiva de perfumes de nicho, cosméticos e skincare premium.
          </p>
        </div>

        {/* 3 colunas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 items-start">
          {/* Links */}
          <div>
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-gold mb-2">Navegação</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
              <Link href="/produtos" className="hover:text-gold transition-colors">Catálogo</Link>
              <Link href="/lojista" className="hover:text-gold transition-colors">Área do Lojista</Link>
              <Link href="/lojista/cadastro" className="hover:text-gold transition-colors">Seja um Revendedor</Link>
            </div>
          </div>

          {/* Contato + Redes */}
          <div>
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-gold mb-2">Contato</h3>
            <div className="flex gap-2 mb-2">
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
            </div>
            {socialLinks.whatsapp && (
              <a href="https://wa.me/5511978990034" target="_blank" rel="noopener noreferrer" className="text-[11px] text-zinc-400 hover:text-gold transition-colors">
                Fale conosco via WhatsApp
              </a>
            )}
          </div>

          {/* QR Code */}
          <div className="col-span-2 sm:col-span-1 flex justify-center sm:justify-end">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="rounded-xl border border-gold/30 bg-white p-2 shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(socialLinks.siteUrl)}`}
                  alt="QR Code"
                  className="h-20 w-20 object-contain"
                />
              </div>
              <p className="text-[9px] text-zinc-400 text-center sm:text-left sm:max-w-[80px] leading-tight">Escaneie para acessar o catálogo</p>
            </div>
          </div>
        </div>

        {/* Copyright + Confiança */}
        <div className="border-t border-zinc-800 mt-6 pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] text-zinc-400">
              <span className="border border-gold/20 rounded px-2 py-1">✓ Garantia de Autenticidade</span>
              <span className="border border-gold/20 rounded px-2 py-1">✓ Produto 100% Original</span>
            </div>
            <p className="text-[10px] text-zinc-500">
              © 2026 Mourato & Associados. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
