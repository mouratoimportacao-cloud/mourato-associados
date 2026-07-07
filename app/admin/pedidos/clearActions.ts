"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";
import { getAdminSession } from "../../../lib/auth";

export async function limparTodosPedidosAction(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Não autorizado" };

  const confirmPassword = formData.get("confirmPassword");
  if (confirmPassword !== "1307") {
    return { success: false, error: "Senha de confirmação incorreta ou ausente." };
  }

  try {
    await prisma.$transaction(async (tx: any) => {
      // 1. Busca todos os pedidos ATIVOS antes de deletar
      const pedidosAtivos = await tx.pedido.findMany({
        where: {
          status: { notIn: ["cancelado", "rejeitado"] },
          produtoId: { not: null },
        },
        select: {
          produtoId: true,
          quantidade: true,
          tipoFluxo: true,
          pagamento: true,
        },
      });

      // 2. Agrupa a quantidade a devolver por produto
      const estoqueDevolver: Record<number, number> = {};
      for (const p of pedidosAtivos) {
        const pid = p.produtoId as number;
        if (!pid) continue;
        const qtd = Number(p.quantidade || 0);
        const isVendaQr =
          String(p.tipoFluxo || "") === "venda_qr" ||
          ["Dinheiro", "Pix", "Débito", "Crédito à vista", "Crédito parcelado"].some(
            (m) => String(p.pagamento || "").includes(m)
          );
        if (!isVendaQr) {
          estoqueDevolver[pid] = (estoqueDevolver[pid] || 0) + qtd;
        }
      }

      // 3. Restaura o estoque global dos produtos
      for (const [produtoIdStr, qtd] of Object.entries(estoqueDevolver)) {
        const pid = Number(produtoIdStr);
        const produto = await tx.produto.findUnique({ where: { id: pid } });
        if (!produto) continue;
        await tx.produto.update({
          where: { id: pid },
          data: {
            estoque: Number(produto.estoque || 0) + qtd,
            estoqueLojista: Number(produto.estoqueLojista || 0) + qtd,
          },
        });
      }

      // 4. Deleta todos os pedidos
      await tx.pedido.deleteMany();

      // 5. Reseta o estoquePessoal de todos os lojistas
      const usuarios = await tx.usuario.findMany({
        where: { tipo: "lojista" },
      });
      for (const u of usuarios) {
        await tx.usuario.update({
          where: { id: u.id },
          data: { estoquePessoal: {} },
        });
      }
    });

    try {
      revalidatePath("/admin");
      revalidatePath("/admin/pedidos");
      revalidatePath("/admin/lojistas");
      revalidatePath("/admin/produtos");
      revalidatePath("/lojista/painel");
      revalidatePath("/produtos");
    } catch (e) {
      console.warn("Aviso: revalidatePath ignorado.");
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao limpar pedidos:", error);
    return { success: false, error: "Erro interno" };
  }
}
