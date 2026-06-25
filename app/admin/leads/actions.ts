"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";

export async function atualizarStatusLead(id: number, status: string) {
  try {
    await prisma.lead.update({
      where: { id },
      data: { status },
    });
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar status do lead:", error);
    return { success: false, error: "Erro ao atualizar status do lead." };
  }
}

export async function excluirLead(id: number) {
  try {
    await prisma.lead.delete({
      where: { id },
    });
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir lead:", error);
    return { success: false, error: "Erro ao excluir lead." };
  }
}
