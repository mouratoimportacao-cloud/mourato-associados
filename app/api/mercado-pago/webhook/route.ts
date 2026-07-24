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

      if (paymentStatus === "approved") {
        // 1. Bilhete de rifa
        const todosBilhetes = await prisma.bilhete.findMany();
        const bilhete = todosBilhetes.find((b: any) => b.pixTxid === String(paymentId));
        if (bilhete) {
          if (bilhete.statusPagto !== "PAGO") {
            await prisma.bilhete.update({ where: { id: bilhete.id }, data: { statusPagto: "PAGO" } });
            const rifa = await prisma.rifa.findUnique({ where: { id: bilhete.rifaId } });
            if (rifa && Number(rifa.precoBilhete) > 0) {
              await prisma.pedido.create({
                data: {
                  usuarioId: 1,
                  produtoNome: `Rifa: ${rifa.titulo} - Bilhete #${String(bilhete.numeroBilhete).padStart(4, "0")}`,
                  quantidade: 1,
                  precoUnitario: Number(rifa.precoBilhete),
                  total: Number(rifa.precoBilhete),
                  tipoFluxo: "intencao_site",
                  status: "pago",
                  pagamento: "Pix Mercado Pago",
                  observacao: `Participante: ${bilhete.nome} (${bilhete.telefone})`,
                },
              });
            }
          }
        }

        // 2. Pedidos do site — busca por checkoutRef OU por paymentId na observação
        if (checkoutRef) {
          const pedidos = await prisma.pedido.findMany({
            where: { observacao: { contains: `Ref: ${checkoutRef}` } }
          });
          console.log(`Webhook MP #${paymentId}: ${pedidos.length} pedido(s) com Ref: ${checkoutRef}`);
          for (const pedido of pedidos) {
            if (pedido.status !== "pago") {
              await atualizarStatusPedidoInterno(pedido.id, "pago", null);
            }
          }
        } else {
          // Sem checkoutRef — tenta pelo paymentId na observação ou pelo valor+data
          console.log(`Webhook MP #${paymentId}: sem external_reference, buscando por paymentId`);
          const pedidos = await prisma.pedido.findMany({
            where: { observacao: { contains: String(paymentId) } }
          });
          for (const pedido of pedidos) {
            if (pedido.status !== "pago") {
              await atualizarStatusPedidoInterno(pedido.id, "pago", null);
            }
          }
        }
      } else if (paymentStatus === "rejected") {
        // Atualiza pedido para recusado se existir
        if (checkoutRef) {
          const pedidos = await prisma.pedido.findMany({
            where: { observacao: { contains: `Ref: ${checkoutRef}` } }
          });
          for (const pedido of pedidos) {
            if (pedido.status === "intencao de compra") {
              await atualizarStatusPedidoInterno(pedido.id, "pagamento recusado", null);
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
