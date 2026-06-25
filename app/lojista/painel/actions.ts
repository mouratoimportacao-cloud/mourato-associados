"use server";

import { revalidatePath } from "next/cache";
import { getLojistaSession } from "../../../lib/auth";
import { calcularSaldoFornecedor, calcularVendaComDesconto } from "../../../lib/order-rules";
import { prisma } from "../../../lib/prisma";

// ─── criarPedidoLojista ───────────────────────────────────────────────────────
// Lojista solicita mercadorias ao fornecedor (admin).
// REGRAS:
//  - Se já existe pedido "pendente fornecedor" para o mesmo produto → SOMA a quantidade
//  - NÃO credita estoquePessoal aqui. O crédito é feito pelo admin ao validar.
// ─────────────────────────────────────────────────────────────────────────────
export async function criarPedidoLojista(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await getLojistaSession();
  if (!session) return { success: false, error: "Sessão expirada. Faça login novamente." };

  const produtoId = Number(formData.get("produtoId"));
  const quantidade = Number(formData.get("quantidade"));
  const pagamento = String(formData.get("pagamento") || "Pedido ao fornecedor");
  const observacao = String(formData.get("observacao") || "").trim();

  if (!produtoId || !quantidade || quantidade < 1) {
    return { success: false, error: "Quantidade ou produto inválido." };
  }

  try {
    const lojista = await prisma.usuario.findUnique({ where: { id: session.id } });
    if (!lojista) return { success: false, error: "Lojista não encontrado." };

    await prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({ where: { id: produtoId } });
      if (!produto) throw new Error("Produto não encontrado.");

      const estoqueDisponivel = Number(produto.estoque || 0);
      if (estoqueDisponivel < quantidade) {
        throw new Error(
          `Estoque de atacado insuficiente para o produto "${produto.nome}". Disponível: ${estoqueDisponivel} un., solicitado: ${quantidade} un.`
        );
      }

      const precoUnitario = Number(produto.precoAtacado || 0);
      const pedidoExistente = await tx.pedido.findFirst({
        where: {
          usuarioId: session.id,
          produtoId,
          status: "pendente fornecedor",
        },
      });

      await tx.produto.update({
        where: { id: produto.id },
        data: {
          estoque: estoqueDisponivel - quantidade,
          estoqueLojista: Math.max(0, Number(produto.estoqueLojista || 0) - quantidade),
        },
      });

      const estoquePessoal = {
        ...(lojista.estoquePessoal || {}),
      } as Record<string, number>;
      const chave = String(produtoId);
      estoquePessoal[chave] = Number(estoquePessoal[chave] || 0) + quantidade;
      await tx.usuario.update({
        where: { id: lojista.id },
        data: { estoquePessoal },
      });

      const podeAgrupar =
        pedidoExistente &&
        Number(pedidoExistente.totalPagoFornecedor || 0) === 0 &&
        Number(pedidoExistente.quantidadePagaFornecedor || 0) === 0;

      if (podeAgrupar && pedidoExistente) {
        const novaQuantidade = Number(pedidoExistente.quantidade || 0) + quantidade;
        const novoTotal = Number(pedidoExistente.total || 0) + precoUnitario * quantidade;
        const obsOriginal = pedidoExistente.observacao || "";
        const obsComAdicao = observacao ? `${obsOriginal} | ${observacao}` : obsOriginal;
        const novaObs = obsComAdicao.includes("[ESTOQUE_LOJISTA_CREDITADO]")
          ? obsComAdicao
          : `${obsComAdicao} [ESTOQUE_LOJISTA_CREDITADO]`.trim();

        await tx.pedido.update({
          where: { id: pedidoExistente.id },
          data: {
            quantidade: novaQuantidade,
            total: novoTotal,
            saldoFornecedor: calcularSaldoFornecedor(novoTotal, 0),
            observacao: novaObs,
          },
        });
      } else {
        const total = precoUnitario * quantidade;
        const obsFinal = observacao || `Lojista solicitou ${quantidade} unidade(s) ao fornecedor. Aguardando validação.`;
        const novaObs = obsFinal.includes("[ESTOQUE_LOJISTA_CREDITADO]")
          ? obsFinal
          : `${obsFinal} [ESTOQUE_LOJISTA_CREDITADO]`.trim();

        await tx.pedido.create({
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
            observacao: novaObs,
            total,
            status: "pendente fornecedor",
          },
        });
      }
    });

    try {
      revalidatePath("/lojista/painel");
      revalidatePath("/admin");
      revalidatePath("/admin/pedidos");
      revalidatePath("/admin/produtos");
      revalidatePath(`/r/${lojista.codigoRevenda || ""}`);
    } catch (e) {
      console.warn("Aviso: revalidatePath ignorado no ambiente CLI/Teste.");
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar pedido do lojista:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar pedido.",
    };
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
  const descontoValor = Number(formData.get("descontoValor") || 0);

  if (!pedidoId) return { success: false, error: "Pedido inválido." };

  try {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({ where: { id: pedidoId } });
      if (!pedido || Number(pedido.usuarioId) !== session.id) {
        throw new Error("Pedido não encontrado.");
      }
      if (pedido.status !== "aguardando lojista") {
        throw new Error("Este pedido não está aguardando confirmação.");
      }

      const lojista = await tx.usuario.findUnique({ where: { id: session.id } });
      if (!lojista) throw new Error("Lojista não encontrado.");

      const produtoId = Number(pedido.produtoId || 0);
      const quantidade = Number(pedido.quantidade || 1);
      const produto = produtoId
        ? await tx.produto.findUnique({ where: { id: produtoId } })
        : null;
      const estoquePessoal = {
        ...(lojista.estoquePessoal || {}),
      } as Record<string, number>;
      const estoqueAtual = Number(estoquePessoal[String(produtoId)] ?? 0);

      if (estoqueAtual < quantidade) {
        throw new Error(
          `Estoque insuficiente. Você tem ${estoqueAtual} un. e a venda exige ${quantidade} un.`
        );
      }

      const precoTabela = Number(
        pedido.precoTabela || produto?.preco || pedido.precoUnitario || 0
      );
      const custoUnitario = Number(
        pedido.custoUnitario || produto?.precoAtacado || 0
      );
      const precoAtual = Number(pedido.precoUnitario || precoTabela || 0);

      const venda = calcularVendaComDesconto({
        precoTabela,
        custoUnitario,
        quantidade,
        descontoValor,
        precoAtual,
      });

      estoquePessoal[String(produtoId)] = estoqueAtual - quantidade;
      await tx.usuario.update({
        where: { id: session.id },
        data: { estoquePessoal },
      });
      await tx.pedido.update({
        where: { id: pedidoId },
        data: {
          precoUnitario: venda.precoFinal,
          precoTabela: precoAtual, // Salva o valor sugerido do site original
          custoUnitario,
          descontoConcedido: venda.descontoConcedido,
          lucroBruto: venda.lucroBruto,
          total: venda.total,
          tipoFluxo: "venda_qr",
          pagamento,
          observacao: `${pedido.observacao || ""} | Venda confirmada pelo lojista. Pagamento: ${pagamento}. Desconto: R$ ${venda.descontoConcedido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Estoque pessoal baixado em ${quantidade} un.`,
          status: "entregue",
        },
      });
    });

    try {
      revalidatePath("/lojista/painel");
      revalidatePath("/admin");
      revalidatePath("/admin/pedidos");
      revalidatePath("/admin/produtos");
    } catch (e) {
      console.warn("Aviso: revalidatePath ignorado no ambiente CLI/Teste.");
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao confirmar venda do lojista:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao confirmar venda. Tente novamente.",
    };
  }
}

