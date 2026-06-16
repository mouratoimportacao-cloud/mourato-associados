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

  if (!pedidoId || !status) return;

  try {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) return;

    const statusEntrega = ["pago", "enviado", "entregue"];
    const pagamento = String(pedido.pagamento || "");

    const fluxoFornecedor =
      String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
      pagamento.includes("Pedido ao fornecedor") ||
      pagamento.includes("Compra do fornecedor") ||
      pedido.status === "pendente fornecedor";

    const entraEmEntrega =
      statusEntrega.includes(status) && !statusEntrega.includes(pedido.status);
    const saiDeEntrega =
      !statusEntrega.includes(status) && statusEntrega.includes(pedido.status);
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
      const produto = await prisma.produto.findUnique({
        where: { id: pedido.produtoId },
      });

      const quantidade = Number(pedido.quantidade);
      const jaPaga = Number(pedido.quantidadePagaFornecedor || 0);
      const restante = Math.max(0, quantidade - jaPaga);
      const precoUnitario = Number(
        pedido.precoUnitario || produto?.precoAtacado || 0
      );
      const totalPagoFornecedor =
        Number(pedido.totalPagoFornecedor || 0) + restante * precoUnitario;

      if (restante > 0 && produto) {
        // Decrementa estoque do fornecedor (produto.estoque global)
        await prisma.produto.update({
          where: { id: produto.id },
          data: {
            estoque: Math.max(0, Number(produto.estoque || 0) - restante),
            estoqueLojista: Math.max(
              0,
              Number(produto.estoqueLojista || 0) - restante
            ),
          },
        });

        // Credita estoquePessoal do lojista ← ponto central do fluxo
        const lojista = await prisma.usuario.findUnique({
          where: { id: pedido.usuarioId },
        });
        if (lojista) {
          const estoquePessoal = {
            ...(lojista.estoquePessoal || {}),
          } as Record<string, number>;
          const chave = String(pedido.produtoId);
          estoquePessoal[chave] =
            Number(estoquePessoal[chave] || 0) + restante;
          await prisma.usuario.update({
            where: { id: lojista.id },
            data: { estoquePessoal },
          });
        }
      }

      // Atualiza controle financeiro do pedido
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: {
          quantidadePagaFornecedor: quantidade,
          totalPagoFornecedor,
          saldoFornecedor: 0,
          tipoFluxo: "compra_fornecedor",
        },
      });
    }

    // ── FORNECEDOR: reverter ao cancelar pedido que já estava em entrega ──
    if (
      fluxoFornecedor &&
      mudouParaCancelado &&
      statusEntrega.includes(pedido.status) &&
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

      // Reverte estoquePessoal do lojista
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

    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/lojistas/${pedido.usuarioId}`);
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
