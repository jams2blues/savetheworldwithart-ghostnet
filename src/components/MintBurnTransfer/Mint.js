/*Developed by @jams2blues with love for the Tezos community
  File: src/components/MintBurnTransfer/Mint.js
  Summary: Fully-on-chain NFT mint form with fee-estimation fallback,
           guard-rails for wrong-network / unrevealed accounts, wallet
           autofill, exhaustive licence list, and post-mint auto-refill.
*/

import React, { useState, useEffect, useRef, useContext } from 'react';
import styled from 'styled-components';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
  FormControlLabel,
  Checkbox,
  Link,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Chip,
  Box,
  Alert
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import InfoIcon from '@mui/icons-material/Info';
import { MichelsonMap } from '@taquito/taquito';
import { BigNumber } from 'bignumber.js';
import { Buffer } from 'buffer';
import MintUpload from './MintUpload';
import { WalletContext } from '../../contexts/WalletContext';

/* ─── constants ───────────────────────────────────── */
const MAX_ATTRIBUTES = 10;
const MAX_ATTRIBUTE_NAME_LENGTH = 32;
const MAX_ATTRIBUTE_VALUE_LENGTH = 32;
const MAX_EDITIONS = 10_000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 20;
const TAG_REGEX = /^[a-z0-9-_]+$/i;
const MAX_ROYALTIES = 25;
const STORAGE_COST_PER_BYTE = 0.00025;
const OVERHEAD_BYTES = 360;
const MAX_METADATA_SIZE = 32_768;

const ON_CHAIN_LICENSE =
  'On-Chain NFT License 2.0 (KT1S9GHLCrGg5YwoJGDDuC347bCTikefZQ4z)';

const LICENCE_OPTIONS = [
  'CC0 (Public Domain)',
  'All Rights Reserved',
  ON_CHAIN_LICENSE,
  'CC BY 4.0',
  'CC BY-SA 4.0',
  'CC BY-ND 4.0',
  'CC BY-NC 4.0',
  'CC BY-NC-SA 4.0',
  'CC BY-NC-ND 4.0',
  'MIT',
  'GPL',
  'Apache 2.0',
  'Unlicense',
  'Custom',
];

const INITIAL_FORM = {
  name: '',
  description: '',
  creators: '',
  toAddress: '',
  royalties: '',
  license: '',
  customLicense: '',
  amount: '1',
  nsfw: 'Does not contain NSFW',
  flashingHazard: 'Does not contain Flashing Hazard',
};

/* ─── styled helpers ──────────────────────────────── */
const Section = styled.div`
  margin-top: 20px;
`;

/* ─── utility fns ─────────────────────────────────── */
const stringToHex = (str) => Buffer.from(str, 'utf8').toString('hex');
const isValidTezosAddress = (a) => /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);
const approximateMetadataSize = (map) => {
  let total = 0;
  for (const [k, v] of map.entries()) {
    total += Buffer.byteLength(k, 'utf8');
    total += typeof v === 'string' && v.startsWith('0x')
      ? (v.length - 2) / 2
      : Buffer.byteLength(v, 'utf8');
  }
  return total + OVERHEAD_BYTES;
};
const explainTezosError = (err) => {
  if (!err?.message) return 'Unknown error';
  const m = err.message.toLowerCase();
  if (m.includes('oversized')) return 'Operation size too large';
  if (m.includes('not enough tez') || m.includes('balance')) return 'Wallet balance too low';
  if (m.includes('forbidden') || m.includes('cors')) return 'RPC node rejected the request';
  if (m.includes('bad gateway') || m.includes('502')) return 'RPC node temporarily unavailable';
  if (m.includes('expired')) return 'Wallet session expired – reconnect';
  return err.message;
};

const preventWheel = (e) => e.target.blur();
const numberInputProps = { onWheel: preventWheel, inputProps: { inputMode: 'numeric', pattern: '[0-9]*' } };

