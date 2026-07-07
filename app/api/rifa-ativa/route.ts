import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rifa = await prisma.rifa.findFirst({
    where: { status: "ATIVO" },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(rifa);
}
