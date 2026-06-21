import { prisma } from "../lib/prisma";

async function main() {
  const pedidos = await prisma.pedido.findMany();
  console.log(`Found ${pedidos.length} pedidos to delete.`);
  for (const pedido of pedidos) {
    await prisma.pedido.delete({ where: { id: pedido.id } });
  }
  console.log("All pedidos deleted.");
}

main().catch(console.error);
