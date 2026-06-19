import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mourato & Associados | Perfumaria de Luxo",
  description: "Descubra a exclusividade em perfumaria, cosméticos e skincare. Mourato & Associados, onde a sofisticação encontra a essência.",
  metadataBase: new URL("https://mouratoassociados.com.br"),
  openGraph: {
    title: "Mourato & Associados | Perfumaria de Luxo",
    description: "Sua curadoria exclusiva de fragrâncias e beleza premium.",
    type: "website",
    locale: "pt_BR",
    url: "https://mouratoassociados.com.br",
    siteName: "Mourato & Associados",
    images: [
      {
        url: "/brand/logo-ma.webp",
        width: 1200,
        height: 630,
        alt: "Mourato & Associados Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mourato & Associados | Perfumaria de Luxo",
    description: "Sua curadoria exclusiva de fragrâncias e beleza premium.",
    images: ["/brand/logo-ma.webp"],
  },
  icons: {
    icon: "/brand/logo-ma.webp",
    shortcut: "/brand/logo-ma.webp",
    apple: "/brand/logo-ma.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#FDFDFD] text-[#1A1A1A]">
        {children}
      </body>
    </html>
  );
}
