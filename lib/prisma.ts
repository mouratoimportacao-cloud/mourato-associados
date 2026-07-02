import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || "mourato-associados-db";
const S3_KEY = "store.json";

type OrderBy = Record<string, "asc" | "desc">;
type Select = Record<string, boolean>;
type Where =
  | Record<string, unknown>
  | {
      OR?: Record<string, unknown>[];
    };

interface FindManyArgs {
  where?: Where;
  select?: Select;
  orderBy?: OrderBy;
  take?: number;
}

interface CountArgs {
  where?: Where;
}

interface WriteArgs<T> {
  data: T;
  include?: any;
}

interface UpdateArgs<T> {
  where: { id: number };
  data: T;
}

interface DeleteArgs {
  where: { id: number };
}

type ProdutoData = {
  codigo?: number | null;
  nome: string;
  marca: string;
  categoria: string;
  volume: string;
  preco?: number | null;
  precoAtacado?: number | null;
  custoDolar?: number | null;
  cotacaoDolar?: number | null;
  estoque?: number;
  estoqueLojista?: number;
  vitrine?: boolean;
  promocaoAtiva?: boolean;
  descontoPercentual?: number | null;
  descricao?: string | null;
  imagem?: string | null;
  categoria_principal?: string | null;
  tags?: string[] | null;
  concentracao?: string | null;
  origem?: string | null;
  tipo_perfume?: string | null;
  genero?: string | null;
  familia_olfativa?: string[] | null;
  notas_topo?: string | null;
  notas_coracao?: string | null;
  notas_fundo?: string | null;
  fixacao_estimada?: string | null;
  projecao?: string | null;
  ocasiao_uso?: string[] | null;
  similaridade_inspiracao?: string | null;
  descricao_olfativa?: string | null;
};

type UsuarioData = {
  nome: string;
  email: string;
  senha: string;
  tipo: string;
  documento?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  status?: string | null;
  resetToken?: string | null;
  resetExpiresAt?: string | null;
  resetRequestedAt?: string | null;
  codigoRevenda?: string | null;
  estoquePessoal?: Record<string, number> | null;
  precosVenda?: Record<string, number> | null;
  limiteAprovado?: number | null;
  historicoPagamentos?: any[] | null;
};

type PedidoData = {
  usuarioId: number;
  produtoId?: number;
  produtoNome?: string;
  quantidade?: number;
  precoUnitario?: number;
  precoTabela?: number | null;
  custoUnitario?: number | null;
  descontoConcedido?: number | null;
  lucroBruto?: number | null;
  tipoFluxo?: string | null;
  quantidadePagaFornecedor?: number | null;
  totalPagoFornecedor?: number | null;
  saldoFornecedor?: number | null;
  pagamento?: string;
  observacao?: string | null;
  total: number;
  status: string;
};

type EmprestimoData = {
  banco: string;
  valorRecebido: number;
  valorParcela: number;
  totalParcelas: number;
  parcelasPagas?: number;
  dataInicio: string;
  observacao?: string | null;
  status?: string;
};

type LancamentoFinanceiroData = {
  data: string;
  competencia: string;
  tipo: string;
  grupo: string;
  categoria: string;
  valor: number;
  observacao?: string | null;
};

type FechamentoFinanceiroData = {
  competencia: string;
  fechadoEm: string;
  receitaAtacado: number;
  receitaSite: number;
  receitaTotal: number;
  cmv: number;
  estoque: number;
  contasReceber: number;
  totalDespesas: number;
  saldoBancario: number;
  resultadoOperacional: number;
  despesasPorCategoria: Record<string, number>;
};

type DespesaData = {
  data: string | Date;
  categoria: string;
  valor: number;
  observacao?: string | null;
};

type FechamentoMensalData = {
  mesAno: string;
  receitaAtacado: number;
  receitaSite: number;
  receitaTotal: number;
  cmv: number;
  valorEstoque: number;
  totalDespesas: number;
  saldoBancario: number;
  resultado: number;
  dadosDespesas?: any | null;
};

type TableName =
  | "Produto"
  | "Pedido"
  | "Usuario"
  | "Despesa"
  | "FechamentoMensal"
  | "Emprestimo"
  | "LancamentoFinanceiro"
  | "FechamentoFinanceiro"
  | "Lead"
  | "PublicOrder"
  | "QrOrder"
  | "RetailerPurchase"
  | "FinancialEntry"
  | "SupplierStock"
  | "RetailerStock"
  | "Package";
type MemoryRow = Record<string, any>;

