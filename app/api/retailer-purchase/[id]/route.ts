"use server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { transferStock } from "../../../../lib/services/stockService";
import { registerRetailerPayment } from "../../../../lib/services/financialService";

/**
 * Update retailer purchase status and optionally register payment.
 * Expected JSON body: { status: string, amountPaid?: number }
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const purchaseId = Number(params.id);
    const { status, amountPaid } = await request.json();
    if (!purchaseId || !status) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const purchase = await prisma.retailerPurchase.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });
    if (!purchase) {
      return NextResponse.json({ error: "Compra não encontrada" }, { status: 404 });
    }

    // Update status
    const data: any = { status };
    if (typeof amountPaid === "number") {
      data.paidAmount = purchase.paidAmount + amountPaid;
      data.openAmount = Math.max(0, purchase.totalAmount - data.paidAmount);
    }

    // If stock not yet transferred and status moves to a crediting state, transfer stock
    const creditStatuses = ["PAGO", "ENVIADO", "ENTREGUE"]; // adjust as needed
    if (!purchase.stockTransferred && creditStatuses.includes(status)) {
      // For each item, transfer stock from supplier to retailer
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

    // If payment is recorded, create financial entries
    if (typeof amountPaid === "number" && amountPaid > 0) {
      await registerRetailerPayment({ purchaseId, amountPaid });
    }

    await prisma.retailerPurchase.update({ where: { id: purchaseId }, data });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("Erro ao atualizar compra do lojista", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
