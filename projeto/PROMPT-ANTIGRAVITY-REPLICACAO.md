# Prompt de Replicação — Mourato & Associados

## Contexto

Você vai replicar o projeto **Mourato & Associados** — uma plataforma de venda de perfumes, cosméticos e skincare com área de revendedores (lojistas). O projeto já existe e está em produção. Sua tarefa é replicar a arquitetura de forma **modular**, onde cada módulo pode ser desenvolvido, testado e deployado de forma independente.

---

## Stack Atual (Referência)

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilização | Tailwind CSS 4 |
| Banco | PostgreSQL (Neon) via Prisma 7 |
| Auth | JWT customizado (crypto.subtle) + bcryptjs |
| Pagamentos | Mercado Pago (Preference API + Pix Payment API) |
| Notificações | CallMeBot WhatsApp API |
| Deploy | Vercel (auto-deploy via push na main) |
| PWA | manifest.json + instalador customizado |

---

## Módulos do Projeto

O projeto é composto por **7 módulos independentes**. Cada módulo tem suas próprias rotas, actions, componentes e modelos de banco.

---

### MÓDULO 1 — Catálogo Público (`/produtos`)

**O que faz:**
- Exibe catálogo de perfumes com filtros (categoria, gênero, família olfativa, marca)
- Carrossel de destaques (vitrine)
- Página de detalhe do produto (`/produto/[slug]`)
- Carrinho lateral (drawer) com checkout
- Formulário de dados do cliente (nome, contato, endereço)
- Integração com Mercado Pago (redirect para checkout)
- Links de referência de lojistas (`/r/[codigo]`) — rastreia origem da venda

**Modelos de banco:**
```prisma
model Produto {
  id                Int      @id @default(autoincrement())
  nome              String
  marca             String
  categoria         String
  volume            String
  preco             Float?
  estoque           Int      @default(0)
  ativoSite         Boolean  @default(false)
  descricao         String?
  imagem            String?  // URL ou /marketing/arquivo.webp
  categoria_principal String?
  tags              String?
  concentracao      String?
  origem            String?
  tipo_perfume      String?
  genero            String?
  familia_olfativa  String?
  notas_topo        String?
  notas_coracao     String?
  notas_fundo       String?
  fixacao_estimada  String?
  projecao          String?
  ocasiao_uso       String?
  similaridade_inspiracao String?
  descricao_olfativa String?
  createdAt         DateTime @default(now())
}

model Pedido {
  id              Int      @id @default(autoincrement())
  usuarioId       Int      // 0 = site público, >0 = lojista
  produtoId       Int?
  produtoNome     String?
  quantidade      Int?
  precoUnitario   Float?
  precoTabela     Float?
  custoUnitario   Float?
  descontoConcedido Float?  @default(0)
  lucroBruto      Float?   @default(0)
  tipoFluxo       String?  // "intencao_site" | "venda_qr"
  pagamento       String?
  observacao      String?  // contém "Ref: XXXXXX" para rastrear checkout MP
  total           Float
  status          String   // "intencao de compra" | "pago" | "aguardando lojista"
  createdAt       DateTime @default(now())
}

model Lead {
  id        Int      @id @default(autoincrement())
  nome      String
  contato   String
  cidade    String?
  estado    String?
  endereco  String?
  produtos  String?
  total     Float?
  status    String   @default("Novo")
  createdAt DateTime @default(now())
}
```

**Fluxo de checkout (site público):**
1. Cliente adiciona produtos ao carrinho
2. Preenche nome, contato, endereço
3. `registrarIntencaoCompraCarrinho()` → cria Pedido + Lead no banco
4. `criarPreferenciaPagamento()` → cria Preference no Mercado Pago
5. Redirect para `init_point` do MP
6. Webhook `/api/mercado-pago/webhook` recebe confirmação → atualiza status para "pago"
7. Notificação WhatsApp via CallMeBot para o admin

**Anti-duplicação:** Verifica pedidos com mesmo `usuarioId` nos últimos 30 segundos antes de criar novo.

