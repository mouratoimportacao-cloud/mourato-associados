import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rifas = await prisma.rifa.findMany();
  const count = await prisma.rifa.count();
  return NextResponse.json({
    count,
    rifas: rifas.map((r: any) => ({ id: r.id, titulo: r.titulo, status: r.status })),
    env: {
      bucket: process.env.AWS_S3_BUCKET ? "SET" : "NOT_SET",
      key: process.env.AWS_ACCESS_KEY_ID ? "SET" : "NOT_SET",
      region: process.env.AWS_S3_REGION || "NOT_SET",
    },
  });
}
