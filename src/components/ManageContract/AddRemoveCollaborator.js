/* Developed by @jams2blues with love for the Tezos community
   File: src/components/ManageContract/AddRemoveCollaborator.js
   Summary: Add or remove one – or many – collaborator addresses in a single
            Tezos signature.  Accepts addresses separated by commas, spaces, or
            newlines and batches the calls using Taquito’s wallet batch builder.
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

const AddRemoveCollaborator = ({ contractAddress, tezos, setSnackbar }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Build and send a batch of add/remove calls
  const runBatch = async (methodName) => {
    const addresses = input
      .split(/[\s,]+/)         // split on any whitespace or comma
      .map((a) => a.trim())
      .filter(Boolean);

    if (!addresses.length) return;

    for (const addr of addresses) {
      if (!isValidTezosAddress(addr)) {
        setSnackbar({
          open: true,
          message: `Invalid Tezos address: ${addr}`,
          severity: 'error',
        });
        return;
      }
    }

    try {
      setLoading(true);
      const contract = await tezos.wallet.at(contractAddress);

      // Build batch with .withContractCall()
      let batchBuilder = tezos.wallet.batch();
      addresses.forEach((addr) => {
        batchBuilder = batchBuilder.withContractCall(
          contract.methods[methodName](addr)
        );
      });

      const op = await batchBuilder.send();
      await op.confirmation();

      setSnackbar({
        open: true,
        message: `Collaborator${addresses.length > 1 ? 's' : ''} ${
          methodName === 'add_collaborator' ? 'added' : 'removed'
        } successfully!`,
        severity: 'success',
      });
      setInput('');
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <Typography variant="h6">Add/Remove Collaborators</Typography>

      <Grid container spacing={2}>
        <Grid size={12}>
          <TextField
            label="Collaborator Address(es)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            fullWidth
            multiline
            placeholder="Paste addresses separated by commas, spaces, or newlines"
          />
          <Typography variant="caption" color="textSecondary">
            Example:<br />
            tz1...<br />
            tz1..., tz1...<br />
            tz1... tz1... tz1...
          </Typography>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={6}>
          <Tooltip title="Add the address list in a single transaction.">
            <Button
              variant="contained"
              color="primary"
              onClick={() => runBatch('add_collaborator')}
              disabled={loading}
              fullWidth
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Processing…' : 'Add Collaborator(s)'}
            </Button>
          </Tooltip>
        </Grid>
        <Grid size={6}>
          <Tooltip title="Remove the address list in a single transaction.">
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => runBatch('remove_collaborator')}
              disabled={loading}
              fullWidth
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Processing…' : 'Remove Collaborator(s)'}
            </Button>
          </Tooltip>
        </Grid>
      </Grid>
    </div>
  );
};

export default AddRemoveCollaborator;
