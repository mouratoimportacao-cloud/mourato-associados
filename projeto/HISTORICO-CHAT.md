# Histórico de Chats — Mourato & Associados

## Chat Atual (Julho 2026)

### O que foi feito

**Login Unificado**
- Nova rota `/login` com `loginUnificado()` em `lib/auth.ts`
- Detecta tipo do usuário (admin/lojista) e redireciona automaticamente
- `/lojista` e `/admin/login` redirecionam para `/login`
- Navbar: botão único "Entrar" → `/login`

**Rollback de segurança**
- Tag `v1.1-pre-login-unificado` criada e enviada ao GitHub

**Checkbox Vitrine**
- `app/admin/produtos/components/ListaProdutos.tsx`: circular com borda dourada e check ✓ amber

**Footer Redesign**
- 3 colunas: Logo+Redes Sociais | Links | QR Code (ponto de venda)
- Copyright removido

**Top 5 Mais Vendidos**
- `app/components/TopVendidos.tsx` — server component, busca dados reais de Pedido+PublicOrder+QrOrder
- `app/components/TopVendidosDisplay.tsx` — client component com barras de progresso animadas, spotlight no hover/touch, intersection observer
- Fallback por nomes conhecidos: 212, One Million, Invictus, Yara, Victoria

**Carrossel Vitrine iOS**
- `app/produtos/components/VitrineCarrossel.tsx` reescrito com CSS `@keyframes vitrine-scroll` (transform: translateX(-50%))
- Resolve bug do Safari/iPhone onde `scrollLeft` via JS não funcionava
- `app/globals.css`: adicionado `@keyframes vitrine-scroll` e `.scrollbar-hide`

**UI Melhorias**
- Grid 2 colunas no mobile em `CatalogoProdutos.tsx`
- Header compacto com título menor em `app/produtos/page.tsx`
- Texto "Esgotado" para produtos sem estoque
- Link "Entrar" → `/login`
- `pt-44 sm:pt-36` no topo da página de produtos

**Mercado Pago**
- `app/checkout/actions.ts`: `criarPreferenciaPagamento()` usando SDK `mercadopago`
- `app/api/mercado-pago/webhook/route.ts`: processa `payment.created`/`payment.updated`, consulta API do MP, atualiza pedidos com `external_reference` correspondente
- `.amazonq/mcp.json`: MCP Server do Mercado Pago configurado via `mcp-remote` + OAuth
- Token de teste: `TEST-3761967622648833-062410-ff7dac27dbdf59ce12b21c8132e19286-1280195312`
- **Status**: OAuth pendente de autorização no browser (processo fica em `Waiting for authorization...`)

**Documentação**
- `.antigravity/CONTEXT.md`: contexto completo para o assistente Antigravity
- `.ai-rules.md`: regras do projeto

---

### Estado atual do projeto

**Banco de dados**
- PostgreSQL Neon (sa-east-1)
- Tabela única `mourato_store` (JSONB) — NÃO é Prisma real
- `lib/prisma.ts` é um ORM fake em memória que persiste no Postgres via `pg`
- NUNCA rodar `prisma migrate` ou `prisma generate`

**Auth**
- JWT customizado (`lib/jwt.ts`)
- Cookies separados: `admin_session` / `lojista_session`
- `loginUnificado()` é o entry point principal

**Credenciais de teste**
- Admin: `mourato@mourato.mi` / `admin123`
- Lojista: `mourato.importacao2@gmail.com` / `Jota1307`

**Deploy**
- Vercel auto-deploy via push na main
- Sempre fazer build local antes de push: `npm run build`

**Dois assistentes**
- Amazon Q (este) e Antigravity trabalham no mesmo projeto
- Sempre `git pull` antes de começar

---

### Próximas tarefas (pendentes)

1. **Finalizar integração Mercado Pago**
   - Autorizar OAuth do MCP no browser (login com conta vendedor MP)
   - Testar fluxo completo: criar preferência → pagar → webhook → pedido atualizado
   - Configurar `MERCADO_PAGO_ACCESS_TOKEN` de produção no Vercel
   - Configurar URL do webhook no painel do MP: `https://mouratoassociados.com.br/api/mercado-pago/webhook`

2. **Carrinho e Checkout público**
   - `CarrinhoWidget.tsx` e `CarrinhoButton.tsx` já existem
   - Falta conectar ao fluxo de `criarPreferenciaPagamento()`

3. **Página de produto individual**
   - `app/produto/[slug]/` existe mas pode precisar de melhorias

4. **Módulo financeiro**
   - `lib/services/dreService.ts`, `financialService.ts`, `stockService.ts` existem
   - `app/admin/dre/` existe
   - Verificar se está completo e funcional
