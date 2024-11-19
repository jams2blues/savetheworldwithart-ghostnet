// src/contexts/WalletContext.js

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { TezosToolkit } from '@taquito/taquito';
import { NETWORKS } from '../config/networkConfig';

// Create the Wallet Context
export const WalletContext = createContext();

// Wallet Provider Component
export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [tezos, setTezos] = useState(null);

  // Using ref to store BeaconWallet instance to prevent multiple instances
  const beaconWalletRef = useRef(null);

  // Initialize BeaconWallet and TezosToolkit on mount
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        console.log('Initializing wallet for network: ghostnet');
        const networkConfig = NETWORKS['ghostnet'];

        // Initialize BeaconWallet only if not already initialized
        if (!beaconWalletRef.current) {
          const beaconWallet = new BeaconWallet({
            name: 'SaveTheWorldWithArt.io',
            preferredNetwork: networkConfig.type,
            disableDefaultEvents: false, // Enable wallet selection
            enableLogging: true, // Enables logging for debugging
          });

          beaconWalletRef.current = beaconWallet;

          // Initialize Tezos Toolkit with the selected network's RPC
          const tezosToolkit = new TezosToolkit(networkConfig.rpcUrl);
          tezosToolkit.setWalletProvider(beaconWallet);

          setTezos(tezosToolkit);

          console.log('BeaconWallet and TezosToolkit initialized successfully.');

          // Check for active account
          const activeAccount = await beaconWallet.client.getActiveAccount();
          if (activeAccount) {
            console.log('Active account found during initialization:', activeAccount);
            setWalletAddress(activeAccount.address);
            setIsWalletConnected(true);
          } else {
            console.log('No active account found during initialization.');
          }
        } else {
          console.log('BeaconWallet already initialized for the current network.');
        }
      } catch (error) {
        console.error('Error initializing wallet:', error);
      }
    };

    initializeWallet();
  }, []);

  // Connect Wallet Function
  const connectWallet = useCallback(async () => {
    const beaconWallet = beaconWalletRef.current;
    if (!beaconWallet) {
      console.warn('BeaconWallet is not initialized.');
      return;
    }

    try {
      console.log('Attempting to connect wallet...');
      const activeAccount = await beaconWallet.client.getActiveAccount();
      console.log('Active account fetched:', activeAccount);

      if (!activeAccount) {
        console.log('No active account found. Requesting permissions...');
        await beaconWallet.requestPermissions();
        console.log('Permissions requested.');
      }

      const userAddress = await beaconWallet.getPKH();
      setWalletAddress(userAddress);
      setIsWalletConnected(true);
      console.log(`Wallet connected: ${userAddress}`);
    } catch (error) {
      console.error('Wallet Connection Error:', error);
      // Optionally, you can set error state here to inform the user
    }
  }, []);

  // Disconnect Wallet Function
  const disconnectWallet = useCallback(async () => {
    const beaconWallet = beaconWalletRef.current;
    if (!beaconWallet) {
      console.warn('BeaconWallet is not initialized.');
      return;
    }

    try {
      console.log('Disconnecting wallet...');
      await beaconWallet.clearActiveAccount();
      setWalletAddress('');
      setIsWalletConnected(false);
      console.log('Wallet disconnected successfully.');
    } catch (error) {
      console.error('Wallet Disconnection Error:', error);
      // Optionally, you can set error state here to inform the user
    }
  }, []);

  // Polling for Account Changes (Optional but useful for multi-account scenarios)
  useEffect(() => {
    let interval = null;

    const checkActiveAccount = async () => {
      const beaconWallet = beaconWalletRef.current;
      if (!beaconWallet || !isWalletConnected) return;

      try {
        const userAddress = await beaconWallet.getPKH();
        if (userAddress && userAddress !== walletAddress) {
          console.log(`Active account updated: ${userAddress}`);
          setWalletAddress(userAddress);
        }
      } catch (error) {
        console.error('Error checking active account:', error);
      }
    };

    if (isWalletConnected) {
      // Initial check
      checkActiveAccount();

      // Polling: Check every 5 seconds
      interval = setInterval(() => {
        checkActiveAccount();
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWalletConnected, walletAddress]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isWalletConnected,
        connectWallet,
        disconnectWallet,
        tezos,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
