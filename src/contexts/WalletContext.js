/*Developed by @jams2blues with love for the Tezos community
  File: src/contexts/WalletContext.js
  Summary: Wallet provider _without_ auto-switching.  Detects
           (1) account/network mismatch and (2) unrevealed keys,
           exposing flags + a helper to launch a 0 ꜩ reveal batch.
*/

import React, { createContext, useState, useEffect } from 'react';
import { TezosToolkit, OpKind } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { BeaconEvent } from '@airgap/beacon-sdk';
import { NETWORKS, DEFAULT_NETWORK } from '../config/networkConfig';

/* —— Beacon “Syncing stopped manually” swallow —— */
if (typeof BeaconWallet !== 'undefined' && BeaconWallet.prototype) {
  const proto = BeaconWallet.prototype.client?.constructor?.prototype;
  if (proto) {
    ['pollSync', 'destroy'].forEach((fn) => {
      const orig = proto[fn];
      proto[fn] = async function (...a) {
        try { return await orig.apply(this, a); }
        catch (e) { if (!e.message?.includes('Syncing stopped manually')) throw e; }
      };
    });
  }
}

/* —— WalletConnect “Proposal expired” swallow —— */
if (typeof BeaconWallet !== 'undefined' && BeaconWallet.prototype?.client) {
  const wcClient = BeaconWallet.prototype.client.walletConnectClient;
  if (wcClient?.core?.pairing) {
    const origExpire = wcClient.core.pairing.expire;
    wcClient.core.pairing.expire = async function (...a) {
      try { return await origExpire.apply(this, a); }
      catch (e) { if (!e.message?.includes('Proposal expired')) throw e; }
    };
  }
}

/* —— Context setup —— */
export const WalletContext = createContext();

/* tiny util */
const pickRpc = async (list) => {
  for (const url of list) {
    try {
      const ctrl = new AbortController();
      const id   = setTimeout(() => ctrl.abort(), 3000);
      const res  = await fetch(`${url}/chains/main/chain_id`, { mode: 'cors', signal: ctrl.signal });
      clearTimeout(id);
      if (res.ok) return url;
    } catch { /* try next */ }
  }
  throw new Error('No reachable RPC with CORS enabled');
};

export const WalletProvider = ({ children }) => {
  const netCfg                     = NETWORKS[DEFAULT_NETWORK];
  const [tezos, setTezos]          = useState(null);
  const [wallet, setWallet]        = useState(null);
  const [activeRpc, setActiveRpc]  = useState(netCfg.rpcUrls[0]);

  /* session state */
  const [walletAddress, setAddress]       = useState('');
  const [isWalletConnected, setConnected] = useState(false);

  /* UX helpers */
  const [networkMismatch, setMismatch] = useState(false);  // wallet ≠ site
  const [needsReveal, setNeedsReveal]  = useState(false);  // manager_key == null

  /** init once */
  useEffect(() => {
    (async () => {
      try {
        const rpc = await pickRpc(netCfg.rpcUrls);
        setActiveRpc(rpc);

        const tk     = new TezosToolkit(rpc);
        const beacon = new BeaconWallet({ name: 'ZeroArt DApp', preferredNetwork: netCfg.type });
        tk.setWalletProvider(beacon);

        const syncState = async (acc) => {
          if (!acc) {               // disconnected
            setAddress('');
            setConnected(false);
            setMismatch(false);
            setNeedsReveal(false);
            return;
          }
          setAddress(await beacon.getPKH());
          setConnected(true);

          /* 1 ·  chain mismatch check (no auto-switch) */
          const beaconNet = (acc.network?.type || '').toLowerCase();
          setMismatch(beaconNet && beaconNet !== netCfg.name);

          /* 2 ·  reveal check */
          try { setNeedsReveal(!(await tk.rpc.getManagerKey(acc.address))); }
          catch { setNeedsReveal(false); }
        };

        beacon.client.subscribeToEvent(BeaconEvent.ACTIVE_ACCOUNT_SET, syncState);
        syncState(await beacon.client.getActiveAccount());

        setTezos(tk);
        setWallet(beacon);
        console.log(`ZeroArt → RPC ${rpc}`);
      } catch (e) {
        console.error('Wallet bootstrap failed:', e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* connect / disconnect */
  const connectWallet    = () => wallet?.requestPermissions({ network: { type: netCfg.type } });
  const disconnectWallet = async () => {
    try { await wallet?.clearActiveAccount(); }
    finally {
      setAddress('');
      setConnected(false);
      setMismatch(false);
      setNeedsReveal(false);
    }
  };

  /* one-click “reveal” helper – batches a REVEAL + 0 ꜩ tx */
  const revealAccount = async () => {
    if (!tezos || !walletAddress) throw new Error('Wallet not ready');
    const batch = tezos.wallet.batch([
      { kind: OpKind.REVEAL },
      { kind: OpKind.TRANSACTION, to: walletAddress, amount: 0 }
    ]);
    const op = await batch.send();
    await op.confirmation();
    setNeedsReveal(false);
    return op.opHash;
  };

  return (
    <WalletContext.Provider value={{
      /* toolkit */
      tezos,
      wallet,
      activeRpc,
      network: netCfg.name,
      /* session */
      walletAddress,
      isWalletConnected,
      connectWallet,
      disconnectWallet,
      /* diagnostics */
      networkMismatch,
      needsReveal,
      revealAccount
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
