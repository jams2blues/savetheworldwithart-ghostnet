// src/components/NFTPreview.js

import React from 'react';
import { Typography, Card, CardContent } from '@mui/material';
import styled from 'styled-components';

const StyledCard = styled(Card)`
  margin-top: 20px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  @media (max-width: 600px) {
    max-width: 90%;
  }
`;

const CenteredCardContent = styled(CardContent)`
  text-align: center;
`;

const NFTPreview = ({ metadata }) => {
  if (!metadata) return null;

  const { name, description, type, imageUri } = metadata;

  const renderMedia = () => {
    if (imageUri.startsWith('data:image')) {
      return (
        <img src={imageUri} alt={`${name} Thumbnail`} style={{ maxWidth: '100%', height: 'auto' }} />
      );
    }
    if (imageUri.startsWith('data:video')) {
      return (
        <video src={imageUri} controls style={{ maxWidth: '100%', height: 'auto' }} />
      );
    }
    if (imageUri.startsWith('data:text/html')) {
      return (
        <iframe
          srcDoc={atob(imageUri.split(',')[1])}
          title={`${name} HTML Preview`}
          style={{ width: '100%', height: '400px', border: 'none' }}
        ></iframe>
      );
    }
    return <Typography variant="body2">Unsupported media type.</Typography>;
  };

  return (
    <StyledCard>
      {renderMedia()}
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
