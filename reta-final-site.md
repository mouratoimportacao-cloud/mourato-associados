# Reta final do site

## Objetivo
Deixar o catálogo pronto para operar, rápido, sem conteúdo duplicado e preparado para receber o Mercado Pago.

## Tarefas
- [x] Corrigir erros de lint e avisos de API descontinuada do Next.js.
- [x] Manter descrições e informações olfativas somente na consulta do produto.
- [x] Exibir apenas uma foto na consulta e remover galeria artificial.
- [x] Otimizar imagens com Next Image e manter arquivos locais em WebP.
- [x] Simplificar catálogo e vitrine para reduzir renderizações e imagens duplicadas.
- [x] Deixar o checkout atual claramente preparado para futura ativação do Mercado Pago.
- [x] Validar lint, build e navegação no navegador.
- [x] Criar commit e enviar ao GitHub.

## Concluído quando
- [x] O site compila sem erros, as páginas principais funcionam e as alterações estão no repositório remoto.

## Correções críticas de operação
- [x] Pedido de estoque baixa o fornecedor e grava pedido/dívida em uma única transação.
- [x] Pagamentos parciais amortizam pedidos ativos corretamente (`notIn` corrigido).
- [x] Novas compras não reapresentam valores já pagos em pedidos anteriores.
- [x] Pedido do QR fica sob decisão exclusiva do lojista, com aprovação ou rejeição real.
- [x] Aprovação do QR baixa apenas o estoque pessoal e registra desconto, custo e lucro no DRE.
- [x] Catálogo do QR mostra somente produtos disponíveis no estoque pessoal do lojista.
- [x] Imagens de planilha aceitam URL, Google Drive, Dropbox, caminho local e nome de arquivo público.
- [x] Vitrine e cache operacional atualizam em até 1 segundo.
