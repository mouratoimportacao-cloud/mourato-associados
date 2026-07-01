# Prompt para o Próximo Chat — Mourato & Associados

## Contexto do Projeto

Plataforma de venda de perfumes e cosméticos com área de revendedores (lojistas).
- **URL**: https://mouratoassociados.com.br
- **Stack**: Next.js 16 App Router, TypeScript, Tailwind CSS 4, PostgreSQL Neon, JWT customizado
- **Deploy**: Vercel (auto-deploy via push na main)

## REGRAS CRÍTICAS DO BANCO

- `lib/prisma.ts` é um **ORM fake em memória** que persiste no PostgreSQL Neon via `pg`
- Tabela única: `mourato_store` (JSONB) — toda a aplicação vive nessa tabela
- **NUNCA** rodar `prisma migrate`, `prisma generate` ou qualquer comando Prisma CLI
- Para adicionar campos: editar `lib/prisma.ts` (columns, tipo, emptyStore, loadLocalStore, loadPostgresStore e objeto `prisma` exportado)

## Auth

- JWT customizado em `lib/jwt.ts`
- Cookies: `admin_session` (admin) e `lojista_session` (lojista)
- Login unificado: `loginUnificado()` em `lib/auth.ts` → rota `/login`
- Credenciais teste: Admin `mourato@mourato.mi` / `admin123` | Lojista `mourato.importacao2@gmail.com` / `Jota1307`

## O que foi feito neste chat

- ✅ Mercado Pago validado (17/17 testes passando)
- ✅ `notification_url` adicionada em `app/checkout/actions.ts`
- ✅ Bug corrigido: `TableName 'package'` estava minúsculo, causava erro de build
- ✅ `prisma.package` exposto no objeto prisma exportado
- ✅ Build passando local e na Vercel
- ✅ Deploy em produção confirmado — todas as rotas respondendo
- ✅ GitHub atualizado (branch `main`)

## Pendências

### 1. Token de produção do Mercado Pago (PRIORIDADE ALTA)
- Configurar `MERCADO_PAGO_ACCESS_TOKEN` no Vercel com token `APP_USR-...`
- Vercel → Settings → Environment Variables → Production + Preview
- Sem isso, checkout cai no fallback de WhatsApp (já implementado)

### 2. next-sitemap.config.js (BAIXA)
- Arquivo ausente gera aviso no postbuild — não afeta funcionamento
- Criar `next-sitemap.config.js` na raiz para eliminar o aviso

### 3. Módulo financeiro DRE
- `app/admin/dre/` + `lib/services/dreService.ts`, `financialService.ts`, `stockService.ts`
- Verificar se está funcional

## Estrutura relevante

```
app/
├── api/mercado-pago/webhook/route.ts  # Webhook MP ✅
├── checkout/actions.ts                # criarPreferenciaPagamento() ✅ (com notification_url)
├── components/
│   ├── CarrinhoWidget.tsx             # Carrinho conectado ao MP ✅
│   └── CarrinhoButton.tsx             # Botão flutuante ✅
├── login/page.tsx                     # Login unificado ✅
├── produto/[slug]/                    # Página individual
└── produtos/actions.ts                # registrarIntencaoCompraCarrinho() ✅
lib/
├── auth.ts
├── prisma.ts                          # ORM fake — NÃO usar Prisma CLI
└── jwt.ts
scripts/
├── test-mp.mjs                        # node scripts/test-mp.mjs
└── test-fluxo-completo.mjs            # node scripts/test-fluxo-completo.mjs
projeto/
└── PROMPT-AGENTE.md                   # Guia completo para agentes externos
```

## Antes de começar

```bash
git pull
npm run build
```
