import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { prisma } from "../../lib/prisma";
import CatalogoPrincipal from "./components/CatalogoPrincipal";

export const metadata = {
  title: "Catálogo Exclusivo | Mourato & Associados",
  description: "Explore nossa curadoria de perfumes de nicho, cosméticos de luxo e skincare avançado.",
};

export const dynamic = "force-dynamic";

function moeda(valor: number | null | undefined) {
  return valor ? `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sob consulta";
}

function precoPromocional(produto: any) {
  const preco = Number(produto.preco || 0);
  const desconto = Number(produto.descontoPercentual || 0);

  if (!produto.promocaoAtiva || !preco || !desconto) {
    return null;
  }

  return preco * (1 - desconto / 100);
}

export default async function ProdutosPage() {
  const produtos = await prisma.produto.findMany({
    orderBy: { nome: 'asc' }
  });
  const produtosVitrine = produtos.filter((produto: any) => produto.vitrine || produto.promocaoAtiva);
  const produtosPublicos = produtos;

  return (
    <div className="flex flex-col min-h-screen max-w-full overflow-x-hidden">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="w-full px-2 sm:px-8 md:px-12 lg:px-16">
          <header className="mb-16 text-center">
            <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block">Perfumaria em Alta</span>
            <h1 className="text-5xl font-serif text-white mb-6">Produtos à Pronta Entrega</h1>
            <div className="w-24 h-px bg-luxury-gold mx-auto mb-8"></div>
          </header>

          <CatalogoPrincipal produtos={produtosPublicos as any[]} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
