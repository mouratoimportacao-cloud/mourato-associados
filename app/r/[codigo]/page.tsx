import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { prisma } from "../../../lib/prisma";
import CatalogoProdutos from "../../produtos/components/CatalogoProdutos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catálogo | Mourato & Associados",
};

export default async function CatalogoRevendaPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const lojista = await prisma.usuario.findFirst({
    where: {
      codigoRevenda: codigo,
      tipo: "lojista",
      status: "aprovado",
    },
  });

  const produtos = await prisma.produto.findMany({
    orderBy: { nome: "asc" },
  });
  const estoquePessoal = (lojista?.estoquePessoal || {}) as Record<string, number>;
  const produtosDoLojista = produtos.map((produto: any) => ({
    ...produto,
    estoque: Number(estoquePessoal[String(produto.id)] ?? 0),
  }));

  return (
    <div className="flex min-h-screen flex-col max-w-full overflow-x-hidden">
      <Navbar />

      <main className="flex-grow pt-28 pb-20 sm:pt-32">
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <header className="mb-10 text-center sm:mb-16">
            <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.4em] text-luxury-gold">
              Catálogo Oficial
            </span>
            <h1 className="mb-5 text-4xl font-serif text-white sm:text-5xl">
              Mourato & Associados
            </h1>
            <div className="mx-auto mb-6 h-px w-24 bg-luxury-gold"></div>
            <p className="mx-auto max-w-2xl text-sm font-light text-gray-500 sm:text-base">
              Escolha sua fragrância. O atendimento será encaminhado pelo canal de revenda autorizado, sem expor dados do revendedor.
            </p>
          </header>

          {lojista ? (
            <CatalogoProdutos produtos={produtosDoLojista as any[]} lojistaId={lojista.id} />
          ) : (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
              <h2 className="text-2xl font-serif text-luxury-black">Link de revenda indisponível</h2>
              <p className="mt-3 text-sm text-gray-600">
                Este QR Code ainda não está ativo. Acesse o catálogo principal ou solicite um novo link ao atendimento.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
