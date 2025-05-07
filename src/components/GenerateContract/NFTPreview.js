/*Developed by @jams2blues with love for the Tezos community
  File: src/components/GenerateContract/NFTPreview.js
  Summary: NFTPreview – Displays NFT metadata with responsive media preview including 3D models.
*/

import React, { useEffect } from 'react';
import { Typography, Card, CardContent } from '@mui/material';
import styled from '@emotion/styled';

/* styles */
const StyledCard = styled(Card)`
  margin-top: 20px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  @media (max-width: 600px) {
    max-width: 90%;
  }
`;

const CenteredCardContent = styled(CardContent)`
  text-align: center;
`;

const ResponsiveMedia = styled('div')`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  & img,
  & video,
  & iframe,
  & model-viewer {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }
`;

/* component */
const NFTPreview = ({ metadata }) => {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      !window.customElements?.get('model-viewer')
    ) {
      const s = document.createElement('script');
      s.type = 'module';
      s.async = true;
      s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(s);
    }
  }, []);

  if (!metadata) return null;
  const { name, description, type, imageUri } = metadata;

  const renderMedia = () => {
    if (imageUri.startsWith('data:image')) {
      return <img src={imageUri} alt={`${name} Thumbnail`} />;
    }
    if (imageUri.startsWith('data:video')) {
      return <video src={imageUri} controls />;
    }
    if (imageUri.startsWith('data:text/html')) {
      return (
        <iframe
          srcDoc={atob(imageUri.split(',')[1] || '')}
          title={`${name} HTML Preview`}
          style={{ width: '100%', height: '400px', border: 'none' }}
        />
      );
    }
    if (
      imageUri.startsWith('data:model') ||
      /\.(glb|gltf)(\?|$)/i.test(imageUri)
    ) {
      return (
        <model-viewer
          src={imageUri}
          alt={`${name} 3D Preview`}
          camera-controls
          auto-rotate
          style={{
            width: '100%',
            height: '400px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        />
      );
    }
    return <Typography variant="body2">Unsupported media type.</Typography>;
  };

  return (
    <StyledCard>
      <ResponsiveMedia>
        {renderMedia()}
      </ResponsiveMedia>
      <CenteredCardContent>
        <Typography variant="h6">{name}</Typography>
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Type: {type}
        </Typography>
      </CenteredCardContent>
    </StyledCard>
  );
};

export default NFTPreview;
