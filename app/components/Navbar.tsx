import Link from "next/link";
import { getSocialLinks } from "../../lib/site-config";

export default async function Navbar() {
  const socialLinks = await getSocialLinks();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(socialLinks.siteUrl)}`;
  const socials = [
    { label: "Facebook", icon: "/social/facebook.svg", href: socialLinks.facebook },
    { label: "Instagram", icon: "/social/instagram.svg", href: socialLinks.instagram },
    { label: "WhatsApp", icon: "/social/whatsapp.svg", href: socialLinks.whatsapp },
    { label: "X", icon: "/social/x.svg", href: socialLinks.x },
    { label: "TikTok", icon: "/social/tiktok.svg", href: socialLinks.tiktok },
  ];

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 bg-black/90 backdrop-blur-md border-b border-gold/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between min-h-20 items-center gap-4 py-4">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-2xl font-serif font-black tracking-[0.1em] text-white hover:text-gold transition-colors duration-300">
              MOURATO <span className="text-gold font-light">&</span> ASSOCIADOS
            </Link>
          </div>

          <div className="hidden md:flex space-x-12 items-center">
            <Link href="/produtos" className="text-xs font-medium uppercase tracking-widest text-gray-300 hover:text-gold transition-colors">Catálogo</Link>
            <Link href="/lojista" className="text-xs font-medium uppercase tracking-widest text-gray-300 hover:text-gold transition-colors">Área Lojista</Link>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link
              href="/produtos"
              aria-label="Mourato & Associados"
              title="Mourato & Associados"
              className="brand-logo-frame hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full overflow-hidden p-1 hover:scale-105 transition-transform duration-300"
            >
              <img src="/brand/logo-ma.png" alt="" className="h-full w-full brand-logo-relief" />
            </Link>
            {socials.map((social) =>
              social.href ? (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full social-embossed p-2.5"
                >
                  <img src={social.icon} alt="" className="h-full w-full object-contain filter invert group-hover:scale-110 transition-transform duration-300" />
                </a>
              ) : (
                <span
                  key={social.label}
                  aria-label={`${social.label} sem link configurado`}
                  title={`${social.label}: sem link configurado`}
                  className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full social-embossed-disabled p-2.5"
                >
                  <img src={social.icon} alt="" className="h-full w-full object-contain filter invert opacity-30" />
                </span>
              )
            )}
            <span
              aria-label="QR Code do site"
              title="QR Code para abrir o catálogo pelo celular"
              className="hidden lg:inline-flex h-14 w-14 cursor-default items-center justify-center overflow-hidden rounded-md border border-luxury-gold bg-neutral-900 p-1 shadow-md"
            >
              <img src={qrUrl} alt="" className="h-full w-full object-contain filter invert" />
            </span>
            <Link href="/admin" className="text-[10px] border border-gold text-gold px-3 py-1.5 uppercase tracking-wider hover:bg-gold hover:text-black transition-all font-bold rounded">
              Acesso Restrito
            </Link>
          </div>
        </div>

        <div className="flex sm:hidden items-center justify-center gap-3 pb-4">
          <Link
            href="/produtos"
            aria-label="Mourato & Associados"
            title="Mourato & Associados"
            className="brand-logo-frame inline-flex h-11 w-11 items-center justify-center rounded-full overflow-hidden p-1"
          >
            <img src="/brand/logo-ma.png" alt="" className="h-full w-full brand-logo-relief" />
          </Link>
          {socials.map((social) =>
            social.href ? (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                title={social.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full social-embossed p-2.5"
              >
                <img src={social.icon} alt="" className="h-full w-full object-contain filter invert" />
              </a>
            ) : (
              <span
                key={social.label}
                aria-label={`${social.label} sem link configurado`}
                title={`${social.label}: sem link configurado`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full social-embossed-disabled p-2.5"
              >
                <img src={social.icon} alt="" className="h-full w-full object-contain filter invert opacity-30" />
              </span>
            )
          )}
          <span
            aria-label="QR Code do site"
            title="QR Code para abrir o catálogo pelo celular"
            className="inline-flex h-14 w-14 cursor-default items-center justify-center overflow-hidden rounded-md border border-luxury-gold bg-neutral-900 p-1 shadow-md"
          >
            <img src={qrUrl} alt="" className="h-full w-full object-contain filter invert" />
          </span>
        </div>
      </div>
    </nav>
  );
}
