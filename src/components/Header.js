// src/components/Header.js

import React, { useContext, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  Alert,
  Box,
} from '@mui/material';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { WalletContext } from '../contexts/WalletContext';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MenuIcon from '@mui/icons-material/Menu';
import { ReactComponent as Logo } from '../logo.svg';

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
  } = useContext(WalletContext);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const menuItems = [
    { text: 'Home', link: '/' },
    { text: 'Generate Contract', link: '/generate' },
    { text: 'Mint/Burn/Transfer', link: '/mint-burn-transfer' },
    { text: 'On-Chain NFT License 2.0', link: '/on-chain-license' },
  ];

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: 'darkgreen' }}>
        <Toolbar>
          {/* Hamburger Menu for Mobile */}
          <Box sx={{ display: { xs: 'block', sm: 'none' }, mr: 2 }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="left"
              open={drawerOpen}
              onClose={toggleDrawer(false)}
            >
              <Box
                sx={{ width: 250 }}
                role="presentation"
                onClick={toggleDrawer(false)}
                onKeyDown={toggleDrawer(false)}
              >
                <List>
                  {menuItems.map((item) => (
                    <ListItemButton
                      key={item.text}
                      component={Link}
                      to={item.link}
                    >
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            </Drawer>
          </Box>

          {/* Logo */}
          <Link to="/">
            <Logo style={{ height: '40px', width: '40px', marginRight: '15px' }} />
          </Link>

          {/* Title */}
          <Typography variant="h6" sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
            ZeroContract Beta
          </Typography>

          {/* Navigation Links for Desktop */}
          <Box sx={{ display: { xs: 'none', sm: 'block' }, flexGrow: 1 }}>
            {menuItems.map((item) => (
              <StyledLink key={item.text} to={item.link}>
                <Button color="inherit">{item.text}</Button>
              </StyledLink>
            ))}
          </Box>

          {/* Wallet Connection Button */}
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
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Header;
