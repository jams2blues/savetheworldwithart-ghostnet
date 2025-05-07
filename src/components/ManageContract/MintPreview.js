/*Developed by @jams2blues with love for the Tezos community
  File: src/components/ManageContract/MintPreview.js
  Summary: Renders a single unified preview of uploaded NFT artifacts, theme-aware background
*/

import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { Box, Typography, useTheme } from '@mui/material';

/* ─── styled helpers ───────────────────────────────────────────── */
const Section = styled(Box)`
  margin-bottom: 30px;
`;

/* ─── inject <model-viewer> for 3D support ───────────────────────── */
const ensureModelViewer = () => {
  if (typeof window !== 'undefined' && !window.customElements?.get('model-viewer')) {
    const script = document.createElement('script');
    script.type = 'module';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    document.head.appendChild(script);
  }
};

/* ─── main component ───────────────────────────────────────────── */
const MintPreview = ({ dataUrl, fileName }) => {
  const theme = useTheme();
  useEffect(ensureModelViewer, []);

  if (!dataUrl) return null;

  const bg = theme.palette.mode === 'dark'
    ? theme.palette.background.paper
    : '#f5f5f5';

  const renderMedia = () => {
    if (dataUrl.startsWith('data:image')) {
      return (
        <Box
          component="img"
          src={dataUrl}
          alt={fileName}
          sx={{
            maxWidth: '100%',
            maxHeight: 300,
            objectFit: 'contain',
            borderRadius: 1,
            backgroundColor: bg,
          }}
        />
      );
    }
    if (dataUrl.startsWith('data:video')) {
      return (
        <Box
          component="video"
          src={dataUrl}
          controls
          sx={{
            maxWidth: '100%',
            maxHeight: 300,
            borderRadius: 1,
            backgroundColor: bg,
          }}
        />
      );
    }
    if (dataUrl.startsWith('data:model/')) {
      // @ts-ignore
      return (
        <model-viewer
          src={dataUrl}
          alt={fileName}
          camera-controls
          auto-rotate
          style={{
            width: '100%',
            height: 300,
            backgroundColor: bg,
            borderRadius: '8px',
          }}
        />
      );
    }
    if (dataUrl.startsWith('data:text/html')) {
      const html = atob(dataUrl.split(',')[1] || '');
      return (
        <Box
          component="iframe"
          srcDoc={html}
          title={fileName}
          sx={{
            width: '100%',
            height: 300,
            border: 'none',
            borderRadius: 1,
            backgroundColor: bg,
          }}
        />
      );
    }
    if (dataUrl.startsWith('data:text/plain') || dataUrl.startsWith('data:application/json')) {
      const text = atob(dataUrl.split(',')[1] || '');
      return (
        <Box
          sx={{
            maxHeight: 300,
            overflow: 'auto',
            p: 1,
            bgcolor: bg,
            borderRadius: 1,
          }}
        >
          <Typography
            component="pre"
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'text.primary',
              m: 0,
            }}
          >
            {text}
          </Typography>
        </Box>
      );
    }
    return (
      <Typography variant="body2">
        Preview not available for this format.
      </Typography>
    );
  };

  return (
    <Section>
      <Typography variant="body1" sx={{ mb: 1 }}>
        Preview:
      </Typography>
      {renderMedia()}
    </Section>
  );
};

export default MintPreview;
