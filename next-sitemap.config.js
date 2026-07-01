/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://mouratoassociados.com.br',
  generateRobotsTxt: true,
  exclude: ['/admin/*', '/lojista/painel', '/api/*'],
};
