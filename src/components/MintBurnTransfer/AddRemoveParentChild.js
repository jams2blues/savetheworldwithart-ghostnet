// mainnet/src/components/MintBurnTransfer/AddRemoveParentChild.js

import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
} from '@mui/material';

const AddRemoveParentChild = ({
  contractAddress,
  tezos,
  setSnackbar,
  contractVersion,
  actionType, // 'add_parent', 'remove_parent', 'add_child', 'remove_child'
}) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle address input change
  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };

  // Helper function to validate Tezos address
  const isValidTezosAddress = (addr) => {
    const tezosAddressRegex = /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/;
    return tezosAddressRegex.test(addr);
  };

  // Handle submit
  const handleSubmit = async () => {
    // Basic validation
    if (!address.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid Tezos address.',
        severity: 'warning',
      });
      return;
    }

    if (!isValidTezosAddress(address.trim())) {
      setSnackbar({
        open: true,
        message: 'The address entered is not a valid Tezos address.',
        severity: 'error',
      });
      return;
    }

    try {
      setLoading(true);
      const contract = await tezos.wallet.at(contractAddress);

      // Check if the method exists on the contract
      const availableMethods = Object.keys(contract.methods);
      if (!availableMethods.includes(actionType)) {
        throw new Error(`The contract does not support the method "${actionType}".`);
      }

      // Prepare the contract method based on actionType
      let operation;
      operation = contract.methods[actionType](address.trim());

      // Send the operation
      const op = await operation.send();

      setSnackbar({
        open: true,
        message: `${getButtonLabel()} in progress...`,
        severity: 'info',
      });

      // Await confirmation
      await op.confirmation();

      setSnackbar({
        open: true,
        message: `${getButtonLabel()} successfully.`,
        severity: 'success',
      });

      // Reset form
      setAddress('');
    } catch (error) {
      console.error('Error updating relationship:', error);
      let errorMessage = 'Operation failed. Please try again.';
      if (error?.message) {
        errorMessage = `Operation failed: ${error.message}`;
      }
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine button color based on actionType
  const getButtonColor = () => {
    if (actionType === 'add_parent' || actionType === 'add_child') return 'primary';
    if (actionType === 'remove_parent' || actionType === 'remove_child') return 'secondary';
    return 'default';
  };

  // Determine button label based on actionType
  const getButtonLabel = () => {
    switch (actionType) {
      case 'add_parent':
        return 'Add Parent';
      case 'remove_parent':
        return 'Remove Parent';
      case 'add_child':
        return 'Add Child';
      case 'remove_child':
        return 'Remove Child';
      default:
        return 'Execute';
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Typography variant="h6">
        {getButtonLabel()}
      </Typography>
      <Grid container spacing={2} style={{ marginTop: '10px' }}>
        {/* Address Input */}
        <Grid item xs={12}>
          <TextField
            label="Tezos Address *"
            value={address}
            onChange={handleAddressChange}
            fullWidth
            placeholder="Enter the Tezos address (e.g., KT1...)"
            type="text"
          />
        </Grid>
      </Grid>
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <Button
          variant="contained"
          color={getButtonColor()}
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
          aria-label={`${getButtonLabel()} Button`}
        >
          {loading ? 'Processing...' : getButtonLabel()}
        </Button>
      </div>
      {/* Action Description */}
      <div style={{ marginTop: '10px' }}>
        <Typography variant="body2" color="textSecondary">
          {actionType === 'add_parent' && (
            <strong>Add Parent:</strong>
          )}
          {actionType === 'remove_parent' && (
            <strong>Remove Parent:</strong>
          )}
          {actionType === 'add_child' && (
            <strong>Add Child:</strong>
          )}
          {actionType === 'remove_child' && (
            <strong>Remove Child:</strong>
          )}{' '}
          {actionType === 'add_parent' && (
            'Establishes a parent relationship with the specified Tezos address.'
          )}
          {actionType === 'remove_parent' && (
            'Dissolves an existing parent relationship with the specified Tezos address.'
          )}
          {actionType === 'add_child' && (
            'Establishes a child relationship with the specified Tezos address.'
          )}
          {actionType === 'remove_child' && (
            'Dissolves an existing child relationship with the specified Tezos address.'
          )}
        </Typography>
      </div>
    </div>
  );
};

export default AddRemoveParentChild;
