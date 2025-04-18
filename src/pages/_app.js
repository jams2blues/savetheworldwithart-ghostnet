/*Developed by @jams2blues with love for the Tezos community
  File: src/pages/_app.js
  Summary: Global wrapper – theme + wallet + **robust error‑handling**.
           Silences known transient Beacon/WalletConnect errors, adds a
           lightweight React Error Boundary, and remains 100 % compatible
           with the rest of the ZeroArt stack.
*/
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { WalletProvider } from '../contexts/WalletContext';
import '../styles/globals.css';

/* ─── MUI theme (unchanged) ────────────────────────────────────── */
const theme = createTheme({
  palette: {
    primary: { main: '#006400' },      // dark green
    secondary: { main: '#f50057' },    // pink
  },
});

/* ─── Minimal React Error‑Boundary (no extra deps) ─────────────── */
class AppBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // TODO: plug into Sentry/PostHog if desired
    console.error('ZeroArt caught a React error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh or contact @jams2blues if the issue persists.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Main component ───────────────────────────────────────────── */
export default function MyApp({ Component, pageProps }) {
  /* Swallow noisy but harmless transport errors from Beacon/WalletConnect */
  useEffect(() => {
    const ignoreMsgs = ['Proposal expired', 'pairing request reset', 'Failed or Rejected message'];
    const isIgnorable = (msg = '') => ignoreMsgs.some((m) => msg.includes(m));

    const rejectionHandler = (evt) => {
      if (isIgnorable(evt?.reason?.message)) {
        if (process.env.NODE_ENV !== 'production')
          console.warn('Ignored promise‑rejection:', evt.reason.message);
        evt.preventDefault();
      }
    };
    const errorHandler = (evt) => {
      if (isIgnorable(evt?.error?.message)) {
        if (process.env.NODE_ENV !== 'production')
          console.warn('Ignored window error:', evt.error.message);
        evt.preventDefault();
        return false;
      }
    };
    window.addEventListener('unhandledrejection', rejectionHandler);
    window.addEventListener('error', errorHandler);
    return () => {
      window.removeEventListener('unhandledrejection', rejectionHandler);
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  return (
    <>
      <Head>
        <title>ZeroArt NFT Platform</title>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>

      <WalletProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppBoundary>
            <Component {...pageProps} />
          </AppBoundary>
        </ThemeProvider>
      </WalletProvider>
    </>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};
