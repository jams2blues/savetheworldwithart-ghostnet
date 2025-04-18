/*Developed by @jams2blues with love for the Tezos community
  File: src/contexts/WalletContext.js
  Summary: Wallet provider with automatic multi‑RPC fallback, Beacon
           “Syncing stopped manually” patch, and new WalletConnect
           “Proposal expired” patch. Public API unchanged.
*/
import React, { createContext, useState, useEffect } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { BeaconEvent } from '@airgap/beacon-sdk';
import { NETWORKS, DEFAULT_NETWORK } from '../config/networkConfig';

/* ── Beacon “Syncing stopped manually” swallow (unchanged) ─────── */
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

/* ── WalletConnect “Proposal expired” swallow (NEW) ─────────────── */
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

/* ── Context setup ─────────────────────────────────────────────── */
export const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const netCfg = NETWORKS[DEFAULT_NETWORK];

  const [tezos,  setTezos]   = useState(null);
  const [wallet, setWallet]  = useState(null);
  const [walletAddress, setAddress] = useState('');
  const [isWalletConnected, setConnected] = useState(false);
  const [activeRpc, setActiveRpc] = useState(netCfg.rpcUrl);

  /* Probe RPC list (and optional override) until one passes CORS */
  const pickRpc = async () => {
    const forced = localStorage.getItem('ZEROART_RPC');
    const pool = forced ? [forced, ...netCfg.rpcUrls] : netCfg.rpcUrls;
    for (const url of pool) {
      try {
        const ctrl = new AbortController();
        const id   = setTimeout(() => ctrl.abort(), 3000);
        const res  = await fetch(`${url}/chains/main/chain_id`, { mode: 'cors', signal: ctrl.signal });
        clearTimeout(id);
        if (res.ok) return url;
      } catch {/* try next */}
    }
    throw new Error('No reachable RPC with CORS enabled');
  };

  useEffect(() => {
    (async () => {
      try {
        const rpc = await pickRpc();
        setActiveRpc(rpc);

        const tk = new TezosToolkit(rpc);
        const bw = new BeaconWallet({ name: 'ZeroArt DApp', preferredNetwork: netCfg.type });
        tk.setWalletProvider(bw);

        bw.client.subscribeToEvent(BeaconEvent.ACTIVE_ACCOUNT_SET, async (acc) => {
          if (acc) { setAddress(await bw.getPKH()); setConnected(true); }
          else     { setAddress('');               setConnected(false); }
        });

        const acc = await bw.client.getActiveAccount();
        if (acc) { setAddress(await bw.getPKH()); setConnected(true); }

        setTezos(tk);
        setWallet(bw);
        console.log(`ZeroArt → using RPC ${rpc}`);
      } catch (err) {
        console.error('Wallet initialisation failed:', err.message);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netCfg.name]);

  const connectWallet = async () =>
    wallet?.requestPermissions({ network: { type: netCfg.type } });

  const disconnectWallet = async () => {
    try { await wallet?.clearActiveAccount(); }
    finally { setAddress(''); setConnected(false); }
  };

  return (
    <WalletContext.Provider value={{
      tezos,
      wallet,
      walletAddress,
      isWalletConnected,
      network: netCfg.name,
      activeRpc,
      connectWallet,
      disconnectWallet,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
