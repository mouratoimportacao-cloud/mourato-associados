import { prisma } from "../../lib/prisma";
import { OwnerType, EntryType, EntrySource, EntryStatus } from "@prisma/client";

/**
 * Generate a DRE (Demonstrativo de Resultado do Exercício) for a given owner.
 * Aggregates revenues, expenses, receivables, payables, and stock value.
 */
export async function generateDRE(params: { ownerType: OwnerType; ownerId?: number }) {
  const { ownerType, ownerId } = params;

  // Base filter for financial entries
  const where: any = { ownerType };
  if (ownerId !== undefined) where.ownerId = ownerId;

  const entries = await prisma.financialEntry.findMany({ where });

  const totalRevenue = entries
    .filter((e) => e.type === "RECEITA" || e.type === "RECEBIMENTO")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpense = entries
    .filter((e) => e.type === "DESPESA" || e.type === "PAGAMENTO")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalReceivable = entries
    .filter((e) => e.type === "CONTA_A_RECEBER")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPayable = entries
    .filter((e) => e.type === "CONTA_A_PAGAR")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Stock valuation – sum of quantity * cost for supplier or retailer
  let stockValue = 0;
  if (ownerType === "FORNECEDOR" || ownerType === "ADMIN") {
    const stocks = await prisma.supplierStock.findMany();
    stockValue = stocks.reduce((sum, s) => sum + s.quantity * Number(s.cost), 0);
  } else if (ownerType === "LOJISTA") {
    if (ownerId === undefined) throw new Error("ownerId required for lojista DRE");
    const stocks = await prisma.retailerStock.findMany({ where: { retailerId: ownerId } });
    stockValue = stocks.reduce((sum, s) => sum + s.quantity * Number(s.cost), 0);
  }

  const result = totalRevenue - totalExpense;

  return {
    totalRevenue,
    totalExpense,
    totalReceivable,
    totalPayable,
    stockValue,
    result,
  };
}
