/*Developed by @jams2blues with love for the Tezos community
  File: src/config/next.config.js
  Summary: Next.js configuration — strict-mode, SWC minify, image domains,
           redirect shim, Beacon “fs” fallback, and ESM-in-CJS fix for Vercel
*/

/**
 * Next 14 on Node 20 fails when a CommonJS dependency `require()`s a pure-ESM
 * module (ERR_REQUIRE_ESM).  
 * Beacon SDK → @stablelib/nacl is the culprit.  
 * The webpack rule below forces such imports to be treated as “auto” (let
 * webpack resolve) and relaxes fully-specified ESM resolution, allowing the
 * build to succeed without touching app code.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  /* allow on-chain thumbnails & IPFS gateway images */
  images: {
    domains: ['gateway.pinata.cloud', 'ipfs.io'],
  },

  /* pretty URL change made early in the project */
  redirects: async () => [
    {
      source:  '/savetheworldwithart/:path*',
      destination: '/:path*',
      permanent: true,
    },
  ],

  webpack: (config, { isServer }) => {
    /* Beacon UI “fs” shim when bundling for the browser */
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    /* --- NEW: allow CJS require() → ESM .mjs inside node_modules --- */
    config.module.rules.push({
      test: /\.m?js$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false },
    });

    return config;
  },
};

module.exports = nextConfig;

/* What changed & why
   • Added a webpack rule (test /\.m?js$/ in node_modules) that sets
     `type:'javascript/auto'` and `resolve.fullySpecified:false`.
     This lets CommonJS packages like @airgap/beacon-utils require()
     pure-ESM modules (@stablelib/nacl) during the build, fixing the
     Vercel failure without altering runtime code.
   • Existing strict-mode, SWC minify, image domain whitelist, redirect,
     and fs-fallback remain untouched.
*/
