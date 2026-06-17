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
    // 1. Verificar e criar lojista
    const lojistaEmail = "lojista.teste@mi.com";
    let lojista = await prisma.usuario.findUnique({ where: { email: lojistaEmail } });
    let produto = await prisma.produto.findFirst({ where: { nome: "PERFUME IMPERIAL 100ML" } });

    let createdNew = false;

    if (!lojista) {
      const hashedPassword = await bcrypt.hash("lojistateste123", 10);
      lojista = await prisma.usuario.create({
        data: {
          nome: "Lojista Teste Oficial",
          email: lojistaEmail,
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
      createdNew = true;
    }

    // 2. Verificar e criar produto
    if (!produto) {
      produto = await prisma.produto.create({
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
      createdNew = true;
    }

    const produtos = await prisma.produto.findMany();
    const usuarios = await prisma.usuario.findMany();
    
    // Verificamos se o pool de conexões do Postgres está ativo na memória global
    const globalStore = globalThis as any;
    const usesPostgres = Boolean(globalStore.pgPool);

    return NextResponse.json({
      success: true,
      usesPostgres,
      createdNew,
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
