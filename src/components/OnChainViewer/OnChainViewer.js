/* Developed by @jams2blues with love for the Tezos community
   File: src/components/3Dviewer/OnChainViewer.js
   Summary: Chronological, complete fully-on-chain 3D collection viewer
            (TzKT-only, zero Beacon calls)
*/

/* ───────── imports ─────────────────────────────────────────────────────── */
import React, {
    useState, useEffect, useContext, useMemo, useRef, useCallback,
  } from 'react';
  import {
    Box, Grid, Typography, Stack, IconButton, Button,
    CircularProgress, Dialog, DialogTitle, DialogContent, Skeleton,
    TextField,
  } from '@mui/material';
  import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
  import ChevronRightIcon from '@mui/icons-material/ChevronRight';
  import CloseIcon        from '@mui/icons-material/Close';
  
  import { WalletContext } from '../../contexts/WalletContext';
  
  /* ───────── constants ───────────────────────────────────────────────────── */
  const TZKT = {
    ghostnet: 'https://api.ghostnet.tzkt.io/v1',
    mainnet : 'https://api.tzkt.io/v1',
  };
  const HASHES = {
    ghostnet: { v1:-543526052, v2a:-1889653220, v2b:943737041, v2c:-1513923773,
                v2d:-1835576114, v2e:1529857708, v3:862045731 },
    mainnet : { v1:-543526052, v2a:-1889653220, v2b:943737041, v2c:-1513923773,
                v2d:-1835576114, v2e:1529857708, v3:862045731 },
  };
  const allowedHashSet = net => new Set(Object.values(HASHES[net]));
  
  /* ─── hex → string helper ──────────────────────────────────────────────── */
  function hex2str(hex) {
    const s = hex.startsWith('0x') ? hex.slice(2) : hex;
    let out = '';
    for (let i = 0; i < s.length; i += 2) {
      out += String.fromCharCode(parseInt(s.substr(i, 2), 16));
    }
    return out;
  }
  
  /* ─── on-chain TZIP-16 metadata loader ─────────────────────────────────── */
  async function loadContractMeta(addr, base) {
    const storage = await fetch(`${base}/contracts/${addr}/storage`).then(r=>r.json());
    const metaMapId = storage.metadata;
    const keys = await fetch(`${base}/bigmaps/${metaMapId}/keys`).then(r=>r.json());
    const blob = keys.find(k => k.key === 'content');
    if (!blob) return null;
    const json = JSON.parse(hex2str(blob.value));
    return {
      name:        json.name,
      description: json.description,
      symbol:      json.symbol,
      imageUri:    json.imageUri,
      authors:     json.authors,
      creators:    json.creators,
      rights:      json.rights || json.license,
    };
  }
  
  /* ─── on-chain TZIP-12 token_metadata loader ───────────────────────────── */
  async function loadTokenMetas(addr, base) {
    const storage = await fetch(`${base}/contracts/${addr}/storage`).then(r=>r.json());
    const tokMapId = storage.token_metadata;
    const entries = await fetch(`${base}/bigmaps/${tokMapId}/keys`).then(r=>r.json());
    return entries.map(e => {
      const info = Object.fromEntries(
        Object.entries(e.value.token_info).map(([k,hex])=>[k, hex2str(hex)])
      );
      return {
        tokenId: parseInt(e.value.token_id, 10),
        metadata: {
          name:         info.name,
          description:  info.description,
          artifactUri:  info.artifactUri,
          creators:     JSON.parse(info.creators  || '[]'),
          authors:      JSON.parse(info.authors   || '[]'),
          attributes:   JSON.parse(info.attributes|| '[]'),
          royalties:    JSON.parse(info.royalties || '{}'),
          rights:       info.rights,
          decimals:     parseInt(info.decimals||'0',10),
        }
      };
    });
  }
  
  /* ─── MIME- and data-URI helpers ──────────────────────────────────────── */
  const isData  = u=> typeof u==='string' && u.startsWith('data:');
  const isModel = (u,m='')=> isData(u)&&(u.includes('model')||m.includes('model/'));
  const isVideo = (u,m='')=> isData(u)&&m.startsWith('video/');
  const isHTML  = (u,m='')=> isData(u)&&m.startsWith('text/html');
  
  const cache = new Map();
  const toURL = uri => {
    if (!isData(uri)||!uri.includes(';base64,')) return uri;
    if (cache.has(uri)) return cache.get(uri);
    try {
      const [meta,b64] = uri.split(';base64,');
      const mime = meta.slice(5);
      const bin  = atob(b64);
      const buf  = new Uint8Array(bin.length);
      for (let i=0;i<bin.length;i++) buf[i]=bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([buf],{type:mime}));
      cache.set(uri,url);
      return url;
    } catch {
      return uri;
    }
  };
  
  /* ─── one-time <model-viewer> injection ───────────────────────────────── */
  if (typeof window!=='undefined' && !window.customElements?.get('model-viewer')) {
    const s=document.createElement('script');
    s.type='module'; s.async=true; s.crossOrigin='anonymous';
    s.src='https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    document.head.appendChild(s);
  }
  
  /* ─── pick first on-chain URI ───────────────────────────────────────────── */
  const pickUri = m => 
         m.imageUri     ? m.imageUri
       : m.artifactUri  ? m.artifactUri
       : m.displayUri   ? m.displayUri
       : m.thumbnailUri ? m.thumbnailUri
       : '';
  
  async function mapLimit(arr,limit,fn){
    const it = arr[Symbol.iterator](), out = [];
    await Promise.all(Array.from({length:limit},async()=>{
      for(const v of it) out.push(await fn(v));
    }));
    return out;
  }
  
  /* ─── format royalties as human % ────────────────────────────────────── */
  function fmtRoyalties(royalties) {
    try {
      const {decimals, shares} = royalties;
      return Object.entries(shares)
        .map(([addr,amt])=>{
          const pct = (amt / Math.pow(10,decimals)) * 100;
          return `${pct.toFixed(1)}% → ${addr}`;
        })
        .join(', ');
    } catch {
      return '—';
    }
  }
  
  /* ───────── component ─────────────────────────────────────────────────── */
  export default function OnChainCollectionsViewer(){
    const { walletAddress, isWalletConnected, connectWallet, network='ghostnet' } =
          useContext(WalletContext);
  
    const [busy,    setBusy]    = useState(false);
    const [cols,    setCols]    = useState([]);     // all collections
    const [sel,     setSel]     = useState(null);   // selected address
    const [dlg,     setDlg]     = useState(null);   // popup
    const [search,  setSearch]  = useState('');     // search term
    const trackRef              = useRef(null);
  
    // 1) fetch all collections
    useEffect(()=>{
      if (!walletAddress) {
        setCols([]);
        return;
      }
      (async()=>{
        setBusy(true);
        try {
          const base = TZKT[network];
          // held + created
          const held = await fetch(
            `${base}/tokens/balances?account=${walletAddress}&balance.gt=0&select=token&limit=10000`
          ).then(r=>r.json());
          const created = await fetch(
            `${base}/contracts?creator.eq=${walletAddress}&kind=asset&typeHash.in=${[...allowedHashSet(network)].join(',')}&limit=1000`
          ).then(r=>r.json());
  
          const addrs = new Set(created.map(c=>c.address));
          held.forEach(t=>addrs.add(t.contract?.address));
  
          const list = await mapLimit([...addrs].filter(Boolean),6,async addr=>{
            try {
              const det = await fetch(`${base}/contracts/${addr}`).then(r=>r.json());
              if (det.typeHash && !allowedHashSet(network).has(det.typeHash)) return null;
              const meta   = await loadContractMeta(addr, base);
              if (!meta) return null;
              const tokens = await loadTokenMetas(addr, base);
              if (!tokens.length) return null;
              return { addr, meta, tokens };
            } catch {
              return null;
            }
          });
          const clean = list.filter(Boolean);
          setCols(clean);
          setSel(p=>p||clean[0]?.addr||null);
        } finally {
          setBusy(false);
        }
      })();
    }, [walletAddress,network]);
  
    // 2) filter by search
    const filtered = useMemo(() => {
      if (!search) return cols;
      return cols.filter(c=>
        c.meta.name?.toLowerCase().includes(search.toLowerCase())
      );
    }, [cols,search]);
  
    // if selection disappears from filter, reset
    useEffect(()=>{
      if (filtered.length && !filtered.find(c=>c.addr===sel)) {
        setSel(filtered[0].addr);
      }
    }, [filtered]);
  
    // 3) tokens in selected
    const tokens = useMemo(()=>{
      const col = cols.find(c=>c.addr===sel);
      return col?.tokens||[];
    }, [cols,sel]);
  
    // 4) carousel page-scrolling
    const scroll = useCallback(dir=>{
      const c = trackRef.current;
      if (!c) return;
      const amount = c.clientWidth;  
      c.scrollBy({ left: dir*amount, behavior:'smooth' });
    }, []);
  
    return (
      <Box sx={{ px:2,py:4,textAlign:'center' }}>
        <Typography variant="h4" gutterBottom>
          View My Fully-On-Chain Collections
        </Typography>
  
        {!isWalletConnected && (
          <Stack spacing={2} alignItems="center">
            <Typography>Connect your wallet to explore.</Typography>
            <Button variant="contained" onClick={connectWallet}>Connect</Button>
          </Stack>
        )}
  
        {isWalletConnected && busy && (
          <CircularProgress sx={{ mt:4 }} />
        )}
  
        {isWalletConnected && (
          <>
            {/* search box */}
            <Box sx={{ my:2, maxWidth:400, mx:'auto' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search collections…"
                value={search}
                onChange={e=>setSearch(e.target.value)}
              />
            </Box>
  
            <Typography variant="h6" sx={{ mt:2, mb:1 }}>Collections</Typography>
            <Box sx={{ position:'relative', minHeight:240 }}>
              <IconButton
                onClick={()=>scroll(-1)}
                sx={{
                  position:'absolute', left:-16, top:'40%', zIndex:2,
                  width:48, height:48,
                  bgcolor:'secondary.main', color:'background.paper',
                  border:'2px solid', borderColor:'primary.main',
                  '&:hover':{ bgcolor:'secondary.light' }
                }}
              >
                <ChevronLeftIcon/>
              </IconButton>
  
              <Box
                ref={trackRef}
                sx={{
                  mx:'64px', display:'flex', gap:2,
                  overflowX:'auto', scrollSnapType:'x mandatory',
                  '&::-webkit-scrollbar':{ height:6, display:'block' },
                  '& > *':{ flex:'0 0 auto', scrollSnapAlign:'center' }
                }}
              >
                {busy && [...Array(3)].map((_,i)=>(
                  <Skeleton key={i} variant="rectangular" width={280} height={200}/>
                ))}
                {!busy && filtered.length===0 && (
                  <Typography sx={{ my:6, mx:'auto' }}>
                    No collections match “{search}.”
                  </Typography>
                )}
                {filtered.map(c=>(
                  <Box
                    key={c.addr}
                    onClick={()=>setSel(c.addr)}
                    sx={{
                      width:280, height:240,
                      border:'2px solid',
                      borderColor: sel===c.addr?'secondary.main':'divider',
                      borderRadius:2, p:1, cursor:'pointer',
                      bgcolor: sel===c.addr?'action.selected':'background.paper',
                      '&:hover':{ boxShadow:3 },
                      display:'flex', flexDirection:'column'
                    }}
                  >
                    {isModel(pickUri(c.meta)) ? (
                      <model-viewer
                        src={toURL(pickUri(c.meta))}
                        camera-controls
                        style={{ width:'100%',height:140 }}
                      />
                    ) : (
                      <Box
                        component="img"
                        src={toURL(pickUri(c.meta))}
                        alt={c.meta.name}
                        sx={{
                          width:'100%', height:140,
                          objectFit:'contain', bgcolor:'#111'
                        }}
                      />
                    )}
                    <Typography
                      variant="subtitle2" noWrap mt={1} flexGrow={1}
                    >
                      {c.meta.name||'Untitled'}
                    </Typography>
                    <Typography
                      variant="caption" sx={{ wordBreak:'break-all' }}
                    >
                      {c.addr}
                    </Typography>
                  </Box>
                ))}
              </Box>
  
              <IconButton
                onClick={()=>scroll(1)}
                sx={{
                  position:'absolute', right:-16, top:'40%', zIndex:2,
                  width:48, height:48,
                  bgcolor:'secondary.main', color:'background.paper',
                  border:'2px solid', borderColor:'primary.main',
                  '&:hover':{ bgcolor:'secondary.light' }
                }}
              >
                <ChevronRightIcon/>
              </IconButton>
            </Box>
          </>
        )}
  
        {/* ───────── tokens grid ─────────────────────────────────────────── */}
        {tokens.length>0 && (
          <>
            <Typography variant="h6" sx={{ mt:4,mb:2 }}>
              Tokens in {sel}
            </Typography>
            <Grid container spacing={2} justifyContent="center" sx={{ width:'100%' }}>
              {tokens.map(t=>(
                <Grid
                  key={t.tokenId}
                  size={{ xs:12, sm:6, md:4 }}
                  onClick={()=>setDlg({
                    metadata: t.metadata,
                    rawUri:    pickUri(t.metadata),
                    blobUri:   toURL(pickUri(t.metadata))
                  })}
                  sx={{
                    border:'1px solid', borderRadius:1, p:1, cursor:'pointer',
                    '&:hover':{ boxShadow:3 }
                  }}
                >
                  {isModel(pickUri(t.metadata)) ? (
                    <model-viewer
                      src={toURL(pickUri(t.metadata))}
                      camera-controls
                      style={{ width:'100%',height:140 }}
                    />
                  ) : (
                    <Box
                      component="img"
                      src={toURL(pickUri(t.metadata))}
                      alt={t.metadata.name}
                      sx={{ width:'100%',height:140, objectFit:'contain', bgcolor:'#111' }}
                    />
                  )}
                  <Typography variant="caption" noWrap>
                    {t.metadata.name||`#${t.tokenId}`}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </>
        )}
  
        {/* ───────── popup ─────────────────────────────────────────────────── */}
        <Dialog open={!!dlg} onClose={()=>setDlg(null)} maxWidth="md" fullWidth>
          {dlg && (
            <>
              <DialogTitle sx={{ pr:6 }}>
                {dlg.metadata.name}
                <IconButton
                  onClick={()=>setDlg(null)}
                  sx={{ position:'absolute', right:8, top:8 }}
                >
                  <CloseIcon/>
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2} sx={{ width:'100%' }}>
                  <Grid size={{ xs:12, md:6 }}>
                    {(() => {
                      const raw = typeof dlg.rawUri==='string' ? dlg.rawUri : '';
                      const blob = dlg.blobUri;
  
                      if (isModel(raw)) {
                        return (
                          <model-viewer
                            src={blob}
                            camera-controls auto-rotate ar
                            style={{ width:'100%', height:300 }}
                          />
                        );
                      }
                      if (raw.startsWith('data:image/svg+xml')) {
                        return (
                          <Box component="object"
                            data={raw}
                            type="image/svg+xml"
                            sandbox="allow-scripts allow-same-origin"
                            sx={{ width:'100%', height:300, border:0 }}
                          />
                        );
                      }
                      return (
                        <Box
                          component="img"
                          src={blob||raw}
                          alt={dlg.metadata.name}
                          sx={{ width:'100%', height:300, objectFit:'contain' }}
                        />
                      );
                    })()}
                  </Grid>
                  <Grid size={{ xs:12, md:6 }} sx={{ textAlign:'left' }}>
                    <Typography>
                      <strong>Description:</strong> {dlg.metadata.description||'—'}
                    </Typography>
                    <Typography>
                      <strong>Creators:</strong> {(dlg.metadata.creators||[]).join(', ')||'—'}
                    </Typography>
                    <Typography>
                      <strong>Authors:</strong> {(dlg.metadata.authors||[]).join(', ')||'—'}
                    </Typography>
                    <Typography>
                      <strong>Royalties:</strong> {fmtRoyalties(dlg.metadata.royalties)}
                    </Typography>
                    <Typography>
                      <strong>License:</strong> {dlg.metadata.rights||'—'}
                    </Typography>
                  </Grid>
                </Grid>
              </DialogContent>
            </>
          )}
        </Dialog>
      </Box>
    );
  }
  