const columns = {
  Produto: [
    "id",
    "codigo",
    "nome",
    "marca",
    "categoria",
    "volume",
    "preco",
    "precoAtacado",
    "custoDolar",
    "cotacaoDolar",
    "estoque",
    "estoqueLojista",
    "vitrine",
    "promocaoAtiva",
    "descontoPercentual",
    "descricao",
    "imagem",
    "createdAt",
    "categoria_principal",
    "tags",
    "concentracao",
    "origem",
    "tipo_perfume",
    "genero",
    "familia_olfativa",
    "notas_topo",
    "notas_coracao",
    "notas_fundo",
    "fixacao_estimada",
    "projecao",
    "ocasiao_uso",
    "similaridade_inspiracao",
    "descricao_olfativa",
  ],
  Pedido: [
    "id",
    "usuarioId",
    "produtoId",
    "produtoNome",
    "quantidade",
    "precoUnitario",
    "precoTabela",
    "custoUnitario",
    "descontoConcedido",
    "lucroBruto",
    "tipoFluxo",
    "quantidadePagaFornecedor",
    "totalPagoFornecedor",
    "saldoFornecedor",
    "pagamento",
    "observacao",
    "total",
    "status",
    "createdAt",
  ],
  Usuario: [
    "id",
    "nome",
    "email",
    "senha",
    "tipo",
    "documento",
    "telefone",
    "endereco",
    "cidade",
    "estado",
    "cep",
    "status",
    "resetToken",
    "resetExpiresAt",
    "resetRequestedAt",
    "codigoRevenda",
    "estoquePessoal",
    "precosVenda",
    "limiteAprovado",
    "historicoPagamentos",
    "createdAt",
  ],
  LancamentoFinanceiro: [
    "id",
    "data",
    "competencia",
    "tipo",
    "grupo",
    "categoria",
    "valor",
    "observacao",
    "createdAt",
  ],
  FechamentoFinanceiro: [
    "id",
    "competencia",
    "fechadoEm",
    "receitaAtacado",
    "receitaSite",
    "receitaTotal",
    "cmv",
    "estoque",
    "contasReceber",
    "totalDespesas",
    "saldoBancario",
    "resultadoOperacional",
    "despesasPorCategoria",
    "createdAt",
  ],
  Emprestimo: ["id", "banco", "valorRecebido", "valorParcela", "totalParcelas", "parcelasPagas", "dataInicio", "observacao", "status", "createdAt"],
  Despesa: ["id", "data", "categoria", "valor", "observacao", "createdAt"],
  FechamentoMensal: ["id", "mesAno", "receitaAtacado", "receitaSite", "receitaTotal", "cmv", "valorEstoque", "totalDespesas", "saldoBancario", "resultado", "dadosDespesas", "createdAt"],
  Lead: ["id", "nome", "contato", "cidade", "estado", "endereco", "produtos", "total", "status", "createdAt"],
  PublicOrder: ["id","produtoId","produtoNome","quantidade","precoUnitario","total","nomeCliente","contato","endereco","status","observacao","createdAt"],
  QrOrder: ["id","retailerId","produtoId","produtoNome","quantidade","precoUnitario","total","nomeCliente","contato","status","observacao","createdAt"],
  RetailerPurchase: ["id","retailerId","total","status","items","observacao","createdAt"],
  FinancialEntry: ["id","ownerType","ownerId","type","amount","description","relatedId","createdAt"],
  SupplierStock: ["id","productId","quantity","costPerUnit","createdAt"],
  RetailerStock: ["id","retailerId","productId","quantity","costPerUnit","createdAt"],
  Package: ["id","retailerPurchaseId","totalAmount","paidAmount","openAmount","status","createdAt","updatedAt"],
} as const;

const globalStore = globalThis as unknown as {
  memoryDb?: Record<TableName, MemoryRow[]>;
  memorySeq?: Record<TableName, number>;
  storeLoaded?: boolean;
  loadingStore?: Promise<void>;
  lastLoadedAt?: number;
  transactionDepth?: number;
  transactionDirty?: boolean;
  transactionQueue?: Promise<void>;
};

const storePath = join(process.cwd(), ".data", "store.json");

