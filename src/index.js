// src/index.js

import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import process from 'process';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import PasswordProtect from './PasswordProtect'; // Import the PasswordProtect component
import { WalletProvider } from './contexts/WalletContext'; // Import WalletProvider

// Setup globals after imports
window.Buffer = Buffer;
window.process = process;

// Suppress specific warnings
const originalConsoleError = console.error;
console.error = (...args) => {
  if (/React Router Future Flag Warning/.test(args[0])) {
    return;
  }
  originalConsoleError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WalletProvider>
      <PasswordProtect>
        <App />
      </PasswordProtect>
    </WalletProvider>
  </React.StrictMode>
);

reportWebVitals();
