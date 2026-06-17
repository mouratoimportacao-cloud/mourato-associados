"use server";

import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
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

export async function importarProdutosPlanilha(base64Data: string) {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    let updatedCount = 0;
    let ignoredCount = 0;
    const warnings: string[] = [];

    for (const row of rows) {
      const getVal = (possibleKeys: string[]) => {
        const foundKey = Object.keys(row).find(k => {
          const normK = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          return possibleKeys.some(pk => normK === pk);
        });
        return foundKey ? row[foundKey] : undefined;
      };

      const codigoRaw = getVal(["codigo", "cod"]);
      const produtoNome = getVal(["produto", "nome"]);
      const custoDolarRaw = getVal(["custo usd", "custo dolar", "custo u$d", "custousd"]);
      const cotacaoDolarRaw = getVal(["cotacao usd", "cotacao dolar", "cotacaousd", "cotacao"]);
      const precoVendaRaw = getVal(["preco de venda", "preco venda", "preco", "precodevenda"]);
      const quantidadeEstoqueRaw = getVal(["quantidade estoque", "quantidade", "estoque", "quantidadeestoque"]);

      if (codigoRaw === undefined) {
        ignoredCount++;
        continue;
      }

      const codigo = Number(codigoRaw);
      if (isNaN(codigo)) {
        ignoredCount++;
        warnings.push(`Linha com código inválido ignorada: ${codigoRaw}`);
        continue;
      }

      const produto = await prisma.produto.findFirst({
        where: { codigo }
      });

      if (!produto) {
        ignoredCount++;
        warnings.push(`Produto com código ${codigo} não encontrado no sistema.`);
        continue;
      }

      const updateData: any = {};

      if (quantidadeEstoqueRaw !== undefined) {
        const estoqueVal = parseInt(String(quantidadeEstoqueRaw));
        if (!isNaN(estoqueVal)) {
          updateData.estoque = estoqueVal;
          updateData.estoqueLojista = estoqueVal;
        }
      }

      if (precoVendaRaw !== undefined) {
        const precoVal = parseFloat(String(precoVendaRaw));
        if (!isNaN(precoVal)) {
          updateData.preco = precoVal;
        }
      }

      if (custoDolarRaw !== undefined) {
        const custoVal = parseFloat(String(custoDolarRaw));
        if (!isNaN(custoVal)) {
          updateData.custoDolar = custoVal;
        }
      }

      if (cotacaoDolarRaw !== undefined) {
        const cotacaoVal = parseFloat(String(cotacaoDolarRaw));
        if (!isNaN(cotacaoVal)) {
          updateData.cotacaoDolar = cotacaoVal;
        }
      }

      if (produtoNome !== undefined && String(produtoNome).trim()) {
        updateData.nome = String(produtoNome).trim();
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.produto.update({
          where: { id: produto.id },
          data: updateData
        });
        updatedCount++;
      } else {
        ignoredCount++;
      }
    }

    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    revalidatePath("/");

    return {
      success: true,
      updatedCount,
      ignoredCount,
      warnings
    };

  } catch (error: any) {
    console.error("Erro ao importar planilha:", error);
    return {
      success: false,
      error: error.message || "Erro desconhecido ao processar planilha"
    };
  }
}
