import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { slugify } from "../../../lib/slug";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const isPreview = searchParams.get("preview") === "1";

  if (!query) {
    return NextResponse.json({ error: "query missing" }, { status: 400 });
  }

  const todos = await prisma.produto.findMany();
  const termo = query.toLowerCase();
  const filtrados = todos.filter(
    (p: any) =>
      p.ativoSite !== false &&
      (p.nome?.toLowerCase().includes(termo) ||
        p.marca?.toLowerCase().includes(termo) ||
        (p.similaridade_inspiracao || "").toLowerCase().includes(termo))
  );

  if (isPreview) {
    const results = filtrados.slice(0, 6).map((p: any) => ({
      id: p.id,
      nome: p.nome,
      marca: p.marca,
      preco: p.preco,
      imagem: p.imagem,
    }));
    return NextResponse.json({ results });
  }

  if (!filtrados.length) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const slug = slugify(filtrados[0].nome);
  return NextResponse.json({ slug });
}
