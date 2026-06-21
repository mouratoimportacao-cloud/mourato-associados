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
  descontoPercentual,
  precoAtual,
}: {
  precoTabela: number;
  custoUnitario: number;
  quantidade: number;
  descontoPercentual: number;
  precoAtual: number;
}) {
  const descontoSeguro = Math.max(0, Math.min(90, Number(descontoPercentual || 0)));
  const precoComDesconto =
    descontoSeguro > 0
      ? precoTabela * (1 - descontoSeguro / 100)
      : Number(precoAtual || precoTabela || 0);
  const precoFinal = Math.max(custoUnitario, precoComDesconto);
  const total = precoFinal * quantidade;

  return {
    precoFinal,
    total,
    descontoConcedido: Math.max(0, (precoTabela - precoFinal) * quantidade),
    lucroBruto: total - custoUnitario * quantidade,
  };
}
