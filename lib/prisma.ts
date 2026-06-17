import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

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

type TableName = "Produto" | "Pedido" | "Usuario";
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
    "createdAt",
  ],
} as const;

const globalStore = globalThis as unknown as {
  memoryDb?: Record<TableName, MemoryRow[]>;
  memorySeq?: Record<TableName, number>;
  storeLoaded?: boolean;
  loadingStore?: Promise<void>;
  pgPool?: any;
};

const storePath = join(process.cwd(), ".data", "store.json");

const initialProducts: MemoryRow[] = [
  { id: 1, nome: "MARC JOSEPH 100ML", marca: "Marc Joseph", categoria: "Perfume", volume: "100ml", preco: 290, precoAtacado: 210, imagem: "/marketing/marc-joseph-paris.png" },
  { id: 2, nome: "PARTY GIRL NIGHT 85ML", marca: "Milestone", categoria: "Perfume", volume: "85ml", preco: 280, precoAtacado: 150, imagem: "/marketing/party-girl-night.png" },
  { id: 3, nome: "LA SIENE 100ML", marca: "Boulevard", categoria: "Perfume", volume: "100ml", preco: 260, precoAtacado: 208, imagem: "/marketing/la-seine.png" },
  { id: 4, nome: "AL FARAS MENTHYST 100ML", marca: "Al Faras", categoria: "Perfume Árabe", volume: "100ml", preco: 280, precoAtacado: 160, imagem: "/marketing/arabesque-amethyst.png" },
  { id: 5, nome: "MUSK ESSENTIAL 100ML", marca: "Adyan", categoria: "Perfume Árabe", volume: "100ml", preco: 280, precoAtacado: 180, imagem: "/marketing/musk-essential.png" },
  { id: 6, nome: "7 EME FOR MAN 100ML", marca: "Boulevard", categoria: "Perfume Masculino", volume: "100ml", preco: 280, precoAtacado: 215, imagem: "/marketing/7-eme.png" },
  { id: 7, nome: "PALAIS ROYAL 100M", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 300, precoAtacado: 225, imagem: null },
  { id: 8, nome: "SHARF 100ML", marca: "Adyan", categoria: "Perfume Árabe", volume: "100ml", preco: 330, precoAtacado: 190, imagem: "/marketing/sharf.png" },
  { id: 9, nome: "MAHIB 100ML", marca: "M&A Fragrâncias", categoria: "Perfume Árabe", volume: "100ml", preco: 330, precoAtacado: 180, imagem: null },
  { id: 10, nome: "GLAMOR 100ML", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 330, precoAtacado: 200, imagem: null },
  { id: 11, nome: "MAJESTIC 100ML", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 330, precoAtacado: 200, imagem: null },
  { id: 12, nome: "NORAH AMOUR 100ML", marca: "Adyan", categoria: "Perfume Árabe", volume: "100ml", preco: 300, precoAtacado: 200, imagem: "/marketing/norah-amour.png" },
  { id: 13, nome: "SAHIB 100ML", marca: "Ajyad", categoria: "Perfume Árabe", volume: "100ml", preco: 280, precoAtacado: 170, imagem: "/marketing/sahib.png" },
  { id: 14, nome: "CHAMP DE MARS 100ML", marca: "Boulevard", categoria: "Perfume Masculino", volume: "100ml", preco: 290, precoAtacado: 210, imagem: "/marketing/champ-de-mars.jpg" },
  { id: 15, nome: "LETTRE DE VOLTAIRE 100ML", marca: "Boulevard", categoria: "Perfume Masculino", volume: "100ml", preco: 280, precoAtacado: 210, imagem: "/marketing/lettre-de-voltaire.png" },
  { id: 16, nome: "AUTOGRAPH by", marca: "Hamidi", categoria: "Perfume Árabe", volume: "100ml", preco: 300, precoAtacado: 190, imagem: "/marketing/autograph.jpg" },
  { id: 17, nome: "Very Girl", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 300, precoAtacado: 170, imagem: "/marketing/good-girl-glam.png" },
  { id: 18, nome: "212 Amor", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 400, precoAtacado: 250, imagem: null },
  { id: 19, nome: "Boss", marca: "M&A Fragrâncias", categoria: "Perfume Masculino", volume: "100ml", preco: 400, precoAtacado: 250, imagem: null },
  { id: 20, nome: "Salvage", marca: "M&A Fragrâncias", categoria: "Perfume Masculino", volume: "100ml", preco: 450, precoAtacado: 280, imagem: null },
  { id: 21, nome: "Invictus", marca: "M&A Fragrâncias", categoria: "Perfume Masculino", volume: "100ml", preco: 400, precoAtacado: 250, imagem: null },
  { id: 22, nome: "Paradox", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 490, precoAtacado: 290, imagem: null },
  { id: 23, nome: "One Million", marca: "M&A Fragrâncias", categoria: "Perfume Masculino", volume: "100ml", preco: 440, precoAtacado: 260, imagem: null },
  { id: 24, nome: "La Vida Es Bella", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "75ml", preco: 450, precoAtacado: 260, imagem: "/marketing/la-vida-es-bella.png" },
  { id: 25, nome: "Pink Sexy Scandal", marca: "M&A Fragrâncias", categoria: "Perfume", volume: "100ml", preco: 280, precoAtacado: 190, imagem: "/marketing/pink-sexy-scandal.png" },
  { id: 26, nome: "Yara", marca: "Lattafa", categoria: "Perfume Árabe", volume: "100ml", preco: 290, precoAtacado: 180, imagem: "/marketing/yara.png" },
  { id: 27, nome: "karseel", marca: "Karseell", categoria: "Cosmético", volume: "Unidade", preco: 100, precoAtacado: 75, imagem: null },
  { id: 28, nome: "Kit Coconut Passion Hidratante 236ml + Body Splash 250ml", marca: "M&A Fragrâncias", categoria: "Cosmético", volume: "Kit", preco: 180, precoAtacado: 130, imagem: null },
  { id: 29, nome: "kit Mine Yara 25ML", marca: "Lattafa", categoria: "Perfume Árabe", volume: "25ml", preco: 300, precoAtacado: 230, imagem: "/marketing/kit-yara.png" },
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
    } as Record<TableName, MemoryRow[]>,
    seq: {
      Produto: initialProducts.length,
      Pedido: 0,
      Usuario: 0,
    } as Record<TableName, number>,
  };
}

