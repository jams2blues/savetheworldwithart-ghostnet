/*Developed by @jams2blues with love for the Tezos community
  File: src/config/next.config.js
  Summary: Next.js config — enables ESM externals (loose) so Beacon’s
           CommonJS utils can load StableLib ESM; keeps fs-fallback,
           image domains, and webpack “auto” rule.
*/

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  images: { domains: ['gateway.pinata.cloud', 'ipfs.io'] },

  redirects: async () => [
    {
      source:      '/savetheworldwithart/:path*',
      destination: '/:path*',
      permanent:   true
    }
  ],

  experimental: {
    /* 🔑 Key line — let Next wrap ESM packages when they’re required() */
    esmExternals: 'loose'
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }

    /* treat .mjs in node_modules as “auto” JS */
    config.module.rules.push({
      test: /\.m?js$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false }
    });

    return config;
  }
};

module.exports = nextConfig;

/* What changed & why
   • Added experimental.esmExternals:'loose' — officially documented by
     Next.js to solve ERR_REQUIRE_ESM when CJS libs require() ESM deps.
   • No other logic touched; carousel & SSR continue to work.
*/
