/*Developed by @jams2blues with love for the Tezos community
  File: src/components/MintBurnTransfer/MintBurnTransfer.js
  Summary: Unified Ghostnet/Mainnet carousel + bullet‑proof manual loader with rate‑limit handling, auto‑rescan on focus, and persistent loading indicator.
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
const LoadingGraphic = styled(Box)`
  text-align: center;
  padding: 40px 0;
`;

/* ─── Network maps ──────────────────────────────────────────────── */
const TZKT_BASE = {
  ghostnet: 'https://api.ghostnet.tzkt.io/v1',
  mainnet: 'https://api.tzkt.io/v1',
};

const HASHES = {
  ghostnet: { v1: 943737041, v2: -1889653220, v3: 862045731 },
  mainnet: {
    v1: 943737041,
    v2a: -1889653220,
    v2b: -543526052,
    v2c: -1513923773,
    v2d: -1835576114,
    v2e: 1529857708,
    v3: 862045731,
  },
};

const makeHashList = (o) =>
  Object.values(o)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .join(',');

const getVersion = (net, hash) =>
  (Object.entries(HASHES[net] || {})
    .find(([, h]) => h === hash)?.[0] || 'v?')
    .replace(/v2./, 'v2');

/* ─── Helpers ───────────────────────────────────────────────────── */
const dataUriOk = (u) => typeof u === 'string' && u.startsWith('data:');
const parseHexJSON = (hex) => {
  try {
    return JSON.parse(Buffer.from(hex.replace(/^0x/, ''), 'hex').toString('utf8'));
  } catch {
    return {};
  }
};
const toNat = (raw) =>
  raw == null
    ? null
    : typeof raw === 'number'
    ? raw
    : typeof raw === 'string'
    ? parseInt(raw, 10)
    : raw.int
    ? parseInt(raw.int, 10)
    : null;

/* ─── Throttled fetch utility (handles 429) ─────────────────────── */
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
async function fetchJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { mode: 'cors' });
      if (r.status === 429) {
        await sleep(600 * (i + 1));
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch {
      if (i === tries - 1) throw new Error('fetch failed');
      await sleep(400 * (i + 1));
    }
  }
}

/* ─── Fetch contracts CREATED by wallet (carousel) ──────────────── */
async function _fetchFOCContracts({ walletAddress, network, abortSignal }) {
  if (!walletAddress) return [];
  const baseUrl = TZKT_BASE[network] || TZKT_BASE.ghostnet;
  const hashList = makeHashList(HASHES[network] || HASHES.ghostnet);

  const base = await fetchJSON(
    `${baseUrl}/contracts?creator.eq=${walletAddress}&typeHash.in=${hashList}&limit=200`
  );

  const out = [];
  const concurrent = 3;
  const queue = [...base];

  const workers = Array.from({ length: concurrent }).map(async () => {
    while (queue.length) {
      if (abortSignal?.aborted) return;
      const c = queue.shift();
      try {
        const det = await fetchJSON(`${baseUrl}/contracts/${c.address}`);
        let meta = det.metadata || {};
        if (!meta.name || !meta.imageUri || !meta.description) {
          const bm = await fetchJSON(
            `${baseUrl}/contracts/${c.address}/bigmaps/metadata/keys/content`
          ).catch(() => null);
          if (bm?.value) meta = { ...parseHexJSON(bm.value), ...meta };
        }
        const stor = await fetchJSON(
          `${baseUrl}/contracts/${c.address}/storage`
        ).catch(() => ({}));

        out.push({
          address: c.address,
          name: meta.name || c.address,
          description: meta.description || '',
          imageUri: dataUriOk(meta.imageUri) ? meta.imageUri : '',
          total: toNat(stor.all_tokens) ?? toNat(stor.next_token_id),
          version: getVersion(network, c.typeHash),
          date: c.firstActivityTime || c.lastActivityTime,
        });
      } catch {
        /* ignore */
      }
    }
  });

  await Promise.all(workers);
  out.sort((a, b) => new Date(b.date) - new Date(a.date));
  return out;
}

/* ─── Fast metadata fetch for manual loader ─────────────────────── */
const fetchMetadata = async (address, network) => {
  const baseUrl = TZKT_BASE[network] || TZKT_BASE.ghostnet;
  const det = await fetchJSON(`${baseUrl}/contracts/${address}`);
  let meta = det.metadata || {};
  if (!meta.name || !meta.imageUri || !meta.description) {
    const bm = await fetchJSON(
      `${baseUrl}/contracts/${address}/bigmaps/metadata/keys/content`
    ).catch(() => null);
    if (bm?.value) meta = { ...parseHexJSON(bm.value), ...meta };
  }
  return { meta, version: getVersion(network, det.typeHash) };
};