function mergeInitialProducts(produtos: MemoryRow[]) {
  const existingIds = new Set(produtos.map((produto) => Number(produto.id)));
  const nextProducts = produtos.map(withProdutoDefaults);

  initialProducts.forEach((produto) => {
    if (!existingIds.has(Number(produto.id))) {
      nextProducts.push(withProdutoDefaults(produto));
    }
  });

  return nextProducts;
}

function withProdutoDefaults(produto: MemoryRow): MemoryRow {
  return {
    codigo: Number(produto.codigo ?? produto.id ?? 0) || null,
    vitrine: false,
    promocaoAtiva: false,
    descontoPercentual: null,
    ...produto,
    estoque: Number(produto.estoque ?? 0),
    estoqueLojista: Number(produto.estoqueLojista ?? 0),
  };
}

function canPersistLocally() {
  return process.env.VERCEL !== "1";
}

function databaseUrl() {
  let rawUrl = (
    process.env.MOURATO_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  ).replace(/\\r|\\n|\\t/g, "").replace(/\s+/g, "");

  // Fallback caso a variável tenha sido criada com algum prefixo no Vercel (ex: LOJA_POSTGRES_URL_POSTGRES_URL)
  if (!rawUrl || rawUrl === "DATABASE_URL" || rawUrl === "POSTGRES_URL") {
    const keys = Object.keys(process.env);
    const matchingKey = keys.find(k => k.endsWith('_POSTGRES_URL') || k.endsWith('_DATABASE_URL'))
                     || keys.find(k => k.includes('POSTGRES_URL') && k !== 'POSTGRES_URL');
    if (matchingKey) {
      rawUrl = (process.env[matchingKey] || "").replace(/\\r|\\n|\\t/g, "").replace(/\s+/g, "");
    }
  }

  if (!rawUrl || rawUrl === "DATABASE_URL" || rawUrl === "POSTGRES_URL") {
    return "";
  }

  try {
    const url = new URL(rawUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      return "";
    }
    url.searchParams.delete("channel_binding");
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    return url.toString();
  } catch {
    return "";
  }
}

