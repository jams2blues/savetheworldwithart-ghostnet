// src/components/Home.js
/* this app was developed by @jams2blues with love for the Tezos community */
import React from 'react';
import { Container, Typography, Button, Box, Grid } from '@mui/material';
import Link from 'next/link';
import { styled } from '@mui/material/styles';

// Styled Logo component using logo.svg from public/images
const Logo = styled('img')({
  width: '80px',
  height: '80px',
  marginBottom: '16px',
});

const Home = () => {
  return (
    <Container sx={{ textAlign: 'center', py: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Logo src="/images/logo.svg" alt="ZeroArt Logo" />
        <Typography variant="h3" sx={{ mb: 2 }}>
          Welcome to The Zero Contract
        </Typography>
        <Typography variant="h6" sx={{ mb: 4 }}>
          Empowering artists to create and manage their own on-chain Tezos NFTs effortlessly.
        </Typography>
      </Box>
      <Grid container spacing={2} justifyContent="center">
        <Grid>
          <Link href="/generate" passHref legacyBehavior>
            <Button variant="contained" color="info" sx={{ px: 3, py: 2 }}>
              Deploy Contract
            </Button>
          </Link>
        </Grid>
        <Grid>
          <Link href="/mint-burn-transfer" passHref legacyBehavior>
            <Button variant="outlined" color="secondary" sx={{ px: 3, py: 2 }}>
              Mint/Burn/Transfer
            </Button>
          </Link>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Home;
