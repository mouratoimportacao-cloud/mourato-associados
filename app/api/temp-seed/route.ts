import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== "mourato-secret-123") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    // 1. Criar novo produto
    const novoProduto = await prisma.produto.create({
      data: {
        nome: "PERFUME IMPERIAL 100ML",
        marca: "M&A Fragrâncias",
        categoria: "Perfume",
        volume: "100ml",
        preco: 350,
        precoAtacado: 250,
        estoque: 10,
        estoqueLojista: 0,
        vitrine: true,
        promocaoAtiva: false,
        descontoPercentual: null,
        descricao: "Fragrância luxuosa de teste criada automaticamente pelo assistente.",
        imagem: null,
      }
    });

    // 2. Criar novo lojista
    const hashedPassword = await bcrypt.hash("lojistateste123", 10);
    const novoLojista = await prisma.usuario.create({
      data: {
        nome: "Lojista Teste Oficial",
        email: "lojista.teste@mi.com",
        senha: hashedPassword,
        tipo: "lojista",
        documento: "00.000.000/0001-00",
        telefone: "(11) 99999-9999",
        endereco: "Av. Paulista, 1000",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01310-100",
        status: "aprovado",
        codigoRevenda: "revenda-teste",
        estoquePessoal: {},
      }
    });

    return NextResponse.json({
      success: true,
      message: "Produto e lojista cadastrados com sucesso!",
      produto: novoProduto,
      lojista: { id: novoLojista.id, nome: novoLojista.nome, email: novoLojista.email }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
