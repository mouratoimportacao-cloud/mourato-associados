"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import sharp from "sharp";

async function imageToDataUrl(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = await sharp(Buffer.from(bytes))
    .rotate()
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

export async function criarRifa(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  const titulo = String(formData.get("titulo") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim();
  const pixFixo = String(formData.get("pixFixo") || "").trim();
  const precoBilhete = Number(formData.get("precoBilhete") || 0);

  if (!titulo) return { success: false, error: "O título da rifa é obrigatório." };
  if (precoBilhete < 0) return { success: false, error: "O preço do bilhete não pode ser negativo." };

  try {
    const imageFile = formData.get("imagemFile") as File | null;
    let imagem: string | null = null;
    if (imageFile && imageFile.size > 0) {
      imagem = await imageToDataUrl(imageFile);
    }

    await prisma.rifa.create({
      data: {
        titulo,
        descricao: descricao || null,
        imagem,
        pixFixo: pixFixo || null,
        precoBilhete,
        status: "ATIVO",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    revalidatePath("/admin/rifas");
    revalidatePath("/rifas");
    revalidatePath("/produtos");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao criar rifa." };
  }
}

export async function aprovarPagamentoBilhete(bilheteId: number) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  try {
    const bilhete = await prisma.bilhete.findUnique({ where: { id: bilheteId } });
    if (!bilhete) return { success: false, error: "Bilhete não encontrado." };
    if (bilhete.statusPagto === "PAGO") return { success: false, error: "Bilhete já está pago." };

    const rifa = await prisma.rifa.findUnique({ where: { id: bilhete.rifaId } });
    if (!rifa) return { success: false, error: "Rifa não encontrada." };

    // Atualizar status do bilhete
    await prisma.bilhete.update({
      where: { id: bilheteId },
      data: { statusPagto: "PAGO" },
    });

    // Se a rifa tiver preço > 0, cria um registro de Pedido de venda pública (intencao_site) para registrar o caixa
    if (Number(rifa.precoBilhete) > 0) {
      await prisma.pedido.create({
        data: {
          usuarioId: 1, // Admin/Fornecedor
          produtoNome: `Rifa: ${rifa.titulo} - Bilhete #${String(bilhete.numeroBilhete).padStart(4, "0")}`,
          quantidade: 1,
          precoUnitario: Number(rifa.precoBilhete),
          total: Number(rifa.precoBilhete),
          tipoFluxo: "intencao_site",
          status: "pago",
          pagamento: "Pix Rifa",
          observacao: `Participante: ${bilhete.nome} (${bilhete.telefone})`,
        },
      });
    }

    revalidatePath("/admin/rifas");
    revalidatePath("/rifas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao aprovar bilhete." };
  }
}

export async function cancelarBilhete(bilheteId: number) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  try {
    await prisma.bilhete.update({
      where: { id: bilheteId },
      data: { statusPagto: "CANCELADO" },
    });

    revalidatePath("/admin/rifas");
    revalidatePath("/rifas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao cancelar bilhete." };
  }
}

export async function realizarSorteio(rifaId: number) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  try {
    const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
    if (!rifa) return { success: false, error: "Rifa não encontrada." };
    if (rifa.status !== "ATIVO") return { success: false, error: "Esta rifa não está ativa." };

    const bilhetesPagos = await prisma.bilhete.findMany({
      where: {
        rifaId,
        statusPagto: "PAGO",
      },
    });

    if (bilhetesPagos.length === 0) {
      return { success: false, error: "Não há bilhetes pagos para realizar o sorteio." };
    }

    // Selecionar um ganhador aleatório
    const indexSorteado = Math.floor(Math.random() * bilhetesPagos.length);
    const ganhador = bilhetesPagos[indexSorteado];

    // Atualizar rifa com o ganhador e finalizada
    await prisma.rifa.update({
      where: { id: rifaId },
      data: {
        status: "FINALIZADO",
        numeroGanhador: ganhador.numeroBilhete,
        dataSorteio: new Date(),
      },
    });

    revalidatePath("/admin/rifas");
    revalidatePath("/rifas");
    revalidatePath("/produtos");
    return {
      success: true,
      ganhador: {
        nome: ganhador.nome,
        telefone: ganhador.telefone,
        usernameInsta: ganhador.usernameInsta,
        numeroBilhete: ganhador.numeroBilhete,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao realizar sorteio." };
  }
}

export async function excluirRifa(rifaId: number) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Sessão administrativa expirada." };

  try {
    // Delete all bilhetes associated with the rifa first to avoid foreign key issues
    await prisma.bilhete.deleteMany({
      where: { rifaId },
    });

    // Delete the rifa
    await prisma.rifa.delete({
      where: { id: rifaId },
    });

    revalidatePath("/admin/rifas");
    revalidatePath("/rifas");
    revalidatePath("/produtos");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao excluir rifa." };
  }
}
