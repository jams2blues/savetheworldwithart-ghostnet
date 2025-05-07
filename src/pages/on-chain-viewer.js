/*Developed by @jams2blues with love for the Tezos community
  File: src/pages/on-chain-viewer.js
  Summary: Page wrapper for 3D on-chain NFT viewer — includes header and responsive layout
*/

// File: src/pages/on-chain-viewer.js

import React from 'react';
import { Box, useTheme } from '@mui/material';
import Header from '../components/Header';
import OnChainViewer from '../components/OnChainViewer/OnChainViewer';

export default function OnChain3DViewerPage() {
  const theme = useTheme();
  return (
    <Box sx={{ bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Header />
      <Box sx={{ pt: 2 }}>
        <OnChainViewer />
      </Box>
    </Box>
  );
}
