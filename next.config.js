// next.config.js
/**
 * Configurações globais do Next.js para melhorar a segurança e forçar HTTPS.
 * Não altera nenhuma lógica de negócio, apenas adiciona cabeçalhos HTTP
 * e redirecionamento quando a aplicação estiver em produção.
 */
const securityHeaders = [
  // Enforce HTTPS (HSTS) – 1 ano, inclui subdomínios e preload
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // Content Security Policy básica (pode ser ajustada conforme recursos externos)
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';",
  },
  // Evita clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Bloqueia MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer Policy
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Protege contra XSS refletido básico
  { key: 'X-XSS-Protection', value: '1; mode=block' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Habilita redirecionamento forçado para HTTPS em produção
  async redirects() {
    return [
      {
        source: '/(.*)',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
        permanent: true,
        destination: 'https://' + (process.env.VERCEL_URL || 'localhost:3000') + '/$1',
      },
    ];
  },
  // Adiciona os cabeçalhos de segurança em todas as rotas
  async headers() {
    return [
      {
        // Aplica a todas as rotas
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  // Opt‑in for strict mode React (já padrão, mas reforçamos)
  reactStrictMode: true,
  // Desativa o X‑Powered‑By (já padrão, mas garantimos)
  poweredByHeader: false,
};

module.exports = nextConfig;
