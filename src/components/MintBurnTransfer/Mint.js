/* Developed by @jams2blues with love for the Tezos community
   File: src/components/MintBurnTransfer/Mint.js
   Summary: Component for minting NFTs on-chain with full validations and V3 functionality.
*/
import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import { MichelsonMap } from '@taquito/taquito';
import { Buffer } from 'buffer';
import { BigNumber } from 'bignumber.js';
import MintUpload from './MintUpload';
import InfoIcon from '@mui/icons-material/Info';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';

const MAX_ATTRIBUTES = 10;
const MAX_ATTRIBUTE_NAME_LENGTH = 32;
const MAX_ATTRIBUTE_VALUE_LENGTH = 32;
const MAX_EDITIONS = 10000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 20;
const TAG_REGEX = /^[a-zA-Z0-9-_]+$/;
const MAX_ROYALTIES = 25;
const STORAGE_COST_PER_BYTE = 0.00025;
// Set overhead to 360 bytes to account for extra encoding overhead as determined in testing.
const OVERHEAD_BYTES = 360;

const ON_CHAIN_LICENSE = "On-Chain NFT License 2.0 KT1S9GHLCrGg5YwoJGDDuC347bCTikefZQ4z";

const MAX_METADATA_SIZE = 32768;

const Section = styled.div`
  margin-top: 20px;
`;

const stringToHex = (str) => Buffer.from(str, 'utf8').toString('hex');

const isValidTezosAddress = (addr) =>
  /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);

const approximateMetadataSize = (map) => {
  let total = 0;
  for (const [k, v] of map.entries()) {
    total += Buffer.byteLength(k, 'utf8');
    if (typeof v === 'string' && v.startsWith('0x'))
      total += (v.length - 2) / 2;
    else total += Buffer.byteLength(v, 'utf8');
  }
  return total + OVERHEAD_BYTES;
};

