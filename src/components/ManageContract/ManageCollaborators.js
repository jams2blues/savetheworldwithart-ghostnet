/* Developed by @jams2blues with love for the Tezos community
   File: src/components/ManageContract/ManageCollaborators.js
   Summary: Provides a popup that fetches current collaborator addresses from the contract storage
   and lets the user remove them individually via a single click.
*/
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const ManageCollaborators = ({ contractAddress, tezos, setSnackbar }) => {
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState({});
  const [open, setOpen] = useState(false);

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const contract = await tezos.contract.at(contractAddress);
      const storage = await contract.storage();
      // Assuming storage.collaborators is a set; if not, adjust accordingly.
      let collabs = [];
      if (storage.collaborators && typeof storage.collaborators.forEach === 'function') {
         storage.collaborators.forEach((addr) => collabs.push(addr));
      }
      setCollaborators(collabs);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to fetch collaborators.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCollaborators();
    }
  }, [open]);

  const handleRemove = async (addr) => {
    setRemoving((prev) => ({ ...prev, [addr]: true }));
    try {
      const contract = await tezos.wallet.at(contractAddress);
      const op = await contract.methods.remove_collaborator(addr).send();
      await op.confirmation();
      setSnackbar({ open: true, message: `Removed collaborator: ${addr}`, severity: 'success' });
      // Refresh the list
      fetchCollaborators();
    } catch (error) {
      setSnackbar({ open: true, message: `Failed to remove ${addr}`, severity: 'error' });
    } finally {
      setRemoving((prev) => ({ ...prev, [addr]: false }));
    }
  };

  return (
    <>
      <Button variant="outlined" color="secondary" onClick={() => setOpen(true)}>
        Manage Collaborators
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Manage Collaborators</DialogTitle>
        <DialogContent>
          {loading ? (
            <CircularProgress />
          ) : collaborators.length === 0 ? (
            <div>No collaborators found.</div>
          ) : (
            <List>
              {collaborators.map((addr) => (
                <ListItem key={addr}>
                  <ListItemText primary={addr} />
                  <ListItemSecondaryAction>
                    <Tooltip title="Remove collaborator">
                      <IconButton edge="end" onClick={() => handleRemove(addr)} disabled={removing[addr]}>
                        {removing[addr] ? <CircularProgress size={20} /> : <DeleteIcon />}
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ManageCollaborators;
