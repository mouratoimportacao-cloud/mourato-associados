export function calcularSaldoFornecedor(
  totalPedido: number,
  totalPagoFornecedor: number | null | undefined
) {
  return Math.max(0, Number(totalPedido || 0) - Number(totalPagoFornecedor || 0));
}

export function calcularVendaComDesconto({
  precoTabela,
  custoUnitario,
  quantidade,
  descontoValor,
  precoAtual,
}: {
  precoTabela: number;
  custoUnitario: number;
  quantidade: number;
  descontoValor: number;
  precoAtual: number;
}) {
  const valorDescontoSeguro = Math.max(0, Number(descontoValor || 0));
  const unitDiscount = valorDescontoSeguro / quantidade;
  const precoComDesconto = precoAtual - unitDiscount;
  const precoFinal = Math.max(custoUnitario, precoComDesconto);
  const total = precoFinal * quantidade;

  return {
    precoFinal,
    total,
    descontoConcedido: Math.max(0, (precoTabela - precoFinal) * quantidade),
    lucroBruto: total - custoUnitario * quantidade,
  };
}