function shouldUsePostgres() {
  return Boolean(databaseUrl());
}

async function getPool() {
  if (globalStore.pgPool) return globalStore.pgPool;

  const url = databaseUrl();
  if (!url) return null;

  const { Pool } = await import("pg");

  globalStore.pgPool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
  });

  return globalStore.pgPool;
}

function loadLocalStore() {
  if (!canPersistLocally() || !existsSync(storePath)) {
    return emptyStore();
  }

  try {
    const raw = readFileSync(storePath, "utf8");
    const parsed = JSON.parse(raw) as ReturnType<typeof emptyStore>;

    let produtosSalvos = parsed.rows?.Produto ?? [];
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
      },
      seq: {
        Produto: Math.max(parsed.seq?.Produto ?? 0, ...produtos.map((produto) => Number(produto.id) || 0)),
        Pedido: parsed.seq?.Pedido ?? 0,
        Usuario: parsed.seq?.Usuario ?? 0,
      },
    };
  } catch {
    return emptyStore();
  }
}

async function loadPostgresStore() {
  const pool = await getPool();
  if (!pool) return loadLocalStore();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mourato_store (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const result = await pool.query("SELECT data FROM mourato_store WHERE id = $1", ["main"]);

    if (!result.rows.length) {
      const initial = emptyStore();
      await pool.query(
        "INSERT INTO mourato_store (id, data) VALUES ($1, $2::jsonb)",
        ["main", JSON.stringify(initial)]
      );
      return initial;
    }

    const parsed = result.rows[0].data as ReturnType<typeof emptyStore>;
    let produtosSalvos = parsed.rows?.Produto ?? [];
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
      },
      seq: {
        Produto: Math.max(parsed.seq?.Produto ?? 0, ...produtos.map((produto) => Number(produto.id) || 0)),
        Pedido: parsed.seq?.Pedido ?? 0,
        Usuario: parsed.seq?.Usuario ?? 0,
      },
    };
  } catch (error) {
    console.error("Falha ao conectar no Postgres (limite de quota ou rede). Usando banco em memoria fallback:", error);
    return loadLocalStore();
  }
}

async function savePostgresStore() {
  const pool = await getPool();
  if (!pool) {
    saveLocalStore();
    return;
  }

  try {
    await pool.query(
      `
        INSERT INTO mourato_store (id, data, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `,
      [
        "main",
        JSON.stringify({
          rows: globalStore.memoryDb,
          seq: globalStore.memorySeq,
        }),
      ]
    );
  } catch (error) {
    console.error("Falha ao salvar no Postgres (limite de quota ou rede). Usando fallback local:", error);
    saveLocalStore();
    return;
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

  const contentStr = JSON.stringify(
    {
      rows: globalStore.memoryDb,
      seq: globalStore.memorySeq,
    },
    null,
    2
  );

  if (!shouldUsePostgres()) {
    saveLocalStore();
  } else {
    await savePostgresStore();
  }

  // Sincroniza em background sem travar o request do cliente
  syncToGithub(contentStr).catch((err) =>
    console.error("GitHub Sync background error:", err)
  );
}

async function store() {
  if (shouldUsePostgres()) {
    // Para banco Postgres remoto (produção no Vercel), SEMPRE recarregamos do banco
    // para garantir consistência em tempo real e evitar cache sujo entre lambdas serverless.
    const loadedStore = await loadPostgresStore();
    globalStore.memoryDb = loadedStore.rows;
    globalStore.memorySeq = loadedStore.seq;
    globalStore.storeLoaded = true;
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
    if (value && typeof value === "object" && "in" in value && Array.isArray((value as { in: unknown[] }).in)) {
      return (value as { in: unknown[] }).in.includes(row[key]);
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

    findUnique(args: { where: Record<string, unknown> }) {
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
  $disconnect: () => Promise.resolve(),
};
