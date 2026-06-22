import { Suspense } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { prisma } from "../../lib/prisma";
import CatalogoPrincipal from "./components/CatalogoPrincipal";

export const metadata = {
  title: "Catálogo Exclusivo | Mourato & Associados",
  description: "Explore nossa curadoria de perfumes de nicho, cosméticos de luxo e skincare avançado.",
};

export const revalidate = 60;

export default async function ProdutosPage() {
  const produtos = await prisma.produto.findMany({
    orderBy: { id: 'asc' }
  });
  const produtosPublicos = produtos;

  return (
    <div className="flex flex-col min-h-screen max-w-full overflow-x-hidden bg-[#F5F0E8]">
      <Navbar />
      
      <main className="flex-grow pt-36 sm:pt-48 md:pt-52 pb-20 bg-[#0A0A0A]">
        <div className="w-full px-2 sm:px-8 md:px-12 lg:px-16 bg-[#0A0A0A]">
          <header className="mb-16 text-center">
            <span className="text-gold text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block mt-[1px]">Curadoria Exclusiva</span>
            <h1 className="text-4xl md:text-6xl font-serif mb-6 tracking-tight bg-gradient-to-r from-white to-[#D4AF37] bg-clip-text text-transparent font-black leading-relaxed">
              Fragrâncias à Pronta Entrega
            </h1>
            <div className="w-32 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mb-8"></div>
          </header>

          <Suspense fallback={<div className="py-20 text-center text-zinc-500 font-serif italic text-lg">Carregando curadoria...</div>}>
            <CatalogoPrincipal produtos={produtosPublicos as any[]} />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
