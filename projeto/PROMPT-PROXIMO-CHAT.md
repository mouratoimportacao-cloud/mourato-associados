# Prompt para o Próximo Chat — Mourato & Associados

## Contexto do Projeto

Plataforma de venda de perfumes e cosméticos com área de revendedores (lojistas).
- **URL**: https://mouratoassociados.com.br
- **Stack**: Next.js 16 App Router, TypeScript, Tailwind CSS 4, AWS S3 (migrado do Neon), JWT customizado
- **Deploy**: Vercel (auto-deploy via push na main)

## REGRAS CRÍTICAS DO BANCO

- `lib/prisma.ts` é um **ORM fake em memória** que persiste no **AWS S3** (migrado do Neon PostgreSQL)
- Armazena um único arquivo `store.json` no bucket `mourato-associados-db` (us-east-1)
- **NUNCA** rodar `prisma migrate`, `prisma generate` ou qualquer comando Prisma CLI
- **NUNCA** usar `pg` ou referências ao Neon — foi completamente removido
- Cache: 30 segundos (`cacheDuration = 30000`)
- Para adicionar campos: editar `lib/prisma.ts` (columns, tipo, emptyStore, loadLocalStore, loadS3Store e objeto `prisma` exportado)
- Fallback: se S3 falhar → usa `.data/store.json` local

## Auth

- JWT customizado em `lib/jwt.ts`
- Cookies: `admin_session` (admin) e `lojista_session` (lojista)
- Login unificado: `loginUnificado()` em `lib/auth.ts` → rota `/login`
- Credenciais locais: Admin `admin@mi.com` / `admin123` (criado por `ensureAdminExists`)
- Credenciais produção (Neon/S3): Admin `mourato@mourato.mi` / `290618`

## AWS

- **Conta**: `566167302262`
- **IAM User CLI**: `Hesuel` (AdministratorAccess) — profile `default` e `Use Cli`
- **IAM User App**: `mourato-s3-app` (só `s3:GetObject` e `s3:PutObject` no bucket)
- **Bucket S3**: `mourato-associados-db` (us-east-1, privado, versionamento ativo, lifecycle 30 dias)
- **Credenciais app** (já no Vercel e `.env.local`):
  - `AWS_ACCESS_KEY_ID`: ver `.env.local` ou Vercel → Settings → Env Vars
  - `AWS_SECRET_ACCESS_KEY`: ver `.env.local` ou Vercel → Settings → Env Vars
  - `AWS_S3_BUCKET`: `mourato-associados-db`
  - `AWS_S3_REGION`: `us-east-1`

## O que foi feito neste chat

- ✅ AWS CLI configurado — profile `default` corrigido com credenciais válidas do `Hesuel`
- ✅ `Hesuel` elevado para `AdministratorAccess` no IAM
- ✅ Bucket S3 `mourato-associados-db` criado (us-east-1, privado, versionamento + lifecycle 30 dias)
- ✅ IAM user `mourato-s3-app` criado com policy restrita ao bucket
- ✅ `lib/prisma.ts` migrado — Neon/pg removido, S3 no lugar, cache 30s
- ✅ `scripts/seed-s3.ts` criado — envia `store.json` local para o S3
- ✅ `store.json` enviado para o S3 (21KB com todos os dados)
- ✅ Variáveis AWS configuradas na Vercel (production)
- ✅ `.env.local` criado com variáveis AWS para desenvolvimento local
- ✅ `app/favicon.ico` substituído pelo logo da marca (`/public/brand/logo-ma.png`)
- ✅ Build passando, deploy em produção confirmado

## Pendências

### 1. Token de produção do Mercado Pago (PRIORIDADE ALTA)
- Configurar `MERCADO_PAGO_ACCESS_TOKEN` no Vercel com token `APP_USR-...`
- Sem isso, checkout cai no fallback de WhatsApp (já implementado)

### 2. Upload de imagens para S3 (RECOMENDADO)
- Atualmente uploads do painel admin salvam em `public/uploads/` (local)
- Migrar para salvar direto no S3 para persistência permanente

## Estrutura relevante

```
app/
├── api/mercado-pago/webhook/route.ts  # Webhook MP ✅
├── checkout/actions.ts                # criarPreferenciaPagamento() ✅
├── login/page.tsx                     # Login unificado ✅
├── admin/dre/                         # Financeiro (DRE, empréstimos)
└── lojista/painel/                    # Painel do revendedor
lib/
├── auth.ts
├── prisma.ts                          # ORM fake — persiste no S3
└── jwt.ts
scripts/
├── seed-s3.ts                         # npx tsx scripts/seed-s3.ts
├── test-mp.mjs                        # node scripts/test-mp.mjs
└── test-fluxo-completo.mjs
public/
├── brand/logo-ma.png                  # Logo da marca
├── marketing/                         # Imagens dos produtos
└── uploads/                           # Uploads via painel admin
projeto/
└── PROMPT-AGENTE.md                   # Guia completo para agentes externos
```

## Antes de começar

```bash
git pull
npm run build
```

## Seed S3 (se precisar reenviar dados locais para o S3)

```bash
set "AWS_S3_BUCKET=mourato-associados-db"
set "AWS_S3_REGION=us-east-1"
set "AWS_ACCESS_KEY_ID=<ver .env.local>"
set "AWS_SECRET_ACCESS_KEY=<ver .env.local>"
npx tsx scripts/seed-s3.ts
```
