import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import dotenv from "dotenv";
import sharp from "sharp";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const products = [
  {
    nome: "Al Fursan Desert",
    preco: 129.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_i%2BWcabcTcpSn2%2BBR1NS6nA%3D%3D.jpg?alt=media",
  },
  {
    nome: "Al Ward Al Ahmer",
    preco: 109.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_TJL3mDtJTVtvp%2BXetS4U1g%3D%3D.jpg?alt=media",
  },
  {
    nome: "Amber Ghazali",
    preco: 129.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_i45A3bxar28tBz5gf8VgNg%3D%3D.jpg?alt=media",
  },
  {
    nome: "Arabesque Amethyst",
    preco: 115.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_hja3ul4Wq1I3JhqtOh1HIA%3D%3D.jpg?alt=media",
  },
  {
    nome: "Bint Al Akaber",
    preco: 119.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_HYhA6UFGDeDZva%2B22wsog%3D%3D.jpg?alt=media",
  },
  {
    nome: "Ghazali",
    preco: 129.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_WpGErZHIrHTY7odwQS%2Bm6g%3D%3D.jpg?alt=media",
  },
  {
    nome: "Good Luck",
    preco: 129.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_t96XT3ys0MOi7WABZM1Tw%3D%3D.jpg?alt=media",
  },
  {
    nome: "Intisar Al Hub",
    preco: 129.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_Qt4aM2PGfnn1tLQvZmJg%3D%3D.jpg?alt=media",
  },
  {
    nome: "Intisar Al Quloub",
    preco: 129.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_EbZoh29juJ8ivV67gnnQ%2BA%3D%3D.jpg?alt=media",
  },
  {
    nome: "Malika",
    preco: 129.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_vuqzNz4lllD6SqzIaXS%2BQg%3D%3D.jpg?alt=media",
  },
  {
    nome: "Musk Abiyedh",
    preco: 119.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_kZrLUhuBuqDoQ6MqKYkecw%3D%3D.jpg?alt=media",
  },
  {
    nome: "Musk Khususi",
    preco: 139.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_Ro0RG84IIAM9A4%2BmaK%2BC8A%3D%3D.jpg?alt=media",
  },
  {
    nome: "Qalbi Blue",
    preco: 149.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_GvdcDUcv68XtM10rmK3Vg%3D%3D.jpg?alt=media",
  },
  {
    nome: "Qalbi Rouge",
    preco: 149.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_CEDv29ItMMPG%2BslfSVdZ3g%3D%3D.jpg?alt=media",
  },
  {
    nome: "Roohi Al Swad",
    preco: 119.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_p8NCYZKhvWvPhrYg1PvLQ%3D%3D.jpg?alt=media",
  },
  {
    nome: "Roohi Flora",
    preco: 115.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_SaRXAtLdJJ4qY68Eq0fsg%3D%3D.jpg?alt=media",
  },
  {
    nome: "Roohi Gold",
    preco: 119.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_vPPs7bTeb6lTzCuUXw5IZw%3D%3D.jpg?alt=media",
  },
  {
    nome: "Roohi Royal",
    preco: 119.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_Oh3Ou1pS0699tfXOiNrWA%3D%3D.jpg?alt=media",
  },
  {
    nome: "Ser Al Ameera",
    preco: 139.99,
    imageUrl: "https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/E3DL3DbCHHOzBQHutw3DQl5bgMz2%2Fthumb_280_96MAx0LIE9mvqYxpkowEGA%3D%3D.jpg?alt=media",
  },
];

const storePath = join(process.cwd(), ".data", "store.json");
const uploadDir = join(process.cwd(), "public", "uploads");
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

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function downloadImage(product) {
  mkdirSync(uploadDir, { recursive: true });
  const filename = `kyte-al-fares-${slugify(product.nome)}.webp`;
  const absolutePath = join(uploadDir, filename);
  if (existsSync(absolutePath)) return `/uploads/${filename}`;

  try {
    const response = await fetch(product.imageUrl, {
      headers: { "User-Agent": "Mourato-Associados-Catalog-Importer/1.0" },
    });
    if (!response.ok) return product.imageUrl;

    const input = Buffer.from(await response.arrayBuffer());
    const webp = await sharp(input)
      .rotate()
      .resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();
    writeFileSync(absolutePath, webp);
    return `/uploads/${filename}`;
  } catch {
    return product.imageUrl;
  }
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function loadStore() {
  if (shouldUseS3 && s3Client) {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
    const body = await response.Body?.transformToString();
    if (body) {
      mkdirSync(dirname(storePath), { recursive: true });
      writeFileSync(join(dirname(storePath), `store.s3-backup-before-kyte-${Date.now()}.json`), body);
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

const store = await loadStore();
store.rows ??= {};
store.rows.Produto ??= [];
store.seq ??= {};

let maxId = Math.max(0, ...store.rows.Produto.map((product) => Number(product.id) || 0));
let maxCodigo = Math.max(0, ...store.rows.Produto.map((product) => Number(product.codigo ?? product.id) || 0));
let created = 0;
let updated = 0;

for (const product of products) {
  const imagem = await downloadImage(product);
  const existing = store.rows.Produto.find((item) => normalizeName(item.nome || "") === normalizeName(product.nome));
  const data = {
    marca: "Al Fares",
    categoria: "Perfume Árabe",
    volume: "Unidade",
    preco: product.preco,
    precoAtacado: null,
    custoDolar: null,
    cotacaoDolar: null,
    estoque: 0,
    estoqueLojista: 0,
    vitrine: false,
    promocaoAtiva: false,
    descontoPercentual: null,
    descricao: "Produto importado do catálogo Zaynex/Kyte, categoria Al Fares. Revise estoque, volume e descrição antes de vender.",
    imagem,
    categoria_principal: "Perfume",
    tags: ["Perfume Árabe", "Al Fares", "Importado"],
    concentracao: "",
    origem: "Importado",
    tipo_perfume: "Perfume",
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

  if (existing) {
    Object.assign(existing, data);
    updated++;
    continue;
  }

  maxId++;
  maxCodigo++;
  store.rows.Produto.push({
    id: maxId,
    codigo: maxCodigo,
    nome: product.nome,
    createdAt: new Date().toISOString(),
    ...data,
  });
  created++;
}

store.seq.Produto = Math.max(Number(store.seq.Produto) || 0, maxId);
await saveStore(store);

console.log(JSON.stringify({ created, updated, total: products.length, storage: shouldUseS3 ? "s3-and-local" : "local" }, null, 2));
