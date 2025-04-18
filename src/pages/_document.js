// src/pages/_document.js
// Summary: Custom Document – Sets up SSR for MUI (Emotion) and injects meta tags for Open Graph and Twitter using ZeroContractBanner.png for social sharing.
/* this app was developed by @jams2blues with love for the Tezos community */
import React from 'react';
import Document, { Html, Head, Main, NextScript } from 'next/document';
import createEmotionServer from '@emotion/server/create-instance';
import createEmotionCache from '../utils/createEmotionCache';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Inject MUI styles first to match with the prepend: true configuration. */}
          {this.props.emotionStyleTags}
          <link rel="shortcut icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#006400" />

          {/* Open Graph Meta Tags */}
          <meta property="og:title" content="Save The World With Art™" />
          <meta property="og:description" content="The first Tzip-compliant fully on-chain minting platform for Tezos." />
          <meta property="og:image" content="https://ghostnet.savetheworldwithart.io/images/ZeroContractBanner.png" />
          <meta property="og:url" content="https://ghostnet.savetheworldwithart.io/" />
          <meta property="og:type" content="website" />

          {/* Twitter Card Meta Tags */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Save The World With Art™" />
          <meta name="twitter:description" content="The first fully on-chain minting platform for Tezos." />
          <meta name="twitter:image" content="https://ghostnet.savetheworldwithart.io/images/ZeroContractBanner.png" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

MyDocument.getInitialProps = async (ctx) => {
  const originalRenderPage = ctx.renderPage;
  const cache = createEmotionCache();
  const { extractCriticalToChunks } = createEmotionServer(cache);
  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App) =>
        function EnhanceApp(props) {
          return <App emotionCache={cache} {...props} />;
        },
    });
  const initialProps = await Document.getInitialProps(ctx);
  const emotionStyles = extractCriticalToChunks(initialProps.html);
  const emotionStyleTags = emotionStyles.styles.map((style) => (
    <style
      data-emotion={`${style.key} ${style.ids.join(' ')}`}
      key={style.key}
      dangerouslySetInnerHTML={{ __html: style.css }}
    />
  ));
  return {
    ...initialProps,
    emotionStyleTags,
  };
};
