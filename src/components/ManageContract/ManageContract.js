/*Developed by @jams2blues with love for the Tezos community
  File: src/components/ManageContract/ManageContract.js
  Summary: Contract dashboard — unified snackbar keys (message + severity)
           so all child components and local helpers share one format.
*/

/* ─── imports ───────────────────────────────────────────────────── */
import React, {
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import styled                         from '@emotion/styled';
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
  Divider,
} from '@mui/material';
import { Buffer }                    from 'buffer';
import { WalletContext }             from '../../contexts/WalletContext';
import ContractCarousels, { HASHES } from './ContractCarousels';
import Mint                  from './Mint';
import Burn                  from './Burn';
import Transfer              from './Transfer';
import BalanceOf             from './BalanceOf';
import UpdateOperators       from './UpdateOperators';
import AddRemoveParentChild  from './AddRemoveParentChild';
import AddRemoveCollaborator from './AddRemoveCollaborator';
import ManageParentChild     from './ManageParentChild';
import ManageCollaborators   from './ManageCollaborators';

/* ─── utility hook: inject <model-viewer> once on client ─────────── */
const useModelViewer = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.customElements.get('model-viewer')) return;
    const script = document.createElement('script');
    script.type  = 'module';
    script.src   = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    document.head.appendChild(script);
  }, []);
};

/* ─── styled shells ─────────────────────────────────────────────── */
const StyledPaper = styled(Paper)`
  padding: 20px;
  margin: 20px auto;
  max-width: 920px;
  width: 95%;
  box-sizing: border-box;
`;
const Disclaimer = styled('div')(({ theme }) => ({
  marginTop: 20,
  padding: 10,
  backgroundColor:
    theme.palette.mode === 'dark' ? theme.palette.secondary.dark : '#ffe1fc',
  color:
    theme.palette.mode === 'dark'
      ? theme.palette.getContrastText(theme.palette.warning.dark)
      : theme.palette.text.primary,
  borderLeft: `6px solid ${theme.palette.warning.main}`,
  boxSizing: 'border-box',
}));

/* ─── helpers ───────────────────────────────────────────────────── */
const TZKT_BASE = {
  ghostnet: 'https://api.ghostnet.tzkt.io/v1',
  mainnet : 'https://api.tzkt.io/v1',
};
const hex2str = (h) => Buffer.from(h.replace(/^0x/, ''), 'hex').toString('utf8');
const parseHexJSON = (hex) => {
  try { return JSON.parse(hex2str(hex)); } catch { return {}; }
};
const isModelUri = (u = '') =>
  u.startsWith('data:model') || /\.(glb|gltf)(\?|$)/i.test(u);

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

async function fetchMetadata(addr, network, tezos) {
  const base = TZKT_BASE[network];
  const det  = await fetchJSON(`${base}/contracts/${addr}`);
  let meta   = det.metadata || {};
  if (!meta.name || !meta.imageUri || !meta.description) {
    const bm = await fetchJSON(
      `${base}/contracts/${addr}/bigmaps/metadata/keys/content`,
    ).catch(() => null);
    if (bm?.value) meta = { ...parseHexJSON(bm.value), ...meta };
  }
  if (!meta.name && tezos) {
    try {
      const c  = await tezos.contract.at(addr);
      const s  = await c.storage();
      const ptr = await s.metadata.get('');
      const key = (typeof ptr === 'string'
        ? ptr
        : Buffer.from(ptr.bytes, 'hex').toString('utf8')).replace('tezos-storage:', '');
      const val = await s.metadata.get(key);
      meta = { ...JSON.parse(
        typeof val === 'string'
          ? val
          : Buffer.from(val.bytes, 'hex').toString('utf8')
      ), ...meta };
    } catch {/* ignore */}
  }
  const version =
    Object.entries(HASHES[network]).find(([, h]) => h === det.typeHash)?.[0] ||
    'v?';
  return { meta, version: version.toUpperCase() };
}

/* fetch counts for parents, children, collaborators */
const getCounts = async (addr, network) => {
  const base = TZKT_BASE[network];
  const storage = await fetchJSON(`${base}/contracts/${addr}/storage`).catch(()=>null);
  let parents=0, children=0, collabs=0;
  if (storage) {
    if (Array.isArray(storage.parents))   parents   = storage.parents.length;
    if (Array.isArray(storage.children))  children  = storage.children.length;
    if (Array.isArray(storage.collaborators)) collabs = storage.collaborators.length;
    /* common alt-keys */
    if (storage.parent_tokens)   parents  = storage.parent_tokens.length ?? parents;
    if (storage.child_tokens)    children = storage.child_tokens.length ?? children;
  }
  return { parents, children, collabs };
};