**Notificação WhatsApp:**
```
POST https://api.callmebot.com/whatsapp.php?phone={PHONE}&text={MSG}&apikey={KEY}
```

**Variáveis de ambiente necessárias:**
```
DATABASE_URL=postgresql://...
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
NEXT_PUBLIC_SITE_URL=https://mouratoassociados.com.br
CALLMEBOT_PHONE=5511978990034
CALLMEBOT_APIKEY=3748355
```

---

### MÓDULO 2 — Autenticação (`/login`, `/admin/login`, `/lojista`)

**O que faz:**
- Login unificado em `/login` — detecta tipo (admin/lojista) automaticamente
- JWT customizado com `crypto.subtle` (HS256) — sem dependência externa
- Cookies separados: `admin_session` e `lojista_session`
- Sessão válida por 7 dias
- bcryptjs para hash de senhas
- Auto-seed do admin padrão se não existir no banco

**Modelos de banco:**
```prisma
model Usuario {
  id             Int      @id @default(autoincrement())
  nome           String
  email          String   @unique
  senha          String   // bcrypt hash
  tipo           String   // "admin" | "lojista"
  documento      String?
  telefone       String?
  endereco       String?
  cidade         String?
  estado         String?
  cep            String?
  status         String?  @default("pendente") // "pendente" | "aprovado"
  codigoRevenda  String?  // código único do lojista para links /r/[codigo]
  estoquePessoal String?  @db.Text // JSON: { "produtoId": quantidade }
  createdAt      DateTime @default(now())
}
```

**Funções principais (lib/auth.ts):**
- `loginUnificado(formData)` — login único, seta cookie correto, retorna redirect
- `getAdminSession()` — verifica cookie `admin_session`, retorna payload ou null
- `getLojistaSession()` — verifica cookie `lojista_session`, retorna payload ou null
- `logoutAdmin()` / `logoutLojista()` — deleta cookies

**JWT (lib/jwt.ts):**
- `signJwt(payload, secret)` — assina com HMAC-SHA256
- `verifyJwt(token, secret)` — verifica assinatura + expiração

**Variáveis de ambiente:**
```
JWT_SECRET=sua-chave-secreta-aqui
```

---

### MÓDULO 3 — Painel Admin (`/admin`)

**O que faz:**
- Dashboard com resumo de pedidos e métricas
- CRUD de produtos (criar, editar, excluir, upload de imagem)
- Gestão de pedidos (listar, filtrar, atualizar status, confirmar pagamento manual)
- Gestão de lojistas (aprovar, rejeitar, ver estoque pessoal)
- Leads (clientes que iniciaram checkout)
- Radar (monitoramento em tempo real)
- Configurações do site (links sociais)
- DRE / Financeiro

**Proteção de rotas:** Todas as páginas `/admin/*` verificam `getAdminSession()` no início do Server Component. Se null → redirect para `/login`.

**Filtros de produtos:**
- Por nome/marca (busca textual)
- Por categoria
- Por visibilidade no site (todos / ativo / oculto)

**Upload de imagem:**
- Salva em `/public/uploads/` com timestamp no nome
- Retorna URL relativa `/uploads/arquivo.webp`

---

### MÓDULO 4 — Área do Lojista (`/lojista`)

**O que faz:**
- Cadastro de lojista (aguarda aprovação do admin)
- Login via `/login` (mesmo fluxo unificado)
- Painel do lojista: ver pedidos, estoque pessoal, link de referência
- Link de referência: `/r/[codigoRevenda]` — quando cliente acessa, o lojista é rastreado
- Redefinição de senha via token por e-mail

**Fluxo de venda via lojista:**
1. Lojista compartilha link `/r/[codigo]`
2. Cliente acessa → cookie de referência é setado
3. Cliente compra → `registrarIntencaoCompra(produtoId, lojistaId)` cria pedido com `tipoFluxo: "venda_qr"`
4. Pedido aparece no painel do lojista como "aguardando lojista"
5. Lojista confirma → baixa do estoque pessoal

