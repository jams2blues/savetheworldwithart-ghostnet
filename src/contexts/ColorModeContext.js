/*Developed by @jams2blues with love for the Tezos community
  File: src/contexts/ColorModeContext.js
  Summary: React context exposing palette mode and a toggle function.
*/

import React from 'react';

/** global color‑scheme context (light | dark) */
export const ColorModeContext = React.createContext({
  mode: 'light',
  // eslint‑disable-next-line @typescript-eslint/no-empty-function
  toggleColorMode: () => {},
});

export default ColorModeContext;