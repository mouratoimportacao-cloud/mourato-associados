"use server";

import { revalidatePath } from "next/cache";
import { getLojistaSession } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

// ─── criarPedidoLojista ───────────────────────────────────────────────────────
// Lojista solicita mercadorias ao fornecedor (admin).
// REGRAS:
//  - Se já existe pedido "pendente fornecedor" para o mesmo produto → SOMA a quantidade
//  - NÃO credita estoquePessoal aqui. O crédito é feito pelo admin ao validar.
// ─────────────────────────────────────────────────────────────────────────────
export async function criarPedidoLojista(formData: FormData) {
  const session = await getLojistaSession();
  if (!session) return;

  const produtoId = Number(formData.get("produtoId"));
  const quantidade = Number(formData.get("quantidade"));
  const pagamento = String(formData.get("pagamento") || "Pedido ao fornecedor");
  const observacao = String(formData.get("observacao") || "").trim();

  if (!produtoId || !quantidade || quantidade < 1) return;

  try {
    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) return;

    const lojista = await prisma.usuario.findUnique({ where: { id: session.id } });
    if (!lojista) return;

    const precoUnitario = Number(produto.precoAtacado || 0);

    // Verificar se já existe pedido pendente para o mesmo produto
    const pedidoExistente = await prisma.pedido.findFirst({
      where: {
        usuarioId: session.id,
        produtoId: produtoId,
        status: "pendente fornecedor",
      },
    });

    if (pedidoExistente) {
      // Somar quantidade ao pedido existente em vez de criar novo
      const novaQuantidade = Number(pedidoExistente.quantidade || 0) + quantidade;
      const novoTotal = precoUnitario * novaQuantidade;

      await prisma.pedido.update({
        where: { id: pedidoExistente.id },
        data: {
          quantidade: novaQuantidade,
          total: novoTotal,
          saldoFornecedor: novoTotal,
          observacao: observacao
            ? `${pedidoExistente.observacao || ""} | ${observacao}`
            : pedidoExistente.observacao,
        },
      });
    } else {
      // Criar novo pedido — NÃO altera estoquePessoal aqui
      const total = precoUnitario * quantidade;

      await prisma.pedido.create({
        data: {
          usuarioId: session.id,
          produtoId: produto.id,
          produtoNome: produto.nome,
          quantidade,
          precoUnitario,
          precoTabela: Number(produto.preco || 0),
          custoUnitario: precoUnitario,
          descontoConcedido: 0,
          lucroBruto: 0,
          tipoFluxo: "compra_fornecedor",
          quantidadePagaFornecedor: 0,
          totalPagoFornecedor: 0,
          saldoFornecedor: total,
          pagamento,
          observacao:
            observacao ||
            `Lojista solicitou ${quantidade} unidade(s) ao fornecedor. Aguardando validação.`,
          total,
          status: "pendente fornecedor",
        },
      });
    }

    revalidatePath("/lojista/painel");
    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");
    revalidatePath(`/r/${lojista.codigoRevenda || ""}`);
  } catch (error) {
    console.error("Erro ao criar pedido do lojista:", error);
  }
}

