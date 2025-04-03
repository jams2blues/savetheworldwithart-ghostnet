// src/config/networkConfig.js

import { NetworkType } from '@airgap/beacon-sdk';

export const NETWORKS = {
  ghostnet: {
    name: 'ghostnet',
    rpcUrl: process.env.REACT_APP_TEZOS_GHOSTNET_RPC || 'https://rpc.ghostnet.teztnets.com/',
    type: NetworkType.GHOSTNET,
  },
};
