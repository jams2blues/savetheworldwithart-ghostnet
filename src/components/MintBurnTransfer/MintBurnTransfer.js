// frontend/src/components/MintBurnTransfer/MintBurnTransfer.js

import React, { useState, useContext } from 'react';
import styled from 'styled-components';
import {
  Typography,
  Paper,
  Button,
  Snackbar,
  Alert,
  TextField,
  CircularProgress,
  Grid,
  Box,
  Stack,
} from '@mui/material';
import { WalletContext } from '../../contexts/WalletContext';
import Mint from './Mint';
import Burn from './Burn';
import Transfer from './Transfer';
import BalanceOf from './BalanceOf';
import UpdateOperators from './UpdateOperators';
import AddRemoveParentChild from './AddRemoveParentChild';

// Styled Components
const StyledPaper = styled(Paper)`
  padding: 20px;
  margin: 20px auto;
  max-width: 800px;
  width: 95%;
  box-sizing: border-box;

  @media (max-width: 900px) {
    padding: 15px;
    width: 98%;
  }

  @media (max-width: 600px) {
    padding: 10px;
    width: 100%;
  }
`;

const Disclaimer = styled.div`
  margin-top: 20px;
  padding: 10px;
  background-color: #fff8e1;
  border-left: 6px solid #ffeb3b;
  box-sizing: border-box;
`;

