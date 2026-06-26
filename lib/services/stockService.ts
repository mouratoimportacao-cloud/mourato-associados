import { prisma } from "../prisma";
import { Decimal } from "@prisma/client";

/**
 * Transfer stock from supplier to retailer.
 * Creates/updates SupplierStock and RetailerStock entries and marks the related RetailerPurchase as transferred.
 */
export async function transferStock(params: {
  purchaseId: number;
  supplierId: number;
  retailerId: number;
  productId: number;
  quantity: number;
  unitCost: number;
}) {
  const { purchaseId, supplierId, retailerId, productId, quantity, unitCost } = params;
  // Update SupplierStock
  const supplierStock = await prisma.supplierStock.findUnique({ where: { productId } });
  if (!supplierStock) {
    // create if not exists
    await prisma.supplierStock.create({
      data: {
        productId,
        quantity: -quantity, // decrement from supplier inventory
        cost: new Decimal(unitCost),
      },
    });
  } else {
    await prisma.supplierStock.update({
      where: { id: supplierStock.id },
      data: { quantity: supplierStock.quantity - quantity },
    });
  }

  // Update RetailerStock
  const retailerStock = await prisma.retailerStock.findFirst({
    where: { retailerId, productId },
  });
  if (!retailerStock) {
    await prisma.retailerStock.create({
      data: {
        retailerId,
        productId,
        quantity,
        cost: new Decimal(unitCost),
      },
    });
  } else {
    await prisma.retailerStock.update({
      where: { id: retailerStock.id },
      data: { quantity: retailerStock.quantity + quantity },
    });
  }

  // Mark purchase as transferred
  await prisma.retailerPurchase.update({
    where: { id: purchaseId },
    data: { stockTransferred: true },
  });
}
