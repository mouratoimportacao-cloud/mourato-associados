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

## O que foi implementado no último chat

- Login unificado (`/login`) com detecção automática de tipo de usuário
- Footer 3 colunas com Top 5 Mais Vendidos (dados reais + fallback)
- Carrossel vitrine com CSS animation (compatível com iOS/Safari)
- Integração Mercado Pago: `app/checkout/actions.ts` + webhook em `app/api/mercado-pago/webhook/route.ts`
- MCP Server do Mercado Pago configurado em `.amazonq/mcp.json`

## Pendências prioritárias

### 1. Finalizar Mercado Pago (PRIORIDADE ALTA)
O MCP do Mercado Pago está configurado mas o OAuth ainda não foi autorizado.

**O que falta:**
- Autorizar OAuth no browser (abrir VS Code Output > Amazon Q > ver link de autorização)
- Após autorizar, usar as ferramentas MCP para validar:
  - Criar preferência de pagamento de teste
  - Consultar pagamentos
  - Verificar se webhook está recebendo corretamente
- Configurar `MERCADO_PAGO_ACCESS_TOKEN` de produção no Vercel (Settings > Environment Variables)
- Registrar URL do webhook no painel do MP: `https://mouratoassociados.com.br/api/mercado-pago/webhook`
- Token de teste disponível: `TEST-3761967622648833-062410-ff7dac27dbdf59ce12b21c8132e19286-1280195312`

### 2. Conectar Carrinho ao Checkout
- `app/components/CarrinhoWidget.tsx` e `CarrinhoButton.tsx` já existem
- Falta conectar ao `criarPreferenciaPagamento()` de `app/checkout/actions.ts`
- Fluxo esperado: usuário adiciona ao carrinho → preenche dados → redireciona para MP → webhook atualiza pedido

### 3. Verificar módulo financeiro
- `app/admin/dre/` + `lib/services/dreService.ts`, `financialService.ts`, `stockService.ts`
- Confirmar se está funcional ou precisa de ajustes

## Estrutura relevante

```
app/
├── api/mercado-pago/webhook/route.ts  # Webhook MP
├── checkout/actions.ts                # criarPreferenciaPagamento()
├── components/
│   ├── CarrinhoWidget.tsx             # Carrinho (client)
│   ├── CarrinhoButton.tsx             # Botão flutuante
│   ├── TopVendidos.tsx                # Server component
│   └── TopVendidosDisplay.tsx         # Client component
├── login/page.tsx                     # Login unificado
├── produto/[slug]/                    # Página individual
└── produtos/                          # Catálogo
lib/
├── auth.ts                            # loginUnificado(), getAdminSession(), getLojistaSession()
├── prisma.ts                          # ORM fake — NÃO usar Prisma CLI
└── jwt.ts                             # signJwt(), verifyJwt()
.amazonq/mcp.json                      # MCP Mercado Pago (OAuth pendente)
```

## Antes de começar

```bash
git pull
npm run build  # sempre verificar antes de qualquer push
```
