-- CreateMigration for expand_pedido_usuario_schema

-- AlterTable Pedido
ALTER TABLE "Pedido" ADD COLUMN "produtoId" INTEGER,
ADD COLUMN "produtoNome" TEXT,
ADD COLUMN "quantidade" INTEGER,
ADD COLUMN "precoUnitario" DOUBLE PRECISION,
ADD COLUMN "precoTabela" DOUBLE PRECISION,
ADD COLUMN "custoUnitario" DOUBLE PRECISION,
ADD COLUMN "descontoConcedido" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "lucroBruto" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "tipoFluxo" TEXT,
ADD COLUMN "quantidadePagaFornecedor" INTEGER,
ADD COLUMN "totalPagoFornecedor" DOUBLE PRECISION,
ADD COLUMN "saldoFornecedor" DOUBLE PRECISION,
ADD COLUMN "pagamento" TEXT,
ADD COLUMN "observacao" TEXT;

-- AlterTable Usuario
ALTER TABLE "Usuario" ADD COLUMN "documento" TEXT,
ADD COLUMN "telefone" TEXT,
ADD COLUMN "endereco" TEXT,
ADD COLUMN "cidade" TEXT,
ADD COLUMN "estado" TEXT,
ADD COLUMN "cep" TEXT,
ADD COLUMN "status" TEXT DEFAULT 'pendente',
ADD COLUMN "codigoRevenda" TEXT,
ADD COLUMN "estoquePessoal" TEXT;
