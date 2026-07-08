// Script para criar lojista de teste no S3
// Uso: npx tsx scripts/create-lojista-teste.ts

import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = "teste@lojista.com";

  // Verifica se já existe
  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    console.log("✅ Lojista de teste já existe! ID:", existing.id);
    console.log("   Email:", email);
    console.log("   Senha: teste123");
    console.log("   Código Revenda:", existing.codigoRevenda);
    return;
  }

  const senha = await bcrypt.hash("teste123", 10);

  const lojista = await prisma.usuario.create({
    data: {
      nome: "Lojista Teste",
      email,
      senha,
      tipo: "lojista",
      documento: "529.982.247-25",
      telefone: "(11) 99999-0000",
      endereco: "Rua Teste, 123",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01001-000",
      status: "aprovado",
      codigoRevenda: "TESTE01",
      limiteAprovado: 5000,
      estoquePessoal: {},
    },
  });

  console.log("✅ Lojista de teste criado com sucesso!");
  console.log("   ID:", lojista.id);
  console.log("   Email: teste@lojista.com");
  console.log("   Senha: teste123");
  console.log("   Código Revenda: TESTE01");
  console.log("   Link: https://mouratoassociados.com.br/r/TESTE01");
}

main().catch(console.error);
