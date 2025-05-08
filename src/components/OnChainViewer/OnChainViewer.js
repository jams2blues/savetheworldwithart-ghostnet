/*Developed by @jams2blues with love for the Tezos community
  File: src/components/OnChainViewer/OnChainViewer.js
  Summary: FOC collection viewer — robust burn-filter (supply may stay 1),
           SVG no-gutter, retries, admin-only auto-list, paste-KT1 focus.
*/

/*────────────────── imports ──────────────────*/
import React, {
  useState, useEffect, useContext, useMemo, useRef, useCallback,
} from 'react';
import {
  Box, Grid, Typography, Stack, IconButton, Button, Checkbox,
  FormControlLabel, Dialog, DialogTitle, DialogContent, Skeleton,
  TextField, Snackbar, Alert, Drawer, Divider, Tooltip,
} from '@mui/material';
import BrokenImageIcon  from '@mui/icons-material/BrokenImage';
import ChevronLeftIcon   from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon  from '@mui/icons-material/ChevronRight';
import BugReportIcon     from '@mui/icons-material/BugReport';
import CloseIcon         from '@mui/icons-material/Close';
import { WalletContext } from '../../contexts/WalletContext';

/*────────────────── constants ─────────────────*/
const DEV = process.env.NODE_ENV !== 'production';

const HASHES = {
  ghostnet: { v1:-543526052,v2a:-1889653220,v2b:943737041,v2c:-1513923773,
              v2d:-1835576114,v2e:1529857708,v3:862045731 },
  mainnet : { v1:-543526052,v2a:-1889653220,v2b:943737041,v2c:-1513923773,
              v2d:-1835576114,v2e:1529857708,v3:862045731 },
};
const allowedHashSet = (net) => new Set(Object.values(HASHES[net]));
const VER = {}; Object.entries(HASHES.ghostnet).forEach(([k, v]) => { VER[v] = k.toUpperCase(); });

const TZKT = {
  ghostnet: 'https://api.ghostnet.tzkt.io/v1',
  mainnet : 'https://api.tzkt.io/v1',
};

/* two canonical burn addresses (tz1 & tz1Z…) */
const BURN_ADDRS = [
  'tz1burnburnburnburnburnburnburjAYjjX',
  'tz1ZZZZZZZZZZ7NoGB2xc4V2tqowGwynPXRR',
];

const KT1_RE      = /^KT1[0-9A-Za-z]{33}$/;
const CONCURRENCY = 2;
const RETRIES     = 3;

/*────────────────── helpers ──────────────────*/
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const hex2str = (h) => {
  const s = h.startsWith('0x') ? h.slice(2) : h;
  const b = new Uint8Array(s.length / 2);
  for (let i = 0; i < b.length; i += 1) b[i] = parseInt(s.substr(i * 2, 2), 16);
  return new TextDecoder('utf-8').decode(b);
};
const safe = (s, f) => { try { return JSON.parse(s); } catch { return f; } };
const hasIpfs = (obj) => JSON.stringify(obj).includes('ipfs://');

/* resilient fetch with 429 back-off */
async function fjson(url) {
  for (let i = 0; i < RETRIES; i += 1) {
    const r = await fetch(url).catch(() => null);
    if (r && r.ok) { try { return await r.json(); } catch { return null; } }
    if (r && r.status === 429) await sleep(600 * (i + 1)); else break;
  }
  return null;
}
async function mapLimit(arr, n, fn) {
  const it = arr[Symbol.iterator](); const out = [];
  await Promise.all(Array.from({ length: n }, async () => { for (const v of it) out.push(await fn(v)); }));
  return out;
}

