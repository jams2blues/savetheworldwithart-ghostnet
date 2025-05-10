/*Developed by @jams2blues with love for the Tezos community
  File: next.config.js
  Summary: Clean config after rolling Beacon back to pure-CJS
*/

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  images: { domains: ['gateway.pinata.cloud', 'ipfs.io'] },

  redirects: async () => [
    { source: '/savetheworldwithart/:path*', destination: '/:path*', permanent: true }
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    return config;
  }
};

module.exports = nextConfig;

/* What changed & why
   • Removed every ESM workaround — unnecessary once Beacon 4.4.2 +
     StableLib 1.0.4 (CJS) are in place.
*/
