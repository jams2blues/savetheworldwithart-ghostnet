// next.config.js
// Summary: Next.js configuration – enables strict mode, SWC minification, sets allowed image domains,
// configures redirects, and adds a webpack fallback for the 'fs' module.
/* this app was developed by @jams2blues with love for the Tezos community */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['gateway.pinata.cloud', 'ipfs.io'],
  },
  redirects: async () => [
    { source: '/savetheworldwithart/:path*', destination: '/:path*', permanent: true },
  ],
  webpack: (config, { isServer }) => {
    // Resolve the "fs" module error for Beacon UI by providing a fallback.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
