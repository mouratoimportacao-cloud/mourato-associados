# Contexto do Projeto — Mourato & Associados

## LEIA ANTES DE QUALQUER AÇÃO

Você é um assistente de desenvolvimento neste projeto. Antes de fazer QUALQUER modificação,
você DEVE seguir o fluxo abaixo rigorosamente. Não pule etapas.

---

## Dados do Projeto

- **Repo:** https://github.com/mouratoimportacao-cloud/mourato-associados
- **Branch produção:** main
- **Deploy:** Vercel (https://mouratoassociados.com.br) — deploy automático via push na main
- **Banco:** PostgreSQL Neon (sa-east-1) — tabela única `mourato_store` (JSONB)
- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **ORM:** Fake Prisma (lib/prisma.ts) — simula Prisma API mas persiste em JSONB no Postgres

---

## Arquitetura de Autenticação

- **JWT customizado** (lib/jwt.ts) — sem dependência externa, usa crypto.subtle
- **bcryptjs** para hash de senhas
- **Cookies separados:**
  - `admin_session` → acesso admin (/admin/*)
  - `lojista_session` → acesso lojista (/lojista/painel)
- **Login unificado:** rota `/login` com função `loginUnificado()` em lib/auth.ts
  - Detecta tipo do usuário (admin/lojista) automaticamente
  - Seta o cookie correto conforme o tipo
  - Redireciona: admin → /admin | lojista → /lojista/painel
- **Rotas antigas** `/admin/login` e `/lojista` redirecionam para `/login`
- **Funções principais em lib/auth.ts:**
  - `loginUnificado()` — login único (USAR ESTE)
  - `loginAdmin()` — legado, ainda funciona
  - `loginLojista()` — legado, ainda funciona
  - `getAdminSession()` — verifica sessão admin
  - `getLojistaSession()` — verifica sessão lojista
  - `logoutAdmin()` / `logoutLojista()` — destroi cookies

### Credenciais de Teste
- Admin: mourato@mourato.mi / admin123
- Lojista: mourato.importacao2@gmail.com / Jota1307

---

## Estrutura de Arquivos Críticos

```
lib/
├── auth.ts          # Autenticação (loginUnificado, sessions, logout)
├── jwt.ts           # Sign/Verify JWT (HS256, crypto.subtle)
├── prisma.ts        # ORM fake → persiste em mourato_store (Postgres JSONB)
└── site-config.ts   # Config social/links

app/
├── login/page.tsx        # Login unificado (ENTRY POINT)
├── admin/                # Painel admin (protegido)
├── lojista/painel/       # Painel lojista (protegido)
├── components/Navbar.tsx # Botão "Entrar" → /login
└── api/                  # Endpoints REST
```

---

## ⚠️ FLUXO OBRIGATÓRIO ANTES DE QUALQUER MUDANÇA

### 1. PULL — Pegar última versão
```bash
git pull origin main
```
SEMPRE faça pull antes de começar. O projeto tem outro assistente (Amazon Q) que também faz commits.

### 2. ENTENDER — Ler antes de alterar
- Leia os arquivos que vai modificar
- Entenda as dependências
- Verifique se não conflita com funcionalidades existentes
- Consulte este documento para entender o fluxo de auth e banco

### 3. ROLLBACK POINT — Criar tag de segurança
Antes de features novas ou mudanças grandes:
```bash
git tag -a v[VERSAO]-pre-[FEATURE] -m "Rollback: antes de [descrição]"
git push origin v[VERSAO]-pre-[FEATURE]
```
Exemplo: `v1.2-pre-busca-dropdown`

### 4. IMPLEMENTAR — Desenvolver em local
- Faça as mudanças
- Teste TUDO em `http://localhost:3000` com `npm run dev`
- Teste ambos os logins (admin + lojista)
- Verifique que o build passa: `npx next build`

### 5. VALIDAR — Checklist antes do push
- [ ] `npm run dev` funciona sem erros
- [ ] Login admin funciona em /login
- [ ] Login lojista funciona em /login
- [ ] Nenhuma rota quebrou
- [ ] `npx next build` compila sem erros
- [ ] Mudanças fazem sentido visualmente (se UI)

### 6. COMMIT + PUSH — Enviar para produção
```bash
git add -A
git commit -m "tipo: descrição curta"
git push origin main
```
Tipos: feat, fix, refactor, style, docs

### 7. VERIFICAR DEPLOY
- Vercel faz deploy automático ao receber push na main
- Verificar em https://mouratoassociados.com.br após ~2 minutos
- Se algo quebrar: `git reset --hard v[TAG_ROLLBACK] && git push origin main --force`

---

## Comandos de Rollback

```bash
# Ver tags disponíveis
git tag -l

# Rollback para tag específica
git reset --hard v1.1-pre-login-unificado
git push origin main --force

# Rollback último commit
git reset --hard HEAD~1
git push origin main --force
```

---

## Regras de Código

1. **Não remover código existente** sem confirmação explícita do usuário
2. **Não criar testes** a menos que pedido
3. **Respeitar o tema visual:** luxury black + gold (Tailwind classes: bg-luxury-black, text-luxury-gold, etc.)
4. **lib/prisma.ts é um ORM customizado** — NÃO tente rodar `npx prisma migrate` ou similar
5. **Banco é JSONB única tabela** — não crie schemas Prisma, não rode migrations
6. **Variáveis de ambiente:** MOURATO_DATABASE_URL ou POSTGRES_URL (PostgreSQL Neon)
7. **Não expor credenciais** em commits — usar variáveis de ambiente
8. **Server Actions** usam "use server" no topo (lib/auth.ts, actions.ts)
9. **PWA:** manifest.json na raiz do public/

---

## Deploy Stack

| Serviço | Função |
|---------|--------|
| GitHub | Repositório + CI |
| Vercel | Hosting + Deploy automático |
| Neon PostgreSQL | Banco (sa-east-1) |
| Vercel Env Vars | Secrets (JWT_SECRET, DATABASE_URL, etc.) |

---

## Tags de Rollback Existentes

| Tag | Descrição |
|-----|-----------|
| v1.0-stable | Estado estável base |
| v1.1-pre-login-unificado | Antes do login unificado |

---

## IMPORTANTE

- Este projeto é gerido por DOIS assistentes: Amazon Q e você (Antigravity)
- Sempre faça `git pull origin main` antes de trabalhar
- Nunca assuma que você tem a versão mais recente
- Se tiver conflito, PARE e pergunte ao usuário
- O usuário testa em LOCAL antes de aprovar o push
