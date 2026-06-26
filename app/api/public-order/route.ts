"use server";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { createFinancialEntry } from "../../../lib/services/financialService";

import { OwnerType, EntryType, EntrySource, EntryStatus } from "@prisma/client";

/**
 * Register a public site sale.
 * Expected JSON body: { productId, quantity, unitPrice }
 */
export async function POST(request: Request) {
  try {
    const { productId, quantity, unitPrice } = await request.json();
    if (!productId || !quantity || !unitPrice) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const total = quantity * unitPrice;

    // Decrement supplier global stock
    await prisma.produto.update({
      where: { id: productId },
      data: {
        estoque: { decrement: quantity } as any,
        estoqueLojista: { decrement: quantity } as any,
      },
    });

    // Create public order record
    const order = await prisma.publicOrder.create({
      data: {
        productId,
        quantity,
        unitPrice,
        total,
        paymentStatus: "PAGO",
        ownerType: "FORNECEDOR",
      },
    });

    // Create financial entry (receita for fornecedor)
    await createFinancialEntry({
      ownerType: OwnerType.FORNECEDOR,
      ownerId: 0, // fornecedor admin assumed id 0 or not relevant
      type: EntryType.RECEITA,
      source: EntrySource.PUBLIC_SALE,
      amount: total,
      status: EntryStatus.PAGO,
      referenceId: order.id,
      description: "Venda pública",
    });

    return NextResponse.json({ id: order.id, total }, { status: 201 });
  } catch (e) {
    console.error("Erro ao registrar venda pública", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
