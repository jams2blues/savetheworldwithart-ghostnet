/*Developed by @jams2blues with love for the Tezos community
  File: src/components/ManageContract/Transfer.js
  Summary: No-code batch transfer — Grid V2-safe (size prop only).
*/

import React, { useState, useContext } from 'react';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
  Tooltip,
  Alert,
  Box,
} from '@mui/material';
import { WalletContext } from '../../contexts/WalletContext';

/* ─── helpers ────────────────────────────────────── */
const isTezosAddr = (s) =>
  /^(tz1|tz2|tz3)[1-9A-HJ-NP-Za-km-z]{33}$/.test(s.trim());

const parseRecipients = (raw) =>
  raw
    .split(/[\s,]+/) // newline, space, or comma
    .map((s) => s.trim())
    .filter(Boolean);

/* ─── component ─────────────────────────────────── */
const Transfer = ({ contractAddress, tezos, setSnackbar }) => {
  const { walletAddress } = useContext(WalletContext);

  const [fromAddr, setFrom]    = useState(walletAddress || '');
  const [tokenId,  setTokenId] = useState('');
  const [amount,   setAmount]  = useState('1');
  const [rawList,  setRawList] = useState('');
  const [loading,  setLoading] = useState(false);

  const snack = (m, sev = 'warning') =>
    setSnackbar({ open: true, message: m, severity: sev });

  const handleSend = async () => {
    const recips = parseRecipients(rawList);
    if (!isTezosAddr(fromAddr))   return snack('Invalid sender address');
    if (recips.length === 0)      return snack('Paste at least one address');
    if (recips.some((a) => !isTezosAddr(a)))
      return snack('One or more recipient addresses are invalid');
    const id  = Number(tokenId);
    const amt = Number(amount);
    if (!Number.isFinite(id)  || id  < 0) return snack('Token-ID must be ≥ 0');
    if (!Number.isFinite(amt) || amt <= 0) return snack('Amount must be ≥ 1');

    const txs = recips.map((to_) => ({ to_, token_id: id, amount: amt }));
    const params = [{ from_: fromAddr, txs }];

    try {
      setLoading(true);
      const c  = await tezos.wallet.at(contractAddress);
      const op = await c.methods.transfer(params).send();
      snack('Batch transfer in progress…', 'info');
      await op.confirmation();
      snack('Tokens sent ✅', 'success');
      setRawList('');
    } catch (e) {
      snack(`Transfer failed: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ─── UI ───────────────────────────────────────── */
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6">Batch Transfer NFTs</Typography>

      <Grid container spacing={2} sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Sender (from_) *"
            value={fromAddr}
            onChange={(e) => setFrom(e.target.value.trim())}
            fullWidth
            placeholder="tz1… (defaults to your wallet)"
          />
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="Token-ID *"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value.replace(/\D/g, ''))}
            fullWidth
            placeholder="0"
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
          />
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="Amount each *"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value.replace(/\D/g, '') || '1')
            }
            fullWidth
            placeholder="1"
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
          />
        </Grid>

        <Grid size={12}>
          <TextField
            label="Recipient addresses *"
            value={rawList}
            onChange={(e) => setRawList(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            placeholder="Paste tz1/tz2/tz3 addresses separated by space, comma, or newline"
          />
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
            Detected&nbsp;
            {parseRecipients(rawList).filter(isTezosAddr).length}&nbsp;valid /
            {parseRecipients(rawList).length}&nbsp;total
          </Typography>
        </Grid>
      </Grid>

      {parseRecipients(rawList).some((a) => !isTezosAddr(a)) && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Some entries are not valid Tezos addresses and will block transfer.
        </Alert>
      )}

      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Tooltip title="One FA2 call, many recipients – gas-efficient." arrow>
          <span>
            <Button
              variant="contained"
              color="warning"
              onClick={handleSend}
              disabled={
                loading ||
                !fromAddr ||
                !tokenId ||
                !amount ||
                parseRecipients(rawList).length === 0
              }
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Sending…' : 'Send Batch'}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Transfer;
