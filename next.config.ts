import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /* Configuración para manejar cookies autenticadas y desarrollo */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type,Authorization,X-Account,X-Signing-Message,X-Signature,Cookie',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },

  // Reduce console noise in development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // Optimize images and fonts
  images: {
    domains: ['*'],
  },

  // Reduce webpack warnings
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "crypto": false,
    };

    return config;
  },
};

export default nextConfig;
