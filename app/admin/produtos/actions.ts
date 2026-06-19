"use server";

import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

async function imageToDataUrl(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = await sharp(Buffer.from(bytes))
    .rotate()
    .resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

export async function createProduto(formData: FormData) {
  const nome = formData.get("nome") as string;
  const marca = formData.get("marca") as string;
  const categoria_principal = (formData.get("categoria_principal") as string) || "Perfume";
  const tags = formData.getAll("tags") as string[];
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

  // Novos campos técnicos
  const concentracao = formData.get("concentracao") as string;
  const origem = formData.get("origem") as string;
  const tipo_perfume = formData.get("tipo_perfume") as string;
  const genero = formData.get("genero") as string;
  const familia_olfativa = formData.getAll("familia_olfativa") as string[];
  const notas_topo = formData.get("notas_topo") as string;
  const notas_coracao = formData.get("notas_coracao") as string;
  const notas_fundo = formData.get("notas_fundo") as string;
  const fixacao_estimada = formData.get("fixacao_estimada") as string;
  const projecao = formData.get("projecao") as string;
  const ocasiao_uso = formData.getAll("ocasiao_uso") as string[];
  const similaridade_inspiracao = formData.get("similaridade_inspiracao") as string;
  const descricao_olfativa = formData.get("descricao_olfativa") as string;

  const preco = precoRaw ? parseFloat(precoRaw) : null;
  const precoAtacado = precoAtacadoRaw ? parseFloat(precoAtacadoRaw) : null;
  const custoDolar = custoDolarRaw ? parseFloat(custoDolarRaw) : null;
  const cotacaoDolar = cotacaoDolarRaw ? parseFloat(cotacaoDolarRaw) : null;
  const estoque = estoqueRaw ? parseInt(estoqueRaw) : 0;
  const estoqueLojista = estoqueLojistaRaw ? parseInt(estoqueLojistaRaw) : estoque;
  const descontoPercentual = descontoPercentualRaw ? parseFloat(descontoPercentualRaw) : null;

  // Retrocompatibilidade de Categoria
  let categoria = categoria_principal;
  if (categoria_principal === "Perfume" && tags.includes("Perfume Árabe")) {
    categoria = "Perfume Árabe";
  }

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
        // Novos campos
        categoria_principal,
        tags,
        concentracao,
        origem,
        tipo_perfume,
        genero,
        familia_olfativa,
        notas_topo,
        notas_coracao,
        notas_fundo,
        fixacao_estimada,
        projecao,
        ocasiao_uso,
        similaridade_inspiracao,
        descricao_olfativa,
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
  const categoria_principal = (formData.get("categoria_principal") as string) || "Perfume";
  const tags = formData.getAll("tags") as string[];
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

  // Novos campos técnicos
  const concentracao = formData.get("concentracao") as string;
  const notas_topo = formData.get("notas_topo") as string;
  const notas_coracao = formData.get("notas_coracao") as string;
  const notas_fundo = formData.get("notas_fundo") as string;
  const similaridade_inspiracao = formData.get("similaridade_inspiracao") as string;
  const descricao_olfativa = formData.get("descricao_olfativa") as string;

  const preco = precoRaw ? parseFloat(precoRaw) : null;
  const precoAtacado = precoAtacadoRaw ? parseFloat(precoAtacadoRaw) : null;
  const custoDolar = custoDolarRaw ? parseFloat(custoDolarRaw) : null;
  const cotacaoDolar = cotacaoDolarRaw ? parseFloat(cotacaoDolarRaw) : null;
  const estoque = estoqueRaw ? parseInt(estoqueRaw) : 0;
  const estoqueLojista = estoqueLojistaRaw ? parseInt(estoqueLojistaRaw) : estoque;
  const descontoPercentual = descontoPercentualRaw ? parseFloat(descontoPercentualRaw) : null;

  // Retrocompatibilidade de Categoria
  let categoria = categoria_principal;
  if (categoria_principal === "Perfume" && tags.includes("Perfume Árabe")) {
    categoria = "Perfume Árabe";
  }

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
      // Novos campos
      categoria_principal,
      tags,
      concentracao,
      notas_topo,
      notas_coracao,
      notas_fundo,
      similaridade_inspiracao,
      descricao_olfativa,
    };

    if (formData.has("origem")) {
      updateData.origem = formData.get("origem") as string;
    }
    if (formData.has("tipo_perfume")) {
      updateData.tipo_perfume = formData.get("tipo_perfume") as string;
    }
    if (formData.has("genero")) {
      updateData.genero = formData.get("genero") as string;
    }
    if (formData.has("familia_olfativa")) {
      updateData.familia_olfativa = formData.getAll("familia_olfativa") as string[];
    }
    if (formData.has("fixacao_estimada")) {
      updateData.fixacao_estimada = formData.get("fixacao_estimada") as string;
    }
    if (formData.has("projecao")) {
      updateData.projecao = formData.get("projecao") as string;
    }
    if (formData.has("ocasiao_uso")) {
      updateData.ocasiao_uso = formData.getAll("ocasiao_uso") as string[];
    }

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

const FIELD_ALIASES: Record<string, string[]> = {
  codigo: ["codigo", "cod", "id", "sku"],
  nome: ["nome", "produto", "descrição do produto", "nome do produto", "title", "name", "designacao"],
  marca: ["marca", "fabricante", "brand", "producer"],
  categoria: ["categoria", "grupo", "seção", "category", "group", "classificacao"],
  volume: ["volume", "tamanho", "ml", "peso", "size", "vol"],
  precoCusto: ["preco de custo", "preco custo", "custo", "valor de custo", "valor custo", "custo dolar", "custo usd", "custo u$", "cost", "compra"],
  precoLojista: ["preco lojista", "lojista", "preco atacado", "atacado", "preco revenda", "revenda", "wholesales"],
  precoSugerido: ["preco sugerido", "preco venda", "preco", "preco de venda", "sugerido", "venda", "price"],
  estoqueGeral: ["estoque geral", "estoque", "quantidade", "qtd", "estoque total", "geral", "stock"],
  estoqueLojista: ["estoque lojista", "estoque atacado", "qtd lojista", "quantidade lojista"],
  imagem: ["imagem", "url", "foto", "image", "pic", "link"],
  descricao: ["descricao", "detalhes", "observacao", "description", "obs"],
  categoria_principal: ["categoria principal", "secao principal", "categoria_principal", "main_category"],
  tags: ["tags", "etiquetas", "tags do produto", "tag"],
  concentracao: ["concentracao", "concentração", "concentration"],
  origem: ["origem", "origin"],
  tipo_perfume: ["tipo de perfume", "tipo", "tipo_perfume", "type"],
  genero: ["genero", "gênero", "gender", "sexo"],
  familia_olfativa: ["familia olfativa", "família olfativa", "familia", "olfative family"],
  notas_topo: ["notas de topo", "topo", "notas_topo", "saida", "notas de saida", "top notes"],
  notas_coracao: ["notas de coracao", "notas de coração", "coracao", "coração", "notas_coracao", "corpo", "notas de corpo", "heart notes", "middle notes"],
  notas_fundo: ["notas de fundo", "fundo", "notas_fundo", "base", "notas de base", "base notes"],
  fixacao_estimada: ["fixacao estimada", "fixação estimada", "fixacao", "fixação", "durabilidade", "longevity"],
  projecao: ["projecao", "projeção", "rastro", "rastro do perfume", "sillage", "projection"],
  ocasiao_uso: ["ocasiao de uso", "ocasião de uso", "ocasiao", "ocasião", "occasions"],
  similaridade_inspiracao: ["similaridade inspiracao", "similaridade inspiração", "similaridade", "inspiracao", "inspiração", "inspirado em", "similarity", "inspiration"],
  descricao_olfativa: ["descricao olfativa", "descrição olfativa", "olfactive description"]
};

const ARABIC_TERMS = ["yara", "lattafa", "oud", "musk", "sharf", "mahib", "sahib", "norah", "al faras", "adyan", "ajyad", "hamidi", "árabe", "arab", "dubai", "oriental", "perfume árabe"];

function parseBrazilianNumber(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") return val;
  const str = String(val).trim();
  if (!str) return null;
  
  let normalized = str;
  if (normalized.includes(",") && normalized.includes(".")) {
    if (normalized.indexOf(".") < normalized.indexOf(",")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

function extractVolumeFromName(name: string): string | null {
  const match = name.match(/\b(\d+)\s*(ML|ml|Ml|mL)\b/);
  if (match) {
    return match[1] + "ml";
  }
  return null;
}

function extractBrandFromName(name: string, knownBrands: string[]): string {
  const lowerName = name.toLowerCase();
  const sortedBrands = [...knownBrands].sort((a, b) => b.length - a.length);
  for (const brand of sortedBrands) {
    if (lowerName.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  
  const words = name.trim().split(/\s+/);
  if (words.length > 0 && words[0].length > 1) {
    return words[0];
  }
  return "Importado";
}

function isArabicProduct(name: string, brand: string): boolean {
  const searchStr = `${name} ${brand}`.toLowerCase();
  return ARABIC_TERMS.some(term => searchStr.includes(term));
}

export async function analisarPlanilhaAction(base64Data: string, customMapping?: Record<string, string>) {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    if (rows.length === 0) {
      return { success: false, error: "A planilha está vazia." };
    }

    const headers = Array.from(
      new Set(rows.flatMap(row => Object.keys(row)))
    );

    const mapping: Record<string, string> = customMapping || {};
    if (!customMapping) {
      Object.keys(FIELD_ALIASES).forEach(field => {
        const aliases = FIELD_ALIASES[field];
        const foundHeader = headers.find(h => {
          const normH = h.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          return aliases.some(alias => normH === alias);
        });
        if (foundHeader) {
          mapping[field] = foundHeader;
        } else {
          mapping[field] = "";
        }
      });
    }

    const dbProducts = await prisma.produto.findMany() as any[];
    const knownBrands = Array.from(new Set([
      "Marc Joseph", "Milestone", "Boulevard", "Al Faras", "Adyan", "Lattafa", "M&A Fragrâncias", "Ajyad", "Hamidi", "Karseell",
      ...dbProducts.map(p => p.marca)
    ].filter(Boolean)));

    const processedRows: any[] = [];
    let newCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors: string[] = [];
      const warnings: string[] = [];

      const getVal = (field: string) => {
        const colName = mapping[field];
        return colName ? row[colName] : undefined;
      };

      const getArrayFromCell = (field: string) => {
        const val = getVal(field);
        if (val === undefined || val === null) return [];
        if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
        const str = String(val).trim();
        if (!str) return [];
        return str.split(/[,\;+]/).map(item => item.trim()).filter(Boolean);
      };

      const getStringFromCell = (field: string) => {
        const val = getVal(field);
        return val !== undefined && val !== null ? String(val).trim() : null;
      };

      const codigoRaw = getVal("codigo");
      let codigo: number | undefined = undefined;
      if (codigoRaw !== undefined) {
        const parsed = parseInt(String(codigoRaw));
        if (!isNaN(parsed)) {
          codigo = parsed;
        }
      }

      const nomeRaw = getVal("nome");
      const nome = nomeRaw !== undefined ? String(nomeRaw).trim() : "";
      if (!nome) {
        errors.push("O campo 'Nome' é obrigatório e está vazio ou ausente.");
      }

      const brandRaw = getVal("marca");
      let marca = brandRaw !== undefined ? String(brandRaw).trim() : "";
      if (!marca && nome) {
        marca = extractBrandFromName(nome, knownBrands);
        warnings.push(`Marca ausente. Extraída automaticamente do nome: "${marca}".`);
      } else if (!marca) {
        warnings.push("Marca ausente.");
      }

      const volumeRaw = getVal("volume");
      let volume = volumeRaw !== undefined ? String(volumeRaw).trim() : "";
      if (!volume && nome) {
        const extractedVolume = extractVolumeFromName(nome);
        if (extractedVolume) {
          volume = extractedVolume;
          warnings.push(`Volume ausente. Extraído automaticamente do nome: "${volume}".`);
        } else {
          warnings.push("Volume ausente.");
        }
      } else if (!volume) {
        warnings.push("Volume ausente.");
      }

      const categoriaRaw = getVal("categoria");
      let categoria = categoriaRaw !== undefined ? String(categoriaRaw).trim() : "";
      if (!categoria) {
        if (nome && isArabicProduct(nome, marca)) {
          categoria = "Perfume Árabe";
          warnings.push(`Categoria ausente. Definida como "Perfume Árabe" por conter termos/marcas árabes.`);
        } else {
          categoria = "Perfume";
          warnings.push('Categoria ausente. Definida como "Perfume" (padrão).');
        }
      } else if ((categoria === "Perfume" || categoria === "") && nome && isArabicProduct(nome, marca)) {
        categoria = "Perfume Árabe";
        warnings.push('Categoria alterada para "Perfume Árabe" por conter termos/marcas árabes.');
      }

      // Categoria principal e Tags
      const categoriaPrincipalRaw = getVal("categoria_principal");
      let categoria_principal = categoriaPrincipalRaw !== undefined ? String(categoriaPrincipalRaw).trim() : "";
      if (!categoria_principal) {
        if (categoria.includes("Perfume") || categoria === "Oud") {
          categoria_principal = "Perfume";
        } else if (categoria === "Cosmético" || categoria === "Skincare") {
          categoria_principal = "Cosmético";
        } else if (categoria === "Acessório") {
          categoria_principal = "Acessório";
        } else if (categoria === "Kit") {
          categoria_principal = "Kit";
        } else {
          categoria_principal = "Perfume";
        }
      }

      const tags = getArrayFromCell("tags");
      if ((categoria === "Perfume Árabe" || isArabicProduct(nome, marca)) && !tags.includes("Perfume Árabe")) {
        tags.push("Perfume Árabe");
      }
      if (categoria === "Perfume Feminino" && !tags.includes("Feminino")) {
        tags.push("Feminino");
      }
      if (categoria === "Perfume Masculino" && !tags.includes("Masculino")) {
        tags.push("Masculino");
      }

      let finalCategoria = categoria_principal;
      if (categoria_principal === "Perfume" && tags.includes("Perfume Árabe")) {
        finalCategoria = "Perfume Árabe";
      }

      const concentracao = getStringFromCell("concentracao");
      const origem = getStringFromCell("origem");
      const tipo_perfume = getStringFromCell("tipo_perfume");
      const genero = getStringFromCell("genero");
      const familia_olfativa = getArrayFromCell("familia_olfativa");
      const notas_topo = getStringFromCell("notas_topo");
      const notas_coracao = getStringFromCell("notas_coracao");
      const notas_fundo = getStringFromCell("notas_fundo");
      const fixacao_estimada = getStringFromCell("fixacao_estimada");
      const projecao = getStringFromCell("projecao");
      const ocasiao_uso = getArrayFromCell("ocasiao_uso");
      const similaridade_inspiracao = getStringFromCell("similaridade_inspiracao");
      const descricao_olfativa = getStringFromCell("descricao_olfativa");

      const precoCustoRaw = getVal("precoCusto");
      const precoCusto = parseBrazilianNumber(precoCustoRaw);
      if (precoCusto === null) {
        errors.push(`Preço de custo inválido ou ausente: "${precoCustoRaw || ''}".`);
      } else if (precoCusto < 0) {
        errors.push(`Preço de custo não pode ser negativo: ${precoCusto}.`);
      }

      const precoLojistaRaw = getVal("precoLojista");
      const precoLojista = parseBrazilianNumber(precoLojistaRaw);
      if (precoLojista === null) {
        errors.push(`Preço lojista inválido ou ausente: "${precoLojistaRaw || ''}".`);
      } else if (precoLojista < 0) {
        errors.push(`Preço lojista não pode ser negativo: ${precoLojista}.`);
      }

      const precoSugeridoRaw = getVal("precoSugerido");
      const precoSugerido = parseBrazilianNumber(precoSugeridoRaw);
      if (precoSugerido === null) {
        errors.push(`Preço sugerido inválido ou ausente: "${precoSugeridoRaw || ''}".`);
      } else if (precoSugerido < 0) {
        errors.push(`Preço sugerido não pode ser negativo: ${precoSugerido}.`);
      }

      const estoqueGeralRaw = getVal("estoqueGeral");
      let estoqueGeral = estoqueGeralRaw !== undefined && String(estoqueGeralRaw).trim() !== "" ? parseInt(String(estoqueGeralRaw)) : 0;
      if (isNaN(estoqueGeral)) {
        estoqueGeral = 0;
        warnings.push("Estoque geral inválido. Definido como 0.");
      } else if (estoqueGeral < 0) {
        errors.push(`Estoque geral não pode ser negativo: ${estoqueGeral}.`);
      }

      const estoqueLojistaRaw = getVal("estoqueLojista");
      let estoqueLojista = estoqueLojistaRaw !== undefined && String(estoqueLojistaRaw).trim() !== "" ? parseInt(String(estoqueLojistaRaw)) : 0;
      if (isNaN(estoqueLojista)) {
        estoqueLojista = 0;
        warnings.push("Estoque lojista inválido. Definido como 0.");
      } else if (estoqueLojista < 0) {
        errors.push(`Estoque lojista não pode ser negativo: ${estoqueLojista}.`);
      }

      const imagemRaw = getVal("imagem");
      const imagem = imagemRaw !== undefined ? String(imagemRaw).trim() : "";
      if (!imagem) {
        warnings.push("Imagem ausente.");
      }

      const descricaoRaw = getVal("descricao");
      const descricao = descricaoRaw !== undefined ? String(descricaoRaw).trim() : "";
      if (!descricao) {
        warnings.push("Descrição ausente.");
      }

      if (errors.length > 0) {
        errorCount++;
      }
      if (warnings.length > 0) {
        warningCount += warnings.length;
      }

      let matchedDbProduct = null;
      if (errors.length === 0 && nome) {
        if (codigo !== undefined) {
          matchedDbProduct = dbProducts.find(p => p.codigo === codigo || p.id === codigo);
        }
        if (!matchedDbProduct) {
          matchedDbProduct = dbProducts.find(p => p.nome.toLowerCase() === nome.toLowerCase());
        }
      }

      const status = errors.length > 0 ? "error" : (matchedDbProduct ? "update" : "new");
      if (status === "new") newCount++;
      if (status === "update") updateCount++;

      const mappedDataObj = {
        codigo,
        nome,
        marca,
        categoria: finalCategoria,
        volume,
        precoCusto: precoCusto || 0,
        precoLojista: precoLojista || 0,
        precoSugerido: precoSugerido || 0,
        estoqueGeral,
        estoqueLojista,
        imagem,
        descricao,
        categoria_principal,
        tags,
        concentracao,
        origem,
        tipo_perfume,
        genero,
        familia_olfativa,
        notas_topo,
        notas_coracao,
        notas_fundo,
        fixacao_estimada,
        projecao,
        ocasiao_uso,
        similaridade_inspiracao,
        descricao_olfativa
      };

      const diff: any = {};
      if (matchedDbProduct) {
        const dbCost = matchedDbProduct.custoDolar || 0;
        if (dbCost !== precoCusto) diff.precoCusto = { old: dbCost, new: precoCusto };
        if (matchedDbProduct.precoAtacado !== precoLojista) diff.precoLojista = { old: matchedDbProduct.precoAtacado, new: precoLojista };
        if (matchedDbProduct.preco !== precoSugerido) diff.precoSugerido = { old: matchedDbProduct.preco, new: precoSugerido };
        if (matchedDbProduct.estoque !== estoqueGeral) diff.estoqueGeral = { old: matchedDbProduct.estoque, new: estoqueGeral };
        if (matchedDbProduct.estoqueLojista !== estoqueLojista) diff.estoqueLojista = { old: matchedDbProduct.estoqueLojista, new: estoqueLojista };
      }

      processedRows.push({
        index: i + 1,
        status,
        errors,
        warnings,
        originalRow: row,
        mappedData: mappedDataObj,
        diff,
        dbId: matchedDbProduct?.id
      });
    }

    return {
      success: true,
      headers,
      mapping,
      processedRows,
      stats: {
        total: rows.length,
        new: newCount,
        update: updateCount,
        error: errorCount,
        warning: warningCount
      }
    };
  } catch (err: any) {
    console.error("Erro ao analisar planilha:", err);
    return { success: false, error: err.message || "Erro desconhecido na análise da planilha." };
  }
}

export async function executarImportacaoAction(base64Data: string, mapping: Record<string, string>) {
  try {
    const analysis = await analisarPlanilhaAction(base64Data, mapping);
    if (!analysis.success || !analysis.processedRows) {
      return { success: false, error: analysis.error || "Falha na análise dos dados antes da importação." };
    }

    const { processedRows } = analysis;
    const dbProducts = await prisma.produto.findMany() as any[];

    let createdCount = 0;
    let updatedCount = 0;
    let ignoredCount = 0;
    const importedLogs: any[] = [];

    let nextCodigo = dbProducts.reduce((max: number, p: any) => {
      const c = Number(p.codigo ?? p.id ?? 0);
      return Math.max(max, c);
    }, 0) + 1;

    for (const item of processedRows) {
      if (item.status === "error") {
        ignoredCount++;
        importedLogs.push({
          row: item.index,
          name: item.mappedData.nome || "Produto sem nome",
          status: "ignored",
          errors: item.errors
        });
        continue;
      }

      const { mappedData, status, dbId } = item;
      const {
        codigo,
        nome,
        marca,
        categoria,
        volume,
        precoCusto,
        precoLojista,
        precoSugerido,
        estoqueGeral,
        estoqueLojista,
        imagem,
        descricao,
        categoria_principal,
        tags,
        concentracao,
        origem,
        tipo_perfume,
        genero,
        familia_olfativa,
        notas_topo,
        notas_coracao,
        notas_fundo,
        fixacao_estimada,
        projecao,
        ocasiao_uso,
        similaridade_inspiracao,
        descricao_olfativa
      } = mappedData;

      const savePayload = {
        nome,
        marca,
        categoria,
        volume,
        preco: precoSugerido,
        precoAtacado: precoLojista,
        custoDolar: precoCusto,
        cotacaoDolar: 1.0,
        estoque: estoqueGeral,
        estoqueLojista,
        descricao,
        imagem: imagem || null,
        categoria_principal,
        tags,
        concentracao,
        origem,
        tipo_perfume,
        genero,
        familia_olfativa,
        notas_topo,
        notas_coracao,
        notas_fundo,
        fixacao_estimada,
        projecao,
        ocasiao_uso,
        similaridade_inspiracao,
        descricao_olfativa
      };

      if (status === "update" && dbId) {
        await prisma.produto.update({
          where: { id: dbId },
          data: savePayload
        });
        updatedCount++;
        importedLogs.push({
          row: item.index,
          id: dbId,
          name: nome,
          status: "updated",
          diff: item.diff
        });
      } else {
        const assignedCodigo = codigo !== undefined ? codigo : nextCodigo++;
        await prisma.produto.create({
          data: {
            ...savePayload,
            codigo: assignedCodigo,
            vitrine: false,
            promocaoAtiva: false,
            descontoPercentual: null
          }
        });
        createdCount++;
        importedLogs.push({
          row: item.index,
          codigo: assignedCodigo,
          name: nome,
          status: "created"
        });
      }
    }

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRows: processedRows.length,
        created: createdCount,
        updated: updatedCount,
        ignored: ignoredCount
      },
      mapping,
      logs: importedLogs
    };

    const reportsDir = join(process.cwd(), ".data", "import-reports");
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
    const reportFilename = `report-${Date.now()}.json`;
    const reportPath = join(reportsDir, reportFilename);
    writeFileSync(reportPath, JSON.stringify(reportData, null, 2), "utf8");

    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    revalidatePath("/");

    return {
      success: true,
      summary: reportData.summary,
      reportFilename,
      logs: importedLogs
    };
  } catch (err: any) {
    console.error("Erro ao executar importação:", err);
    return { success: false, error: err.message || "Erro desconhecido na importação." };
  }
}
