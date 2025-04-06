/* Developed by @jams2blues with love for the Tezos community
   File: src/components/MintBurnTransfer/BalanceOf.js
   Summary: Component to check NFT balance for a given owner address and token ID.
*/
import React, { useState } from 'react';
import { Typography, TextField, Button, CircularProgress, Grid } from '@mui/material';

const BalanceOf = ({ contractAddress, tezos, setSnackbar, contractVersion }) => {
  const [ownerAddress, setOwnerAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBalanceOf = async () => {
    if (!ownerAddress.trim() || !tokenId.trim()) {
      setSnackbar({ open: true, message: 'Please enter both owner address and token ID.', severity: 'warning' });
      return;
    }
    const isValidAddress = (addr) => /^(tz1|tz2|tz3)[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);
    if (!isValidAddress(ownerAddress)) {
      setSnackbar({ open: true, message: 'Invalid Tezos address.', severity: 'warning' });
      return;
    }
    const tokenIdNum = parseInt(tokenId, 10);
    if (isNaN(tokenIdNum) || tokenIdNum < 0) {
      setSnackbar({ open: true, message: 'Token ID must be a non-negative integer.', severity: 'warning' });
      return;
    }
    try {
      setLoading(true);
      const contract = await tezos.contract.at(contractAddress);
      const storage = await contract.storage();
      let fetchedBalance = 0;
      if (contractVersion === 'v1') {
        const owner = await storage.ledger.get(tokenIdNum);
        fetchedBalance = owner && owner.toLowerCase() === ownerAddress.toLowerCase() ? 1 : 0;
      } else if (contractVersion === 'v2' || contractVersion === 'v3') {
        const key = [ownerAddress.trim(), tokenIdNum];
        const amount = await storage.ledger.get(key);
        fetchedBalance = amount ? parseInt(amount, 10) : 0;
      } else {
        throw new Error('Unsupported contract version.');
      }
      setBalance(fetchedBalance);
      setSnackbar({ open: true, message: `Balance fetched: ${fetchedBalance}`, severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `Failed to fetch balance: ${error.message}`, severity: 'error' });
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Typography variant="h6">Check Balance</Typography>
      <Grid container spacing={2}>
        <Grid size={12}>
          <TextField
            label="Owner Address *"
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
            fullWidth
            placeholder="e.g., tz1..."
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Token ID *"
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
          startIcon={loading ? <CircularProgress size={20} /> : null}
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