/* ─── main component ─────────────────────────────── */
const Mint = ({ contractAddress, tezos, contractVersion, setSnackbar }) => {
  const {
    walletAddress,
    networkMismatch,
    needsReveal,
    revealAccount
  } = useContext(WalletContext);
  
  /* ── form & UI state ─────────────────────────── */
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [attributes, setAttributes] = useState([{ name: '', value: '' }]);
  const [artifactFile, setArtifactFile] = useState(null);
  const [artifactDataUrl, setArtifactDataUrl] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef(null);

  /* live-computed */
  const [metadataSize, setMetadataSize] = useState(0);
  const [loading, setLoading] = useState(false);

  /* estimation & confirm dialog */
  const [est, setEst] = useState({});
  const [dialog, setDialog] = useState({ open: false, estimationFailed: false, reason: '' });

  /* handy snackbar */
  const snack = (msg, severity = 'warning') => setSnackbar({ open: true, message: msg, severity });

  /* ── helpers ──────────────────────────────────── */
  const autofillFromWallet = (base = INITIAL_FORM, keepAmount = false) => ({
    ...base,
    creators: walletAddress || '',
    toAddress: walletAddress || '',
    amount: keepAmount ? base.amount : contractVersion === 'v1' ? '1' : base.amount,
  });

  /* ── reset on contract change ─────────────────── */
  useEffect(() => {
    setFormData(autofillFromWallet());
    setAttributes([{ name: '', value: '' }]);
    setArtifactFile(null);
    setArtifactDataUrl(null);
    setAgreed(false);
    setTags([]);
    setTagInput('');
    setMetadataSize(0);
    setEst({});
  }, [contractAddress, contractVersion]);

  /* ── wallet autofill when walletAddress changes ─ */
  useEffect(() => {
    setFormData((p) => {
      const next = { ...p };
      if (!next.creators.trim()) next.creators = walletAddress || '';
      if (!next.toAddress.trim()) next.toAddress = walletAddress || '';
      return next;
    });
  }, [walletAddress]);

  /* ── input handlers (same as before) ──────────── */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'royalties') {
      const r = Math.max(0, Math.min(MAX_ROYALTIES, parseFloat(value || '0')));
      if (parseFloat(value) !== r) snack(`Royalties capped at ${MAX_ROYALTIES}%`, 'warning');
      setFormData((p) => ({ ...p, royalties: r.toString() }));
      return;
    }
    if (name === 'amount') {
      const num = Math.max(1, Math.min(MAX_EDITIONS, parseInt(value.replace(/\D/g, '') || '1', 10)));
      if (parseInt(value, 10) !== num) snack(`Edition amount capped at ${MAX_EDITIONS}`, 'warning');
      setFormData((p) => ({ ...p, amount: num.toString() }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  /* ── attribute / tag helpers (unchanged) ──────── */
  const handleAttrChange = (i, field, val) => {
    if ((field === 'name' && val.length > MAX_ATTRIBUTE_NAME_LENGTH) ||
        (field === 'value' && val.length > MAX_ATTRIBUTE_VALUE_LENGTH))
      return snack(`Attribute ${field} too long`);
    setAttributes((prev) => {
      const next = [...prev];
      next[i][field] = val;
      if (field === 'name') {
        const names = next.map((a) => a.name.trim().toLowerCase());
        if (names.filter(Boolean).some((n, idx) => names.indexOf(n) !== idx)) {
          snack('Duplicate attribute name detected');
          next[i][field] = '';
        }
      }
      return next;
    });
  };
  const addAttr = () => setAttributes((prev) => (prev.length >= MAX_ATTRIBUTES ? prev : [...prev, { name: '', value: '' }]));
  const rmAttr = (i) => setAttributes((prev) => prev.filter((_, idx) => idx !== i));

  const pushTag = (raw) => {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (!TAG_REGEX.test(t)) return snack('Tags must be alphanumeric with "-" or "_" only', 'error');
    if (t.length > MAX_TAG_LENGTH) return snack(`Tag length must not exceed ${MAX_TAG_LENGTH}`, 'error');
    if (tags.includes(t)) return snack('Duplicate tag');
    if (tags.length >= MAX_TAGS) return snack(`Maximum ${MAX_TAGS} tags allowed`);
    setTags((prev) => [...prev, t]);
  };
  const handleTagChange = (e) => {
    const val = e.target.value;
    if (val.includes(',')) {
      val.split(',').forEach(pushTag);
      setTagInput('');
    } else setTagInput(val);
  };
  const handleTagKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      pushTag(tagInput);
      setTagInput('');
    }
  };
  const handleTagPaste = (e) => {
    e.preventDefault();
    e.clipboardData.getData('text').split(',').forEach(pushTag);
    setTagInput('');
  };
  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  /* ── metadata builder (same) ──────────────────── */
  const buildMetadata = () => {
    const m = new MichelsonMap();
    m.set('name', '0x' + stringToHex(formData.name));
    if (formData.description.trim()) m.set('description', '0x' + stringToHex(formData.description));
    m.set('artifactUri', '0x' + stringToHex(artifactDataUrl || ''));
    m.set('creators', '0x' + stringToHex(JSON.stringify(formData.creators.split(',').map((c) => c.trim()))));
    if (formData.license) {
      const rights = formData.license === 'Custom' ? formData.customLicense : formData.license;
      if (rights.trim()) m.set('rights', '0x' + stringToHex(rights));
    }
    m.set('decimals', '0x' + stringToHex('0'));
    if (artifactFile?.type) m.set('mimeType', '0x' + stringToHex(artifactFile.type));
    const r = parseFloat(formData.royalties || '0');
    m.set('royalties', '0x' + stringToHex(JSON.stringify({ decimals: 4, shares: { [formData.toAddress]: Math.round(r * 100) } })));
    const filtered = attributes.filter((a) => a.name && a.value);
    if (filtered.length) m.set('attributes', '0x' + stringToHex(JSON.stringify(filtered)));
    if (tags.length) m.set('tags', '0x' + stringToHex(JSON.stringify(tags)));
    if (formData.nsfw === 'Does contain NSFW') m.set('contentRating', '0x' + stringToHex('mature'));
    if (formData.flashingHazard === 'Does contain Flashing Hazard')
      m.set('accessibility', '0x' + stringToHex(JSON.stringify({ hazards: ['flashing'] })));
    return m;
  };

  /* metadata size tracker */
  useEffect(() => {
    setMetadataSize(approximateMetadataSize(buildMetadata()));
  }, [formData, attributes, tags, artifactFile, artifactDataUrl]);

  /* ── validation ───────────────────────────────── */
  const validateForm = () => {
    const required = ['name', 'creators', 'toAddress', 'license'];
    for (const f of required) {
      if (!formData[f].trim()) { snack(`${f} is required`); return false; }
    }
    if (formData.creators.split(',').map((c) => c.trim()).some((c) => !isValidTezosAddress(c))) {
      snack('One or more creator addresses are invalid'); return false;
    }
    if (!isValidTezosAddress(formData.toAddress.trim())) { snack('Recipient address is not valid'); return false; }
    if (formData.license === 'Custom' && !formData.customLicense.trim()) { snack('Custom license text is required'); return false; }
    const r = parseFloat(formData.royalties);
    if (isNaN(r) || r < 0 || r > MAX_ROYALTIES) { snack(`Royalties must be between 0 and ${MAX_ROYALTIES}%`); return false; }
    if (!artifactFile || !artifactDataUrl) { snack('Artifact file must be uploaded'); return false; }
    if ((contractVersion.startsWith('v2') || contractVersion === 'v3') && !formData.amount) {
      snack('Amount is required for multiple edition contracts'); return false;
    }
    if (!agreed) { snack('You must agree to the terms'); return false; }
    if (metadataSize > MAX_METADATA_SIZE) {
      snack(`Metadata size (${Math.floor(metadataSize)} bytes) exceeds 32 KB`, 'error'); return false;
    }
    /* non‑blocking advisories */
    if (!formData.description.trim()) snack('Description is empty – recommended for marketplace visibility', 'info');
    if (tags.length === 0) snack('No tags provided – recommended for discoverability', 'info');
    return true;
  };

  /* ── fee estimation ───────────────────────────── */
  const estimateFees = async () => {
    try {
      const map = buildMetadata();
      const contract = await tezos.wallet.at(contractAddress);
      const op =
        contractVersion === 'v1'
          ? contract.methods.mint(map, formData.toAddress)
          : contract.methods.mint(parseInt(formData.amount, 10), map, formData.toAddress);
      const params = await op.toTransferParams();
      const estRaw = await tezos.estimate.transfer(params);
      const feeTez = new BigNumber(estRaw.suggestedFeeMutez).dividedBy(1e6).toFixed(6);
      const storageTez = new BigNumber(estRaw.storageLimit).times(STORAGE_COST_PER_BYTE).toFixed(6);
      const totalTez = new BigNumber(feeTez).plus(storageTez).toFixed(6);
      const obj = {
        feeTez,
        storageTez,
        gas: estRaw.gasLimit,
        storage: estRaw.storageLimit,
        totalTez,
      };
      setEst(obj);
      return obj;
    } catch (err) {
      const friendly = explainTezosError(err);
      return { estimationFailed: true, reason: friendly };
    }
  };

  /* ── mint button ──────────────────────────────── */
  const handleMintClick = async () => {
    if (networkMismatch) { snack('Wallet is on the wrong network'); return; }
    if (needsReveal) { snack('Reveal your account first'); return; }
    if (!validateForm()) return;
    setLoading(true);
    const res = await estimateFees();
    setLoading(false);
    if (res.estimationFailed) {
      snack(`Fee estimation failed: ${res.reason}`, 'warning');
      setDialog({ open: true, estimationFailed: true, reason: res.reason });
    } else {
      setDialog({ open: true, ...res });
    }
  };

  /* confirmMint reset section */
  const confirmMint = async () => {
    setDialog({ open: false, estimationFailed: false, reason: '' });
    setLoading(true);
    try {
      const map = buildMetadata();
      const contract = await tezos.wallet.at(contractAddress);
      const op =
        contractVersion === 'v1'
          ? contract.methods.mint(map, formData.toAddress)
          : contract.methods.mint(parseInt(formData.amount, 10), map, formData.toAddress);
      const sent = await op.send();
      snack('Minting in progress…', 'info');
      await sent.confirmation();
      snack('NFT minted successfully!', 'success');
      /* reset & immediately re‑autofill */
      setFormData(autofillFromWallet());
      setAttributes([{ name: '', value: '' }]);
      setArtifactFile(null);
      setArtifactDataUrl(null);
      setAgreed(false);
      setTags([]);
      setTagInput('');
      setEst({});
    } catch (err) {
      snack(`Mint failed: ${explainTezosError(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ─── UI ───────────────────────────────────────── */
  return (
    <div style={{ marginTop: 20 }}>
      <Typography variant="h6">
        Mint NFT Fully On-Chain ({contractVersion === 'v1' ? 'Single Edition' : 'Multiple Editions'})
      </Typography>
      <Typography variant="body2" gutterBottom>
        Enter NFT metadata below. Fields marked with * are required.
      </Typography>

      {networkMismatch && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Wallet network doesn’t match this site. Switch networks or open the correct URL.
        </Alert>
      )}
      {needsReveal && !networkMismatch && (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={revealAccount}>Reveal</Button>}>
          First transaction must reveal your account. Click “Reveal” to initialize.
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Name */}
        <Grid size={12}>
          <TextField
            label="Name *"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            placeholder="NFT name"
            inputProps={{ maxLength: 200 }}
          />
        </Grid>

        {/* Description */}
        <Grid size={12}>
          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            fullWidth
            multiline
            rows={4}
            placeholder="NFT description (optional but recommended)"
            inputProps={{ maxLength: 5000 }}
          />
        </Grid>

        {/* Artifact */}
        <Grid size={12}>
          <Typography variant="body1">Artifact File (≤20 KB recommended)</Typography>
          <MintUpload onFileChange={setArtifactFile} onFileDataUrlChange={setArtifactDataUrl} />
        </Grid>

        {artifactDataUrl && (
          <Grid size={12}>
            <Typography variant="body1">Preview:</Typography>
            <img
              src={artifactDataUrl}
              alt="NFT preview"
              style={{
                maxWidth: '100%',
                maxHeight: 300,
                marginTop: 10,
                borderRadius: 8,
                objectFit: 'contain',
                backgroundColor: '#f5f5f5',
              }}
            />
          </Grid>
        )}

        {/* Creators */}
        <Grid size={12}>
          <TextField
            label="Creator Address(es) *"
            name="creators"
            value={formData.creators}
            onChange={handleInputChange}
            fullWidth
            placeholder="Comma‑separated Tezos addresses (defaults to your wallet)"
            helperText="Separate multiple creators with commas."
          />
        </Grid>

        {/* Recipient */}
        <Grid size={12}>
          <TextField
            label="Recipient Address *"
            name="toAddress"
            value={formData.toAddress}
            onChange={handleInputChange}
            fullWidth
            placeholder="tz1… (defaults to your wallet)"
            helperText="NFT will be minted directly to this address."
          />
        </Grid>

        {/* Royalties */}
        <Grid size={12}>
          <TextField
            label={`Royalties % * (0‑${MAX_ROYALTIES})`}
            name="royalties"
            value={formData.royalties}
            onChange={handleInputChange}
            fullWidth
            type="number"
            {...numberInputProps}
          />
        </Grid>

        {/* Edition amount for v2/v3 */}
        {(contractVersion.startsWith('v2') || contractVersion === 'v3') && (
          <Grid size={12}>
            <TextField
              label="Amount *"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              fullWidth
              type="number"
              InputProps={{ inputProps: { min: 1, max: MAX_EDITIONS, step: 1 } }}
            />
          </Grid>
        )}

        {/* License */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <InputLabel id="license-label">License *</InputLabel>
            <Select
              labelId="license-label"
              name="license"
              value={formData.license}
              onChange={handleInputChange}
              label="License *"
            >
              <MenuItem value="">Select a license</MenuItem>
              {LICENCE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {formData.license === 'Custom' && (
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Custom License *"
              name="customLicense"
              value={formData.customLicense}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={2}
              placeholder="Enter custom licence text"
              inputProps={{ maxLength: 2000 }}
            />
          </Grid>
        )}

        {/* Safety flags */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <InputLabel id="nsfw-label">NSFW *</InputLabel>
            <Select
              labelId="nsfw-label"
              name="nsfw"
              value={formData.nsfw}
              onChange={handleInputChange}
              label="NSFW *"
            >
              <MenuItem value="Does not contain NSFW">Does not contain NSFW</MenuItem>
              <MenuItem value="Does contain NSFW">Does contain NSFW</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            NSFW includes nudity, profanity, slurs, graphic violence, etc.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <InputLabel id="flash-label">Flashing Hazard *</InputLabel>
            <Select
              labelId="flash-label"
              name="flashingHazard"
              value={formData.flashingHazard}
              onChange={handleInputChange}
              label="Flashing Hazard *"
            >
              <MenuItem value="Does not contain Flashing Hazard">Does not contain Flashing Hazard</MenuItem>
              <MenuItem value="Does contain Flashing Hazard">Does contain Flashing Hazard</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            <Link
              href="https://kb.daisy.org/publishing/docs/metadata/schema.org/accessibilityHazard.html#value"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more about accessibility hazards
            </Link>
          </Typography>
        </Grid>

        {/* Attributes */}
        <Grid size={12}>
          <Typography variant="body1">Attributes</Typography>
          {attributes.map((attr, idx) => (
            <Grid container spacing={1} key={idx} alignItems="center" sx={{ mt: 0.5 }}>
              <Grid size={5}>
                <TextField
                  label="Name"
                  value={attr.name}
                  onChange={(e) => handleAttrChange(idx, 'name', e.target.value)}
                  fullWidth
                  inputProps={{ maxLength: MAX_ATTRIBUTE_NAME_LENGTH }}
                />
              </Grid>
              <Grid size={5}>
                <TextField
                  label="Value"
                  value={attr.value}
                  onChange={(e) => handleAttrChange(idx, 'value', e.target.value)}
                  fullWidth
                  inputProps={{ maxLength: MAX_ATTRIBUTE_VALUE_LENGTH }}
                />
              </Grid>
              <Grid size={2} sx={{ textAlign: 'center' }}>
                {idx === 0 ? (
                  <IconButton onClick={addAttr} color="primary" aria-label="Add Attribute">
                    <AddCircleIcon />
                  </IconButton>
                ) : (
                  <IconButton onClick={() => rmAttr(idx)} color="secondary" aria-label="Remove Attribute">
                    <RemoveCircleIcon />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          ))}
        </Grid>

        {/* Tags */}
        <Grid size={12}>
          <TextField
            label="Tags (comma separated)"
            value={tagInput}
            onChange={handleTagChange}
            onKeyDown={handleTagKey}
            onPaste={handleTagPaste}
            fullWidth
            placeholder="e.g. art,digital"
            inputRef={tagInputRef}
          />
          <Box sx={{ mt: 1 }}>
            {tags.map((t) => (
              <Chip key={t} label={t} onDelete={() => removeTag(t)} sx={{ mr: 0.5, mb: 0.5 }} />
            ))}
          </Box>
        </Grid>

        {/* Agree to terms */}
        <Grid size={12}>
          <FormControlLabel
            control={<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} color="primary" />}
            label={
              <span>
                I agree to the{' '}
                <Link href="/terms" target="_blank" rel="noopener noreferrer">
                  terms and conditions
                </Link>
                .
              </span>
            }
          />
        </Grid>
      </Grid>

      {/* metadata size + advisory */}
      <Section>
        <Typography variant="subtitle2">
          Approx. metadata size:&nbsp;
          {Math.floor(metadataSize).toLocaleString()} / {MAX_METADATA_SIZE} bytes{' '}
          <Tooltip
            title="Estimated total metadata stored on‑chain (includes 360 B overhead). Hard limit is 32,768 bytes."
            arrow
          >
            <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
          </Tooltip>
        </Typography>
        {metadataSize > MAX_METADATA_SIZE && (
          <Typography variant="body2" color="error">
            Metadata size exceeds 32 KB – minting disabled.
          </Typography>
        )}
      </Section>

      {/* Mint button */}
      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button
          variant="contained"
          color="success"
          onClick={handleMintClick}
          disabled={
            loading ||
            !agreed ||
            metadataSize > MAX_METADATA_SIZE ||
            networkMismatch ||                    // guard-rails
            (needsReveal && !networkMismatch)
          }
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Preparing…' : 'Mint NFT'}
        </Button>
      </Box>

      {/* helper text below button */}
      {networkMismatch && (
        <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
          Wrong network – switch in wallet or open correct URL.
        </Typography>
      )}
      {needsReveal && !networkMismatch && (
        <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
          Your account is unrevealed. Click “Reveal” above first.
        </Typography>
      )}

      {/* live estimation summary (non‑blocking) */}
      {est.feeTez && (
        <Section>
          <Typography variant="subtitle1">Estimated Fees</Typography>
          <Typography variant="body2">
            <strong>Fee:</strong> {est.feeTez} ꜩ&nbsp;
            <Tooltip title="Network fee" arrow>
              <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
            </Tooltip>
          </Typography>
          <Typography variant="body2">
            <strong>Storage:</strong> {est.storageTez} ꜩ&nbsp;
            <Tooltip title="On‑chain storage cost" arrow>
              <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
            </Tooltip>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Total:</strong> {est.totalTez} ꜩ
          </Typography>
        </Section>
      )}

      {/* Confirm dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false })} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Minting</DialogTitle>
        <DialogContent>
          {dialog.estimationFailed ? (
            <DialogContentText>
              Fee estimation failed (<em>{dialog.reason}</em>). You may still proceed – your wallet will
              display exact fees before signing.
            </DialogContentText>
          ) : (
            <>
              <DialogContentText>Please review estimated fees before proceeding.</DialogContentText>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Fee:</strong> {est.feeTez} ꜩ
              </Typography>
              <Typography variant="body2">
                <strong>Storage:</strong> {est.storageTez} ꜩ
              </Typography>
              <Typography variant="body2">
                <strong>Gas Limit:</strong> {est.gas}
              </Typography>
              <Typography variant="body2">
                <strong>Storage Limit:</strong> {est.storage}
              </Typography>
              <Typography variant="body2">
                <strong>Editions:</strong> {formData.amount}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Total:</strong> {est.totalTez} ꜩ
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false })} color="secondary">
            Cancel
          </Button>
          <Button onClick={confirmMint} color="primary" variant="contained" autoFocus>
            {dialog.estimationFailed ? 'Mint Anyway' : 'Confirm Mint'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Mint;
