// PATCH V1.4.4 RAILWAY: restaurado do sincronizador original compatível com /api/v1/state/:workspace.
(() => {
  'use strict';

  // No Electron, o preload já fornece a implementação nativa/segura.
  if (window.santuarioDesktop?.isDesktop) return;

  const DATA_KEY = 'santuarioGestaoV3Data';
  const CONFIG_KEY = 'santuarioWebCloudSyncV1';
  const SYNC_CHANNEL = 'santuarioGestaoCloudSyncV1';
  const POLL_MS = 3000;
  const PUSH_DELAY_MS = 650;

  let pollTimer = null;
  let pushTimer = null;
  let pushInFlight = false;
  let pushQueuedState = null;
  let baseState = null;
  let remoteRevision = 0;
  let lastSyncAt = '';
  let lastError = '';
  let applyingRemote = false;
  let readyForPush = false;
  let derivedKeyCache = { signature:'', bytes:null };
  const treasuryDataListeners = new Set();
  const treasuryRefreshListeners = new Set();
  let channel = null;

  try { if ('BroadcastChannel' in window) channel = new BroadcastChannel(SYNC_CHANNEL); } catch (_) {}

  const utf8 = value => new TextEncoder().encode(String(value ?? ''));
  const deepClone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const jsonEqual = (a,b) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return a === b; } };
  const objectish = value => value && typeof value === 'object' && !Array.isArray(value);
  const arrayHasStableIds = arr => Array.isArray(arr) && arr.every(x => x && typeof x === 'object' && !Array.isArray(x) && typeof x.id === 'string' && x.id);

  function randomId() {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
    const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const h = [...bytes].map(b => b.toString(16).padStart(2,'0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }

  function defaultServerUrl() {
    return /^https?:$/i.test(location.protocol) ? location.origin : '';
  }

  function normalizeConfig(input = {}, current = {}) {
    return {
      enabled: Boolean(input.enabled),
      serverUrl: String(input.serverUrl || current.serverUrl || defaultServerUrl()).trim().replace(/\/+$/, ''),
      workspaceId: String(input.workspaceId || current.workspaceId || 'santuario-principal').trim().replace(/[^A-Za-z0-9._-]/g,'').slice(0,80),
      accessToken: String(input.accessToken || '').trim() || String(current.accessToken || ''),
      encryptionKey: String(input.encryptionKey || '') || String(current.encryptionKey || ''),
      clientId: String(current.clientId || input.clientId || randomId())
    };
  }

  function readConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      if (!stored || typeof stored !== 'object') throw new Error('invalid');
      return normalizeConfig({ ...stored, enabled:Boolean(stored.enabled) }, stored);
    } catch (_) {
      return normalizeConfig({ enabled:false, serverUrl:defaultServerUrl(), workspaceId:'santuario-principal' });
    }
  }

  function writeConfig(request = {}) {
    const current = readConfig();
    const config = normalizeConfig(request, current);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    derivedKeyCache = { signature:'', bytes:null };
    return config;
  }

  function configured(config = readConfig()) {
    return Boolean(config.enabled && /^https?:\/\//i.test(config.serverUrl || '') && config.workspaceId && config.accessToken && config.encryptionKey);
  }

  function publicStatus() {
    const cfg = readConfig();
    return {
      ok:true,
      configured:configured(cfg),
      enabled:Boolean(cfg.enabled),
      serverUrl:String(cfg.serverUrl || ''),
      workspaceId:String(cfg.workspaceId || ''),
      hasAccessToken:Boolean(cfg.accessToken),
      hasEncryptionKey:Boolean(cfg.encryptionKey),
      clientId:String(cfg.clientId || ''),
      revision:Number(remoteRevision || 0),
      lastSyncAt,
      lastError,
      encryptionAvailable:Boolean(window.crypto?.subtle)
    };
  }

  function rotl(a,b) { return ((a << b) | (a >>> (32-b))) >>> 0; }
  function salsa208(block) {
    const x = new Uint32Array(block);
    for (let i=0;i<8;i+=2) {
      x[ 4] ^= rotl((x[ 0] + x[12])>>>0, 7); x[ 8] ^= rotl((x[ 4] + x[ 0])>>>0, 9); x[12] ^= rotl((x[ 8] + x[ 4])>>>0,13); x[ 0] ^= rotl((x[12] + x[ 8])>>>0,18);
      x[ 9] ^= rotl((x[ 5] + x[ 1])>>>0, 7); x[13] ^= rotl((x[ 9] + x[ 5])>>>0, 9); x[ 1] ^= rotl((x[13] + x[ 9])>>>0,13); x[ 5] ^= rotl((x[ 1] + x[13])>>>0,18);
      x[14] ^= rotl((x[10] + x[ 6])>>>0, 7); x[ 2] ^= rotl((x[14] + x[10])>>>0, 9); x[ 6] ^= rotl((x[ 2] + x[14])>>>0,13); x[10] ^= rotl((x[ 6] + x[ 2])>>>0,18);
      x[ 3] ^= rotl((x[15] + x[11])>>>0, 7); x[ 7] ^= rotl((x[ 3] + x[15])>>>0, 9); x[11] ^= rotl((x[ 7] + x[ 3])>>>0,13); x[15] ^= rotl((x[11] + x[ 7])>>>0,18);
      x[ 1] ^= rotl((x[ 0] + x[ 3])>>>0, 7); x[ 2] ^= rotl((x[ 1] + x[ 0])>>>0, 9); x[ 3] ^= rotl((x[ 2] + x[ 1])>>>0,13); x[ 0] ^= rotl((x[ 3] + x[ 2])>>>0,18);
      x[ 6] ^= rotl((x[ 5] + x[ 4])>>>0, 7); x[ 7] ^= rotl((x[ 6] + x[ 5])>>>0, 9); x[ 4] ^= rotl((x[ 7] + x[ 6])>>>0,13); x[ 5] ^= rotl((x[ 4] + x[ 7])>>>0,18);
      x[11] ^= rotl((x[10] + x[ 9])>>>0, 7); x[ 8] ^= rotl((x[11] + x[10])>>>0, 9); x[ 9] ^= rotl((x[ 8] + x[11])>>>0,13); x[10] ^= rotl((x[ 9] + x[ 8])>>>0,18);
      x[12] ^= rotl((x[15] + x[14])>>>0, 7); x[13] ^= rotl((x[12] + x[15])>>>0, 9); x[14] ^= rotl((x[13] + x[12])>>>0,13); x[15] ^= rotl((x[14] + x[13])>>>0,18);
    }
    const out = new Uint32Array(16);
    for (let i=0;i<16;i++) out[i] = (x[i] + block[i]) >>> 0;
    return out;
  }

  function blockMixSalsa8(B, r) {
    const blocks = 2*r;
    const Y = new Uint32Array(B.length);
    let X = new Uint32Array(16);
    X.set(B.subarray((blocks-1)*16, blocks*16));
    for (let i=0;i<blocks;i++) {
      const off = i*16;
      for (let j=0;j<16;j++) X[j] ^= B[off+j];
      X = salsa208(X);
      Y.set(X, off);
    }
    const out = new Uint32Array(B.length);
    for (let i=0;i<r;i++) out.set(Y.subarray((2*i)*16,(2*i+1)*16), i*16);
    for (let i=0;i<r;i++) out.set(Y.subarray((2*i+1)*16,(2*i+2)*16), (i+r)*16);
    return out;
  }

  function bytesToWordsLE(bytes) {
    const out = new Uint32Array(bytes.length >>> 2);
    for (let i=0,j=0;i<out.length;i++,j+=4) out[i]=(bytes[j]|(bytes[j+1]<<8)|(bytes[j+2]<<16)|(bytes[j+3]<<24))>>>0;
    return out;
  }
  function wordsToBytesLE(words) {
    const out = new Uint8Array(words.length*4);
    for (let i=0,j=0;i<words.length;i++,j+=4){const w=words[i];out[j]=w&255;out[j+1]=(w>>>8)&255;out[j+2]=(w>>>16)&255;out[j+3]=(w>>>24)&255;}
    return out;
  }

  function smix(bytes, N=16384, r=8) {
    let X = bytesToWordsLE(bytes);
    const words = X.length;
    const V = new Uint32Array(N * words);
    for (let i=0;i<N;i++) { V.set(X, i*words); X = blockMixSalsa8(X,r); }
    for (let i=0;i<N;i++) {
      const j = X[(2*r-1)*16] & (N-1);
      const off = j*words;
      for (let k=0;k<words;k++) X[k] ^= V[off+k];
      X = blockMixSalsa8(X,r);
    }
    return wordsToBytesLE(X);
  }

  async function pbkdf2Sha256(passwordBytes, saltBytes, iterations, length) {
    const key = await crypto.subtle.importKey('raw',passwordBytes,{name:'PBKDF2'},false,['deriveBits']);
    const bits = await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:saltBytes,iterations},key,length*8);
    return new Uint8Array(bits);
  }

  async function scrypt(password, salt, dkLen=32) {
    const passwordBytes=utf8(password), saltBytes=utf8(salt), N=16384, r=8, p=1;
    let B = await pbkdf2Sha256(passwordBytes,saltBytes,1,p*128*r);
    for(let i=0;i<p;i++) B.set(smix(B.slice(i*128*r,(i+1)*128*r),N,r),i*128*r);
    return pbkdf2Sha256(passwordBytes,B,1,dkLen);
  }

  async function deriveKey(config) {
    const signature = `${config.workspaceId}\u0000${config.encryptionKey}`;
    if (derivedKeyCache.signature === signature && derivedKeyCache.bytes) return derivedKeyCache.bytes;
    const bytes = await scrypt(String(config.encryptionKey), `santuario:${config.workspaceId}`, 32);
    derivedKeyCache = { signature, bytes };
    return bytes;
  }

  function bytesToBase64(bytes) {
    let binary=''; const size=0x8000;
    for(let i=0;i<bytes.length;i+=size) binary += String.fromCharCode(...bytes.subarray(i,Math.min(i+size,bytes.length)));
    return btoa(binary);
  }
  function base64ToBytes(value) {
    const binary=atob(String(value||'')), out=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) out[i]=binary.charCodeAt(i);
    return out;
  }

  async function encryptState(state, config) {
    if (!crypto?.subtle) throw new Error('Este navegador não oferece criptografia WebCrypto.');
    const keyBytes=await deriveKey(config), key=await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['encrypt']);
    const iv=new Uint8Array(12);crypto.getRandomValues(iv);
    const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,tagLength:128},key,utf8(JSON.stringify(state||{}))));
    const tag=encrypted.slice(encrypted.length-16), data=encrypted.slice(0,encrypted.length-16);
    return JSON.stringify({v:1,iv:bytesToBase64(iv),tag:bytesToBase64(tag),data:bytesToBase64(data)});
  }

  async function decryptState(payload, config) {
    const wrapped=typeof payload==='string'?JSON.parse(payload):payload;
    if(!wrapped||Number(wrapped.v)!==1)throw new Error('Formato de dados da nuvem não reconhecido.');
    const keyBytes=await deriveKey(config), key=await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['decrypt']);
    const data=base64ToBytes(wrapped.data),tag=base64ToBytes(wrapped.tag),combined=new Uint8Array(data.length+tag.length);combined.set(data);combined.set(tag,data.length);
    try{
      const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(wrapped.iv),tagLength:128},key,combined);
      return JSON.parse(new TextDecoder().decode(clear)||'{}');
    }catch(_){throw new Error('Não foi possível descriptografar os dados. Confirme a chave de criptografia.');}
  }

  async function request(method,url,body=null,config=readConfig()) {
    const headers={'Accept':'application/json','Authorization':`Bearer ${config.accessToken}`};
    if(body!==null)headers['Content-Type']='application/json';
    let response;
    try{response=await fetch(url,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:'no-store'});}catch(_){throw new Error('Não foi possível acessar o servidor online.');}
    let data={};try{data=await response.json();}catch(_){data={};}
    return {status:response.status,data};
  }

  async function pullRaw(config=readConfig()) {
    if(!configured(config))throw new Error('Sincronização online não configurada.');
    const endpoint=`${config.serverUrl}/api/v1/state/${encodeURIComponent(config.workspaceId)}`;
    const res=await request('GET',endpoint,null,config);
    if(res.status===404)return{exists:false,revision:0,state:null,updatedAt:'',clientId:''};
    if(res.status<200||res.status>=300)throw new Error(res.data?.error||`Servidor online respondeu HTTP ${res.status}.`);
    const state=await decryptState(res.data.payload,config);
    return{exists:true,revision:Number(res.data.revision||0),state,updatedAt:String(res.data.updatedAt||''),clientId:String(res.data.clientId||'')};
  }

  async function pushRaw(state,baseRevision,config=readConfig()) {
    if(!configured(config))throw new Error('Sincronização online não configurada.');
    const endpoint=`${config.serverUrl}/api/v1/state/${encodeURIComponent(config.workspaceId)}`;
    const res=await request('PUT',endpoint,{baseRevision:Number(baseRevision||0),payload:await encryptState(state,config),clientId:config.clientId},config);
    if(res.status===409)return{ok:false,conflict:true,revision:Number(res.data?.revision||0)};
    if(res.status<200||res.status>=300)throw new Error(res.data?.error||`Servidor online respondeu HTTP ${res.status}.`);
    return{ok:true,revision:Number(res.data.revision||0),updatedAt:String(res.data.updatedAt||'')};
  }

  function threeWayMerge(base,local,remote) {
    if(jsonEqual(local,base))return deepClone(remote);
    if(jsonEqual(remote,base))return deepClone(local);
    if(Array.isArray(base)&&Array.isArray(local)&&Array.isArray(remote)&&arrayHasStableIds(base)&&arrayHasStableIds(local)&&arrayHasStableIds(remote)){
      const bm=new Map(base.map(x=>[x.id,x])),lm=new Map(local.map(x=>[x.id,x])),rm=new Map(remote.map(x=>[x.id,x]));
      const ids=new Set([...bm.keys(),...lm.keys(),...rm.keys()]),out=[];
      for(const id of ids){const b=bm.get(id),l=lm.get(id),r=rm.get(id);if(l===undefined){if(r!==undefined&&!jsonEqual(r,b))out.push(deepClone(r));continue;}if(r===undefined){if(b!==undefined&&!jsonEqual(l,b))out.push(deepClone(l));continue;}out.push(threeWayMerge(b,l,r));}
      const order=[...local.map(x=>x.id),...remote.map(x=>x.id).filter(id=>!lm.has(id))],by=new Map(out.map(x=>[x.id,x]));return order.map(id=>by.get(id)).filter(Boolean);
    }
    if(objectish(base)&&objectish(local)&&objectish(remote)){
      const out={},keys=new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)]);
      for(const key of keys){const hasL=Object.prototype.hasOwnProperty.call(local,key),hasR=Object.prototype.hasOwnProperty.call(remote,key),hasB=Object.prototype.hasOwnProperty.call(base,key);if(!hasL){if(hasR&&!jsonEqual(remote[key],base[key]))out[key]=deepClone(remote[key]);continue;}if(!hasR){if(hasB&&!jsonEqual(local[key],base[key]))out[key]=deepClone(local[key]);continue;}out[key]=threeWayMerge(base[key],local[key],remote[key]);}
      return out;
    }
    return deepClone(local);
  }

  function readLocalState(){try{const raw=localStorage.getItem(DATA_KEY);return raw?JSON.parse(raw):null;}catch(_){return null;}}

  function notifyRemoteApplied(){
    treasuryDataListeners.forEach(fn=>{try{fn();}catch(_){}});
    treasuryRefreshListeners.forEach(fn=>{try{fn();}catch(_){}});
    try{channel?.postMessage({type:'remote-applied',at:Date.now()});}catch(_){}
  }

  function applyRemoteState(state) {
    if(!state)return;
    applyingRemote=true;
    try{localStorage.setItem(DATA_KEY,JSON.stringify(state));notifyRemoteApplied();}
    finally{setTimeout(()=>{applyingRemote=false;},800);}
  }

  async function publishState(localState) {
    const config=readConfig();if(!configured(config)||!localState||applyingRemote)return{ok:false,skipped:true};
    let remote=await pullRaw(config);
    if(!remote.exists){const pushed=await pushRaw(localState,0,config);if(!pushed.ok)throw new Error('Conflito ao criar o espaço online.');baseState=deepClone(localState);remoteRevision=pushed.revision;lastSyncAt=pushed.updatedAt||new Date().toISOString();lastError='';return{ok:true,revision:pushed.revision};}
    const base=baseState||remote.state;let merged=threeWayMerge(base,localState,remote.state);let pushed=await pushRaw(merged,remote.revision,config);
    if(pushed.conflict){remote=await pullRaw(config);merged=threeWayMerge(base,localState,remote.state);pushed=await pushRaw(merged,remote.revision,config);}
    if(!pushed.ok)throw new Error('Outro computador atualizou os dados ao mesmo tempo. Tente novamente.');
    baseState=deepClone(merged);remoteRevision=pushed.revision;lastSyncAt=pushed.updatedAt||new Date().toISOString();lastError='';if(!jsonEqual(merged,localState))applyRemoteState(merged);return{ok:true,revision:pushed.revision};
  }

  function queuePublish(state) {
    if(!state||applyingRemote||!readyForPush)return;
    pushQueuedState=deepClone(state);clearTimeout(pushTimer);
    pushTimer=setTimeout(async()=>{if(pushInFlight)return;pushInFlight=true;const next=pushQueuedState;pushQueuedState=null;try{await publishState(next);}catch(err){lastError=String(err?.message||err);}finally{pushInFlight=false;if(pushQueuedState)queuePublish(pushQueuedState);}},PUSH_DELAY_MS);
  }

  async function pollOnce({forceApply=false}={}) {
    const config=readConfig();if(!configured(config))return{ok:false,skipped:true};
    try{
      const remote=await pullRaw(config);if(!remote.exists){lastError='';readyForPush=true;return{ok:true,exists:false};}
      const changed=remote.revision>remoteRevision;lastError='';lastSyncAt=remote.updatedAt||lastSyncAt;
      if(changed||forceApply){remoteRevision=remote.revision;baseState=deepClone(remote.state);const local=readLocalState();if(forceApply||!jsonEqual(local,remote.state))applyRemoteState(remote.state);}
      readyForPush=true;return{ok:true,exists:true,revision:remote.revision,changed};
    }catch(err){readyForPush=false;lastError=String(err?.message||err);return{ok:false,error:lastError};}
  }

  function restartPolling(){clearInterval(pollTimer);pollTimer=null;readyForPush=false;if(!configured(readConfig()))return;pollOnce();pollTimer=setInterval(()=>pollOnce(),POLL_MS);}

  async function testConnection(){
    const cfg=readConfig();if(!configured(cfg))return{ok:false,error:'Preencha servidor, espaço, token e chave de criptografia.'};
    try{
      // Testa uma rota autenticada: 200 e 404 significam que o token foi aceito.
      const endpoint=`${cfg.serverUrl}/api/v1/state/${encodeURIComponent(cfg.workspaceId)}`;
      const res=await request('GET',endpoint,null,cfg);
      if(![200,404].includes(res.status))throw new Error(res.data?.error||`HTTP ${res.status}`);
      lastError='';return{ok:true,server:{service:'Santuário Gestão Sync',authenticated:true}};
    }catch(err){lastError=String(err?.message||err);return{ok:false,error:lastError};}
  }

  const bridge={
    isDesktop:false,
    isWeb:true,
    platform:'web',
    versions:{browser:navigator.userAgent},
    cloudSyncStatus:async()=>publicStatus(),
    saveCloudSyncConfig:async(payload={})=>{
      try{const cfg=writeConfig(payload);baseState=null;remoteRevision=0;lastError='';restartPolling();if(configured(cfg)){const test=await testConnection();if(!test.ok)throw new Error(test.error);}return publicStatus();}
      catch(err){lastError=String(err?.message||err);return{ok:false,error:lastError,...publicStatus()};}
    },
    testCloudSync:testConnection,
    publishLocalToCloud:async()=>{try{const state=readLocalState();if(!state)throw new Error('Não foi possível ler os dados locais.');readyForPush=true;baseState=null;const result=await publishState(state);restartPolling();return{ok:true,...result,...publicStatus()};}catch(err){lastError=String(err?.message||err);return{ok:false,error:lastError};}},
    pullCloudNow:async()=>{const result=await pollOnce({forceApply:true});return{...result,...publicStatus()};},
    cloudStateChanged:(state={})=>queuePublish(state),
    treasuryDataChanged:()=>{try{channel?.postMessage({type:'local-changed',at:Date.now()});}catch(_){}},
    onTreasuryDataChanged:(callback)=>{if(typeof callback!=='function')return()=>{};treasuryDataListeners.add(callback);return()=>treasuryDataListeners.delete(callback);},
    onTreasuryRefresh:(callback)=>{if(typeof callback!=='function')return()=>{};treasuryRefreshListeners.add(callback);return()=>treasuryRefreshListeners.delete(callback);}
  };

  window.santuarioDesktop=bridge;

  try{
    channel?.addEventListener('message',event=>{
      if(event?.data?.type==='remote-applied'||event?.data?.type==='local-changed'){
        treasuryDataListeners.forEach(fn=>{try{fn();}catch(_){}});
        treasuryRefreshListeners.forEach(fn=>{try{fn();}catch(_){}});
      }
    });
  }catch(_){}

  window.addEventListener('storage',event=>{
    if(event.key===CONFIG_KEY)restartPolling();
    if(event.key===DATA_KEY){treasuryDataListeners.forEach(fn=>{try{fn();}catch(_){}});treasuryRefreshListeners.forEach(fn=>{try{fn();}catch(_){}});}
  });

  restartPolling();
})();
