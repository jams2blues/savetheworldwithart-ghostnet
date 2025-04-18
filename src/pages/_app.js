/*Developed by @jams2blues with love for the Tezos community
  File: src/pages/_app.js
  Summary: Global app wrapper with Theme, WalletProvider and guards that
           swallow Beacon / WalletConnect “Proposal expired” errors in both
           promise‑rejection *and* synchronous Error forms.
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
  /* ── Swallow any “Proposal expired” noise so UI never crashes ── */
  useEffect(() => {
    const rejectionHandler = (evt) => {
      if (evt?.reason?.message?.includes('Proposal expired')) {
        console.warn('Ignored Beacon promise‑rejection:', evt.reason.message);
        evt.preventDefault();
      }
    };
    const errorHandler = (evt) => {
      if (evt?.error?.message?.includes('Proposal expired')) {
        console.warn('Ignored WalletConnect error:', evt.error.message);
        evt.preventDefault();
        return false;            // suppresses browser console red text
      }
    };
    window.addEventListener('unhandledrejection', rejectionHandler);
    window.addEventListener('error', errorHandler);
    return () => {
      window.removeEventListener('unhandledrejection', rejectionHandler);
      window.removeEventListener('error', errorHandler);
    };
  }, []);
  /* ───────────────────────────────────────────────────────────── */

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
