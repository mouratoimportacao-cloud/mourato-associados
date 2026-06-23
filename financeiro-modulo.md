# Módulo Financeiro

## Objetivo
Substituir a apresentação do DRE por uma tela Financeiro branca, sem alterar vendas, pedidos, estoque, pagamentos ou CMV existentes.

## Tarefas
- [x] Adicionar armazenamento isolado para lançamentos e fechamentos.
- [x] Criar despesas manuais com categoria livre e categorias sugeridas.
- [x] Ler receitas, CMV, estoque e contas a receber dos dados existentes.
- [x] Agrupar despesas por categoria e mês.
- [x] Fechar o mês com snapshot imutável e histórico.
- [x] Atualizar os menus para o nome Financeiro.
- [x] Validar lint, build e persistência.

## Regras
- Lançamentos financeiros não modificam pedidos, produtos, usuários ou pagamentos.
- Estoque e CMV são somente leitura.
- Um mês fechado não pode receber novas despesas nem ser fechado novamente.