const initialProducts: MemoryRow[] = [
  { id: 1, nome: "MARC JOSEPH 100ML", marca: "Marc Joseph", categoria: "Perfume", volume: "100ml", preco: 290, precoAtacado: 210, imagem: "/marketing/marc-joseph-paris.webp" },
  { id: 2, nome: "PARTY GIRL NIGHT 85ML", marca: "Milestone", categoria: "Perfume", volume: "85ml", preco: 280, precoAtacado: 150, imagem: "/marketing/party-girl-night.webp" },
  { id: 3, nome: "LA SIENE 100ML", marca: "Boulevard", categoria: "Perfume", volume: "100ml", preco: 260, precoAtacado: 208, imagem: "/marketing/la-seine.webp" },
  { id: 4, nome: "AL FARAS MENTHYST 100ML", marca: "Al Faras", categoria: "Perfume Árabe", volume: "100ml", preco: 280, precoAtacado: 160, imagem: "/marketing/arabesque-amethyst.webp" },
  { id: 5, nome: "MUSK ESSENTIAL 100ML", marca: "Adyan", categoria: "Perfume Árabe", volume: "100ml", preco: 280, precoAtacado: 180, imagem: "/marketing/musk-essential.webp" },
  { id: 6, nome: "7 EME FOR MAN 100ML", marca: "Boulevard", categoria: "Perfume Masculino", volume: "100ml", preco: 280, precoAtacado: 215, imagem: "/marketing/7-eme.webp" },
  { id: 7, nome: "PALAIS ROYAL 100M", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 300, precoAtacado: 225, imagem: null },
  { id: 8, nome: "SHARF 100ML", marca: "Adyan", categoria: "Perfume Árabe", volume: "100ml", preco: 330, precoAtacado: 190, imagem: "/marketing/sharf.webp" },
  { id: 9, nome: "MAHIB 100ML", marca: "M&A Fragrâncias", categoria: "Perfume Árabe", volume: "100ml", preco: 330, precoAtacado: 180, imagem: null },
  { id: 10, nome: "GLAMOR 100ML", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 330, precoAtacado: 200, imagem: null },
  { id: 11, nome: "MAJESTIC 100ML", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 330, precoAtacado: 200, imagem: null },
  { id: 12, nome: "NORAH AMOUR 100ML", marca: "Adyan", categoria: "Perfume Árabe", volume: "100ml", preco: 300, precoAtacado: 200, imagem: "/marketing/norah-amour.webp" },
  { id: 13, nome: "SAHIB 100ML", marca: "Ajyad", categoria: "Perfume Árabe", volume: "100ml", preco: 280, precoAtacado: 170, imagem: "/marketing/sahib.webp" },
  { id: 14, nome: "CHAMP DE MARS 100ML", marca: "Boulevard", categoria: "Perfume Masculino", volume: "100ml", preco: 290, precoAtacado: 210, imagem: "/marketing/champ-de-mars.webp" },
  { id: 15, nome: "LETTRE DE VOLTAIRE 100ML", marca: "Boulevard", categoria: "Perfume Masculino", volume: "100ml", preco: 280, precoAtacado: 210, imagem: "/marketing/lettre-de-voltaire.webp" },
  { id: 16, nome: "AUTOGRAPH by", marca: "Hamidi", categoria: "Perfume Árabe", volume: "100ml", preco: 300, precoAtacado: 190, imagem: "/marketing/autograph.webp" },
  { id: 17, nome: "Very Girl", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 300, precoAtacado: 170, imagem: "/marketing/good-girl-glam.webp" },
  { id: 18, nome: "212 Amor", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 400, precoAtacado: 250, imagem: null },
  { id: 19, nome: "Boss", marca: "M&A Fragrâncias", categoria: "Perfume Masculino", volume: "100ml", preco: 400, precoAtacado: 250, imagem: null },
  { id: 20, nome: "Salvage", marca: "M&A Fragrâncias", categoria: "Perfume Masculino", volume: "100ml", preco: 450, precoAtacado: 280, imagem: null },
  { id: 21, nome: "Invictus", marca: "M&A Fragrâncias", categoria: "Perfume Masculino", volume: "100ml", preco: 400, precoAtacado: 250, imagem: null },
  { id: 22, nome: "Paradox", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 490, precoAtacado: 290, imagem: null },
  { id: 23, nome: "One Million", marca: "M&A Fragrâncias", categoria: "Perfume Masculino", volume: "100ml", preco: 440, precoAtacado: 260, imagem: null },
  { id: 24, nome: "La Vida Es Bella", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "75ml", preco: 450, precoAtacado: 260, imagem: "/marketing/la-vida-es-bella.webp" },
  { id: 25, nome: "Pink Sexy Scandal", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 280, precoAtacado: 190, imagem: "/marketing/pink-sexy-scandal.webp" },
  { id: 26, nome: "Yara", marca: "Lattafa", categoria: "Perfume Árabe", volume: "100ml", preco: 290, precoAtacado: 180, imagem: "/marketing/yara.webp" },
  { id: 27, nome: "karseel", marca: "Karseell", categoria: "Cosmético", volume: "Unidade", preco: 100, precoAtacado: 75, imagem: null },
  { id: 28, nome: "Kit Coconut Passion Hidratante 236ml + Body Splash 250ml", marca: "M&A Fragrâncias", categoria: "Cosmético", volume: "Kit", preco: 180, precoAtacado: 130, imagem: null },
  { id: 29, nome: "kit Mine Yara 25ML", marca: "Lattafa", categoria: "Perfume Árabe", volume: "25ml", preco: 300, precoAtacado: 230, imagem: "/marketing/kit-yara.webp" },
].map((produto, index) => ({
  codigo: produto.id,
  custoDolar: null,
  cotacaoDolar: null,
  estoque: 0,
  estoqueLojista: 0,
  vitrine: false,
  promocaoAtiva: false,
  descontoPercentual: null,
  descricao: "Produto inicial do catálogo M&A Fragrâncias. Ajuste estoque, descrição e valores no painel administrativo.",
  createdAt: new Date(`2026-06-11T12:${String(index).padStart(2, "0")}:00.000Z`),
  ...produto,
}));

