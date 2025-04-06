/* Developed by @jams2blues with love for the Tezos community
   File: src/components/MintBurnTransfer/AddRemoveParentChild.js
   Summary: Component to add or remove parent/child relationships for NFTs.
*/
import React, { useState } from 'react';
import { Typography, TextField, Button, CircularProgress, Grid } from '@mui/material';

const AddRemoveParentChild = ({ contractAddress, tezos, setSnackbar, contractVersion, actionType }) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidTezosAddress = (addr) => /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);

  const handleSubmit = async () => {
    if (!address.trim()) {
      setSnackbar({ open: true, message: 'Please enter a valid Tezos address.', severity: 'warning' });
      return;
    }
    if (!isValidTezosAddress(address.trim())) {
      setSnackbar({ open: true, message: 'Invalid Tezos address.', severity: 'error' });
      return;
    }
    try {
      setLoading(true);
      const contract = await tezos.wallet.at(contractAddress);
      const availableMethods = Object.keys(contract.methods);
      if (!availableMethods.includes(actionType)) {
        throw new Error(`Method "${actionType}" not supported.`);
      }
      const op = await contract.methods[actionType](address.trim()).send();
      setSnackbar({ open: true, message: `${actionType.replace('_', ' ')} in progress...`, severity: 'info' });
      await op.confirmation();
      setSnackbar({ open: true, message: `${actionType.replace('_', ' ')} successfully.`, severity: 'success' });
      setAddress('');
    } catch (error) {
      setSnackbar({ open: true, message: `Operation failed: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getButtonLabel = () => {
    switch (actionType) {
      case 'add_parent': return 'Add Parent';
      case 'remove_parent': return 'Remove Parent';
      case 'add_child': return 'Add Child';
      case 'remove_child': return 'Remove Child';
      default: return 'Execute';
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Typography variant="h6">{getButtonLabel()}</Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={12}>
          <TextField
            label="Tezos Address *"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
            placeholder="e.g., KT1..."
          />
        </Grid>
      </Grid>
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <Button
          variant="contained"
          color={actionType.includes('add') ? 'primary' : 'secondary'}
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Processing...' : getButtonLabel()}
        </Button>
      </div>
    </div>
  );
};

export default AddRemoveParentChild;
