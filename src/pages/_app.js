// src/pages/_app.js
// Summary: Custom App – wraps the application with WalletContext and MUI theme providers, and injects global CSS.
/* this app was developed by @jams2blues with love for the Tezos community */
import React from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import { WalletProvider } from '../contexts/WalletContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '../styles/globals.css';

const theme = createTheme({
  palette: {
    primary: { main: '#006400' },  // dark green
    secondary: { main: '#f50057' },
  },
});

export default function MyApp({ Component, pageProps }) {
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
