"use server";

import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
  descricao: ["descricao", "detalhes", "observacao", "description", "obs"]
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
      const mappedData: any = {};

      const getVal = (field: string) => {
        const colName = mapping[field];
        return colName ? row[colName] : undefined;
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

      let brandRaw = getVal("marca");
      let marca = brandRaw !== undefined ? String(brandRaw).trim() : "";
      if (!marca && nome) {
        marca = extractBrandFromName(nome, knownBrands);
        warnings.push(`Marca ausente. Extraída automaticamente do nome: "${marca}".`);
      } else if (!marca) {
        warnings.push("Marca ausente.");
      }

      let volumeRaw = getVal("volume");
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

      let categoriaRaw = getVal("categoria");
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
        categoria,
        volume,
        precoCusto: precoCusto || 0,
        precoLojista: precoLojista || 0,
        precoSugerido: precoSugerido || 0,
        estoqueGeral,
        estoqueLojista,
        imagem,
        descricao
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
        descricao
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
        imagem: imagem || null
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
