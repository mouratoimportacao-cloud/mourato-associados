import { prisma } from "../../lib/prisma";
import TopVendidosMarquee from "./TopVendidosMarquee";

const FALLBACK_NOMES = ["212", "One Million", "Invictus", "Yara", "Victoria"];

export default async function TopVendidos() {
  // 1. Buscar todos os pedidos de lojistas com produtoId
  const pedidos = await prisma.pedido.findMany({
    select: {
      produtoId: true,
      quantidade: true,
      usuarioId: true,
    },
  });

  // Agrupar por produtoId e somar quantidade
  const vendasPorProduto: Record<number, number> = {};
  for (const p of pedidos) {
    if (!p.produtoId) continue;
    const pid = Number(p.produtoId);
    vendasPorProduto[pid] = (vendasPorProduto[pid] || 0) + Number(p.quantidade || 1);
  }

  // Rankear por quantidade vendida
  const ranking = Object.entries(vendasPorProduto)
    .map(([id, qtd]) => ({ id: Number(id), qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5);

  // 2. Buscar produtos do ranking
  let topProdutos: any[] = [];
  const todos = await prisma.produto.findMany({});

  if (ranking.length > 0) {
    const rankIds = ranking.map((r) => r.id);
    topProdutos = rankIds
      .map((id) => todos.find((p: any) => p.id === id))
      .filter(Boolean);
  }

  // 3. Se não tiver 5, completar com fallback (nomes conhecidos com imagem)
  if (topProdutos.length < 5) {
    const idsJaIncluidos = new Set(topProdutos.map((p: any) => p.id));

    for (const nome of FALLBACK_NOMES) {
      if (topProdutos.length >= 5) break;
      const match = todos.find(
        (p: any) =>
          !idsJaIncluidos.has(p.id) &&
          p.imagem &&
          p.nome.toLowerCase().includes(nome.toLowerCase())
      );
      if (match) {
        topProdutos.push(match);
        idsJaIncluidos.add(match.id);
      }
    }

    // Se ainda não tiver 5, pega qualquer um com imagem
    if (topProdutos.length < 5) {
      for (const p of todos) {
        if (topProdutos.length >= 5) break;
        if (!idsJaIncluidos.has(p.id) && p.imagem) {
          topProdutos.push(p);
          idsJaIncluidos.add(p.id);
        }
      }
    }
  }

  if (topProdutos.length === 0) return null;

  // Serializar para o client component
  const produtosSerializados = topProdutos.slice(0, 5).map((p: any) => ({
    id: p.id,
    nome: p.nome,
    marca: p.marca,
    preco: p.preco,
    imagem: p.imagem,
    slug: "",
  }));

  return (
    <div className="border-t border-white/5 mt-16 pt-10 pb-6">
      {/* Título */}
      <div className="text-center mb-8">
        <p className="text-[10px] uppercase tracking-[0.4em] text-luxury-gold/70 mb-2">
          Destaques
        </p>
        <h3 className="text-lg sm:text-xl font-serif text-white tracking-tight">
          Top 5 <span className="text-luxury-gold">Mais Vendidos</span>
        </h3>
        <div className="w-16 h-px bg-luxury-gold/40 mx-auto mt-3"></div>
      </div>

      <TopVendidosMarquee produtos={produtosSerializados} />
    </div>
  );
}
