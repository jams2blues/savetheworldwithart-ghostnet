// craco.config.js
const webpack = require("webpack");

module.exports = {
  babel: {
    plugins: [
      "@babel/plugin-transform-private-methods",
      "@babel/plugin-transform-numeric-separator",
      "@babel/plugin-transform-nullish-coalescing-operator",
      "@babel/plugin-transform-class-properties",
      "@babel/plugin-transform-optional-chaining",
      "@babel/plugin-transform-private-property-in-object",
    ],
  },
  webpack: {
    alias: {
      stream: "stream-browserify",
      crypto: "crypto-browserify",
      buffer: "buffer",
      assert: "assert",
      process: "process/browser.js",
    },
    plugins: {
      add: [
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser.js",
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^fs$/,
        }),
      ],
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        stream: require.resolve("stream-browserify"),
        crypto: require.resolve("crypto-browserify"),
        buffer: require.resolve("buffer/"),
        assert: require.resolve("assert/"),
        process: require.resolve("process/browser.js"),
        vm: require.resolve("vm-browserify"),
        fs: false,
      };

      const oneOfRule = webpackConfig.module.rules.find(rule => rule.oneOf);
      if (oneOfRule) {
        const sourceMapLoaderRule = oneOfRule.oneOf.find(
          rule => rule.use && rule.use.loader === 'source-map-loader'
        );
        if (sourceMapLoaderRule) {
          // Exclude @walletconnect and all @airgap/beacon-* packages from source-map-loader
          sourceMapLoaderRule.exclude = /@walletconnect\/|@airgap\/beacon-.+\//;
        }
      }

      // Suppress specific warnings
      webpackConfig.ignoreWarnings = [
        {
          module: /@walletconnect/,
        },
        {
          module: /@airgap\/beacon-.+/,
        },
        {
          module: /qrcode-svg/,
        },
      ];

      return webpackConfig;
    },
  },
};
