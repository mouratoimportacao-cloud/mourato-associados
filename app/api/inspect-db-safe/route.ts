import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

function getObfuscatedUrl(url: string) {
  if (!url) return "EMPTY";
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "****";
    }
    return parsed.toString();
  } catch {
    return "INVALID_URL_FORMAT";
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== "diagnostic-ma-987") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const results: any = {
    envKeys: Object.keys(process.env).filter(k => k.includes("POSTGRES") || k.includes("DATABASE") || k.includes("URL")),
    postgresUrlVal: getObfuscatedUrl(process.env.POSTGRES_URL || ""),
    databaseUrlVal: getObfuscatedUrl(process.env.DATABASE_URL || ""),
    mouratoDatabaseUrlVal: getObfuscatedUrl(process.env.MOURATO_DATABASE_URL || ""),
  };

  // 1. Check what databaseUrl() in prisma.ts yields
  let rawUrl = (
    process.env.MOURATO_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  ).replace(/\\r|\\n|\\t/g, "").replace(/\s+/g, "");

  results.processedUrl = getObfuscatedUrl(rawUrl);

  // 2. Try to connect to pg directly using this rawUrl
  if (rawUrl) {
    const pool = new Pool({
      connectionString: rawUrl,
      ssl: { rejectUnauthorized: false }
    });

    try {
      const timeRes = await pool.query("SELECT NOW()");
      results.directPgConnect = true;
      results.directPgTime = timeRes.rows[0].now;

      // Check tables
      const tablesRes = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      results.tables = tablesRes.rows.map(r => r.table_name);

      if (results.tables.includes("mourato_store")) {
        const storeRes = await pool.query("SELECT data FROM mourato_store WHERE id = 'main'");
        if (storeRes.rows.length > 0) {
          const data = storeRes.rows[0].data;
          results.storeMainDetails = {
            productsCount: data.rows?.Produto?.length || 0,
            usersCount: data.rows?.Usuario?.length || 0,
            ordersCount: data.rows?.Pedido?.length || 0
          };
        } else {
          results.storeMainDetails = "MAIN_ROW_EMPTY";
        }
      }
    } catch (pgErr: any) {
      results.directPgConnect = false;
      results.directPgError = pgErr.message;
      results.directPgErrorStack = pgErr.stack;
    } finally {
      await pool.end();
    }
  } else {
    results.directPgConnect = false;
    results.directPgError = "No connection string found";
  }

  // 3. Check what prisma simulation returns
  try {
    const products = await prisma.produto.findMany();
    results.prismaSimulation = {
      success: true,
      productsCount: products.length,
      sampleProducts: products.slice(0, 3).map(p => ({ id: p.id, nome: p.nome }))
    };
  } catch (prismaErr: any) {
    results.prismaSimulation = {
      success: false,
      error: prismaErr.message
    };
  }

  return NextResponse.json(results);
}
