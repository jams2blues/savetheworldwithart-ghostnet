/*Developed by @jams2blues with love for the Tezos community
  File: src/components/GenerateContract/GenerateContract.js
  Summary: Deploy V3 contracts with rich validation, guard-rails,
           UTF-8-safe metadata encoding, and dark-mode-friendly dialogs.
*/

import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import {
  Button,
  TextField,
  Typography,
  Paper,
  Snackbar,
  Alert,
  Grid,
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Link,
  Tooltip,
  IconButton,
  Box,
  useTheme
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { WalletContext } from '../../contexts/WalletContext';
import NFTPreview from './NFTPreview';
import FileUpload from './FileUpload';
import { MichelsonMap } from '@taquito/taquito';
import { BigNumber } from 'bignumber.js';

/* ─── styled helpers ───────────────────────────────────────────── */
const Container = styled(Paper)`
  padding: 20px;
  margin: 20px auto;
  max-width: 1200px;
  width: 95%;
  box-sizing: border-box;
  border-radius: 8px;
`;
const Section = styled('div')`
  margin-bottom: 30px;
`;
const Pre = styled('pre')(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
  color:            theme.palette.mode === 'dark' ? '#eeeeee' : '#000000',
  padding:          10,
  maxHeight:        300,
  overflow:         'auto',
  whiteSpace:       'pre-wrap',
  wordWrap:         'break-word',
  fontSize:         '0.9rem',
  borderRadius:     4
}));

/* ─── misc utils ───────────────────────────────────────────────── */
/* UTF-8 → hex helper (handles emoji / extended chars safely) */
const utf8ToHex = (str) =>
  Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const isAsciiPrintable = (s) => [...s].every((c) => {
  const code = c.charCodeAt(0);
  return code >= 0x20 && code <= 0x7e;          // space–tilde range
});

const isValidTezosAddress = (a) =>
  /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);

/* user-friendly error explainer */
const explainTezosError = (err) => {
  if (!err?.message) return 'Unknown error';
  const m = err.message.toLowerCase();
  if (m.includes('oversized operation')) return 'Contract metadata exceeds protocol size limits';
  if (m.includes('not enough tez') || m.includes('balance')) return 'Wallet balance too low for fees + storage';
  if (m.includes('forbidden') || m.includes('cors')) return 'RPC node rejected the request (CORS / auth)';
  if (m.includes('502') || m.includes('bad gateway')) return 'RPC node temporarily unavailable';
  if (m.includes('expired') || m.includes('proposal expired')) return 'Wallet session expired – reconnect the wallet';
  return err.message;
};

/* ─── on-chain constants ───────────────────────────────────────── */
const TEZOS_STORAGE_CONTENT_KEY = 'tezos-storage:content';
const TEZOS_STORAGE_CONTENT_HEX = utf8ToHex(TEZOS_STORAGE_CONTENT_KEY);
const CONTENT_KEY               = 'content';
const STORAGE_COST_PER_BYTE     = 0.00025;
const OVERHEAD_BYTES            = 5960;
const MAX_METADATA_SIZE         = 32_768;

/* Tooltip file-types (unchanged) */
const supportedFiletypesList = [
  'image/bmp', 'image/gif', 'image/jpeg', 'image/png', 'image/apng',
  'image/svg+xml', 'image/webp',
  'video/mp4', 'video/ogg', 'video/quicktime', 'video/webm',
  'text/plain', 'application/json', 'text/html'
];

/* V3 storage factory */
const getV3Storage = (addr, meta) => ({
  admin:          addr,
  all_tokens:     0,
  children:       [],
  collaborators:  [],
  contract_id:    '0x' + utf8ToHex('ZeroContract'),
  ledger:         new MichelsonMap(),
  lock:           false,
  metadata:       meta,
  next_token_id:  0,
  operators:      new MichelsonMap(),
  parents:        [],
  token_metadata: new MichelsonMap(),
  total_supply:   new MichelsonMap()
});

