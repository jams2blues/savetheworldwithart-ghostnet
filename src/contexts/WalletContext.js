/*Developed by @jams2blues with love for the Tezos community
  File: src/contexts/WalletContext.js
  Summary: Sticky-writer wallet context — probes fastest RPC, stores it in
           localStorage, and protects against unconfirmed mints. 2025-05-10.
*/

import React, { createContext, useState, useEffect } from 'react';
import { TezosToolkit }        from '@taquito/taquito';
import { BeaconWallet }        from '@taquito/beacon-wallet';
import { BeaconEvent }         from '@airgap/beacon-sdk';
import { NETWORKS, DEFAULT_NETWORK } from '../config/networkConfig';

export const WalletContext = createContext();

/* —— suppress known benign Beacon / WC2 console spam —— */
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
  const wc = BeaconWallet.prototype.client?.walletConnectClient?.core?.pairing;
  if (wc) {
    const orig = wc.expire;
    wc.expire = async function (...a) {
      try { return await orig.apply(this, a); }
      catch (e) { if (!e.message?.includes('Proposal expired')) throw e; }
    };
  }
}

/* —— helper: reach-first RPC probe, 3 s timeout, sticky in localStorage —— */
const pickRpc = async (urls, net) => {
  const key   = `zeroart_rpc_${net}`;
  const saved = (typeof localStorage !== 'undefined') && localStorage.getItem(key);
  const order = saved ? [saved, ...urls.filter((u) => u !== saved)] : urls;

  for (const url of order) {
    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res   = await fetch(`${url}/chains/main/chain_id`, { mode: 'cors', signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        if (saved !== url) localStorage.setItem(key, url);
        return url;
      }
    } catch { /* continue */ }
  }
  throw new Error('No reachable RPC with CORS enabled');
};

export const WalletProvider = ({ children }) => {
  const netCfg = NETWORKS[DEFAULT_NETWORK];

  const [tezos,  setTezos]      = useState(null);
  const [wallet, setWallet]     = useState(null);
  const [activeRpc, setActive]  = useState(netCfg.rpcUrls[0]);

  /* session */
  const [walletAddress, setAddress]       = useState('');
  const [isWalletConnected, setConnected] = useState(false);

  /* UX flags */
  const [networkMismatch, setMismatch] = useState(false);
  const [needsReveal,     setReveal]   = useState(false);
  const [needsFunds,      setFunds]    = useState(false);

  /* —— bootstrap —— */
  useEffect(() => {
    (async () => {
      try {
        /* 1. choose writer RPC & init toolkit */
        const rpc = await pickRpc(netCfg.rpcUrls, netCfg.name);
        setActive(rpc);

        const tk      = new TezosToolkit(rpc);
        tk.setProvider({
          config: {
            confirmationPollingIntervalSecond: 5,
            confirmationPollingTimeoutSecond : 300
          }
        });

        const beacon  = new BeaconWallet({ name: 'ZeroArt DApp', preferredNetwork: netCfg.type });
        tk.setWalletProvider(beacon);

        /* 2. session sync helper */
        const sync = async (acc) => {
          const account = acc || await beacon.client.getActiveAccount();
          if (!account) {
            setAddress(''); setConnected(false);
            setMismatch(false); setReveal(false); setFunds(false);
            return;
          }

          setAddress(account.address);
          setConnected(true);
          setMismatch((account.network?.type || '').toLowerCase() !== netCfg.name);

          /* reveal / balance guards */
          try {
            const [mgr, bal] = await Promise.all([
              tk.rpc.getManagerKey(account.address).catch(() => null),
              tk.tz.getBalance(account.address).catch(() => 0)
            ]);
            setReveal(!mgr);
            setFunds(Number(bal) === 0);
          } catch {
            setReveal(false); setFunds(false);
          }
        };

        beacon.client.subscribeToEvent(BeaconEvent.ACTIVE_ACCOUNT_SET, sync);
        sync(await beacon.client.getActiveAccount());

        setTezos(tk);
        setWallet(beacon);
        console.log(`ZeroArt → sticky RPC ${rpc}`);
      } catch (e) {
        console.error('Wallet bootstrap failed:', e.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* —— wallet helpers —— */
  const connectWallet = () =>
    wallet?.requestPermissions({ network: { type: netCfg.type } });

  const disconnectWallet = async () => {
    try { await wallet?.clearActiveAccount(); }
    finally {
      setAddress(''); setConnected(false);
      setMismatch(false); setReveal(false); setFunds(false);
    }
  };

  /* 1 mutez self-tx → reveal for proto-022 */
  const revealAccount = async () => {
    if (!tezos || !walletAddress) throw new Error('Wallet not ready');
    if (needsFunds) throw new Error('Fund your wallet before revealing');

    const op = await tezos.wallet.transfer({ to: walletAddress, amount: 0.000001 }).send();
    await op.confirmation();
    setReveal(false);
    return op.opHash;
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

/*— EOF —*/
