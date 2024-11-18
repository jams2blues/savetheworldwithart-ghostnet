// src/components/Header.js

import React, { useContext, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { WalletContext } from '../contexts/WalletContext';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { ReactComponent as Logo } from '../logo.svg'; // Ensure the path is correct

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  margin-right: 15px;
`;

const Header = () => {
  const {
    walletAddress,
    isWalletConnected,
    connectWallet,
    disconnectWallet,
    // network, // Not needed for Mainnet frontend
    // switchNetwork, // Not needed for Mainnet frontend
    tezos,
  } = useContext(WalletContext);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Link to="/">
            <Logo style={{ height: '40px', width: '40px', marginRight: '15px' }} />
          </Link>
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            Save The World With Art™ Beta
          </Typography>
          <StyledLink to="/">
            <Button color="inherit">Home</Button>
          </StyledLink>
          <StyledLink to="/generate">
            <Button color="inherit">Generate Contract</Button>
          </StyledLink>
          <StyledLink to="/mint-burn-transfer">
            <Button color="inherit">Mint/Burn/Transfer</Button>
          </StyledLink>
          {!isWalletConnected ? (
            <Button color="inherit" onClick={connectWallet} startIcon={<AccountBalanceWalletIcon />}>
              Connect Wallet
            </Button>
          ) : (
            <Button color="inherit" onClick={disconnectWallet} startIcon={<AccountBalanceWalletIcon />}>
              Disconnect ({walletAddress.substring(0, 6)}...{walletAddress.slice(-4)})
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Header;
