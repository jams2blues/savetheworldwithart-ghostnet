/*Developed by @jams2blues with love for the Tezos community
  File: src/config/next.config.js
  Summary: Next.js config — adds webpack rule to allow CJS → ESM imports
           inside node_modules (fixes ERR_REQUIRE_ESM during SSR build).
*/

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  /* allow on-chain thumbnails & IPFS gateway images */
  images: { domains: ['gateway.pinata.cloud', 'ipfs.io'] },

  /* legacy pretty-URL redirect */
  redirects: async () => [
    { source: '/savetheworldwithart/:path*', destination: '/:path*', permanent: true }
  ],

  webpack: (config, { isServer }) => {
    /* Beacon-UI “fs” shim for browser bundle */
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }

    /* ⬇️  NEW: treat *.mjs / *.js in node_modules as “auto” JS to let
       webpack handle `require()`ing ESM.  Also relax fullySpecified. */
    config.module.rules.push({
      test: /\.m?js$/,
      include: /node_modules/,
      type:   'javascript/auto',
      resolve: { fullySpecified: false }
    });

    return config;
  }
};

module.exports = nextConfig;

/* What changed & why
   • Rule above lets CommonJS code inside node_modules safely import pure-ESM
     files (e.g. Beacon-SDK → @stablelib/*).  Combined with the version pins
     in package.json it removes the remaining Vercel build blocker.
*/
