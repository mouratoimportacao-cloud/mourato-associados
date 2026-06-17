"use server";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { revalidatePath } from "next/cache";

export type SocialLinks = {
  siteUrl: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  whatsapp: string;
  x: string;
};

const configPath = join(process.cwd(), ".data", "site-config.json");

const globalConfig = globalThis as unknown as {
  socialLinks?: SocialLinks;
  pgPool?: any;
};

const defaultLinks: SocialLinks = {
  siteUrl: "https://mouratoassociados.com.br/produtos",
  instagram: "https://www.instagram.com/perfumeltda/",
  tiktok: "",
  facebook: "https://www.facebook.com/profile.php?id=61590455925560",
  whatsapp: "",
  x: "",
};

function canPersistLocally() {
  return process.env.VERCEL !== "1";
}

function databaseUrl() {
  let rawUrl = (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  );

  // Fallback caso a variável tenha sido criada com algum prefixo no Vercel (ex: LOJA_POSTGRES_URL_POSTGRES_URL)
  if (!rawUrl || rawUrl === "DATABASE_URL" || rawUrl === "POSTGRES_URL") {
    const keys = Object.keys(process.env);
    const matchingKey = keys.find(k => k.endsWith('_POSTGRES_URL') || k.endsWith('_DATABASE_URL'))
                     || keys.find(k => k.includes('POSTGRES_URL') && k !== 'POSTGRES_URL');
    if (matchingKey) {
      rawUrl = process.env[matchingKey] || "";
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

async function getPool() {
  if (globalConfig.pgPool) return globalConfig.pgPool;

  const url = databaseUrl();
  if (!url) return null;

  const { Pool } = await import("pg");

  globalConfig.pgPool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
  });

  return globalConfig.pgPool;
}

async function loadRemoteLinks() {
  const pool = await getPool();
  if (!pool) return null;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mourato_config (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const result = await pool.query("SELECT data FROM mourato_config WHERE id = $1", ["social_links"]);
    if (!result.rows.length) return null;

    return result.rows[0].data as Partial<SocialLinks>;
  } catch (error) {
    console.error("Falha ao carregar links no Postgres (limite de quota ou rede). Usando configuração local fallback:", error);
    return null;
  }
}

async function saveRemoteLinks(links: SocialLinks) {
  const pool = await getPool();
  if (!pool) return false;

  try {
    await pool.query(
      `
        INSERT INTO mourato_config (id, data, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `,
      ["social_links", JSON.stringify(links)]
    );
  } catch (error) {
    console.error("Falha ao salvar links no Postgres (limite de quota ou rede). Usando fallback local:", error);
    return false;
  }

  return true;
}

export async function getSocialLinks(): Promise<SocialLinks> {
  if (globalConfig.socialLinks) {
    return {
      ...defaultLinks,
      ...globalConfig.socialLinks,
    };
  }

  const remoteLinks = await loadRemoteLinks();
  if (remoteLinks) {
    globalConfig.socialLinks = {
      ...defaultLinks,
      ...remoteLinks,
    };
    return globalConfig.socialLinks;
  }

  if (!canPersistLocally() || !existsSync(configPath)) {
    return defaultLinks;
  }

  try {
    const saved = JSON.parse(readFileSync(configPath, "utf8")) as Partial<SocialLinks>;
    return {
      ...defaultLinks,
      ...saved,
    };
  } catch {
    return defaultLinks;
  }
}

export async function salvarLinksSociais(formData: FormData) {
  const links: SocialLinks = {
    siteUrl: String(formData.get("siteUrl") || "").trim() || defaultLinks.siteUrl,
    instagram: String(formData.get("instagram") || "").trim(),
    tiktok: String(formData.get("tiktok") || "").trim(),
    facebook: String(formData.get("facebook") || "").trim(),
    whatsapp: String(formData.get("whatsapp") || "").trim(),
    x: String(formData.get("x") || "").trim(),
  };

  globalConfig.socialLinks = links;

  const savedRemote = await saveRemoteLinks(links);

  if (!savedRemote && canPersistLocally()) {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(links, null, 2));
  }

  revalidatePath("/");
  revalidatePath("/produtos");
  revalidatePath("/admin/configurar");

  return { success: true };
}
