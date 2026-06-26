import { prisma } from "../prisma";
import { Decimal } from "@prisma/client";
import { Prisma } from "@prisma/client";

/**
 * Helper to create a financial entry.
 */
export async function createFinancialEntry(params: {
  ownerType: Prisma.OwnerType;
  ownerId: number;
  retailerId?: number;
  type: Prisma.EntryType;
  source: Prisma.EntrySource;
  amount: number;
  status: Prisma.EntryStatus;
  referenceId?: number;
  description?: string;
}) {
  const {
    ownerType,
    ownerId,
    retailerId,
    type,
    source,
    amount,
    status,
    referenceId,
    description,
  } = params;

  await prisma.financialEntry.create({
    data: {
      ownerType,
      ownerId,
      retailerId,
      type,
      source,
      amount: new Decimal(amount),
      status,
      referenceId,
      description,
    },
  });
}

/**
 * Register accounts receivable/payable when a retailer purchase is created.
 * Creates a receivable for the supplier and a payable for the retailer.
 */
export async function registerPurchaseAccounting(params: {
  purchaseId: number;
  supplierId: number;
  retailerId: number;
  totalAmount: number;
}) {
  const { purchaseId, supplierId, retailerId, totalAmount } = params;

  // Supplier receivable
  await createFinancialEntry({
    ownerType: "FORNECEDOR",
    ownerId: supplierId,
    type: "CONTA_A_RECEBER",
    source: "RETAILER_PURCHASE",
    amount: totalAmount,
    status: "EM_ABERTO",
    referenceId: purchaseId,
    description: "Conta a receber do lojista",
  });

  // Retailer payable
  await createFinancialEntry({
    ownerType: "LOJISTA",
    ownerId: retailerId,
    type: "CONTA_A_PAGAR",
    source: "RETAILER_PURCHASE",
    amount: totalAmount,
    status: "EM_ABERTO",
    referenceId: purchaseId,
    description: "Conta a pagar ao fornecedor",
  });
}

/**
 * Register payment from retailer (partial or full).
 */
export async function registerRetailerPayment(params: {
  purchaseId: number;
  amountPaid: number;
}) {
  const { purchaseId, amountPaid } = params;
  // Update financial entries status/amount accordingly – implementation placeholder
  // In real scenario, locate related entries and adjust their amounts/status.
  // For simplicity, we just create a payment entry.
  const purchase = await prisma.retailerPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return;

  // Payment received by supplier
  await createFinancialEntry({
    ownerType: "FORNECEDOR",
    ownerId: purchase.supplierId,
    type: "RECEBIMENTO",
    source: "RETAILER_PAYMENT",
    amount: amountPaid,
    status: "PAGO",
    referenceId: purchaseId,
    description: "Pagamento parcial/total do lojista",
  });

  // Payment made by retailer
  await createFinancialEntry({
    ownerType: "LOJISTA",
    ownerId: purchase.retailerId,
    type: "PAGAMENTO",
    source: "RETAILER_PAYMENT",
    amount: amountPaid,
    status: "PAGO",
    referenceId: purchaseId,
    description: "Pagamento ao fornecedor",
  });
}
