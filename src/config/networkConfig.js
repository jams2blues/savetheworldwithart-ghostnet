/*Developed by @jams2blues with love for the Tezos community
  File: src/config/networkConfig.js
  Summary: Central network catalogue with CORS‑aware multi‑RPC arrays plus
           one‑liner helpers for legacy code.
*/
import { NetworkType } from '@airgap/beacon-sdk';

/* ── Ordered by observed reliability & CORS friendliness ───────── */
const CORS_FRIENDLY = {
  ghostnet: [
    'https://rpc.ghostnet.teztnets.com',
    'https://ghostnet.tzkt.io',
    'https://ghostnet.tezos.marigold.dev',
    'https://ghostnet.ecadinfra.com',
  ],
  mainnet: [
    'https://mainnet.api.tez.ie',
    'https://rpc.tzkt.io/mainnet',
    'https://mainnet.smartpy.io',
    'https://mainnet.tezos.marigold.dev',
  ],
};

/* ── Exported object used throughout the app ───────────────────── */
export const NETWORKS = {
  ghostnet: {
    name: 'ghostnet',
    rpcUrls: CORS_FRIENDLY.ghostnet,
    /** first item kept for legacy code that still dereferences `.rpcUrl` */
    rpcUrl:  CORS_FRIENDLY.ghostnet[0],
    type: NetworkType.GHOSTNET,
  },
  mainnet: {
    name: 'mainnet',
    rpcUrls: CORS_FRIENDLY.mainnet,
    rpcUrl:  CORS_FRIENDLY.mainnet[0],
    type: NetworkType.MAINNET,
  },
};

/* Helper so Header.js can keep doing `value={network}` */
export const DEFAULT_NETWORK =
  process.env.NEXT_PUBLIC_DEFAULT_NETWORK?.trim()?.toLowerCase() === 'mainnet'
    ? 'mainnet'
    : 'ghostnet';
