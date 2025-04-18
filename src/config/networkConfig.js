/*Developed by @jams2blues with love for the Tezos community
  File: src/config/networkConfig.js
  Summary: Mainnet‑default network catalogue with multi‑RPC arrays.
*/
import { NetworkType } from '@airgap/beacon-sdk';

const CORS_FRIENDLY = {
  mainnet: [
    'https://mainnet.api.tez.ie',          // Tezos Foundation load‑balancer :contentReference[oaicite:2]{index=2}
    'https://rpc.tzkt.io/mainnet',         // Baking Bad / TzKT :contentReference[oaicite:3]{index=3}
    'https://mainnet.smartpy.io',          // SmartPy public node (CORS ok) :contentReference[oaicite:4]{index=4}
    'https://mainnet.tezos.marigold.dev',  // Marigold RPC :contentReference[oaicite:5]{index=5}
  ],
  ghostnet: [
    // kept for the toggle
    'https://rpc.ghostnet.teztnets.com',
    'https://ghostnet.tzkt.io',
    'https://ghostnet.tezos.marigold.dev',
    'https://ghostnet.ecadinfra.com',
  ],
};

export const NETWORKS = {
  mainnet: {
    name: 'mainnet',
    rpcUrls: CORS_FRIENDLY.mainnet,
    rpcUrl:  CORS_FRIENDLY.mainnet[0],
    type: NetworkType.MAINNET,
  },
  ghostnet: {
    name: 'ghostnet',
    rpcUrls: CORS_FRIENDLY.ghostnet,
    rpcUrl:  CORS_FRIENDLY.ghostnet[0],
    type: NetworkType.GHOSTNET,
  },
};

/* The build‑time flag: mainnet site hard‑codes to mainnet */
export const DEFAULT_NETWORK = 'ghostnet';
