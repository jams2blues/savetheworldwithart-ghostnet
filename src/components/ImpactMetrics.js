// src/components/ImpactMetrics.js

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Typography, Paper, Link } from '@mui/material';
import { getTotalImpact } from '../utils/ecologiApi'; // Ensure this function is correctly implemented

const Container = styled(Paper)`
  padding: 20px;
  margin: 20px;
  text-align: center;
  background-color: #e0f7fa; /* Light blue background for prominence */
`;

const ImpactMetrics = () => {
  const [impact, setImpact] = useState({ trees: 0, carbonOffset: 0 });

  // Fetch environmental impact metrics from the ecologyAPI
  useEffect(() => {
    const fetchImpact = async () => {
      try {
        const data = await getTotalImpact('jams2blues'); // Replace with actual username or handle
        console.log('Fetched Impact Data:', data); // Added for debugging
        setImpact({
          trees: data.trees || 0, // Corrected field name
          carbonOffset: data.carbonOffset || 0,
        });
      } catch (error) {
        console.error('Error fetching impact data:', error);
      }
    };
    fetchImpact();
  }, []);

  return (
    <Container elevation={3}>
      <Typography variant="h5" gutterBottom>
        Save The World With Art™
      </Typography>
      <Typography variant="h6" gutterBottom>
        Total Sustainable Impact
      </Typography>
      <Typography variant="body1">
        🌱 Trees Planted: {impact.trees}
      </Typography>
      <Typography variant="body1">
        🌍 Carbon Offset: {impact.carbonOffset} metric tons
      </Typography>
      <Typography variant="body2" style={{ marginTop: '10px' }}>
        <Link href="https://jams2blues.art/nft" target="_blank" rel="noopener noreferrer">
          Buy Our NFTs HERE
        </Link>
      </Typography>
      <Typography variant="body2" style={{ marginTop: '10px' }}>
        <Link href="https://ecologi.com/jams2blues" target="_blank" rel="noopener noreferrer">
          Verify our impact HERE
        </Link>
      </Typography>
    </Container>
  );
};

export default ImpactMetrics;
