/*Developed by @jams2blues with love for the Tezos community
  File: src/components/MintBurnTransfer/MintBurnTransfer.js
  Summary: Unified Ghostnet/Mainnet carousels + manual loader + polished action
           layout. Dark‑mode contrast fix for disclaimer banner.
*/
import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
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
import ManageParentChild from './ManageParentChild';

/* ─── Styling ───────────────────────────────────────────────────── */
const StyledPaper = styled(Paper)`
  padding: 20px;
  margin: 20px auto;
  max-width: 900px;
  width: 95%;
  box-sizing: border-box;
`;

/* Dark‑mode aware disclaimer
   • light mode  → unchanged (#fff8e1)
   • dark  mode  → uses theme.palette.warning.dark for bg + auto contrast text */
const Disclaimer = styled('div')(({ theme }) => ({
  marginTop: 20,
  padding: 10,
  backgroundColor:
    theme.palette.mode === 'dark' ? theme.palette.warning.dark : '#fff8e1',
  color:
    theme.palette.mode === 'dark'
      ? theme.palette.getContrastText(theme.palette.warning.dark)
      : theme.palette.text.primary,
  borderLeft: `6px solid ${theme.palette.warning.main}`,
  boxSizing: 'border-box',
}));

const LoadingGraphic = styled(Box)`
  text-align: center;
  padding: 40px 0;
`;

/* ─── Network maps & helpers ───────────────────────────────────── */
const TZKT_BASE = {
  ghostnet: 'https://api.ghostnet.tzkt.io/v1',
  mainnet: 'https://api.tzkt.io/v1',
};
const HASHES = {
  ghostnet: { v1: 943737041, v2a: -1889653220, v2b: -543526052, v2c: -1513923773, v2d: -1835576114, v2e: 1529857708, v3: 862045731 },
  mainnet: { v1: 943737041, v2a: -1889653220, v2b: -543526052, v2c: -1513923773, v2d: -1835576114, v2e: 1529857708, v3: 862045731 },
};
const makeHashList = (o) => Object.values(o).filter((n, i, arr) => arr.indexOf(n) === i).join(',');
const getVersion = (net, hash) =>
  (Object.entries(HASHES[net]).find(([, h]) => h === hash)?.[0] || 'v?').replace(/v2\./, 'v2');
