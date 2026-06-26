"use server";

import { prisma } from "../../../lib/prisma";
import { materializeImportedImage, normalizeImportedImage } from "../../../lib/imported-image";
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

async function imageFromFormData(formData: FormData) {
  const imageDataUrl = String(formData.get("imagemDataUrl") || "").trim();
  if (imageDataUrl) {
    if (!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)) {
      throw new Error("A imagem enviada está em formato inválido.");
    }
    return imageDataUrl;
  }

  const imageFile = formData.get("imagemFile") as File | null;
  if (imageFile && imageFile.size > 0) {
    return imageToDataUrl(imageFile);
  }

  return null;
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

    imagem = await imageFromFormData(formData);

    const produtoCriado = await prisma.produto.create({
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

    if (imagem && !produtoCriado?.imagem) {
      throw new Error("O produto foi criado, mas a imagem não foi persistida.");
    }

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

    const imagemRecebida = await imageFromFormData(formData);
    if (imagemRecebida) imagem = imagemRecebida;

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

    const produtoAtualizado = await prisma.produto.update({
      where: { id },
      data: updateData,
    });

    if (imagemRecebida && !produtoAtualizado?.imagem) {
      throw new Error("Os dados foram atualizados, mas a imagem não foi persistida.");
    }

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
  precoCusto: ["preco de custo", "preco custo", "custo brl", "custo r$", "valor de custo", "valor custo", "cost", "compra"],
  custoDolar: ["custo usd", "custo u$", "custo dolar", "custo em dolar", "compra em dolar", "custo_dolar", "custo usd", "custo dollar", "custo u.s.d."],
  cotacaoDolar: ["cotacao usd", "cotacao u$", "cotacao dolar", "cotacao do dolar", "cotacao_dolar", "cotacao", "cambio"],
  precoLojista: ["preco lojista", "lojista", "preco atacado", "atacado", "preco revenda", "revenda", "wholesales"],
  precoSugerido: ["preco sugerido", "preco venda", "preco", "preco de venda", "sugerido", "venda", "price", "preco_venda"],
  estoqueGeral: ["quantidade estoque", "quantidade no estoque", "estoque geral", "estoque", "quantidade", "qtd", "estoque total", "geral", "stock", "quantidade_estoque"],
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
  let str = String(val).trim();
  if (!str) return null;
  
  // Remove currency symbols and non-numeric garbage (keep digits, comma, dot, minus)
  str = str.replace(/[^0-9,\.\-]/g, "");
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

function compareNames(dbName: string, sheetName: string): { ok: boolean; warning?: string } {
  const normDb = dbName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const normSheet = sheetName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normDb === normSheet) {
    return { ok: true };
  }

  const wordsDb = normDb.split(/\s+/).filter(Boolean);
  const wordsSheet = normSheet.split(/\s+/).filter(Boolean);

  if (wordsDb.length === 0 || wordsSheet.length === 0) {
    return { ok: false };
  }

  let matches = 0;
  for (const word of wordsSheet) {
    if (wordsDb.includes(word)) {
      matches++;
    }
  }

  const pctSheet = matches / wordsSheet.length;
  const pctDb = matches / wordsDb.length;
  const highestPct = Math.max(pctSheet, pctDb);

  if (highestPct >= 0.6) {
    return {
      ok: true,
      warning: `Nome com grafia ligeiramente diferente (Banco: "${dbName}", Planilha: "${sheetName}").`
    };
  }

  return { ok: false };
}

export async function analisarPlanilhaAction(base64Data: string, customMapping?: Record<string, string>) {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (rows.length < 2) {
      return { success: false, error: "A planilha está vazia ou não contém dados suficientes." };
    }

    const headers = (rows[0] || []).map(h => String(h || ""));
    const dataRows = rows.slice(1).filter(row => row && row.length > 0 && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ""));

    const dbProducts = await prisma.produto.findMany() as any[];

    const processedRows: any[] = [];
    let updateCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowIndex = i + 2;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Col A (index 0) - Código (com fallback para nome)
      const colARaw = row[0];
      let codigo: number | undefined = undefined;
      let nameFromA = "";

      if (colARaw !== undefined && colARaw !== null) {
        const colAStr = String(colARaw).trim();
        const match = colAStr.match(/^(\d+)\s+(.+)$/);
        if (match) {
          codigo = parseInt(match[1]);
          nameFromA = match[2].trim();
        } else {
          const parsed = parseInt(colAStr);
          if (!isNaN(parsed) && String(parsed) === colAStr) {
            codigo = parsed;
          } else {
            nameFromA = colAStr;
          }
        }
      }

      // Col B (index 1) - Produto (Nome) - preferido sobre o nome extraído da Coluna A
      const colBRaw = row[1];
      let nomePlanilha = "";
      if (colBRaw !== undefined && colBRaw !== null && String(colBRaw).trim() !== "") {
        nomePlanilha = String(colBRaw).trim();
      } else {
        nomePlanilha = nameFromA;
      }

      if (codigo === undefined && !nomePlanilha) {
        continue;
      }

      let matchedDbProduct: any = null;
      if (codigo !== undefined) {
        matchedDbProduct = dbProducts.find(p => {
          const dbCod = p.codigo !== undefined && p.codigo !== null ? Number(p.codigo) : null;
          const dbId = Number(p.id);
          return dbCod === codigo || dbId === codigo;
        });
      }
      if (!matchedDbProduct && nomePlanilha) {
        matchedDbProduct = dbProducts.find(p => p.nome.toLowerCase() === nomePlanilha.toLowerCase());
      }

      if (!matchedDbProduct) {
        errors.push(`Produto não cadastrado no banco (Código: ${codigo ?? "N/A"}, Nome: "${nomePlanilha || "N/A"}"). Novos produtos devem ser cadastrados à mão.`);
        errorCount++;
        processedRows.push({
          index: rowIndex,
          status: "error",
          errors,
          warnings,
          originalRow: row,
          mappedData: { nome: nomePlanilha || "Sem nome" }
        });
        continue;
      }

      if (nomePlanilha) {
        const comparison = compareNames(matchedDbProduct.nome, nomePlanilha);
        if (!comparison.ok) {
          errors.push(`Código #${codigo ?? matchedDbProduct.codigo} diverge do banco (Banco: "${matchedDbProduct.nome}", Planilha: "${nomePlanilha}").`);
          errorCount++;
          processedRows.push({
            index: rowIndex,
            status: "error",
            errors,
            warnings,
            originalRow: row,
            mappedData: { nome: nomePlanilha }
          });
          continue;
        } else if (comparison.warning) {
          warnings.push(comparison.warning);
          warningCount++;
        }
      }

      // Col C (index 2) - Custo USD
      const custoDolarRaw = row[2];
      const custoDolar = parseBrazilianNumber(custoDolarRaw);

      // Col D (index 3) - Cotação USD
      const cotacaoDolarRaw = row[3];
      const cotacaoDolar = parseBrazilianNumber(cotacaoDolarRaw);

      // Col E (index 4) - Preço de Venda
      const precoSugeridoRaw = row[4];
      const precoSugerido = parseBrazilianNumber(precoSugeridoRaw);

      // Col F (index 5) - Quantidade Estoque
      const estoqueGeralRaw = row[5];
      let estoqueGeral = estoqueGeralRaw !== undefined && estoqueGeralRaw !== null && String(estoqueGeralRaw).trim() !== "" ? parseInt(String(estoqueGeralRaw)) : null;

      const finalCustoDolar = custoDolar !== null ? custoDolar : matchedDbProduct.custoDolar;
      const finalCotacaoDolar = cotacaoDolar !== null ? cotacaoDolar : (matchedDbProduct.cotacaoDolar || 1.0);
      const finalPrecoSugerido = precoSugerido !== null ? precoSugerido : matchedDbProduct.preco;
      const finalEstoqueGeral = estoqueGeral !== null && !isNaN(estoqueGeral) ? estoqueGeral : matchedDbProduct.estoque;

      if (finalCustoDolar === null || finalCustoDolar === undefined) {
        errors.push("Preço de custo USD inválido ou não informado.");
      }
      if (finalCotacaoDolar <= 0) {
        errors.push("Cotação do dólar deve ser maior que zero.");
      }
      if (finalPrecoSugerido === null || finalPrecoSugerido === undefined) {
        errors.push("Preço de venda inválido ou não informado.");
      }
      if (finalEstoqueGeral < 0) {
        errors.push("Estoque geral não pode ser negativo.");
      }

      if (errors.length > 0) {
        errorCount++;
        processedRows.push({
          index: rowIndex,
          status: "error",
          errors,
          warnings,
          originalRow: row,
          mappedData: { nome: matchedDbProduct.nome }
        });
        continue;
      }

      updateCount++;

      const mappedDataObj = {
        id: matchedDbProduct.id,
        codigo: matchedDbProduct.codigo ?? codigo,
        nome: matchedDbProduct.nome,
        marca: matchedDbProduct.marca,
        categoria: matchedDbProduct.categoria,
        volume: matchedDbProduct.volume,
        custoDolar: finalCustoDolar,
        cotacaoDolar: finalCotacaoDolar,
        precoCusto: (finalCustoDolar || 0) * (finalCotacaoDolar || 1),
        precoLojista: matchedDbProduct.precoAtacado,
        precoSugerido: finalPrecoSugerido,
        estoqueGeral: finalEstoqueGeral,
        estoqueLojista: matchedDbProduct.estoqueLojista
      };

      const diff: any = {};
      const dbCostDolar = matchedDbProduct.custoDolar || 0;
      const dbCotacaoDolar = matchedDbProduct.cotacaoDolar || 1.0;
      const dbPreco = matchedDbProduct.preco || 0;
      const dbEstoque = matchedDbProduct.estoque || 0;

      if (dbCostDolar !== finalCustoDolar) diff.custoDolar = { old: dbCostDolar, new: finalCustoDolar };
      if (dbCotacaoDolar !== finalCotacaoDolar) diff.cotacaoDolar = { old: dbCotacaoDolar, new: finalCotacaoDolar };
      if (dbPreco !== finalPrecoSugerido) diff.precoSugerido = { old: dbPreco, new: finalPrecoSugerido };
      if (dbEstoque !== finalEstoqueGeral) diff.estoqueGeral = { old: dbEstoque, new: finalEstoqueGeral };

      processedRows.push({
        index: rowIndex,
        status: "update",
        errors,
        warnings,
        originalRow: row,
        mappedData: mappedDataObj,
        diff,
        dbId: matchedDbProduct.id
      });
    }

    return {
      success: true,
      headers,
      mapping: {},
      processedRows,
      stats: {
        total: dataRows.length,
        new: 0,
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

export async function executarImportacaoAction(base64Data: string, mapping?: Record<string, string>) {
  try {
    const analysis = await analisarPlanilhaAction(base64Data);
    if (!analysis.success || !analysis.processedRows) {
      return { success: false, error: analysis.error || "Falha na análise dos dados antes da importação." };
    }

    const { processedRows } = analysis;
    let updatedCount = 0;
    let ignoredCount = 0;
    const importedLogs: any[] = [];

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

      const { mappedData, dbId } = item;
      const {
        nome,
        custoDolar,
        cotacaoDolar,
        precoSugerido,
        estoqueGeral
      } = mappedData;

      await prisma.produto.update({
        where: { id: dbId },
        data: {
          preco: precoSugerido,
          custoDolar: custoDolar,
          cotacaoDolar: cotacaoDolar,
          estoque: estoqueGeral
        }
      });

      updatedCount++;
      importedLogs.push({
        row: item.index,
        id: dbId,
        name: nome,
        status: "updated",
        diff: item.diff
      });
    }

    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    revalidatePath("/");

    return {
      success: true,
      summary: {
        created: 0,
        updated: updatedCount,
        ignored: ignoredCount
      },
      reportFilename: `report-update-${Date.now()}.json`,
      logs: importedLogs
    };
  } catch (err: any) {
    console.error("Erro ao executar importação:", err);
    return { success: false, error: err.message || "Erro desconhecido na importação." };
  }
}


export async function toggleVitrine(id: number, vitrine: boolean) {
  try {
    await prisma.produto.update({
      where: { id },
      data: { vitrine },
    });

    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao alterar vitrine:", error);
    return { success: false, error: "Erro ao alterar vitrine" };
  }
}
