/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany({
    select: { id: true, nome: true, email: true, tipo: true }
  });
  console.log("DATABASE_USERS:", JSON.stringify(users, null, 2));

  const ordersCount = await prisma.pedido.count();
  console.log("DATABASE_ORDERS_COUNT:", ordersCount);

  const addressCount = await prisma.endereco.count();
  console.log("DATABASE_ADDRESS_COUNT:", addressCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
