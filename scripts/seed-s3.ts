import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function main() {
  const storePath = join(process.cwd(), ".data", "store.json");

  if (!existsSync(storePath)) {
    console.error("Arquivo .data/store.json não encontrado. Rode o app localmente primeiro.");
    process.exit(1);
  }

  const content = readFileSync(storePath, "utf8");
  const bucket = process.env.AWS_S3_BUCKET || "mourato-associados-db";

  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: "store.json",
    Body: content,
    ContentType: "application/json",
  }));

  console.log(`✅ Store enviado para s3://${bucket}/store.json com sucesso!`);
}

main().catch((e) => {
  console.error("Erro:", e);
  process.exit(1);
});
