"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";
import { getAdminSession } from "../../../lib/auth";

// ─── atualizarStatusPedido ────────────────────────────────────────────────────
// Admin muda o status de um pedido.
//
// FLUXO FORNECEDOR (compra_fornecedor / "pendente fornecedor"):
//   pendente fornecedor → pago/enviado/entregue:
//     → Credita estoquePessoal do lojista (produto chega ao lojista)
//     → Decrementa produto.estoque (estoque global do fornecedor)
//     → Registra pagamento ao fornecedor
//   qualquer → cancelado (se já estava em status de entrega):
//     → Reverte estoquePessoal do lojista
//     → Reverte produto.estoque
//
// FLUXO VENDA QR (venda_qr / "aguardando lojista"):
//   Lojista já confirmou via confirmarVendaLojista → estoquePessoal já foi baixado
//   Admin apenas monitora; não altera estoque neste fluxo.
// ─────────────────────────────────────────────────────────────────────────────
export async function atualizarStatusPedido(formData: FormData) {
  const pedidoId = Number(formData.get("pedidoId"));
  const status = String(formData.get("status") || "");
  const descontoInput = formData.get("desconto");
  const descontoVal = descontoInput !== null && descontoInput !== undefined && descontoInput !== "" ? Number(descontoInput) : null;

  if (!pedidoId || !status) return;

  try {
    let pedidoUsuarioId = 0;
    await prisma.$transaction(async (prisma) => {
      const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
      if (!pedido) return;
      pedidoUsuarioId = Number(pedido.usuarioId || 0);

      if (descontoVal !== null && !isNaN(descontoVal)) {
        const novoDesconto = Math.max(0, descontoVal);
        const precoTabela = Number(pedido.precoTabela ?? pedido.precoUnitario ?? 0);
        const quantidade = Number(pedido.quantidade ?? 1);
        const custoUnitario = Number(pedido.custoUnitario ?? 0);

        const novoTotal = Math.max(0, (precoTabela * quantidade) - novoDesconto);
        const novoPrecoUnitario = quantidade > 0 ? (novoTotal / quantidade) : 0;
        const novoLucroBruto = novoTotal - (quantidade * custoUnitario);

        await prisma.pedido.update({
          where: { id: pedidoId },
          data: {
            descontoConcedido: novoDesconto,
            total: novoTotal,
            precoUnitario: novoPrecoUnitario,
            lucroBruto: novoLucroBruto,
          },
        });

        pedido.descontoConcedido = novoDesconto;
        pedido.total = novoTotal;
        pedido.precoUnitario = novoPrecoUnitario;
        pedido.lucroBruto = novoLucroBruto;
      }

      if (
        pedido.tipoFluxo === "venda_qr" &&
        pedido.status === "aguardando lojista"
      ) {
        throw new Error(
          "Pedidos do QR devem ser aprovados ou rejeitados exclusivamente pelo lojista."
        );
      }

    const statusEntrega = ["pago", "enviado", "entregue"];
    const pagamento = String(pedido.pagamento || "");

    const fluxoFornecedor =
      String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
      pagamento.includes("Pedido ao fornecedor") ||
      pagamento.includes("Compra do fornecedor") ||
      pedido.status === "pendente fornecedor";

    const entraEmEntrega =
      statusEntrega.includes(status) && !statusEntrega.includes(pedido.status);
    const mudouParaCancelado =
      status === "cancelado" && pedido.status !== "cancelado";
    const saiuDeCancelado =
      status !== "cancelado" && pedido.status === "cancelado";

    // ── FORNECEDOR: crédito de estoquePessoal quando admin confirma entrega ──
    if (
      fluxoFornecedor &&
      entraEmEntrega &&
      pedido.produtoId &&
      pedido.quantidade &&
      pedido.usuarioId
    ) {
      const quantidade = Number(pedido.quantidade);

      // Credita estoquePessoal do lojista ← ponto central do fluxo (estoque físico chega ao lojista)
      const lojista = await prisma.usuario.findUnique({
        where: { id: pedido.usuarioId },
      });
      if (lojista) {
        const estoquePessoal = {
          ...(lojista.estoquePessoal || {}),
        } as Record<string, number>;
        const chave = String(pedido.produtoId);
        estoquePessoal[chave] =
          Number(estoquePessoal[chave] || 0) + quantidade;
        await prisma.usuario.update({
          where: { id: lojista.id },
          data: { estoquePessoal },
        });
      }

      // Atualiza controle financeiro do pedido — Apenas se o status de destino for "pago"
      if (status === "pago") {
        await prisma.pedido.update({
          where: { id: pedidoId },
          data: {
            quantidadePagaFornecedor: quantidade,
            totalPagoFornecedor: pedido.total,
            saldoFornecedor: 0,
            tipoFluxo: "compra_fornecedor",
            status: "pago",
          },
        });
      } else {
        // Se for "enviado" ou "entregue", apenas atualiza status, mantendo saldo devedor intacto
        await prisma.pedido.update({
          where: { id: pedidoId },
          data: {
            tipoFluxo: "compra_fornecedor",
            status,
          },
        });
      }
    }

    // ── FORNECEDOR: Reverter crédito de estoquePessoal quando sai de entrega/pago para pendente ──
    const saiDeEntrega = !statusEntrega.includes(status) && statusEntrega.includes(pedido.status) && status !== "cancelado";
    if (
      fluxoFornecedor &&
      saiDeEntrega &&
      pedido.produtoId &&
      pedido.quantidade &&
      pedido.usuarioId
    ) {
      const lojista = await prisma.usuario.findUnique({
        where: { id: pedido.usuarioId },
      });
      if (lojista) {
        const quantidade = Number(pedido.quantidade);
        const estoquePessoal = {
          ...(lojista.estoquePessoal || {}),
        } as Record<string, number>;
        const chave = String(pedido.produtoId);
        estoquePessoal[chave] = Math.max(
          0,
          Number(estoquePessoal[chave] || 0) - quantidade
        );
        await prisma.usuario.update({
          where: { id: lojista.id },
          data: { estoquePessoal },
        });
      }
    }

    // ── FORNECEDOR: Atualização financeira caso transite para "pago" após já ter sido entregue/enviado ──
    const isTransitioningToPago = status === "pago" && pedido.status !== "pago";
    if (fluxoFornecedor && isTransitioningToPago && !entraEmEntrega) {
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: {
          quantidadePagaFornecedor: Number(pedido.quantidade || 0),
          totalPagoFornecedor: pedido.total,
          saldoFornecedor: 0,
          status: "pago",
        },
      });
    }

    // ── FORNECEDOR: Devolver estoque ao fornecedor se o pedido for cancelado ──
    if (
      fluxoFornecedor &&
      mudouParaCancelado &&
      pedido.produtoId &&
      pedido.quantidade &&
      pedido.usuarioId
    ) {
      const produto = await prisma.produto.findUnique({
        where: { id: pedido.produtoId },
      });
      const quantidade = Number(pedido.quantidade);

      if (produto) {
        await prisma.produto.update({
          where: { id: produto.id },
          data: {
            estoque: Number(produto.estoque || 0) + quantidade,
            estoqueLojista: Number(produto.estoqueLojista || 0) + quantidade,
          },
        });
      }

      // Se o pedido cancelado já tinha sido entregue/pago, devolve o estoquePessoal do lojista
      if (statusEntrega.includes(pedido.status)) {
        const lojista = await prisma.usuario.findUnique({
          where: { id: pedido.usuarioId },
        });
        if (lojista) {
          const estoquePessoal = {
            ...(lojista.estoquePessoal || {}),
          } as Record<string, number>;
          const chave = String(pedido.produtoId);
          estoquePessoal[chave] = Math.max(
            0,
            Number(estoquePessoal[chave] || 0) - quantidade
          );
          await prisma.usuario.update({
            where: { id: lojista.id },
            data: { estoquePessoal },
          });
        }
      }
    }

    // ── FORNECEDOR: Retirar estoque do fornecedor se o pedido sair do status cancelado ──
    if (
      fluxoFornecedor &&
      saiuDeCancelado &&
      pedido.produtoId &&
      pedido.quantidade &&
      pedido.usuarioId
    ) {
      const produto = await prisma.produto.findUnique({
        where: { id: pedido.produtoId },
      });
      const quantidade = Number(pedido.quantidade);

      if (produto) {
        await prisma.produto.update({
          where: { id: produto.id },
          data: {
            estoque: Math.max(0, Number(produto.estoque || 0) - quantidade),
            estoqueLojista: Math.max(
              0,
              Number(produto.estoqueLojista || 0) - quantidade
            ),
          },
        });
      }

      // Se o novo status reativado já entra em entrega direta
      if (statusEntrega.includes(status)) {
        const lojista = await prisma.usuario.findUnique({
          where: { id: pedido.usuarioId },
        });
        if (lojista) {
          const estoquePessoal = {
            ...(lojista.estoquePessoal || {}),
          } as Record<string, number>;
          const chave = String(pedido.produtoId);
          estoquePessoal[chave] =
            Number(estoquePessoal[chave] || 0) + quantidade;
          await prisma.usuario.update({
            where: { id: lojista.id },
            data: { estoquePessoal },
          });
        }
      }
    }

    // ── VENDA QR: ajuste de estoquePessoal ao cancelar/reativar ──
    // (confirmarVendaLojista já baixou; ao cancelar precisamos devolver)
    const fluxoVendaQr =
      String(pedido.tipoFluxo || "") === "venda_qr" ||
      pagamento.includes("Venda via QR do lojista") ||
      ["Dinheiro", "Pix", "Débito", "Crédito à vista", "Crédito parcelado"].some(
        (p) => pagamento.includes(p)
      );

    if (
      fluxoVendaQr &&
      (mudouParaCancelado || saiuDeCancelado) &&
      pedido.produtoId &&
      pedido.usuarioId
    ) {
      const lojista = await prisma.usuario.findUnique({
        where: { id: pedido.usuarioId },
      });
      if (lojista && lojista.tipo === "lojista") {
        const quantidade = Number(pedido.quantidade || 1);
        const estoquePessoal = {
          ...(lojista.estoquePessoal || {}),
        } as Record<string, number>;
        const chave = String(pedido.produtoId);
        const atual = Number(estoquePessoal[chave] || 0);

        const ajuste =
          mudouParaCancelado && statusEntrega.includes(pedido.status)
            ? quantidade   // cancelou venda confirmada → devolve estoque
            : saiuDeCancelado && statusEntrega.includes(status)
            ? -quantidade  // reativou venda → baixa estoque novamente
            : 0;

        if (ajuste !== 0) {
          estoquePessoal[chave] = Math.max(0, atual + ajuste);
          await prisma.usuario.update({
            where: { id: lojista.id },
            data: { estoquePessoal },
          });
        }
      }
    }

    // ── Atualiza status do pedido ──
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: { status },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");
    if (pedidoUsuarioId) {
      revalidatePath(`/admin/lojistas/${pedidoUsuarioId}`);
    }
    revalidatePath("/admin/produtos");
    revalidatePath("/lojista/painel");
    revalidatePath("/produtos");
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
  }
}

