import { prisma } from "../../lib/prisma";
import TopVendidosDisplay from "./TopVendidosDisplay";

const FALLBACK_NOMES = ["212", "One Million", "Invictus", "Yara", "Victoria"];
const FALLBACK_PERCENTUAIS = [78, 65, 54, 42, 36];

export default async function TopVendidos() {
  // 1. Buscar vendas de todas as fontes (lojistas + e-commerce + QR)
  const [pedidos, publicOrders, qrOrders] = await Promise.all([
    prisma.pedido.findMany({ select: { produtoId: true, quantidade: true } }),
    prisma.publicOrder.findMany({ select: { produtoId: true, quantidade: true } }),
    prisma.qrOrder.findMany({ select: { produtoId: true, quantidade: true } }),
  ]);

  // Agrupar por produtoId e somar quantidade
  const vendasPorProduto: Record<number, number> = {};
  const todasVendas = [...pedidos, ...publicOrders, ...qrOrders];

  for (const p of todasVendas) {
    if (!p.produtoId) continue;
    const pid = Number(p.produtoId);
    vendasPorProduto[pid] = (vendasPorProduto[pid] || 0) + Number(p.quantidade || 1);
  }

  // Rankear por quantidade vendida
  const ranking = Object.entries(vendasPorProduto)
    .map(([id, qtd]) => ({ id: Number(id), qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5);

  // 2. Buscar todos os produtos
  const todosProdutos = await prisma.produto.findMany({});
  const todos = todosProdutos.filter((produto: any) => produto.ativoSite !== false);

  // 3. Montar top produtos com dados reais
  const topProdutos: any[] = [];
  const porcentuais: number[] = [];
  const temVendasReais = ranking.length > 0 && ranking[0].qtd > 0;

  if (temVendasReais) {
    const maxVendas = ranking[0].qtd;
    for (const r of ranking) {
      const produto = todos.find((p: any) => p.id === r.id);
      if (produto) {
        topProdutos.push(produto);
        // % relativa ao mais vendido (máximo = ~85% para não ficar 100% flat)
        porcentuais.push(Math.round((r.qtd / maxVendas) * 85));
      }
    }
  }

  // 4. Fallback se não tiver 5 com vendas reais
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
        porcentuais.push(FALLBACK_PERCENTUAIS[topProdutos.length - 1] || 30);
      }
    }

    // Se ainda não tiver 5, pega qualquer um com imagem
    if (topProdutos.length < 5) {
      for (const p of todos) {
        if (topProdutos.length >= 5) break;
        if (!new Set(topProdutos.map((tp: any) => tp.id)).has(p.id) && p.imagem) {
          topProdutos.push(p);
          porcentuais.push(FALLBACK_PERCENTUAIS[topProdutos.length - 1] || 25);
        }
      }
    }
  }

  if (topProdutos.length === 0) return null;

  // Serializar
  const produtosSerializados = topProdutos.slice(0, 5).map((p: any, i: number) => ({
    id: p.id,
    nome: p.nome,
    marca: p.marca,
    imagem: p.imagem,
    porcentagem: porcentuais[i] || 30,
  }));

  return (
    <div className="pb-12 mb-10 border-b border-white/5">
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

      <TopVendidosDisplay produtos={produtosSerializados} />
    </div>
  );
}
