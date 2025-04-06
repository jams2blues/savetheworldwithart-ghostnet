// src/hooks/usePrompt.js
/* this app was developed by @jams2blues with love for the Tezos community */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const usePrompt = (message, when) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!when) return;
    const unblock = navigate.block((tx) => {
      if (window.confirm(message)) {
        unblock();
        tx.retry();
      }
    });
    return () => {
      unblock();
    };
  }, [when, message, navigate, location]);
};
