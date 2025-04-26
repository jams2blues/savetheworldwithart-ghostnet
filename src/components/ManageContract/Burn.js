/* Developed by @jams2blues with love for the Tezos community
   File: src/components/ManageContract/Burn.js
   Summary: Component for burning NFTs.
*/
import React, { useState } from 'react';
import { Typography, TextField, Button, CircularProgress, Grid } from '@mui/material';

const Burn = ({ contractAddress, tezos, setSnackbar, contractVersion }) => {
  const [tokenId, setTokenId] = useState('');
  const [amount, setAmount] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleBurn = async () => {
    if (!tokenId) {
      setSnackbar({ open: true, message: 'Please enter the Token ID.', severity: 'warning' });
      return;
    }
    try {
      setLoading(true);
      const contract = await tezos.wallet.at(contractAddress);
      let op;
      if (contractVersion === 'v1') {
        op = await contract.methods.burn(parseInt(tokenId)).send();
      } else if (contractVersion === 'v2') {
        const amt = parseInt(amount);
        if (isNaN(amt) || amt <= 0) {
          setSnackbar({ open: true, message: 'Amount must be a positive integer.', severity: 'warning' });
          setLoading(false);
          return;
        }
        op = await contract.methods.burn(amt, parseInt(tokenId)).send();
      } else {
        // For v3 assume similar to v2
        const amt = parseInt(amount);
        op = await contract.methods.burn(amt, parseInt(tokenId)).send();
      }
      setSnackbar({ open: true, message: 'Burning in progress...', severity: 'info' });
      await op.confirmation();
      setSnackbar({ open: true, message: 'NFT burned successfully.', severity: 'success' });
      setTokenId('');
      setAmount('1');
    } catch (error) {
      setSnackbar({ open: true, message: 'Burn failed.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Typography variant="h6">Burn NFT</Typography>
      <Grid container spacing={2}>
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
        {(contractVersion === 'v2' || contractVersion === 'v3') && (
          <Grid size={12}>
            <TextField
              label="Amount *"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              placeholder="Number of editions to burn"
              type="number"
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>
        )}
      </Grid>
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleBurn}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Burning...' : 'Burn NFT'}
        </Button>
      </div>
    </div>
  );
};

export default Burn;
