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
} from '@mui/material';
import { WalletContext } from '../../contexts/WalletContext';
import Mint from './Mint';
import Burn from './Burn';
import Transfer from './Transfer';
import BalanceOf from './BalanceOf';
import UpdateOperators from './UpdateOperators';

// Styled Components
const StyledPaper = styled(Paper)`
  padding: 20px;
  margin: 20px auto;
  max-width: 800px;
`;

const Disclaimer = styled.div`
  margin-top: 20px;
  padding: 10px;
  background-color: #fff8e1;
  border-left: 6px solid #ffeb3b;
`;

// Helper function to detect contract version based on entrypoints
const detectContractVersion = (entrypoints) => {
  const v2UniqueEntrypoints = [
    'add_child',
    'add_parent',
    'remove_child',
    'remove_parent',
    'set_pause',
  ];
  
  // Extract all entrypoint names and convert to lowercase for case-insensitive comparison
  const entrypointNames = Object.keys(entrypoints).map(ep => ep.toLowerCase());
  console.log('Entrypoint Names:', entrypointNames);
  
  // Identify which unique v2 entrypoints are present
  const v2EntrypointsPresent = v2UniqueEntrypoints.filter(ep => entrypointNames.includes(ep));
  
  console.log(`v2 unique entrypoints present: ${v2EntrypointsPresent.join(', ')}`);
  
  // Determine contract version based on the presence of unique v2 entrypoints
  return v2EntrypointsPresent.length >= 2 ? 'v2' : 'v1';
};

const MintBurnTransfer = () => {
  const { Tezos, isWalletConnected } = useContext(WalletContext);
  const [contractAddress, setContractAddress] = useState('');
  const [contractMetadata, setContractMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [contractVersion, setContractVersion] = useState('');

  // Function to fetch contract metadata and detect version
  const fetchContractMetadata = async () => {
    if (!contractAddress) {
      setSnackbar({ open: true, message: 'Please enter a contract address.', severity: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const contract = await Tezos.contract.at(contractAddress);
      const entrypointsWrapper = contract.entrypoints; // Access as a property
      console.log('Entrypoints Wrapper:', entrypointsWrapper);
      
      // Correctly access the nested entrypoints object
      const entrypoints = entrypointsWrapper.entrypoints;
      console.log('Entrypoints:', entrypoints);

      // Detect contract version based on entrypoints
      const detectedVersion = detectContractVersion(entrypoints);
      setContractVersion(detectedVersion);
      console.log(`Detected contract version: ${detectedVersion}`);

      // Access the metadata big map
      const storage = await contract.storage();
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
      // Removed console.error for production
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
      <Typography variant="h5" gutterBottom>
        Mint, Burn, and Transfer NFTs
      </Typography>
      <Disclaimer>
        <Typography variant="body2">
          <strong>Disclaimer:</strong> This platform is provided "as is" without any warranties.
          Use at your own risk. Please test thoroughly on Ghostnet before deploying to mainnet.
          This platform works with both single edition (#ZeroContract v1.0) and multiple editions (#ZeroContract v2.0) contracts.
        </Typography>
      </Disclaimer>
      {!isWalletConnected ? (
        <Typography variant="body1">Please connect your wallet to proceed.</Typography>
      ) : (
        <>
          <TextField
            label="Contract Address *"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            fullWidth
            placeholder="e.g., KT1..."
            style={{ marginBottom: '20px', marginTop: '20px' }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={fetchContractMetadata}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Loading...' : 'Load Contract'}
          </Button>
          {contractMetadata && (
            <>
              <Typography variant="h6" style={{ marginTop: '20px' }}>
                {contractMetadata.name} (Version: {contractVersion})
              </Typography>
              {contractMetadata.imageUri && (
                <img
                  src={contractMetadata.imageUri}
                  alt="Contract Thumbnail"
                  style={{ maxWidth: '100%', marginBottom: '20px' }}
                />
              )}
              <Typography variant="body1">{contractMetadata.description}</Typography>
              <div style={{ marginTop: '20px' }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleActionClick('mint')}
                  style={{ marginRight: '10px', marginBottom: '10px' }}
                >
                  Mint
                </Button>
                <Typography variant="body2" style={{ marginBottom: '10px' }}>
                  {contractVersion === 'v2'
                    ? 'Mint multiple editions of an NFT to a recipient.'
                    : 'Mint a single edition NFT to a recipient.'}
                </Typography>

                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => handleActionClick('burn')}
                  style={{ marginRight: '10px', marginBottom: '10px' }}
                >
                  Burn
                </Button>
                <Typography variant="body2" style={{ marginBottom: '10px' }}>
                  {contractVersion === 'v2'
                    ? 'Burn a specified amount of editions of an NFT.'
                    : 'Burn a single edition of an NFT.'}
                </Typography>

                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => handleActionClick('transfer')}
                  style={{ marginRight: '10px', marginBottom: '10px' }}
                >
                  Transfer
                </Button>
                <Typography variant="body2" style={{ marginBottom: '10px' }}>
                  Transfer NFTs from one address to another.
                </Typography>

                <Button
                  variant="contained"
                  color="info"
                  onClick={() => handleActionClick('balance_of')}
                  style={{ marginRight: '10px', marginBottom: '10px' }}
                >
                  Balance Of
                </Button>
                <Typography variant="body2" style={{ marginBottom: '10px' }}>
                  Check the balance of NFTs for a specific owner and token ID.
                </Typography>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleActionClick('update_operators')}
                  style={{ marginBottom: '10px' }}
                >
                  Update Operators
                </Button>
                <Typography variant="body2" style={{ marginBottom: '10px' }}>
                  Add or remove operators who can manage your NFTs on your behalf.
                </Typography>
              </div>
              {/* Render the selected action component */}
              {action === 'mint' && (
                <Mint
                  contractAddress={contractAddress}
                  Tezos={Tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                />
              )}
              {action === 'burn' && (
                <Burn
                  contractAddress={contractAddress}
                  Tezos={Tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                />
              )}
              {action === 'transfer' && (
                <Transfer
                  contractAddress={contractAddress}
                  Tezos={Tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                />
              )}
              {action === 'balance_of' && (
                <BalanceOf
                  contractAddress={contractAddress}
                  Tezos={Tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
                />
              )}
              {action === 'update_operators' && (
                <UpdateOperators
                  contractAddress={contractAddress}
                  Tezos={Tezos}
                  setSnackbar={setSnackbar}
                  contractVersion={contractVersion}
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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </StyledPaper>
  );
};

export default MintBurnTransfer;