function emptyStore() {
  return {
    rows: {
      Produto: initialProducts,
      Pedido: [],
      Usuario: [],
      Despesa: [],
      FechamentoMensal: [],
      Emprestimo: [],
      LancamentoFinanceiro: [],
      FechamentoFinanceiro: [],
      Lead: [],
      PublicOrder: [],
      QrOrder: [],
      RetailerPurchase: [],
      FinancialEntry: [],
      SupplierStock: [],
      RetailerStock: [],
      Package: [],
    } as Record<TableName, MemoryRow[]>,
    seq: {
      Produto: initialProducts.length,
      Pedido: 0,
      Usuario: 0,
      Despesa: 0,
      FechamentoMensal: 0,
      Emprestimo: 0,
      LancamentoFinanceiro: 0,
      FechamentoFinanceiro: 0,
      Lead: 0,
      PublicOrder: 0,
      QrOrder: 0,
      RetailerPurchase: 0,
      FinancialEntry: 0,
      SupplierStock: 0,
      RetailerStock: 0,
      Package: 0,
    } as Record<TableName, number>,
  };
}

function withProdutoDefaults(produto: MemoryRow): MemoryRow {
  let imagem = produto.imagem;
  if (typeof imagem === "string") {
    if (imagem.startsWith("/marketing/") || imagem.startsWith("/uploads/")) {
      imagem = imagem.replace(/\.(png|jpg|jpeg)$/i, ".webp");
    }
  }
  return {
    codigo: Number(produto.codigo ?? produto.id ?? 0) || null,
    vitrine: false,
    promocaoAtiva: false,
    descontoPercentual: null,
    ...produto,
    imagem,
    estoque: Number(produto.estoque ?? 0),
    estoqueLojista: Number(produto.estoqueLojista ?? 0),
  };
}

function canPersistLocally() {
  return process.env.VERCEL !== "1";
}

function shouldUseS3() {
  return Boolean(process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID);
}

function loadLocalStore() {
  if (!canPersistLocally() || !existsSync(storePath)) {
    return emptyStore();
  }

  try {
    const raw = readFileSync(storePath, "utf8");
    const parsed = JSON.parse(raw) as ReturnType<typeof emptyStore>;

    const produtosSalvos = parsed.rows?.Produto ?? [];
    const uniqueMap = new Map<number, any>();
    produtosSalvos.forEach((p: any) => {
      if (p && p.id) {
        if (!uniqueMap.has(Number(p.id))) {
          uniqueMap.set(Number(p.id), p);
        }
      }
    });

    let produtos = Array.from(uniqueMap.values()).map(withProdutoDefaults);
    if (produtos.length === 0) {
      produtos = initialProducts.map(withProdutoDefaults);
    }

    return {
      rows: {
        Produto: produtos,
        Pedido: parsed.rows?.Pedido ?? [],
        Usuario: parsed.rows?.Usuario ?? [],
        Despesa: parsed.rows?.Despesa ?? [],
        FechamentoMensal: parsed.rows?.FechamentoMensal ?? [],
        Emprestimo: parsed.rows?.Emprestimo ?? [],
        LancamentoFinanceiro: parsed.rows?.LancamentoFinanceiro ?? [],
        FechamentoFinanceiro: parsed.rows?.FechamentoFinanceiro ?? [],
        Lead: parsed.rows?.Lead ?? [],
        PublicOrder: parsed.rows?.PublicOrder ?? [],
        QrOrder: parsed.rows?.QrOrder ?? [],
        RetailerPurchase: parsed.rows?.RetailerPurchase ?? [],
        FinancialEntry: parsed.rows?.FinancialEntry ?? [],
        SupplierStock: parsed.rows?.SupplierStock ?? [],
        RetailerStock: parsed.rows?.RetailerStock ?? [],
        Package: parsed.rows?.Package ?? [],
      } as Record<TableName, MemoryRow[]>,
      seq: {
        Produto: Math.max(parsed.seq?.Produto ?? 0, ...produtos.map((produto) => Number(produto.id) || 0)),
        Pedido: parsed.seq?.Pedido ?? 0,
        Usuario: parsed.seq?.Usuario ?? 0,
        Despesa: parsed.seq?.Despesa ?? 0,
        FechamentoMensal: parsed.seq?.FechamentoMensal ?? 0,
        Emprestimo: parsed.seq?.Emprestimo ?? 0,
        LancamentoFinanceiro: parsed.seq?.LancamentoFinanceiro ?? 0,
        FechamentoFinanceiro: parsed.seq?.FechamentoFinanceiro ?? 0,
        Lead: parsed.seq?.Lead ?? 0,
        PublicOrder: parsed.seq?.PublicOrder ?? 0,
        QrOrder: parsed.seq?.QrOrder ?? 0,
        RetailerPurchase: parsed.seq?.RetailerPurchase ?? 0,
        FinancialEntry: parsed.seq?.FinancialEntry ?? 0,
        SupplierStock: parsed.seq?.SupplierStock ?? 0,
        RetailerStock: parsed.seq?.RetailerStock ?? 0,
        Package: parsed.seq?.Package ?? 0,
      } as Record<TableName, number>,
    };
  } catch {
    return emptyStore();
  }
}

