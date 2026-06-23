CREATE TABLE IF NOT EXISTS "LancamentoFinanceiro" (
  "id" SERIAL PRIMARY KEY,
  "data" TIMESTAMP(3) NOT NULL,
  "competencia" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "grupo" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "valor" DOUBLE PRECISION NOT NULL,
  "observacao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LancamentoFinanceiro_competencia_idx"
  ON "LancamentoFinanceiro"("competencia");

CREATE TABLE IF NOT EXISTS "FechamentoFinanceiro" (
  "id" SERIAL PRIMARY KEY,
  "competencia" TEXT NOT NULL UNIQUE,
  "fechadoEm" TIMESTAMP(3) NOT NULL,
  "receitaAtacado" DOUBLE PRECISION NOT NULL,
  "receitaSite" DOUBLE PRECISION NOT NULL,
  "receitaTotal" DOUBLE PRECISION NOT NULL,
  "cmv" DOUBLE PRECISION NOT NULL,
  "estoque" DOUBLE PRECISION NOT NULL,
  "contasReceber" DOUBLE PRECISION NOT NULL,
  "totalDespesas" DOUBLE PRECISION NOT NULL,
  "saldoBancario" DOUBLE PRECISION NOT NULL,
  "resultadoOperacional" DOUBLE PRECISION NOT NULL,
  "despesasPorCategoria" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
