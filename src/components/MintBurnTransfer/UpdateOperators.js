// frontend/src/components/MintBurnTransfer/UpdateOperators.js

import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

const UpdateOperators = ({ contractAddress, tezos, setSnackbar, contractVersion }) => {
  const [operatorType, setOperatorType] = useState('add_operator');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [operatorAddress, setOperatorAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateOperators = async () => {
    if (!ownerAddress || !operatorAddress || !tokenId) {
      setSnackbar({ open: true, message: 'Please fill in all required fields.', severity: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const contract = await tezos.wallet.at(contractAddress);

      let op;
      if (contractVersion === 'v1') {
        // v1 update_operators: (pair %add_operator (address %owner) (pair (address %operator) (nat %token_id)))
        // or similar for remove_operator
        const updateParam = {
          [operatorType]: {
            owner: ownerAddress,
            operator: operatorAddress,
            token_id: parseInt(tokenId),
          },
        };
        op = await contract.methods.update_operators([updateParam]).send();
      } else if (contractVersion === 'v2') {
        // v2 update_operators expects a list of or(pair(add_operator), pair(remove_operator))
        const updateParam =
          operatorType === 'add_operator'
            ? {
                add_operator: {
                  owner: ownerAddress,
                  operator: operatorAddress,
                  token_id: parseInt(tokenId),
                },
              }
            : {
                remove_operator: {
                  owner: ownerAddress,
                  operator: operatorAddress,
                  token_id: parseInt(tokenId),
                },
              };
        op = await contract.methods.update_operators([updateParam]).send();
      }

      await op.confirmation();

      setSnackbar({ open: true, message: 'Operator updated successfully.', severity: 'success' });
      setOwnerAddress('');
      setOperatorAddress('');
      setTokenId('');
    } catch (error) {
      // Removed console.error for production
      setSnackbar({ open: true, message: 'Update failed.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Typography variant="h6">Update Operators</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="operator-type-label">Action *</InputLabel>
            <Select
              labelId="operator-type-label"
              value={operatorType}
              onChange={(e) => setOperatorType(e.target.value)}
              label="Action *"
            >
              <MenuItem value="add_operator">Add Operator</MenuItem>
              <MenuItem value="remove_operator">Remove Operator</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Owner Address *"
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
            fullWidth
            placeholder="Owner's Tezos address (e.g., tz1...)"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Operator Address *"
            value={operatorAddress}
            onChange={(e) => setOperatorAddress(e.target.value)}
            fullWidth
            placeholder="Operator's Tezos address (e.g., tz1...)"
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
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <Button
          variant="contained"
          color="info"
          onClick={handleUpdateOperators}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Updating...' : 'Update Operator'}
        </Button>
      </div>
      {/* Entry Point Descriptions */}
      <div style={{ marginTop: '10px' }}>
        <Typography variant="body2" color="textSecondary">
          <strong>Add Operator:</strong> Grants an operator the right to manage specific tokens on your behalf.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          <strong>Remove Operator:</strong> Revokes an operator's rights to manage specific tokens.
        </Typography>
      </div>
    </div>
  );
};

export default UpdateOperators;
