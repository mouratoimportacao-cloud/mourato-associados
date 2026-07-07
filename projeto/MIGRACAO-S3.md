# Prompt de Execução — Migração Neon → S3

Cole este prompt inteiro no Amazon Q em outra máquina para executar a migração completa.

---

## Contexto

Projeto: Mourato & Associados — plataforma de perfumes/cosméticos.
Stack: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Vercel.
ORM: Customizado em `lib/prisma.ts` — store JSON único persistido em banco.
Problema: Neon PostgreSQL estourou cota de transferência. Migrando para AWS S3.

## O que precisa ser feito

### 1. Criar infraestrutura AWS

**Bucket S3:**
- Nome: `mourato-associados-db`
- Região: `sa-east-1`
- Bloquear todo acesso público
- Versionamento ativado

**IAM User:**
- Nome: `mourato-s3-app`
- Apenas acesso programático (sem console)
- Policy inline:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::mourato-associados-db/*"
    }
  ]
}
```
- Gerar Access Key e Secret Access Key

### 2. Instalar dependência

```bash
npm install @aws-sdk/client-s3
```

### 3. Alterar `lib/prisma.ts`

Substituir as funções `getPool()`, `loadPostgresStore()`, `savePostgresStore()` e remover o import/uso de `pg`. Implementar no lugar:

```typescript
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "sa-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || "mourato-associados-db";
const S3_KEY = "store.json";

async function loadS3Store() {
  try {
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY });
    const response = await s3Client.send(command);
    const body = await response.Body?.transformToString();
    if (!body) return loadLocalStore();

    const parsed = JSON.parse(body) as ReturnType<typeof emptyStore>;

    const produtosSalvos = parsed.rows?.Produto ?? [];
    const uniqueMap = new Map<number, any>();
    produtosSalvos.forEach((p: any) => {
      if (p && p.id) {
        if (!uniqueMap.has(Number(p.id))) {
          uniqueMap.set(Number(p.id), p);
        }
      }
    });

    let produtos = Array.from(uniqueMap.values()).map(withProdutoDefaults);
    if (produtos.length === 0) {
      produtos = initialProducts.map(withProdutoDefaults);
    }

    return {
      rows: {
        Produto: produtos,
        Pedido: parsed.rows?.Pedido ?? [],
        Usuario: parsed.rows?.Usuario ?? [],
        Despesa: parsed.rows?.Despesa ?? [],
        FechamentoMensal: parsed.rows?.FechamentoMensal ?? [],
        Emprestimo: parsed.rows?.Emprestimo ?? [],
        LancamentoFinanceiro: parsed.rows?.LancamentoFinanceiro ?? [],
        FechamentoFinanceiro: parsed.rows?.FechamentoFinanceiro ?? [],
        Lead: parsed.rows?.Lead ?? [],
        PublicOrder: parsed.rows?.PublicOrder ?? [],
        QrOrder: parsed.rows?.QrOrder ?? [],
        RetailerPurchase: parsed.rows?.RetailerPurchase ?? [],
        FinancialEntry: parsed.rows?.FinancialEntry ?? [],
        SupplierStock: parsed.rows?.SupplierStock ?? [],
        RetailerStock: parsed.rows?.RetailerStock ?? [],
        Package: parsed.rows?.Package ?? [],
      } as Record<TableName, MemoryRow[]>,
      seq: {
        Produto: Math.max(parsed.seq?.Produto ?? 0, ...produtos.map((produto) => Number(produto.id) || 0)),
        Pedido: parsed.seq?.Pedido ?? 0,
        Usuario: parsed.seq?.Usuario ?? 0,
        Despesa: parsed.seq?.Despesa ?? 0,
        FechamentoMensal: parsed.seq?.FechamentoMensal ?? 0,
        Emprestimo: parsed.seq?.Emprestimo ?? 0,
        LancamentoFinanceiro: parsed.seq?.LancamentoFinanceiro ?? 0,
        FechamentoFinanceiro: parsed.seq?.FechamentoFinanceiro ?? 0,
        Lead: parsed.seq?.Lead ?? 0,
        PublicOrder: parsed.seq?.PublicOrder ?? 0,
        QrOrder: parsed.seq?.QrOrder ?? 0,
        RetailerPurchase: parsed.seq?.RetailerPurchase ?? 0,
        FinancialEntry: parsed.seq?.FinancialEntry ?? 0,
        SupplierStock: parsed.seq?.SupplierStock ?? 0,
        RetailerStock: parsed.seq?.RetailerStock ?? 0,
        Package: parsed.seq?.Package ?? 0,
      },
    };
  } catch (error) {
    console.error("Falha ao carregar do S3, usando fallback local:", error);
    return loadLocalStore();
  }
}

async function saveS3Store() {
  if (!globalStore.memoryDb || !globalStore.memorySeq) return;

  const content = JSON.stringify({
    rows: globalStore.memoryDb,
    seq: globalStore.memorySeq,
  });

  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: S3_KEY,
      Body: content,
      ContentType: "application/json",
    });
    await s3Client.send(command);
  } catch (error) {
    console.error("Falha ao salvar no S3, usando fallback local:", error);
    saveLocalStore();
  }
}
```

**Alterar a função `shouldUsePostgres()`** — renomear para `shouldUseS3()`:
```typescript
function shouldUseS3() {
  return Boolean(process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID);
}
```

**Alterar a função `store()`** — trocar referências:
- `shouldUsePostgres()` → `shouldUseS3()`
- `loadPostgresStore()` → `loadS3Store()`

**Alterar a função `persistStore()`** — trocar referências:
- `shouldUsePostgres()` → `shouldUseS3()`
- `savePostgresStore()` → `saveS3Store()`

**OTIMIZAÇÃO CRÍTICA — Alterar `cacheDuration`:**
```typescript
const cacheDuration = 30000; // 30 segundos — reduz leituras em ~95%
```

**Remover:**
- A função `getPool()` inteira
- A função `loadPostgresStore()` inteira
- A função `savePostgresStore()` inteira
- A função `databaseUrl()` inteira
- O campo `pgPool` do `globalStore`
- Qualquer import ou referência a `pg`

**Manter intacto:**
- Toda a lógica de models (`model()`, `insert()`, `update()`, `remove()`)
- `matchesWhere()`, `selectRow()`, `sortRows()`
- `loadLocalStore()`, `saveLocalStore()`
- `syncToGithub()`
- `runTransaction()`
- Todos os types, columns, emptyStore, initialProducts
- O export `prisma` com todos os models

### 4. Criar script de seed `scripts/seed-s3.ts`

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "sa-east-1",
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

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: "store.json",
    Body: content,
    ContentType: "application/json",
  });

  await s3Client.send(command);
  console.log(`Store enviado para s3://${bucket}/store.json com sucesso!`);
}

main().catch((e) => {
  console.error("Erro:", e);
  process.exit(1);
});
```

### 5. Atualizar `.env.local`

Remover variáveis do Neon e adicionar:
```
AWS_S3_BUCKET=mourato-associados-db
AWS_S3_REGION=sa-east-1
AWS_ACCESS_KEY_ID=<access_key_gerada>
AWS_SECRET_ACCESS_KEY=<secret_key_gerada>
```

Manter as outras variáveis existentes (MERCADO_PAGO, NEXT_PUBLIC_SITE_URL, etc).

### 6. Configurar Vercel

No painel da Vercel (Settings → Environment Variables), adicionar:
- `AWS_S3_BUCKET` = `mourato-associados-db`
- `AWS_S3_REGION` = `sa-east-1`
- `AWS_ACCESS_KEY_ID` = `<access_key_gerada>`
- `AWS_SECRET_ACCESS_KEY` = `<secret_key_gerada>`

### 7. Fazer seed e deploy

```bash
# Seed do store para o S3
npx tsx scripts/seed-s3.ts

# Build para validar
npm run build

# Push para deploy
git add -A
git commit -m "feat: migrar persistência de Neon PostgreSQL para AWS S3 + cache 30s"
git push origin main
```

### 8. Validação pós-deploy

- [ ] Acessar https://mouratoassociados.com.br/login
- [ ] Login com `admin@mi.com` / `admin123`
- [ ] Criar uma despesa no /admin/dre
- [ ] Verificar no S3 Console que o `store.json` foi atualizado
- [ ] Cadastrar um lojista e testar login do lojista

### 9. Pós-migração (quando Neon desbloquear)

Quando o neon-erin-paddle voltar:
1. Exportar o store do Neon (query: `SELECT data FROM mourato_store WHERE id = 'main'`)
2. Fazer merge dos dados (lojistas, pedidos, financeiro) com o store atual do S3
3. Upload do store merged para o S3

---

## Resumo de arquivos alterados

| Arquivo | Ação |
|---------|------|
| `lib/prisma.ts` | Substituir Postgres por S3, cache 30s |
| `scripts/seed-s3.ts` | Criar (novo) |
| `.env.local` | Atualizar variáveis |
| `package.json` | Nova dependência `@aws-sdk/client-s3` |

## Notas importantes

- NÃO alterar nenhum outro arquivo do projeto
- NÃO mudar a lógica dos models, actions ou pages
- O `pg` pode ser removido do package.json se quiser (opcional)
- Manter o fallback `loadLocalStore()` para desenvolvimento local sem AWS
- A senha admin padrão é `admin@mi.com` / `admin123`
- Senha para operações destrutivas (Zerar Tudo): `1307`
