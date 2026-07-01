const TOKEN = 'APP_USR-3761967622648833-062410-53fff47a5d630784b3319217c19b30f1-1280195312';
const h = { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };

const pref = await fetch('https://api.mercadopago.com/checkout/preferences', {
  method: 'POST', headers: h,
  body: JSON.stringify({
    external_reference: 'TESTE-PROD-001',
    items: [
      { id: '26', title: 'Yara Lattafa 100ml', quantity: 1, unit_price: 290.00, currency_id: 'BRL' },
      { id: '14', title: 'Champ de Mars 100ml', quantity: 1, unit_price: 290.00, currency_id: 'BRL' },
    ],
    payer: { name: 'Cliente Teste', phone: { number: '11999999999' }, address: { zip_code: '01310100', street_name: 'Av Paulista', street_number: '1000' } },
    notification_url: 'https://mouratoassociados.com.br/api/mercado-pago/webhook',
    back_urls: {
      success: 'https://mouratoassociados.com.br/produtos?pagamento=sucesso',
      failure: 'https://mouratoassociados.com.br/produtos?pagamento=falha',
      pending: 'https://mouratoassociados.com.br/produtos?pagamento=pendente',
    },
    auto_return: 'approved',
    statement_descriptor: 'MOURATO&ASSOCIADOS',
  })
});
const pd = await pref.json();
console.log('Status:', pref.status);
console.log('ID:', pd.id);
console.log('Total: R$ 580,00');
console.log('');
console.log('URL PRODUCAO:', pd.init_point);
console.log('URL SANDBOX: ', pd.sandbox_init_point);
