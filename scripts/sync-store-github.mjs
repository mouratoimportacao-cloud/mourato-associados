/**
 * Script para forçar upload do store.json completo (622 produtos) para o GitHub
 * via API REST — sem precisar das env vars do servidor.
 * 
 * Uso: node scripts/sync-store-github.mjs <GITHUB_TOKEN>
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN = process.argv[2];
const REPO = "mouratoimportacao-cloud/mourato-associados";
const FILE_PATH = "data/store.json";

if (!TOKEN) {
  console.error("❌ Informe o GITHUB_TOKEN como argumento:");
  console.error("   node scripts/sync-store-github.mjs ghp_XXXXXXXXXX");
  process.exit(1);
}

const storePath = join(__dirname, "..", FILE_PATH);
const content = readFileSync(storePath, "utf8");
const base64Content = Buffer.from(content).toString("base64");

const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "Mourato-Sync-Script",
  "Content-Type": "application/json",
};

console.log(`📦 Lendo store.json local...`);
const parsed = JSON.parse(content);
console.log(`   Produtos: ${parsed.rows?.Produto?.length || 0}`);
console.log(`   Usuários: ${parsed.rows?.Usuario?.length || 0}`);
console.log(`   Rifas: ${parsed.rows?.Rifa?.length || 0}`);
console.log(`   Bilhetes: ${parsed.rows?.Bilhete?.length || 0}`);
console.log(`   Pedidos: ${parsed.rows?.Pedido?.length || 0}`);

console.log(`\n🔍 Verificando SHA atual no GitHub...`);
let sha;
try {
  const getRes = await fetch(url, { headers });
  if (getRes.ok) {
    const getJson = await getRes.json();
    sha = getJson.sha;
    console.log(`   SHA encontrado: ${sha?.substring(0, 10)}...`);
  } else {
    console.log(`   Arquivo não existe ainda no GitHub (será criado).`);
  }
} catch (err) {
  console.warn("   Aviso ao buscar SHA:", err.message);
}

console.log(`\n📤 Enviando store.json para GitHub...`);
const putRes = await fetch(url, {
  method: "PUT",
  headers,
  body: JSON.stringify({
    message: `chore: sync store.json — ${parsed.rows?.Produto?.length || 0} produtos, ${new Date().toISOString()}`,
    content: base64Content,
    ...(sha ? { sha } : {}),
  }),
});

if (putRes.ok) {
  const result = await putRes.json();
  console.log(`\n✅ store.json enviado com sucesso!`);
  console.log(`   Commit: ${result.commit?.sha?.substring(0, 10)}`);
  console.log(`   URL: https://github.com/${REPO}/blob/main/${FILE_PATH}`);
} else {
  const err = await putRes.text();
  console.error(`\n❌ Erro ao enviar:`, err);
  process.exit(1);
}
