# Mourato & Associados

Plataforma de venda de perfumes, cosméticos e skincare com área de revendedores (lojistas).

**URL:** https://mouratoassociados.com.br

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS 4
- **Banco de Dados:** PostgreSQL (Neon) via `pg`
- **ORM/Schema:** Prisma 7 (migrações)
- **Autenticação:** JWT + bcryptjs
- **Validação:** Zod + React Hook Form
- **Deploy:** Vercel
- **PWA:** manifest.json + instalador customizado

## Estrutura do Projeto

```
app/
├── produtos/        # Catálogo público de perfumes
├── admin/           # Painel administrativo (protegido por JWT)
│   ├── produtos/    # CRUD de produtos
│   ├── pedidos/     # Gestão de pedidos
│   ├── lojistas/    # Gestão de revendedores
│   ├── radar/       # Monitoramento
│   └── configurar/  # Configurações do site
├── lojista/         # Área do revendedor (login + painel)
├── r/[codigo]/      # Links de referência para lojistas
└── components/      # Navbar, Footer, PWA
lib/
├── auth.ts          # Helpers de autenticação
├── jwt.ts           # Verificação/criação de tokens
├── prisma.ts        # Cliente Prisma
└── site-config.ts   # Configuração social/links (Postgres)
prisma/
└── schema.prisma    # Modelos: Usuario, Produto, Pedido, Endereco
```

## Funcionalidades Implementadas

- ✅ Catálogo de produtos com imagens
- ✅ Painel admin com login protegido (middleware)
- ✅ CRUD de produtos (upload de imagem)
- ✅ Sistema de lojistas/revendedores (cadastro, login, painel)
- ✅ Links de referência (`/r/[codigo]`)
- ✅ Configuração de redes sociais (persistida no Postgres)
- ✅ PWA (instalável no celular)
- ✅ SEO (Open Graph, Twitter Cards)

## Getting Started

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.local.example .env.local
# Preencher DATABASE_URL com conexão PostgreSQL

# Rodar migrações
npx prisma migrate dev

# Criar admin inicial
npx tsx scripts/setup-admin.ts

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse http://localhost:3000

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint |

## Deploy

O projeto é deployado automaticamente na Vercel. O banco PostgreSQL é hospedado na Neon.

## Roadmap

Consulte [projeto/ROADMAP.md](projeto/ROADMAP.md) para o planejamento completo de fases.
