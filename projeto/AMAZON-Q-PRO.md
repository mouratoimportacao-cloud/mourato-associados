# Como Assinar o Amazon Q Developer Pro

## O que é

Amazon Q Developer Pro é o plano pago do assistente de IA da AWS para desenvolvedores.
Inclui chat ilimitado, geração de código, revisão, transformação de código e agentes autônomos.

- **Preço**: USD 19/mês por usuário
- **Free Tier**: 50 interações/mês (plano gratuito)

---

## Pré-requisitos

- Conta AWS ativa (já temos: `566167302262`)
- Acesso ao Console AWS com permissão de billing
- Cartão de crédito cadastrado na conta AWS

---

## Passo a Passo

### 1. Acessar o Console AWS

Acesse: https://console.aws.amazon.com

Login como **root** (e-mail + senha) ou como IAM user com permissão de billing.

> ⚠️ O usuário `Hesuel` pode não ter permissão de billing. Se der erro, use o login root.

---

### 2. Ir para o Amazon Q Developer

Acesse diretamente: https://aws.amazon.com/q/developer/

Clique em **"Get started with Q Developer"** ou **"Try Q Developer Pro"**.

---

### 3. Criar um Amazon Q Developer Profile (Builder ID ou IAM Identity Center)

Você vai precisar escolher entre:

**Opção A — AWS Builder ID** (mais simples, independente da conta AWS)
- Crie uma conta gratuita em: https://profile.aws.amazon.com
- Use seu e-mail pessoal ou profissional
- Não precisa de conta AWS para criar, mas a assinatura Pro é vinculada à conta AWS

**Opção B — IAM Identity Center** (para times/empresas)
- Requer configurar o IAM Identity Center na conta AWS
- Mais complexo, indicado para múltiplos usuários

> Para uso individual, use a **Opção A (Builder ID)**.

---

### 4. Assinar o Plano Pro

1. Acesse: https://console.aws.amazon.com/amazonq/home
2. No menu lateral, clique em **"Subscription"** ou **"Upgrade to Pro"**
3. Selecione **"Amazon Q Developer Pro"**
4. Confirme o número de usuários (1 para uso individual)
5. Revise o valor: **USD 19,00/mês**
6. Clique em **"Subscribe"**
7. Confirme o pagamento com o cartão cadastrado na conta AWS

---

### 5. Ativar no IDE (VS Code / JetBrains)

Após assinar:

1. Abra o VS Code
2. No painel do **Amazon Q** (ícone na barra lateral)
3. Clique em **"Sign in"**
4. Escolha **"Use with Pro license"**
5. Faça login com o **AWS Builder ID** ou **IAM Identity Center**
6. Autorize o acesso
7. O status deve mudar para **"Amazon Q Developer Pro"**

---

### 6. Verificar Ativação

No VS Code, o painel do Amazon Q deve mostrar:
- ✅ **Amazon Q Developer Pro** no rodapé ou header do chat
- Chat sem limite de mensagens
- Acesso a `/dev`, `/test`, `/docs`, `/review` (agentes autônomos)

---

## Gerenciar Assinatura

- **Ver cobrança**: Console AWS → Billing → Bills
- **Cancelar**: Console AWS → Amazon Q → Subscription → Cancel
- **Adicionar usuários**: Console AWS → Amazon Q → Subscription → Manage users

---

## Links Úteis

| Recurso | URL |
|---------|-----|
| Página oficial | https://aws.amazon.com/q/developer/ |
| Console Amazon Q | https://console.aws.amazon.com/amazonq/home |
| AWS Builder ID | https://profile.aws.amazon.com |
| Preços | https://aws.amazon.com/q/developer/pricing/ |
| Documentação | https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/ |

---

## Observações

- A cobrança é em **USD** e aparece na fatura da conta AWS (`566167302262`)
- O plano é mensal sem fidelidade — pode cancelar a qualquer momento
- O Free Tier continua disponível para outros usuários da mesma conta que não assinarem o Pro
