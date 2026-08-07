'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Math.max(1, Math.min(65535, Number(process.env.PORT || 8787)));
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const TOKEN = String(process.env.SANTUARIO_SYNC_TOKEN || '').trim();
const MAX_BODY = 55 * 1024 * 1024;

if (!TOKEN || TOKEN.length < 20) {
  console.error('ERRO: defina SANTUARIO_SYNC_TOKEN com pelo menos 20 caracteres.');
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });

function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(data);
}
function safeWorkspace(value) {
  const id = String(value || '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 80);
  return id.length >= 3 ? id : '';
}
function workspaceFile(id) { return path.join(DATA_DIR, `${id}.json`); }
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
function writeWorkspace(id, value) {
  const file=workspaceFile(id), temp=`${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value), 'utf8');
  fs.renameSync(temp, file);
}

const server=http.createServer(async (req,res)=>{
  try {
    const url=new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if(req.method==='GET' && url.pathname==='/health'){
      return json(res,200,{ok:true,service:'Santuario Gestao Sync Server',version:'1.0.0',time:new Date().toISOString()});
    }
    if(!authOk(req))return json(res,401,{ok:false,error:'Token de acesso inválido.'});
    const match=url.pathname.match(/^\/api\/v1\/state\/([A-Za-z0-9._-]+)$/);
    if(!match)return json(res,404,{ok:false,error:'Rota não encontrada.'});
    const workspace=safeWorkspace(match[1]);if(!workspace)return json(res,400,{ok:false,error:'Espaço de trabalho inválido.'});

    if(req.method==='GET'){
      const row=readWorkspace(workspace);if(!row)return json(res,404,{ok:false,error:'Espaço ainda não possui dados.'});
      return json(res,200,{ok:true,revision:Number(row.revision||0),updatedAt:row.updatedAt||'',clientId:row.clientId||'',payload:row.payload});
    }
    if(req.method==='PUT'){
      const body=await readBody(req);
      if(typeof body.payload!=='string' || body.payload.length<20)return json(res,400,{ok:false,error:'Payload criptografado ausente.'});
      const current=readWorkspace(workspace);const currentRevision=Number(current?.revision||0);const expected=Number(body.baseRevision||0);
      if(expected!==currentRevision)return json(res,409,{ok:false,error:'Revisão desatualizada.',revision:currentRevision,updatedAt:current?.updatedAt||''});
      const next={revision:currentRevision+1,updatedAt:new Date().toISOString(),clientId:String(body.clientId||'').slice(0,120),payload:body.payload};
      writeWorkspace(workspace,next);
      return json(res,200,{ok:true,revision:next.revision,updatedAt:next.updatedAt});
    }
    return json(res,405,{ok:false,error:'Método não permitido.'});
  } catch (err) {
    if(err?.message==='PAYLOAD_TOO_LARGE')return json(res,413,{ok:false,error:'Dados excedem o limite de 55 MB.'});
    if(err?.message==='INVALID_JSON')return json(res,400,{ok:false,error:'JSON inválido.'});
    console.error(err);return json(res,500,{ok:false,error:'Erro interno do servidor.'});
  }
});

server.listen(PORT,HOST,()=>{
  console.log(`Santuário Gestão Sync Server ativo em ${HOST}:${PORT}`);
  console.log(`Diretório de dados: ${DATA_DIR}`);
});