/* ─── main component ───────────────────────────────────────────── */
const GenerateContract = () => {
  const theme = useTheme();
  const {
    tezos,
    isWalletConnected,
    walletAddress,
    networkMismatch,
    needsReveal,
    revealAccount
  } = useContext(WalletContext);

  /* ── form / UI state ──────────────────────────── */
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    authors: '',
    authorAddresses: '',
    symbol: '',
    creators: '',
    type: 'art',
    imageUri: '',
    agreeToTerms: false
  });
  const [formErrors,        setFormErrors]        = useState({});
  const [snackbar,          setSnackbar]          = useState({ open: false, message: '', severity: 'info' });
  const [contractAddress,   setContractAddress]   = useState('');
  const [deploying,         setDeploying]         = useState(false);
  const [modifiedCode,      setModifiedCode]      = useState('');
  const [confirmDialog,     setConfirmDialog]     = useState({ open: false, data: null });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  /* autofill author / creator */
  useEffect(() => {
    if (!walletAddress) return;
    setFormData((prev) => {
      const next = { ...prev };
      if (!next.authorAddresses.trim()) next.authorAddresses = walletAddress;
      if (!next.creators.trim())        next.creators        = walletAddress;
      return next;
    });
  }, [walletAddress]);

  /* fee estimate snapshot */
  const [est, setEst] = useState({
    feeTez: null, gas: null, storage: null,
    storageCostTez: null, totalCostTez: null, balanceChangeTez: null
  });

  /* fetch Michelson */
  const [mich, setMich] = useState('');
  useEffect(() => {
    const fetchMich = async () => {
      try {
        const r = await fetch('/contracts/Zero_Contract_V3.tz');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setMich(await r.text());
      } catch (e) {
        console.error(e);
        setSnackbar({ open: true, message: 'Unable to load contract source', severity: 'error' });
      }
    };
    if (isWalletConnected && walletAddress) fetchMich();
    else setMich('');
  }, [isWalletConnected, walletAddress]);

  /* handle form changes */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const v  = type === 'checkbox' ? checked : value;
    setFormData((p) => ({ ...p, [name]: v }));
    setFormErrors((p) => ({ ...p, [name]: validateField(name, v) }));
  };

  /* validation rules */
  const validateField = (field, val) => {
    const asciiErr =
    typeof val === 'string' && !isAsciiPrintable(val)
      ? 'Only ASCII characters allowed'
      : '';
    switch (field) {
      case 'name':          return !val ? 'Name required'           : asciiErr || (val.length > 50 ? 'Max 50 chars' : '');
      case 'description':   return !val ? 'Description required'    : asciiErr || (val.length > 250 ? 'Max 250 chars' : '');
      case 'symbol':        return !val ? 'Symbol required'         : !/^[A-Za-z0-9]{3,5}$/.test(val) ? '3-5 alphanumerics' : '';
      case 'authors':       return !val ? 'Authors required'        : asciiErr || (val.length > 50 ? 'Max 50 chars' : '');
      case 'authorAddresses': {
        const auth  = formData.authors.split(',').map((x) => x.trim()).filter(Boolean);
        const addrs = val.split(',').map((x) => x.trim()).filter(Boolean);
        if (auth.length !== addrs.length) return 'Authors / addresses mismatch';
        if (addrs.some((a) => !isValidTezosAddress(a))) return 'Invalid address';
        return '';
      }
      case 'creators':      return !val ? 'Creators required'       : '';
      case 'imageUri':      return !val ? 'Thumbnail required'      : '';
      case 'agreeToTerms':  return val  ? ''                        : 'Must accept terms';
      default: return '';
    }
  };
  const validateForm = () => {
    const errs = {};
    Object.keys(formData).forEach((f) => {
      const e = validateField(f, formData[f]);
      if (e) errs[f] = e;
    });
    setFormErrors(errs);
    return !Object.keys(errs).length;
  };

  /* thumbnail upload */
  const handleThumbnailUpload = (uri) => {
    setFormData((p) => ({ ...p, imageUri: uri || '' }));
    setFormErrors((p) => ({ ...p, imageUri: validateField('imageUri', uri || '') }));
  };

  /* metadata preview */
  const preview = useMemo(() => ({
    name:         formData.name,
    description:  formData.description,
    interfaces:   ['TZIP-012', 'TZIP-016'],
    authors:      formData.authors.split(',').map((x) => x.trim()).filter(Boolean),
    authoraddress:formData.authorAddresses.split(',').map((x) => x.trim()).filter(Boolean),
    symbol:       formData.symbol,
    creators:     formData.creators.split(',').map((x) => x.trim()).filter(Boolean),
    type:         formData.type,
    imageUri:     formData.imageUri || ''
  }), [formData]);

  const metadataSize = useMemo(() =>
    utf8ToHex(JSON.stringify(preview)).length / 2 + OVERHEAD_BYTES,
    [preview]
  );

  /* rebuild code when valid */
  useEffect(() => {
    if (!mich || !validateForm()) { setModifiedCode(''); return; }
    setModifiedCode(mich);             // placeholder for injections
  }, [formData, mich]);

  /* copy helper (unchanged) */
  const copyToClipboard = async (txt) => {
    try { await navigator.clipboard.writeText(txt); return true; }
    catch { return false; }
  };

  /* DEPLOY handler (logic unchanged) */
  const handleDeployContract = async () => {
    if (networkMismatch) { setSnackbar({ open: true, message: 'Wallet is on the wrong network', severity: 'warning' }); return; }
    if (needsReveal)     { setSnackbar({ open: true, message: 'Reveal your account first', severity: 'info' }); return; }
    if (!validateForm()) { setSnackbar({ open: true, message: 'Fix validation errors first', severity: 'error' }); return; }
    if (!isWalletConnected || !walletAddress) {
      setSnackbar({ open: true, message: 'Connect your wallet first', severity: 'warning' }); return;
    }
    if (!modifiedCode) {
      setSnackbar({ open: true, message: 'Generate the contract first', severity: 'warning' }); return;
    }
    if (metadataSize > MAX_METADATA_SIZE) {
      setSnackbar({ open: true, message: `Metadata ${Math.floor(metadataSize)} B exceeds 32 KB limit`, severity: 'error' }); return;
    }

    setDeploying(true);
    setSnackbar({ open: true, message: 'Estimating fees…', severity: 'info' });
    /* storage build */
    const metaHex = utf8ToHex(JSON.stringify(preview));
    const mdMap   = new MichelsonMap();
    mdMap.set('', TEZOS_STORAGE_CONTENT_HEX);
    mdMap.set(CONTENT_KEY, metaHex);
    const storage = getV3Storage(walletAddress, mdMap);

    try {
      const bal     = new BigNumber((await tezos.tz.getBalance(walletAddress)).toNumber()).dividedBy(1e6);
      const estRaw  = await tezos.estimate.originate({ code: modifiedCode, storage });
      const feeTez  = new BigNumber(estRaw.suggestedFeeMutez).dividedBy(1e6).toFixed(6);
      const storLim = estRaw.storageLimit;
      const gasLim  = estRaw.gasLimit;
      const storFee = new BigNumber(storLim).times(STORAGE_COST_PER_BYTE).toFixed(6);
      const total   = new BigNumber(feeTez).plus(storFee).toFixed(6);

      if (bal.isLessThan(total)) {
        setSnackbar({ open: true, message: `Insufficient balance: need ≥ ${total} ꜩ`, severity: 'error' });
        setDeploying(false); return;
      }

      setEst({ feeTez, gas: gasLim, storage: storLim, storageCostTez: storFee, totalCostTez: total, balanceChangeTez: new BigNumber(total).negated().toFixed(6) });
      setConfirmDialog({ open: true, data: { estimationFailed: false } });
    } catch (err) {
      const friendly = explainTezosError(err);
      setSnackbar({ open: true, message: `Fee estimation failed: ${friendly}. You may still proceed – wallet will show exact fees.`, severity: 'warning' });
      setConfirmDialog({ open: true, data: { estimationFailed: true, reason: friendly } });
    } finally {
      setDeploying(false);
    }
  };

  /* confirm & originate */
  const confirmDeployment = async () => {
    setConfirmDialog({ open: false, data: null });
    setDeploying(true);
    setSnackbar({ open: true, message: 'Deploying contract…', severity: 'info' });

    const metaHex = utf8ToHex(JSON.stringify(preview));
    const mdMap   = new MichelsonMap();
    mdMap.set('', TEZOS_STORAGE_CONTENT_HEX);
    mdMap.set(CONTENT_KEY, metaHex);
    const storage = getV3Storage(walletAddress, mdMap);

    try {
      const op = await tezos.wallet.originate({ code: modifiedCode, storage }).send();
      setSnackbar({ open: true, message: 'Awaiting confirmations…', severity: 'info' });
      await op.confirmation();

      const kt1 = (await op.contract()).address;
      setContractAddress(kt1);
      setDetailsDialogOpen(true);
      setSnackbar({ open: true, message: `Contract deployed at ${kt1}`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: `Deploy failed: ${explainTezosError(err)}`, severity: 'error' });
    } finally {
      setDeploying(false);
      setEst({ feeTez: null, gas: null, storage: null, storageCostTez: null, totalCostTez: null, balanceChangeTez: null });
    }
  };

  /* close dialog handlers */
  const closeSnack       = () => setSnackbar((p) => ({ ...p, open: false }));
  const closeDetailsDlg  = () => setDetailsDialogOpen(false);

  /* warn before unload */
  useEffect(() => {
    const h = (e) => { if (contractAddress) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [contractAddress]);

  /* --- visual helper for byte-counter --- */
  const renderMetadataSizeIndicator = () => (
    <Typography variant="body2"
      sx={{ color: metadataSize > MAX_METADATA_SIZE ? 'error.main' : 'textSecondary', mb: 1 }}>
      Estimated Metadata Size:&nbsp;{Math.floor(metadataSize)} / {MAX_METADATA_SIZE} bytes
    </Typography>
  );

  /* ─── render UI──────────────────────────────────── */
  return (
    <Container elevation={3}>
      {/* header */}
      <Typography variant="h4" align="center" gutterBottom>
        Deploy Your On-Chain Tezos NFT Smart Contract
      </Typography>
      <Typography variant="h5" align="center" gutterBottom>
        NFT Collection Contract
      </Typography>
      <Typography variant="body1" align="center" gutterBottom>
        Ready to mint NFTs fully on-chain? Fill in the details below and we’ll handle the metadata magic before deploying.
      </Typography>

      {/* diagnostic banners */}
      {networkMismatch && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Wallet network doesn’t match this site. Switch networks or open the correct URL.
        </Alert>
      )}
      {needsReveal && !networkMismatch && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={revealAccount}>Reveal</Button>}
        >
          First transaction must reveal your account. Click “Reveal” to initialize.
        </Alert>
      )}

      {/* disclaimer */}
      <Section>
        <Alert severity="warning">
          <Typography variant="body2">
            <strong>Disclaimer:</strong> Deployments are <em>immutable</em>. Always test on Ghostnet before mainnet. Standard keyboard characters recommended, emojis and symbols might fail.
          </Typography>
        </Alert>
      </Section>

      {/* wallet status */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        {isWalletConnected
          ? <Typography variant="subtitle1">Wallet: {walletAddress}</Typography>
          : <Typography variant="subtitle1">Connect a wallet to continue</Typography>}
      </Box>

      {/* form */}
      <Section>
        <Typography variant="h6" gutterBottom>Step 1 · Collection Details</Typography>
        <form noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                label="NFT Collection Name *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                placeholder="e.g. ZeroArt Collection"
                required
                inputProps={{ maxLength: 50 }}
                helperText={`${formData.name.length}/50 characters`}
                error={!!formErrors.name}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="NFT Symbol *"
                name="symbol"
                value={formData.symbol}
                onChange={handleInputChange}
                fullWidth
                placeholder="e.g. ZERO"
                required
                inputProps={{ maxLength: 5 }}
                helperText={`${formData.symbol.length}/5 characters · letters & numbers`}
                error={!!formErrors.symbol}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="NFT Collection Description *"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={4}
                placeholder="Describe your NFT collection"
                required
                inputProps={{ maxLength: 250 }}
                helperText={`${formData.description.length}/250 characters`}
                error={!!formErrors.description}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Author(s) *"
                name="authors"
                value={formData.authors}
                onChange={handleInputChange}
                fullWidth
                placeholder="e.g. Alice, Bob"
                required
                inputProps={{ maxLength: 50 }}
                helperText={`${formData.authors.length}/50 characters`}
                error={!!formErrors.authors}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Author Address(es) *"
                name="authorAddresses"
                value={formData.authorAddresses}
                onChange={handleInputChange}
                fullWidth
                placeholder="Comma‑separated Tezos addresses"
                required
                inputProps={{ maxLength: 200 }}
                helperText={`${formData.authorAddresses.length}/200 characters · defaults to your wallet if blank`}
                error={!!formErrors.authorAddresses}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Creator(s) *"
                name="creators"
                value={formData.creators}
                onChange={handleInputChange}
                fullWidth
                placeholder="Comma‑separated Tezos addresses"
                required
                inputProps={{ maxLength: 200 }}
                helperText={`${formData.creators.length}/200 characters · defaults to your wallet if blank`}
                error={!!formErrors.creators}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth margin="normal" error={!!formErrors.type}>
                <InputLabel id="type-label">Type *</InputLabel>
                <Select labelId="type-label" name="type" value={formData.type} onChange={handleInputChange} label="Type *">
                  <MenuItem value="art">Art</MenuItem>
                  <MenuItem value="music">Music</MenuItem>
                  <MenuItem value="collectible">Collectible</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
                {!!formErrors.type && <Typography variant="caption" color="error">{formErrors.type}</Typography>}
              </FormControl>
            </Grid>

            <Grid size={12}>
              {renderMetadataSizeIndicator()}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FileUpload setArtifactData={handleThumbnailUpload} />
                <Tooltip title={<><Typography variant="subtitle2">Supported Filetypes:</Typography><Typography variant="body2">{supportedFiletypesList.join(', ')}</Typography></>} arrow>
                  <IconButton sx={{ ml: 1 }} aria-label="Supported Filetypes"><InfoIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                • Thumbnail must be square · keep metadata under 32 KB
              </Typography>
            </Grid>

            <Grid size={12}>
              <FormControlLabel
                control={<Checkbox checked={formData.agreeToTerms} onChange={handleInputChange} name="agreeToTerms" color="primary" />}
                label={<span>I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</Link>.</span>}
              />
              {!!formErrors.agreeToTerms && <Typography variant="caption" color="error">{formErrors.agreeToTerms}</Typography>}
            </Grid>
          </Grid>
        </form>
      </Section>

      {/* preview */}
      {!!preview.imageUri && (
        <Section>
          <Typography variant="subtitle1" gutterBottom>Metadata Preview:</Typography>
          <NFTPreview metadata={preview} />
        </Section>
      )}

      {/* deploy button */}
      <Grid container spacing={2} sx={{ textAlign: 'center', mt: 2 }}>
        <Grid size={12}>
          <Typography variant="caption" display="block" gutterBottom>Get your collection on-chain!</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleDeployContract}
            disabled={
              deploying ||
              !modifiedCode ||
              !!Object.keys(formErrors).length ||
              networkMismatch ||            // guard-rail
              (needsReveal && !networkMismatch) /* reveal needed only when chain matches */
            }
            startIcon={deploying && <CircularProgress size={20} />}
            sx={{ maxWidth: 300, mx: 'auto' }}
          >
            {deploying ? 'Deploying…' : 'Deploy Contract'}
          </Button>
          {networkMismatch && (
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              Wrong network – switch in wallet or open correct URL.
            </Typography>
          )}
          {needsReveal && !networkMismatch && (
            <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
              Reveal your account first.
            </Typography>
          )}
          {est.feeTez && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Estimated Fees: {est.feeTez} ꜩ
            </Typography>
          )}
        </Grid>
      </Grid>

      {/* step-2 panel with dark-mode-safe Pre */}
      {contractAddress && (
        <Section>
          <Typography variant="h6" gutterBottom>Step 2: Contract Deployed</Typography>
          <Typography variant="body2">Your contract address:</Typography>
          <Pre>{contractAddress}</Pre>
          <Button variant="contained" color="secondary" sx={{ mt: 1, maxWidth: 300, mx: 'auto' }}
            onClick={async () => {
              const ok = await copyToClipboard(contractAddress);
              setSnackbar({ open: true, message: ok ? 'Contract address copied!' : 'Copy failed', severity: ok ? 'success' : 'error' });
            }}>
            Copy Contract Address
          </Button>
          <Typography variant="body2" sx={{ mt: 1 }}>
            View on&nbsp;
            <Link href={`https://ghostnet.tzkt.io/${contractAddress}/operations`} target="_blank" rel="noopener noreferrer" underline="hover">view on TzKT</Link>
            &nbsp;or&nbsp;
            <Link href={`https://ghostnet.objkt.com/collections/${contractAddress}`} target="_blank" rel="noopener noreferrer" underline="hover">OBJKT.com</Link>.
          </Typography>
        </Section>
      )}

      {/* confirm dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, data: null })} fullWidth maxWidth="sm">
        <DialogTitle id="confirm-deployment-title">Confirm Deployment</DialogTitle>
        <DialogContent>
          {confirmDialog.data?.estimationFailed ? (
            <DialogContentText>
              Fee estimation failed (<em>{confirmDialog.data.reason}</em>).<br />Sign in your wallet to see the exact fees.
            </DialogContentText>
          ) : (
            <DialogContentText>
              Are you sure you want to deploy? This action is irreversible.<br /><br />
              <strong>Estimated Fee:</strong> {est.feeTez ?? '…'} ꜩ<br />
              <strong>Gas Limit:</strong> {est.gas ?? '…'}<br />
              <strong>Storage Limit:</strong> {est.storage ?? '…'}<br />
              <strong>Storage Cost:</strong> {est.storageCostTez ?? '…'} ꜩ<br />
              <strong>Total Cost:</strong> {est.totalCostTez ?? '…'} ꜩ<br />
              <strong>Balance Change:</strong> {est.balanceChangeTez ?? '…'} ꜩ
            </DialogContentText>
          )}
          <Typography variant="subtitle2" color="error" sx={{ mt: 1 }}>**Please verify all information before proceeding.**</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, data: null })} color="secondary">Cancel</Button>
          <Button onClick={confirmDeployment} color="primary" variant="contained" autoFocus>
            {confirmDialog.data?.estimationFailed ? 'Deploy Anyway' : 'Confirm Deployment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* deployed dialog – uses same Pre */}
      <Dialog open={detailsDialogOpen} onClose={closeDetailsDlg} fullWidth maxWidth="sm" disableEnforceFocus disableAutoFocus>
        <DialogTitle>Contract Deployed Successfully</DialogTitle>
        <DialogContent>
          <DialogContentText>Copy and store your contract address safely.</DialogContentText>
          <Pre>{contractAddress}</Pre>
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <Button variant="outlined" onClick={async () => {
              const ok = await copyToClipboard(contractAddress);
              setSnackbar({ open: true, message: ok ? 'Copied!' : 'Copy failed', severity: ok ? 'success' : 'error' });
            }} sx={{ maxWidth: 300, mx: 'auto' }}>
              Copy Contract Address
            </Button>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
            <Link href={`https://ghostnet.objkt.com/collections/${contractAddress}`} target="_blank" rel="noopener noreferrer" underline="hover" color="primary">
              View on OBJKT
            </Link>
            <Link href={`https://ghostnet.tzkt.io/${contractAddress}/operations`} target="_blank" rel="noopener noreferrer" underline="hover" color="primary">
              View on TzKT
            </Link>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetailsDlg} color="primary">Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnack} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default GenerateContract;