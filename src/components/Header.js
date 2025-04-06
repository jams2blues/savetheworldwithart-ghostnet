/*Developed by @jams2blues with love for the Tezos community
  File: src/components/Header.js
  Summary: Header with responsive wallet‑button text so it never overflows.
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
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import Link from 'next/link';
import { WalletContext } from '../contexts/WalletContext';

const Logo = styled('img')({ width: 40, height: 40, marginRight: 8 });
const HeaderContainer = styled(AppBar)`background-color: darkgreen;`;

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

  const handleNetworkChange = (e) =>
    (window.location.href =
      e.target.value === 'ghostnet'
        ? 'https://ghostnet.savetheworldwithart.io'
        : 'https://savetheworldwithart.io');

  const toggleDrawer = (open) => () => setDrawerOpen(open);

  const walletLabel = () =>
    !isWalletConnected
      ? isMobile
        ? 'Connect'
        : 'Connect Wallet'
      : isMobile
      ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
      : `Disconnect (${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)})`;

  const walletAction = isWalletConnected ? disconnectWallet : connectWallet;

  return (
    <>
      <HeaderContainer position="static">
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={toggleDrawer(true)}>
              <MenuIcon />
            </IconButton>
          )}

          <Link href="/" legacyBehavior passHref>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <Logo src="/images/logo.svg" alt="ZeroArt Logo" />
              <Typography variant="h6" component="a" sx={{ color: '#fff', textDecoration: 'none' }}>
                ZeroArtApp
              </Typography>
            </Box>
          </Link>

          {!isMobile && (
            <Box sx={{ flexGrow: 1, ml: 2 }}>
              {menuItems.map((i) => (
                <Link key={i.text} href={i.link} legacyBehavior passHref>
                  <Button sx={{ color: '#fff', ml: 1 }}>{i.text}</Button>
                </Link>
              ))}
            </Box>
          )}

          {/* network selector */}
          <Box sx={{ ml: 'auto', mr: 2 }}>
            <FormControl variant="standard" sx={{ minWidth: 90 }}>
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
          </Box>

          {/* wallet button */}
          <Button
            color="inherit"
            onClick={walletAction}
            startIcon={<AccountBalanceWalletIcon />}
            sx={{ whiteSpace: 'nowrap', px: isMobile ? 1 : 2 }}
          >
            {walletLabel()}
          </Button>
        </Toolbar>
      </HeaderContainer>

      {/* mobile drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 250 }} onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
          {menuItems.map((i) => (
            <Link key={i.text} href={i.link} legacyBehavior passHref>
              <ListItemButton>
                <ListItemText primary={i.text} />
              </ListItemButton>
            </Link>
          ))}
        </Box>
      </Drawer>
    </>
  );
}
