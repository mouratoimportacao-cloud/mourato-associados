import { prisma } from "./lib/prisma";

async function main() {
  console.log("Corrigindo preço do produto 27...");
  const updated = await prisma.produto.update({
    where: { id: 27 },
    data: { preco: 130.00 }
  });
  console.log("Produto 27 atualizado com sucesso:", updated);
}

main().catch(console.error);
