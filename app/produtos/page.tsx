import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { prisma } from "../../lib/prisma";
import CatalogoProdutos from "./components/CatalogoProdutos";

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-16 text-center">
            <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block">Perfumaria em Alta</span>
            <h1 className="text-5xl font-serif text-luxury-black mb-6">Produtos à Pronta Entrega</h1>
            <div className="w-24 h-px bg-luxury-gold mx-auto mb-8"></div>
            <p className="text-gray-500 font-light max-w-2xl mx-auto">
              Use a busca e os filtros para encontrar perfumes femininos, masculinos, árabes, kits e promoções disponíveis.
            </p>
          </header>

          {produtosVitrine.length > 0 && (
            <section className="mb-24 overflow-hidden border-y border-luxury-gold/20 bg-luxury-black text-luxury-white py-10 -mx-4 sm:-mx-6 lg:-mx-8">
              <div className="px-4 sm:px-6 lg:px-8 mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <span className="text-luxury-gold text-[10px] font-bold uppercase tracking-[0.35em] block mb-3">
                    Destaques & Promoções
                  </span>
                  <h2 className="text-4xl font-serif">Vitrine M&A Fragrâncias</h2>
                </div>
                <p className="text-gray-400 text-sm font-light max-w-md">
                  Produtos em evidência para pronta entrega, kits presenteáveis e fragrâncias com alta procura.
                </p>
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-luxury-black to-transparent"></div>
                <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-luxury-black to-transparent"></div>
                <div className="luxury-marquee flex w-max gap-6 px-4 sm:px-6 lg:px-8">
                  {produtosVitrine.map((produto: any) => (
                    <article key={produto.id} className="w-64 shrink-0 overflow-hidden border border-white/10 bg-white/[0.04] shadow-2xl relative">
                      {produto.promocaoAtiva && produto.descontoPercentual ? (
                        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                          -{produto.descontoPercentual}%
                        </div>
                      ) : null}
                      <div className="aspect-[4/5] overflow-hidden bg-white/5">
                        {produto.imagem ? (
                          <img src={produto.imagem} alt={produto.nome} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-500 italic font-serif">
                            M&A
                          </div>
                        )}
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between gap-3">
                          <span className="text-[9px] font-bold text-luxury-gold uppercase tracking-widest">{produto.marca}</span>
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest">{produto.categoria}</span>
                        </div>
                        <h3 className="text-lg font-serif leading-tight">{produto.nome}</h3>
                      <div className="border-t border-white/10 pt-3 space-y-3">
                          {precoPromocional(produto) ? (
                            <div className="rounded-2xl bg-red-600 px-4 py-3 text-white shadow-lg ring-2 ring-white/20">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest">Oferta Especial</span>
                                <span className="text-[10px] line-through opacity-70">{moeda(produto.preco)}</span>
                              </div>
                              <div className="text-xl font-black leading-none mt-1">{moeda(precoPromocional(produto))}</div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                              <span className="text-xs uppercase tracking-widest text-gray-400">Preço</span>
                              <span className="text-sm font-bold">{moeda(produto.preco)}</span>
                            </div>
                          )}
                          <a
                            href={`#produto-${produto.id}`}
                            className="block w-full rounded-full bg-luxury-white px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest text-luxury-black hover:bg-luxury-gold transition-colors"
                          >
                            Comprar este produto
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          <CatalogoProdutos produtos={produtosPublicos as any[]} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