async function loadS3Store() {
  try {
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY });
    const response = await s3Client.send(command);
    const body = await response.Body?.transformToString();
    if (!body) return loadLocalStore();

    const parsed = JSON.parse(body) as ReturnType<typeof emptyStore>;
    const produtosSalvos = parsed.rows?.Produto ?? [];
    const uniqueMap = new Map<number, any>();
    produtosSalvos.forEach((p: any) => {
      if (p && p.id) {
        if (!uniqueMap.has(Number(p.id))) uniqueMap.set(Number(p.id), p);
      }
    });

    let produtos = Array.from(uniqueMap.values()).map(withProdutoDefaults);
    if (produtos.length === 0) produtos = initialProducts.map(withProdutoDefaults);

    return {
      rows: {
        Produto: produtos,
        Pedido: parsed.rows?.Pedido ?? [],
        Usuario: parsed.rows?.Usuario ?? [],
        Despesa: parsed.rows?.Despesa ?? [],
        FechamentoMensal: parsed.rows?.FechamentoMensal ?? [],
        Emprestimo: parsed.rows?.Emprestimo ?? [],
        LancamentoFinanceiro: parsed.rows?.LancamentoFinanceiro ?? [],
        FechamentoFinanceiro: parsed.rows?.FechamentoFinanceiro ?? [],
        Lead: parsed.rows?.Lead ?? [],
        PublicOrder: parsed.rows?.PublicOrder ?? [],
        QrOrder: parsed.rows?.QrOrder ?? [],
        RetailerPurchase: parsed.rows?.RetailerPurchase ?? [],
        FinancialEntry: parsed.rows?.FinancialEntry ?? [],
        SupplierStock: parsed.rows?.SupplierStock ?? [],
        RetailerStock: parsed.rows?.RetailerStock ?? [],
        Package: parsed.rows?.Package ?? [],
      } as Record<TableName, MemoryRow[]>,
      seq: {
        Produto: Math.max(parsed.seq?.Produto ?? 0, ...produtos.map((p) => Number(p.id) || 0)),
        Pedido: parsed.seq?.Pedido ?? 0,
        Usuario: parsed.seq?.Usuario ?? 0,
        Despesa: parsed.seq?.Despesa ?? 0,
        FechamentoMensal: parsed.seq?.FechamentoMensal ?? 0,
        Emprestimo: parsed.seq?.Emprestimo ?? 0,
        LancamentoFinanceiro: parsed.seq?.LancamentoFinanceiro ?? 0,
        FechamentoFinanceiro: parsed.seq?.FechamentoFinanceiro ?? 0,
        Lead: parsed.seq?.Lead ?? 0,
        PublicOrder: parsed.seq?.PublicOrder ?? 0,
        QrOrder: parsed.seq?.QrOrder ?? 0,
        RetailerPurchase: parsed.seq?.RetailerPurchase ?? 0,
        FinancialEntry: parsed.seq?.FinancialEntry ?? 0,
        SupplierStock: parsed.seq?.SupplierStock ?? 0,
        RetailerStock: parsed.seq?.RetailerStock ?? 0,
        Package: parsed.seq?.Package ?? 0,
      },
    };
  } catch (error) {
    console.error("Falha ao carregar do S3, usando fallback local:", error);
    return loadLocalStore();
  }
}

