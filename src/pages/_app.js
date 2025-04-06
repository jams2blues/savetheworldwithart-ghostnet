/*Developed by @jams2blues with love for the Tezos community
  File: src/pages/_app.js
  Summary: Adds a global “unhandledrejection” trap so the Beacon
           “Proposal expired” promise‑rejection never crashes Next.js.
*/
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import { WalletProvider } from '../contexts/WalletContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '../styles/globals.css';

const theme = createTheme({
  palette: {
    primary: { main: '#006400' }, // dark green
    secondary: { main: '#f50057' },
  },
});

export default function MyApp({ Component, pageProps }) {
  /* ─── Patch: swallow Beacon “Proposal expired” rejections ─── */
  useEffect(() => {
    const handler = (evt) => {
      if (evt?.reason?.message?.includes('Proposal expired')) {
        console.warn('Ignored Beacon error:', evt.reason.message);
        evt.preventDefault();          // stops Next.js error overlay
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);
  /* ─────────────────────────────────────────────────────────── */

  return (
    <>
      <Head>
        <title>ZeroArt NFT Platform</title>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>

      <WalletProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Component {...pageProps} />
        </ThemeProvider>
      </WalletProvider>
    </>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};
