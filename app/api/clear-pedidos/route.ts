import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token !== "limpar-tudo-123") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const pedidos = await prisma.pedido.findMany();
    let deleted = 0;

    for (const p of pedidos) {
      await prisma.pedido.delete({ where: { id: p.id } });
      deleted++;
    }

    // Resetar o contador de estoque dos lojistas para evitar saldos negativos
    const usuarios = await prisma.usuario.findMany({
      where: { tipo: "lojista" },
    });

    for (const u of usuarios) {
      if (u.estoquePessoal && Object.keys(u.estoquePessoal).length > 0) {
        await prisma.usuario.update({
          where: { id: u.id },
          data: { estoquePessoal: {} },
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Foram deletados ${deleted} registros de compras e estoques lojista zerados.` 
    });
  } catch (error) {
    console.error("Erro ao limpar pedidos:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