const Mint = ({ contractAddress, tezos, contractVersion, setSnackbar }) => {
  const [formData, setFormData] = useState({
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
  });
  const [attributes, setAttributes] = useState([{ name: '', value: '' }]);
  const [artifactFile, setArtifactFile] = useState(null);
  const [artifactDataUrl, setArtifactDataUrl] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef(null);

  const [metadataSize, setMetadataSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [estimation, setEstimation] = useState({});
  const [dialog, setDialog] = useState({ open: false });

  const snack = (msg, severity = 'warning') =>
    setSnackbar({ open: true, message: msg, severity });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'royalties') {
      const r = Math.max(0, Math.min(MAX_ROYALTIES, parseFloat(value || '0')));
      if (parseFloat(value) !== r) snack(`Royalties capped at ${MAX_ROYALTIES}%`, 'warning');
      setFormData((prev) => ({ ...prev, royalties: r.toString() }));
      return;
    }
    if (name === 'amount') {
      const num = Math.max(1, Math.min(MAX_EDITIONS, parseInt(value.replace(/\D/g, '') || '1', 10)));
      if (parseInt(value, 10) !== num) snack(`Edition amount capped at ${MAX_EDITIONS}`, 'warning');
      setFormData((prev) => ({ ...prev, amount: num.toString() }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttrChange = (i, field, val) => {
    if (
      (field === 'name' && val.length > MAX_ATTRIBUTE_NAME_LENGTH) ||
      (field === 'value' && val.length > MAX_ATTRIBUTE_VALUE_LENGTH)
    ) {
      snack(`Attribute ${field} too long (max ${field === 'name' ? MAX_ATTRIBUTE_NAME_LENGTH : MAX_ATTRIBUTE_VALUE_LENGTH} characters)`);
      return;
    }
    setAttributes((prev) => {
      const next = [...prev];
      next[i][field] = val;
      if (field === 'name') {
        const names = next.map((a) => a.name.trim().toLowerCase());
        if (names.filter((n) => n).some((n, idx) => names.indexOf(n) !== idx)) {
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
    if (t.length > MAX_TAG_LENGTH) return snack(`Tag length must not exceed ${MAX_TAG_LENGTH} characters`, 'error');
    if (tags.includes(t)) return snack('Duplicate tag');
    if (tags.length >= MAX_TAGS) return snack(`Maximum ${MAX_TAGS} tags allowed`);
    setTags((prev) => [...prev, t]);
  };
  const handleTagChange = (e) => {
    const val = e.target.value;
    if (val.includes(',')) {
      val.split(',').forEach((t) => pushTag(t));
      setTagInput('');
    } else {
      setTagInput(val);
    }
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
    e.clipboardData.getData('text').split(',').forEach((t) => pushTag(t));
    setTagInput('');
  };
  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  const handleFileChange = setArtifactFile;
  const handleFileDataUrlChange = setArtifactDataUrl;

  const buildMetadata = () => {
    const m = new MichelsonMap();
    m.set('name', '0x' + stringToHex(formData.name));
    m.set('description', '0x' + stringToHex(formData.description));
    m.set('artifactUri', '0x' + stringToHex(artifactDataUrl || ''));
    m.set(
      'creators',
      '0x' + stringToHex(JSON.stringify(formData.creators.split(',').map((c) => c.trim())))
    );
    if (formData.license) {
      const rights = formData.license === 'Custom' ? formData.customLicense : formData.license;
      if (rights.trim()) m.set('rights', '0x' + stringToHex(rights));
    }
    m.set('decimals', '0x' + stringToHex('0'));
    if (artifactFile?.type) m.set('mimeType', '0x' + stringToHex(artifactFile.type));
    const r = parseFloat(formData.royalties || '0');
    m.set(
      'royalties',
      '0x' + stringToHex(JSON.stringify({ decimals: 4, shares: { [formData.toAddress]: Math.round(r * 100) } }))
    );
    const filtered = attributes.filter((a) => a.name && a.value);
    if (filtered.length) m.set('attributes', '0x' + stringToHex(JSON.stringify(filtered)));
    if (tags.length) m.set('tags', '0x' + stringToHex(JSON.stringify(tags)));
    if (formData.nsfw === 'Does contain NSFW') m.set('contentRating', '0x' + stringToHex('mature'));
    if (formData.flashingHazard === 'Does contain Flashing Hazard')
      m.set('accessibility', '0x' + stringToHex(JSON.stringify({ hazards: ['flashing'] })));
    return m;
  };

  useEffect(() => {
    setMetadataSize(approximateMetadataSize(buildMetadata()));
  }, [formData, attributes, tags, artifactFile, artifactDataUrl]);

  const validateForm = () => {
    const required = ['name', 'description', 'creators', 'toAddress', 'license'];
    for (const f of required) {
      if (!formData[f].trim()) {
        snack(`${f} is required`);
        return false;
      }
    }
    if (
      formData.creators
        .split(',')
        .map((c) => c.trim())
        .some((c) => !isValidTezosAddress(c))
    ) {
      snack('One or more creator addresses are invalid');
      return false;
    }
    if (!isValidTezosAddress(formData.toAddress.trim())) {
      snack('Recipient address is not valid');
      return false;
    }
    if (formData.license === 'Custom' && !formData.customLicense.trim()) {
      snack('Custom license text is required');
      return false;
    }
    const r = parseFloat(formData.royalties);
    if (isNaN(r) || r < 0 || r > MAX_ROYALTIES) {
      snack(`Royalties must be between 0 and ${MAX_ROYALTIES}%`);
      return false;
    }
    if (!artifactFile || !artifactDataUrl) {
      snack('Artifact file must be uploaded');
      return false;
    }
    if (tags.length === 0) {
      snack('At least one tag is required');
      return false;
    }
    if ((contractVersion === 'v2' || contractVersion === 'v3') && !formData.amount) {
      snack('Amount is required for multiple edition contracts');
      return false;
    }
    if (!agreed) {
      snack('You must agree to the terms');
      return false;
    }
    if (metadataSize > MAX_METADATA_SIZE) {
      snack(`Metadata size (${Math.floor(metadataSize)} bytes) exceeds the maximum allowed (${MAX_METADATA_SIZE} bytes).`, 'error');
      return false;
    }
    return true;
  };

  const estimateFees = async () => {
    try {
      const map = buildMetadata();
      const contract = await tezos.wallet.at(contractAddress);
      const op =
        contractVersion === 'v1'
          ? contract.methods.mint(map, formData.toAddress)
          : contract.methods.mint(parseInt(formData.amount, 10), map, formData.toAddress);
      const params = await op.toTransferParams();
      const est = await tezos.estimate.transfer(params);
      const feeTez = new BigNumber(est.suggestedFeeMutez).dividedBy(1e6).toFixed(6);
      const storageTez = new BigNumber(est.storageLimit).times(STORAGE_COST_PER_BYTE).toFixed(6);
      const totalTez = new BigNumber(feeTez).plus(storageTez).toFixed(6);
      const obj = {
        estimatedFeeTez: feeTez,
        estimatedStorageCostTez: storageTez,
        estimatedGasLimit: est.gasLimit,
        estimatedStorageLimit: est.storageLimit,
        totalEstimatedCostTez: totalTez,
      };
      setEstimation(obj);
      return obj;
    } catch (err) {
      snack(`Fee estimation failed: ${err.message}`, 'error');
      return null;
    }
  };

  const handleMintClick = async () => {
    if (!validateForm()) return;
    setLoading(true);
    const est = await estimateFees();
    setLoading(false);
    if (est) setDialog({ open: true, ...est });
  };

  const confirmMint = async () => {
    setDialog({ open: false });
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
      setFormData({
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
      });
      setAttributes([{ name: '', value: '' }]);
      setArtifactFile(null);
      setArtifactDataUrl(null);
      setAgreed(false);
      setTags([]);
      setTagInput('');
      setEstimation({});
    } catch (err) {
      snack(`Mint failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <Typography variant="h6">
        Mint NFT Fully On‑Chain ({contractVersion === 'v1' ? 'Single Edition' : 'Multiple Editions'})
      </Typography>
      <Typography variant="body2" gutterBottom>
        Enter the NFT metadata below. Fields marked with * are required.
      </Typography>

      <Grid container spacing={2}>
        <Grid size={12}>
          <TextField
            label="Name *"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            placeholder="NFT name"
            inputProps={{ maxLength: 30 }}
          />
        </Grid>

        <Grid size={12}>
          <TextField
            label="Description *"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            fullWidth
            multiline
            rows={4}
            placeholder="NFT description"
            inputProps={{ maxLength: 250 }}
          />
        </Grid>

        <Grid size={12}>
          <Typography variant="body1">Artifact File (≤20KB recommended)</Typography>
          <MintUpload onFileChange={handleFileChange} onFileDataUrlChange={handleFileDataUrlChange} />
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

        <Grid size={12}>
          <TextField
            label="Creator Address(es) *"
            name="creators"
            value={formData.creators}
            onChange={handleInputChange}
            fullWidth
            placeholder="e.g. tz1...,tz1..."
          />
        </Grid>

        <Grid size={12}>
          <TextField
            label={`Royalties % * (0-${MAX_ROYALTIES})`}
            name="royalties"
            value={formData.royalties}
            onChange={handleInputChange}
            fullWidth
            type="number"
            InputProps={{ inputProps: { min: 0, max: MAX_ROYALTIES, step: 0.01 } }}
          />
        </Grid>

        <Grid size={12}>
          <FormControl fullWidth>
            <InputLabel id="license-label">License *</InputLabel>
            <Select
              labelId="license-label"
              name="license"
              value={formData.license}
              onChange={handleInputChange}
              label="License *"
            >
              <MenuItem value="">Select a License</MenuItem>
              <MenuItem value="CC0 (Public Domain)">CC0 (Public Domain)</MenuItem>
              <MenuItem value="All Rights Reserved">All Rights Reserved</MenuItem>
              <MenuItem value={ON_CHAIN_LICENSE}>{ON_CHAIN_LICENSE}</MenuItem>
              <MenuItem value="CC BY 4.0">CC BY 4.0</MenuItem>
              <MenuItem value="CC BY-SA 4.0">CC BY‑SA 4.0</MenuItem>
              <MenuItem value="CC BY-ND 4.0">CC BY‑ND 4.0</MenuItem>
              <MenuItem value="CC BY-NC 4.0">CC BY‑NC 4.0</MenuItem>
              <MenuItem value="CC BY-NC-SA 4.0">CC BY‑NC‑SA 4.0</MenuItem>
              <MenuItem value="CC BY-NC-ND 4.0">CC BY‑NC‑ND 4.0</MenuItem>
              <MenuItem value="MIT">MIT</MenuItem>
              <MenuItem value="GPL">GPL</MenuItem>
              <MenuItem value="Apache 2.0">Apache 2.0</MenuItem>
              <MenuItem value="Unlicense">Unlicense</MenuItem>
              <MenuItem value="Custom">Custom</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {formData.license === 'Custom' && (
          <Grid size={12}>
            <TextField
              label="Custom License *"
              name="customLicense"
              value={formData.customLicense}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={2}
              placeholder="Enter custom license text"
              inputProps={{ maxLength: 2000 }}
            />
          </Grid>
        )}

        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <InputLabel id="nsfw-label">NSFW Content</InputLabel>
            <Select
              labelId="nsfw-label"
              name="nsfw"
              value={formData.nsfw}
              onChange={handleInputChange}
              label="NSFW Content"
            >
              <MenuItem value="Does not contain NSFW">Does not contain NSFW</MenuItem>
              <MenuItem value="Does contain NSFW">Does contain NSFW</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            NSFW includes nudity, profanity, slurs, graphic violence, etc.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <InputLabel id="flash-label">Flashing Hazards</InputLabel>
            <Select
              labelId="flash-label"
              name="flashingHazard"
              value={formData.flashingHazard}
              onChange={handleInputChange}
              label="Flashing Hazards"
            >
              <MenuItem value="Does not contain Flashing Hazard">Does not contain Flashing Hazard</MenuItem>
              <MenuItem value="Does contain Flashing Hazard">Does contain Flashing Hazard</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            <Link href="https://kb.daisy.org/publishing/docs/metadata/schema.org/accessibilityHazard.html#value" target="_blank" rel="noopener noreferrer">
              Learn more
            </Link>
          </Typography>
        </Grid>

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

        <Grid size={12}>
          <Typography variant="body1">
            Tags * (enter comma or press Enter to add)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {tags.map((t) => (
              <Chip
                key={t}
                label={t}
                onDelete={() => setTags((prev) => prev.filter((x) => x !== t))}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
          <TextField
            label="Add tag"
            value={tagInput}
            onChange={handleTagChange}
            onKeyDown={handleTagKey}
            onPaste={handleTagPaste}
            fullWidth
            placeholder="e.g. art, pixelart"
            inputRef={tagInputRef}
            sx={{ mt: 1 }}
            disabled={tags.length >= MAX_TAGS}
            inputProps={{ maxLength: MAX_TAG_LENGTH + 2 }}
          />
          <Typography variant="caption" color="textSecondary">
            Up to {MAX_TAGS} tags, each up to {MAX_TAG_LENGTH} characters.
          </Typography>
        </Grid>

        <Grid size={12}>
          <TextField
            label="Recipient Address *"
            name="toAddress"
            value={formData.toAddress}
            onChange={handleInputChange}
            fullWidth
            placeholder="e.g. tz1..."
          />
        </Grid>

        {(contractVersion === 'v2' || contractVersion === 'v3') && (
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

        <Grid size={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                color="primary"
              />
            }
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

      <Section>
        <Typography variant="subtitle2">
          Approx. Metadata Size: {Math.floor(metadataSize).toLocaleString()} / {MAX_METADATA_SIZE} bytes{' '}
          <Tooltip title="This is the estimated total metadata size (including a fixed overhead of 360 bytes) that will be stored on-chain. The hard limit is 32,768 bytes." arrow>
            <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
          </Tooltip>
        </Typography>
        {metadataSize > MAX_METADATA_SIZE && (
          <Typography variant="body2" color="error">
            Warning: Metadata size exceeds the maximum allowed 32 KB. Minting is disabled.
          </Typography>
        )}
      </Section>

      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button
          variant="contained"
          color="success"
          onClick={handleMintClick}
          disabled={loading || !agreed || metadataSize > MAX_METADATA_SIZE}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Preparing…' : 'Mint NFT'}
        </Button>
      </Box>

      {estimation.estimatedFeeTez && (
        <Section>
          <Typography variant="subtitle1">Estimated Fees:</Typography>
          <Typography variant="body2">
            <strong>Fee:</strong> {estimation.estimatedFeeTez} ꜩ{' '}
            <Tooltip title="Network fee required for minting" arrow>
              <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
            </Tooltip>
          </Typography>
          <Typography variant="body2">
            <strong>Storage Cost:</strong> {estimation.estimatedStorageCostTez} ꜩ{' '}
            <Tooltip title="On‑chain storage cost" arrow>
              <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
            </Tooltip>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Total:</strong> {estimation.totalEstimatedCostTez} ꜩ{' '}
            <Tooltip title="Total cost (fee + storage)" arrow>
              <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
            </Tooltip>
          </Typography>
        </Section>
      )}

      <Section>
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'right' }}>
          After minting, check OBJKT! ✌️🤟🤘
        </Typography>
      </Section>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false })}>
        <DialogTitle>Confirm Minting</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please review the estimated fees before proceeding.
          </DialogContentText>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Fee:</strong> {dialog.estimatedFeeTez} ꜩ{' '}
            <Tooltip title="Network fee" arrow>
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
            </Tooltip>
          </Typography>
          <Typography variant="body2">
            <strong>Storage:</strong> {dialog.estimatedStorageCostTez} ꜩ{' '}
            <Tooltip title="Storage cost" arrow>
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
            </Tooltip>
          </Typography>
          <Typography variant="body2">
            <strong>Gas Limit:</strong> {dialog.estimatedGasLimit}
          </Typography>
          <Typography variant="body2">
            <strong>Storage Limit:</strong> {dialog.estimatedStorageLimit}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Total:</strong> {dialog.totalEstimatedCostTez} ꜩ{' '}
            <Tooltip title="Total cost (fee + storage)" arrow>
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
            </Tooltip>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false })} color="secondary">
            Cancel
          </Button>
          <Button onClick={confirmMint} color="primary" variant="contained" autoFocus>
            Confirm Mint
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Mint;
