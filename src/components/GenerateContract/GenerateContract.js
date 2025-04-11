/*Developed by @jams2blues with love for the Tezos community
  File: src/components/GenerateContract/GenerateContract.js
  Summary: Deploy‑contract form (V3) – now with iframe‑safe clipboard fallback and Michelson code fetch guard
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
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { WalletContext } from '../../contexts/WalletContext';
import NFTPreview from './NFTPreview';
import FileUpload from './FileUpload';
import { MichelsonMap } from '@taquito/taquito';
import { BigNumber } from 'bignumber.js';

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

const Preformatted = styled('pre')`
  background-color: #f5f5f5;
  padding: 10px;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.9rem;
`;

const stringToHex = (str) =>
  [...str].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

const isValidTezosAddress = (address) =>
  /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);

const getByteSize = (dataUri) => {
  try {
    const base64Data = dataUri.split(',')[1];
    if (!base64Data) return 0;
    const padding = (base64Data.match(/=+$/) || [''])[0].length;
    return Math.floor((base64Data.length * 3) / 4) - padding;
  } catch (error) {
    console.error('Error calculating byte size:', error);
    return 0;
  }
};

const TEZOS_STORAGE_CONTENT_KEY = 'tezos-storage:content';
const TEZOS_STORAGE_CONTENT_HEX = stringToHex(TEZOS_STORAGE_CONTENT_KEY);
const CONTENT_KEY = 'content';
const STORAGE_COST_PER_BYTE = 0.00025;
const OVERHEAD_BYTES = 5960;
const MAX_METADATA_SIZE = 32768;

const getV3Storage = (walletAddress, metadataMap) => ({
  admin: walletAddress,
  all_tokens: 0,
  children: [],
  collaborators: [],
  contract_id: "0x" + stringToHex("ZeroContract"),
  ledger: new MichelsonMap(),
  lock: false,
  metadata: metadataMap,
  next_token_id: 0,
  operators: new MichelsonMap(),
  parents: [],
  token_metadata: new MichelsonMap(),
  total_supply: new MichelsonMap(),
});

/**
 * Attempts to copy text to clipboard using the modern Clipboard API.
 * Falls back to document.execCommand if necessary.
 * Returns a boolean indicating success.
 */
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(ta);
      return successful;
    } catch (execErr) {
      return false;
    }
  }
};