/* ─── Parent-/-Child hub (single pop-out) ──────────────────────── */
const ParentChildHub = ({ contractAddress, tezos, setSnackbar }) => {
  const [subAction, setSubAction] = useState('');
  const click = (a) => setSubAction(a === subAction ? '' : a);
  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center">
        <Button variant="outlined" onClick={() => click('add_parent')}>Add Parent</Button>
        <Button variant="outlined" onClick={() => click('remove_parent')}>Remove Parent</Button>
        <Button variant="outlined" onClick={() => click('add_child')}>Add Child</Button>
        <Button variant="outlined" onClick={() => click('remove_child')}>Remove Child</Button>
      </Stack>
      {!!subAction && (
        <AddRemoveParentChild
          key={subAction}
          contractAddress={contractAddress}
          tezos={tezos}
          setSnackbar={setSnackbar}
          actionType={subAction}
        />
      )}
    </Box>
  );
};

/* ─── main component ────────────────────────────────────────────── */
const ManageContract = () => {
  useModelViewer();
  const { tezos, network } = useContext(WalletContext);

  /* basic state */
  const [contractAddress,  setContractAddress]  = useState('');
  const [contractMetadata, setContractMetadata] = useState(null);
  const [contractVersion,  setContractVersion]  = useState('');
  const [loading,          setLoading]          = useState(false);
  const [action,           setAction]           = useState('');
  const [counts,           setCounts]           = useState({ parents:0, children:0, collabs:0 });

  /* snackbar (shared by local helpers & children) */
  const [snackState, setSnackState] = useState({
    open:false,
    message:'',
    severity:'info',
  });

  /* helper to accept BOTH legacy object style and (msg,sev) style */
  const showSnack = useCallback((arg1, arg2='info') => {
    if (typeof arg1 === 'object' && arg1 !== null) {
      /* legacy call: { open:true, message:'text', severity:'error' } */
      const { open=true, message='', severity='info' } = arg1;
      setSnackState({ open, message, severity });
    } else {
      /* new style: (message, severity) */
      setSnackState({ open:true, message:arg1, severity:arg2 });
    }
    /* slight blur to remove stuck focus on buttons */
    setTimeout(() => document.activeElement?.blur(), 10);
  }, []);

  const closeSnack = () => setSnackState(p=>({ ...p, open:false }));

  /* counts refresh */
  const updateCounts = useCallback(async (addr) => {
    if (!addr) return setCounts({ parents:0, children:0, collabs:0 });
    try { setCounts(await getCounts(addr, network)); }
    catch { setCounts({ parents:0, children:0, collabs:0 }); }
  }, [network]);

  /* carousel select */
  const handleSelect = ({ address, meta, version }) => {
    setContractAddress(address);
    setContractMetadata(meta);
    setContractVersion(version);
    setAction('');
    showSnack('Contract loaded','success');
    updateCounts(address);
  };

  /* manual loader */
  const loadManual = async () => {
    if (!contractAddress) return showSnack('Enter a contract address','warning');
    setLoading(true);
    try {
      const { meta, version } = await fetchMetadata(contractAddress, network, tezos);
      setContractMetadata(meta);
      setContractVersion(version);
      setAction('');
      showSnack('Metadata loaded','success');
      updateCounts(contractAddress);
    } catch (e) {
      setContractMetadata(null);
      setContractVersion('');
      showSnack(e.message||'Load failed','error');
    } finally { setLoading(false); }
  };

  /* ─── render ─────────────────────────────────────────── */
  return (
    <StyledPaper elevation={3}>
      <Typography variant="h5" gutterBottom>
        Manage Your Zero Contracts
      </Typography>
      <Disclaimer>
        <Typography variant="body2">
          <strong>Disclaimer:</strong> Use at your own risk. You are on {network}.
        </Typography>
      </Disclaimer>

      <ContractCarousels onSelect={handleSelect} />

      {/* manual KT1 loader */}
      <Grid container spacing={2} sx={{ mt: 4 }}>
        <Grid size={12}>
          <TextField
            label="Contract Address *"
            fullWidth
            value={contractAddress}
            onChange={(e)=>setContractAddress(e.target.value.trim())}
            placeholder="KT1…"
            sx={{ mb: 2 }}
          />
        </Grid>
        <Grid size={12}>
          <Button
            variant="contained"
            onClick={loadManual}
            disabled={loading}
            startIcon={loading? <CircularProgress size={20}/> : null}
            fullWidth
          >
            {loading? 'Loading…':'Load Contract'}
          </Button>
        </Grid>
      </Grid>

      {/* summary + actions */}
      {contractMetadata && (
        <>
          {/* summary */}
          <Grid container spacing={2} sx={{ mt:4 }}>
            <Grid size={{ xs:12, md:6 }}>
              <Typography variant="h6">
                {contractMetadata.name}{' '}
                {contractVersion && (
                  <Typography component="span" variant="caption">
                    ({contractVersion})
                  </Typography>
                )}
              </Typography>
              {contractMetadata.imageUri && (() =>{
                const uri = contractMetadata.imageUri;
                return isModelUri(uri)? (
                  // @ts-ignore
                  <model-viewer src={uri} camera-controls auto-rotate
                    style={{
                      width:'100%',height:200,marginTop:8,
                      background:'#f5f5f5',borderRadius:8,
                    }} />
                ):(
                  <Box component="img" src={uri} alt="Thumbnail"
                    sx={{
                      width:'100%',maxHeight:200,mt:1,objectFit:'contain',
                      bgcolor:'#f5f5f5',borderRadius:2,
                    }}/>
                );
              })()}
            </Grid>
            <Grid size={{ xs:12, md:6 }}>
              <Typography variant="body2">
                {contractMetadata.description}
              </Typography>
            </Grid>
          </Grid>

          {/* primary actions row */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center" sx={{ mt:4 }}>
            <Button variant="contained" color="success" onClick={()=>setAction('mint')}>Mint</Button>
            <Button variant="contained" color="error"   onClick={()=>setAction('burn')}>Burn</Button>
            <Button variant="contained" color="warning" onClick={()=>setAction('transfer')}>Transfer</Button>
            <Button variant="contained" color="info"    onClick={()=>setAction('balance_of')}>Balance Of</Button>
            <Button variant="contained"                 onClick={()=>setAction('update_operators')}>Update Operators</Button>
          </Stack>

          {/* secondary actions (fixed) */}
          {(contractVersion.startsWith('V2') || contractVersion === 'V3') && (
            <>
              <Divider textAlign="left" sx={{ mt:4, mb:2, color:'text.secondary', fontSize:14 }}>
                Relationships & Permissions
              </Divider>

              {/* management buttons */}
              <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
                <Button variant="outlined" onClick={()=>setAction('parent_child')}>ADD / REMOVE PARENT/CHILD</Button>
                <ManageParentChild
                  contractAddress={contractAddress}
                  tezos={tezos}
                  setSnackbar={showSnack}
                />
              </Stack>
              <Box sx={{ textAlign:'center', mt:0.5 }}>
                <Typography variant="caption" color="textSecondary">
                  Parents: {counts.parents} Children: {counts.children}
                </Typography>
              </Box>

              {contractVersion === 'V3' && (
                <>
                  <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center" sx={{ mt:2 }}>
                    <Button variant="outlined" color="secondary" onClick={()=>setAction('collaborators')}>
                      ADD / REMOVE COLLABORATORS
                    </Button>
                    <ManageCollaborators
                      contractAddress={contractAddress}
                      tezos={tezos}
                      setSnackbar={showSnack}
                    />
                  </Stack>
                  <Box sx={{ textAlign:'center', mt:0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      Collaborators: {counts.collabs}
                    </Typography>
                  </Box>
                </>
              )}
            </>
          )}

          {/* dynamic forms below buttons */}
          {action==='mint' && (
            <Mint key="mint" contractAddress={contractAddress}
              contractVersion={contractVersion.toLowerCase()}
              tezos={tezos} setSnackbar={showSnack}/>
          )}
          {action==='burn' && (
            <Burn key="burn" contractAddress={contractAddress}
              contractVersion={contractVersion.toLowerCase()}
              tezos={tezos} setSnackbar={showSnack}/>
          )}
          {action==='transfer' && (
            <Transfer key="transfer" contractAddress={contractAddress}
              contractVersion={contractVersion.toLowerCase()}
              tezos={tezos} setSnackbar={showSnack}/>
          )}
          {action==='balance_of' && (
            <BalanceOf key="balance" contractAddress={contractAddress}
              tezos={tezos} setSnackbar={showSnack}/>
          )}
          {action==='update_operators' && (
            <UpdateOperators key="update_ops" contractAddress={contractAddress}
              tezos={tezos} setSnackbar={showSnack}/>
          )}

          {action==='parent_child' && (
            <ParentChildHub
              key="pchub"
              contractAddress={contractAddress}
              tezos={tezos}
              setSnackbar={showSnack}
            />
          )}
          {action==='collaborators' && (
            <AddRemoveCollaborator key="collab" contractAddress={contractAddress}
              tezos={tezos} setSnackbar={showSnack}/>
          )}
        </>
      )}

      {/* snackbar */}
      <Snackbar open={snackState.open} autoHideDuration={6000}
        onClose={closeSnack} anchorOrigin={{ vertical:'top', horizontal:'center' }}>
        <Alert onClose={closeSnack} severity={snackState.severity} sx={{ width:'100%' }}>
          {snackState.message}
        </Alert>
      </Snackbar>
    </StyledPaper>
  );
};

export default ManageContract;

/* What changed & why
   • Unified snackbar state keys to {message, severity} — matches the object
     format used by Mint.js and other child components.  
   • `showSnack` helper now accepts *either* legacy object style
     ({open,message,severity}) or simple `(message, severity)` arguments,
     guaranteeing backward compatibility.  
   • Re-wired every child component (`setSnackbar={showSnack}`) so all
     validation errors and success toasts render correct icons & text.  
   • No visual layout or business logic removed. Counts, actions, and
     carousel loading remain exactly as before.  
*/
