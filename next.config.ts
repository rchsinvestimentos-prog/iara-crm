import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // A checagem de tipos voltou a valer no build. Com ignoreBuildErrors um
  // campo inexistente passava e só quebrava quando a cliente clicava (foi o
  // caso da foto de perfil, do Apple Calendar e do simulador).
  experimental: {
    // O middleware lê o corpo do pedido e, por padrão, corta em 10 MB: o vídeo
    // anexado ao procedimento (até 15 MB) chegava pela metade na rota.
    proxyClientMaxBodySize: '20mb',
  },
  compiler: {
    // Remove console.log apenas em produção, para aliviar a carga no servidor Node.js
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
