const TOKEN = 'TEST-3761967622648833-062410-ff7dac27dbdf59ce12b21c8132e19286-1280195312';
const h = { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };

// 1. Conexão básica
const me = await fetch('https://api.mercadopago.com/users/me', { headers: h });
const ud = await me.json();
console.log('1. Conexao API:', me.status === 200 ? `OK — user: ${ud.id} | ${ud.email} | site: ${ud.site_id}` : `FALHOU (${me.status})`);

// 2. Criar preferência de pagamento
const pref = await fetch('https://api.mercadopago.com/checkout/preferences', {
  method: 'POST', headers: h,
  body: JSON.stringify({
    items: [{ id: 't1', title: 'Perfume Teste', quantity: 1, unit_price: 99.90, currency_id: 'BRL' }],
    external_reference: 'TEST-REF-001',
    back_urls: {
      success: 'https://mouratoassociados.com.br/produtos?pagamento=sucesso',
      failure: 'https://mouratoassociados.com.br/produtos?pagamento=falha',
      pending: 'https://mouratoassociados.com.br/produtos?pagamento=pendente',
    },
    auto_return: 'approved',
  })
});
const pd = await pref.json();
console.log('2. Criar preferencia:', pref.status === 201 ? `OK — id: ${pd.id}` : `FALHOU (${pref.status}) ${pd.message || JSON.stringify(pd).slice(0,120)}`);
if (pd.sandbox_init_point) console.log('   Sandbox URL:', pd.sandbox_init_point);

// 3. Listar pagamentos recentes
const pay = await fetch('https://api.mercadopago.com/v1/payments/search?limit=5', { headers: h });
const payd = await pay.json();
console.log('3. Listar pagamentos:', pay.status === 200 ? `OK — total: ${payd.paging?.total}` : `FALHOU (${pay.status})`);

// 4. Métodos de pagamento disponíveis
const meth = await fetch('https://api.mercadopago.com/v1/payment_methods', { headers: h });
const md = await meth.json();
const tipos = [...new Set(md.map(m => m.payment_type_id))];
console.log('4. Metodos de pagamento:', meth.status === 200 ? `OK — ${md.length} metodos | tipos: ${tipos.join(', ')}` : `FALHOU (${meth.status})`);

// 5. Webhook — verificar se há notificações configuradas na preferência criada
console.log('5. Webhook URL esperada: https://mouratoassociados.com.br/api/mercado-pago/webhook');
console.log('   Status: NAO configurado automaticamente — precisa registrar no painel MP ou via notification_url na preferencia');

// 6. Token de produção no Vercel
console.log('6. Token producao no Vercel: VERIFICAR manualmente em vercel.com > Settings > Environment Variables > MERCADO_PAGO_ACCESS_TOKEN');
