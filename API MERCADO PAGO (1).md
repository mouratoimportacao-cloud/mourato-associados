**HTML Básico**



<!DOCTYPE html>

<html lang="pt-BR">

<head>

&#x20; <meta charset="UTF-8">

&#x20; <meta name="viewport" content="width=device-width, initial-scale=1.0">

&#x20; <title>Validação de Bandeira - Mercado Pago</title>

&#x20; <script src="https://sdk.mercadopago.com/js/v2"></script>

</head>

<body>

&#x20; <form id="payment-form">

&#x20;   <label>Número do Cartão:</label>

&#x20;   <input type="text" id="cardNumber" maxlength="19" placeholder="0000 0000 0000 0000" onkeyup="detectarBandeira(this.value)">



&#x20;   <div id="bandeira-detectada"></div>



&#x20;   <button type="button" onclick="criarToken()">Pagar</button>

&#x20; </form>



&#x20; <script>

&#x20;   // Código JS aqui

&#x20; </script>

</body>

</html>







**JavaScript - Detecção e Validação de Bandeiras**

JavaScript// Configuração inicial do Mercado Pago

const mp = new MercadoPago('TEST-...SEU\_PUBLIC\_KEY...'); // Use PUBLIC KEY aqui



// Função principal de detecção de bandeira

function detectarBandeira(numero) {

&#x20; const cleanNumber = numero.replace(/\\D/g, '');

&#x20; const bandeiraDiv = document.getElementById('bandeira-detectada');



&#x20; // Regras de detecção (bin patterns)

&#x20; const bandeiras = \[

&#x20;   { id: 'visa',       regex: /^4/,                  nome: 'Visa',       icone: '💳' },

&#x20;   { id: 'master',     regex: /^5\[1-5]|^2\[2-7]/,    nome: 'Mastercard', icone: '💳' },

&#x20;   { id: 'elo',        regex: /^4(0\[0-9]{2}|5\[0-9]{2})/, nome: 'Elo',     icone: '💳' },

&#x20;   { id: 'amex',       regex: /^3\[47]/,              nome: 'American Express', icone: '💳' },

&#x20;   { id: 'hipercard',  regex: /^606282|^3841/,       nome: 'Hipercard',  icone: '💳' },

&#x20;   { id: 'diners',     regex: /^3(0\[0-5]|\[68])/,     nome: 'Diners Club', icone: '💳' },

&#x20; ];



&#x20; let bandeiraEncontrada = null;



&#x20; for (let bandeira of bandeiras) {

&#x20;   if (bandeira.regex.test(cleanNumber)) {

&#x20;     bandeiraEncontrada = bandeira;

&#x20;     break;

&#x20;   }

&#x20; }



&#x20; if (cleanNumber.length >= 6) {

&#x20;   if (bandeiraEncontrada) {

&#x20;     bandeiraDiv.innerHTML = `

&#x20;       <strong>${bandeiraEncontrada.icone} ${bandeiraEncontrada.nome}</strong> 

&#x20;       <span style="color:green;">✓ Aceita</span>

&#x20;     `;

&#x20;     return bandeiraEncontrada.id;

&#x20;   } else {

&#x20;     bandeiraDiv.innerHTML = `<span style="color:red;">Bandeira não suportada</span>`;

&#x20;     return null;

&#x20;   }

&#x20; } else {

&#x20;   bandeiraDiv.innerHTML = '';

&#x20;   return null;

&#x20; }

}



// Criar Token do Cartão (usado antes de enviar para o backend)

async function criarToken() {

&#x20; const cardNumber = document.getElementById('cardNumber').value;

&#x20; const bandeira = detectarBandeira(cardNumber);



&#x20; if (!bandeira) {

&#x20;   alert("Bandeira do cartão não é aceita ou inválida.");

&#x20;   return;

&#x20; }



&#x20; try {

&#x20;   const token = await mp.createCardToken({

&#x20;     cardNumber: cardNumber.replace(/\\s/g, ''),

&#x20;     cardExpirationMonth: document.getElementById('expiryMonth')?.value || '12', // adicione os campos

&#x20;     cardExpirationYear: document.getElementById('expiryYear')?.value || '2028',

&#x20;     securityCode: document.getElementById('cvv')?.value || '123',

&#x20;     cardholderName: document.getElementById('cardholder')?.value || 'Nome Sobrenome'

&#x20;   });



&#x20;   console.log("Token gerado com sucesso:", token);

&#x20;   // Enviar o token para o seu backend

&#x20;   await enviarParaBackend(token.id, bandeira);



&#x20; } catch (error) {

&#x20;   console.error("Erro ao gerar token:", error);

&#x20;   alert("Erro ao validar o cartão: " + error.message);

&#x20; }

}



async function enviarParaBackend(token, bandeira) {

&#x20; const response = await fetch('/api/pagamento/mercadopago', {

&#x20;   method: 'POST',

&#x20;   headers: { 'Content-Type': 'application/json' },

&#x20;   body: JSON.stringify({ token, bandeira })

&#x20; });



&#x20; const result = await response.json();

&#x20; console.log("Resposta do servidor:", result);

}







