// frontend/src/components/MintBurnTransfer/Transfer.js

import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
} from '@mui/material';

const Transfer = ({ contractAddress, Tezos, setSnackbar, contractVersion }) => {
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [amount, setAmount] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!fromAddress || !toAddress || !tokenId) {
      setSnackbar({ open: true, message: 'Please fill in all required fields.', severity: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const contract = await Tezos.wallet.at(contractAddress);

      const amountValue = parseInt(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setSnackbar({
          open: true,
          message: 'Amount must be a positive integer.',
          severity: 'warning',
        });
        setLoading(false);
        return;
      }

      const transferParams = [
        {
          from_: fromAddress,
          txs: [
            {
              to_: toAddress,
              token_id: parseInt(tokenId),
              amount: amountValue,
            },
          ],
        },
      ];

      const op = await contract.methods.transfer(transferParams).send();
      await op.confirmation();

      setSnackbar({ open: true, message: 'NFT transferred successfully.', severity: 'success' });
      setFromAddress('');
      setToAddress('');
      setTokenId('');
      setAmount('1');
    } catch (error) {
      // Removed console.error for production
      setSnackbar({ open: true, message: 'Transfer failed.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Typography variant="h6">Transfer NFT</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="From Address *"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            fullWidth
            placeholder="Sender's address"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="To Address *"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            fullWidth
            placeholder="Recipient's address"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Token ID *"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            fullWidth
            placeholder="e.g., 0"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Amount *"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            placeholder="e.g., 1"
          />
        </Grid>
      </Grid>
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <Button
          variant="contained"
          color="warning"
          onClick={handleTransfer}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Transferring...' : 'Transfer NFT'}
        </Button>
      </div>
    </div>
  );
};

export default Transfer;
