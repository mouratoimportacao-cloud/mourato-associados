import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== "mourato-secret-123") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const produtos = await prisma.produto.findMany();
    const usuarios = await prisma.usuario.findMany();
    
    // Verificamos se o pool de conexões do Postgres está ativo na memória global
    const globalStore = globalThis as any;
    const usesPostgres = Boolean(globalStore.pgPool);

    return NextResponse.json({
      success: true,
      usesPostgres,
      produtosCount: produtos.length,
      usuariosCount: usuarios.length,
      produtos: produtos.map(p => ({ id: p.id, nome: p.nome, codigo: p.codigo })),
      usuarios: usuarios.map(u => ({ id: u.id, nome: u.nome, email: u.email, tipo: u.tipo }))
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
