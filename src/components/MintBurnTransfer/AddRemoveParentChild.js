/*Developed by @jams2blues with love for the Tezos community
  File: src/components/MintBurnTransfer/AddRemoveParentChild.js
  Summary: Batch add or remove parent/child Tezos addresses via entrypoint calls
*/
import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
  Tooltip,
} from '@mui/material';

const isValidTezosAddress = (addr) =>
  /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);

const AddRemoveParentChild = ({ contractAddress, tezos, setSnackbar, actionType }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const runBatch = async () => {
    const addresses = input
      .split(/[\s,]+/)
      .map((a) => a.trim())
      .filter(Boolean);

    if (!addresses.length) {
      setSnackbar({ open: true, message: 'Please enter at least one address.', severity: 'warning' });
      return;
    }

    for (const addr of addresses) {
      if (!isValidTezosAddress(addr)) {
        setSnackbar({ open: true, message: `Invalid Tezos address: ${addr}`, severity: 'error' });
        return;
      }
    }

    try {
      setLoading(true);
      const contract = await tezos.wallet.at(contractAddress);
      let batchBuilder = tezos.wallet.batch();
      addresses.forEach((addr) => {
        batchBuilder = batchBuilder.withContractCall(
          contract.methods[actionType](addr)
        );
      });
      const op = await batchBuilder.send();
      setSnackbar({ open: true, message: 'Operation in progress...', severity: 'info' });
      await op.confirmation();
      setSnackbar({ open: true, message: 'Operation successful!', severity: 'success' });
      setInput('');
    } catch (error) {
      setSnackbar({ open: true, message: `Operation failed: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getLabel = () => {
    switch (actionType) {
      case 'add_parent': return 'Add Parent(s)';
      case 'remove_parent': return 'Remove Parent(s)';
      case 'add_child': return 'Add Child(ren)';
      case 'remove_child': return 'Remove Child(ren)';
      default: return 'Execute';
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <Typography variant="h6">{getLabel()}</Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={12}>
          <TextField
            label="Tezos Address(es)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            fullWidth
            multiline
            placeholder="Paste addresses separated by commas, spaces, or newlines"
          />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={12} sx={{ textAlign: 'right' }}>
          <Tooltip title="Batch this operation in one transaction.">
            <Button
              variant="contained"
              color={actionType.includes('add') ? 'primary' : 'secondary'}
              onClick={runBatch}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Processing…' : getLabel()}
            </Button>
          </Tooltip>
        </Grid>
      </Grid>
    </div>
  );
};

export default AddRemoveParentChild;
