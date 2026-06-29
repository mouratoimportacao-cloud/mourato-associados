import { Suspense } from "react";
import Navbar from "../components/Navbar";
// TODO: Implementar login unificado (/login) que redireciona conforme tipo do usuário
// import BuscaExternaWidget from "../admin/components/BuscaExternaWidget"; // Removido da página pública - fica só no admin
import Footer from "../components/Footer";
import { prisma } from "../../lib/prisma";
import CatalogoPrincipal from "./components/CatalogoPrincipal";

export const metadata = {
  title: "Catálogo Exclusivo | Mourato & Associados",
  description: "Explore nossa curadoria de perfumes de nicho, cosméticos de luxo e skincare avançado.",
};

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const produtos = await prisma.produto.findMany({
    orderBy: { id: 'asc' }
  });
  const produtosPublicos = produtos;

  return (
    <div className="flex flex-col min-h-screen max-w-full overflow-x-hidden">
      <Navbar />
      
      <main className="flex-grow pt-40 pb-20">
        <div className="w-full px-2 sm:px-8 md:px-12 lg:px-16">
          <header className="mb-16 text-center flex flex-col items-center justify-center min-h-[120px]">
            <span className="text-gold text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block">Curadoria Exclusiva</span>
            <h1 className="text-4xl md:text-6xl font-serif mb-6 tracking-tight bg-gradient-to-r from-white via-[#F5E6C4] to-[#D4AF37] bg-clip-text text-transparent font-black">
              Fragrâncias à Pronta Entrega
            </h1>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mb-8"></div>
          </header>

          <Suspense fallback={<div className="py-20 text-center text-zinc-500 font-serif italic text-lg">Carregando curadoria...</div>}>
            {/* BuscaExternaWidget removido - fica só no admin */}
            <CatalogoPrincipal produtos={produtosPublicos as any[]} />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
