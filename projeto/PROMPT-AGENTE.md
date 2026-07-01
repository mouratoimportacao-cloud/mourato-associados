# Prompt para Agente — Mourato & Associados

## Identidade do Projeto

Plataforma de venda de perfumes e cosméticos com área de revendedores (lojistas).
- **URL produção**: https://mouratoassociados.com.br
- **Stack**: Next.js 16 App Router, TypeScript, Tailwind CSS 4, PostgreSQL Neon, JWT customizado
- **Deploy**: Vercel (auto-deploy via push na `main`) — também disponível via `npx vercel --prod --yes`
- **Repositório**: https://github.com/mouratoimportacao-cloud/mourato-associados

---

## ⚠️ REGRAS CRÍTICAS — LEIA ANTES DE QUALQUER COISA

### Banco de Dados
- `lib/prisma.ts` é um **ORM fake em memória** que persiste no PostgreSQL Neon via `pg`
- **NÃO existe Prisma real** — `prisma/schema.prisma` existe mas é ignorado em runtime
- **NUNCA rodar**: `prisma migrate`, `prisma generate`, `prisma db push` ou qualquer Prisma CLI
- Toda a aplicação usa uma tabela única: `mourato_store` (JSONB no Neon)
- Para **adicionar um novo campo** a uma entidade: editar `lib/prisma.ts`
  1. Adicionar o campo na lista `columns[NomeTabela]`
  2. Adicionar o tipo em `NomeTabelaData`
  3. Se for nova tabela: adicionar em `TableName`, em `columns`, em `emptyStore()` (rows + seq), em `loadLocalStore()`, em `loadPostgresStore()` e expor no objeto `prisma` exportado

### Build
- **Sempre rodar `npm run build` antes de qualquer commit ou deploy**
- O build usa TypeScript strict — erros de tipo bloqueiam o deploy
- O aviso do `next-sitemap` no postbuild é conhecido e não afeta o funcionamento

### Git
- Branch principal: `main`
- Antes de push: `git pull --rebase origin main` para evitar rejeição

---

## Autenticação

- JWT customizado em `lib/jwt.ts` — **não usar next-auth ou qualquer outra lib**
- Cookies: `admin_session` (admin) e `lojista_session` (lojista)
- Login unificado em `/login` via `loginUnificado()` em `lib/auth.ts`
- Middleware em `middleware.ts` protege `/admin/*` e `/lojista/painel`
- Credenciais de teste:
  - Admin: `mourato@mourato.mi` / `admin123`
  - Lojista: `mourato.importacao2@gmail.com` / `Jota1307`

---

## Estrutura de Arquivos Relevante

```
app/
├── api/
│   ├── mercado-pago/webhook/route.ts   # Webhook MP — processa pagamentos
│   ├── package/[purchaseId]/route.ts   # API de pacotes de compra
│   ├── public-order/route.ts
│   ├── qr-order/route.ts
│   ├── retailer-purchase/route.ts
│   └── search/route.ts
├── checkout/
│   └── actions.ts                      # criarPreferenciaPagamento() — integração MP
├── components/
│   ├── CarrinhoWidget.tsx              # Drawer do carrinho (client) — já conectado ao MP
│   ├── CarrinhoButton.tsx              # Botão flutuante com contador
│   ├── TopVendidos.tsx                 # Server component
│   ├── TopVendidosDisplay.tsx          # Client component
│   ├── OptimizedImage.tsx
│   └── ...
├── admin/
│   ├── dre/                            # Módulo financeiro DRE
│   ├── leads/                          # Gestão de leads
│   ├── lojistas/                       # Gestão de revendedores
│   ├── pedidos/
│   │   └── actions.ts                  # atualizarStatusPedidoInterno()
│   ├── produtos/
│   ├── radar/
│   └── configurar/
├── lojista/
│   ├── painel/                         # Painel do revendedor
│   └── cadastro/
├── login/page.tsx                      # Login unificado
├── produto/[slug]/                     # Página individual do produto
├── produtos/
│   └── actions.ts                      # registrarIntencaoCompraCarrinho(), obterLojistaPorCodigo()
└── r/[codigo]/                         # Links de referência de lojistas
lib/
├── auth.ts                             # loginUnificado(), getAdminSession(), getLojistaSession()
├── jwt.ts                              # signJwt(), verifyJwt()
├── prisma.ts                           # ORM fake — ÚNICA fonte de verdade do banco
├── site-config.ts                      # Configurações sociais persistidas no Postgres
└── services/
    ├── dreService.ts
    ├── financialService.ts
    ├── packageService.ts               # usa prisma.package
    └── stockService.ts
scripts/
├── test-mp.mjs                         # Testa conexão com Mercado Pago
└── test-fluxo-completo.mjs             # Testa fluxo end-to-end do checkout
```

