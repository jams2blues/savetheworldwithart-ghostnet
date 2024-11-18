// src/components/MintBurnTransfer/BalanceOf.js

import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
} from '@mui/material';

const BalanceOf = ({ contractAddress, Tezos, setSnackbar, contractVersion }) => {
  const [ownerAddress, setOwnerAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBalanceOf = async () => {
    // Input Validation
    if (!ownerAddress.trim() || !tokenId.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter both owner address and token ID.',
        severity: 'warning',
      });
      return;
    }

    // Validate Tezos address format
    const isValidTezosAddress = (address) => {
      const regex = /^(tz1|tz2|tz3)[1-9A-HJ-NP-Za-km-z]{33}$/;
      return regex.test(address);
    };

    if (!isValidTezosAddress(ownerAddress)) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid Tezos address.',
        severity: 'warning',
      });
      return;
    }

    // Validate tokenId as a non-negative integer
    const tokenIdNumber = parseInt(tokenId, 10);
    if (isNaN(tokenIdNumber) || tokenIdNumber < 0) {
      setSnackbar({
        open: true,
        message: 'Token ID must be a non-negative integer.',
        severity: 'warning',
      });
      return;
    }

    try {
      setLoading(true);
      const contract = await Tezos.contract.at(contractAddress);
      const storage = await contract.storage();

      // Removed console logs for production

      let fetchedBalance = 0;

      if (contractVersion === 'v1') {
        // v1: ledger is a big_map from token_id (nat) to owner_address (address)
        if (!storage.ledger) {
          throw new Error('Ledger big_map not found in storage for v1 contract.');
        }

        const owner = await storage.ledger.get(tokenIdNumber);

        if (owner && owner.toLowerCase() === ownerAddress.toLowerCase()) {
          fetchedBalance = 1;
        } else {
          fetchedBalance = 0;
        }
      } else if (contractVersion === 'v2') {
        // v2: ledger is a big_map from pair(address, nat) to amount (nat)
        if (!storage.ledger) {
          throw new Error('Ledger big_map not found in storage for v2 contract.');
        }

        // Construct the key as a JavaScript array
        const key = [ownerAddress.trim(), tokenIdNumber];

        // Removed console logs for production

        // Use BigMapAbstraction's get method directly
        const amount = await storage.ledger.get(key);

        fetchedBalance = amount ? parseInt(amount, 10) : 0;
      } else {
        throw new Error('Unsupported contract version.');
      }

      setBalance(fetchedBalance);
      setSnackbar({
        open: true,
        message: `Balance fetched successfully: ${fetchedBalance}`,
        severity: 'success',
      });
    } catch (error) {
      // Removed console.error for production
      setSnackbar({
        open: true,
        message: `Failed to fetch balance: ${error.message}`,
        severity: 'error',
      });
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Typography variant="h6">Check Balance</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Owner Address *"
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
            fullWidth
            placeholder="e.g., tz1..."
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Token ID *"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            fullWidth
            placeholder="e.g., 0"
            type="number"
            InputProps={{ inputProps: { min: 0 } }}
          />
        </Grid>
      </Grid>
      <div style={{ marginTop: '20px' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleBalanceOf}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Checking...' : 'Check Balance'}
        </Button>
      </div>
      {balance !== null && (
        <Typography variant="body1" style={{ marginTop: '20px' }}>
          Balance: {balance}
        </Typography>
      )}
    </div>
  );
};

export default BalanceOf;
