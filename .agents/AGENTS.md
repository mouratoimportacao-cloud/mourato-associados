# Projeto Mourato Associados — Regras e Fluxo de Negócios

## ⚠️ REGRA CRÍTICA: Proteção do Fluxo de Negócios

**Qualquer alteração no fluxo de negócios descrito abaixo REQUER autorização explícita do usuário com a senha "1307".**

### O que está PERMITIDO sem senha:
- Alterações estéticas (CSS, cores, layouts, tipografia)
- Melhorias de UX (labels, textos, organização visual de grupos)
- Adição de colunas/badges informativos sem alterar dados
- Otimizações de performance que não mudam comportamento
- Correção de bugs puramente visuais
- Alterações estéticas em botões (cores, tamanho, ícones)

### O que REQUER senha "1307":
- Qualquer mudança em Server Actions que gravem no banco
- Mudança nas regras de quem pode ver/alterar o quê
- Alteração no schema do Prisma
- Mudança na lógica de separação de estoques
- Qualquer alteração que impacte dados financeiros
- Qualquer item das TAREFAS abaixo

**Em caso de dúvida, pergunte antes de alterar.**

---

## Contexto e Objetivo

Você está trabalhando no projeto Mourato Associados.

Objetivo: corrigir e implementar o fluxo real de estoque, financeiro e DRE.

## REGRA CENTRAL:
1. Venda pública do site pertence ao FORNECEDOR/ADMIN.
2. Lojista vende somente pelo QR Code.
3. Venda por QR Code pertence ao LOJISTA dono do QR.
4. Estoque do fornecedor e estoque do lojista são separados.
5. Financeiro do fornecedor e financeiro do lojista são separados.
6. O sistema é multi-lojistas, então tudo do lojista deve usar lojistaId.

## CENÁRIO DE TESTE OBRIGATÓRIO:

Fornecedor começa com 100 perfumes.

Fornecedor vende 50 perfumes para o lojista:
- custo unitário para lojista: R$ 4
- total da compra: R$ 200
- lojista paga R$ 100 à vista
- lojista fica devendo R$ 100 para o próximo mês

Fornecedor também vende no site público:
- 10 perfumes
- preço unitário: R$ 100
- total: R$ 1.000
- valor entra direto no banco do fornecedor

Lojista vende pelo QR Code:
- vende 50 perfumes
- preço unitário: R$ 100
- total: R$ 5.000
- valor entra no banco do lojista

## RESULTADO ESPERADO DO MÊS:

**FORNECEDOR:**
- estoque inicial: 100
- saída para lojista: 50
- saída venda pública: 10
- estoque final: 40
- banco recebe: R$ 100 do lojista + R$ 1.000 da venda pública = R$ 1.100
- contas a receber do lojista: R$ 100

**LOJISTA:**
- estoque recebido: 50
- estoque vendido QR: 50
- estoque final: 0
- banco recebe QR: R$ 5.000
- paga fornecedor: R$ 100
- caixa líquido do mês: R$ 4.900
- contas a pagar ao fornecedor: R$ 100

---

## TAREFA 1 — LOCALIZAR ARQUIVOS:
Antes de alterar, procure no projeto por arquivos relacionados a:
- produtos, estoque, lojista, fornecedor, pedidos, carrinho, checkout, QR Code, financeiro, DRE, admin, banco, contas a pagar, contas a receber

Use buscas por termos: stock, estoque, inventory, lojista, seller, fornecedor, supplier, order, pedido, checkout, cart, qr, qrcode, public, financeiro, dre, payment, pagamento, payable, receivable, ledger

## TAREFA 2 — MAPEAR O FLUXO ATUAL:
Antes de implementar, explique:
- onde a venda pública está sendo registrada
- onde a venda QR está sendo registrada
- onde o estoque é baixado
- se hoje existe separação entre estoque do fornecedor e estoque do lojista
- se existe financeiro separado por lojistaId
- se existe conta a pagar e conta a receber
- onde o DRE é calculado

## TAREFA 3 — MODELO DE DADOS NECESSÁRIO:
Garanta que o sistema consiga representar, mesmo que adaptando os nomes existentes:

**SupplierStock / estoqueFornecedor:** productId, quantity, cost, updatedAt

**RetailerStock / estoqueLojista:** lojistaId, productId, quantity, cost, updatedAt

**RetailerPurchase / compraLojista:** id, lojistaId, fornecedorId, status, totalAmount, paidAmount, openAmount, stockTransferred, createdAt, updatedAt

**RetailerPurchaseItem:** purchaseId, productId, quantity, unitCost, totalCost

**FinancialEntry / lancamentoFinanceiro:** id, ownerType (ADMIN|FORNECEDOR|LOJISTA), ownerId, lojistaId (opcional), type (RECEITA|DESPESA|RECEBIMENTO|PAGAMENTO|CONTA_A_RECEBER|CONTA_A_PAGAR|ESTORNO), source (PUBLIC_SALE|QR_SALE|RETAILER_PURCHASE|RETAILER_PAYMENT|REFUND|ADJUSTMENT), amount, status (PAGO|EM_ABERTO|CANCELADO), referenceId, description, createdAt