/* ─── Component ─────────────────────────────────────────────────── */
const MintBurnTransfer = () => {
  const { tezos, isWalletConnected, walletAddress, network } =
    useContext(WalletContext);

  const [contractAddress, setContractAddress] = useState('');
  const [contractMetadata, setContractMetadata] = useState(null);
  const [contractVersion, setContractVersion] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const [scanLoading, setScanLoading] = useState(true);
  const [focContracts, setFocContracts] = useState([]);
  const [idx, setIdx] = useState(0);
  const cache = useRef({ key: '', data: [] });
  const abortRef = useRef(null);

  const snack = (m, s = 'info') => setSnackbar({ open: true, message: m, severity: s });
  const closeSnack = () => setSnackbar((p) => ({ ...p, open: false }));

  /* scan wallet + on-focus rescanning */
  const scan = useCallback(async () => {
    if (!isWalletConnected) {
      setScanLoading(false);
      return;
    }
    setScanLoading(true);
    const key = `${walletAddress}-${network}`;
    if (cache.current.key === key && cache.current.data.length) {
      setFocContracts(cache.current.data);
      setScanLoading(false);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const data = await _fetchFOCContracts({
        walletAddress,
        network,
        abortSignal: abortRef.current.signal,
      });
      cache.current = { key, data };
      setFocContracts(data);
    } catch {
      /* ignore */
    } finally {
      setScanLoading(false);
    }
  }, [isWalletConnected, walletAddress, network]);

  useEffect(() => {
    scan();
    const onFocus = () => scan();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      abortRef.current?.abort();
    };
  }, [scan]);

  /* carousel */
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
    snack('Contract loaded', 'success');
  };

  /* manual loader */
  const loadManual = async () => {
    if (!contractAddress) return snack('Enter a contract address', 'warning');
    setLoading(true);
    try {
      const { meta, version } = await fetchMetadata(contractAddress, network);
      setContractMetadata(meta);
      setContractVersion(version);
      snack('Metadata loaded', 'success');
    } catch {
      try {
        const contract = await tezos.contract.at(contractAddress);
        const storage = await contract.storage();
        const ver =
          storage.contract_id && Buffer.from(storage.contract_id, 'hex').toString('utf8') === 'ZeroContract'
            ? 'v3'
            : storage.all_tokens !== undefined
            ? 'v2'
            : 'v1';
        setContractVersion(ver);
        if (!storage.metadata) throw new Error('Metadata big_map missing');
        const ptrRaw = await storage.metadata.get('');
        const ptr =
          typeof ptrRaw === 'string'
            ? ptrRaw
            : Buffer.from(ptrRaw.bytes, 'hex').toString('utf8');
        const val = await storage.metadata.get(ptr.replace('tezos-storage:', ''));
        const str = typeof val === 'string' ? val : Buffer.from(val.bytes, 'hex').toString('utf8');
        setContractMetadata(JSON.parse(str));
        snack('Metadata loaded on‑chain', 'success');
      } catch (e) {
        setContractMetadata(null);
        setContractVersion('');
        snack(e.message || 'Load failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (a) => setAction(a);

  return (
    <StyledPaper elevation={3}>
      <Typography variant="h5" gutterBottom>
        Mint, Burn, and Transfer NFTs
      </Typography>
      <Disclaimer>
        <Typography variant="body2">
          <strong>Disclaimer:</strong> Use at your own risk. You are on {network}.
        </Typography>
      </Disclaimer>

      {isWalletConnected && (
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Your Fully‑On‑Chain ZeroContracts
          </Typography>
          {scanLoading ? (
            <LoadingGraphic>
              <Typography variant="h2">⛓️</Typography>
              <CircularProgress size={48} thickness={5} sx={{ mt: 1 }} />
              <Typography variant="body1" sx={{ mt: 1 }}>
                Loading Contracts…
              </Typography>
            </LoadingGraphic>
          ) : focContracts.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              Give it 10 seconds or so to load, otherwise No fully‑on‑chain ZeroContracts found for this wallet on {network}, you can always paste manually 👇.
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

      {contractMetadata && (
        <>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6">
                {contractMetadata.name}{' '}
                {contractVersion && (
                  <Typography component="span" variant="caption">
                    ({contractVersion.toUpperCase()})
                  </Typography>
                )}
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
