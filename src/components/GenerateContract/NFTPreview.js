// src/components/NFTPreview.js
// Summary: NFTPreview – Displays NFT metadata with a responsive media preview.
// This component has been updated to use Emotion for styling.
import React from 'react';
import { Typography, Card, CardContent } from '@mui/material';
import styled from '@emotion/styled';

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
  & iframe {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }
`;

const NFTPreview = ({ metadata }) => {
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
          srcDoc={atob(imageUri.split(',')[1])}
          title={`${name} HTML Preview`}
          style={{ width: '100%', height: '400px', border: 'none' }}
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
        <Typography variant="body2" color="textSecondary">{description}</Typography>
        <Typography variant="body2" color="textSecondary">Type: {type}</Typography>
      </CenteredCardContent>
    </StyledCard>
  );
};

export default NFTPreview;
