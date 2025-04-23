/*Developed by @jams2blues with love for the Tezos community
  File: src/config/networkConfig.js
  Summary: Minimal, CORS-clean RPC catalogue with a build-time default flag.
*/

import { NetworkType } from '@airgap/beacon-sdk';

/* —— Public endpoints verified for CORS + large-payload operations —— */
const RPCS = {
  ghostnet: [
    'https://rpc.ghostnet.teztnets.com',
    'https://ghostnet.ecadinfra.com'
  ],
  mainnet: [
    'https://mainnet.ecadinfra.com',
    'https://mainnet.api.tez.ie'
  ]
};

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

/*  Flip this flag per-deployment or when running `yarn dev` locally. */
export const DEFAULT_NETWORK = 'ghostnet';
