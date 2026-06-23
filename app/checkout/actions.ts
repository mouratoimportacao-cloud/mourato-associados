"use server";

import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
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
  clienteInfo: ClienteInfo
) {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return { success: false, url: null, error: "Mercado Pago não configurado" };
  }

  try {
    const preference = new Preference(client);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mouratoassociados.com.br";

    const result = await preference.create({
      body: {
        items: items.map((item, i) => ({
          id: `item-${i}`,
          title: item.nome,
          quantity: item.quantidade,
          unit_price: item.preco,
          currency_id: "BRL",
        })),
        payer: {
          name: clienteInfo.nome,
          phone: {
            number: clienteInfo.contato.replace(/\D/g, ""),
          },
          address: {
            zip_code: clienteInfo.cep.replace(/\D/g, ""),
            street_name: clienteInfo.rua,
            street_number: Number(clienteInfo.numero) || 0,
          },
        },
        back_urls: {
          success: `${baseUrl}/produtos?pagamento=sucesso`,
          failure: `${baseUrl}/produtos?pagamento=falha`,
          pending: `${baseUrl}/produtos?pagamento=pendente`,
        },
        auto_return: "approved",
        statement_descriptor: "MOURATO&ASSOCIADOS",
      },
    });

    return {
      success: true,
      url: result.init_point || null,
      error: null,
    };
  } catch (error: any) {
    console.error("Erro Mercado Pago:", error);
    return {
      success: false,
      url: null,
      error: error.message || "Erro ao criar pagamento",
    };
  }
}
