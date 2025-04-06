// src/contexts/WalletContext.js
/* this app was developed by @jams2blues with love for the Tezos community */
import React, { createContext, useState, useEffect } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { BeaconEvent } from '@airgap/beacon-sdk';
import { NETWORKS } from '../config/networkConfig';

/*
  Patch matrixClient methods to ignore "Syncing stopped manually" errors
  (Carried over from earlier versions to handle Beacon quirks).
*/
if (typeof BeaconWallet !== 'undefined' && BeaconWallet.prototype) {
  const clientProto = BeaconWallet.prototype.client?.constructor?.prototype;
  if (clientProto) {
    const originalPollSync = clientProto.pollSync;
    clientProto.pollSync = async function (...args) {
      try {
        await originalPollSync.apply(this, args);
      } catch (error) {
        if (error.message && error.message.includes("Syncing stopped manually")) {
          console.warn("Ignored pollSync error:", error.message);
        } else {
          throw error;
        }
      }
    };

    const originalDestroy = clientProto.destroy;
    clientProto.destroy = async function (...args) {
      try {
        return await originalDestroy.apply(this, args);
      } catch (error) {
        if (error.message && error.message.includes("Syncing stopped manually")) {
          console.warn("Ignored destroy error:", error.message);
        } else {
          throw error;
        }
      }
    };
  }
}

export const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  /**
   * Simply change this line to "mainnet" for your mainnet build:
   * const defaultNetwork = 'mainnet';
   */
  const defaultNetwork = 'ghostnet';

  // Retrieve matching RPC from your config
  const networkConfig = NETWORKS[defaultNetwork];

  const [tezos, setTezos] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    const initWallet = async () => {
      // Clear any active account on re-init, if a wallet instance already exists
      if (wallet) {
        try {
          await wallet.clearActiveAccount();
        } catch (error) {
          console.warn('Error clearing active account during reinitialization:', error.message);
        }
      }

      const rpcURL = networkConfig.rpcUrl;
      const newTezos = new TezosToolkit(rpcURL);
      const newWallet = new BeaconWallet({
        name: 'ZeroArt DApp',
        preferredNetwork: networkConfig.type,
      });

      newTezos.setWalletProvider(newWallet);

      // Listen for changes to the active account
      newWallet.client.subscribeToEvent(BeaconEvent.ACTIVE_ACCOUNT_SET, async (account) => {
        if (account) {
          const address = await newWallet.getPKH();
          setWalletAddress(address);
          setIsWalletConnected(true);
          console.log(`Active account set: ${address} on ${defaultNetwork}`);
        } else {
          setWalletAddress('');
          setIsWalletConnected(false);
          console.log('Wallet disconnected');
        }
      });

      // Check for a persisted active account
      const activeAccount = await newWallet.client.getActiveAccount();
      if (activeAccount) {
        const address = await newWallet.getPKH();
        setWalletAddress(address);
        setIsWalletConnected(true);
        console.log('Active account found during initialization:', activeAccount);
      } else {
        console.log('No active account found during initialization.');
      }

      setTezos(newTezos);
      setWallet(newWallet);
    };

    initWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultNetwork]);

  const connectWallet = async () => {
    if (!wallet) return;
    try {
      console.log('Connecting wallet...');
      await wallet.requestPermissions({
        network: { type: networkConfig.type },
      });
      const address = await wallet.getPKH();
      setWalletAddress(address);
      setIsWalletConnected(true);
      console.log(`Wallet connected: ${address} on ${defaultNetwork}`);
    } catch (err) {
      if (err?.message?.includes("Proposal expired")) {
        // Graceful handling for timed-out wallet connection
        alert("Your connection session expired. Please try connecting again.");
        // Optionally reset state, log out, or re-init the wallet here
        console.warn("Proposal expired:", err);
      } else if (err?.message?.includes("Secret seed not found")) {
        console.error("Secret seed not found; reinitializing wallet...");
        try {
          await wallet.clearActiveAccount();
        } catch (destroyErr) {
          console.warn("Error clearing active account:", destroyErr);
        }
        setWalletAddress("");
        setIsWalletConnected(false);
      } else {
        console.error("Wallet connection failed:", err);
      }
    }
  };  

  const disconnectWallet = async () => {
    if (!wallet) return;
    try {
      await wallet.clearActiveAccount();
      console.log('Wallet cleared active account.');
    } catch (error) {
      console.warn('Error during disconnect:', error.message);
    }
    setWalletAddress('');
    setIsWalletConnected(false);
    console.log('Wallet manually disconnected');
  };

  return (
    <WalletContext.Provider
      value={{
        tezos,
        wallet,
        walletAddress,
        isWalletConnected,
        network: defaultNetwork, // Provided for the Header selector
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