// ─── confirmarVendaLojista ────────────────────────────────────────────────────
// Lojista aprova a venda de um cliente que chegou pelo QR Code.
// REGRAS:
//  - Só age em pedidos com status "aguardando lojista"
//  - Decrementa estoquePessoal do lojista (produto entregue ao cliente)
//  - NÃO altera produto.estoque (estoque do fornecedor)
//  - Desconto nunca pode baixar o preço abaixo do custo unitário
//  - Retorna erro descritivo em caso de falha (não falha silenciosamente)
// ─────────────────────────────────────────────────────────────────────────────
export async function confirmarVendaLojista(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await getLojistaSession();
  if (!session) return { success: false, error: "Sessão expirada. Faça login novamente." };

  const pedidoId = Number(formData.get("pedidoId"));
  const pagamento = String(formData.get("pagamento") || "Dinheiro");
  const descontoPercentual = Number(formData.get("descontoPercentual") || 0);

  if (!pedidoId) return { success: false, error: "Pedido inválido." };

  try {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });

    if (!pedido || Number(pedido.usuarioId) !== session.id) {
      return { success: false, error: "Pedido não encontrado." };
    }

    if (pedido.status !== "aguardando lojista") {
      return { success: false, error: "Este pedido não está aguardando confirmação." };
    }

    const lojista = await prisma.usuario.findUnique({ where: { id: session.id } });
    if (!lojista) return { success: false, error: "Lojista não encontrado." };

    const produtoId = Number(pedido.produtoId || 0);
    const quantidade = Number(pedido.quantidade || 1);
    const produto = produtoId
      ? await prisma.produto.findUnique({ where: { id: produtoId } })
      : null;

    const estoquePessoal = {
      ...(lojista.estoquePessoal || {}),
    } as Record<string, number>;
    const estoqueAtual = Number(
      estoquePessoal[String(produtoId)] ?? produto?.estoqueLojista ?? 0
    );

    if (estoqueAtual < quantidade) {
      return {
        success: false,
        error: `Estoque insuficiente. Você tem ${estoqueAtual} un. e a venda exige ${quantidade} un.`,
      };
    }

    // Calcular preço com desconto (piso = custoUnitario)
    const precoTabela = Number(
      pedido.precoTabela || produto?.preco || pedido.precoUnitario || 0
    );
    const custoUnitario = Number(
      pedido.custoUnitario || produto?.precoAtacado || 0
    );
    const descontoSeguro = Math.max(0, Math.min(90, descontoPercentual));
    const precoComDesconto =
      descontoSeguro > 0
        ? precoTabela * (1 - descontoSeguro / 100)
        : Number(pedido.precoUnitario || precoTabela || 0);
    const precoFinal = Math.max(custoUnitario, precoComDesconto);
    const total = precoFinal * quantidade;
    const descontoConcedido = Math.max(
      0,
      (precoTabela - precoFinal) * quantidade
    );
    const lucroBruto = total - custoUnitario * quantidade;

    // Decrementar estoque pessoal do lojista
    estoquePessoal[String(produtoId)] = Math.max(0, estoqueAtual - quantidade);

    await prisma.usuario.update({
      where: { id: session.id },
      data: { estoquePessoal },
    });

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        precoUnitario: precoFinal,
        precoTabela,
        custoUnitario,
        descontoConcedido,
        lucroBruto,
        total,
        tipoFluxo: "venda_qr",
        pagamento,
        observacao: `${pedido.observacao || ""} | Venda confirmada pelo lojista. Pagamento: ${pagamento}. Desconto: R$ ${descontoConcedido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Estoque pessoal baixado em ${quantidade} un.`,
        status: "entregue",
      },
    });

    revalidatePath("/lojista/painel");
    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");

    return { success: true };
  } catch (error) {
    console.error("Erro ao confirmar venda do lojista:", error);
    return { success: false, error: "Erro ao confirmar venda. Tente novamente." };
  }
}

// ─── confirmarVendaLojistaAction ──────────────────────────────────────────────
// Wrapper void para uso direto em <form action={...}>.
// O Next.js exige que form actions retornem void | Promise<void>.
export async function confirmarVendaLojistaAction(formData: FormData): Promise<void> {
  await confirmarVendaLojista(formData);
}

export async function criarPedidosLojistaCarrinho(
  itens: { produtoId: number; quantidade: number }[]
): Promise<{ success: boolean; error?: string }> {
  const session = await getLojistaSession();
  if (!session) return { success: false, error: "Sessão expirada. Faça login novamente." };

  if (!itens || itens.length === 0) {
    return { success: false, error: "Pedido vazio." };
  }

  try {
    const lojista = await prisma.usuario.findUnique({ where: { id: session.id } });
    if (!lojista) return { success: false, error: "Lojista não encontrado." };

    for (const item of itens) {
      const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
      if (!produto) continue;

      const precoAtacado = Number(produto.precoAtacado || 0);

      // Verificar se já existe pedido pendente para o mesmo produto
      const pedidoExistente = await prisma.pedido.findFirst({
        where: {
          usuarioId: session.id,
          produtoId: item.produtoId,
          status: "pendente fornecedor",
        },
      });

      if (pedidoExistente) {
        const novaQuantidade = Number(pedidoExistente.quantidade || 0) + item.quantidade;
        const novoTotal = precoAtacado * novaQuantidade;

        await prisma.pedido.update({
          where: { id: pedidoExistente.id },
          data: {
            quantidade: novaQuantidade,
            total: novoTotal,
            saldoFornecedor: novoTotal,
            observacao: `${pedidoExistente.observacao || ""} | Adicionado mais ${item.quantidade} un. via carrinho agrupado.`,
          },
        });
      } else {
        const total = precoAtacado * item.quantidade;

        await prisma.pedido.create({
          data: {
            usuarioId: session.id,
            produtoId: produto.id,
            produtoNome: produto.nome,
            quantidade: item.quantidade,
            precoUnitario: precoAtacado,
            precoTabela: Number(produto.preco || 0),
            custoUnitario: precoAtacado,
            descontoConcedido: 0,
            lucroBruto: 0,
            tipoFluxo: "compra_fornecedor",
            quantidadePagaFornecedor: 0,
            totalPagoFornecedor: 0,
            saldoFornecedor: total,
            pagamento: "Pedido ao fornecedor",
            observacao: `Lojista solicitou ${item.quantidade} unidade(s) ao fornecedor no pedido agrupado.`,
            total,
            status: "pendente fornecedor",
          },
        });
      }
    }

    revalidatePath("/lojista/painel");
    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");

    return { success: true };
  } catch (error) {
    console.error("Erro ao criar pedidos do lojista pelo carrinho:", error);
    return { success: false, error: "Erro ao enviar pedido ao fornecedor. Tente novamente." };
  }
}