**Estoque pessoal:** Armazenado como JSON no campo `estoquePessoal` do Usuario:
```json
{ "42": 3, "17": 1, "8": 5 }
```
Chave = produtoId, valor = quantidade disponível.

---

### MÓDULO 5 — Rifas (`/rifas`, `/admin/rifas`)

**O que faz:**
- Página pública de participação em rifas
- Formulário: nome completo, telefone, @instagram, @facebook (opcional)
- Geração de número de bilhete aleatório único (0000-9999)
- Pagamento via Pix (Mercado Pago Payment API — não Preference)
- QR Code Pix exibido após registro
- Webhook confirma pagamento → atualiza bilhete para "PAGO"
- Admin: criar/editar rifas, ver bilhetes, confirmar pagamento manual, sortear ganhador

**Modelos de banco:**
```prisma
model Rifa {
  id             Int       @id @default(autoincrement())
  titulo         String
  descricao      String?
  imagem         String?
  pixFixo        String?   // chave pix manual (fallback)
  precoBilhete   Decimal
  status         String    @default("ATIVO") // ATIVO | FINALIZADO | CANCELADO
  dataSorteio    DateTime?
  numeroGanhador Int?
  bilhetes       Bilhete[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model Bilhete {
  id            Int      @id @default(autoincrement())
  rifaId        Int
  rifa          Rifa     @relation(fields: [rifaId], references: [id])
  nome          String
  telefone      String
  usernameInsta String
  usernameFace  String?
  numeroBilhete Int
  statusPagto   String   @default("AGUARDANDO_PAGAMENTO") // PAGO | AGUARDANDO_PAGAMENTO | EXPIRADO
  pixTxid       String?  // ID do pagamento no Mercado Pago
  createdAt     DateTime @default(now())
}
```

**Fluxo de pagamento Pix (rifas):**
1. `registrarParticipante()` → cria bilhete + chama `payment.create()` no MP com `payment_method_id: "pix"`
2. Retorna `qr_code` e `qr_code_base64` para exibir na tela
3. Webhook `/api/mercado-pago/webhook` recebe `payment.updated` → busca bilhete por `pixTxid` → atualiza para "PAGO"

---

### MÓDULO 6 — Financeiro / DRE (`/admin/dre`)

**O que faz:**
- Lançamentos financeiros (receitas e despesas)
- Fechamento mensal
- DRE (Demonstrativo de Resultado do Exercício)
- Controle de empréstimos
- Relatórios por competência

**Modelos de banco:**
```prisma
model LancamentoFinanceiro {
  id          Int      @id @default(autoincrement())
  data        DateTime
  competencia String   // "2025-06"
  tipo        String   // "RECEITA" | "DESPESA"
  grupo       String
  categoria   String
  valor       Float
  observacao  String?
  createdAt   DateTime @default(now())
}

model FechamentoFinanceiro {
  id                   Int      @id @default(autoincrement())
  competencia          String   @unique
  fechadoEm            DateTime
  receitaAtacado       Float
  receitaSite          Float
  receitaTotal         Float
  cmv                  Float
  estoque              Float
  contasReceber        Float
  totalDespesas        Float
  saldoBancario        Float
  resultadoOperacional Float
  despesasPorCategoria String   @db.Text
  createdAt            DateTime @default(now())
}

model Emprestimo {
  id            Int      @id @default(autoincrement())
  banco         String
  valorRecebido Float
  valorParcela  Float
  totalParcelas Int
  parcelasPagas Int      @default(0)
  dataInicio    DateTime
  observacao    String?
  status        String   @default("ativo")
  createdAt     DateTime @default(now())
}
```

---

### MÓDULO 7 — Configurações do Site (`/admin/configurar`)

**O que faz:**
- Gerencia links sociais (Instagram, Facebook, TikTok, WhatsApp, X)
- Persiste no PostgreSQL (tabela `mourato_config`, coluna JSONB)
- Fallback para arquivo local `.data/site-config.json` em desenvolvimento
- Cache em memória (`globalThis`) para evitar queries repetidas