async function saveS3Store() {
  if (!globalStore.memoryDb || !globalStore.memorySeq) return;
  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: S3_KEY,
      Body: JSON.stringify({ rows: globalStore.memoryDb, seq: globalStore.memorySeq }),
      ContentType: "application/json",
    });
    await s3Client.send(command);
  } catch (error) {
    console.error("Falha ao salvar no S3, usando fallback local:", error);
    saveLocalStore();
  }
}

function saveLocalStore() {
  if (!canPersistLocally() || !globalStore.memoryDb || !globalStore.memorySeq) return;

  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(
    storePath,
    JSON.stringify(
      {
        rows: globalStore.memoryDb,
        seq: globalStore.memorySeq,
      },
      null,
      2
    )
  );
}

async function syncToGithub(contentStr: string) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return;

  try {
    const url = `https://api.github.com/repos/${repo}/contents/.data/store.json`;
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Mourato-Associados-App",
      "Content-Type": "application/json"
    };

    let sha: string | undefined;
    try {
      const getRes = await fetch(url, { headers });
      if (getRes.ok) {
        const getJson = await getRes.json();
        sha = getJson.sha;
      }
    } catch (err) {
      console.warn("GitHub Sync: falha ao buscar metadados do arquivo:", err);
    }

    const putRes = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "database sync: update store.json backup",
        content: Buffer.from(contentStr).toString("base64"),
        sha
      })
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.error("GitHub Sync erro no commit:", errText);
    } else {
      console.log("GitHub Sync: store.json atualizado no GitHub com sucesso.");
    }
  } catch (error) {
    console.error("GitHub Sync falhou:", error);
  }
}

async function saveStore() {
  if (!globalStore.memoryDb || !globalStore.memorySeq) return;

  if ((globalStore.transactionDepth || 0) > 0) {
    globalStore.transactionDirty = true;
    return;
  }

  await persistStore();
}

async function persistStore() {
  if (!globalStore.memoryDb || !globalStore.memorySeq) return;

  const contentStr = JSON.stringify(
    {
      rows: globalStore.memoryDb,
      seq: globalStore.memorySeq,
    },
    null,
    2
  );

  if (!shouldUseS3()) {
    saveLocalStore();
  } else {
    await saveS3Store();
    globalStore.lastLoadedAt = Date.now();
  }

  // Sincroniza em background sem travar o request do cliente
  syncToGithub(contentStr).catch((err) =>
    console.error("GitHub Sync background error:", err)
  );
}

async function runTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  const previousQueue = globalStore.transactionQueue || Promise.resolve();
  let releaseQueue!: () => void;
  globalStore.transactionQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  await previousQueue;
  await store();

  const rowsBackup = structuredClone(globalStore.memoryDb);
  const seqBackup = structuredClone(globalStore.memorySeq);
  globalStore.transactionDepth = (globalStore.transactionDepth || 0) + 1;
  globalStore.transactionDirty = false;
  globalStore.lastLoadedAt = Date.now();

  try {
    const result = await callback(prisma);
    globalStore.transactionDepth = Math.max(0, (globalStore.transactionDepth || 1) - 1);

    if (globalStore.transactionDepth === 0 && globalStore.transactionDirty) {
      globalStore.transactionDirty = false;
      await persistStore();
    }

    return result;
  } catch (error) {
    globalStore.memoryDb = rowsBackup;
    globalStore.memorySeq = seqBackup;
    globalStore.transactionDepth = Math.max(0, (globalStore.transactionDepth || 1) - 1);
    globalStore.transactionDirty = false;
    throw error;
  } finally {
    releaseQueue();
  }
}

async function store() {
  const now = Date.now();
  const cacheDuration = 30000;

  if (shouldUseS3()) {
    const cacheExpired = !globalStore.lastLoadedAt || (now - globalStore.lastLoadedAt > cacheDuration);
    if (!globalStore.memoryDb || cacheExpired) {
      const loadedStore = await loadS3Store();
      globalStore.memoryDb = loadedStore.rows;
      globalStore.memorySeq = loadedStore.seq;
      globalStore.storeLoaded = true;
      globalStore.lastLoadedAt = now;
    }
  } else if (!globalStore.storeLoaded) {
    if (!globalStore.loadingStore) {
      globalStore.loadingStore = (async () => {
        const loadedStore = loadLocalStore();
        globalStore.memoryDb = loadedStore.rows;
        globalStore.memorySeq = loadedStore.seq;
        globalStore.storeLoaded = true;
      })();
    }

    await globalStore.loadingStore;
  }

  return {
    rows: globalStore.memoryDb!,
    seq: globalStore.memorySeq!,
  };
}