/* media helper functions … unchanged … */
const unwrap = (str)=>{ if(typeof str!=='string')return str;const img=str.match(/<img[^>]+src=["']([^"']+)["']/i);if(img)return img[1];if(str.trim().startsWith('<svg')){try{return`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(str)))}`}catch{return''}}return str};
const blobCache=new Map();
const toURL= (u)=>{if(typeof u!=='string')return u;u=unwrap(u);if(u.startsWith('data:')){if(blobCache.has(u))return blobCache.get(u);if(!u.includes(';base64,'))return u;try{const[meta,b64]=u.split(';base64,');const mime=meta.slice(5);const bin=atob(b64);const buf=Uint8Array.from(bin,c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([buf],{type:mime}));blobCache.set(u,url);return url}catch{return u}}if(/^[A-Za-z0-9+/]+={0,2}$/.test(u)&&u.length%4===0){if(blobCache.has(u))return blobCache.get(u);try{const bin=atob(u);const buf=Uint8Array.from(bin,c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([buf],{type:'application/octet-stream'}));blobCache.set(u,url);return url}catch{}}return u};
const isData   = (u) => typeof u === 'string' && u.startsWith('data:');
const isModel  = (u, m = '') => isData(u) && u.includes('model') || m.includes('model/');
const isVideo  = (u, m = '') => isData(u) && m.startsWith('video/');
const isHTML   = (u, m = '') => isData(u) && m.startsWith('text/html');
const hasVisual= (u) => { u=unwrap(u); return !!u&&(u.startsWith('data:')||u.startsWith('http')||/^[A-Za-z0-9+/]+={0,2}$/.test(u)); };
const pickUri  = (m) => unwrap(m.imageUri || m.artifactUri || m.displayUri || m.thumbnailUri || '');
const fmtRoy   = (r) => { try{const{decimals,shares}=r;return Object.entries(shares).map(([a,v])=>`${(v/10**decimals*100).toFixed(1)}% → ${a}`).join(', ');}catch{return '—';} };
const Broken   = ({msg}) => (<Box sx={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',bgcolor:'action.disabledBackground'}}><BrokenImageIcon fontSize="large"/><Typography variant="caption" sx={{mt:0.5}}>{msg}</Typography></Box>);


/*────────────────── burn helper ───────────────*/
async function burnedIds(addr, base) {
  const sets = await Promise.all(BURN_ADDRS.map(async (b) =>
    await fjson(`${base}/tokens/balances?account=${b}&token.contract=${addr}&balance.gt=0&select=token.tokenId&limit=10000`) || []
  ));
  const out = new Set();
  sets.flat().forEach((id) => out.add(+id));
  return out;
}

/*────────────────── token & contract loaders ──*/
async function loadTokenMetas(addr, base, showBurned) {
  const toks = await fjson(
    `${base}/tokens?contract=${addr}&select=tokenId,metadata,totalSupply&limit=10000`,
  ) || [];

  const burns = showBurned ? new Set() : await burnedIds(addr, base);

  return toks
    .filter((t) => (showBurned || t.totalSupply !== '0') && !burns.has(+t.tokenId))
    .map((t) => {
      const meta = {
        name: t.metadata?.name, description: t.metadata?.description,
        artifactUri: t.metadata?.artifactUri, thumbnailUri: t.metadata?.thumbnailUri,
        mimeType: t.metadata?.mimeType, creators: t.metadata?.creators || [],
        authors: t.metadata?.authors || [], attributes: t.metadata?.attributes || [],
        royalties: t.metadata?.royalties || {}, rights: t.metadata?.rights,
        decimals: +(t.metadata?.decimals || 0),
      };
      return hasIpfs(meta) ? null : { tokenId: +t.tokenId, metadata: meta };
    })
    .filter(Boolean);
}
async function loadContractMeta(addr, base) {
  const s = await fjson(`${base}/contracts/${addr}/storage`);
  if (!s) return { _err: 'storage fetch failed' };
  const md = s.metadata; if (md === undefined) return { _err: 'metadata big-map missing' };
  const keys = await fjson(`${base}/bigmaps/${md}/keys`) || [];
  const map  = Object.fromEntries(keys.map((k) => [k.key, k.value]));
  let ptr = 'content';
  if (!map[ptr] && map['']) {
    const maybe = hex2str(map['']);
    if (maybe.startsWith('tezos-storage:')) ptr = maybe.slice(14);
  }
  return map[ptr] ? safe(hex2str(map[ptr]), {}) : { _err: 'key not found in tezos storage' };
}

/* polyfill model-viewer (unchanged) */
if (typeof window !== 'undefined' && !window.customElements?.get('model-viewer')) {
  const s = document.createElement('script'); s.type='module'; s.async=true; s.crossOrigin='anonymous';
  s.src='https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js'; document.head.appendChild(s);
}


/*────────────────── component ─────────────────*/
export default function OnChainViewer() {
  const {
    walletAddress, isWalletConnected, connectWallet, network = 'ghostnet',
  } = useContext(WalletContext);

  const [showEmpty, setShowEmpty]   = useState(false);
  const [showBurned, setShowBurned] = useState(false);

  const [busy, setBusy]     = useState(false);
  const [cols, setCols]     = useState([]);
  const [sel, setSel]       = useState(null);
  const [dlg, setDlg]       = useState(null);
  const [search, setSearch] = useState('');
  const [toast, setToast]   = useState('');
  const [drawer, setDrawer] = useState(false);

  const trackRef  = useRef(null);
  const unknown   = useRef(new Set());
  const toastSeen = useRef(new Set());

  const badge = (h) => VER[h] || 'UNK';
  const pushToast = (msg) => { if (!toastSeen.current.has(msg)) { toastSeen.current.add(msg); setToast(msg); } };

  /* fetch one contract */
  const fetchContract = useCallback(async (addr, pasted = false) => {
    const base = TZKT[network];
    try {
      const det = await fjson(`${base}/contracts/${addr}`);
      if (!det) throw new Error('tzkt fetch failed');
      if (!allowedHashSet(network).has(det.typeHash)) {
        if (DEV) unknown.current.add(`${addr} → ${det.typeHash}`);
        throw new Error('Unsupported contract type');
      }
      if (!pasted && det.creator?.address?.toLowerCase() !== walletAddress?.toLowerCase()) {
        throw new Error('Not admin');
      }
      const [meta, tokens] = await Promise.all([
        loadContractMeta(addr, base),
        loadTokenMetas(addr, base, showBurned),
      ]);
      if (hasIpfs(meta) || tokens.some((t) => hasIpfs(t.metadata))) throw new Error('IPFS dependency');
      return { addr, version: badge(det.typeHash), meta, tokens };
    } catch (e) {
      if (e.message !== 'Not admin') pushToast(`${addr.slice(0, 10)}… → ${e.message}`);
      return null;
    }
  }, [network, walletAddress, showBurned]);

  /* bootstrap admin collections */
  useEffect(() => {
    if (!walletAddress) { setCols([]); return; }
    (async () => {
      setBusy(true);
      try {
        const base = TZKT[network];
        const list = await fjson(
          `${base}/contracts?creator.eq=${walletAddress}&kind=asset&typeHash.in=${
            [...allowedHashSet(network)].join(',')}&limit=1000`,
        ) || [];
        const res = await mapLimit(list.map((c) => c.address), CONCURRENCY, fetchContract);
        const ok = res.filter(Boolean);
        setCols(ok); setSel(ok[0]?.addr || null);
      } finally { setBusy(false); }
    })();
  }, [walletAddress, network, fetchContract]);

  /* pasted KT1 override */
  useEffect(() => {
    if (KT1_RE.test(search) && !cols.find((c) => c.addr === search) && !busy) {
      (async () => {
        setBusy(true);
        const one = await fetchContract(search, true);
        if (one) { setCols((c) => [...c, one]); setSel(one.addr); }
        setBusy(false);
      })();
    }
  }, [search, cols, busy, fetchContract]);

  /* scroll card into view when sel changes */
  useEffect(() => {
    const el = trackRef.current?.querySelector(`[data-addr="${sel}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [sel]);

  /* filters */
  const filtered = useMemo(() => {
    let l = cols;
    if (!showEmpty) l = l.filter((c) => c.tokens.length > 0);
    if (!search || KT1_RE.test(search)) return l;
    const q = search.toLowerCase();
    return l.filter(
      (c) => c.meta.name?.toLowerCase().includes(q) || c.addr.toLowerCase().includes(q),
    );
  }, [cols, search, showEmpty]);

  useEffect(() => {
    if (filtered.length && !filtered.find((c) => c.addr === sel)) setSel(filtered[0].addr);
  }, [filtered, sel]);

  const selCol = useMemo(() => cols.find((c) => c.addr === sel) || null, [cols, sel]);
  const tokens = selCol?.tokens || [];

  const canScroll = filtered.length * 280 + (filtered.length - 1) * 16 > (trackRef.current?.clientWidth || 0);

  const scroll = (dir) => { trackRef.current?.scrollBy({ left: dir * trackRef.current.clientWidth, behavior: 'smooth' }); };

  /*────────────────── render ─────────────────*/
  return (
    <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>My Fully-On-Chain Collections</Typography>

      {DEV && (
        <Tooltip title="developer console"><IconButton onClick={() => setDrawer(true)} size="small"
          sx={{ position: 'absolute', top: 12, right: 12 }}><BugReportIcon fontSize="small" /></IconButton></Tooltip>
      )}

      {!isWalletConnected ? (
        <Stack spacing={2} alignItems="center">
          <Typography>Connect your wallet to explore.</Typography>
          <Button variant="contained" onClick={connectWallet}>Connect</Button>
        </Stack>
      ) : (
        <>
          {/* search + toggles */}
          <Box sx={{ my: 2, maxWidth: 520, mx: 'auto' }}>
            <TextField fullWidth size="small" placeholder="Search by collection name or paste KT1…"
              value={search} onChange={(e) => setSearch(e.target.value.trim())} />
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 1 }}>
              <FormControlLabel control={<Checkbox checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />}
                label="display token-less" />
              <FormControlLabel control={<Checkbox checked={showBurned} onChange={(e) => setShowBurned(e.target.checked)} />}
                label="display burned" />
            </Stack>
          </Box>

          {/* carousel */}
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Collections</Typography>
          <Box sx={{ position: 'relative', minHeight: 250 }}>
            {canScroll && (
              <IconButton onClick={() => scroll(-1)} sx={{
                position: 'absolute', left: -16, top: '40%', zIndex: 2, width: 48, height: 48,
                bgcolor: 'secondary.main', color: 'background.paper', border: '2px solid',
                borderColor: 'primary.main', '&:hover': { bgcolor: 'secondary.light' },
              }}><ChevronLeftIcon /></IconButton>
            )}

            <Box ref={trackRef} sx={{
              mx: canScroll ? '64px' : 0, display: 'flex', gap: 2, overflowX: 'auto', scrollSnapType: 'x mandatory',
              '&::-webkit-scrollbar': { height: 6 }, '& > *': { flex: '0 0 auto', scrollSnapAlign: 'center' },
            }}>
              {busy && [...Array(3)].map((_, i) => <Skeleton key={i} variant="rectangular" width={280} height={210} />)}

              {!busy && filtered.length === 0 && <Typography sx={{ my: 6, mx: 'auto' }}>Nothing matches.</Typography>}

              {filtered.map((c) => {
                const uri = pickUri(c.meta); const ok = hasVisual(uri);
                return (
                  <Box key={c.addr} data-addr={c.addr} onClick={() => setSel(c.addr)} sx={{
                    width: 280, height: 240, border: '2px solid',
                    borderColor: sel === c.addr ? 'secondary.main' : 'divider',
                    borderRadius: 2, p: 1, cursor: 'pointer',
                    bgcolor: sel === c.addr ? 'action.selected' : 'background.paper',
                    '&:hover': { boxShadow: 3 }, display: 'flex', flexDirection: 'column', position: 'relative',
                  }}>
                    <Box sx={{ position: 'absolute', top: 4, left: 4, bgcolor: 'primary.main',
                      color: 'background.paper', px: 0.5, borderRadius: 1,
                      fontSize: '0.7rem', lineHeight: 1 }}>{c.version}</Box>
                    {ok
                      ? (isModel(uri)
                        ? <model-viewer src={toURL(uri)} camera-controls style={{ width: '100%', height: 140 }} />
                        : <Box component="img" src={toURL(uri)} alt={c.meta.name}
                            sx={{ width: '100%', height: 140, objectFit: 'contain', bgcolor: '#111' }} />)
                      : <Broken msg={c.meta._err || 'no preview'} />}
                    <Typography variant="subtitle2" noWrap mt={1}>{c.meta.name || 'Untitled'}</Typography>
                    <Typography variant="caption" sx={{ wordBreak: 'break-all', fontSize: '0.7rem', lineHeight: 1.2 }}>
                      {c.addr}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{c.tokens.length} token{c.tokens.length === 1 ? '' : 's'}</Typography>
                  </Box>
                );
              })}
            </Box>

            {canScroll && (
              <IconButton onClick={() => scroll(1)} sx={{
                position: 'absolute', right: -16, top: '40%', zIndex: 2, width: 48, height: 48,
                bgcolor: 'secondary.main', color: 'background.paper', border: '2px solid',
                borderColor: 'primary.main', '&:hover': { bgcolor: 'secondary.light' },
              }}><ChevronRightIcon /></IconButton>
            )}
          </Box>
        </>
      )}

      {/* tokens grid */}
      {tokens.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Tokens in {sel}</Typography>
          <Grid container spacing={2} justifyContent="center" sx={{ width: '100%' }}>
            {tokens.map((t) => {
              const uri = pickUri(t.metadata); const ok = hasVisual(uri);
              return (
                <Grid key={t.tokenId} size={{ xs: 12, sm: 6, md: 4 }}
                  onClick={() => setDlg({
                    metadata: t.metadata, version: selCol?.version || 'UNK',
                    tokenId: t.tokenId, rawUri: uri, blobUri: toURL(uri),
                  })}
                  sx={{ border: '1px solid', borderRadius: 1, p: 1, cursor: 'pointer', '&:hover': { boxShadow: 3 } }}>
                  {ok
                    ? (isModel(uri)
                      ? <model-viewer src={toURL(uri)} camera-controls style={{ width: '100%', height: 140 }} />
                      : <Box component="img" src={toURL(uri)} alt={t.metadata.name}
                          sx={{ width: '100%', height: 140, objectFit: 'contain', bgcolor: '#111' }} />)
                    : <Broken msg="no preview" />}
                  <Typography variant="caption" noWrap>{t.metadata.name || `#${t.tokenId}`}</Typography>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* token popup */}
      <Dialog open={!!dlg} onClose={() => setDlg(null)} maxWidth="md" fullWidth>
        {dlg && (
          <>
            <DialogTitle sx={{ pr: 6 }}>
              {dlg.metadata.name}
              <IconButton onClick={() => setDlg(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers>
              <Grid container spacing={2}>
                {/* ─── media preview ─── */}
                <Grid size={{ xs: 12, md: 6 }}>
                  {(() => {
                    const raw = dlg.rawUri;
                    if (!hasVisual(raw)) return <Broken msg="no media" />;
                    const blob = dlg.blobUri;

                    if (isModel(raw))
                      return <model-viewer src={blob} camera-controls auto-rotate ar style={{ width: '100%', height: 300 }} />;

                    /* SVG branch fills container (no letterboxing) */
                    if (raw.startsWith('data:image/svg+xml'))
                      return (
                        <Box sx={{
                          width: '100%', height: 300, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', bgcolor: '#111',
                        }}>
                          <Box component="object"
                            data={raw}
                            type="image/svg+xml"
                            sandbox="allow-scripts allow-same-origin"
                            sx={{ maxWidth: '100%', maxHeight: '100%' }} />
                        </Box>
                      );

                    if (isHTML(raw))
                      return <Box component="iframe" src={blob} title="HTML" sx={{ width: '100%', height: 300, border: 0 }} />;

                    if (isVideo(raw))
                      return <Box component="video" src={blob} controls sx={{ width: '100%', height: 300 }} />;

                    return (
                      <Box component="img" src={blob} alt={dlg.metadata.name}
                        sx={{ width: '100%', height: 300, objectFit: 'contain' }} />
                    );
                  })()}
                </Grid>

                {/* ─── metadata panel ─── */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: 'left' }}>
                  <Typography><strong>Token ID:</strong> {dlg.tokenId}</Typography>
                  <Typography><strong>Description:</strong> {dlg.metadata.description || '—'}</Typography>

                  <Typography>
                    <strong>Creators:</strong>{' '}
                    {[]
                      .concat(dlg.metadata.creators || [])
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </Typography>
                  <Typography>
                    <strong>Authors:</strong>{' '}
                    {[]
                      .concat(dlg.metadata.authors || [])
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </Typography>
                  <Typography>
                    <strong>Royalties:</strong>{' '}
                    {typeof dlg.metadata.royalties === 'object'
                      ? fmtRoy(dlg.metadata.royalties)
                      : '—'}
                  </Typography>

                  <Typography><strong>License:</strong> {dlg.metadata.rights || '—'}</Typography>
                  <Typography sx={{ mt: 1 }}><strong>Contract Version:</strong> {dlg.version}</Typography>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>


      {/* toast */}
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast('')}>
        <Alert severity="warning" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>

      {/* dev drawer */}
      {DEV && (
        <Drawer anchor="right" open={drawer} onClose={() => setDrawer(false)}>
          <Box sx={{ width: 320, p: 2 }}>
            <Typography variant="h6">Unknown type-hashes</Typography>
            <Divider sx={{ my: 1 }} />
            {[...unknown.current].length === 0
              ? <Typography>No unsupported contracts encountered.</Typography>
              : <Box component="ul" sx={{ pl: 2 }}>{[...unknown.current]
                  .map((u) => <li key={u}><Typography variant="caption">{u}</Typography></li>)}</Box>}
          </Box>
        </Drawer>
      )}
    </Box>
  );
}

/*──────────────────────── EOF ─────────────────────*/