🛠️ O que o Amazon Q precisa saber (Contexto de Arquitetura)
O Checkout Pro funciona sob o modelo de três etapas (Handshake, Redirecionamento e Webhook). O Q precisa entender que o Frontend nunca gera o pagamento diretamente; ele apenas inicia o SDK.

📜 Especificação do Backend (Node.js + Express + Boto3/Python se aplicável)
Forneça ao Amazon Q este exemplo exato de implementação para que ele o utilize como padrão de geração de código:

JavaScript
// O Amazon Q deve gerar o endpoint de backend seguindo este padrão:
const express = require('express');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());

// Inicialização do cliente com o Access Token de Produção/Testes
const client = new MercadoPagoConfig({
accessToken: process.env.MP_ACCESS_TOKEN
});

app.post('/create_preference', async (req, res) => {
try {
const preference = new Preference(client);

    // O Q precisa mapear o body vindo do carrinho do Frontend
    const response = await preference.create({
      body: {
        items: req.body.items, // Array de objetos {id, title, quantity, unit_price}
        back_urls: {
          success: "https://seusite.com/success",
          failure: "https://seusite.com/failure",
          pending: "https://seusite.com/pending"
        },
        auto_return: "approved",
        notification_url: "https://sua-api.com/webhooks/mercadopago" // Essencial para produção
      }
    });

    // O Q deve SEMPRE retornar o ID para o componente Wallet e a URL para fallback
    res.status(200).json({
      preferenceId: response.id,
      init_point: response.init_point
    });

} catch (error) {
res.status(500).json({ error: error.message });
}
});
💻 Especificação do Frontend (React + Next.js)
Instrua o Amazon Q a sempre gerenciar o ciclo de vida do componente <Wallet/> de forma condicional para evitar erros de renderização com IDs indefinidos:

JavaScript
import { useEffect, useState } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

export default function CheckoutButton({ cartItems }) {
const [preferenceId, setPreferenceId] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
// Inicializa o SDK no lado do cliente usando a Public Key
initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY, {
locale: 'pt-BR'
});
}, []);

const handleCheckout = async () => {
setLoading(true);
try {
const response = await fetch('/api/create_preference', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ items: cartItems })
});
const data = await response.json();
setPreferenceId(data.preferenceId);
} catch (error) {
console.error("Erro ao obter preferenceId:", error);
} finally {
setLoading(false);
}
};

return (
<div>
{!preferenceId && (
<button onClick={handleCheckout} disabled={loading}>
{loading ? 'Processando...' : 'Finalizar Compra'}
</button>
)}

      {/* O Q deve entender que a Wallet SÓ renderiza se houver o ID */}
      {preferenceId && (
        <Wallet
          initialization={{ preferenceId: preferenceId }}
          customization={{ texts: { valueProp: 'smart_option' }}}
        />
      )}
    </div>

);
}
🎯 Prompt de Instrução Direta para o Amazon Q
Se você estiver usando a interface de chat do Amazon Q para trabalhar no código agora, copie, cole e adapte o comando abaixo para "setar" o comportamento do modelo:

Prompt para colar no Amazon Q:
"Atue como um Arquiteto de Software especialista em integrações de meios de pagamento e AWS. Preciso que você implemente/corrija uma integração do Mercado Pago Checkout Pro utilizando a nova versão do SDK v2.

Diretrizes estritas de código:

No Backend (Node.js/Express): Use import { MercadoPagoConfig, Preference } from 'mercadopago'. O endpoint de criação de preferência deve ser um POST que recebe o array de items, gera a preferência usando o método preference.create({ body: { ... } }) e obrigatoriamente retorna um JSON com o campo { preferenceId: response.id }.

No Frontend (React/Next.js): Use @mercadopago/sdk-react. Chame initMercadoPago passando a chave pública. Garanta que o componente <Wallet initialization="{{" preferenceId }}/> só seja renderizado em tela por meio de renderização condicional (preferenceId && <Wallet .../>) após o retorno assíncrono da API do backend.

Segurança: Nunca exponha o AccessToken (chave privada) no frontend. Mantenha-o estritamente em variáveis de ambiente acessadas pelo backend (process.env).

Com base nessas regras, [insira aqui a sua dúvida específica, ex: gere os arquivos de rota / me ajude a debugar o erro X]".

🔍 O que costuma quebrar (Para você usar no Debug com o Q)
Se o Amazon Q gerar o código e der erro, as causas mais comuns no Mercado Pago v2 são duas:

Confusão de versões do SDK no Node: Versões antigas usavam mercadopago.configure(). A versão atual (v2) usa a classe instanciada new MercadoPagoConfig({ accessToken }). Avise o Q para esquecer o método .configure().

Falta do notification_url: Em ambientes serverless (como AWS Lambda + API Gateway), se o Checkout Pro não receber uma URL válida e pública de Webhook no parâmetro notification_url, você não conseguirá atualizar o status do pedido no seu banco de dados quando o cliente pagar via Pix ou Boleto.

Se você estiver rodando isso em infraestrutura serverless na AWS e precisar que o Amazon Q estruture as Lambdas ou a API no API Gateway para receber os webhooks do Mercado Pago, me avise que detalhamos essa arquitetura!
