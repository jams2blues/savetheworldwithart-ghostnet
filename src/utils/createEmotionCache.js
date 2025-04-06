// src/utils/createEmotionCache.js
// Summary: Creates an Emotion cache instance with prepend set to true.
/* this app was developed by @jams2blues with love for the Tezos community */
import createCache from '@emotion/cache';

export default function createEmotionCache() {
  return createCache({ key: 'css', prepend: true });
}
