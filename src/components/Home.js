// src/components/Home.js

import React from 'react';
import styled from 'styled-components';
import { Typography, Container, Button, Grid, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { ReactComponent as Logo } from '../logo.svg'; // Adjust the path if necessary

// Styled Container with responsive padding
const StyledContainer = styled(Container)`
  padding: 40px 20px;
  margin: 20px auto;
  max-width: 800px;
`;

const Home = () => {
  return (
    <StyledContainer maxWidth="lg">
      <Grid
        container
        spacing={4}
        alignItems="center"
        justifyContent="center"
        direction="column" // Set direction to 'column' for all screen sizes
      >
        {/* Welcome Text */}
        <Grid item xs={12}>
          <Box
            sx={{
              textAlign: 'center',
              maxWidth: '800px', // Adjust as needed for your design
              margin: '0 auto',
            }}
          >
            <Typography
              variant="h3"
              gutterBottom
              sx={{ fontSize: { xs: '2rem', md: '3rem' } }}
            >
              Welcome to ZeroContract™
            </Typography>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}
            >
              Empowering artists to create and manage their own on-chain Tezos NFTs effortlessly.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/generate"
              sx={{
                mt: 3,
                px: { xs: 3, md: 6 },
                py: { xs: 1, md: 2 },
                fontSize: { xs: '0.8rem', md: '1rem' },
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  boxShadow: '0 6px 25px rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              Get Started
            </Button>
          </Box>
        </Grid>

        {/* Logo Image */}
        <Grid item xs={12}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center', // Center the logo
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Box
              component={Logo}
              alt="ZeroContract Logo"
              sx={{
                width: { xs: '80%', sm: '60%', md: '50%' },
                maxWidth: '400px',
                height: 'auto',
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </StyledContainer>
  );
};

export default Home;