function assertColumn(table: TableName, column: string) {
  if (!(columns[table] as readonly string[]).includes(column)) {
    throw new Error(`Coluna invalida: ${column}`);
  }
}

function normalizeRow<T extends MemoryRow>(row: T | undefined | null): any {
  if (!row) return null;
  if (typeof row.createdAt === "string") {
    return { ...row, createdAt: new Date(row.createdAt) };
  }
  return row;
}

function matchesWhere(row: MemoryRow, where?: Where): boolean {
  if (!where || Object.keys(where).length === 0) return true;

  if ("OR" in where && Array.isArray(where.OR)) {
    return where.OR.some((condition) => matchesWhere(row, condition));
  }

  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object") {
      if ("in" in value && Array.isArray((value as { in: unknown[] }).in)) {
        return (value as { in: unknown[] }).in.includes(row[key]);
      }
      if ("notIn" in value && Array.isArray((value as { notIn: unknown[] }).notIn)) {
        return !(value as { notIn: unknown[] }).notIn.includes(row[key]);
      }
      if ("not" in value) {
        return row[key] !== (value as { not: unknown }).not;
      }
      if ("equals" in value) {
        return row[key] === (value as { equals: unknown }).equals;
      }
    }

    return row[key] === value;
  });
}

function selectRow(table: TableName, row: MemoryRow, select?: Select) {
  if (!select) return normalizeRow(row);

  const selected: MemoryRow = {};
  Object.entries(select).forEach(([key, enabled]) => {
    assertColumn(table, key);
    if (enabled) selected[key] = row[key];
  });

  return normalizeRow(selected);
}

function sortRows(rows: MemoryRow[], orderBy?: OrderBy) {
  if (!orderBy) return rows;

  const [[column, direction]] = Object.entries(orderBy);
  return [...rows].sort((a, b) => {
    const left = a[column];
    const right = b[column];
    if (left === right) return 0;
    const result = left > right ? 1 : -1;
    return direction === "asc" ? result : -result;
  });
}

function model(table: TableName) {
  return {
    async count(args?: CountArgs) {
      const { rows } = await store();
      return rows[table].filter((row) => matchesWhere(row, args?.where)).length;
    },

    async findMany(args?: FindManyArgs) {
      const { rows } = await store();
      const filtered = rows[table].filter((row) => matchesWhere(row, args?.where));
      const ordered = sortRows(filtered, args?.orderBy);
      const limited = args?.take ? ordered.slice(0, args.take) : ordered;
      return limited.map((row) => selectRow(table, row, args?.select));
    },

    findFirst(args?: FindManyArgs) {
      return this.findMany({ ...args, take: 1 }).then((rows) => rows[0] ?? null);
    },

    findUnique(args: { where: Record<string, unknown>; include?: any }) {
      return this.findFirst({ where: args.where });
    },
  };
}

async function insert<T extends Record<string, unknown>>(table: TableName, data: T) {
  Object.keys(data).forEach((column) => assertColumn(table, column));

  const { rows, seq } = await store();
  const id = seq[table] + 1;
  seq[table] = id;

  const row = {
    id,
    ...data,
    createdAt: new Date(),
  };

  rows[table].push(row);
  await saveStore();
  return row;
}

async function update<T extends Record<string, unknown>>(table: TableName, args: UpdateArgs<T>) {
  Object.keys(args.data).forEach((column) => assertColumn(table, column));

  const { rows } = await store();
  const index = rows[table].findIndex((row) => row.id === args.where.id);

  if (index === -1) return null;

  rows[table][index] = {
    ...rows[table][index],
    ...args.data,
  };

  await saveStore();
  return rows[table][index];
}

async function remove(table: TableName, args: DeleteArgs) {
  const { rows } = await store();
  const index = rows[table].findIndex((row) => row.id === args.where.id);

  if (index === -1) return null;

  const [existing] = rows[table].splice(index, 1);
  await saveStore();
  return existing;
}