const GenerateContract = () => {
  const { tezos, isWalletConnected, walletAddress } = useContext(WalletContext);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    authors: '',
    authorAddresses: '',
    symbol: '',
    creators: '',
    type: 'art',
    imageUri: '',
    agreeToTerms: false,
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [contractAddress, setContractAddress] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [modifiedMichelsonCode, setModifiedMichelsonCode] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, data: null });
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractDetailsDialogOpen, setContractDetailsDialogOpen] = useState(false);
  const [michelsonCode, setMichelsonCode] = useState('');
  const [estimatedFeeTez, setEstimatedFeeTez] = useState(null);
  const [estimatedGasLimit, setEstimatedGasLimit] = useState(null);
  const [estimatedStorageLimit, setEstimatedStorageLimit] = useState(null);
  const [estimatedBalanceChangeTez, setEstimatedBalanceChangeTez] = useState(null);

  const supportedFiletypesList = [
    'image/bmp','image/gif','image/jpeg','image/png','image/apng','image/svg+xml','image/webp',
    'video/mp4','video/ogg','video/quicktime','video/webm','text/plain','application/json'
  ];

  useEffect(() => {
    const fetchMichelson = async () => {
      try {
        const response = await fetch('/contracts/Zero_Contract_V3.tz');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const code = await response.text();
        setMichelsonCode(code);
      } catch (error) {
        console.error('Error fetching Michelson code:', error);
        setSnackbar({ open: true, message: 'Failed to load Michelson code.', severity: 'error' });
        setMichelsonCode('');
      }
    };

    if (isWalletConnected && walletAddress) {
      fetchMichelson();
    } else {
      setMichelsonCode('');
    }
  }, [walletAddress, isWalletConnected]);

  const removeControlChars = (str) => {
    let sanitized = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if ((code >= 0x20 && code <= 0x7E) || (code >= 0xA0 && code <= 0xFF)) {
        sanitized += str[i];
      }
    }
    return sanitized;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    const finalValue = name === 'description' ? removeControlChars(newValue) : newValue;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    const error = validateField(name, finalValue);
    setFormErrors((prev) => ({ ...prev, [name]: error }));
  };

  const metadataPreview = useMemo(() => ({
    name: formData.name || "",
    description: formData.description || "",
    interfaces: ['TZIP-012', 'TZIP-016'],
    authors: formData.authors ? formData.authors.split(',').map(a => a.trim()).filter(Boolean) : [],
    authoraddress: formData.authorAddresses ? formData.authorAddresses.split(',').map(a => a.trim()).filter(Boolean) : [],
    symbol: formData.symbol || "",
    creators: formData.creators ? formData.creators.split(',').map(a => a.trim()).filter(Boolean) : [],
    type: formData.type || "",
    imageUri: formData.imageUri || "",
  }), [formData]);

  const metadataSize = useMemo(() => {
    const metadataJson = JSON.stringify(metadataPreview);
    const metadataHex = stringToHex(metadataJson);
    return metadataHex.length / 2 + OVERHEAD_BYTES;
  }, [metadataPreview]);

  const renderMetadataSizeIndicator = () => (
    <Typography variant="body2" sx={{ color: metadataSize > MAX_METADATA_SIZE ? 'error.main' : 'textSecondary', mb: 1 }}>
      Estimated Metadata Size: {Math.floor(metadataSize)} / {MAX_METADATA_SIZE} bytes
    </Typography>
  );

  const validateField = (field, value) => {
    let err = '';
    switch (field) {
      case 'name':
        if (!value) err = 'Name is required.';
        else if (value.length > 30) err = 'Max 30 characters.';
        break;
      case 'description':
        if (!value) err = 'Description is required.';
        else if (value.length > 250) err = 'Max 250 characters.';
        break;
      case 'symbol':
        if (!value) err = 'Symbol is required.';
        else if (value.length < 3) err = 'Min 3 characters.';
        else if (value.length > 5) err = 'Max 5 characters.';
        else {
          const pattern = /^[A-Za-z0-9]{3,5}$/;
          if (!pattern.test(value)) err = 'Letters and numbers only.';
        }
        break;
      case 'creators':
        if (!value) err = 'Creator(s) required.';
        else if (value.length > 200) err = 'Max 200 characters.';
        break;
      case 'authors':
        if (!value) err = 'Author(s) required.';
        else if (value.length > 50) err = 'Max 50 characters.';
        break;
      case 'authorAddresses':
        {
          const authors = formData.authors.split(',').map(a => a.trim()).filter(Boolean);
          const addresses = value.split(',').map(a => a.trim()).filter(Boolean);
          if (authors.length !== addresses.length) err = 'Authors and addresses count must match.';
          else addresses.forEach(addr => {
            if (!isValidTezosAddress(addr)) err = `Invalid address: ${addr}`;
          });
        }
        break;
      case 'imageUri':
        if (!value) err = 'Image URI required.';
        break;
      case 'agreeToTerms':
        if (!value) err = 'Must agree to terms.';
        break;
      default:
        break;
    }
    return err;
  };

  const validateForm = () => {
    const errors = {};
    Object.keys(formData).forEach((field) => {
      const err = validateField(field, formData[field]);
      if (err) errors[field] = err;
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleThumbnailUpload = (dataUri) => {
    setFormData((prev) => ({ ...prev, imageUri: dataUri }));
    const err = validateField('imageUri', dataUri);
    setFormErrors((prev) => ({ ...prev, imageUri: err }));
  };

  useEffect(() => {
    const generateContract = async () => {
      if (!validateForm()) {
        setModifiedMichelsonCode('');
        return;
      }
      // Guard: if Michelson code hasn't been fetched yet, don't proceed.
      if (!michelsonCode) {
        console.warn("Michelson code not set yet, skipping contract generation.");
        return;
      }
      try {
        setModifiedMichelsonCode(michelsonCode);
        setSnackbar({ open: true, message: 'Contract generated.', severity: 'success' });
      } catch (error) {
        console.error('Error generating contract:', error);
        setSnackbar({ open: true, message: 'Error generating contract. Please try again.', severity: 'error' });
        setModifiedMichelsonCode('');
      }
    };
    generateContract();
  }, [formData, michelsonCode]);

  const handleCopyContract = async () => {
    if (!modifiedMichelsonCode) {
      setSnackbar({ open: true, message: 'Generate contract first.', severity: 'warning' });
      return;
    }
    const success = await copyToClipboard(modifiedMichelsonCode);
    setSnackbar({ open: true, message: success ? 'Contract copied!' : 'Failed to copy contract.', severity: success ? 'success' : 'error' });
  };

  const handleDeployContract = async () => {
    if (!validateForm()) {
      setSnackbar({ open: true, message: 'Fix errors before deploying.', severity: 'error' });
      return;
    }
    if (!isWalletConnected) {
      setSnackbar({ open: true, message: 'Connect wallet first.', severity: 'error' });
      return;
    }
    if (!walletAddress) {
      setSnackbar({ open: true, message: 'Wallet address undefined.', severity: 'error' });
      return;
    }
    if (!modifiedMichelsonCode) {
      setSnackbar({ open: true, message: 'Generate contract first.', severity: 'warning' });
      return;
    }
    if (metadataSize > MAX_METADATA_SIZE) {
      setSnackbar({
        open: true,
        message: `Metadata size (${Math.floor(metadataSize)} bytes) exceeds the maximum allowed (${MAX_METADATA_SIZE} bytes). Please reduce file or text data.`,
        severity: 'error',
      });
      return;
    }
    setDeploying(true);
    setSnackbar({ open: true, message: 'Estimating fees...', severity: 'info' });
    try {
      const metadataObj = {
        name: formData.name,
        description: formData.description,
        interfaces: ['TZIP-012', 'TZIP-016'],
        authors: formData.authors.split(',').map(a => a.trim()).filter(Boolean),
        authoraddress: formData.authorAddresses.split(',').map(a => a.trim()).filter(Boolean),
        symbol: formData.symbol,
        creators: formData.creators.split(',').map(a => a.trim()).filter(Boolean),
        type: formData.type,
        imageUri: formData.imageUri,
      };
      const jsonString = JSON.stringify(metadataObj);
      const metadataHex = stringToHex(jsonString);

      const metadataMap = new MichelsonMap();
      metadataMap.set('', TEZOS_STORAGE_CONTENT_HEX);
      metadataMap.set(CONTENT_KEY, metadataHex);

      const storage = getV3Storage(walletAddress, metadataMap);
      console.log('Storage Object:', storage);

      const balanceMutez = await tezos.tz.getBalance(walletAddress);
      const balanceTez = new BigNumber(balanceMutez.toNumber()).dividedBy(1e6);

      const originationEstimation = await tezos.estimate.originate({
        code: modifiedMichelsonCode,
        storage: storage,
      });
      const feeMutez = originationEstimation.suggestedFeeMutez;
      const gasLimit = originationEstimation.gasLimit;
      const storageLimit = originationEstimation.storageLimit;
      const feeTez = new BigNumber(feeMutez).dividedBy(1e6).toFixed(6);
      setEstimatedFeeTez(feeTez);
      setEstimatedGasLimit(gasLimit);
      setEstimatedStorageLimit(storageLimit);

      const storageCostTez = new BigNumber(storageLimit).multipliedBy(STORAGE_COST_PER_BYTE).toFixed(6);
      const totalCost = new BigNumber(feeTez).plus(storageCostTez).toFixed(6);
      const balanceChange = new BigNumber(totalCost).negated().toFixed(6);
      setEstimatedBalanceChangeTez(balanceChange);

      console.log('Fee:', feeTez, 'Gas:', gasLimit, 'Storage:', storageLimit);
      console.log('Storage Cost:', storageCostTez, 'Total Cost:', totalCost, 'Balance Change:', balanceChange);

      if (balanceTez.isLessThan(totalCost)) {
        setSnackbar({ open: true, message: `Insufficient balance: Need at least ${totalCost} ꜩ.`, severity: 'error' });
        setDeploying(false);
        return;
      }
      setConfirmDialog({
        open: true,
        data: {
          estimatedFeeTez: feeTez,
          estimatedGasLimit: gasLimit,
          estimatedStorageLimit: storageLimit,
          storageCostTez: storageCostTez,
          totalEstimatedCostTez: totalCost,
          estimatedBalanceChangeTez: balanceChange,
        },
      });
    } catch (error) {
      console.error('Fee estimation error:', error);
      if (error.message && error.message.includes("Oversized operation")) {
        setSnackbar({ open: true, message: 'Error: Operation size exceeds maximum allowed. Please reduce metadata size.', severity: 'error' });
      } else {
        setSnackbar({ open: true, message: 'Error estimating fees. Please try again.', severity: 'error' });
      }
      setDeploying(false);
    }
  };

  const confirmDeployment = async () => {
    setConfirmDialog({ open: false, data: null });
    setDeploying(true);
    setSnackbar({ open: true, message: 'Deploying contract...', severity: 'info' });
    try {
      const metadataObj = {
        name: formData.name,
        description: formData.description,
        interfaces: ['TZIP-012', 'TZIP-016'],
        authors: formData.authors.split(',').map(a => a.trim()).filter(Boolean),
        authoraddress: formData.authorAddresses.split(',').map(a => a.trim()).filter(Boolean),
        symbol: formData.symbol,
        creators: formData.creators.split(',').map(a => a.trim()).filter(Boolean),
        type: formData.type,
        imageUri: formData.imageUri,
      };
      const jsonString = JSON.stringify(metadataObj);
      const metadataHex = stringToHex(jsonString);

      const metadataMap = new MichelsonMap();
      metadataMap.set('', TEZOS_STORAGE_CONTENT_HEX);
      metadataMap.set(CONTENT_KEY, metadataHex);

      const storage = getV3Storage(walletAddress, metadataMap);

      const originationOp = await tezos.wallet.originate({
        code: modifiedMichelsonCode,
        storage: storage,
      }).send();

      setSnackbar({ open: true, message: 'Awaiting confirmation...', severity: 'info' });
      await originationOp.confirmation();
      const contract = await originationOp.contract();
      const deployedAddress = contract.address;
      if (deployedAddress) {
        setContractAddress(deployedAddress);
        setSnackbar({ open: true, message: `Contract deployed at ${deployedAddress}`, severity: 'success' });
        setContractDetailsDialogOpen(true);
      } else {
        setSnackbar({ open: true, message: 'Failed to retrieve contract address.', severity: 'error' });
      }
    } catch (error) {
      console.error('Deployment error:', error);
      if (error.name === 'AbortedBeaconError') {
        setSnackbar({ open: true, message: 'Deployment aborted.', severity: 'warning' });
      } else if (error?.data?.[0]?.with?.string) {
        const errorMsg = error.data[0].with.string;
        setSnackbar({ open: true, message: errorMsg.includes('balance_too_low') ? 'Insufficient balance.' : `Deployment error: ${errorMsg}`, severity: 'error' });
      } else if (error.message) {
        setSnackbar({ open: true, message: `Error deploying: ${error.message}`, severity: 'error' });
      } else {
        setSnackbar({ open: true, message: 'Deployment error. Try again.', severity: 'error' });
      }
    } finally {
      setDeploying(false);
      setEstimatedFeeTez(null);
      setEstimatedGasLimit(null);
      setEstimatedStorageLimit(null);
      setEstimatedBalanceChangeTez(null);
    }
  };

  const handleCloseDialog = () => setConfirmDialog({ open: false, data: null });
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const handleCloseContractDetailsDialog = () => setContractDetailsDialogOpen(false);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (contractAddress && !contractDialogOpen) {
        e.preventDefault();
        e.returnValue = 'You have not copied your contract address. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [contractAddress, contractDialogOpen]);

  return (
    <Container elevation={3}>
      <Typography variant="h4" align="center" gutterBottom>
        Deploy Your On-Chain Tezos NFT Smart Contract
      </Typography>
      <Typography variant="h5" align="center" gutterBottom>
        NFT Collection Contract
      </Typography>
      <Typography variant="body1" align="center" gutterBottom>
        Ready to mint your NFTs fully on-chain? Just fill in the details below, and we’ll handle the metadata magic, swapping in your info and wallet address before deploying it on Tezos with Taquito. Big thanks to{' '}
        <Link
          href="https://x.com/JestemZero"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          underline="hover"
        >
          @JestemZero
        </Link>{' '}
        and{' '}
        <Link
          href="https://x.com/jams2blues"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          underline="hover"
        >
          @jams2blues
        </Link>{' '}
        for the late nights – powered by sheer willpower and love.
      </Typography>

      <Section>
        <Alert severity="warning">
          <Typography variant="body2">
            <strong>Disclaimer:</strong> By deploying contracts and NFTs via this platform, you accept full responsibility for your on-chain actions. On Tezos, contracts are immutable and cannot be deleted or altered once deployed. We hold no liability for any content you create or deploy. Always test thoroughly on{' '}
            <Link
              href="https://ghostnet.savetheworldwithart.io"
              color="primary"
              underline="hover"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ghostnet
            </Link>{' '}
            before deploying to mainnet.
          </Typography>
        </Alert>
      </Section>

      <Box sx={{ textAlign: 'center', mb: 2 }}>
        {isWalletConnected ? (
          <Typography variant="subtitle1">Wallet Connected: {walletAddress}</Typography>
        ) : (
          <Typography variant="subtitle1">Please connect your wallet to proceed.</Typography>
        )}
      </Box>

      <Section>
        <Typography variant="h6" gutterBottom>
          Step 1: Fill in Your Collection Details
        </Typography>
        <form noValidate autoComplete="off">
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
                inputProps={{ maxLength: 30 }}
                helperText={`${formData.name.length}/30 characters`}
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
                helperText={`${formData.symbol.length}/5 characters. Letters and numbers only.`}
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
                placeholder="Comma-separated Tezos addresses"
                required
                inputProps={{ maxLength: 200 }}
                helperText={`${formData.authorAddresses.length}/200 characters`}
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
                placeholder="Comma-separated Tezos addresses"
                required
                inputProps={{ maxLength: 200 }}
                helperText={`${formData.creators.length}/200 characters`}
                error={!!formErrors.creators}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth margin="normal" error={!!formErrors.type}>
                <InputLabel id="type-label">Type *</InputLabel>
                <Select
                  labelId="type-label"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  label="Type *"
                >
                  <MenuItem value="art">Art</MenuItem>
                  <MenuItem value="music">Music</MenuItem>
                  <MenuItem value="collectible">Collectible</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
                {formErrors.type && (
                  <Typography variant="caption" color="error">
                    {formErrors.type}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid size={12}>
              {renderMetadataSizeIndicator()}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FileUpload setArtifactData={handleThumbnailUpload} />
                <Tooltip
                  title={
                    <>
                      <Typography variant="subtitle2">Supported Filetypes:</Typography>
                      <Typography variant="body2">{supportedFiletypesList.join(', ')}</Typography>
                    </>
                  }
                  arrow
                >
                  <IconButton sx={{ ml: 1 }} aria-label="Supported Filetypes">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                • Thumbnail must be 1:1 aspect ratio and under 15MB
              </Typography>
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    name="agreeToTerms"
                    color="primary"
                  />
                }
                label={
                  <span>
                    I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</Link>.
                  </span>
                }
              />
              {formErrors.agreeToTerms && (
                <Typography variant="caption" color="error">
                  {formErrors.agreeToTerms}
                </Typography>
              )}
            </Grid>
          </Grid>
        </form>
      </Section>

      {metadataPreview && (
        <Section>
          <Typography variant="subtitle1" gutterBottom>Metadata Preview:</Typography>
          <NFTPreview metadata={metadataPreview} />
        </Section>
      )}

      <Grid container spacing={2} sx={{ textAlign: 'center', mt: 2 }}>
        <Grid size={12}>
          <Typography variant="caption" display="block" gutterBottom>for advanced users</Typography>
          <Button variant="outlined" color="primary" onClick={handleCopyContract} disabled={!modifiedMichelsonCode} sx={{ maxWidth: '300px', mx: 'auto' }}>
            Copy Contract
          </Button>
        </Grid>
        <Grid size={12}>
          <Typography variant="caption" display="block" gutterBottom>
            Get your collection on-chain so you can start minting!
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleDeployContract}
            disabled={deploying || !modifiedMichelsonCode || Object.keys(formErrors).length > 0}
            startIcon={deploying && <CircularProgress size={20} />}
            sx={{ maxWidth: '300px', mx: 'auto' }}
          >
            {deploying ? 'Deploying...' : 'Deploy Contract'}
          </Button>
          {estimatedFeeTez && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Estimated Fees: {estimatedFeeTez} ꜩ
            </Typography>
          )}
        </Grid>
      </Grid>

      {contractAddress && (
        <Section>
          <Typography variant="h6" gutterBottom>Step 2: Your Contract is Deployed</Typography>
          <Typography variant="body2" gutterBottom>
            Your contract has been successfully deployed. Below is your contract address.
          </Typography>
          <Preformatted>{contractAddress}</Preformatted>
          <Button variant="contained" color="secondary" onClick={async () => await copyToClipboard(contractAddress)} sx={{ mt: 1, maxWidth: '300px', mx: 'auto' }}>
            Copy Contract Address
          </Button>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Check your contract on{' '}
            <Link href={`https://better-call.dev/ghostnet/${contractAddress}/operations`} target="_blank" rel="noopener noreferrer" color="primary" underline="hover">
              Better Call Dev
            </Link>{' '}
            or{' '}
            <Link href={`https://ghostnet.objkt.com/collections/${contractAddress}`} target="_blank" rel="noopener noreferrer" color="primary" underline="hover">
              OBJKT.com
            </Link>.
          </Typography>
        </Section>
      )}

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })} fullWidth maxWidth="sm">
        <DialogTitle id="confirm-deployment-title">Confirm Deployment</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-deployment-description">
            Are you sure you want to deploy this smart contract? This action is irreversible.
            <br /><br />
            <strong>Estimated Fee:</strong> {confirmDialog.data ? `${confirmDialog.data.estimatedFeeTez} ꜩ` : 'Calculating...'}{' '}
            <Tooltip title="The network fee required for deployment." arrow>
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
            <br />
            <strong>Gas Limit:</strong> {confirmDialog.data ? confirmDialog.data.estimatedGasLimit : 'Calculating...'}{' '}
            <Tooltip title="Maximum allowed gas." arrow>
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
            <br />
            <strong>Storage Limit:</strong> {confirmDialog.data ? confirmDialog.data.estimatedStorageLimit : 'Calculating...'}{' '}
            <Tooltip title="Maximum storage allocated." arrow>
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
            <br />
            <strong>Storage Cost:</strong> {confirmDialog.data ? `${confirmDialog.data.storageCostTez} ꜩ` : 'Calculating...'}{' '}
            <Tooltip title="Cost to store contract data on-chain." arrow>
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
            <br />
            <strong>Total Cost:</strong> {confirmDialog.data ? `${confirmDialog.data.totalEstimatedCostTez} ꜩ` : 'Calculating...'}{' '}
            <Tooltip title="Total fee + storage cost." arrow>
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
            <br />
            <strong>Balance Change:</strong> {confirmDialog.data ? `${confirmDialog.data.estimatedBalanceChangeTez} ꜩ` : 'Calculating...'}{' '}
            <Tooltip title="Estimated change in your account balance after deployment." arrow>
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
          </DialogContentText>
          <Typography variant="subtitle2" color="error" sx={{ mt: 1 }}>
            **Please verify all information before proceeding.**
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} color="secondary">
            Cancel
          </Button>
          <Button onClick={confirmDeployment} color="primary" variant="contained" autoFocus>
            Confirm Deployment
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={contractDetailsDialogOpen} onClose={handleCloseContractDetailsDialog} fullWidth maxWidth="sm">
        <DialogTitle>Contract Deployed Successfully</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your contract was deployed at:
          </DialogContentText>
          <Preformatted>{contractAddress}</Preformatted>
          <Typography variant="body2" sx={{ mt: 1 }}>
              Copy the full contract code and store it safely! You will need this on Mint/Burn/transfer to interact with your collection! Also view your contract on Ghostnet OBJKT and Better-Call.dev/ghostnet below, check for discrepencies and errors before deploying to Mainnet!
          </Typography>
          <Box sx={{ mt: 1, mb: 1 }}>
            <Button variant="outlined" onClick={handleCopyContract} sx={{ mr: 1 }}>
              Copy Contract Code
            </Button>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
            <Link href={`https://ghostnet.objkt.com/collections/${contractAddress}`} target="_blank" rel="noopener noreferrer" underline="hover" color="primary">
              View on Ghostnet OBJKT
            </Link>
            <Link href={`https://better-call.dev/ghostnet/${contractAddress}/operations`} target="_blank" rel="noopener noreferrer" underline="hover" color="primary">
              View on Better-Call.dev
            </Link>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContractDetailsDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default GenerateContract;
