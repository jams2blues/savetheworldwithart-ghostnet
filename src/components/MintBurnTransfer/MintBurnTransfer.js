/* Developed by @jams2blues with love for the Tezos community
   File: src/components/MintBurnTransfer/MintBurnTransfer.js
   Summary: Main interface for minting, burning, transferring, checking balances,
   updating operators, and managing parent/child relationships for NFT contracts.
   Now includes a button to manage collaborators for V3 contracts.
*/
import React, { useState, useContext } from 'react';
import styled from '@emotion/styled';
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
import { Buffer } from 'buffer';
import { WalletContext } from '../../contexts/WalletContext';
import Mint from './Mint';
import Burn from './Burn';
import Transfer from './Transfer';
import BalanceOf from './BalanceOf';
import UpdateOperators from './UpdateOperators';
import AddRemoveParentChild from './AddRemoveParentChild';
import AddRemoveCollaborator from './AddRemoveCollaborator';
import ManageCollaborators from './ManageCollaborators'; // <-- New import

const StyledPaper = styled(Paper)`
  padding: 20px;
  margin: 20px auto;
  max-width: 800px;
  width: 95%;
  box-sizing: border-box;
`;

const Disclaimer = styled('div')`
  margin-top: 20px;
  padding: 10px;
  background-color: #fff8e1;
  border-left: 6px solid #ffeb3b;
  box-sizing: border-box;
`;

/**
 * Returns a label for the detected contract version.
 */
function getContractVersionLabel(version) {
  switch (version) {
    case 'v1':
      return '(Zero Contract Version 1)';
    case 'v2':
      return '(Zero Contract Version 2)';
    case 'v3':
      return '(Zero Contract Version 3)';
    default:
      return '(Unknown Contract Version)';
  }
}

/**
 * Detects the contract version from the storage.
 * - If storage has a 'contract_id' field that decodes to "ZeroContract", it's v3.
 * - If storage contains both 'all_tokens' and 'total_supply', it's v2.
 * - Otherwise, it's v1.
 */
function detectContractVersion(storage) {
  if (typeof storage.contract_id !== 'undefined') {
    let rawHex = storage.contract_id;
    if (rawHex.startsWith('0x')) {
      rawHex = rawHex.slice(2);
    }
    const ascii = Buffer.from(rawHex, 'hex').toString('utf8');
    if (ascii === 'ZeroContract') {
      return 'v3';
    }
  }
  if (
    typeof storage.all_tokens !== 'undefined' &&
    typeof storage.total_supply !== 'undefined'
  ) {
    return 'v2';
  }
  return 'v1';
}

