/*Developed by @jams2blues with love for the Tezos community
  File: src/components/Header.js
  Summary: Added light☀️/dark🌙 toggle button in toolbar & mobile drawer,
           wired to ColorModeContext. Keeps responsive layout intact.
*/

import React, { useContext, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  ListItemButton,
  ListItemText,
  Box,
  useMediaQuery,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import Link from 'next/link';
import { WalletContext } from '../contexts/WalletContext';
import ColorModeContext from '../contexts/ColorModeContext';

const Logo = styled('img')({
  width: 40,
  height: 40,
  marginRight: 8,
});

const HeaderContainer = styled(AppBar)`
  background-color: darkgreen;
`;

export default function Header() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { walletAddress, isWalletConnected, connectWallet, disconnectWallet, network } =
    useContext(WalletContext);
  const { mode, toggleColorMode } = useContext(ColorModeContext);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [
    { text: 'Home', link: '/' },
    { text: 'Deploy Contract', link: '/generate' },
    { text: 'Mint/Burn/Transfer', link: '/mint-burn-transfer' },
    { text: 'On‑Chain License', link: '/on-chain-license' },
    { text: 'Terms', link: '/terms' },
  ];

  const handleNetworkChange = (e) => {
    window.location.href =
      e.target.value === 'ghostnet'
        ? 'https://ghostnet.savetheworldwithart.io'
        : 'https://savetheworldwithart.io';
  };

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const walletLabel = () =>
    !isWalletConnected
      ? 'Connect Wallet'
      : `Disconnect (${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)})`;

  const walletAction = isWalletConnected ? disconnectWallet : connectWallet;

  return (
    <>
      <HeaderContainer position="static">
        <Toolbar
          sx={{
            minHeight: isMobile ? 60 : 64,
            px: isMobile ? 1 : 3,
            justifyContent: 'space-between',
          }}
        >
          {/* Left cluster – logo & hamburger */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isMobile && (
              <IconButton color="inherit" edge="start" onClick={toggleDrawer(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}

            <Link href="/" legacyBehavior passHref>
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <Logo src="/images/logo.svg" alt="ZeroArt Logo" />
                <Typography
                  variant="h6"
                  component="a"
                  sx={{ color: '#fff', textDecoration: 'none', fontSize: '1.25rem' }}
                >
                  ZeroArtApp
                </Typography>
              </Box>
            </Link>
          </Box>

          {/* Desktop nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, ml: 2 }}>
              {menuItems.map((i) => (
                <Link key={i.text} href={i.link} legacyBehavior passHref>
                  <Button sx={{ color: '#fff', mx: 1 }}>{i.text}</Button>
                </Link>
              ))}
            </Box>
          )}

          {/* Right cluster – theme switcher, network selector, wallet */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
            <IconButton
              aria-label="Toggle light/dark mode"
              color="inherit"
              onClick={toggleColorMode}
              sx={{ mr: isMobile ? 0 : 1 }}
            >
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>

            {!isMobile && (
              <FormControl variant="standard" sx={{ minWidth: 90, mr: 2 }}>
                <InputLabel sx={{ color: '#fff' }}>Network</InputLabel>
                <Select
                  value={network}
                  onChange={handleNetworkChange}
                  label="Network"
                  sx={{ color: '#fff' }}
                >
                  <MenuItem value="mainnet">Mainnet</MenuItem>
                  <MenuItem value="ghostnet">Ghostnet</MenuItem>
                </Select>
              </FormControl>
            )}
            <Button
              color="inherit"
              onClick={walletAction}
              startIcon={<AccountBalanceWalletIcon />}
              sx={{ whiteSpace: 'nowrap', fontSize: isMobile ? '0.9rem' : '1rem' }}
            >
              {isMobile
                ? isWalletConnected
                  ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
                  : 'Connect'
                : walletLabel()}
            </Button>
          </Box>
        </Toolbar>
      </HeaderContainer>

      {/* Mobile Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 250, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ flex: '1 1 auto' }} onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
            {menuItems.map((i) => (
              <Link key={i.text} href={i.link} legacyBehavior passHref>
                <ListItemButton>
                  <ListItemText primary={i.text} />
                </ListItemButton>
              </Link>
            ))}
            <Divider sx={{ my: 1 }} />

            {/* Mobile‑specific items */}
            <ListItemButton onClick={toggleColorMode}>
              <ListItemText primary={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'} />
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </ListItemButton>

            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Select Network
              </Typography>
              <FormControl variant="standard" fullWidth>
                <Select value={network} onChange={handleNetworkChange}>
                  <MenuItem value="mainnet">Mainnet</MenuItem>
                  <MenuItem value="ghostnet">Ghostnet</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ flexShrink: 0 }} />
        </Box>
      </Drawer>
    </>
  );
}