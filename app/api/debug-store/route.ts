import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  // Test via prisma ORM
  const rifas = await prisma.rifa.findMany();
  const produtos = await prisma.produto.count();

  // Test direct S3 read
  let s3Direct: any = null;
  try {
    const bucket = (process.env.AWS_S3_BUCKET || "").trim();
    const region = (process.env.AWS_S3_REGION || "us-east-1").trim();
    const client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
      },
    });
    const cmd = new GetObjectCommand({
      Bucket: bucket,
      Key: "store.json",
    });
    const resp = await client.send(cmd);
    const body = await resp.Body?.transformToString();
    if (body) {
      const parsed = JSON.parse(body);
      s3Direct = {
        hasRows: !!parsed.rows,
        rifaCount: parsed.rows?.Rifa?.length ?? "NO_KEY",
        rifaFirstStatus: parsed.rows?.Rifa?.[0]?.status ?? "N/A",
        produtoCount: parsed.rows?.Produto?.length ?? "NO_KEY",
        allRowKeys: Object.keys(parsed.rows || {}),
        bucketUsed: bucket,
        regionUsed: region,
        bucketLen: bucket.length,
      };
    }
  } catch (e: any) {
    s3Direct = { error: e.message };
  }

  return NextResponse.json({
    prismaRifaCount: rifas.length,
    prismaProdutoCount: produtos,
    s3Direct,
  });
}
