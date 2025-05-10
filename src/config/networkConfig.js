/*Developed by @jams2blues with love for the Tezos community
  File: src/config/networkConfig.js
  Summary: Redundant, CORS-clean RPC catalogue + writer-stickiness hint
*/

import { NetworkType } from '@airgap/beacon-sdk';

/*—— Public endpoints (CORS-OK & large-payload tested) ——*/
const RPCS = {
  ghostnet: [
    'https://rpc.ghostnet.teztnets.com',      // Rapid EU+US CDN
    'https://ghostnet.tezos.ecadinfra.com',   // ECAD Infra (May-2025 domain)
    'https://rpc.tzkt.io/ghostnet'            // Baking Bad – high U.S. uptime
  ],
  mainnet: [
    'https://prod.tcinfra.net/rpc/mainnet',   // Tezos Commons – autoscaling cluster
    'https://mainnet.tezos.ecadinfra.com',    // ECAD Infra (primary)
    'https://rpc.tzkt.io/mainnet',            // Baking Bad
    'https://mainnet.smartpy.io'              // SmartPy – generous CORS
  ]
};

/*—— Network descriptors (used by WalletContext) ——*/
export const NETWORKS = {
  ghostnet: {
    name:  'ghostnet',
    rpcUrls: RPCS.ghostnet,
    type:  NetworkType.GHOSTNET
  },
  mainnet: {
    name:  'mainnet',
    rpcUrls: RPCS.mainnet,
    type:  NetworkType.MAINNET
  }
};

/* Flip when building for production mainnet */
export const DEFAULT_NETWORK = 'ghostnet';

/*— EOF —*/
