import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import dotenv from "dotenv";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const AID = "E3DL3DbCHHOzBQ";
const UID = "E3DL3DbCHHOzBQHutw3DQl5bgMz2";
const API_BASE = "https://kyte-query-public.kyte.site/api";
const IMAGE_BASE = "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o";
const KYTE_CDN_SECRET = "kyte_prod_9f2c6e1b8a4d5f7c3e0a9d2b6c8f1e4a7d5";

const categories = [
  ["Niche Avenue", "1773066243581-E3DL3"],
  ["Al Fares", "1773061140165-E3DL3"],
  ["Abdul Samad Al Qurashi", "1771444579648-E3DL3"],
  ["Afnan", "1771246642967-E3DL3"],
  ["Al Haramain", "1771260136617-E3DL3"],
  ["Arabyat Prestige", "1782570044049-E3DL3"],
  ["Al Wataniah", "1772819148119-E3DL3"],
  ["Ard Al Zaafaran", "1771270113387-E3DL3"],
  ["Armaf", "1771252813654-E3DL3"],
  ["Aurora Scents", "1771267167835-E3DL3"],
  ["Asdaaf", "1771262181412-E3DL3"],
  ["Bekim Cosmetica Capilar", "1773145875440-E3DL3"],
  ["Cremes", "1773066475778-E3DL3"],
  ["Desodorante", "1773429232136-E3DL3"],
  ["Emper", "1771688547552-E3DL3"],
  ["Fragrance World", "1771444477538-E3DL3"],
  ["French Avenue", "1771248198918-E3DL3"],
  ["Gissat", "1775671664924-E3DL3"],
  ["Kits", "1772899176439-E3DL3"],
  ["Lattafa", "1771500157232-E3DL3"],
  ["Le Chameau", "1771435760872-E3DL3"],
  ["Maison Alhambra", "1768326835944-E3DL3"],
  ["Manasik", "1771672673067-E3DL3"],
  ["Miniaturas", "1773084613812-E3DL3"],
  ["Mirada Shield", "1773400680007-E3DL3"],
  ["Nusuk", "1771681795493-E3DL3"],
  ["Orientica", "1771261246593-E3DL3"],
  ["Perfume Mist", "1773153204736-E3DL3"],
  ["Perfume Spray", "1773414486606-E3DL3"],
  ["Rasasi", "1771265969916-E3DL3"],
  ["Rave", "1771266584418-E3DL3"],
  ["Rayhaan", "1771440880291-E3DL3"],
  ["Riifs", "1771671499366-E3DL3"],
  ["Zimaya", "1771434880241-E3DL3"],
  ["Ohana Kameala", "1774456098406-E3DL3"],
  ["Prelitzy", "1776088441543-E3DL3"],
  ["Milestone", "1776095557892-E3DL3"],
  ["Tree Hut", "1779278482510-E3DL3"],
  ["MPF", "1779967227937-E3DL3"],
  ["Medicube - K Beauty", "1781721070424-E3DL3"],
  ["Celimax - K Beauty", "1781722454174-E3DL3"],
  ["Numbuzin - K Beauty", "1781723282711-E3DL3"],
  ["Sungboon - K Beauty", "1781784178523-E3DL3"],
];

const cosmeticCategories = new Set([
  "Bekim Cosmetica Capilar",
  "Cremes",
  "Desodorante",
  "Tree Hut",
  "MPF",
  "Medicube - K Beauty",
  "Celimax - K Beauty",
  "Numbuzin - K Beauty",
  "Sungboon - K Beauty",
]);

const storePath = join(process.cwd(), ".data", "store.json");
const s3Bucket = process.env.AWS_S3_BUCKET || "";
const s3Key = "store.json";
const shouldUseS3 = Boolean(s3Bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
const s3Client = shouldUseS3
  ? new S3Client({
      region: process.env.AWS_S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractVolume(product) {
  const text = `${product.name || ""}\n${product.description || ""}`;
  const match = text.match(/\b(\d+(?:[,.]\d+)?)\s*(ml|g|kg|l)\b/i);
  if (!match) return product.variants?.length ? "Variação" : "Unidade";
  return `${match[1].replace(".", ",")}${match[2].toLowerCase()}`;
}

function getCategoryPrincipal(categoryName) {
  if (categoryName === "Kits") return "Kit";
  if (categoryName === "Miniaturas") return "Perfume";
  if (cosmeticCategories.has(categoryName)) return "Cosmético";
  return "Perfume";
}

function getCategoria(categoryName) {
  if (categoryName === "Kits") return "Kits";
  if (cosmeticCategories.has(categoryName)) return "Cosmético";
  return "Perfume Árabe";
}

function getImageUrl(product) {
  const image = product.imageThumb || product.image;
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith(`/${UID}%2F`)) return `${IMAGE_BASE}${image}`;
  const filename = image.split("/").pop();
  if (!filename) return null;
  const prefix = product.imageThumb ? "thumb_280_" : "";
  return `${IMAGE_BASE}/${UID}%2F${prefix}${filename}?alt=media`;
}

function getPrice(product) {
  const value = product.lowestPrice ?? product.salePromotionalPrice ?? product.salePrice ?? product.price;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

async function fetchProducts(categoryName, categoryId) {
  const url = new URL(`${API_BASE}/product/${AID}`);
  url.searchParams.set("categoryId", categoryId);
  url.searchParams.set("limit", "500");
  url.searchParams.set("isCatalog", "true");
  url.searchParams.set("unavailableLast", "true");
  url.searchParams.set("isFractioned", "true");
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mourato-Associados-Kyte-Importer/1.0",
      "x-kyte-cdn-secret": KYTE_CDN_SECRET,
    },
  });
  if (!response.ok) {
    throw new Error(`Kyte API ${response.status} em ${categoryName}`);
  }
  const payload = await response.json();
  return (payload._products || []).map((product) => ({ ...product, sourceCategory: categoryName, sourceCategoryId: categoryId }));
}

