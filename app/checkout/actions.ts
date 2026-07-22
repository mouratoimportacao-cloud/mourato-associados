"use server";

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: (process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim(),
});

interface ItemCheckout {
  nome: string;
  quantidade: number;
  preco: number;
}

interface ClienteInfo {
  nome: string;
  contato: string;
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export async function criarPreferenciaPagamento(
  items: ItemCheckout[],
  clienteInfo: ClienteInfo,
  checkoutRef?: string
) {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim()) {
    return { success: false, url: null, error: "Mercado Pago não configurado" };
  }

  try {
    const preference = new Preference(client);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mouratoassociados.com.br";

    const result = await preference.create({
      body: {
        external_reference: checkoutRef,
        items: items.map((item, i) => ({
          id: `item-${i}`,
          title: item.nome,
          quantity: item.quantidade,
          unit_price: item.preco,
          currency_id: "BRL",
        })),
        payer: {
          name: clienteInfo.nome,
          phone: { number: clienteInfo.contato.replace(/\D/g, "") },
          address: {
            zip_code: clienteInfo.cep.replace(/\D/g, ""),
            street_name: clienteInfo.rua,
            street_number: String(clienteInfo.numero || "0"),
          },
        },
        notification_url: `${baseUrl}/api/mercado-pago/webhook`,
        back_urls: {
          success: `${baseUrl}/produtos?pagamento=sucesso`,
          failure: `${baseUrl}/produtos?pagamento=falha`,
          pending: `${baseUrl}/produtos?pagamento=pendente`,
        },
        auto_return: "approved",
        statement_descriptor: "MOURATO&ASSOCIADOS",
      },
    });

    return { success: true, url: result.init_point || null, error: null };
  } catch (error: any) {
    console.error("Erro Mercado Pago:", error);
    return { success: false, url: null, error: error.message || "Erro ao criar pagamento" };
  }
}

export async function processarPagamentoCartao(
  token: string,
  bandeira: string,
  parcelas: number,
  items: ItemCheckout[],
  clienteInfo: ClienteInfo,
  checkoutRef?: string
) {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim()) {
    return { success: false, error: "Mercado Pago não configurado" };
  }

  try {
    const payment = new Payment(client);
    const total = items.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const descricao = items.length === 1 ? items[0].nome : `Pedido Mourato & Associados (${items.length} itens)`;
    const nomes = clienteInfo.nome.trim().split(" ");
    const firstName = nomes[0];
    const lastName = nomes.slice(1).join(" ") || firstName;

    const result = await payment.create({
      body: {
        transaction_amount: total,
        token,
        description: descricao,
        installments: parcelas,
        payment_method_id: bandeira,
        external_reference: checkoutRef,
        payer: {
          email: `pagador-${clienteInfo.contato.replace(/\D/g, "")}@mouratoassociados.com.br`,
          first_name: firstName,
          last_name: lastName,
          identification: { type: "CPF", number: "00000000000" },
          address: {
            zip_code: clienteInfo.cep.replace(/\D/g, ""),
            street_name: clienteInfo.rua,
            street_number: clienteInfo.numero,
          },
        },
        notification_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://mouratoassociados.com.br"}/api/mercado-pago/webhook`,
        statement_descriptor: "MOURATO&ASSOC",
      },
    });

    const status = result.status;

    if (status === "approved") {
      return { success: true, status: "approved", error: null };
    } else if (status === "in_process" || status === "pending") {
      return { success: true, status: "pending", error: null };
    } else {
      return { success: false, status, error: result.status_detail || "Pagamento recusado" };
    }
  } catch (error: any) {
    console.error("Erro pagamento cartão MP:", error);
    return { success: false, status: "error", error: error.message || "Erro ao processar cartão" };
  }
}

export async function gerarPixCarrinho(
  items: ItemCheckout[],
  clienteInfo: ClienteInfo,
  checkoutRef?: string
) {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim()) {
    return { success: false, error: "Mercado Pago não configurado", qrCode: null, qrCodeBase64: null, paymentId: null };
  }

  try {
    const payment = new Payment(client);
    const total = items.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const descricao = items.length === 1 ? items[0].nome : `Pedido Mourato & Associados (${items.length} itens)`;
    const cleanPhone = clienteInfo.contato.replace(/\D/g, "");

    const result = await payment.create({
      body: {
        transaction_amount: total,
        description: descricao,
        payment_method_id: "pix",
        external_reference: checkoutRef,
        payer: {
          email: `pagador-${cleanPhone}@mouratoassociados.com.br`,
          first_name: clienteInfo.nome.split(" ")[0] || "Cliente",
          last_name: clienteInfo.nome.split(" ").slice(1).join(" ") || "Mourato",
        },
        notification_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://mouratoassociados.com.br"}/api/mercado-pago/webhook`,
      },
    });

    const qrCode = result.point_of_interaction?.transaction_data?.qr_code || null;
    const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64 || null;

    return {
      success: true,
      error: null,
      qrCode,
      qrCodeBase64,
      paymentId: result.id ? String(result.id) : null,
    };
  } catch (error: any) {
    console.error("Erro Pix MP:", error);
    return { success: false, error: error.message || "Erro ao gerar Pix", qrCode: null, qrCodeBase64: null, paymentId: null };
  }
}
