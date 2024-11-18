// src/components/Terms.js

import React from 'react';
import styled from 'styled-components';
import { Typography, Container, Paper } from '@mui/material';

const StyledContainer = styled(Container)`
  padding: 40px;
  margin: 20px auto;
  max-width: 800px;
`;

const StyledPaper = styled(Paper)`
  padding: 30px;
`;

const Terms = () => {
  return (
    <StyledContainer>
      <StyledPaper elevation={3}>
        <Typography variant="h4" gutterBottom>
          Terms and Conditions
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Last Updated:</strong> November 14, 2023
        </Typography>
        <Typography variant="body2" paragraph>
          Welcome to SaveTheWorldWithArt.io! By accessing or using our platform, you agree to be bound by these Terms and Conditions. Please read them carefully.
        </Typography>

        <Typography variant="h6" gutterBottom>
          1. Acceptance of Terms
        </Typography>
        <Typography variant="body2" paragraph>
          By using SaveTheWorldWithArt.io, you accept these Terms and Conditions in full. If you disagree with any part of these terms, do not use our platform.
        </Typography>

        <Typography variant="h6" gutterBottom>
          2. Use of the Platform
        </Typography>
        <Typography variant="body2" paragraph>
          SaveTheWorldWithArt.io allows artists to create, manage, deploy, and mint NFTs directly on the Tezos blockchain. You agree to use the platform solely for lawful purposes and in a manner that does not infringe the rights of others.
        </Typography>

        <Typography variant="h6" gutterBottom>
          3. Intellectual Property
        </Typography>
        <Typography variant="body2" paragraph>
          You retain ownership of all intellectual property rights in the content you create and upload. By deploying NFTs through our platform, you grant SaveTheWorldWithArt.io a non-exclusive, worldwide, royalty-free license to use, reproduce, and display your content as necessary to provide the services.
        </Typography>

        <Typography variant="h6" gutterBottom>
          4. Disclaimer of Warranties
        </Typography>
        <Typography variant="body2" paragraph>
          The platform is provided "as is" without any warranties of any kind. We do not guarantee the accuracy, reliability, or availability of the platform.
        </Typography>

        <Typography variant="h6" gutterBottom>
          5. Limitation of Liability
        </Typography>
        <Typography variant="body2" paragraph>
          SaveTheWorldWithArt.io shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the platform.
        </Typography>

        <Typography variant="h6" gutterBottom>
          6. Indemnification
        </Typography>
        <Typography variant="body2" paragraph>
          You agree to indemnify and hold harmless SaveTheWorldWithArt.io from any claims, damages, losses, liabilities, and expenses arising out of your use of the platform.
        </Typography>

        <Typography variant="h6" gutterBottom>
          7. Governing Law
        </Typography>
        <Typography variant="body2" paragraph>
          These Terms and Conditions are governed by and construed in accordance with the laws of the jurisdiction in which SaveTheWorldWithArt.io operates.
        </Typography>

        <Typography variant="h6" gutterBottom>
          8. Changes to Terms
        </Typography>
        <Typography variant="body2" paragraph>
          We reserve the right to modify these Terms and Conditions at any time. Any changes will be effective immediately upon posting.
        </Typography>

        <Typography variant="h6" gutterBottom>
          9. Contact Us
        </Typography>
        <Typography variant="body2" paragraph>
          If you have any questions about these Terms and Conditions, please contact us at <a href="mailto:support@savetheworldwithart.io">support@savetheworldwithart.io</a>.
        </Typography>
      </StyledPaper>
    </StyledContainer>
  );
};

export default Terms;