// ─── deletePedido ─────────────────────────────────────────────────────────────
export async function deletePedido(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Sessão de administrador ausente" };
  }

  const pedidoId = Number(formData.get("pedidoId"));
  if (!pedidoId) {
    return { success: false, error: "ID de pedido inválido" };
  }

  const pedido = await prisma.pedido.findFirst({
    where: { id: pedidoId },
  });

  if (
    pedido &&
    ["pago", "enviado", "entregue", "cancelado"].includes(pedido.status)
  ) {
    return {
      success: false,
      error: "Não é permitido excluir pedido com status finalizado",
    };
  }

  try {
    // Retornar estoque ao fornecedor se o pedido deletado for de fluxoFornecedor e estiver ativo (não cancelado)
    if (pedido && pedido.status !== "cancelado" && pedido.produtoId && pedido.quantidade) {
      const fluxoFornecedor =
        String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
        String(pedido.pagamento || "").includes("Pedido ao fornecedor") ||
        String(pedido.pagamento || "").includes("Compra do fornecedor") ||
        pedido.status === "pendente fornecedor";

      if (fluxoFornecedor) {
        const produto = await prisma.produto.findUnique({ where: { id: pedido.produtoId } });
        if (produto) {
          await prisma.produto.update({
            where: { id: produto.id },
            data: {
              estoque: Number(produto.estoque || 0) + Number(pedido.quantidade),
              estoqueLojista: Number(produto.estoqueLojista || 0) + Number(pedido.quantidade),
            },
          });
        }
      }
    }

    await prisma.pedido.delete({ where: { id: pedidoId } });
    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    return { success: false, error: "Erro ao excluir pedido" };
  }
}

// ─── deletePedidoAction ───────────────────────────────────────────────────────
// Wrapper void para uso em <form action={deletePedidoAction}>
export async function deletePedidoAction(formData: FormData) {
  await deletePedido(formData);
}