export async function rejeitarVendaLojista(
  pedidoId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await getLojistaSession();
  if (!session) return { success: false, error: "Sessão expirada. Faça login novamente." };
  if (!pedidoId) return { success: false, error: "Pedido inválido." };

  try {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({ where: { id: pedidoId } });
      if (!pedido || Number(pedido.usuarioId) !== session.id) {
        throw new Error("Pedido não encontrado.");
      }
      if (pedido.status !== "aguardando lojista") {
        throw new Error("Este pedido não está aguardando decisão.");
      }

      await tx.pedido.update({
        where: { id: pedidoId },
        data: {
          status: "rejeitado",
          observacao: `${pedido.observacao || ""} | Pedido rejeitado pelo lojista; nenhum estoque foi debitado.`,
        },
      });
    });

    try {
      revalidatePath("/lojista/painel");
      revalidatePath("/admin");
      revalidatePath("/admin/pedidos");
      revalidatePath("/admin/produtos");
    } catch (e) {
      console.warn("Aviso: revalidatePath ignorado no ambiente CLI/Teste.");
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao rejeitar venda do lojista:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao rejeitar pedido.",
    };
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

    await prisma.$transaction(async (tx) => {
      for (const item of itens) {
        if (!item.produtoId || !item.quantidade || item.quantidade < 1) {
          throw new Error("O pedido contém produto ou quantidade inválida.");
        }
        const produto = await tx.produto.findUnique({ where: { id: item.produtoId } });
        if (!produto) throw new Error(`Produto ID ${item.produtoId} não encontrado.`);
        const estoqueDisponivel = Number(produto.estoque || 0);
        if (estoqueDisponivel < item.quantidade) {
          throw new Error(
            `Estoque de atacado insuficiente para "${produto.nome}". Disponível: ${estoqueDisponivel} un., solicitado: ${item.quantidade} un.`
          );
        }
      }

      for (const item of itens) {
        const produto = (await tx.produto.findUnique({ where: { id: item.produtoId } }))!;
        const precoAtacado = Number(produto.precoAtacado || 0);

        // A. Debita estoque global
        await tx.produto.update({
          where: { id: produto.id },
          data: {
            estoque: Number(produto.estoque || 0) - item.quantidade,
            estoqueLojista: Math.max(0, Number(produto.estoqueLojista || 0) - item.quantidade),
          },
        });

        // B. Credita estoque pessoal do lojista imediatamente
        const lojistaAtualizado = (await tx.usuario.findUnique({
          where: { id: session.id },
        }))!;
        const estoquePessoal = {
          ...(lojistaAtualizado.estoquePessoal || {}),
        } as Record<string, number>;
        const chave = String(produto.id);
        estoquePessoal[chave] = Number(estoquePessoal[chave] || 0) + item.quantidade;
        await tx.usuario.update({
          where: { id: lojistaAtualizado.id },
          data: { estoquePessoal },
        });

        // C. Cria ou agrupa pedido com marcador [ESTOQUE_LOJISTA_CREDITADO]
        const pedidoExistente = await tx.pedido.findFirst({
          where: {
            usuarioId: session.id,
            produtoId: item.produtoId,
            status: "pendente fornecedor",
          },
        });

        const podeAgrupar =
          pedidoExistente &&
          Number(pedidoExistente.totalPagoFornecedor || 0) === 0 &&
          Number(pedidoExistente.quantidadePagaFornecedor || 0) === 0;

        if (podeAgrupar && pedidoExistente) {
          const novaQuantidade = Number(pedidoExistente.quantidade || 0) + item.quantidade;
          const novoTotal =
            Number(pedidoExistente.total || 0) + precoAtacado * item.quantidade;
          const obsOriginal = pedidoExistente.observacao || "";
          const obsComAdicao = `${obsOriginal} | Adicionado mais ${item.quantidade} un. via carrinho agrupado.`;
          const novaObs = obsComAdicao.includes("[ESTOQUE_LOJISTA_CREDITADO]")
            ? obsComAdicao
            : `${obsComAdicao} [ESTOQUE_LOJISTA_CREDITADO]`.trim();

          await tx.pedido.update({
            where: { id: pedidoExistente.id },
            data: {
              quantidade: novaQuantidade,
              total: novoTotal,
              saldoFornecedor: calcularSaldoFornecedor(novoTotal, 0),
              observacao: novaObs,
            },
          });
        } else {
          const total = precoAtacado * item.quantidade;
          await tx.pedido.create({
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
              observacao: `Lojista solicitou ${item.quantidade} unidade(s) ao fornecedor no pedido agrupado. [ESTOQUE_LOJISTA_CREDITADO]`,
              total,
              status: "pendente fornecedor",
            },
          });
        }
      }
    });

    try {
      revalidatePath("/lojista/painel");
      revalidatePath("/admin");
      revalidatePath("/admin/pedidos");
      revalidatePath("/admin/produtos");
    } catch (e) {
      console.warn("Aviso: revalidatePath ignorado no ambiente CLI/Teste.");
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao criar pedidos do lojista pelo carrinho:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao enviar pedido ao fornecedor. Tente novamente.",
    };
  }
}
