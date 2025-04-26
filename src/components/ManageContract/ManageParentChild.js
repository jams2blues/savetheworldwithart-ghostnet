/*Developed by @jams2blues with love for the Tezos community
  File: src/components/ManageContract/ManageParentChild.js
  Summary: List and remove parent/child relationships from contract storage
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
  Tabs,
  Tab,
  Box,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const ManageParentChild = ({ contractAddress, tezos, setSnackbar }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState({});
  const [parents, setParents] = useState([]);
  const [children, setChildren] = useState([]);
  const [tab, setTab] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const contract = await tezos.contract.at(contractAddress);
      const storage = await contract.storage();
      const ps = [];
      if (storage.parents?.forEach) storage.parents.forEach((addr) => ps.push(addr));
      const cs = [];
      if (storage.children?.forEach) storage.children.forEach((addr) => cs.push(addr));
      setParents(ps);
      setChildren(cs);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to fetch data.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (addr, type) => {
    setRemoving((r) => ({ ...r, [addr]: true }));
    try {
      const contract = await tezos.wallet.at(contractAddress);
      const method = type === 'parent' ? 'remove_parent' : 'remove_child';
      const op = await contract.methods[method](addr).send();
      await op.confirmation();
      setSnackbar({ open: true, message: `${type} removed: ${addr}`, severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: `Failed to remove ${type}: ${addr}`, severity: 'error' });
    } finally {
      setRemoving((r) => ({ ...r, [addr]: false }));
    }
  };

  const handleTabChange = (_e, newValue) => setTab(newValue);

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  return (
    <>
      <Button variant="outlined" color="primary" onClick={() => setOpen(true)}>
        Manage Parent/Child
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Manage Parent/Child</DialogTitle>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label={`Parents (${parents.length})`} />
          <Tab label={`Children (${children.length})`} />
        </Tabs>
        <DialogContent>
          {loading ? (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {(tab === 0 ? parents : children).map((addr) => (
                <ListItem key={addr}>
                  <ListItemText primary={addr} />
                  <ListItemSecondaryAction>
                    <Tooltip title={`Remove ${tab === 0 ? 'parent' : 'child'}`}>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemove(addr, tab === 0 ? 'parent' : 'child')}
                        disabled={removing[addr]}
                      >
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

export default ManageParentChild;
