import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const adminEmail = "admin@mi.com";
  const existing = await prisma.usuario.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.usuario.create({
      data: {
        nome: "Administrador",
        email: adminEmail,
        senha: hashedPassword,
        tipo: "admin",
      },
    });
    console.log("Admin user created: admin@mi.com / admin123");
  } else {
    console.log("Admin user already exists.");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
