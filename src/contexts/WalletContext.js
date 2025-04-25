/*Developed by @jams2blues with love for the Tezos community
  File: src/contexts/WalletContext.js
  Summary: Wallet provider — adds empty-balance check, smarter reveal
           (1 mutez self-tx to bypass empty_transaction), and friendly
           error bubbling instead of crashing React.
*/

import React, { createContext, useState, useEffect } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { BeaconEvent } from '@airgap/beacon-sdk';
import { NETWORKS, DEFAULT_NETWORK } from '../config/networkConfig';

/* —— Beacon noise swallow —— */
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

/* —— WalletConnect noise swallow —— */
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

export const WalletContext = createContext();

/* reach-first RPC helper */
const pickRpc = async (list) => {
  for (const url of list) {
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`${url}/chains/main/chain_id`, { mode: 'cors', signal: ctrl.signal });
      clearTimeout(id);
      if (res.ok) return url;
    } catch {/* try next */}
  }
  throw new Error('No reachable RPC with CORS enabled');
};

export const WalletProvider = ({ children }) => {
  const netCfg = NETWORKS[DEFAULT_NETWORK];
  const [tezos, setTezos] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [activeRpc, setActiveRpc] = useState(netCfg.rpcUrls[0]);

  /* session state */
  const [walletAddress, setAddress] = useState('');
  const [isWalletConnected, setConnected] = useState(false);

  /* UX flags */
  const [networkMismatch, setMismatch] = useState(false);
  const [needsReveal, setNeedsReveal] = useState(false);
  const [needsFunds, setNeedsFunds] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rpc = await pickRpc(netCfg.rpcUrls);
        setActiveRpc(rpc);

        const tk = new TezosToolkit(rpc);
        const beacon = new BeaconWallet({ name: 'ZeroArt DApp', preferredNetwork: netCfg.type });
        tk.setWalletProvider(beacon);

        const syncState = async (acc) => {
          if (!acc) {                     // disconnected
            setAddress('');
            setConnected(false);
            setMismatch(false);
            setNeedsReveal(false);
            setNeedsFunds(false);
            return;
          }

          const pkh = await beacon.getPKH();
          setAddress(pkh);
          setConnected(true);

          /* chain mismatch */
          const beaconNet = (acc.network?.type || '').toLowerCase();
          setMismatch(beaconNet && beaconNet !== netCfg.name);

          /* reveal + balance checks */
          try {
            const [mgr, bal] = await Promise.all([
              tk.rpc.getManagerKey(pkh).catch(() => null),
              tk.tz.getBalance(pkh).catch(() => 0)
            ]);
            setNeedsReveal(!mgr);
            setNeedsFunds(Number(bal) === 0);
          } catch {
            setNeedsReveal(false);
            setNeedsFunds(false);
          }
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

  /* connect / disconnect helpers */
  const connectWallet = () =>
    wallet?.requestPermissions({ network: { type: netCfg.type } });

  const disconnectWallet = async () => {
    try { await wallet?.clearActiveAccount(); }
    finally {
      setAddress(''); setConnected(false);
      setMismatch(false); setNeedsReveal(false); setNeedsFunds(false);
    }
  };

  /* safe reveal — 1 mutez self-tx to bypass proto.022 empty_transaction */
  const revealAccount = async () => {
    if (!tezos || !walletAddress) throw new Error('Wallet not ready');
    if (needsFunds) throw new Error('Fund your wallet before revealing'); // graceful guard

    try {
      const op = await tezos.wallet.transfer({ to: walletAddress, amount: 0.000001 }).send();
      await op.confirmation();
      setNeedsReveal(false);
      return op.opHash;
    } catch (e) {
      /* bubble a human-readable error for UI Snackbars */
      const msg = e?.message || 'Transaction invalid';
      throw new Error(`Reveal failed: ${msg}`);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        tezos, wallet, activeRpc,
        network: netCfg.name,
        walletAddress, isWalletConnected,
        connectWallet, disconnectWallet,
        networkMismatch, needsReveal, needsFunds, revealAccount
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