const MintBurnTransfer = () => {
  const { tezos, isWalletConnected } = useContext(WalletContext);
  const [contractAddress, setContractAddress] = useState('');
  const [contractMetadata, setContractMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [contractVersion, setContractVersion] = useState('');

  // Function to detect contract version based on storage fields
  const detectContractVersion = (storage) => {
    // v2 has 'all_tokens' and 'total_supply' fields
    if (storage.hasOwnProperty('all_tokens') && storage.hasOwnProperty('total_supply')) {
      return 'v2';
    }
    // Default to v1
    return 'v1';
  };

  // Function to fetch contract metadata and detect version
  const fetchContractMetadata = async () => {
    if (!contractAddress) {
      setSnackbar({ open: true, message: 'Please enter a contract address.', severity: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const contract = await tezos.contract.at(contractAddress);
      const storage = await contract.storage();

      // Detect contract version based on storage fields
      const detectedVersion = detectContractVersion(storage);
      setContractVersion(detectedVersion);
      console.log(`Detected contract version: ${detectedVersion}`);

      // Access the metadata big map
      const metadataMap = storage.metadata;

      // Retrieve the metadata URI from the big map using the empty string key ''
      let metadataURI = await metadataMap.get('');

      if (!metadataURI) {
        throw new Error('Metadata URI not found in contract storage.');
      }

      // Decode metadataURI from hex string to UTF-8 string
      if (typeof metadataURI === 'string') {
        // Check if it's a hex string
        if (/^[0-9a-fA-F]+$/.test(metadataURI)) {
          metadataURI = Buffer.from(metadataURI, 'hex').toString('utf8');
        }
        // Else, it's already a UTF-8 string
      } else if (metadataURI.bytes) {
        metadataURI = Buffer.from(metadataURI.bytes, 'hex').toString('utf8');
      } else {
        throw new Error('Metadata URI has an unexpected type.');
      }

      // Check if metadataURI starts with 'tezos-storage:'
      if (metadataURI.startsWith('tezos-storage:')) {
        const metadataKey = metadataURI.replace('tezos-storage:', '');

        // Retrieve the metadata content from the big map using the key from the URI
        let metadataContent = await metadataMap.get(metadataKey);

        if (!metadataContent) {
          throw new Error(`Metadata content not found in contract storage for key '${metadataKey}'.`);
        }

        // Decode metadataContent from hex string to UTF-8 string
        if (typeof metadataContent === 'string') {
          // Check if it's a hex string
          if (/^[0-9a-fA-F]+$/.test(metadataContent)) {
            metadataContent = Buffer.from(metadataContent, 'hex').toString('utf8');
          }
          // Else, it's already a UTF-8 string
        } else if (metadataContent.bytes) {
          metadataContent = Buffer.from(metadataContent.bytes, 'hex').toString('utf8');
        } else {
          throw new Error('Metadata content has an unexpected type.');
        }

        // Parse the JSON metadata
        const metadata = JSON.parse(metadataContent);
        setContractMetadata(metadata);
      } else {
        throw new Error('Unsupported metadata URI scheme. Expected "tezos-storage:".');
      }

      setSnackbar({ open: true, message: `Contract metadata loaded (Version: ${detectedVersion}).`, severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
      setContractVersion('');
      setContractMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle action button clicks
  const handleActionClick = (selectedAction) => {
    setAction(selectedAction);
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <StyledPaper elevation={3}>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
        Mint, Burn, and Transfer NFTs
      </Typography>
      <Disclaimer>
        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
          <strong>Disclaimer:</strong> This platform is provided "as is" without any warranties. Use at your own risk.
          Please test thoroughly on Ghostnet before deploying to mainnet. This platform works with both single edition
          (#ZeroContract v1.0) and multiple editions (#ZeroContract v2.0) contracts.
        </Typography>
      </Disclaimer>
      {!isWalletConnected ? (
        <Typography variant="body1" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}>
          Please connect your wallet to proceed.
        </Typography>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <TextField
                label="Contract Address *"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                fullWidth
                placeholder="e.g., KT1..."
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={fetchContractMetadata}
                disabled={loading}
                startIcon={loading && <CircularProgress size={20} />}
                fullWidth
                sx={{ height: '50px', fontSize: { xs: '0.8rem', md: '1rem' } }}
              >
                {loading ? 'Loading...' : 'Load Contract'}
              </Button>
            </Grid>
          </Grid>
          {contractMetadata && (
            <>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    {contractMetadata.name} (Version: {contractVersion})
                  </Typography>
                  {contractMetadata.imageUri && (
                    <Box
                      component="img"
                      src={contractMetadata.imageUri}
                      alt="Contract Thumbnail"
                      sx={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: { xs: '150px', md: '200px' },
                        mt: 1,
                        objectFit: 'contain', // Prevent image distortion
                        backgroundColor: '#f5f5f5', // Optional: for images with transparency
                        borderRadius: '8px', // Optional: add rounded corners
                      }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ fontSize: { xs: '0.85rem', md: '1rem' } }}>
                    {contractMetadata.description}
                  </Typography>
                </Grid>
              </Grid>
              <Grid container spacing={2} sx={{ mt: 3 }}>
                <Grid item xs={12}>
                  {/* Use Stack for vertical stacking */}
                  <Stack
                    direction="column"
                    spacing={2}
                    alignItems="center"
                    sx={{ width: '100%' }}
                  >
                    {/* Mint Button and Description */}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems="center"
                      sx={{ width: '100%', maxWidth: '300px' }}
                    >
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => handleActionClick('mint')}
                        fullWidth
                        sx={{
                          fontSize: { xs: '0.875rem', md: '1rem' },
                        }}
                      >
                        Mint
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      {contractVersion === 'v2'
                        ? 'Mint multiple editions of an NFT to a recipient.'
                        : 'Mint a single edition NFT to a recipient.'}
                    </Typography>

                    {/* Burn Button and Description */}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems="center"
                      sx={{ width: '100%', maxWidth: '300px' }}
                    >
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => handleActionClick('burn')}
                        fullWidth
                        sx={{
                          fontSize: { xs: '0.875rem', md: '1rem' },
                        }}
                      >
                        Burn
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      {contractVersion === 'v2'
                        ? 'Burn a specified amount of editions of an NFT.'
                        : 'Burn a single edition of an NFT.'}
                    </Typography>

                    {/* Transfer Button and Description */}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems="center"
                      sx={{ width: '100%', maxWidth: '300px' }}
                    >
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={() => handleActionClick('transfer')}
                        fullWidth
                        sx={{
                          fontSize: { xs: '0.875rem', md: '1rem' },
                        }}
                      >
                        Transfer
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      Transfer NFTs from one address to another.
                    </Typography>

                    {/* Balance Of Button and Description */}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems="center"
                      sx={{ width: '100%', maxWidth: '300px' }}
                    >
                      <Button
                        variant="contained"
                        color="info"
                        onClick={() => handleActionClick('balance_of')}
                        fullWidth
                        sx={{
                          fontSize: { xs: '0.875rem', md: '1rem' },
                        }}
                      >
                        Balance Of
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      Check the balance of NFTs for a specific owner.
                    </Typography>

                    {/* Update Operators Button and Description */}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems="center"
                      sx={{ width: '100%', maxWidth: '300px' }}
                    >
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleActionClick('update_operators')}
                        fullWidth
                        sx={{
                          fontSize: { xs: '0.875rem', md: '1rem' },
                        }}
                      >
                        Update Operators
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      Add or remove operators who can manage your NFTs on your behalf.
                    </Typography>

                    {/* Add/Remove Parent Buttons */}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems="center"
                      sx={{ width: '100%', maxWidth: '300px' }}
                    >
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleActionClick('add_parent')}
                        fullWidth
                        sx={{
                          fontSize: { xs: '0.875rem', md: '1rem' },
                        }}
                      >
                        Add Parent
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => handleActionClick('remove_parent')}
                        fullWidth
                        sx={{
                          fontSize: { xs: '0.875rem', md: '1rem' },
                        }}
                      >
                        Remove Parent
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      Manage parent relationships for your NFTs.
                    </Typography>

                    {/* Add/Remove Child Buttons */}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems="center"
                      sx={{ width: '100%', maxWidth: '300px' }}
                    >
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleActionClick('add_child')}
                        fullWidth
                        sx={{
                          fontSize: { xs: '0.875rem', md: '1rem' },
                        }}
                      >
                        Add Child
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => handleActionClick('remove_child')}
                        fullWidth
                        sx={{
                          fontSize: { xs: '0.875rem', md: '1rem' },
                        }}
                      >
                        Remove Child
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      Manage child relationships for your NFTs.
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
              {/* Render the selected action component */}
              {action === 'mint' && (
                <Mint
                  contractAddress={contractAddress}
                  tezos={tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                />
              )}
              {action === 'burn' && (
                <Burn
                  contractAddress={contractAddress}
                  tezos={tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                />
              )}
              {action === 'transfer' && (
                <Transfer
                  contractAddress={contractAddress}
                  tezos={tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                />
              )}
              {action === 'balance_of' && (
                <BalanceOf
                  contractAddress={contractAddress}
                  tezos={tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                />
              )}
              {action === 'update_operators' && (
                <UpdateOperators
                  contractAddress={contractAddress}
                  tezos={tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                />
              )}
              {(action === 'add_parent' || action === 'remove_parent' || action === 'add_child' || action === 'remove_child') && (
                <AddRemoveParentChild
                  contractAddress={contractAddress}
                  tezos={tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                  actionType={action} // Pass the specific action type
                />
              )}
            </>
          )}
        </>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </StyledPaper>
  );
};

export default MintBurnTransfer;
