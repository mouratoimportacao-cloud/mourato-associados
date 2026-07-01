import { NextRequest, NextResponse } from "next/server";
import { createPackage } from "../../../../lib/services/packageService";

/**
 * Cria um pacote para agrupar itens de uma compra do lojista.
 * Expected JSON body: { status: string, amountPaid?: number }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ purchaseId: string }> }) {
  try {
    const { purchaseId } = await params;
    const purchaseIdNum = Number(purchaseId);
    if (!purchaseIdNum) {
      return NextResponse.json({ error: "purchaseId inválido" }, { status: 400 });
    }
    const { status, amountPaid } = await request.json();
    if (!status) {
      return NextResponse.json({ error: "status requerido" }, { status: 400 });
    }
    const newPkg = await createPackage({ purchaseId: purchaseIdNum, status, amountPaid });
    return NextResponse.json({ success: true, package: newPkg }, { status: 201 });
  } catch (e) {
    console.error("Erro ao criar pacote", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
