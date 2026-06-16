"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";

function precoPromocional(produto: any) {
  const preco = Number(produto.preco || 0);
  const desconto = Number(produto.descontoPercentual || 0);

  if (!produto.promocaoAtiva || !preco || !desconto) {
    return null;
  }

  return preco * (1 - desconto / 100);
}

export async function registrarIntencaoCompra(produtoId: number, lojistaId?: number | null) {
  if (!produtoId) {
    return { success: false, message: "Produto invalido." };
  }

  const produto = await prisma.produto.findUnique({
    where: { id: produtoId },
  });

  if (!produto) {
    return { success: false, message: "Produto nao encontrado." };
  }

  const valorAtual = precoPromocional(produto) || Number(produto.preco || 0);
  const precoTabela = Number(produto.preco || valorAtual || 0);
  const custoUnitario = Number(produto.precoAtacado || 0);

  const origemRevenda = Boolean(lojistaId);

  if (origemRevenda && lojistaId) {
    const lojista = await prisma.usuario.findUnique({
      where: { id: lojistaId },
    });

    if (!lojista || lojista.tipo !== "lojista" || lojista.status !== "aprovado") {
      return { success: false, message: "Canal de revenda indisponível no momento." };
    }

    const pedidosAbertos = await prisma.pedido.findMany({
      where: { usuarioId: lojistaId, produtoId: produto.id },
    });
    const agora = Date.now();
    const duplicado = pedidosAbertos.some((pedido: any) => {
      const createdAt = new Date(pedido.createdAt).getTime();
      return (
        ["aguardando lojista", "aguardando confirmacao admin"].includes(String(pedido.status || "")) &&
        Number.isFinite(createdAt) &&
        agora - createdAt < 30000
      );
    });

    if (duplicado) {
      return {
        success: true,
        message: "Pedido já registrado para este produto. O revendedor responsável irá finalizar seu atendimento.",
      };
    }

    const estoquePessoal = { ...(lojista.estoquePessoal || {}) } as Record<string, number>;
    const estoqueAtual = Number(estoquePessoal[String(produto.id)] ?? 0);

    if (estoqueAtual < 1) {
      return {
        success: false,
        message: "Produto sem estoque com este canal de revenda. Consulte outro item disponível.",
      };
    }

  }

  await prisma.pedido.create({
    data: {
      usuarioId: lojistaId || 0,
      produtoId: produto.id,
      produtoNome: produto.nome,
      quantidade: 1,
      precoUnitario: valorAtual,
      precoTabela,
      custoUnitario,
      descontoConcedido: Math.max(0, precoTabela - valorAtual),
      lucroBruto: valorAtual - custoUnitario,
      tipoFluxo: origemRevenda ? "venda_qr" : "intencao_site",
      pagamento: origemRevenda ? "Venda via QR do lojista" : "Pagamento online indisponivel",
      observacao: `${origemRevenda ? "Cliente entrou pelo QR/link de revenda. Pedido aguardando aprovacao do lojista; estoque pessoal ainda nao baixado." : "Intencao de compra no site publico."} Produto tentado: ${produto.nome}. Marca: ${produto.marca}. Categoria: ${produto.categoria}. Valor exibido: R$ ${valorAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      total: valorAtual,
      status: origemRevenda ? "aguardando lojista" : "intencao de compra",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath("/lojista/painel");

  return {
    success: true,
    message: origemRevenda
      ? "Pedido registrado. O revendedor responsável irá confirmar o pagamento e finalizar seu atendimento."
      : "Desculpa, estamos com problemas. Deixe um oi no WhatsApp 11 97899-0034 que entraremos em contato.",
  };
}