const dataUriOk = (u) => typeof u === 'string' && u.startsWith('data:');
const parseHexJSON = (hex) => {
  try {
    return JSON.parse(Buffer.from(hex.replace(/^0x/, ''), 'hex').toString('utf8'));
  } catch {
    return {};
  }
};
const toNat = (raw) => {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return parseInt(raw, 10);
  if (raw.int) return parseInt(raw.int, 10);
  return null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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

/* ─── Fetching contracts & details ─────────────────────────────── */
async function _fetchCreatedContracts({ walletAddress, network }) {
  if (!walletAddress) return [];
  const base = TZKT_BASE[network];
  const hashes = makeHashList(HASHES[network]);
  const created = await fetchJSON(`${base}/contracts?creator.eq=${walletAddress}&typeHash.in=${hashes}&limit=200`);
  return created.map((c) => ({
    address: c.address,
    typeHash: c.typeHash,
    timestamp: c.firstActivityTime || c.lastActivityTime,
  }));
}
async function _fetchCollaborativeContracts({ walletAddress, network }) {
  if (!walletAddress) return [];
  const base = TZKT_BASE[network];
  const v3Hash = HASHES[network].v3;
  const contracts = await fetchJSON(`${base}/contracts?typeHash.eq=${v3Hash}&limit=200`);
  const matched = [];
  const queue = [...contracts];
  await Promise.all(
    Array.from({ length: 5 }).map(async () => {
      while (queue.length) {
        const c = queue.shift();
        try {
          const storage = await fetchJSON(`${base}/contracts/${c.address}/storage`);
          if (Array.isArray(storage.collaborators) && storage.collaborators.includes(walletAddress)) {
            matched.push({
              address: c.address,
              typeHash: c.typeHash,
              timestamp: c.firstActivityTime || c.lastActivityTime,
            });
          }
        } catch {}
      }
    })
  );
  return matched;
}
async function _fetchDetails(list, network, signal) {
  const out = [];
  const queue = [...list];
  await Promise.all(
    Array.from({ length: 3 }).map(async () => {
      while (queue.length) {
        if (signal?.aborted) return;
        const { address, typeHash, timestamp } = queue.shift();
        try {
          const det = await fetchJSON(`${TZKT_BASE[network]}/contracts/${address}`);
          let meta = det.metadata || {};
          if (!meta.name || !meta.imageUri || !meta.description) {
            const bm = await fetchJSON(`${TZKT_BASE[network]}/contracts/${address}/bigmaps/metadata/keys/content`).catch(() => null);
            if (bm?.value) meta = { ...parseHexJSON(bm.value), ...meta };
          }
          const stor = await fetchJSON(`${TZKT_BASE[network]}/contracts/${address}/storage`).catch(() => ({}));
          out.push({
            address,
            name: meta.name || address,
            description: meta.description || '',
            imageUri: dataUriOk(meta.imageUri) ? meta.imageUri : '',
            total: toNat(stor.all_tokens) ?? toNat(stor.next_token_id),
            version: getVersion(network, typeHash),
            date: timestamp,
          });
        } catch {}
      }
    })
  );
  out.sort((a, b) => new Date(b.date) - new Date(a.date));
  return out;
}
const fetchMetadata = async (address, network) => {
  const base = TZKT_BASE[network];
  const det = await fetchJSON(`${base}/contracts/${address}`);
  let meta = det.metadata || {};
  if (!meta.name || !meta.imageUri || !meta.description) {
    const bm = await fetchJSON(`${base}/contracts/${address}/bigmaps/metadata/keys/content`).catch(() => null);
    if (bm?.value) meta = { ...parseHexJSON(bm.value), ...meta };
  }
  return { meta, version: getVersion(network, det.typeHash) };
};

/* ─── Main Component ───────────────────────────────────────────── */
const MintBurnTransfer = () => {
  const { tezos, isWalletConnected, walletAddress, network } = useContext(WalletContext);
  const [contractAddress, setContractAddress] = useState('');
  const [contractMetadata, setContractMetadata] = useState(null);
  const [contractVersion, setContractVersion] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const snack = (m, s = 'info') => setSnackbar({ open: true, message: m, severity: s });
  const closeSnack = () => setSnackbar((p) => ({ ...p, open: false }));

  const [origContracts, setOrigContracts] = useState([]);
  const [origLoading, setOrigLoading] = useState(true);
  const [origIdx, setOrigIdx] = useState(0);
  useEffect(() => {
    if (origContracts.length && origIdx >= origContracts.length) setOrigIdx(0);
  }, [origContracts.length, origIdx]);

  const [collabContracts, setCollabContracts] = useState([]);
  const [collabLoading, setCollabLoading] = useState(true);
  const [collabIdx, setCollabIdx] = useState(0);
  useEffect(() => {
    if (collabContracts.length && collabIdx >= collabContracts.length) setCollabIdx(0);
  }, [collabContracts.length, collabIdx]);

  const abortRef = useRef(null);
  const scan = useCallback(async () => {
    if (!isWalletConnected) {
      setOrigLoading(false);
      setCollabLoading(false);
      return;
    }
    setOrigLoading(true);
    setCollabLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const [cr, col] = await Promise.all([
        _fetchCreatedContracts({ walletAddress, network }),
        _fetchCollaborativeContracts({ walletAddress, network }),
      ]);
      const [oList, cList] = await Promise.all([
        _fetchDetails(cr, network, abortRef.current.signal),
        _fetchDetails(col, network, abortRef.current.signal),
      ]);
      setOrigContracts(oList);
      setCollabContracts(cList);
    } catch {}
    finally {
      setOrigLoading(false);
      setCollabLoading(false);
    }
  }, [isWalletConnected, walletAddress, network]);

  useEffect(() => {
    scan();
    window.addEventListener('focus', scan);
    return () => {
      window.removeEventListener('focus', scan);
      abortRef.current?.abort();
    };
  }, [scan]);

  const chooseOrigin = () => {
    const c = origContracts[origIdx];
    if (!c) return;
    setContractAddress(c.address);
    setContractMetadata({ name: c.name, description: c.description, imageUri: c.imageUri });
    setContractVersion(c.version);
    snack('Originated contract loaded', 'success');
  };
  const chooseCollab = () => {
    const c = collabContracts[collabIdx];
    if (!c) return;
    setContractAddress(c.address);
    setContractMetadata({ name: c.name, description: c.description, imageUri: c.imageUri });
    setContractVersion(c.version);
    snack('Collaborative contract loaded', 'info');
  };
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
        const ptr = typeof ptrRaw === 'string' ? ptrRaw : Buffer.from(ptrRaw.bytes, 'hex').toString('utf8');
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
      
      {/* Originated Carousel */}
      <Typography variant="h6" sx={{ mt: 3 }}>My Originated Contracts</Typography>
      {origLoading ? (
        <LoadingGraphic>
          <Typography variant="body1" gutterBottom>
            Loading your originated contracts, please wait...
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Skeleton variant="rectangular" width={180} height={200} />
            <Skeleton variant="rectangular" width={180} height={200} />
            <Skeleton variant="rectangular" width={180} height={200} />
          </Stack>
        </LoadingGraphic>
      ) : origContracts.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          No originated contracts found.
        </Typography>
      ) : (
        <Box sx={{ display:'flex',alignItems:'center',maxWidth:700,mx:'auto' }}>
          <IconButton onClick={()=>setOrigIdx(p=>p? p-1: origContracts.length-1)}>
            <ChevronLeftIcon/>
          </IconButton>
          <Card sx={{ flexGrow:1,mx:1,minHeight:240,display:'flex',flexDirection:'column'}}>
            {origContracts[origIdx].imageUri?(
              <CardMedia
                component="img"
                image={origContracts[origIdx].imageUri}
                alt={origContracts[origIdx].name}
                sx={{ height:120,objectFit:'contain' }}
              />
            ):(
              <Box sx={{ height:120,bgcolor:'#eee' }}/>
            )}
            <CardContent sx={{ flexGrow:1 }}>
              <Typography variant="subtitle1" gutterBottom noWrap>
                {origContracts[origIdx].name}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ display:'block',wordBreak:'break-all' }}>
                {origContracts[origIdx].address}
              </Typography>
              {Number.isFinite(origContracts[origIdx].total) && (
                <Typography variant="caption" color="textSecondary" sx={{ display:'block',mt:0.5 }}>
                  {origContracts[origIdx].total} tokens
                </Typography>
              )}
            </CardContent>
          </Card>
          <IconButton onClick={()=>setOrigIdx(p=>(p+1)%origContracts.length)}>
            <ChevronRightIcon/>
          </IconButton>
        </Box>
      )}
      {!!origContracts.length && (
        <Box sx={{ textAlign:'center',mt:1 }}>
          <Button variant="contained" color="primary" onClick={chooseOrigin}>
            Select Originated
          </Button>
        </Box>
      )}

      {/* Collaborative Carousel */}
      <Typography variant="h6" sx={{ mt:4 }}>My Collaborative Contracts</Typography>
      {collabLoading ? (
        <LoadingGraphic>
          <Typography variant="body1" gutterBottom>
            Loading your collaborative contracts, please wait...
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Skeleton variant="rectangular" width={180} height={200}/>
            <Skeleton variant="rectangular" width={180} height={200}/>
            <Skeleton variant="rectangular" width={180} height={200}/>
          </Stack>
        </LoadingGraphic>
      ) : collabContracts.length===0?(
        <Typography variant="body2" color="textSecondary">
          No collaborative contracts found.
        </Typography>
      ) : (
        <Box sx={{ display:'flex',alignItems:'center',maxWidth:700,mx:'auto' }}>
          <IconButton onClick={()=>setCollabIdx(p=>p? p-1: collabContracts.length-1)}>
            <ChevronLeftIcon/>
          </IconButton>
          <Card sx={{ flexGrow:1,mx:1,minHeight:240,display:'flex',flexDirection:'column'}}>
            {collabContracts[collabIdx].imageUri?(
              <CardMedia
                component="img"
                image={collabContracts[collabIdx].imageUri}
                alt={collabContracts[collabIdx].name}
                sx={{ height:120,objectFit:'contain' }}
              />
            ):(
              <Box sx={{ height:120,bgcolor:'#eee' }}/>
            )}
            <CardContent sx={{ flexGrow:1 }}>
              <Typography variant="subtitle1" gutterBottom noWrap>
                {collabContracts[collabIdx].name}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ display:'block',wordBreak:'break-all' }}>
                {collabContracts[collabIdx].address}
              </Typography>
              {Number.isFinite(collabContracts[collabIdx].total) && (
                <Typography variant="caption" color="textSecondary" sx={{ display:'block',mt:0.5 }}>
                  {collabContracts[collabIdx].total} tokens
                </Typography>
              )}
            </CardContent>
          </Card>
          <IconButton onClick={()=>setCollabIdx(p=>(p+1)%collabContracts.length)}>
            <ChevronRightIcon/>
          </IconButton>
        </Box>
      )}
      {!!collabContracts.length && (
        <Box sx={{ textAlign:'center',mt:1 }}>
          <Button variant="outlined" color="info" onClick={chooseCollab}>
            Select Collaborative
          </Button>
        </Box>
      )}

      {/* Manual Load Form */}
      <Grid container spacing={2} sx={{ mt:4 }}>
        <Grid size={12}>
          <TextField
            label="Contract Address *"
            fullWidth
            value={contractAddress}
            onChange={e=>setContractAddress(e.target.value)}
            placeholder="KT1..."
            sx={{ mb:2 }}
          />
        </Grid>
        <Grid size={12}>
          <Button
            variant="contained"
            onClick={loadManual}
            disabled={loading}
            startIcon={loading? <CircularProgress size={20}/> :null}
            fullWidth
          >
            {loading?'Loading…':'Load Contract'}
          </Button>
        </Grid>
      </Grid>

      {/* Metadata & Actions */}
      {contractMetadata && (
        <>
          <Grid container spacing={2} sx={{ mt: 4 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6">
                {contractMetadata.name}
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
              <Typography variant="body2">
                {contractMetadata.description}
              </Typography>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid size={12}>
              <Stack direction="column" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={() => handleAction('mint')}
                  sx={{ width: '60%', maxWidth: 300 }}
                >
                  MINT
                </Button>
                <Typography variant="body2" align="center">
                  Mint a single edition.
                </Typography>

                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  onClick={() => handleAction('burn')}
                  sx={{ width: '60%', maxWidth: 300 }}
                >
                  BURN
                </Button>
                <Typography variant="body2" align="center">
                  Burn a single edition.
                </Typography>

                <Button
                  variant="contained"
                  color="warning"
                  size="large"
                  onClick={() => handleAction('transfer')}
                  sx={{ width: '60%', maxWidth: 300 }}
                >
                  TRANSFER
                </Button>
                <Typography variant="body2" align="center">
                  Transfer NFTs from one address to another.
                </Typography>

                <Button
                  variant="contained"
                  color="info"
                  size="large"
                  onClick={() => handleAction('balance_of')}
                  sx={{ width: '60%', maxWidth: 300 }}
                >
                  BALANCE OF
                </Button>
                <Typography variant="body2" align="center">
                  Check any wallet’s balance.
                </Typography>

                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => handleAction('update_operators')}
                  sx={{ width: '60%', maxWidth: 300 }}
                >
                  UPDATE OPERATORS
                </Button>
                <Typography variant="body2" align="center">
                  Grant or revoke operator permissions.
                </Typography>

                {/* v3 Parent / Child Controls */}
                {(contractVersion === 'v3' || contractVersion.startsWith('v2')) && (
                  <>
                    <Button
                      variant="outlined"
                      color="info"
                      size="large"
                      onClick={() => handleAction('add_parent')}
                      sx={{ width: '60%', maxWidth: 300, mt: 2 }}
                    >
                      ADD PARENT
                    </Button>
                    <Typography variant="body2" align="center">
                      Comma‑separate parent addresses.
                    </Typography>

                    <Button
                      variant="contained"
                      color="secondary"
                      size="large"
                      onClick={() => handleAction('remove_parent')}
                      sx={{ width: '60%', maxWidth: 300 }}
                    >
                      REMOVE PARENT
                    </Button>
                    <Typography variant="body2" align="center">
                      Comma‑separate parent addresses.
                    </Typography>

                    <Button
                      variant="outlined"
                      color="info"
                      size="large"
                      onClick={() => handleAction('add_child')}
                      sx={{ width: '60%', maxWidth: 300, mt: 2 }}
                    >
                      ADD CHILD
                    </Button>
                    <Typography variant="body2" align="center">
                      Comma‑separate child addresses.
                    </Typography>

                    <Button
                      variant="contained"
                      color="secondary"
                      size="large"
                      onClick={() => handleAction('remove_child')}
                      sx={{ width: '60%', maxWidth: 300 }}
                    >
                      REMOVE CHILD
                    </Button>
                    <Typography variant="body2" align="center">
                      Comma‑separate child addresses.
                    </Typography>
                  </>
                )}

                {/* Existing Parent/Child relationships viewer (v2+ and v3) */}
                {(contractVersion.startsWith('v2') || contractVersion === 'v3') && (
                  <ManageParentChild
                    contractAddress={contractAddress}
                    tezos={tezos}
                    setSnackbar={setSnackbar}
                  />
                )}

                {/* v3 Collaborator Controls */}
                {contractVersion === 'v3' && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={() => handleAction('collaborators')}
                      sx={{ width: '60%', maxWidth: 300, mt: 2 }}
                    >
                      ADD/REMOVE COLLABORATORS
                    </Button>
                    <Typography variant="body2" align="center">
                      Comma‑separate multiple addresses.
                    </Typography>
                    <ManageCollaborators
                      contractAddress={contractAddress}
                      tezos={tezos}
                      setSnackbar={setSnackbar}
                    />
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>

{/* Conditional Forms */}
{action === 'mint' && (
            <Mint
              key={`${contractAddress}-${contractVersion}`}
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
            />
          )}
          {action === 'burn' && (
            <Burn
              key={`${contractAddress}-burn`}
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
            />
          )}
          {action === 'transfer' && (
            <Transfer
              key={`${contractAddress}-transfer`}
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
            />
          )}
          {action === 'balance_of' && (
            <BalanceOf
              key={`${contractAddress}-balance`}
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
            />
          )}
          {action === 'update_operators' && (
            <UpdateOperators
              key={`${contractAddress}-updateop`}
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              contractVersion={contractVersion}
            />
          )}

          {/* Parent/Child Batch Forms */}
          {action === 'add_parent' && (
            <AddRemoveParentChild
              key={`${contractAddress}-add_parent`}
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              actionType="add_parent"
            />
          )}
          {action === 'remove_parent' && (
            <AddRemoveParentChild
              key={`${contractAddress}-remove_parent`}
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              actionType="remove_parent"
            />
          )}
          {action === 'add_child' && (
            <AddRemoveParentChild
              key={`${contractAddress}-add_child`}
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              actionType="add_child"
            />
          )}
          {action === 'remove_child' && (
            <AddRemoveParentChild
              key={`${contractAddress}-remove_child`}
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={setSnackbar}
              actionType="remove_child"
            />
          )}

          {/* Collaborator Batch Form */}
          {action === 'collaborators' && (
            <AddRemoveCollaborator
              key={`${contractAddress}-collab`}
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