async function loadStore() {
  if (shouldUseS3 && s3Client) {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
    const body = await response.Body?.transformToString();
    if (body) {
      mkdirSync(dirname(storePath), { recursive: true });
      writeFileSync(join(dirname(storePath), `store.s3-backup-before-kyte-all-${Date.now()}.json`), body);
      return JSON.parse(body);
    }
  }

  if (!existsSync(storePath)) {
    mkdirSync(dirname(storePath), { recursive: true });
    writeFileSync(storePath, JSON.stringify({ rows: { Produto: [] }, seq: { Produto: 0 } }, null, 2));
  }
  return JSON.parse(readFileSync(storePath, "utf8"));
}

async function saveStore(store) {
  mkdirSync(dirname(storePath), { recursive: true });
  const content = JSON.stringify(store, null, 2);
  writeFileSync(storePath, content);

  if (shouldUseS3 && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        Body: content,
        ContentType: "application/json",
      })
    );
  }
}

function mapProduct(product) {
  const categoryName = product.sourceCategory || product.category?.name || "";
  const categoria = getCategoria(categoryName);
  const categoria_principal = getCategoryPrincipal(categoryName);
  const tags = [categoryName, "Importado"].filter(Boolean);
  if (categoria === "Perfume Árabe") tags.unshift("Perfume Árabe");
  if (categoria_principal === "Cosmético") tags.unshift("Cosmético");
  if (categoria_principal === "Kit") tags.unshift("Kit");

  return {
    nome: product.name,
    marca: categoryName || product.label || "Importado",
    categoria,
    volume: extractVolume(product),
    preco: getPrice(product),
    precoAtacado: null,
    custoDolar: null,
    cotacaoDolar: null,
    estoque: 0,
    estoqueLojista: 0,
    vitrine: false,
    promocaoAtiva: false,
    descontoPercentual: null,
    descricao: product.description || `Produto importado do catálogo Zaynex/Kyte, categoria ${categoryName}. Revise estoque e descrição antes de vender.`,
    imagem: getImageUrl(product),
    categoria_principal,
    tags,
    concentracao: "",
    origem: "Importado",
    tipo_perfume: categoria_principal === "Cosmético" ? "Cosmético" : "Perfume",
    genero: "",
    familia_olfativa: [],
    notas_topo: "",
    notas_coracao: "",
    notas_fundo: "",
    fixacao_estimada: "",
    projecao: "",
    ocasiao_uso: [],
    similaridade_inspiracao: "",
    descricao_olfativa: "",
  };
}

const fetchedByCategory = [];
const allProducts = [];
for (const [name, id] of categories) {
  const products = await fetchProducts(name, id);
  fetchedByCategory.push({ name, id, count: products.length });
  allProducts.push(...products);
}

const byId = new Map();
for (const product of allProducts) {
  const id = product._id || product.id || normalizeName(product.name);
  if (!byId.has(id)) byId.set(id, product);
}

const store = await loadStore();
store.rows ??= {};
store.rows.Produto ??= [];
store.seq ??= {};

let maxId = Math.max(0, ...store.rows.Produto.map((product) => Number(product.id) || 0));
let maxCodigo = Math.max(0, ...store.rows.Produto.map((product) => Number(product.codigo ?? product.id) || 0));
let created = 0;
let updated = 0;

for (const product of byId.values()) {
  const mapped = mapProduct(product);
  if (!mapped.nome) continue;

  const existing = store.rows.Produto.find((item) => normalizeName(item.nome) === normalizeName(mapped.nome));
  if (existing) {
    Object.assign(existing, mapped);
    updated++;
    continue;
  }

  maxId++;
  maxCodigo++;
  store.rows.Produto.push({
    id: maxId,
    codigo: maxCodigo,
    createdAt: new Date().toISOString(),
    ...mapped,
  });
  created++;
}

store.seq.Produto = Math.max(Number(store.seq.Produto) || 0, maxId);
await saveStore(store);

mkdirSync("scratch", { recursive: true });
writeFileSync(
  "scratch/kyte-all-products-api.json",
  JSON.stringify(
    {
      fetchedAt: new Date().toISOString(),
      categories: fetchedByCategory,
      totalFetched: allProducts.length,
      totalUnique: byId.size,
      created,
      updated,
    },
    null,
    2
  )
);

console.log(JSON.stringify({ categories: fetchedByCategory.length, fetched: allProducts.length, unique: byId.size, created, updated, storage: shouldUseS3 ? "s3-and-local" : "local" }, null, 2));
