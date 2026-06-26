"use server";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { createFinancialEntry } from "../../../lib/services/financialService";
// Enums used as string literals; no import needed

/**
 * Register a QR code sale by a retailer.
 * Expected JSON body: { retailerId, productId, quantity, unitPrice }
 */
export async function POST(request: Request) {
  try {
    const { retailerId, productId, quantity, unitPrice } = await request.json();
    if (!retailerId || !productId || !quantity || !unitPrice) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const total = quantity * unitPrice;

    // Decrement retailer personal stock
    const retailer = await prisma.usuario.findUnique({ where: { id: retailerId } });
    if (!retailer) {
      return NextResponse.json({ error: "Lojista não encontrado" }, { status: 404 });
    }
    const estoquePessoal = { ...(retailer.estoquePessoal || {}) } as Record<string, number>;
    const chave = String(productId);
    const estoqueAtual = Number(estoquePessoal[chave] || 0);
    if (estoqueAtual < quantity) {
      return NextResponse.json({ error: "Estoque pessoal insuficiente" }, { status: 400 });
    }
    estoquePessoal[chave] = estoqueAtual - quantity;
    await prisma.usuario.update({ where: { id: retailerId }, data: { estoquePessoal } });

    // Create QR order record
    const order = await prisma.qrOrder.create({
      data: {
        retailerId,
        productId,
        quantity,
        unitPrice,
        total,
        paymentStatus: "PAGO",
      },
    });

    // Financial entry for retailer revenue
    await createFinancialEntry({
      ownerType: "LOJISTA",
      ownerId: retailerId,
      type: "RECEITA",
      source: "QR_SALE",
      amount: total,
      status: "PAGO",
      referenceId: order.id,
      description: "Venda QR",
    });

    return NextResponse.json({ id: order.id, total }, { status: 201 });
  } catch (e) {
    console.error("Erro ao registrar venda QR", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
