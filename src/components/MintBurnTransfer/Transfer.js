/* Developed by @jams2blues with love for the Tezos community
   File: src/components/MintBurnTransfer/Transfer.js
   Summary: Component for transferring NFTs between addresses.
*/
import React, { useState } from 'react';
import { Typography, TextField, Button, CircularProgress, Grid } from '@mui/material';

const Transfer = ({ contractAddress, tezos, setSnackbar, contractVersion }) => {
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
      const contract = await tezos.wallet.at(contractAddress);
      const amt = parseInt(amount);
      if (isNaN(amt) || amt <= 0) {
        setSnackbar({ open: true, message: 'Amount must be a positive integer.', severity: 'warning' });
        setLoading(false);
        return;
      }
      const transferParams = [
        {
          from_: fromAddress,
          txs: [
            { to_: toAddress, token_id: parseInt(tokenId), amount: amt }
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
      setSnackbar({ open: true, message: 'Transfer failed.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Typography variant="h6">Transfer NFT</Typography>
      <Grid container spacing={2}>
        <Grid size={12}>
          <TextField
            label="From Address *"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            fullWidth
            placeholder="Sender's address"
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="To Address *"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            fullWidth
            placeholder="Recipient's address"
          />
        </Grid>
        <Grid size={6}>
          <TextField
            label="Token ID *"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            fullWidth
            placeholder="e.g., 0"
          />
        </Grid>
        <Grid size={6}>
          <TextField
            label="Amount *"
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
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Transferring...' : 'Transfer NFT'}
        </Button>
      </div>
    </div>
  );
};

export default Transfer;
