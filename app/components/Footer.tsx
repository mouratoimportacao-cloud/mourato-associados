import Link from "next/link";
import { getSocialLinks } from "../../lib/site-config";

export default async function Footer() {
  const socialLinks = await getSocialLinks();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=14&data=${encodeURIComponent(socialLinks.siteUrl)}`;
  const socials = [
    { label: "Facebook", icon: "/social/facebook.svg", href: socialLinks.facebook },
    { label: "Instagram", icon: "/social/instagram.svg", href: socialLinks.instagram },
    { label: "WhatsApp", icon: "/social/whatsapp.svg", href: socialLinks.whatsapp },
    { label: "X", icon: "/social/x.svg", href: socialLinks.x },
    { label: "TikTok", icon: "/social/tiktok.svg", href: socialLinks.tiktok },
  ];

  return (
    <footer className="bg-black text-white py-20 border-t border-gold/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-2xl font-serif font-black tracking-[0.1em] mb-6">
              MOURATO <span className="text-luxury-gold font-light">&</span> ASSOCIADOS
            </h2>
            <p className="text-gray-400 text-sm max-w-sm leading-relaxed font-light">
              Desde 2026, redefinindo o conceito de luxo e sofisticação em perfumaria e cuidados pessoais. Uma curadoria exclusiva das fragrâncias mais raras do mundo.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-luxury-gold">Explorar</h3>
            <ul className="space-y-4 text-sm text-gray-400 font-light">
              <li><Link href="/produtos" className="hover:text-luxury-gold transition-colors">Catálogo Completo</Link></li>
              <li><Link href="/lojista" className="hover:text-luxury-gold transition-colors">Área do Lojista</Link></li>
              <li><Link href="/lojista/cadastro" className="hover:text-luxury-gold transition-colors">Cadastro de Lojista</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-luxury-gold">Redes e QR Code</h3>
            <div className="flex flex-wrap gap-3">
              {socials.map((social) =>
                social.href ? (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    title={social.label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full social-embossed p-3"
                  >
                    <img src={social.icon} alt="" className="h-full w-full object-contain filter invert group-hover:scale-110 transition-transform duration-300" />
                  </a>
                ) : (
                  <span
                    key={social.label}
                    aria-label={`${social.label} sem link configurado`}
                    title={`${social.label}: sem link configurado`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full social-embossed-disabled p-3"
                  >
                    <img src={social.icon} alt="" className="h-full w-full object-contain filter invert opacity-30" />
                  </span>
                )
              )}
              {socials.length === 0 && <p className="text-sm text-gray-400">Configure os links no painel administrativo.</p>}
            </div>

            <div
              className="mt-6 inline-block cursor-default rounded-xl border border-luxury-gold/20 bg-neutral-900 p-4 shadow-xl"
            >
              <img src={qrUrl} alt="QR Code do site Mourato & Associados" className="h-40 w-40 object-contain filter invert" />
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-gray-500">
              QR Code para poster e catálogo físico
            </p>
          </div>
        </div>

        <div className="border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">
            © 2026 Mourato & Associados. Todos os direitos reservados.
          </p>
          <p className="text-[10px] uppercase tracking-widest text-gray-500">
            M&A Fragrâncias
          </p>
        </div>
      </div>
    </footer>
  );
}
