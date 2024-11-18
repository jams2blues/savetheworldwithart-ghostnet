// src/components/Home.js
import React from 'react';
import styled from 'styled-components';
import { Typography, Container, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const StyledContainer = styled(Container)`
  padding: 40px;
  text-align: center;
`;

const Home = () => {
  return (
    <StyledContainer>
      <Typography variant="h3" gutterBottom>
        Welcome to SaveTheWorldWithArt™
      </Typography>
      <Typography variant="h6" gutterBottom>
        Empowering artists to create and manage their own on-chain Tezos NFTs effortlessly.
      </Typography>
      <Button variant="contained" color="primary" component={Link} to="/generate">
        Get Started
      </Button>
    </StyledContainer>
  );
};

export default Home;
