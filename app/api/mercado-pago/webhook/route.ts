import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { atualizarStatusPedidoInterno } from "../../../admin/pedidos/actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Mercado Pago Webhook recebido:", JSON.stringify(body));

    const { type, action, data } = body;

    // Processa apenas pagamentos criados/atualizados
    if (type === "payment" && (action === "payment.created" || action === "payment.updated" || !action)) {
      const paymentId = data?.id || body.resource?.split("/").pop();

      if (!paymentId) {
        return NextResponse.json({ error: "ID do pagamento ausente" }, { status: 400 });
      }

      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!token) {
        console.error("MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor.");
        return NextResponse.json({ error: "Token não configurado" }, { status: 500 });
      }

      // Consulta os detalhes do pagamento diretamente na API do Mercado Pago por segurança
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error(`Erro ao consultar pagamento ${paymentId} no Mercado Pago:`, response.statusText);
        return NextResponse.json({ error: "Erro ao consultar pagamento" }, { status: 502 });
      }

      const paymentData = await response.json();
      const { status: paymentStatus, external_reference: checkoutRef } = paymentData;

      console.log(`Pagamento MP #${paymentId}: status = ${paymentStatus}, external_reference = ${checkoutRef}`);

      if (paymentStatus === "approved" && checkoutRef) {
        // Encontra pedidos com o checkoutRef na observação (filtrado em memória para compatibilidade com o mock local)
        const todosPedidos = await prisma.pedido.findMany();
        const pedidos = todosPedidos.filter((p: any) =>
          p.observacao && p.observacao.includes(`Ref: ${checkoutRef}`)
        );

        if (pedidos.length === 0) {
          console.log(`Nenhum pedido encontrado no banco com a referência Ref: ${checkoutRef}`);
        } else {
          console.log(`Atualizando ${pedidos.length} pedido(s) vinculados à ref ${checkoutRef} para status 'pago'`);
          for (const pedido of pedidos) {
            if (pedido.status !== "pago") {
              await atualizarStatusPedidoInterno(pedido.id, "pago", null);
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Erro no processamento do webhook do Mercado Pago:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
