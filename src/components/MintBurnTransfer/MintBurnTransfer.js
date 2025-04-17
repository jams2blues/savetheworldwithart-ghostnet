/*Developed by @jams2blues with love for the Tezos community
  File: src/components/MintBurnTransfer/MintBurnTransfer.js
  Summary: Carousel shows full multiline description (no ellipsis).
*/
import React, {
  useState,
  useContext,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import styled from '@emotion/styled';
import {
  Typography,
  Paper,
  Button,
  Snackbar,
  Alert,
  TextField,
  CircularProgress,
  Grid,
  Box,
  Stack,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  Skeleton,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Buffer } from 'buffer';
import { WalletContext } from '../../contexts/WalletContext';
import Mint from './Mint';
import Burn from './Burn';
import Transfer from './Transfer';
import BalanceOf from './BalanceOf';
import UpdateOperators from './UpdateOperators';
import AddRemoveParentChild from './AddRemoveParentChild';
import AddRemoveCollaborator from './AddRemoveCollaborator';
import ManageCollaborators from './ManageCollaborators';

/* ─── Styling ───────────────────────────────────────────────────── */
const StyledPaper = styled(Paper)`
  padding: 20px;
  margin: 20px auto;
  max-width: 900px;
  width: 95%;
  box-sizing: border-box;
`;
const Disclaimer = styled('div')`
  margin-top: 20px;
  padding: 10px;
  background-color: #fff8e1;
  border-left: 6px solid #ffeb3b;
  box-sizing: border-box;
`;

/* ─── Constants & helpers ───────────────────────────────────────── */
const tzktBase = 'https://api.ghostnet.tzkt.io/v1';
const ZERO_TYPE_HASHES = { v1: 943737041, v2: -1889653220, v3: 862045731 };
const HASH_LIST = Object.values(ZERO_TYPE_HASHES).join(',');

const dataUriOk = (uri) =>
  typeof uri === 'string' &&
  uri.startsWith('data:') &&
  !uri.includes('ipfs://') &&
  !uri.includes('arweave://');

const decodeHex = (val) =>
  typeof val === 'string' && val.startsWith('0x')
    ? Buffer.from(val.slice(2), 'hex').toString('utf8')
    : val;

const parseBigMapHex = (val) => {
  const hex =
    typeof val === 'string'
      ? val.replace(/^0x/, '')
      : val?.bytes || '';
  try {
    return JSON.parse(Buffer.from(hex, 'hex').toString('utf8'));
  } catch {
    return {};
  }
};

const toNat = (raw) => {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return parseInt(raw, 10);
  if (typeof raw === 'object' && raw.int) return parseInt(raw.int, 10);
  return null;
};

/* ─── Fetch ZeroContracts with metadata + supply ───────────────── */
async function _fetchFOCContracts({ walletAddress }) {
  if (!walletAddress) return [];

  const baseList = await fetch(
    `${tzktBase}/contracts?creator.eq=${walletAddress}&typeHash.in=${HASH_LIST}&limit=200`
  ).then((r) => (r.ok ? r.json() : []));

  const queue = [...baseList];
  const results = [];
  const concurrency = 8;

  const worker = async () => {
    const c = queue.shift();
    if (!c) return;
    try {
      /* metadata */
      const detail = await fetch(`${tzktBase}/contracts/${c.address}`).then((r) =>
        r.ok ? r.json() : null
      );
      let meta = detail?.metadata || {};

      /* storage for minted count */
      const stor = await fetch(`${tzktBase}/contracts/${c.address}/storage`).then((r) =>
        r.ok ? r.json() : null
      );
      const minted =
        toNat(stor?.all_tokens) ?? toNat(stor?.next_token_id) ?? null;

      /* on‑chain content fallback */
      if (!meta.name || !meta.imageUri || !meta.description) {
        const bm = await fetch(
          `${tzktBase}/contracts/${c.address}/bigmaps/metadata/keys/content`
        ).then((r) => (r.ok ? r.json() : null));
        if (bm) meta = { ...parseBigMapHex(bm.value), ...meta };
      }

      const img =
        meta.imageUri ?? meta.thumbnailUri ?? meta.artifactUri ?? '';

      results.push({
        address: c.address,
        name: meta.name || c.address,
        description: meta.description || '',
        imageUri: dataUriOk(img) ? img : '',
        total: minted,
        version:
          Object.entries(ZERO_TYPE_HASHES).find(([, h]) => h === c.typeHash)?.[0] ||
          'v?',
        date: c.firstActivityTime || c.lastActivityTime,
      });
    } catch {
      /* ignore */
    } finally {
      if (queue.length) await worker();
    }
  };

  await Promise.all(Array.from({ length: concurrency }).map(worker));
  results.sort((a, b) => new Date(b.date) - new Date(a.date));
  return results;
}

export async function __debugFetchFOCContracts(wallet) {
  return _fetchFOCContracts({ walletAddress: wallet });
}

/* ─── Component ─────────────────────────────────────────────────── */
const MintBurnTransfer = () => {
  const { tezos, isWalletConnected, walletAddress, network } =
    useContext(WalletContext);

  const [contractAddress, setContractAddress] = useState('');
  const [contractMetadata, setContractMetadata] = useState(null);
  const [contractVersion, setContractVersion] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const [scanLoading, setScanLoading] = useState(true);
  const [focContracts, setFocContracts] = useState([]);
  const [idx, setIdx] = useState(0);
  const cacheRef = useRef({ key: '', data: [] });

  const snack = (msg, sev = 'info') =>
    setSnackbar({ open: true, message: msg, severity: sev });
  const closeSnack = () => setSnackbar((s) => ({ ...s, open: false }));

  const scan = useCallback(async () => {
    if (!isWalletConnected) {
      setFocContracts([]);
      setScanLoading(false);
      return;
    }
    const key = `${walletAddress}-${network}`;
    if (cacheRef.current.key === key && cacheRef.current.data.length) {
      setFocContracts(cacheRef.current.data);
      setScanLoading(false);
      return;
    }
    setScanLoading(true);
    const data = await _fetchFOCContracts({ walletAddress });
    cacheRef.current = { key, data };
    setFocContracts(data);
    setScanLoading(false);
  }, [isWalletConnected, walletAddress, network]);

  useEffect(() => {
    scan();
  }, [scan]);

  /* Carousel helpers */
  const current = focContracts[idx] || null;
  const prev = () => setIdx((p) => (p ? p - 1 : focContracts.length - 1));
  const next = () => setIdx((p) => (p + 1) % focContracts.length);
  const choose = () => {
    if (!current) return;
    setContractAddress(current.address);
    setContractMetadata({
      name: current.name,
      description: current.description,
      imageUri: current.imageUri,
    });
    setContractVersion(current.version);
    snack('Contract loaded from carousel', 'success');
  };

  /* ─── Manual loader (unchanged) ─── */
  const loadManual = async () => {
    if (!contractAddress) return snack('Enter a contract address', 'warning');
    setLoading(true);
    try {
      const contract = await tezos.contract.at(contractAddress);
      const storage = await contract.storage();
      const ver = (() => {
        if (storage.contract_id && decodeHex(storage.contract_id) === 'ZeroContract')
          return 'v3';
        if (storage.all_tokens !== undefined && storage.total_supply !== undefined)
          return 'v2';
        return 'v1';
      })();
      setContractVersion(ver);
      if (!storage.metadata) throw new Error('Metadata big_map missing');
      const pointerRaw = await storage.metadata.get('');
      const pointer =
        typeof pointerRaw === 'string'
          ? pointerRaw
          : Buffer.from(pointerRaw.bytes, 'hex').toString('utf8');
      const metaRaw = await storage.metadata.get(pointer.replace('tezos-storage:', ''));
      const metaStr =
        typeof metaRaw === 'string'
          ? metaRaw
          : Buffer.from(metaRaw.bytes, 'hex').toString('utf8');
      setContractMetadata(JSON.parse(metaStr));
      snack(`Loaded metadata (${ver.toUpperCase()})`, 'success');
    } catch (err) {
      setContractMetadata(null);
      setContractVersion('');
      snack(err.message || 'Load failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (a) => setAction(a);

/* ─── UI ─── */
return (
  <StyledPaper elevation={3}>
    <Typography variant="h5" gutterBottom>
      Mint, Burn, and Transfer NFTs
    </Typography>
    <Disclaimer>
      <Typography variant="body2">
        <strong>Disclaimer:</strong> Use at your own risk. Test on Ghostnet first. Supports ZeroContract V1‑V3.
      </Typography>
    </Disclaimer>

    {/* Carousel */}
    {isWalletConnected && (
      <Box sx={{ mt: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Your Fully‑On‑Chain ZeroContracts
        </Typography>
        {scanLoading ? (
          <Skeleton variant="rectangular" height={240} />
        ) : focContracts.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No fully‑on‑chain ZeroContracts found for this wallet on {network}.
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              maxWidth: 700,
              mx: 'auto',
            }}
          >
            <IconButton onClick={prev}>
              <ChevronLeftIcon />
            </IconButton>
            <Card
              sx={{
                flexGrow: 1,
                mx: 1,
                minHeight: 240,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {current.imageUri ? (
                <CardMedia
                  component="img"
                  image={current.imageUri}
                  alt={current.name}
                  sx={{ height: 120, objectFit: 'contain' }}
                />
              ) : (
                <Box sx={{ height: 120, bgcolor: '#eee' }} />
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" gutterBottom noWrap>
                  {current.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: 'block', wordBreak: 'break-all' }}
                >
                  {current.address}
                </Typography>
                {Number.isFinite(current.total) && (
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    {current.total} tokens minted
                  </Typography>
                )}
                {current.description && (
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{
                      display: 'block',
                      mt: 0.75,
                      whiteSpace: 'normal',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {current.description}
                  </Typography>
                )}
              </CardContent>
            </Card>
            <IconButton onClick={next}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
        )}
        {!!current && (
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Button variant="contained" size="small" onClick={choose}>
              Select
            </Button>
          </Box>
        )}
      </Box>
    )}

      {/* ───── Manual loader ───── */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid size={12}>
          <TextField
            label="Contract Address *"
            fullWidth
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="KT1..."
            sx={{ mb: 2 }}
          />
        </Grid>
        <Grid size={12}>
          <Button
            variant="contained"
            onClick={loadManual}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            fullWidth
          >
            {loading ? 'Loading…' : 'Load Contract'}
          </Button>
        </Grid>
      </Grid>

      {/* ───── Metadata preview + actions ───── */}
      {contractMetadata && (
        <>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6">
                {contractMetadata.name}{' '}
                <Typography component="span" variant="caption">
                  ({contractVersion.toUpperCase()})
                </Typography>
              </Typography>
              {contractMetadata.imageUri && (
                <Box
                  component="img"
                  src={contractMetadata.imageUri}
                  alt="Thumbnail"
                  sx={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: 200,
                    mt: 1,
                    objectFit: 'contain',
                    bgcolor: '#f5f5f5',
                    borderRadius: 2,
                  }}
                />
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2">{contractMetadata.description}</Typography>
            </Grid>
          </Grid>

          {/* ───── Action buttons / sub‑components (unchanged) ───── */}
          {/* Mint */}
          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid size={12}>
              <Stack direction="column" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems="center"
                  sx={{ width: '100%', maxWidth: 300 }}
                >
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleAction('mint')}
                    fullWidth
                  >
                    Mint
                  </Button>
                </Stack>
                <Typography variant="body2" align="center" sx={{ maxWidth: 300 }}>
                  {contractVersion === 'v2'
                    ? 'Mint multiple editions.'
                    : contractVersion === 'v3'
                    ? 'Mint with collaborator & parent/child support.'
                    : 'Mint a single edition.'}
                </Typography>

                {/* Burn */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems="center"
                  sx={{ width: '100%', maxWidth: 300 }}
                >
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleAction('burn')}
                    fullWidth
                  >
                    Burn
                  </Button>
                </Stack>
                <Typography variant="body2" align="center" sx={{ maxWidth: 300 }}>
                  {contractVersion === 'v2' || contractVersion === 'v3'
                    ? 'Burn a specified number of editions.'
                    : 'Burn a single edition.'}
                </Typography>

                {/* Transfer */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems="center"
                  sx={{ width: '100%', maxWidth: 300 }}
                >
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={() => handleAction('transfer')}
                    fullWidth
                  >
                    Transfer
                  </Button>
                </Stack>
                <Typography variant="body2" align="center" sx={{ maxWidth: 300 }}>
                  Transfer NFTs from one address to another.
                </Typography>

                {/* Balance Of */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems="center"
                  sx={{ width: '100%', maxWidth: 300 }}
                >
                  <Button
                    variant="contained"
                    color="info"
                    onClick={() => handleAction('balance_of')}
                    fullWidth
                  >
                    Balance Of
                  </Button>
                </Stack>
                <Typography variant="body2" align="center" sx={{ maxWidth: 300 }}>
                  Check any wallet’s balance.
                </Typography>

                {/* Update Operators */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems="center"
                  sx={{ width: '100%', maxWidth: 300 }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleAction('update_operators')}
                    fullWidth
                  >
                    Update Operators
                  </Button>
                </Stack>
                <Typography variant="body2" align="center" sx={{ maxWidth: 300 }}>
                  Grant or revoke operator permissions.
                </Typography>

                {/* Collaborators (V3) */}
                {contractVersion === 'v3' && (
                  <>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems="center"
                      sx={{ width: '100%', maxWidth: 300 }}
                    >
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => handleAction('collaborators')}
                        fullWidth
                      >
                        Add/Remove Collaborators
                      </Button>
                    </Stack>
                    <Typography variant="body2" align="center" sx={{ maxWidth: 300 }}>
                      Comma‑separate multiple addresses.
                    </Typography>
                    <ManageCollaborators
                      contractAddress={contractAddress}
                      tezos={tezos}
                      setSnackbar={setSnackbar}
                    />
                  </>
                )}

                {/* Parent / Child */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems="center"
                  sx={{ width: '100%', maxWidth: 300 }}
                >
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleAction('add_parent')}
                    fullWidth
                  >
                    Add Parent
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleAction('remove_parent')}
                    fullWidth
                  >
                    Remove Parent
                  </Button>
                </Stack>
                <Typography variant="body2" align="center" sx={{ maxWidth: 300 }}>
                  Manage parent relationships.
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems="center"
                  sx={{ width: '100%', maxWidth: 300 }}
                >
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleAction('add_child')}
                    fullWidth
                  >
                    Add Child
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleAction('remove_child')}
                    fullWidth
                  >
                    Remove Child
                  </Button>
                </Stack>
                <Typography variant="body2" align="center" sx={{ maxWidth: 300 }}>
                  Manage child relationships.
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          {/* ───── Sub‑components ───── */}
          {action === 'mint' && (
            <Mint
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
            />
          )}
          {action === 'burn' && (
            <Burn
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
            />
          )}
          {action === 'transfer' && (
            <Transfer
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
            />
          )}
          {action === 'balance_of' && (
            <BalanceOf
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
            />
          )}
          {action === 'update_operators' && (
            <UpdateOperators
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
            />
          )}
          {(action === 'add_parent' ||
            action === 'remove_parent' ||
            action === 'add_child' ||
            action === 'remove_child') && (
            <AddRemoveParentChild
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
              actionType={action}
            />
          )}
          {action === 'collaborators' && contractVersion === 'v3' && (
            <AddRemoveCollaborator
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
            />
          )}
        </>
      )}

      {/* ───── Snackbar ───── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnack}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={closeSnack} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </StyledPaper>
  );
};

export default MintBurnTransfer;
