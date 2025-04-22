/*Developed by @jams2blues with love for the Tezos community
  File: src/pages/_app.js
  Summary: Global wrapper – **SSR‑safe color‑mode** (cookie) + wallet + robust
           error handling. Removes the hydration warning you saw in 🌙 mode.
*/

import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import App from 'next/app';
import Head from 'next/head';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { WalletProvider } from '../contexts/WalletContext';
import ColorModeContext from '../contexts/ColorModeContext';
import '../styles/globals.css';

const COLOR_COOKIE = 'ZEROART_COLOR_MODE';

/* ─── helpers ──────────────────────────────────────────────────── */
const readCookie = (str, name) => {
  const m = str?.match(new RegExp(`${name}=(light|dark)`));
  return m ? m[1] : null;
};

const buildTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#006400' },
      secondary: { main: '#f50057' },
      background: {
        default: mode === 'dark' ? '#121212' : '#fafafa',
        paper: mode === 'dark' ? '#1e1e1e' : '#fff',
      },
    },
  });

/* ─── minimal error boundary (unchanged) ───────────────────────── */
class AppBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e, info) { console.error('ZeroArt caught a React error:', e, info); }
  render() {
    if (this.state.hasError)
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh or contact @jams2blues if the issue persists.</p>
        </div>
      );
    return this.props.children;
  }
}

/* ─── main app ─────────────────────────────────────────────────── */
function MyApp({ Component, pageProps, initialMode }) {
  const [mode, setMode] = useState(initialMode);

  /* client‑side sync with localStorage / cookie */
  useEffect(() => {
    const stored = localStorage.getItem(COLOR_COOKIE);
    if (stored && (stored === 'light' || stored === 'dark') && stored !== mode) {
      setMode(stored);
    } else if (!stored) {
      localStorage.setItem(COLOR_COOKIE, mode);
    }
  }, []); // once

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () =>
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light';
          /* persist for SSR */
          localStorage.setItem(COLOR_COOKIE, next);
          document.cookie = `${COLOR_COOKIE}=${next}; path=/; max-age=31536000`;
          return next;
        }),
    }),
    [mode]
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  /* swallow noisy Beacon/WalletConnect errors (unchanged) */
  useEffect(() => {
    const ignoreMsgs = ['Proposal expired', 'pairing request reset', 'Failed or Rejected message'];
    const isIgnorable = (msg = '') => ignoreMsgs.some((m) => msg.includes(m));
    const rejectionHandler = (evt) => {
      if (isIgnorable(evt?.reason?.message)) { evt.preventDefault(); }
    };
    const errorHandler = (evt) => {
      if (isIgnorable(evt?.error?.message)) { evt.preventDefault(); return false; }
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
        <meta name="theme-color" content={theme.palette.primary.main} />
      </Head>

      <WalletProvider>
        <ColorModeContext.Provider value={colorMode}>
          <ThemeProvider theme={theme}>
            <CssBaseline enableColorScheme />
            <AppBoundary>
              <Component {...pageProps} />
            </AppBoundary>
          </ThemeProvider>
        </ColorModeContext.Provider>
      </WalletProvider>
    </>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps:    PropTypes.object.isRequired,
  initialMode:  PropTypes.oneOf(['light', 'dark']).isRequired,
};

MyApp.defaultProps = { initialMode: 'light' };

/* ─── getInitialProps – sets initialMode during SSR ────────────── */
MyApp.getInitialProps = async (appCtx) => {
  const props      = await App.getInitialProps(appCtx);
  const cookieStr  = appCtx.ctx.req?.headers?.cookie || '';
  const cookieMode = readCookie(cookieStr, COLOR_COOKIE);
  return { ...props, initialMode: cookieMode || 'light' };
};

export default MyApp;
