/*Developed by @jams2blues with love for the Tezos community
  File: src/components/Terms.js
  Summary: Responsive Terms & Conditions page with updated links/disclaimers
*/
import React from 'react';
import styled from 'styled-components';
import {
  Typography,
  Container,
  Paper,
  Link,
  Alert,
  Box,
  Divider,
} from '@mui/material';

const Section = styled(Box)`margin-bottom:20px;`;
const StyledContainer = styled(Container)`
  padding: 40px;
  margin: 20px auto;
  max-width: 800px;
`;
const StyledPaper = styled(Paper)`padding:30px;`;

const Terms = () => (
  <StyledContainer>
    <StyledPaper elevation={3}>
      {/* Global Disclaimer (visible on all pages) */}
      <Section>
        <Alert severity="warning">
          <Typography variant="body2">
            <strong>Disclaimer:</strong> By deploying contracts and NFTs via this
            platform, you accept full responsibility for your on‑chain actions.
            On Tezos, contracts are immutable and cannot be altered once
            deployed. Always test thoroughly on&nbsp;
            <Link
              href="https://ghostnet.savetheworldwithart.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ghostnet
            </Link>{' '}
            before deploying to mainnet. This platform is provided “as is”
            without warranties; use at your own risk.
          </Typography>
        </Alert>
      </Section>

      <Typography variant="h4" gutterBottom>
        Terms and Conditions
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Last Updated:</strong> April 05 2025
      </Typography>

      {/* Core sections */}
      {[
        ['1. Acceptance of Terms',
          'By using ZeroArt, you agree to these Terms in full. If you disagree, do not use the platform.'],
        ['2. Use of the Platform',
          'ZeroArt enables artists to deploy and manage on‑chain NFT smart contracts. You may use it only for lawful purposes.'],
        ['3. Intellectual Property',
          'You retain all rights to the content you create. By deploying NFTs, you grant ZeroArt a license to display that content solely to provide the service.'],
        ['4. Disclaimer of Warranties',
          'The platform is provided “as is.” We make no guarantees of uninterrupted or error‑free service.'],
        ['5. Limitation of Liability',
          'ZeroArt shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the platform.'],
        ['6. Indemnification',
          'You agree to indemnify and hold harmless ZeroArt from any claims arising out of your use of the platform.'],
        ['7. Governing Law',
          'These Terms are governed by the laws of the jurisdiction in which ZeroArt operates.'],
        ['8. Changes to Terms',
          'We may modify these Terms at any time. Changes take effect immediately upon posting.'],
      ].map(([title, text]) => (
        <Section key={title}>
          <Typography variant="h6" gutterBottom>{title}</Typography>
          <Typography variant="body2" paragraph>{text}</Typography>
        </Section>
      ))}

      <Divider sx={{ my: 3 }} />

      {/* ZeroContract explanation */}
      <Typography variant="h6" gutterBottom>
        9. How #ZeroContracts Work
      </Typography>
      <Typography variant="body2" paragraph>
        ZeroArt currently supports three contract versions:
        <strong> V1</strong> (single edition),
        <strong> V2</strong> (multi‑edition),
        <strong> V3</strong> (advanced + collaborators).
        Each exposes the following entrypoints:
      </Typography>
      <ul style={{ marginTop: 0 }}>
        {[
          'mint – create new NFTs',
          'burn – permanently remove NFTs',
          'transfer – send NFTs between addresses',
          'balance_of – query balances',
          'update_operators – manage operator permissions',
          'add/remove_parent & add/remove_child – hierarchical links',
          'add/remove_collaborator – V3 batch collaborator control',
        ].map((item) => <li key={item}><Typography variant="body2">{item}</Typography></li>)}
      </ul>

      <Divider sx={{ my: 3 }} />

      {/* Attribution */}
      <Typography variant="body2" paragraph>
        <strong>Designed by </strong>
        <Link href="https://x.com/jams2blues" target="_blank" rel="noopener noreferrer">
          @jams2blues
        </Link>{' '}
        – contracts by{' '}
        <Link href="https://x.com/JestemZero" target="_blank" rel="noopener noreferrer">
          @JestemZero
        </Link>.
      </Typography>
    </StyledPaper>
  </StyledContainer>
);

export default Terms;
