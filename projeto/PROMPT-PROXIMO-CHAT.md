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
- Para adicionar campos: editar `lib/prisma.ts` (adicionar na lista `columns` e no tipo correspondente)

## Auth

- JWT customizado em `lib/jwt.ts`
- Cookies: `admin_session` (admin) e `lojista_session` (lojista)
- Entry point de login: `loginUnificado()` em `lib/auth.ts` → rota `/login`
- Credenciais teste: Admin `mourato@mourato.mi` / `admin123` | Lojista `mourato.importacao2@gmail.com` / `Jota1307`

## O que foi implementado (estado atual)

- ✅ Login unificado (`/login`) com detecção automática de tipo de usuário
- ✅ Footer 3 colunas com Top 5 Mais Vendidos (dados reais + fallback)
- ✅ Carrossel vitrine com CSS animation (compatível com iOS/Safari)
- ✅ Carrinho → Checkout → Mercado Pago: fluxo 100% conectado
  - `CarrinhoWidget.tsx` já chama `criarPreferenciaPagamento()` de `app/checkout/actions.ts`
  - Fluxo: carrinho → form endereço → `registrarIntencaoCompraCarrinho()` → `criarPreferenciaPagamento()` → redirect MP
  - Vendas via lojista (com `params.codigo`) NÃO redirecionam para MP — ficam como pedido manual
- ✅ Webhook em `app/api/mercado-pago/webhook/route.ts` — processa `payment.approved` e atualiza pedido para `pago`
- ✅ MCP Server do Mercado Pago configurado em `.amazonq/mcp.json`

## PRIORIDADE: Finalizar validação Mercado Pago via MCP

### Situação atual dos tokens
- **Token de produção** (`.env.local`): `APP_USR-3627832252682589-062111-31275374120a3bd48862c8189a2ae5fa-3489260936`
  - Conta: `test_user_6318761118949398271@testuser.com` — é um **test user**, bloqueado por PolicyAgent para criar preferências
- **Token de teste do dono** (usar este): `TEST-3761967622648833-062410-ff7dac27dbdf59ce12b21c8132e19286-1280195312`
  - Conta real: `mourato.importacao@gmail.com` / Jose Jailson Mourato Da Silva (ID: 1280195312)
  - Este token tem permissão de leitura confirmada (GET /checkout/preferences/search retorna 200)

### OAuth MCP — já autorizado no browser
O OAuth foi feito via `npx -y mcp-remote@latest https://mcp.mercadopago.com/mcp`.
O token OAuth está em cache local. Se as ferramentas MCP não aparecerem:
1. Ctrl+Shift+P → `Amazon Q: Restart Language Server`
2. Aguardar ~15s e abrir novo chat

### 6 passos a executar via MCP assim que autenticado

**Passo 1 — Verificar credenciais**
Confirmar que o token está válido e qual conta está autenticada no MCP.

**Passo 2 — Criar preferência de pagamento de teste**
Simular um checkout com produtos reais do catálogo:
- Yara - Lattafa 100ml × 1 → R$ 290,00
- Champ de Mars 100ml × 2 → R$ 290,00 cada
- `external_reference`: `TEST-CHECKOUT-001`
- `back_urls`: success/failure/pending apontando para `https://mouratoassociados.com.br/produtos?pagamento=...`
- `statement_descriptor`: `MOURATO&ASSOCIADOS`

**Passo 3 — Consultar preferência criada**
Buscar a preferência pelo ID retornado no passo 2 e confirmar que `init_point` (URL de pagamento) está presente.

**Passo 4 — Consultar pagamentos existentes**
Listar pagamentos recentes da conta para ver se há algum já processado.

**Passo 5 — Simular webhook**
Fazer POST para `https://mouratoassociados.com.br/api/mercado-pago/webhook` com payload:
```json
{
  "type": "payment",
  "action": "payment.updated",
  "data": { "id": "<id_de_um_pagamento_real_ou_teste>" }
}
```
Verificar se retorna `{ "received": true }`.

**Passo 6 — Registrar webhook no painel MP**
Confirmar/registrar a URL `https://mouratoassociados.com.br/api/mercado-pago/webhook` como endpoint de notificações no painel do Mercado Pago para eventos de `payment`.

### Após validar via MCP
- Substituir o token no `.env.local` pelo token de produção real (gerado no painel MP em produção)
- Adicionar `MERCADO_PAGO_ACCESS_TOKEN` no Vercel → Settings → Environment Variables
- Fazer `npm run build` e push

## Estrutura relevante

```
app/
├── api/mercado-pago/webhook/route.ts  # Webhook MP — processa payment.approved
├── checkout/actions.ts                # criarPreferenciaPagamento()
├── components/
│   ├── CarrinhoWidget.tsx             # Carrinho completo com form de endereço e checkout
│   ├── CarrinhoButton.tsx             # Botão flutuante com contador
│   ├── TopVendidos.tsx                # Server component
│   └── TopVendidosDisplay.tsx         # Client component
├── login/page.tsx                     # Login unificado
├── produto/[slug]/                    # Página individual
└── produtos/                          # Catálogo
lib/
├── auth.ts                            # loginUnificado(), getAdminSession(), getLojistaSession()
├── prisma.ts                          # ORM fake — NÃO usar Prisma CLI
├── jwt.ts                             # signJwt(), verifyJwt()
└── financeiro.ts                      # calcularFinanceiro() — usado pelo DRE
app/admin/dre/                         # Módulo financeiro — funcional
.amazonq/mcp.json                      # MCP Mercado Pago
```

## Antes de começar

```bash
git pull
npm run build  # sempre verificar antes de qualquer push
```
