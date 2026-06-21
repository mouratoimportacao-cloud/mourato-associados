import { prisma } from "./lib/prisma";

async function main() {
  const pId = await prisma.produto.findUnique({
    where: { id: 27 }
  });
  console.log("Produto por ID 27:", pId);

  const pCod = await prisma.produto.findFirst({
    where: { codigo: 27 }
  });
  console.log("Produto por Código 27:", pCod);
}

main().catch(console.error);