**PublicOrder / pedidoPublico:** id, productId, quantity, unitPrice, total, paymentStatus, ownerType=FORNECEDOR/ADMIN

**QrOrder / pedidoQr:** id, lojistaId (obrigatório), productId, quantity, unitPrice, total, paymentStatus

Caso o projeto já tenha modelos equivalentes, não duplicar sem necessidade. Adaptar aos modelos existentes.

## TAREFA 4 — REGRA DA COMPRA DO LOJISTA:
Quando o lojista comprar do fornecedor (ex: 50 un × R$ 4 = R$ 200):

Ao criar a compra:
- criar compra do lojista
- totalAmount = 200, paidAmount = 0 ou valor informado, openAmount = totalAmount - paidAmount, stockTransferred = false

Quando validada (AGUARDANDO_PAGAMENTO / PAGO / ENVIADO / ENTREGUE), se stockTransferred = false:
1. baixar 50 un do estoque do fornecedor
2. creditar 50 un no estoque do lojista
3. criar conta a receber do fornecedor
4. criar conta a pagar do lojista
5. marcar stockTransferred = true

**IMPORTANTE:** Não duplicar estoque se o status mudar várias vezes. Usar stockTransferred para impedir baixa dupla.

## TAREFA 5 — PAGAMENTO PARCIAL DO LOJISTA:
Ex: Compra total = R$ 200 / Pagamento = R$ 100 / Aberto = R$ 100

Ao registrar pagamento parcial:
- No fornecedor/admin: banco/caixa +100, contas a receber do lojista -100
- No lojista: banco/caixa -100, contas a pagar ao fornecedor -100
- Atualizar: paidAmount = 100, openAmount = 100, status = parcial/em aberto
- Não quitar automaticamente se openAmount > 0.

## TAREFA 6 — VENDA PÚBLICA DO SITE:
Venda pública pertence ao fornecedor/admin. Ex: 10 un × R$ 100 = R$ 1.000

Ao concluir venda pública paga:
1. baixar 10 un do estoque do fornecedor
2. lançar receita pública de R$ 1.000 no fornecedor/admin
3. lançar entrada no banco/caixa do fornecedor/admin
4. não vincular ao lojista
5. não mexer no estoque do lojista
6. não aparecer no DRE do lojista

## TAREFA 7 — VENDA QR CODE DO LOJISTA:
Venda QR pertence ao lojista. Ex: 50 un × R$ 100 = R$ 5.000

Ao concluir venda QR paga:
1. exigir lojistaId
2. baixar estoque do lojista
3. lançar receita QR no lojista
4. lançar entrada no banco/caixa do lojista
5. não baixar estoque do fornecedor
6. não lançar receita no fornecedor/admin
7. aparecer somente no DRE individual do lojista

## TAREFA 8 — CANCELAMENTO / DEVOLUÇÃO:

Compra lojista cancelada **antes** de transferir estoque: não mexer no estoque, cancelar financeiro.

Compra lojista cancelada **depois** de transferir estoque: devolver estoque ao fornecedor, retirar estoque do lojista, estornar financeiro conforme saldo e pagamentos.

Venda pública cancelada: devolver estoque ao fornecedor, estornar receita/banco do fornecedor.

Venda QR cancelada: devolver estoque ao lojista, estornar receita/banco do lojista.

## TAREFA 9 — DRE:

**DRE Admin/Fornecedor** deve mostrar: vendas públicas, recebimentos de lojistas, contas a receber de lojistas, saldo aberto por lojista, estoque do fornecedor, resultado geral.

**DRE Lojista** deve mostrar: vendas QR do lojista, pagamentos ao fornecedor, contas a pagar ao fornecedor, estoque do lojista, resultado individual do lojista.

Nunca misturar venda pública no DRE do lojista.
Nunca misturar venda QR como receita do fornecedor.

## TAREFA 10 — TESTE FINAL:
Criar ou simular teste com estes números:

Fornecedor: estoque inicial 100 → envia 50 → vende 10 público → estoque final 40 → banco R$ 1.100 → contas a receber R$ 100

Lojista: recebe 50 → vende 50 QR → estoque final 0 → banco líquido R$ 4.900 → contas a pagar R$ 100

Ao final, responder: arquivos alterados, funções criadas/alteradas, como ficou o fluxo, resultado do teste com os valores acima, pontos pendentes.

---

## RESTRIÇÕES ABSOLUTAS:
- Preserve o layout atual.
- Não mexa em design sem necessidade.
- Não remova funcionalidades existentes.
- Não invente venda pública para lojista.
- Não permita QR Code sem lojistaId.
- Não permita baixa dupla de estoque.
- Não permita pagamento parcial quitar compra inteira.
