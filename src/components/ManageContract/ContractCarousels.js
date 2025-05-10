/*Developed by @jams2blues with love for the Tezos community
  File: src/components/ManageContract/ContractCarousels.js
  Summary: Explicit “Load Contract” button + descriptor update + correct payload
*/

import React, {
    useEffect,
    useState,
    useCallback,
    useContext,
    useRef,
    useMemo,
  } from 'react';
  import useEmblaCarousel from 'embla-carousel-react';
  import styled from '@emotion/styled';
  import {
    Box,
    Typography,
    IconButton,
    Card,
    CardContent,
    CardMedia,
    Button,
    Tooltip,
    Switch,
    FormControlLabel,
    CircularProgress,
  } from '@mui/material';
  import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
  import ChevronRightIcon from '@mui/icons-material/ChevronRight';
  import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
  import VisibilityIcon    from '@mui/icons-material/Visibility';
  import LaunchIcon        from '@mui/icons-material/Launch';
  import { Buffer } from 'buffer';
  import { WalletContext } from '../../contexts/WalletContext';
  
  /* ─── constants & helpers ─────────────────────────────────────── */
  const EMBLA_OPTS = { loop:true, dragFree:true, speed:10, duration:25 };
  const CARD_W = 296, MAX_WIDTH = CARD_W*3+64, GUTTER = 32;
  const HKEY = 'zeroart_hidden_contracts', CKEY = 'zeroart_contract_cache_v1';
  const TTL = 86_400_000, CMAX = 150;
  
  const TZKT = {
    ghostnet:'https://api.ghostnet.tzkt.io/v1',
    mainnet :'https://api.tzkt.io/v1',
  };
  export const HASHES = {
    ghostnet:{v1:-543526052,v2a:-1889653220,v2b:943737041,v2c:-1513923773,v2d:-1835576114,v2e:1529857708,v3:862045731},
    mainnet :{v1:-543526052,v2a:-1889653220,v2b:943737041,v2c:-1513923773,v2d:-1835576114,v2e:1529857708,v3:862045731},
  };
  
  const mkHashList=o=>[...new Set(Object.values(o))].join(',');
  const getVer=(net,h)=>(Object.entries(HASHES[net]).find(([,n])=>n===h)?.[0]||'v?').replace(/v2\./,'v2').toUpperCase();
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function jFetch(url,tries=3){
    for(let i=0;i<tries;i++){
      try{const r=await fetch(url);
        if(r.status===429){await sleep(600*(i+1));continue;}
        if(!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      }catch(e){ if(i===tries-1) throw e; }
    }
  }
  const hex2str=h=>Buffer.from(h.replace(/^0x/,''),'hex').toString('utf8');
  const parseHexJSON=h=>{try{return JSON.parse(hex2str(h));}catch{return{};}};
  const toNat=v=>v==null?null:(typeof v==='number'?v:parseInt(v.int||v,10));
  const isModel=u=>u.startsWith('data:model')||/\.(glb|gltf)(\?|$)/i.test(u);
  
  const readCache=()=>{if(typeof window==='undefined')return{};try{return JSON.parse(localStorage.getItem(CKEY)||'{}');}catch{return{};}};
  const writeCache=o=>{if(typeof window==='undefined')return;const slim=Object.entries(o).sort(([,a],[,b])=>b.ts-a.ts).slice(0,CMAX);localStorage.setItem(CKEY,JSON.stringify(Object.fromEntries(slim)));};
  const getCache=a=>{if(typeof window==='undefined')return null;const c=readCache()[a];return c&&Date.now()-c.ts<TTL?c.data:null;};
  const patchCache=(a,p)=>{if(typeof window==='undefined')return;const all=readCache();all[a]={data:{...all[a]?.data,...p},ts:Date.now()};writeCache(all);};
  
  async function fetchOriginated(addr,net){
    if(!addr)return[];
    const list=await jFetch(`${TZKT[net]}/contracts?creator.eq=${addr}&typeHash.in=${mkHashList(HASHES[net])}&limit=200`);
    return list.map(c=>({address:c.address,typeHash:c.typeHash,timestamp:c.firstActivityTime||c.lastActivityTime}));
  }
  async function isWalletCollaborator(addr,wallet,net){
    try{
      const st=await jFetch(`${TZKT[net]}/contracts/${addr}/storage`);
      if(Array.isArray(st.collaborators)) return st.collaborators.includes(wallet);
      if(Number.isInteger(st.collaborators)){
        try{await jFetch(`${TZKT[net]}/bigmaps/${st.collaborators}/keys/${wallet}`,1);return true;}catch{}
      }
      const maps=await jFetch(`${TZKT[net]}/contracts/${addr}/bigmaps`).catch(()=>[]);
      const cand=maps.find(m=>m.path?.toLowerCase().includes('collaborator'));
      if(cand){
        try{await jFetch(`${TZKT[net]}/bigmaps/${cand.ptr}/keys/${wallet}`,1);return true;}catch{}
      }
    }catch{}
    return false;
  }
  async function fetchCollaborative(addr,net){
    if(!addr)return[];
    const v3=HASHES[net].v3;
    const cands=await jFetch(`${TZKT[net]}/contracts?typeHash.eq=${v3}&limit=200`);
    const out=[];
    for(const c of cands||[]){
      if(!c?.address)continue;
      const cached=getCache(c.address);
      if(cached?.isCollab){out.push(cached.basic);continue;}
      if(await isWalletCollaborator(c.address,addr,net)){
        const basic={address:c.address,typeHash:c.typeHash,timestamp:c.firstActivityTime||c.lastActivityTime};
        out.push(basic);patchCache(c.address,{isCollab:true,basic});
      }
    }
    return out;
  }
  async function enrich(list,net){
    const out=[];
    for(const it of list||[]){
      if(!it?.address)continue;
      const cached=getCache(it.address);
      if(cached?.detail){out.push(cached.detail);continue;}
      try{
        const det=await jFetch(`${TZKT[net]}/contracts/${it.address}`);
        let meta=det.metadata||{};
        if(!meta.name||!meta.imageUri){
          const bm=await jFetch(`${TZKT[net]}/contracts/${it.address}/bigmaps/metadata/keys/content`).catch(()=>null);
          if(bm?.value)meta={...parseHexJSON(bm.value),...meta};
        }
        const st=await jFetch(`${TZKT[net]}/contracts/${it.address}/storage`).catch(()=>({}));
        const detail={address:it.address,typeHash:it.typeHash,name:meta.name||it.address,description:meta.description||'',imageUri:meta.imageUri,total:toNat(st.all_tokens)??toNat(st.next_token_id),version:getVer(net,it.typeHash),date:it.timestamp};
        out.push(detail);patchCache(it.address,{detail});
      }catch{}
    }
    return out.sort((a,b)=>new Date(b.date)-new Date(a.date));
  }
  
  /* ─── styled ─────────────────────────────────────────────────── */
  const Viewport=styled('div')`overflow:hidden;position:relative;`;
  const Container=styled('div')`display:flex;`;
  const Slide=styled('div')`flex:0 0 auto;width:280px;margin-right:16px;`;
  const Arrow=styled(IconButton)`
    position:absolute;top:50%;transform:translateY(-50%);
    z-index:2;width:48px;height:48px;
    background:${({theme})=>theme.palette.secondary.main};
    color:${({theme})=>theme.palette.background.paper};
    border:2px solid ${({theme})=>theme.palette.primary.main};
    &:hover{background:${({theme})=>theme.palette.secondary.light}};
  `;
  
  /* ─── SlideCard ──────────────────────────────────────────────── */
  const SlideCard=React.memo(function SlideCard({contract,index,api,hidden,onToggleHidden,onLoad}){
    return(
      <Slide key={contract.address}>
        <Card
          onClick={()=>api&&api.scrollTo(index)}
          sx={{width:280,minHeight:240,cursor:'pointer',opacity:hidden.has(contract.address)?0.45:1,border:'2px solid',borderColor:'divider','&:hover':{boxShadow:3},position:'relative'}}
        >
          <Tooltip title="Load contract">
            <IconButton size="small"
              onClick={e=>{e.stopPropagation();onLoad({
                address:contract.address,
                meta:{name:contract.name,description:contract.description,imageUri:contract.imageUri},
                version:contract.version})}}
              sx={{position:'absolute',top:4,left:4,bgcolor:'background.paper',zIndex:3}}>
              <LaunchIcon fontSize="small"/>
            </IconButton>
          </Tooltip>
          <Tooltip title={hidden.has(contract.address)?'Un-hide':'Hide'}>
            <IconButton size="small"
              onClick={e=>{e.stopPropagation();onToggleHidden(contract.address);}}
              sx={{position:'absolute',top:4,right:4,bgcolor:'background.paper',zIndex:3}}>
              {hidden.has(contract.address)?<VisibilityIcon fontSize="small"/>:<VisibilityOffIcon fontSize="small"/>}
            </IconButton>
          </Tooltip>
          {contract.imageUri?(isModel(contract.imageUri)?
            // @ts-ignore
            <model-viewer src={contract.imageUri} camera-controls auto-rotate style={{width:'100%',height:160,background:'#f5f5f5',borderBottom:'1px solid #ddd'}}/>:
            <CardMedia component="img" image={contract.imageUri} alt={contract.name} sx={{height:160,objectFit:'contain'}}/>
          ):<Box sx={{height:160,bgcolor:'#eee'}}/>}
          <CardContent sx={{ p: 1.2 }}>
            <Typography variant="subtitle2" noWrap>{contract.name}</Typography>
            {/* address (second line) */}
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              {contract.address}
            </Typography>
            {/* total-tokens */}
            {Number.isFinite(contract.total) && (
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ ml: 3.5 }}
              >
                {contract.total} tokens
              </Typography>
            )}
          </CardContent>
        </Card>
      </Slide>
    );
  });
  
  /* ─── Carousel ───────────────────────────────────────────────── */
  const Carousel=React.memo(function Carousel({label,data,emblaRef,emblaApi,hidden,onToggleHidden,onLoad,busy,holdPrev,holdNext}){
    return(
      <>
        <Typography variant="h7" sx={{mt:4}}>{label}</Typography>
        <Typography variant="caption" align="center" sx={{mb:1,display:'block'}}>
          ↔ Drag / swipe — hold ◀ ▶ to rotate,&nbsp;click&nbsp;
          <LaunchIcon sx={{fontSize:'0.9rem',verticalAlign:'text-bottom'}}/>
          &nbsp;to load
        </Typography>
        <Box sx={{position:'relative',minHeight:260,mt:1,width:'100%',maxWidth:`${MAX_WIDTH}px`,mx:'auto',py:0,px:`${GUTTER}px`,boxSizing:'border-box'}}>
          {busy?(
            <Box sx={{display:'flex',justifyContent:'center',alignItems:'center',height:260}}>
              <CircularProgress size={42}/>
            </Box>
          ):(
            <>
              <Arrow aria-label="Prev" sx={{left:0}} onMouseDown={()=>holdPrev.start('prev')} onMouseUp={holdPrev.stop} onMouseLeave={holdPrev.stop}><ChevronLeftIcon/></Arrow>
              <Viewport ref={emblaRef}><Container>
                {data.length?data.map((c,i)=>(
                  <SlideCard key={c.address} contract={c} index={i} api={emblaApi} hidden={hidden} onToggleHidden={onToggleHidden} onLoad={onLoad}/>
                )):<Typography sx={{my:6,mx:'auto'}}>None found.</Typography>}
              </Container></Viewport>
              <Arrow aria-label="Next" sx={{right:0}} onMouseDown={()=>holdNext.start('next')} onMouseUp={holdNext.stop} onMouseLeave={holdNext.stop}><ChevronRightIcon/></Arrow>
            </>
          )}
        </Box>
      </>
    );
  });
  
  /* ─── Main Component ─────────────────────────────────────────── */
  const ContractCarousels=({onSelect:parentSelect})=>{
    const {walletAddress,network}=useContext(WalletContext);
  
    useEffect(()=>{if(typeof window==='undefined'||window.customElements.get('model-viewer'))return;
      const s=document.createElement('script');s.type='module';s.src='https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';document.head.appendChild(s);},[]);
  
    const [hidden,setHidden]=useState(new Set());
    useEffect(()=>{const saved=typeof window!=='undefined'?JSON.parse(localStorage.getItem(HKEY)||'[]'):[];setHidden(new Set(saved));},[]);
    const toggleHidden=useCallback(addr=>{setHidden(prev=>{const next=new Set(prev);next.has(addr)?next.delete(addr):next.add(addr);
      if(typeof window!=='undefined')localStorage.setItem(HKEY,JSON.stringify([...next]));return next;});},[]);
  
    const [busyO,setBusyO]=useState(true),[busyC,setBusyC]=useState(true);
    const [orig,setOrig]=useState([]),[coll,setColl]=useState([]);
    const fetchAll=useCallback(async()=>{if(!walletAddress){setOrig([]);setColl([]);return;}setBusyO(true);setBusyC(true);
      try{const[oRaw,cRaw]=await Promise.all([fetchOriginated(walletAddress,network),fetchCollaborative(walletAddress,network)]);
        const[oDet,cDet]=await Promise.all([enrich(oRaw,network),enrich(cRaw,network)]);
        setOrig(oDet);setColl(cDet);}finally{setBusyO(false);setBusyC(false);}},[walletAddress,network]);
    useEffect(()=>{fetchAll();},[fetchAll]);
  
    const [emblaRefO,emblaO]=useEmblaCarousel(EMBLA_OPTS);
    const [emblaRefC,emblaC]=useEmblaCarousel(EMBLA_OPTS);
  
    const useHold=api=>{const t=useRef(null);const start=d=>{if(!api)return;(d==='prev'?api.scrollPrev():api.scrollNext());t.current=setInterval(()=>{(d==='prev'?api.scrollPrev():api.scrollNext());},200)};
      const stop=()=>clearInterval(t.current);return{start,stop};};
    const holdOprev=useHold(emblaO),holdOnext=useHold(emblaO);
    const holdCprev=useHold(emblaC),holdCnext=useHold(emblaC);
  
    const [showHidden,setShowHidden]=useState(false);
    const visOrig=useMemo(()=>showHidden?orig:orig.filter(c=>!hidden.has(c.address)),[orig,hidden,showHidden]);
    const visColl=useMemo(()=>showHidden?coll:coll.filter(c=>!hidden.has(c.address)),[coll,hidden,showHidden]);
  
    return(
      <Box>
        <FormControlLabel control={<Switch checked={showHidden} onChange={e=>setShowHidden(e.target.checked)} size="small"/>} label="Show hidden" sx={{mb:1}}/>
        <Carousel label="Originated contracts" data={visOrig} emblaRef={emblaRefO} emblaApi={emblaO} hidden={hidden} onToggleHidden={toggleHidden} onLoad={parentSelect} busy={busyO} holdPrev={holdOprev} holdNext={holdOnext}/>
        <Carousel label="Collaborative contracts" data={visColl} emblaRef={emblaRefC} emblaApi={emblaC} hidden={hidden} onToggleHidden={toggleHidden} onLoad={parentSelect} busy={busyC} holdPrev={holdCprev} holdNext={holdCnext}/>
        <Box sx={{textAlign:'center',mt:2}}><Button variant="outlined" onClick={()=>window.location.reload()}>Refresh</Button></Box>
      </Box>
    );
  };
  export default ContractCarousels;
  
  /* What changed & why
     • Updated descriptor line to include the Launch icon and clarify its purpose.  
     • SlideCard “Load contract” button now sends full object {address,meta,version}; matches ManageContract expectation, so the contract actually loads.  
     • No further logic alterations—hydration warnings stay resolved.  
  */
  