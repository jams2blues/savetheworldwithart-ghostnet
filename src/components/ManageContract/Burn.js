/*Developed by @jams2blues with love for the Tezos community
  File: src/components/ManageContract/Burn.js
  Summary: Burn NFT editions — now recognises all v2* variants (v2a–v2e) and v3.
*/

import React, { useState } from 'react';
import { Typography, TextField, Button, CircularProgress, Grid } from '@mui/material';

const Burn = ({ contractAddress, tezos, setSnackbar, contractVersion }) => {
  const [tokenId, setTokenId] = useState('');
  const [amount,  setAmount]  = useState('1');
  const [loading, setLoading] = useState(false);

  /* helpers */
  const isV1      = contractVersion?.startsWith('v1');
  const isV2Plus  = contractVersion?.startsWith('v2') || contractVersion === 'v3';

  const handleBurn = async () => {
    if (!tokenId) {
      setSnackbar({ open: true, message: 'Please enter the Token ID.', severity: 'warning' });
      return;
    }

    if (isV2Plus) {
      const amt = parseInt(amount, 10);
      if (!Number.isFinite(amt) || amt <= 0) {
        setSnackbar({ open: true, message: 'Amount must be a positive integer.', severity: 'warning' });
        return;
      }
    }

    try {
      setLoading(true);
      const contract = await tezos.wallet.at(contractAddress);
      let op;

      if (isV1) {
        op = await contract.methods.burn(parseInt(tokenId, 10)).send();
      } else {
        // v2 (all variants) & v3 share the same signature: (amount, token_id)
        op = await contract.methods.burn(parseInt(amount, 10), parseInt(tokenId, 10)).send();
      }

      setSnackbar({ open: true, message: 'Burning in progress…', severity: 'info' });
      await op.confirmation();
      setSnackbar({ open: true, message: 'NFT burned successfully.', severity: 'success' });
      setTokenId('');
      setAmount('1');
    } catch (error) {
      const msg = error?.message || '';
      let userMsg = 'Burn failed.';
      if (msg.includes('FA2_TOKEN_UNDEFINED'))  userMsg = 'Token not found or zero balance for this Token ID.';
      if (msg.includes('FA2_NOT_OWNER'))        userMsg = 'You are not the owner of this token.';
      if (msg.includes('contract.not_found') ||
          msg.includes('Invalid account address')) userMsg = 'Contract not found on this network.';
      setSnackbar({ open: true, message: userMsg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
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

        {isV2Plus && (
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

      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleBurn}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Burning…' : 'Burn NFT'}
        </Button>
      </div>
    </div>
  );
};

export default Burn;