---

## Mercado Pago — Status Atual ✅

- SDK: `mercadopago` (npm) — já instalado
- Token de teste: `TEST-3761967622648833-062410-ff7dac27dbdf59ce12b21c8132e19286-1280195312`
- Token de produção: configurar `MERCADO_PAGO_ACCESS_TOKEN` no Vercel (ainda pendente)
- `notification_url` já configurada em `app/checkout/actions.ts`
- Webhook em `/api/mercado-pago/webhook` já funcionando em produção (HTTP 200)
- Fluxo:
  - Site público → carrinho → formulário de endereço → `registrarIntencaoCompraCarrinho()` → `criarPreferenciaPagamento()` → redireciona para MP → webhook atualiza pedido para `"pago"`
  - Link de lojista (`/r/[codigo]`) → carrinho → pedido registrado → **sem MP** (lojista cobra diretamente)

---

## Tabelas Disponíveis no `prisma`

| Accessor | TableName | Descrição |
|---|---|---|
| `prisma.produto` | `Produto` | Catálogo de produtos |
| `prisma.pedido` | `Pedido` | Pedidos e intenções de compra |
| `prisma.usuario` | `Usuario` | Admins e lojistas |
| `prisma.despesa` | `Despesa` | Despesas financeiras |
| `prisma.fechamentoMensal` | `FechamentoMensal` | Fechamentos mensais |
| `prisma.lancamentoFinanceiro` | `LancamentoFinanceiro` | Lançamentos financeiros |
| `prisma.fechamentoFinanceiro` | `FechamentoFinanceiro` | Fechamentos financeiros |
| `prisma.lead` | `Lead` | Leads de clientes |
| `prisma.publicOrder` | `PublicOrder` | Pedidos públicos |
| `prisma.qrOrder` | `QrOrder` | Pedidos via QR |
| `prisma.retailerPurchase` | `RetailerPurchase` | Compras de revendedores |
| `prisma.financialEntry` | `FinancialEntry` | Entradas financeiras |
| `prisma.supplierStock` | `SupplierStock` | Estoque fornecedor |
| `prisma.retailerStock` | `RetailerStock` | Estoque revendedor |
| `prisma.package` | `Package` | Pacotes de compra |

---

## Variáveis de Ambiente

| Variável | Onde | Status |
|---|---|---|
| `POSTGRES_URL` | Vercel + `.env.production.local` | ✅ Configurado (Neon) |
| `JWT_SECRET` | Vercel | ✅ Configurado |
| `MERCADO_PAGO_ACCESS_TOKEN` | Vercel | ⚠️ Pendente (token de produção) |
| `NEXT_PUBLIC_SITE_URL` | Vercel | Verificar |

---

## Fluxo de Trabalho Padrão

```bash
# 1. Sempre começar com
git pull

# 2. Fazer alterações

# 3. Verificar build antes de qualquer commit
npm run build

# 4. Commitar
git add -A
git commit -m "tipo: descrição clara"

# 5. Push (com rebase se necessário)
git pull --rebase origin main
git push origin main

# 6. Deploy (opcional — Vercel faz auto-deploy no push)
npx vercel --prod --yes
```

---

## Pendências Conhecidas

1. **`MERCADO_PAGO_ACCESS_TOKEN` de produção** — configurar no Vercel com token `APP_USR-...`
2. **`next-sitemap.config.js`** — arquivo ausente, gera aviso no postbuild (não crítico)
3. **Módulo financeiro DRE** (`app/admin/dre/`) — verificar se está funcional

---

## Como Testar

```bash
# Testar conexão com Mercado Pago
node scripts/test-mp.mjs

# Testar fluxo completo end-to-end
node scripts/test-fluxo-completo.mjs

# Build local
npm run build

# Dev local (usa .env — banco local SQLite/Postgres local)
npm run dev
```
