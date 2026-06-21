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
        url: "/brand/logo-ma.png",
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
    images: ["/brand/logo-ma.png"],
  },
  icons: {
    icon: "/brand/logo-ma.png",
    shortcut: "/brand/logo-ma.png",
    apple: "/brand/logo-ma.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
