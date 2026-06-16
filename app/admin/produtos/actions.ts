"use server";

import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
async function imageToDataUrl(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const mimeType = file.type || "image/jpeg";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function createProduto(formData: FormData) {
  const nome = formData.get("nome") as string;
  const marca = formData.get("marca") as string;
  const categoria = formData.get("categoria") as string;
  const volume = formData.get("volume") as string;
  const precoRaw = formData.get("preco") as string;
  const precoAtacadoRaw = formData.get("precoAtacado") as string;
  const custoDolarRaw = formData.get("custoDolar") as string;
  const cotacaoDolarRaw = formData.get("cotacaoDolar") as string;
  const estoqueRaw = formData.get("estoque") as string;
  const estoqueLojistaRaw = formData.get("estoqueLojista") as string;
  const vitrine = formData.get("vitrine") === "on";
  const promocaoAtiva = formData.get("promocaoAtiva") === "on";
  const descontoPercentualRaw = formData.get("descontoPercentual") as string;
  const descricao = formData.get("descricao") as string;

  const preco = precoRaw ? parseFloat(precoRaw) : null;
  const precoAtacado = precoAtacadoRaw ? parseFloat(precoAtacadoRaw) : null;
  const custoDolar = custoDolarRaw ? parseFloat(custoDolarRaw) : null;
  const cotacaoDolar = cotacaoDolarRaw ? parseFloat(cotacaoDolarRaw) : null;
  const estoque = estoqueRaw ? parseInt(estoqueRaw) : 0;
  const estoqueLojista = estoqueLojistaRaw ? parseInt(estoqueLojistaRaw) : estoque;
  const descontoPercentual = descontoPercentualRaw ? parseFloat(descontoPercentualRaw) : null;

  try {
    let imagem: string | null = null;
    const produtos = await prisma.produto.findMany();
    const codigo = produtos.reduce((max: number, produto: any) => {
      const codigoAtual = Number(produto.codigo ?? produto.id ?? 0);
      return Math.max(max, codigoAtual);
    }, 0) + 1;

    const imageFile = formData.get("imagemFile") as File | null;
    if (imageFile && imageFile.size > 0) {
      imagem = await imageToDataUrl(imageFile);
    }

    await prisma.produto.create({
      data: {
        codigo,
        nome,
        marca,
        categoria,
        volume,
        preco,
        precoAtacado,
        custoDolar,
        cotacaoDolar,
        estoque,
        estoqueLojista,
        vitrine,
        promocaoAtiva,
        descontoPercentual,
        descricao,
        imagem,
      },
    });

    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    return { success: false, error: "Erro ao cadastrar produto" };
  }
}

export async function updateProduto(id: number, formData: FormData) {
  const nome = formData.get("nome") as string;
  const marca = formData.get("marca") as string;
  const categoria = formData.get("categoria") as string;
  const volume = formData.get("volume") as string;
  const precoRaw = formData.get("preco") as string;
  const precoAtacadoRaw = formData.get("precoAtacado") as string;
  const custoDolarRaw = formData.get("custoDolar") as string;
  const cotacaoDolarRaw = formData.get("cotacaoDolar") as string;
  const estoqueRaw = formData.get("estoque") as string;
  const estoqueLojistaRaw = formData.get("estoqueLojista") as string;
  const vitrine = formData.get("vitrine") === "on";
  const promocaoAtiva = formData.get("promocaoAtiva") === "on";
  const descontoPercentualRaw = formData.get("descontoPercentual") as string;
  const descricao = formData.get("descricao") as string;

  const preco = precoRaw ? parseFloat(precoRaw) : null;
  const precoAtacado = precoAtacadoRaw ? parseFloat(precoAtacadoRaw) : null;
  const custoDolar = custoDolarRaw ? parseFloat(custoDolarRaw) : null;
  const cotacaoDolar = cotacaoDolarRaw ? parseFloat(cotacaoDolarRaw) : null;
  const estoque = estoqueRaw ? parseInt(estoqueRaw) : 0;
  const estoqueLojista = estoqueLojistaRaw ? parseInt(estoqueLojistaRaw) : estoque;
  const descontoPercentual = descontoPercentualRaw ? parseFloat(descontoPercentualRaw) : null;

  try {
    let imagem: string | null = undefined as any;

    const imageFile = formData.get("imagemFile") as File | null;
    if (imageFile && imageFile.size > 0) {
      imagem = await imageToDataUrl(imageFile);
    }

    const updateData: any = {
      nome,
      marca,
      categoria,
      volume,
      preco,
      precoAtacado,
      custoDolar,
      cotacaoDolar,
      estoque,
      estoqueLojista,
      vitrine,
      promocaoAtiva,
      descontoPercentual,
      descricao,
    };

    if (imagem !== undefined) {
      updateData.imagem = imagem;
    }

    await prisma.produto.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    return { success: false, error: "Erro ao atualizar produto" };
  }
}

export async function deleteProduto(id: number) {
  try {
    await prisma.produto.delete({
      where: { id },
    });

    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    return { success: false, error: "Erro ao excluir produto" };
  }
}
