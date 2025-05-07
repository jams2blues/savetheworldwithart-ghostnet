/*Developed by @jams2blues with love for the Tezos community
  File: src/components/OnChainViewer/OnChainViewer.js
  Summary: FOC collection viewer  —  developer-friendly warnings, artist-friendly UX
           • filters unsupported type-hashes silently for users, exposes in “Dev console” drawer
           • resilient safe-JSON wrapper (no more “Unexpected end of JSON input”)
           • deduped toast & log spam
           • guards against 404 self-fetch when refreshing (no internal fetch to /on-chain-viewer)
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
const DEV   = process.env.NODE_ENV !== 'production';
const HASHES = {
  ghostnet: { v1:-543526052,v2a:-1889653220,v2b:943737041,v2c:-1513923773,v2d:-1835576114,v2e:1529857708,v3:862045731 },
  mainnet : { v1:-543526052,v2a:-1889653220,v2b:943737041,v2c:-1513923773,v2d:-1835576114,v2e:1529857708,v3:862045731 },
};
const allowedHashSet = net => new Set(Object.values(HASHES[net]));
const VER = {}; Object.entries(HASHES.ghostnet).forEach(([k,v])=>{VER[v]=k.toUpperCase();});

const TZKT = {
  ghostnet:'https://api.ghostnet.tzkt.io/v1',
  mainnet :'https://api.tzkt.io/v1',
};
const BURN_ADDRS=[
  'tz1burnburnburnburnburnburnburjAYjjX',
  'tz1ZZZZZZZZZZ7NoGB2xc4V2tqowGwynPXRR',
];
const KT1_RE=/^KT1[0-9A-Za-z]{33}$/;

/*────────────────── helpers ───────────────────*/
const hex2str = h=>{
  const s=h.startsWith('0x')?h.slice(2):h;
  const b=new Uint8Array(s.length/2);
  for(let i=0;i<b.length;i++) b[i]=parseInt(s.substr(i*2,2),16);
  return new TextDecoder('utf-8').decode(b);
};
const safe=(s,f)=>{try{return JSON.parse(s);}catch{return f;}};

