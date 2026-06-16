import { redirect } from "next/navigation";
import { getLojistaSession } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import PainelLojistaClient from "./components/PainelLojistaClient";

export const metadata = {
  title: "Painel Lojista | Mourato & Associados",
};

export const dynamic = "force-dynamic";

export default async function PainelLojistaPage() {
  const session = await getLojistaSession();

  if (!session) {
    redirect("/lojista");
  }

  const produtos = await prisma.produto.findMany({
    orderBy: { nome: "asc" },
  });
  const lojistaAtual = await prisma.usuario.findUnique({
    where: { id: session.id },
  });

  if (!lojistaAtual) {
    redirect("/lojista");
  }

  const pedidos = await prisma.pedido.findMany({
    where: { usuarioId: session.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PainelLojistaClient
      produtos={produtos as any[]}
      lojistaAtual={lojistaAtual as any}
      pedidos={pedidos as any[]}
      session={session}
    />
  );
}
