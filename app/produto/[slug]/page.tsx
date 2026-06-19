import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { slugify } from "../../../lib/slug";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ProdutoDetalheClient from "./ProdutoDetalheClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const produtos = await prisma.produto.findMany();
  const produto = produtos.find(p => slugify(p.nome) === slug);

  return {
    title: produto ? `${produto.nome} | Mourato & Associados` : "Produto não encontrado",
    description: produto?.descricao || "Detalhes do produto em Mourato & Associados",
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const produtos = await prisma.produto.findMany();
  const produto = produtos.find(p => slugify(p.nome) === slug);

  if (!produto) {
    notFound();
  }

  // Se estoque for <= 0, mostrar página de indisponível
  if ((produto.estoque || 0) <= 0) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
        <Navbar />
        <main className="flex-grow pt-32 pb-20 flex items-center justify-center">
          <div className="max-w-md w-full px-6 py-12 rounded-3xl border border-zinc-900 bg-neutral-950 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-red-950/40 border border-red-900/50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-serif text-white">Produto indisponível</h2>
            <p className="text-zinc-500 text-sm font-light">
              Desculpe, este produto ({produto.nome}) está temporariamente fora de estoque em nossa maison.
            </p>
            <div className="pt-4">
              <Link href="/produtos" className="btn-luxury inline-block text-center w-full">
                Voltar ao Catálogo
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <Navbar />
      <main className="flex-grow pt-32 pb-20">
        <ProdutoDetalheClient produto={produto as any} />
      </main>
      <Footer />
    </div>
  );
}
