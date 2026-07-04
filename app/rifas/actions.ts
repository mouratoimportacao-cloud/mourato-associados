"use server";

import { prisma } from "../../lib/prisma";
import { MercadoPagoConfig, Payment } from "mercadopago";

export async function buscarRifaAtiva(id?: number) {
  try {
    if (id) {
      const rifa = await prisma.rifa.findUnique({ where: { id } });
      return { success: true, rifa };
    }
    const rifa = await prisma.rifa.findFirst({
      where: { status: "ATIVO" },
      orderBy: { id: "desc" },
    });
    return { success: true, rifa };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao buscar rifa ativa." };
  }
}

export async function registrarParticipante(formData: FormData) {
  const rifaId = Number(formData.get("rifaId"));
  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const usernameInsta = String(formData.get("usernameInsta") || "").trim();
  const usernameFace = String(formData.get("usernameFace") || "").trim();

  if (!rifaId) return { success: false, error: "Campanha de rifa inválida." };
  if (!nome || !telefone || !usernameInsta) {
    return { success: false, error: "Nome, WhatsApp e usuário do Instagram são obrigatórios." };
  }

  try {
    const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
    if (!rifa) return { success: false, error: "Campanha de rifa não encontrada." };
    if (rifa.status !== "ATIVO") return { success: false, error: "Esta rifa não está mais ativa." };

    // Limite máximo de bilhetes por rifa (0000 a 9999 = 10000 números)
    const maxBilhetes = 10000;

    // Busca bilhetes já reservados para esta rifa
    const reservados = await prisma.bilhete.findMany({
      where: { rifaId },
      select: { numeroBilhete: true },
    });

    const numerosReservadosSet = new Set(reservados.map((b: any) => b.numeroBilhete));

    if (numerosReservadosSet.size >= maxBilhetes) {
      return { success: false, error: "Desculpe, todos os bilhetes para esta rifa foram esgotados!" };
    }

    // Gerar um número aleatório único que não esteja reservado
    let numeroSorteado: number;
    let tentativas = 0;
    do {
      numeroSorteado = Math.floor(Math.random() * maxBilhetes);
      tentativas++;
      // Proteção de loop infinito preventiva
      if (tentativas > 15000) {
        return { success: false, error: "Erro ao gerar número. Tente novamente." };
      }
    } while (numerosReservadosSet.has(numeroSorteado));

    // Determina o status de pagamento padrão:
    const preco = Number(rifa.precoBilhete);
    const statusPagto = preco <= 0 ? "PAGO" : "AGUARDANDO_PAGAMENTO";

    // Integração Mercado Pago para gerar Pix Real se preco > 0
    let pixTxid: string | null = null;
    let qrCode: string | null = null;
    let qrCodeBase64: string | null = null;

    if (preco > 0 && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      try {
        const client = new MercadoPagoConfig({
          accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
        });
        const payment = new Payment(client);
        const cleanPhone = telefone.replace(/\D/g, "");
        const payerEmail = `usuario-${cleanPhone}@mouratoassociados.com.br`;

        const mpResponse = await payment.create({
          body: {
            transaction_amount: preco,
            description: `Rifa: ${rifa.titulo} - Bilhete #${String(numeroSorteado).padStart(4, "0")}`,
            payment_method_id: "pix",
            payer: {
              email: payerEmail,
              first_name: nome.split(" ")[0] || "Participante",
              last_name: nome.split(" ").slice(1).join(" ") || "Rifa",
            }
          }
        });

        if (mpResponse.id) {
          pixTxid = String(mpResponse.id);
          qrCode = mpResponse.point_of_interaction?.transaction_data?.qr_code || null;
          qrCodeBase64 = mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 || null;
        }
      } catch (err) {
        console.error("Erro ao criar pagamento Pix no Mercado Pago:", err);
      }
    }

    // Criar o bilhete
    const bilhete = await prisma.bilhete.create({
      data: {
        rifaId,
        nome,
        telefone,
        usernameInsta: usernameInsta.startsWith("@") ? usernameInsta : `@${usernameInsta}`,
        usernameFace: usernameFace || null,
        numeroBilhete: numeroSorteado,
        statusPagto,
        pixTxid,
        createdAt: new Date(),
      },
    });

    // Se o preço for grátis (0.00), podemos criar o Pedido correspondente direto para auditoria
    if (preco <= 0) {
      await prisma.pedido.create({
        data: {
          usuarioId: 1, // Admin
          produtoNome: `Rifa Grátis: ${rifa.titulo} - Bilhete #${String(numeroSorteado).padStart(4, "0")}`,
          quantidade: 1,
          precoUnitario: 0,
          total: 0,
          tipoFluxo: "intencao_site",
          status: "pago",
          pagamento: "Rifa Grátis",
          observacao: `Participante: ${nome} (${telefone})`,
        },
      });
    }

    return { 
      success: true, 
      bilhete: {
        ...bilhete,
        qrCode,
        qrCodeBase64
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao registrar participação." };
  }
}
