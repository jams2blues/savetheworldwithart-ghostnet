/*Developed by @jams2blues with love for the Tezos community
  File: src/components/Header.js
  Summary: Responsive Header with a cleaner mobile layout. Network selector is placed in the drawer on mobile, 
           keeping the top bar uncluttered. Desktop remains a single row with menu items, network, and wallet button.
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
import Link from 'next/link';
import { WalletContext } from '../contexts/WalletContext';

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
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Hamburger menu on mobile */}
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={toggleDrawer(true)}
                sx={{ mr: 1 }}
              >
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

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, ml: 2 }}>
              {menuItems.map((i) => (
                <Link key={i.text} href={i.link} legacyBehavior passHref>
                  <Button sx={{ color: '#fff', mx: 1 }}>{i.text}</Button>
                </Link>
              ))}
            </Box>
          )}

          {/* Right side: either wallet + network on desktop, or just wallet on mobile */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
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
          {/* Navigation links */}
          <Box sx={{ flex: '1 1 auto' }} onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
            {menuItems.map((i) => (
              <Link key={i.text} href={i.link} legacyBehavior passHref>
                <ListItemButton>
                  <ListItemText primary={i.text} />
                </ListItemButton>
              </Link>
            ))}
            <Divider sx={{ my: 1 }} />

            {/* Mobile Network Selector */}
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

          {/* Optional bottom area if needed */}
          <Box sx={{ flexShrink: 0 }} />
        </Box>
      </Drawer>
    </>
  );
}
