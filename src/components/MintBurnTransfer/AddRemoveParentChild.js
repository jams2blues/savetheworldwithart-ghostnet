// mainnet/src/components/MintBurnTransfer/AddRemoveParentChild.js

import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from '@mui/material';
import { MichelsonMap } from '@taquito/taquito';
import { Buffer } from 'buffer';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import InfoIcon from '@mui/icons-material/Info';

// Styled Components
const Section = {
  marginTop: '20px',
};

const AddRemoveParentChild = ({
  contractAddress,
  tezos,
  setSnackbar,
  contractVersion,
  actionType, // 'add_parent', 'remove_parent', 'add_child', 'remove_child'
}) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    content: '',
    onConfirm: null,
  });

  // Handle address input change
  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };

  // Helper function to validate Tezos address
  const isValidTezosAddress = (addr) => {
    const tezosAddressRegex = /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/;
    return tezosAddressRegex.test(addr);
  };

  // Prepare dynamic titles and descriptions based on actionType
  const getActionDetails = () => {
    switch (actionType) {
      case 'add_parent':
        return {
          title: 'Add Parent',
          description: 'Establishes a parent relationship with the specified Tezos address.',
          confirmation: `Are you sure you want to add ${address} as a parent? This action cannot be undone.`,
        };
      case 'remove_parent':
        return {
          title: 'Remove Parent',
          description: 'Dissolves an existing parent relationship with the specified Tezos address.',
          confirmation: `Are you sure you want to remove ${address} from your parents? This action cannot be undone.`,
        };
      case 'add_child':
        return {
          title: 'Add Child',
          description: 'Establishes a child relationship with the specified Tezos address.',
          confirmation: `Are you sure you want to add ${address} as a child? This action cannot be undone.`,
        };
      case 'remove_child':
        return {
          title: 'Remove Child',
          description: 'Dissolves an existing child relationship with the specified Tezos address.',
          confirmation: `Are you sure you want to remove ${address} from your children? This action cannot be undone.`,
        };
      default:
        return {
          title: '',
          description: '',
          confirmation: '',
        };
    }
  };

  // Handle submit with confirmation dialog
  const handleSubmit = async () => {
    // Basic validation
    if (!address.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a Tezos address.',
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

    // Prevent adding/removing self
    const userAddress = await tezos.wallet.pkh();
    if (address.trim() === userAddress) {
      setSnackbar({
        open: true,
        message: 'You cannot perform this action on your own address.',
        severity: 'warning',
      });
      return;
    }

    // Set up confirmation dialog
    const actionDetails = getActionDetails();
    setConfirmDialog({
      open: true,
      title: actionDetails.title,
      content: actionDetails.confirmation,
      onConfirm: executeAction,
    });
  };

  // Execute the action after confirmation
  const executeAction = async () => {
    setConfirmDialog({ ...confirmDialog, open: false });
    setLoading(true);
    try {
      const contract = await tezos.wallet.at(contractAddress);

      // Check if the method exists on the contract
      const availableMethods = Object.keys(contract.methods);
      if (!availableMethods.includes(actionType)) {
        throw new Error(`The contract does not support the method "${actionType}".`);
      }

      // Prepare the contract method based on actionType
      let operation;
      // Assuming the methods only require the address as a parameter
      operation = contract.methods[actionType](address.trim());

      // Optional: Estimate fees here if desired

      // Send the operation
      const op = await operation.send();

      setSnackbar({
        open: true,
        message: `${getActionDetails().title} in progress...`,
        severity: 'info',
      });

      // Await confirmation
      await op.confirmation();

      setSnackbar({
        open: true,
        message: `${getActionDetails().title} successfully.`,
        severity: 'success',
      });

      // Reset form
      setAddress('');
    } catch (error) {
      console.error('Error updating relationship:', error);
      let errorMessage = 'Operation failed. Please try again.';
      if (error?.message) {
        // Parse specific errors if possible
        if (error.message.includes('balance_too_low')) {
          errorMessage = 'Insufficient balance to perform this operation.';
        } else if (error.message.includes('invalid_entrypoint')) {
          errorMessage = 'Invalid contract method.';
        } else if (error.message.includes('target_contract_not_found')) {
          errorMessage = 'The specified contract does not exist.';
        } else {
          errorMessage = `Operation failed: ${error.message}`;
        }
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

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <div style={Section}>
      <Typography variant="h6">
        {getActionDetails().title}
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
            InputProps={{
              style: { wordBreak: 'break-all' },
            }}
          />
        </Grid>
      </Grid>
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
          aria-label={`${getActionDetails().title} Button`}
        >
          {loading ? 'Processing...' : getActionDetails().title}
        </Button>
      </div>
      {/* Action Description */}
      <div style={{ marginTop: '10px' }}>
        <Typography variant="body2" color="textSecondary">
          {getActionDetails().description}
        </Typography>
      </div>
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        aria-labelledby="confirm-action-dialog"
      >
        <DialogTitle id="confirm-action-dialog">{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} color="secondary">
            Cancel
          </Button>
          <Button onClick={confirmDialog.onConfirm} color="primary" variant="contained" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AddRemoveParentChild;
