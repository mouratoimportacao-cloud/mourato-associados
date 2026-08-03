# Contexto do Chat - Mourato & Associados

## Status Atual (último estado conhecido)

### Hospedagem
- **Plataforma:** AWS Amplify Hosting
- **App ID:** `dij14sbges5l7`
- **URL Amplify:** `https://main.dij14sbges5l7.amplifyapp.com`
- **URL Produção:** `https://www.mouratoassociados.com.br`
- **Deploy:** automático via push no branch `main` do GitHub
- **Vercel:** pausada por fatura em aberto (pode ser cancelada)

### Banco de Dados
- **AWS S3** — bucket `mourato-associados-db`, região `sa-east-1`
- Arquivo: `store.json`
- IAM User: `mourato-s3-app`
- ⚠️ Variáveis renomeadas de `AWS_S3_*` para `S3_*` no Amplify (prefixo AWS_ é reservado)
- O código mantém fallback para os nomes antigos (`AWS_S3_*`) — `.env.local` não precisa mudar

### Mercado Pago
- **Access Token**: regenerado (o anterior foi exposto no commit `0650ccb`)
- **Public Key**: `APP_USR-98c7445f-9f36-4762-91e9-6baa2b90067a` (app "MouratoAssociados")
- **Webhook URL**: `https://www.mouratoassociados.com.br/api/mercado-pago/webhook` ✅
- **Evento configurado**: Pagamentos ✅
- Score de qualidade: **92/100** ✅

### Checkout Transparente
- **Pix**: funcionando ✅
- **Cartão**: retorna `cc_rejected_high_risk` (antifraude de conta nova)
  - Não é bug de código — aguardar 24-48h + Pix aprovados + contato suporte MP

### DNS (Registro.br)
- `www.mouratoassociados.com.br` → CNAME → `d21mfdsauhoqym.cloudfront.net` ✅
- `_7764e685157327bad60008bd157d944d.mouratoassociados.com.br` → CNAME → `_8577eaca1792791765503b5cdc0bf7d0.jkddzztszm.acm-validations.aws.` (validação SSL) ✅
- ⚠️ Domínio raiz `mouratoassociados.com.br` sem registro A (Registro.br não suporta CNAME no raiz)
  - Amplify redireciona automaticamente para `www`

### Variáveis de Ambiente (Amplify)
- `NEXT_PUBLIC_SITE_URL=https://mouratoassociados.com.br`
- `S3_BUCKET=mourato-associados-db`
- `S3_REGION=sa-east-1`
- `S3_ACCESS_KEY_ID=<key>`
- `S3_SECRET_ACCESS_KEY=<secret>`
- `MERCADO_PAGO_ACCESS_TOKEN=<token regenerado>`
- `MERCADO_PAGO_PUBLIC_KEY=APP_USR-98c7445f-9f36-4762-91e9-6baa2b90067a`
- `JWT_SECRET=<secret>`

## Arquivos Principais Modificados

| Arquivo | O que faz |
|---|---|
| `app/components/CarrinhoWidget.tsx` | Checkout transparente (Cartão + Pix) |
| `app/checkout/actions.ts` | Server actions: `processarPagamentoCartao`, `gerarPixCarrinho` |
| `app/api/mercado-pago/webhook/route.ts` | Webhook: atualiza pedido ao receber pagamento/rejeição |
| `next.config.ts` | Config unificada (era .js + .ts), VERCEL_URL → NEXT_PUBLIC_SITE_URL |
| `lib/prisma.ts` | Persistência S3, variáveis renomeadas para `S3_*` |

## Rollback
- Tag Git: `pre-amplify-migration`
- Para voltar: `git checkout pre-amplify-migration`
- Vercel ainda está configurada (só pausada por fatura)

## Próximas Ações

1. [ ] Cancelar/pausar conta Vercel para evitar cobranças
2. [ ] Cliente testar login admin, lojista e checkout Pix
3. [ ] Aguardar aprovação de cartão (antifraude conta nova — 24-48h)
4. [ ] Contatar suporte MP pedindo revisão manual do antifraude
5. [ ] Adicionar registro A no Registro.br para domínio raiz (opcional — www já funciona)
