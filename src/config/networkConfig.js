// src/config/networkConfig.js
// Summary: Provides network configuration objects for mainnet and ghostnet.
/* this app was developed by @jams2blues with love for the Tezos community */
import { NetworkType } from '@airgap/beacon-sdk';

export const NETWORKS = {
  mainnet: {
    name: 'mainnet',
    rpcUrl: 'https://mainnet.api.tez.ie',
    type: NetworkType.MAINNET,
  },
  ghostnet: {
    name: 'ghostnet',
    rpcUrl: 'https://ghostnet.ecadinfra.com',
    type: NetworkType.GHOSTNET,
  },
};
