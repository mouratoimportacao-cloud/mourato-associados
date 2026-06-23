type PedidoFinanceiro = Record<string, any>;
type ProdutoFinanceiro = Record<string, any>;
type LancamentoFinanceiro = Record<string, any>;

export function competenciaAtual(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function normalizarCompetencia(value?: string | null) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""))
    ? String(value)
    : competenciaAtual();
}

export function intervaloCompetencia(competencia: string) {
  const [ano, mes] = competencia.split("-").map(Number);
  return {
    inicio: new Date(ano, mes - 1, 1, 0, 0, 0, 0),
    fim: new Date(ano, mes, 1, 0, 0, 0, 0),
  };
}

function dentroDoPeriodo(value: unknown, inicio: Date, fim: Date) {
  const date = new Date(String(value || ""));
  return Number.isFinite(date.getTime()) && date >= inicio && date < fim;
}

function custoUnitario(produto?: ProdutoFinanceiro | null, pedido?: PedidoFinanceiro) {
  const custoReal =
    Number(produto?.custoDolar || 0) * Number(produto?.cotacaoDolar || 0);
  const precoBase = Number(
    pedido?.precoUnitario || produto?.precoAtacado || 0
  );
  return custoReal || precoBase * 0.6;
}

export function calcularFinanceiro({
  produtos,
  pedidos,
  lancamentos,
  competencia,
}: {
  produtos: ProdutoFinanceiro[];
  pedidos: PedidoFinanceiro[];
  lancamentos: LancamentoFinanceiro[];
  competencia: string;
}) {
  const { inicio, fim } = intervaloCompetencia(competencia);
  const produtoMap = new Map(produtos.map((produto) => [produto.id, produto]));
  const pedidosValidos = pedidos.filter(
    (pedido) => !["cancelado", "rejeitado"].includes(String(pedido.status || ""))
  );

  const comprasAtacado = pedidosValidos.filter(
    (pedido) =>
      String(pedido.tipoFluxo || "") === "compra_fornecedor" ||
      String(pedido.pagamento || "").includes("Pedido ao fornecedor") ||
      String(pedido.pagamento || "").includes("Compra do fornecedor")
  );
  const vendasSite = pedidosValidos.filter(
    (pedido) =>
      String(pedido.tipoFluxo || "") === "intencao_site" &&
      ["pago", "enviado", "entregue"].includes(String(pedido.status || ""))
  );

  const atacadoPeriodo = comprasAtacado.filter((pedido) =>
    dentroDoPeriodo(pedido.createdAt, inicio, fim)
  );
  const sitePeriodo = vendasSite.filter((pedido) =>
    dentroDoPeriodo(pedido.createdAt, inicio, fim)
  );

  const receitaAtacado = atacadoPeriodo.reduce(
    (total, pedido) =>
      total +
      Number(
        pedido.totalPagoFornecedor ??
          (["pago", "enviado", "entregue"].includes(String(pedido.status || ""))
            ? pedido.total
            : 0)
      ),
    0
  );
  const receitaSite = sitePeriodo.reduce(
    (total, pedido) => total + Number(pedido.total || 0),
    0
  );
  const receitaTotal = receitaAtacado + receitaSite;

  const cmvAtacado = atacadoPeriodo.reduce((total, pedido) => {
    const produto = pedido.produtoId ? produtoMap.get(pedido.produtoId) : null;
    const quantidadeConfirmada = Number(
      pedido.quantidadePagaFornecedor ??
        (["pago", "enviado", "entregue"].includes(String(pedido.status || ""))
          ? pedido.quantidade
          : 0)
    );
    return total + custoUnitario(produto, pedido) * quantidadeConfirmada;
  }, 0);
  const cmvSite = sitePeriodo.reduce((total, pedido) => {
    const produto = pedido.produtoId ? produtoMap.get(pedido.produtoId) : null;
    return (
      total +
      custoUnitario(produto, pedido) * Number(pedido.quantidade || 1)
    );
  }, 0);
  const cmv = cmvAtacado + cmvSite;

  const estoque = produtos.reduce(
    (total, produto) =>
      total + custoUnitario(produto) * Number(produto.estoque || 0),
    0
  );
  const contasReceber = comprasAtacado.reduce(
    (total, pedido) => total + Math.max(0, Number(pedido.saldoFornecedor || 0)),
    0
  );

  const despesasPeriodo = lancamentos
    .filter(
      (lancamento) =>
        lancamento.tipo === "despesa" &&
        String(lancamento.competencia) === competencia
    )
    .sort(
      (a, b) =>
        new Date(String(b.data)).getTime() - new Date(String(a.data)).getTime()
    );
  const despesasPorCategoria = despesasPeriodo.reduce(
    (totais: Record<string, number>, lancamento) => {
      const categoria = String(lancamento.categoria || "Outros");
      totais[categoria] =
        Number(totais[categoria] || 0) + Number(lancamento.valor || 0);
      return totais;
    },
    {}
  );
  const totalDespesas = despesasPeriodo.reduce(
    (total, lancamento) => total + Number(lancamento.valor || 0),
    0
  );
  const resultadoOperacional = receitaTotal - cmv - totalDespesas;

  const receitasAteFim =
    comprasAtacado
      .filter((pedido) => new Date(pedido.createdAt) < fim)
      .reduce(
        (total, pedido) =>
          total +
          Number(
            pedido.totalPagoFornecedor ??
              (["pago", "enviado", "entregue"].includes(
                String(pedido.status || "")
              )
                ? pedido.total
                : 0)
          ),
        0
      ) +
    vendasSite
      .filter((pedido) => new Date(pedido.createdAt) < fim)
      .reduce((total, pedido) => total + Number(pedido.total || 0), 0);
  const despesasAteFim = lancamentos
    .filter(
      (lancamento) =>
        lancamento.tipo === "despesa" && new Date(lancamento.data) < fim
    )
    .reduce((total, lancamento) => total + Number(lancamento.valor || 0), 0);
  const saldoBancario = receitasAteFim - despesasAteFim;

  return {
    receitaAtacado,
    receitaSite,
    receitaTotal,
    cmv,
    estoque,
    contasReceber,
    despesasPeriodo,
    despesasPorCategoria,
    totalDespesas,
    saldoBancario,
    resultadoOperacional,
  };
}
