import { execSync } from "child_process";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });

const ask = (q) => new Promise((res) => rl.question(q, res));

const vars = [
  { name: "MERCADO_PAGO_ACCESS_TOKEN", label: "Access Token (servidor)" },
  { name: "MERCADO_PAGO_PUBLIC_KEY", label: "Public Key" },
  { name: "NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY", label: "Public Key (frontend)" },
];

for (const v of vars) {
  const val = (await ask(`\nCole o ${v.label}: `)).trim();
  console.log(`  Length: ${val.length} | Start: ${val.substring(0, 15)}...`);
  for (const env of ["production", "preview", "development"]) {
    try { execSync(`vercel env rm ${v.name} ${env} --yes`, { stdio: "pipe" }); } catch {}
    execSync(`vercel env add ${v.name} ${env}`, { input: val, stdio: ["pipe", "inherit", "inherit"] });
    console.log(`  ✅ ${env}`);
  }
}

rl.close();
console.log("\nRedeploy...");
execSync("vercel --prod", { stdio: "inherit" });
