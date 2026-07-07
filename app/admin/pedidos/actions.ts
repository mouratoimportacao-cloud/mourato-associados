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
export async function atualizarStatusPedidoInterno(
  pedidoId: number,
  status: string,
  descontoVal: number | null
) {
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

    const statusEntrega = ["aguardando pagamento", "pago", "enviado", "entregue"];
    const pagamento = String(pedido.pagamento || "");

    const fluxoFornecedor =
      String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
      pagamento.includes("Pedido ao fornecedor") ||
      pagamento.includes("Compra do fornecedor") ||
      pedido.status === "pendente fornecedor";

    const fluxoSite =
      String(pedido.tipoFluxo || "") === "intencao_site";

    // ── REGRA DE CRÉDITO/ESTORNO DE ESTOQUE PESSOAL DO LOJISTA (MARCADOR NA OBSERVAÇÃO) ──
    const jaCreditado = String(pedido.observacao || "").includes("[ESTOQUE_LOJISTA_CREDITADO]");
    const statusAtivosCredito = [
      "pendente fornecedor",
      "aguardando confirmacao admin",
      "aguardando pagamento",
      "pago",
      "enviado",
      "entregue"
    ];

    const deveCreditar = fluxoFornecedor && statusAtivosCredito.includes(status) && !jaCreditado;
    const deveEstornar = fluxoFornecedor && (status === "cancelado" || status === "rejeitado" || status === "intencao de compra") && jaCreditado;

    // ── REGRA DE DÉBITO/ESTORNO DE ESTOQUE GLOBAL DO ADM PARA VENDAS DIRETA (MARCADOR NA OBSERVAÇÃO) ──
    const jaDebitadoAdm = String(pedido.observacao || "").includes("[ESTOQUE_ADM_DEBITADO]");
    const statusAtivosSite = ["aguardando pagamento", "pago", "enviado", "entregue"];

    const deveDebitarAdm = fluxoSite && statusAtivosSite.includes(status) && !jaDebitadoAdm;
    const deveEstornarAdm = fluxoSite && (status === "cancelado" || status === "rejeitado" || status === "intencao de compra") && jaDebitadoAdm;

    // A. Crédito do estoque pessoal do lojista
    if (deveCreditar && pedido.produtoId && pedido.quantidade && pedido.usuarioId) {
      const quantidade = Number(pedido.quantidade);
      const lojista = await prisma.usuario.findUnique({
        where: { id: pedido.usuarioId },
      });
      if (lojista) {
        const estoquePessoal = {
          ...(lojista.estoquePessoal || {}),
        } as Record<string, number>;
        const chave = String(pedido.produtoId);
        estoquePessoal[chave] = Number(estoquePessoal[chave] || 0) + quantidade;
        await prisma.usuario.update({
          where: { id: lojista.id },
          data: { estoquePessoal },
        });
      }

      // Adiciona o marcador de forma persistente na observação do pedido
      const novaObservacao = `${pedido.observacao || ""} [ESTOQUE_LOJISTA_CREDITADO]`.trim();
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: { observacao: novaObservacao }
      });
      pedido.observacao = novaObservacao; // Atualiza em memória
    }

    // B. Estorno do estoque pessoal do lojista (ao cancelar ou rejeitar)
    if (deveEstornar && pedido.produtoId && pedido.quantidade && pedido.usuarioId) {
      const quantidade = Number(pedido.quantidade);
      const lojista = await prisma.usuario.findUnique({
        where: { id: pedido.usuarioId },
      });
      if (lojista) {
        const estoquePessoal = {
          ...(lojista.estoquePessoal || {}),
        } as Record<string, number>;
        const chave = String(pedido.produtoId);
        estoquePessoal[chave] = Math.max(0, Number(estoquePessoal[chave] || 0) - quantidade);
        await prisma.usuario.update({
          where: { id: lojista.id },
          data: { estoquePessoal },
        });
      }

      // Remove o marcador da observação do pedido
      const novaObservacao = String(pedido.observacao || "").replace("[ESTOQUE_LOJISTA_CREDITADO]", "").trim();
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: { observacao: novaObservacao }
      });
      pedido.observacao = novaObservacao; // Atualiza em memória
    }

    // C. Atualização financeira do fornecedor (ao passar para pago)
    if (fluxoFornecedor && status === "pago" && pedido.status !== "pago") {
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: {
          quantidadePagaFornecedor: Number(pedido.quantidade || 0),
          totalPagoFornecedor: pedido.total,
          saldoFornecedor: 0,
        },
      });
    }

    // D. Débito do estoque global do ADM para venda do site
    if (deveDebitarAdm && pedido.produtoId && pedido.quantidade) {
      const quantidade = Number(pedido.quantidade);
      const produto = await prisma.produto.findUnique({
        where: { id: pedido.produtoId },
      });
      if (produto) {
        await prisma.produto.update({
          where: { id: produto.id },
          data: {
            estoque: Math.max(0, Number(produto.estoque || 0) - quantidade),
            estoqueLojista: Math.max(0, Number(produto.estoqueLojista || 0) - quantidade),
          },
        });
      }

      // Adiciona o marcador de forma persistente na observação do pedido
      const novaObservacao = `${pedido.observacao || ""} [ESTOQUE_ADM_DEBITADO]`.trim();
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: { observacao: novaObservacao }
      });
      pedido.observacao = novaObservacao; // Atualiza em memória
    }

    // E. Estorno do estoque global do ADM para venda do site
    if (deveEstornarAdm && pedido.produtoId && pedido.quantidade) {
      const quantidade = Number(pedido.quantidade);
      const produto = await prisma.produto.findUnique({
        where: { id: pedido.produtoId },
      });
      if (produto) {
        await prisma.produto.update({
          where: { id: produto.id },
          data: {
            estoque: Number(produto.estoque || 0) + quantidade,
            estoqueLojista: Number(produto.estoqueLojista || 0) + quantidade,
          },
        });
      }

      // Remove o marcador da observação do pedido
      const novaObservacao = String(pedido.observacao || "").replace("[ESTOQUE_ADM_DEBITADO]", "").trim();
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: { observacao: novaObservacao }
      });
      pedido.observacao = novaObservacao; // Atualiza em memória
    }

    // ── FORNECEDOR: Devolver estoque ao fornecedor se o pedido for cancelado ──
    const mudouParaCancelado = status === "cancelado" && pedido.status !== "cancelado";
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
    }

    // ── FORNECEDOR: Retirar estoque do fornecedor se o pedido sair do status cancelado ──
    const saiuDeCancelado = status !== "cancelado" && pedido.status === "cancelado";
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
    }

    // ── VENDA QR: ajuste de estoquePessoal ao cancelar/reativar ──
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

  try {
    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");
    if (pedidoUsuarioId) {
      revalidatePath(`/admin/lojistas/${pedidoUsuarioId}`);
    }
    revalidatePath("/admin/produtos");
    revalidatePath("/lojista/painel");
    revalidatePath("/produtos");
  } catch (e) {
    console.warn("Aviso: revalidatePath ignorado no ambiente CLI/Teste.");
  }
}

