"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";
import { getAdminSession } from "../../../lib/auth";

export async function limparTodosPedidosAction() {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Não autorizado" };

  try {
    const pedidos = await prisma.pedido.findMany();
    for (const p of pedidos) {
      await prisma.pedido.delete({ where: { id: p.id } });
    }

    // Resetar o estoquePessoal de todos os lojistas
    const usuarios = await prisma.usuario.findMany({
      where: { tipo: "lojista" },
    });

    for (const u of usuarios) {
      if (u.estoquePessoal && Object.keys(u.estoquePessoal).length > 0) {
        await prisma.usuario.update({
          where: { id: u.id },
          data: { estoquePessoal: {} },
        });
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/lojistas");
    revalidatePath("/lojista/painel");
    return { success: true };
  } catch (error) {
    console.error("Erro ao limpar pedidos:", error);
    return { success: false, error: "Erro interno" };
  }
}