const unwrap = str=>{
  if(typeof str!=='string') return str;
  const img=str.match(/<img[^>]+src=["']([^"']+)["']/i);
  if(img) return img[1];
  if(str.trim().startsWith('<svg')){
    try{return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(str)))}`;}
    catch{return '';}
  }
  return str;
};

/* blob cache */
const blobCache=new Map();
const toURL=u=>{
  if(typeof u!=='string') return u;
  u=unwrap(u);
  if(u.startsWith('data:')){
    if(blobCache.has(u)) return blobCache.get(u);
    if(!u.includes(';base64,')) return u;
    try{
      const [meta,b64]=u.split(';base64,'); const mime=meta.slice(5);
      const bin=atob(b64); const buf=Uint8Array.from(bin, c=>c.charCodeAt(0));
      const url=URL.createObjectURL(new Blob([buf],{type:mime}));
      blobCache.set(u,url); return url;
    }catch{return u;}
  }
  if(/^[A-Za-z0-9+/]+={0,2}$/.test(u)&&u.length%4===0){
    if(blobCache.has(u)) return blobCache.get(u);
    try{
      const bin=atob(u); const buf=Uint8Array.from(bin,c=>c.charCodeAt(0));
      const url=URL.createObjectURL(new Blob([buf],{type:'application/octet-stream'}));
      blobCache.set(u,url); return url;
    }catch{}
  }
  return u;
};

const isData   = u=>typeof u==='string'&&u.startsWith('data:');
const isModel  = (u,m='')=>isData(u)&&u.includes('model')||m.includes('model/');
const isVideo  = (u,m='')=>isData(u)&&m.startsWith('video/');
const isHTML   = (u,m='')=>isData(u)&&m.startsWith('text/html');
const hasVisual= u=>{u=unwrap(u);
  return !!u&&(u.startsWith('data:')||u.startsWith('http')
    ||/^[A-Za-z0-9+/]+={0,2}$/.test(u));
};

const pickUri = m=>unwrap(m.imageUri||m.artifactUri||m.displayUri||m.thumbnailUri||'');

/* minimal safe fetch-json */
async function fjson(url){
  const r=await fetch(url).catch(()=>null);
  if(!r||!r.ok) return null;
  try{return await r.json();}catch{return null;}
}

async function mapLimit(arr,n,fn){
  const it=arr[Symbol.iterator](); const out=[];
  await Promise.all(Array.from({length:n},async()=>{
    for(const v of it) out.push(await fn(v));
  }));
  return out;
}

const fmtRoy=r=>{
  try{const{decimals,shares}=r;
    return Object.entries(shares)
      .map(([a,v])=>`${(v/10**decimals*100).toFixed(1)}% → ${a}`).join(', ');
  }catch{return '—';}
};

const Broken=({msg})=>(
  <Box sx={{width:'100%',height:'100%',display:'flex',
            flexDirection:'column',alignItems:'center',justifyContent:'center',
            bgcolor:'action.disabledBackground'}}>
    <BrokenImageIcon fontSize="large"/><Typography variant="caption" sx={{mt:0.5}}>{msg}</Typography>
  </Box>
);

/*────────────────── data loaders ──────────────*/
async function burnedIds(addr,base){
  const set=new Set();
  await Promise.all(BURN_ADDRS.map(async b=>{
    const rows=await fjson(
      `${base}/tokens/balances?account=${b}&token.contract=${addr}&balance.gt=0&select=token.tokenId&limit=10000`
    )||[];
    rows.forEach(id=>set.add(+id));
  }));
  return set;
}

async function loadTokenMetas(addr,base,showBurned){
  const s=await fjson(`${base}/contracts/${addr}/storage`); if(!s) return [];
  const id=s.token_metadata??s.tokenMetadata; if(id===undefined) return [];
  const rows=await fjson(`${base}/bigmaps/${id}/keys?limit=10000`)||[];
  const burns=showBurned?new Set():await burnedIds(addr,base);
  return rows.filter(e=>!burns.has(+e.value.token_id)).map(e=>{
    const raw=Object.fromEntries(Object.entries(e.value.token_info)
      .map(([k,h])=>[k,hex2str(h)]));
    return{
      tokenId:+e.value.token_id,
      metadata:{
        name:raw.name,description:raw.description,mimeType:raw.mimeType,
        artifactUri:raw.artifactUri,thumbnailUri:raw.thumbnailUri,
        creators:safe(raw.creators,[]).flat(),authors:safe(raw.authors,[]).flat(),
        attributes:safe(raw.attributes,[]),
        royalties:safe(raw.royalties,{}),rights:raw.rights,decimals:+(raw.decimals||0),
      },
    };
  });
}

async function loadContractMeta(addr,base){
  const s=await fjson(`${base}/contracts/${addr}/storage`);
  if(!s) return{_err:'storage fetch failed'};
  const md=s.metadata;
  if(md===undefined) return{_err:'metadata big-map missing'};
  const keys=await fjson(`${base}/bigmaps/${md}/keys`)||[];
  const map=Object.fromEntries(keys.map(k=>[k.key,k.value]));
  let ptr='content';
  if(!map[ptr]&&map['']){
    const maybe=hex2str(map['']);
    if(maybe.startsWith('tezos-storage:')) ptr=maybe.slice(14);
  }
  if(map[ptr]) return safe(hex2str(map[ptr]),{});
  return{_err:'key not found in tezos storage'};
}

/* polyfill once */
if(typeof window!=='undefined'&&!window.customElements?.get('model-viewer')){
  const s=document.createElement('script');
  s.type='module'; s.async=true; s.crossOrigin='anonymous';
  s.src='https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
  document.head.appendChild(s);
}

/*────────────────── component ─────────────────*/
export default function OnChainViewer(){
  const{walletAddress,isWalletConnected,connectWallet,network='ghostnet'}=
        useContext(WalletContext);

  const[showEmpty,setShowEmpty]=useState(false);
  const[showBurned,setShowBurned]=useState(false);

  const[busy,setBusy]=useState(false);
  const[cols,setCols]=useState([]);
  const[sel,setSel]=useState(null);
  const[dlg,setDlg]=useState(null);
  const[search,setSearch]=useState('');
  const[toast,setToast]=useState('');
  const[drawer,setDrawer]=useState(false);
  const trackRef=useRef(null);
  const devUnknownRef=useRef(new Set());        // accumulate unknown hashes (dev only)
  const toastSeen=useRef(new Set());            // dedupe toasts

  const badge=h=>VER[h]||'UNK';

  const pushToast=msg=>{
    if(toastSeen.current.has(msg)) return;
    toastSeen.current.add(msg);
    setToast(msg);
  };

  const fetchContract=useCallback(async addr=>{
    const base=TZKT[network];
    try{
      const det=await fjson(`${base}/contracts/${addr}`);
      if(!det) throw new Error('tzkt fetch failed');
      if(!allowedHashSet(network).has(det.typeHash)){
        if(DEV){devUnknownRef.current.add(`${addr} → ${det.typeHash}`);}
        throw new Error('Unsupported contract type');
      }
      const[meta,tokens]=await Promise.all([
        loadContractMeta(addr,base),
        loadTokenMetas(addr,base,showBurned).catch(()=>[]),
      ]);
      return{addr,version:badge(det.typeHash),meta,tokens};
    }catch(e){
      DEV?console.warn('fetchContract',addr,e.message):null;
      pushToast(`${addr.slice(0,10)}… → ${e.message}`);
      return null;
    }
  },[network,showBurned]);

  /* pull wallet-related contracts */
  useEffect(()=>{
    if(!walletAddress){setCols([]);return;}
    (async()=>{
      setBusy(true);
      const base=TZKT[network];
      try{
        const held=await fjson(
          `${base}/tokens/balances?account=${walletAddress}&balance.gt=0&select=token&limit=10000`
        )||[];
        const created=await fjson(
          `${base}/contracts?creator.eq=${walletAddress}&kind=asset&typeHash.in=${
            [...allowedHashSet(network)].join(',')}&limit=1000`
        )||[];
        const addrSet=new Set(created.map(c=>c.address));
        held.forEach(t=>addrSet.add(t.contract?.address));
        const list=await mapLimit([...addrSet].filter(Boolean),4,fetchContract);
        const ok=list.filter(Boolean);
        setCols(ok); setSel(ok[0]?.addr||null);
      }finally{setBusy(false);}
    })();
  },[walletAddress,network,fetchContract]);

  /* user-typed KT1 */
  useEffect(()=>{
    if(KT1_RE.test(search)&&!cols.find(c=>c.addr===search)&&!busy){
      (async()=>{setBusy(true);const one=await fetchContract(search);
        if(one) setCols(c=>[...c,one]); setBusy(false);} )();
    }
  },[search,cols,busy,fetchContract]);

  const filtered=useMemo(()=>{
    let l=cols;if(!showEmpty) l=l.filter(c=>c.tokens.length>0);
    if(!search) return l;
    const q=search.toLowerCase();
    return l.filter(c=>c.meta.name?.toLowerCase().includes(q)||c.addr.toLowerCase().includes(q));
  },[cols,search,showEmpty]);

  useEffect(()=>{
    if(filtered.length&&!filtered.find(c=>c.addr===sel)) setSel(filtered[0].addr);
  },[filtered,sel]);

  const selCol=useMemo(()=>cols.find(c=>c.addr===sel)||null,[cols,sel]);
  const tokens=selCol?.tokens||[];

  const scroll=dir=>{
    const c=trackRef.current; if(c) c.scrollBy({left:dir*c.clientWidth,behavior:'smooth'});
  };

  /*────────────────── render ─────────────────*/
  return(
    <Box sx={{px:2,py:4,textAlign:'center'}}>
      <Typography variant="h4" gutterBottom>My Fully-On-Chain Collections</Typography>

      {DEV&&(
        <Tooltip title="developer console"><IconButton onClick={()=>setDrawer(true)} size="small" sx={{position:'absolute',top:12,right:12}}>
          <BugReportIcon fontSize="small"/></IconButton></Tooltip>
      )}

      {!isWalletConnected?(
        <Stack spacing={2} alignItems="center">
          <Typography>Connect your wallet to explore.</Typography>
          <Button variant="contained" onClick={connectWallet}>Connect</Button>
        </Stack>
      ):(
        <>
          {/* search + toggles */}
          <Box sx={{my:2,maxWidth:520,mx:'auto'}}>
            <TextField fullWidth size="small"
              placeholder="Search by collection name or paste KT1…"
              value={search} onChange={e=>setSearch(e.target.value.trim())}/>
            <Stack direction="row" spacing={2} justifyContent="center" sx={{mt:1}}>
              <FormControlLabel control={<Checkbox checked={showEmpty}
                onChange={e=>setShowEmpty(e.target.checked)}/>} label="display token-less"/>
              <FormControlLabel control={<Checkbox checked={showBurned}
                onChange={e=>setShowBurned(e.target.checked)}/>} label="display burned"/>
            </Stack>
          </Box>

          {/* carousel */}
          <Typography variant="h6" sx={{mt:2,mb:1}}>Collections</Typography>
          <Box sx={{position:'relative',minHeight:250}}>
            <IconButton onClick={()=>scroll(-1)}
              sx={{position:'absolute',left:-16,top:'40%',zIndex:2,width:48,height:48,
                   bgcolor:'secondary.main',color:'background.paper',border:'2px solid',
                   borderColor:'primary.main','&:hover':{bgcolor:'secondary.light'}}}>
              <ChevronLeftIcon/>
            </IconButton>
            <Box ref={trackRef}
              sx={{mx:'64px',display:'flex',gap:2,overflowX:'auto',scrollSnapType:'x mandatory',
                   '&::-webkit-scrollbar':{height:6},
                   '& > *':{flex:'0 0 auto',scrollSnapAlign:'center'}}}>
              {busy&&[...Array(3)].map((_,i)=>(
                <Skeleton key={i} variant="rectangular" width={280} height={210}/>
              ))}
              {!busy&&filtered.length===0&&(
                <Typography sx={{my:6,mx:'auto'}}>Nothing matches.</Typography>
              )}
              {filtered.map(c=>{
                const uri=pickUri(c.meta); const ok=hasVisual(uri);
                return(
                  <Box key={c.addr} onClick={()=>setSel(c.addr)}
                    sx={{width:280,height:240,border:'2px solid',
                         borderColor:sel===c.addr?'secondary.main':'divider',
                         borderRadius:2,p:1,cursor:'pointer',
                         bgcolor:sel===c.addr?'action.selected':'background.paper',
                         '&:hover':{boxShadow:3},display:'flex',flexDirection:'column',
                         position:'relative'}}>
                    <Box sx={{position:'absolute',top:4,left:4,bgcolor:'primary.main',
                              color:'background.paper',px:0.5,borderRadius:1,
                              fontSize:'0.7rem',lineHeight:1}}>{c.version}</Box>
                    {ok?(
                      isModel(uri)?<model-viewer src={toURL(uri)} camera-controls
                                            style={{width:'100%',height:140}}/>:
                      <Box component="img" src={toURL(uri)} alt={c.meta.name}
                        sx={{width:'100%',height:140,objectFit:'contain',bgcolor:'#111'}}/>
                    ):<Broken msg={c.meta._err||'no preview'}/>}
                    <Typography variant="subtitle2" noWrap mt={1}>{c.meta.name||'Untitled'}</Typography>
                    <Typography variant="caption" sx={{wordBreak:'break-all'}}>{c.addr}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.tokens.length} token{c.tokens.length===1?'':'s'}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            <IconButton onClick={()=>scroll(1)}
              sx={{position:'absolute',right:-16,top:'40%',zIndex:2,width:48,height:48,
                   bgcolor:'secondary.main',color:'background.paper',border:'2px solid',
                   borderColor:'primary.main','&:hover':{bgcolor:'secondary.light'}}}>
              <ChevronRightIcon/>
            </IconButton>
          </Box>
        </>
      )}

      {/* tokens grid */}
      {tokens.length>0&&(
        <>
          <Typography variant="h6" sx={{mt:4,mb:2}}>Tokens in {sel}</Typography>
          <Grid container spacing={2} justifyContent="center" sx={{width:'100%'}}>
            {tokens.map(t=>{
              const uri=pickUri(t.metadata); const ok=hasVisual(uri);
              return(
                <Grid key={t.tokenId} size={{xs:12,sm:6,md:4}}
                  onClick={()=>setDlg({
                    metadata:t.metadata,version:selCol?.version||'UNK',
                    tokenId:t.tokenId,rawUri:uri,blobUri:toURL(uri),
                  })}
                  sx={{border:'1px solid',borderRadius:1,p:1,cursor:'pointer',
                       '&:hover':{boxShadow:3}}}>
                  {ok?(
                    isModel(uri)?<model-viewer src={toURL(uri)} camera-controls
                                            style={{width:'100%',height:140}}/>:
                    <Box component="img" src={toURL(uri)} alt={t.metadata.name}
                      sx={{width:'100%',height:140,objectFit:'contain',bgcolor:'#111'}}/>
                  ):<Broken msg="no preview"/>}
                  <Typography variant="caption" noWrap>{t.metadata.name||`#${t.tokenId}`}</Typography>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* token popup */}
      <Dialog open={!!dlg} onClose={()=>setDlg(null)} maxWidth="md" fullWidth>
        {dlg&&(
          <>
            <DialogTitle sx={{pr:6}}>
              {dlg.metadata.name}
              <IconButton onClick={()=>setDlg(null)} sx={{position:'absolute',right:8,top:8}}>
                <CloseIcon/>
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid size={{xs:12,md:6}}>
                  {(()=>{
                    const raw=dlg.rawUri; if(!hasVisual(raw)) return <Broken msg="no media"/>;
                    const blob=dlg.blobUri;
                    if(isModel(raw)) return <model-viewer src={blob} camera-controls auto-rotate ar
                                                 style={{width:'100%',height:300}}/>;
                    if(raw.startsWith('data:image/svg+xml')) return (
                      <Box component="object" data={raw} type="image/svg+xml"
                           sandbox="allow-scripts allow-same-origin"
                           sx={{width:'100%',height:300,border:0}}/>);
                    if(isHTML(raw)) return <Box component="iframe" src={blob} title="HTML"
                                            sx={{width:'100%',height:300,border:0}}/>;
                    if(isVideo(raw)) return <Box component="video" src={blob} controls
                                             sx={{width:'100%',height:300}}/>;
                    return <Box component="img" src={blob} alt={dlg.metadata.name}
                               sx={{width:'100%',height:300,objectFit:'contain'}}/>;
                  })()}
                </Grid>
                <Grid size={{xs:12,md:6}} sx={{textAlign:'left'}}>
                  <Typography><strong>Token ID:</strong> {dlg.tokenId}</Typography>
                  <Typography><strong>Description:</strong> {dlg.metadata.description||'—'}</Typography>
                  <Typography><strong>Creators:</strong> {(dlg.metadata.creators||[]).join(', ')||'—'}</Typography>
                  <Typography><strong>Authors:</strong>   {(dlg.metadata.authors ||[]).join(', ')||'—'}</Typography>
                  <Typography><strong>Royalties:</strong> {fmtRoy(dlg.metadata.royalties)}</Typography>
                  <Typography><strong>License:</strong>   {dlg.metadata.rights||'—'}</Typography>
                  <Typography sx={{mt:1}}><strong>Contract Version:</strong> {dlg.version}</Typography>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* toast */}
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={()=>setToast('')}>
        <Alert severity="warning" onClose={()=>setToast('')}>{toast}</Alert>
      </Snackbar>

      {/* DEV drawer with unknown contracts */}
      {DEV&&(
        <Drawer anchor="right" open={drawer} onClose={()=>setDrawer(false)}>
          <Box sx={{width:320,p:2}}>
            <Typography variant="h6">Unknown type-hashes</Typography>
            <Divider sx={{my:1}}/>
            {[...devUnknownRef.current].length===0?(
              <Typography>No unsupported contracts encountered.</Typography>
            ):(
              <Box component="ul" sx={{pl:2}}>
                {[...devUnknownRef.current].map(u=><li key={u}><Typography variant="caption">{u}</Typography></li>)}
              </Box>
            )}
          </Box>
        </Drawer>
      )}
    </Box>
  );
}

/*──────────────────────── EOF ─────────────────────*/
