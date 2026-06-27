// Simple in-memory cache (query -> {slug, expires})
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
const searchCache = new Map<string, { slug: string; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getFromCache(q: string) {
  const entry = searchCache.get(q);
  if (entry && entry.expires > Date.now()) return entry.slug;
  searchCache.delete(q);
  return null;
}

function setCache(q: string, slug: string) {
  searchCache.set(q, { slug, expires: Date.now() + CACHE_TTL_MS });
}
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "query missing" }, { status: 400 });
  }
  const produto = await prisma.produto.findFirst({
    where: {
      nome: { contains: query, mode: "insensitive" },
    },
    select: { id: true, nome: true },
  });
  if (!produto) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // gera slug usando a mesma função que já existe em lib/slug
  const { slugify } = await import("../../../lib/slug");
  const slug = slugify(produto.nome);
  return NextResponse.json({ slug });
}