const MintBurnTransfer = () => {
  const { tezos, isWalletConnected } = useContext(WalletContext);
  const [contractAddress, setContractAddress] = useState('');
  const [contractMetadata, setContractMetadata] = useState(null);
  const [contractVersion, setContractVersion] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Fetch contract metadata from the blockchain and detect the contract version.
  const fetchContractMetadata = async () => {
    if (!contractAddress) {
      setSnackbar({ open: true, message: 'Please enter a contract address.', severity: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const contract = await tezos.contract.at(contractAddress);
      const storage = await contract.storage();

      // Detect the contract version using our helper function.
      const detectedVersion = detectContractVersion(storage);
      setContractVersion(detectedVersion);

      // Retrieve metadata from the big_map in storage.
      if (!storage.metadata) {
        throw new Error('Metadata big_map not found in contract storage.');
      }
      const metadataMap = storage.metadata;
      let metadataURI = await metadataMap.get('');
      if (!metadataURI) {
        throw new Error('Metadata URI not found in contract storage.');
      }
      if (typeof metadataURI === 'string') {
        if (/^[0-9a-fA-F]+$/.test(metadataURI)) {
          metadataURI = Buffer.from(metadataURI, 'hex').toString('utf8');
        }
      } else if (metadataURI.bytes) {
        metadataURI = Buffer.from(metadataURI.bytes, 'hex').toString('utf8');
      } else {
        throw new Error('Metadata URI has an unexpected type.');
      }
      if (!metadataURI.startsWith('tezos-storage:')) {
        throw new Error('Unsupported metadata URI scheme. Expected "tezos-storage:".');
      }
      const metadataKey = metadataURI.replace('tezos-storage:', '');
      let metadataContent = await metadataMap.get(metadataKey);
      if (!metadataContent) {
        throw new Error(`Metadata content not found in contract storage for key '${metadataKey}'.`);
      }
      if (typeof metadataContent === 'string') {
        if (/^[0-9a-fA-F]+$/.test(metadataContent)) {
          metadataContent = Buffer.from(metadataContent, 'hex').toString('utf8');
        }
      } else if (metadataContent.bytes) {
        metadataContent = Buffer.from(metadataContent.bytes, 'hex').toString('utf8');
      } else {
        throw new Error('Metadata content has an unexpected type.');
      }
      const parsedMetadata = JSON.parse(metadataContent);
      setContractMetadata(parsedMetadata);
      setSnackbar({
        open: true,
        message: `Contract metadata loaded ${getContractVersionLabel(detectedVersion)}.`,
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
      setContractVersion('');
      setContractMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  // Set the active action for mint, burn, transfer, etc.
  const handleActionClick = (selectedAction) => {
    setAction(selectedAction);
  };

  return (
    <StyledPaper elevation={3}>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
        Mint, Burn, and Transfer NFTs
      </Typography>
      <Disclaimer>
        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
          <strong>Disclaimer:</strong> This platform is provided "as is" without any warranties.
          Use at your own risk. Please test thoroughly on Ghostnet before deploying to mainnet.
          This platform supports single edition (Zero Contract Version 1), multiple edition (Zero Contract Version 2),
          and advanced (Zero Contract Version 3) contracts.
        </Typography>
      </Disclaimer>
      {!isWalletConnected ? (
        <Typography variant="body1" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}>
          Please connect your wallet to proceed.
        </Typography>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Contract Address *"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                fullWidth
                placeholder="e.g., KT1..."
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={fetchContractMetadata}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
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
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    {contractMetadata.name} {getContractVersionLabel(contractVersion)}
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
                        objectFit: 'contain',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                      }}
                    />
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body1" sx={{ fontSize: { xs: '0.85rem', md: '1rem' } }}>
                    {contractMetadata.description}
                  </Typography>
                </Grid>
              </Grid>
              <Grid container spacing={2} sx={{ mt: 3 }}>
                <Grid size={{ xs: 12 }}>
                  <Stack direction="column" spacing={2} alignItems="center" sx={{ width: '100%' }}>
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
                        sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                      >
                        Mint
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      {contractVersion === 'v2'
                        ? 'Mint multiple editions to a recipient.'
                        : contractVersion === 'v3'
                        ? 'Mint with advanced V3 features.'
                        : 'Mint a single edition to a recipient.'}
                    </Typography>
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
                        sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                      >
                        Burn
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      {contractVersion === 'v2' || contractVersion === 'v3'
                        ? 'Burn a specified number of editions.'
                        : 'Burn a single edition.'}
                    </Typography>
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
                        sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                      >
                        Transfer
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      Transfer NFTs from one address to another.
                    </Typography>
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
                        sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                      >
                        Balance Of
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      Check the balance of NFTs for a given address.
                    </Typography>
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
                        sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                      >
                        Update Operators
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      Manage who can operate your NFTs.
                    </Typography>
                    {/* NEW: Only for V3 contracts */}
                    {contractVersion === 'v3' && (
                      <>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          alignItems="center"
                          sx={{ width: '100%', maxWidth: '300px' }}
                        >
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => handleActionClick('collaborators')}
                            fullWidth
                            sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                          >
                            Add/Remove Collaborators
                          </Button>
                        </Stack>
                        <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                          Use the field to add multiple addresses (comma-separated).
                        </Typography>
                        <ManageCollaborators
                          contractAddress={contractAddress}
                          tezos={tezos}
                          setSnackbar={setSnackbar}
                        />
                      </>
                    )}
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
                        sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                      >
                        Add Parent
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => handleActionClick('remove_parent')}
                        fullWidth
                        sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                      >
                        Remove Parent
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: '300px' }}>
                      Manage parent relationships for your NFTs.
                    </Typography>
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
                        sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                      >
                        Add Child
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => handleActionClick('remove_child')}
                        fullWidth
                        sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
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
              {/* Render selected action component */}
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
              {(action === 'add_parent' ||
                action === 'remove_parent' ||
                action === 'add_child' ||
                action === 'remove_child') && (
                <AddRemoveParentChild
                  contractAddress={contractAddress}
                  tezos={tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                  actionType={action}
                />
              )}
              {action === 'collaborators' && contractVersion === 'v3' && (
                <AddRemoveCollaborator
                  contractAddress={contractAddress}
                  tezos={tezos}
                  setSnackbar={setSnackbar}
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
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </StyledPaper>
  );
};

export default MintBurnTransfer;
