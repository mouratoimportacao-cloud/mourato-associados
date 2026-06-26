"use server";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { transferStock } from "../../../lib/services/stockService";
import { registerPurchaseAccounting } from "../../../lib/services/financialService";

/**
 * Create a retailer purchase (lojista buys from supplier).
 * Expected JSON body:
 * { retailerId, supplierId, items: [{ productId, quantity, unitCost }] }
 */
export async function POST(request: Request) {
  try {
    const { retailerId, supplierId, items } = await request.json();
    if (!retailerId || !supplierId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    // Calculate total amount
    let totalAmount = 0;
    for (const it of items) {
      if (!it.productId || !it.quantity || !it.unitCost) {
        return NextResponse.json({ error: "Item incompleto" }, { status: 400 });
      }
      totalAmount += it.quantity * it.unitCost;
    }

    // Create purchase record
    const purchase = await prisma.retailerPurchase.create({
      data: {
        retailerId,
        supplierId,
        status: "AGUARDANDO_PAGAMENTO",
        totalAmount: totalAmount,
        paidAmount: 0,
        openAmount: totalAmount,
        stockTransferred: false,
        items: {
          create: items.map((it: any) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitCost: it.unitCost,
            totalCost: it.quantity * it.unitCost,
          })),
        },
      },
      include: { items: true },
    });

    // Register accounting entries (receivable for supplier, payable for retailer)
    await registerPurchaseAccounting({
      purchaseId: purchase.id,
      supplierId,
      retailerId,
      totalAmount,
    });

    return NextResponse.json({ id: purchase.id, totalAmount }, { status: 201 });
  } catch (e) {
    console.error("Erro ao criar compra do lojista", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
