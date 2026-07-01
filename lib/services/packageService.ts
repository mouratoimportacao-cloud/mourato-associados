import { prisma } from "../prisma";
import { transferStock } from "./stockService";
import { registerRetailerPayment } from "./financialService";

type PackageData = {
  retailerPurchaseId: number;
  totalAmount: number;
  paidAmount: number;
  openAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Cria um pacote que agrega todos os itens de uma compra do lojista.
 * - Transfere o estoque do fornecedor para o lojista (se ainda não transferido).
 * - Registra pagamento parcial ou total, se informado.
 */
export async function createPackage(params: {
  purchaseId: number;
  status: string;
  amountPaid?: number;
}) {
  const { purchaseId, status, amountPaid = 0 } = params;

  // Busca a compra com seus itens
  const purchase = await prisma.retailerPurchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });
  if (!purchase) throw new Error("Purchase not found");

  // Se ainda não houver transferido estoque, faz a transferência única
  if (!purchase.stockTransferred) {
    for (const item of purchase.items) {
      await transferStock({
        purchaseId,
        supplierId: purchase.supplierId,
        retailerId: purchase.retailerId,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: Number(item.unitCost),
      });
    }
  }

  // Calcula total da compra (quantidade * custo unitário)
  const totalAmount = purchase.items.reduce(
    (sum: number, item: any) => sum + item.quantity * Number(item.unitCost),
    0,
  );
  const paidAmount = amountPaid;
  const openAmount = Math.max(0, totalAmount - paidAmount);

  // Cria registro do pacote
  const newPackage = await prisma.package.create({
    data: {
      retailerPurchaseId: purchaseId,
      totalAmount,
      paidAmount,
      openAmount,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as PackageData,
  });

  // Registra pagamento, se houver valor
  if (paidAmount > 0) {
    await registerRetailerPayment({ purchaseId, amountPaid: paidAmount });
  }

  return newPackage;
}