**Tabela de configuração (não Prisma — criada via SQL direto):**
```sql
CREATE TABLE IF NOT EXISTS mourato_config (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Registro: id = "social_links", data = { instagram, facebook, tiktok, whatsapp, x, siteUrl }
```

---

## Regras de Implementação

### Visual
- Tema público: luxury dark — fundo `#0A0A0A`, texto `#F5F0E8`, dourado `#C9A84C`
- Tema admin/lojista: light — fundo `stone-50`, texto `stone-800`
- **Mobile-first obrigatório**: implementar para 375px primeiro, depois `sm:`, `md:`, `lg:`
- Nunca usar tamanhos fixos em px que quebrem em mobile

### Código
- Todas as mutations são Server Actions (`"use server"`)
- Proteção de rotas: verificar sessão no topo do Server Component, redirect se null
- Variáveis de ambiente: nunca hardcodar, sempre usar `process.env`
- Aplicar `.trim()` em todas as env vars de tokens/credenciais
- Anti-duplicação em todas as ações de criação de pedido (janela de 30s)

### Banco
- ORM: Prisma 7 com PostgreSQL (Neon)
- Migrations via `npx prisma migrate dev`
- Cliente singleton em `lib/prisma.ts`

### Autenticação
- JWT sem biblioteca externa — usar `crypto.subtle` (Web Crypto API)
- Cookies httpOnly, secure em produção, sameSite: "lax"
- Dois cookies separados: `admin_session` e `lojista_session`

---

## Ordem de Implementação Recomendada (Modular)

```
Fase 1 — Base
  ├── Módulo 2: Autenticação (base de tudo)
  └── Módulo 1: Catálogo Público (core do negócio)

Fase 2 — Gestão
  ├── Módulo 3: Painel Admin
  └── Módulo 4: Área do Lojista

Fase 3 — Expansão
  ├── Módulo 5: Rifas
  └── Módulo 6: Financeiro

Fase 4 — Configuração
  └── Módulo 7: Configurações do Site
```

Cada módulo pode ser desenvolvido e deployado independentemente. Os módulos 3 e 4 dependem do módulo 2 (auth). O módulo 1 é independente (não requer login).

---

## Variáveis de Ambiente Completas

```env
# Banco
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Auth
JWT_SECRET=sua-chave-secreta-minimo-32-chars

# Pagamentos
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...

# Site
NEXT_PUBLIC_SITE_URL=https://seudominio.com.br

# Notificações (CallMeBot WhatsApp)
CALLMEBOT_PHONE=5511999999999
CALLMEBOT_APIKEY=0000000
```

---

## Fluxo Git / Deploy

- Branch `main` → deploy automático na Vercel
- Commits semânticos: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`
- Antes de features grandes: criar tag de rollback
  ```bash
  git tag -a v1.x-pre-feature -m "Rollback: antes de [descrição]"
  git push origin v1.x-pre-feature
  ```
- Rollback:
  ```bash
  git reset --hard v1.x-pre-feature
  git push origin main --force
  ```

---

## Observações Importantes

1. **Dois assistentes** trabalham neste projeto (Amazon Q e Antigravity). Sempre fazer `git pull origin main` antes de qualquer trabalho.
2. **Imagens de produtos**: armazenadas em `/public/marketing/` como `.webp`. URLs no banco são relativas (`/marketing/nome.webp`). Evitar base64 no banco — causa degradação de performance.
3. **ISR**: `/produtos` usa `export const revalidate = 60` (cache de 60s). Não usar `force-dynamic` nesta rota.
4. **Webhook MP**: recebe tanto pagamentos de produtos (busca por `Ref: XXXXXX` na observação do pedido) quanto pagamentos de rifas (busca por `pixTxid`).
5. **Estoque pessoal do lojista**: é um JSON no campo `estoquePessoal` do model Usuario. Não é uma tabela separada.