export const prisma = {
  despesa: {
    ...model("Despesa"),
    create: (args: WriteArgs<DespesaData>) => insert("Despesa", args.data),
    update: (args: UpdateArgs<Partial<DespesaData>>) => update("Despesa", args),
    delete: (args: DeleteArgs) => remove("Despesa", args),
  },
  fechamentoMensal: {
    ...model("FechamentoMensal"),
    create: (args: WriteArgs<FechamentoMensalData>) => insert("FechamentoMensal", args.data),
    update: (args: UpdateArgs<Partial<FechamentoMensalData>>) => update("FechamentoMensal", args),
    delete: (args: DeleteArgs) => remove("FechamentoMensal", args),
  },

  produto: {
    ...model("Produto"),
    create: (args: WriteArgs<ProdutoData>) => insert("Produto", args.data),
    update: (args: UpdateArgs<Partial<ProdutoData>>) => update("Produto", args),
    delete: (args: DeleteArgs) => remove("Produto", args),
  },
  pedido: {
    ...model("Pedido"),
    create: (args: WriteArgs<PedidoData>) => insert("Pedido", args.data),
    update: (args: UpdateArgs<Partial<PedidoData>>) => update("Pedido", args),
    delete: (args: DeleteArgs) => remove("Pedido", args),
  },
  usuario: {
    ...model("Usuario"),
    create: (args: WriteArgs<UsuarioData>) => insert("Usuario", args.data),
    update: (args: UpdateArgs<Partial<UsuarioData>>) => update("Usuario", args),
    delete: (args: DeleteArgs) => remove("Usuario", args),
  },
  emprestimo: {
    ...model("Emprestimo"),
    create: (args: WriteArgs<EmprestimoData>) => insert("Emprestimo", args.data),
    update: (args: UpdateArgs<Partial<EmprestimoData>>) => update("Emprestimo", args),
    delete: (args: DeleteArgs) => remove("Emprestimo", args),
  },
  lancamentoFinanceiro: {
    ...model("LancamentoFinanceiro"),
    create: (args: WriteArgs<LancamentoFinanceiroData>) =>
      insert("LancamentoFinanceiro", args.data),
    update: (args: UpdateArgs<Partial<LancamentoFinanceiroData>>) =>
      update("LancamentoFinanceiro", args),
    delete: (args: DeleteArgs) => remove("LancamentoFinanceiro", args),
  },
  fechamentoFinanceiro: {
    ...model("FechamentoFinanceiro"),
    create: (args: WriteArgs<FechamentoFinanceiroData>) =>
      insert("FechamentoFinanceiro", args.data),
    update: (args: UpdateArgs<Partial<FechamentoFinanceiroData>>) =>
      update("FechamentoFinanceiro", args),
    delete: (args: DeleteArgs) => remove("FechamentoFinanceiro", args),
  },
  lead: {
    ...model("Lead"),
    create: (args: WriteArgs<any>) => insert("Lead", args.data),
    update: (args: UpdateArgs<Partial<any>>) => update("Lead", args),
    delete: (args: DeleteArgs) => remove("Lead", args),
  },
  $transaction: <T>(callback: (tx: any) => Promise<T>) =>
    runTransaction(callback),
  publicOrder: {
    ...model("PublicOrder"),
    create: (args: WriteArgs<any>) => insert("PublicOrder", args.data),
    update: (args: UpdateArgs<Partial<any>>) => update("PublicOrder", args),
    delete: (args: DeleteArgs) => remove("PublicOrder", args),
  },
  qrOrder: {
    ...model("QrOrder"),
    create: (args: WriteArgs<any>) => insert("QrOrder", args.data),
    update: (args: UpdateArgs<Partial<any>>) => update("QrOrder", args),
    delete: (args: DeleteArgs) => remove("QrOrder", args),
  },
  retailerPurchase: {
    ...model("RetailerPurchase"),
    create: (args: WriteArgs<any>) => insert("RetailerPurchase", args.data),
    update: (args: UpdateArgs<Partial<any>>) => update("RetailerPurchase", args),
    delete: (args: DeleteArgs) => remove("RetailerPurchase", args),
  },
  financialEntry: {
    ...model("FinancialEntry"),
    create: (args: WriteArgs<any>) => insert("FinancialEntry", args.data),
    update: (args: UpdateArgs<Partial<any>>) => update("FinancialEntry", args),
    delete: (args: DeleteArgs) => remove("FinancialEntry", args),
  },
  supplierStock: {
    ...model("SupplierStock"),
    create: (args: WriteArgs<any>) => insert("SupplierStock", args.data),
    update: (args: UpdateArgs<Partial<any>>) => update("SupplierStock", args),
    delete: (args: DeleteArgs) => remove("SupplierStock", args),
  },
  retailerStock: {
    ...model("RetailerStock"),
    create: (args: WriteArgs<any>) => insert("RetailerStock", args.data),
    update: (args: UpdateArgs<Partial<any>>) => update("RetailerStock", args),
    delete: (args: DeleteArgs) => remove("RetailerStock", args),
  },
  package: {
    ...model("Package"),
    create: (args: WriteArgs<any>) => insert("Package", args.data),
    update: (args: UpdateArgs<Partial<any>>) => update("Package", args),
    delete: (args: DeleteArgs) => remove("Package", args),
  },
  $disconnect: () => Promise.resolve(),
};
