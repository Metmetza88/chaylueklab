import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {createEducationHandler} from '../api/education.mjs';
import {securityHeaders} from './security-headers.mjs';
const root=resolve(new URL('../dist/',import.meta.url).pathname);
const handler=createEducationHandler();
/** เซิร์ฟเวอร์สำหรับทดสอบและ preview ภายในเท่านั้น ไม่เชื่อม Production โดยอัตโนมัติ */
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 for(const [key,value]of Object.entries(securityHeaders))res.setHeader(key,value);
 if(url.pathname==='/api/education'){
  const chunks=[];let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>12000){res.writeHead(413).end();return;}chunks.push(chunk);}
  let body;
  try{body=chunks.length?JSON.parse(Buffer.concat(chunks)):undefined;}catch{res.writeHead(400).end();return;}
  req.query=Object.fromEntries(url.searchParams);req.body=body;
  res.status=code=>{res.statusCode=code;return res;};
  res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return res;};
  await handler(req,res);return;
 }
 const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
 try{
  const content=await readFile(path);
  const type={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'}[extname(path)];
  res.setHeader('Content-Type',type??'application/octet-stream');res.end(content);
 }catch{res.writeHead(404).end('Not found');}
}).listen(Number(process.env.PORT??4170),'127.0.0.1',()=>console.log('Education local preview listening on http://127.0.0.1:'+(process.env.PORT??4170)));
