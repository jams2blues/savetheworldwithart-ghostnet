/* Developed by @jams2blues with love for the Tezos community
   File: src/components/ManageContract/UpdateOperators.js
   Summary: Allows updating NFT operator permissions for different contract versions.
*/
import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

const UpdateOperators = ({ contractAddress, tezos, setSnackbar, contractVersion }) => {
  const [operatorType, setOperatorType] = useState('add_operator');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [operatorAddress, setOperatorAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidAddress = (addr) =>
    /^(tz1|tz2|tz3)[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);

  const handleUpdateOperators = async () => {
    if (!ownerAddress.trim() || !operatorAddress.trim() || tokenId === '') {
      setSnackbar({ open: true, message: 'Please fill in all required fields.', severity: 'warning' });
      return;
    }
    if (!isValidAddress(ownerAddress) || !isValidAddress(operatorAddress)) {
      setSnackbar({ open: true, message: 'Invalid Tezos address.', severity: 'warning' });
      return;
    }
    const tid = parseInt(tokenId, 10);
    if (isNaN(tid) || tid < 0) {
      setSnackbar({ open: true, message: 'Token ID must be a non-negative integer.', severity: 'warning' });
      return;
    }

    const ver = contractVersion.toString().toLowerCase();
    if (ver !== 'v1' && !ver.startsWith('v2') && ver !== 'v3') {
      setSnackbar({
        open: true,
        message: `Unsupported contract version: ${contractVersion}`,
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      const contract = await tezos.wallet.at(contractAddress);

      const param = {
        [operatorType]: {
          owner: ownerAddress.trim(),
          operator: operatorAddress.trim(),
          token_id: tid
        }
      };

      const op = await contract.methods.update_operators([param]).send();
      await op.confirmation();

      setSnackbar({ open: true, message: 'Operator updated successfully.', severity: 'success' });
      setOwnerAddress('');
      setOperatorAddress('');
      setTokenId('');
    } catch (error) {
      const msg = error?.message || '';
      let userMessage = 'Update failed.';
      if (msg.includes('contract.not_found') || msg.includes('Invalid account address')) {
        userMessage = 'Contract not found on this network. Please switch networks.';
      }
      setSnackbar({ open: true, message: userMessage, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Typography variant="h6">Update Operators</Typography>
      <Grid container spacing={2}>
        <Grid size={12}>
          <FormControl fullWidth>
            <InputLabel id="operator-type-label">Action *</InputLabel>
            <Select
              labelId="operator-type-label"
              value={operatorType}
              onChange={(e) => setOperatorType(e.target.value)}
              label="Action *"
            >
              <MenuItem value="add_operator">Add Operator</MenuItem>
              <MenuItem value="remove_operator">Remove Operator</MenuItem>
            </Select>
          </FormControl>
        </Grid>
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
            label="Operator Address *"
            value={operatorAddress}
            onChange={(e) => setOperatorAddress(e.target.value)}
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
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <Button
          variant="contained"
          color="info"
          onClick={handleUpdateOperators}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Updating...' : 'Update Operator'}
        </Button>
      </div>
    </div>
  );
};

export default UpdateOperators;
