'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Math.max(1, Math.min(65535, Number(process.env.PORT || 8787)));
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const WEB_ROOT = path.resolve(process.env.WEB_ROOT || path.join(__dirname, 'web'));
const TOKEN = String(process.env.SANTUARIO_SYNC_TOKEN || '').trim();
const MAX_BODY = 55 * 1024 * 1024;
const BACKUP_KEEP = Math.max(5, Math.min(500, Number(process.env.SANTUARIO_BACKUP_KEEP || 60)));
const AUTH_WINDOW_MS = 5 * 60 * 1000;
const AUTH_MAX_FAILURES = 30;
const authFailures = new Map();

const DEFAULT_ALLOWED_ORIGINS = ['https://adoradorescristo2026.github.io'];
const ALLOWED_ORIGINS = new Set(
  String(process.env.SANTUARIO_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',').map(v => v.trim().replace(/\/+$/, '')).filter(Boolean)
);

if (!TOKEN || TOKEN.length < 20) {
  console.error('ERRO: defina SANTUARIO_SYNC_TOKEN com pelo menos 20 caracteres.');
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.webp':'image/webp', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.pdf':'application/pdf'
};

function requestOrigin(req) { return String(req?.headers?.origin || '').trim().replace(/\/+$/, ''); }
function originAllowed(req) {
  const origin = requestOrigin(req);
  if (!origin) return true; // desktop/Electron e chamadas servidor-servidor
  return ALLOWED_ORIGINS.has(origin);
}
function baseHeaders(req, extra={}) {
  const origin = requestOrigin(req);
  const headers = {
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'X-Frame-Options':'SAMEORIGIN',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Access-Control-Allow-Headers':'Authorization, Content-Type, Accept',
    'Access-Control-Max-Age':'86400',
    'Access-Control-Allow-Methods':'GET, PUT, POST, OPTIONS',
    'Vary':'Origin',
    ...extra
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}
function json(req, res, status, body) {
  const data = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(status, baseHeaders(req, {
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length':data.length,
    'Cache-Control':'no-store'
  }));
  res.end(data);
}
function safeWorkspace(value) {
  const id = String(value || '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 80);
  return id.length >= 3 ? id : '';
}
function workspaceFile(id) { return path.join(DATA_DIR, `${id}.json`); }
function workspaceBackupDir(id) { return path.join(BACKUP_DIR, id); }
function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}
function noteAuthFailure(req) {
  const ip = clientIp(req), now = Date.now();
  const previous = authFailures.get(ip) || [];
  const fresh = previous.filter(ts => now - ts < AUTH_WINDOW_MS);
  fresh.push(now); authFailures.set(ip, fresh);
  return fresh.length;
}
function clearAuthFailures(req) { authFailures.delete(clientIp(req)); }
function authRateLimited(req) {
  const ip = clientIp(req), now = Date.now();
  const fresh = (authFailures.get(ip) || []).filter(ts => now - ts < AUTH_WINDOW_MS);
  if (fresh.length) authFailures.set(ip, fresh); else authFailures.delete(ip);
  return fresh.length >= AUTH_MAX_FAILURES;
}
function authOk(req) {
  const header = String(req.headers.authorization || '');
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!supplied) return false;
  const a = Buffer.from(supplied), b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks=[];let size=0;
    req.on('data', chunk => { size += chunk.length; if(size > MAX_BODY){ reject(new Error('PAYLOAD_TOO_LARGE')); req.destroy(); return; } chunks.push(chunk); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (_) { reject(new Error('INVALID_JSON')); } });
    req.on('error', reject);
  });
}
function readWorkspace(id) {
  const file=workspaceFile(id);if(!fs.existsSync(file))return null;
  try { const value=JSON.parse(fs.readFileSync(file,'utf8')); return value && typeof value==='object' ? value : null; } catch (_) { return null; }
}
function atomicWriteJson(file, value) {
  const temp=`${file}.${process.pid}.${Date.now()}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(temp, JSON.stringify(value), {encoding:'utf8', mode:0o600});
  fs.renameSync(temp, file);
}
function backupName(row) {
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const rev = Number(row?.revision || 0);
  return `${stamp}-r${String(rev).padStart(8,'0')}.json`;
}
function pruneBackups(id) {
  const dir=workspaceBackupDir(id);if(!fs.existsSync(dir))return;
  const files=fs.readdirSync(dir).filter(n=>/^\d{4}-.*-r\d+\.json$/.test(n)).sort().reverse();
  for (const old of files.slice(BACKUP_KEEP)) { try { fs.unlinkSync(path.join(dir,old)); } catch (_) {} }
}
function createBackup(id, current) {
  if(!current)return null;
  const dir=workspaceBackupDir(id);fs.mkdirSync(dir,{recursive:true});
  const name=backupName(current), file=path.join(dir,name);
  atomicWriteJson(file,current);pruneBackups(id);return name;
}
function writeWorkspace(id, value) {
  const current=readWorkspace(id);
  if(current) createBackup(id,current);
  atomicWriteJson(workspaceFile(id),value);
}
function listBackups(id) {
  const dir=workspaceBackupDir(id);if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir).filter(n=>/^\d{4}-.*-r\d+\.json$/.test(n)).sort().reverse().map(name=>{
    try { const row=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')); return {name,revision:Number(row.revision||0),updatedAt:row.updatedAt||'',clientId:row.clientId||''}; }
    catch (_) { return null; }
  }).filter(Boolean);
}
function restoreBackup(id,name) {
  if(!/^\d{4}-.*-r\d+\.json$/.test(String(name||'')))return null;
  const file=path.join(workspaceBackupDir(id),name);if(!fs.existsSync(file))return null;
  const snapshot=JSON.parse(fs.readFileSync(file,'utf8'));
  const current=readWorkspace(id);if(current)createBackup(id,current);
  const next={...snapshot,revision:Number(current?.revision||0)+1,updatedAt:new Date().toISOString(),clientId:'server-backup-restore'};
  atomicWriteJson(workspaceFile(id),next);return next;
}
function safeWebFile(urlPath) {
  let pathname;
  try { pathname=decodeURIComponent(urlPath || '/'); } catch (_) { return null; }
  if(pathname==='/' || pathname==='') pathname='/index.html';
  const normalized=path.normalize(pathname).replace(/^([/\\])+/, '');
  const absolute=path.resolve(WEB_ROOT,normalized);
  if(absolute!==WEB_ROOT && !absolute.startsWith(WEB_ROOT+path.sep))return null;
  return absolute;
}
function serveWeb(req,res,url) {
  if(!['GET','HEAD'].includes(req.method))return false;
  let file=safeWebFile(url.pathname);if(!file)return false;
  try { if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html'); } catch (_) {}
  fs.readFile(file,(err,data)=>{
    if(err){
      if(err.code==='ENOENT' && !path.extname(url.pathname||'')){
        return fs.readFile(path.join(WEB_ROOT,'index.html'),(fallbackErr,fallback)=>{
          if(fallbackErr)return json(req,res,404,{ok:false,error:'Página não encontrada.'});
          res.writeHead(200,baseHeaders(req,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}));
          if(req.method==='HEAD')return res.end();res.end(fallback);
        });
      }
      return json(req,res,404,{ok:false,error:'Arquivo não encontrado.'});
    }
    const ext=path.extname(file).toLowerCase();
    const cache=ext==='.html'||ext==='.webmanifest'||path.basename(file)==='sw.js'?'no-cache':'public, max-age=3600';
    res.writeHead(200,baseHeaders(req,{'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':data.length,'Cache-Control':cache}));
    if(req.method==='HEAD')return res.end();res.end(data);
  });
  return true;
}

const server=http.createServer(async (req,res)=>{
  try {
    const url=new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if(req.method==='OPTIONS'){
      if(!originAllowed(req))return json(req,res,403,{ok:false,error:'Origem web não autorizada.'});
      res.writeHead(204,baseHeaders(req,{'Cache-Control':'no-store'}));return res.end();
    }
    if(req.method==='GET' && url.pathname==='/health'){
      return json(req,res,200,{ok:true,service:'Santuario Gestao Web + Sync Server',version:'1.5.0',time:new Date().toISOString(),web:true,automaticBackups:true,backupKeep:BACKUP_KEEP});
    }
    if(!originAllowed(req))return json(req,res,403,{ok:false,error:'Origem web não autorizada.'});

    const stateMatch=url.pathname.match(/^\/api\/v1\/state\/([A-Za-z0-9._-]+)$/);
    const backupListMatch=url.pathname.match(/^\/api\/v1\/backups\/([A-Za-z0-9._-]+)$/);
    const backupRestoreMatch=url.pathname.match(/^\/api\/v1\/backups\/([A-Za-z0-9._-]+)\/([^/]+)\/restore$/);
    const protectedApi = stateMatch || backupListMatch || backupRestoreMatch;
    if(protectedApi){
      if(authRateLimited(req))return json(req,res,429,{ok:false,error:'Muitas tentativas inválidas. Aguarde alguns minutos.'});
      if(!authOk(req)){noteAuthFailure(req);return json(req,res,401,{ok:false,error:'Token de acesso inválido.'});}
      clearAuthFailures(req);
    }

    if(stateMatch){
      const workspace=safeWorkspace(stateMatch[1]);if(!workspace)return json(req,res,400,{ok:false,error:'Espaço de trabalho inválido.'});
      if(req.method==='GET'){
        const row=readWorkspace(workspace);if(!row)return json(req,res,404,{ok:false,error:'Espaço ainda não possui dados.'});
        return json(req,res,200,{ok:true,revision:Number(row.revision||0),updatedAt:row.updatedAt||'',clientId:row.clientId||'',payload:row.payload});
      }
      if(req.method==='PUT'){
        const body=await readBody(req);
        if(typeof body.payload!=='string' || body.payload.length<20)return json(req,res,400,{ok:false,error:'Payload criptografado ausente.'});
        const current=readWorkspace(workspace),currentRevision=Number(current?.revision||0),expected=Number(body.baseRevision||0);
        if(expected!==currentRevision)return json(req,res,409,{ok:false,error:'Revisão desatualizada.',revision:currentRevision,updatedAt:current?.updatedAt||''});
        const next={revision:currentRevision+1,updatedAt:new Date().toISOString(),clientId:String(body.clientId||'').slice(0,120),payload:body.payload};
        writeWorkspace(workspace,next);
        return json(req,res,200,{ok:true,revision:next.revision,updatedAt:next.updatedAt,backupCreated:Boolean(current)});
      }
      return json(req,res,405,{ok:false,error:'Método não permitido.'});
    }

    if(backupListMatch){
      const workspace=safeWorkspace(backupListMatch[1]);if(!workspace)return json(req,res,400,{ok:false,error:'Espaço de trabalho inválido.'});
      if(req.method!=='GET')return json(req,res,405,{ok:false,error:'Método não permitido.'});
      return json(req,res,200,{ok:true,workspace,keep:BACKUP_KEEP,backups:listBackups(workspace)});
    }

    if(backupRestoreMatch){
      const workspace=safeWorkspace(backupRestoreMatch[1]);if(!workspace)return json(req,res,400,{ok:false,error:'Espaço de trabalho inválido.'});
      if(req.method!=='POST')return json(req,res,405,{ok:false,error:'Método não permitido.'});
      const restored=restoreBackup(workspace,decodeURIComponent(backupRestoreMatch[2]));
      if(!restored)return json(req,res,404,{ok:false,error:'Backup não encontrado.'});
      return json(req,res,200,{ok:true,workspace,revision:restored.revision,updatedAt:restored.updatedAt});
    }

    if(url.pathname.startsWith('/api/'))return json(req,res,404,{ok:false,error:'Rota de API não encontrada.'});
    if(serveWeb(req,res,url))return;
    return json(req,res,405,{ok:false,error:'Método não permitido.'});
  } catch (err) {
    if(err?.message==='PAYLOAD_TOO_LARGE')return json(req,res,413,{ok:false,error:'Dados excedem o limite de 55 MB.'});
    if(err?.message==='INVALID_JSON')return json(req,res,400,{ok:false,error:'JSON inválido.'});
    console.error(err);return json(req,res,500,{ok:false,error:'Erro interno do servidor.'});
  }
});

server.listen(PORT,HOST,()=>{
  console.log(`Santuário Gestão Web + Sync ativo em ${HOST}:${PORT}`);
  console.log(`Diretório de dados: ${DATA_DIR}`);
  console.log(`Backups automáticos: ${BACKUP_DIR} (mantendo ${BACKUP_KEEP} por workspace)`);
  console.log(`Origens web permitidas: ${[...ALLOWED_ORIGINS].join(', ') || '(nenhuma)'}`);
  console.log(`Aplicação web: ${WEB_ROOT}`);
});
