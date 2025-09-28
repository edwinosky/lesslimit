import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages specific configuration - using functions for API routes
  // output: 'export', // Removed - conflicts with API routes
  trailingSlash: true, // Recommended for Cloudflare Pages
  distDir: '.output', // Changed to avoid conflicts with Cloudflare functions


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
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Experimental features for better Cloudflare compatibility
  experimental: {
    serverComponentsExternalPackages: ['@turf/turf'], // Add any external packages
  },

  // Reduce console noise in development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // Optimize images and fonts for Cloudflare
  images: {
    domains: ['*'],
    unoptimized: false, // Use Next.js optimizer even on Cloudflare
    formats: ['image/avif', 'image/webp'],
  },

  // Advanced webpack configuration for Cloudflare
  webpack: (config, { isServer }) => {
    // Resolve fallbacks for node modules in client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "crypto": false,
        "fs": false,
        "net": false,
        "tls": false,
        "path": false,
        "os": false,
        "zlib": false,
        "querystring": false,
      };
    }

    // Add any necessary plugins for wallet connections
    config.externals = [
      ...config.externals,
      {
        "crypto": "crypto-ha9-browser",
      },
    ];

    return config;
  },

  // Skip environment validation for production build
  skipEnvironmentVariableValidation: process.env.NODE_ENV === 'production',

  // Optimize bundle for Cloudflare
  swcMinify: true,

  // Configure TypeScript strict mode for production
  typescript: {
    ignoreBuildErrors: false,
  },

  // Configure ESLint for development and production (relaxed for deployment)
  eslint: {
    ignoreDuringBuilds: true, // Allow build even with some lint errors
  },
};

export default nextConfig;