export async function atualizarStatusPedido(formData: FormData) {
  const pedidoId = Number(formData.get("pedidoId"));
  const status = String(formData.get("status") || "");
  const descontoInput = formData.get("desconto");
  const descontoVal = descontoInput !== null && descontoInput !== undefined && descontoInput !== "" ? Number(descontoInput) : null;

  if (!pedidoId || !status) return;

  try {
    await atualizarStatusPedidoInterno(pedidoId, status, descontoVal);
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
    ["aguardando pagamento", "pago", "enviado", "entregue", "cancelado"].includes(pedido.status)
  ) {
    return {
      success: false,
      error: "Não é permitido excluir pedido com status finalizado ou em processo de pagamento",
    };
  }

  try {
    await prisma.$transaction(async (tx: any) => {
      if (pedido && pedido.status !== "cancelado" && pedido.produtoId && pedido.quantidade) {
        const fluxoFornecedor =
          String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
          String(pedido.pagamento || "").includes("Pedido ao fornecedor") ||
          String(pedido.pagamento || "").includes("Compra do fornecedor") ||
          pedido.status === "pendente fornecedor";

        const fluxoSite =
          String(pedido.tipoFluxo || "") === "intencao_site";

        if (fluxoFornecedor) {
          const produto = await tx.produto.findUnique({ where: { id: pedido.produtoId } });
          if (produto) {
            await tx.produto.update({
              where: { id: produto.id },
              data: {
                estoque: Number(produto.estoque || 0) + Number(pedido.quantidade),
                estoqueLojista: Number(produto.estoqueLojista || 0) + Number(pedido.quantidade),
              },
            });
          }

          const jaCreditado = String(pedido.observacao || "").includes("[ESTOQUE_LOJISTA_CREDITADO]");
          if (jaCreditado && pedido.usuarioId) {
            const lojista = await tx.usuario.findUnique({ where: { id: pedido.usuarioId } });
            if (lojista) {
              const estoquePessoal = { ...(lojista.estoquePessoal || {}) } as Record<string, number>;
              const chave = String(pedido.produtoId);
              estoquePessoal[chave] = Math.max(0, Number(estoquePessoal[chave] || 0) - Number(pedido.quantidade));
              await tx.usuario.update({ where: { id: lojista.id }, data: { estoquePessoal } });
            }
          }
        } else if (fluxoSite) {
          const jaDebitadoAdm = String(pedido.observacao || "").includes("[ESTOQUE_ADM_DEBITADO]");
          if (jaDebitadoAdm) {
            const produto = await tx.produto.findUnique({ where: { id: pedido.produtoId } });
            if (produto) {
              await tx.produto.update({
                where: { id: produto.id },
                data: {
                  estoque: Number(produto.estoque || 0) + Number(pedido.quantidade),
                  estoqueLojista: Number(produto.estoqueLojista || 0) + Number(pedido.quantidade),
                },
              });
            }
          }
        }
      }

      await tx.pedido.delete({ where: { id: pedidoId } });
    });

    try {
      revalidatePath("/admin");
      revalidatePath("/admin/pedidos");
    } catch (e) {
      console.warn("Aviso: revalidatePath ignorado no ambiente CLI/Teste.");
    }
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
