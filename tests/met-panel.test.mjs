import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveLiffCommand} from '../assets/liff-command-center.js';
import {metHandler} from '../supabase/functions/met-vorx/core.mjs';
const send=body=>new Request('https://example.test',{method:'POST',body:JSON.stringify(body)});
const config={identity:async()=> 'owner',owner:async()=>true,env:()=>undefined,request:()=>{throw Error('Provider must not be called')}};
test('MET stays in the existing authenticated LIFF page and releases device resources on close',()=>{
  assert.equal(resolveLiffCommand('/เมท').command.action,'met');const s=readFileSync(new URL('../assets/met-vorx-panel.js',import.meta.url),'utf8');
  assert(!s.includes('liff.init('));assert(s.includes("dialog.addEventListener('close'"));assert(s.includes('getTracks().forEach(t=>t.stop())'));assert(!s.includes("fetch('./api/"));
});
test('MET authenticates and restricts owners before accessing Gemini',async()=>{
  assert.equal((await metHandler({...config,identity:async()=>null})(send({message:'สวัสดี'}))).status,401);
  assert.equal((await metHandler({...config,owner:async()=>false})(send({message:'สวัสดี'}))).status,403);
  assert.equal((await metHandler(config)(send({message:'สวัสดี'}))).status,503);
});
test('MET forwards Thai text and attached image, excludes hidden thoughts and hides provider secrets',async()=>{
  let payload;const handler=metHandler({...config,env:n=>n==='GEMINI_API_KEY'?'unit-test-only':undefined,request:async(url,init)=>{payload=JSON.parse(init.body);return Response.json({candidates:[{content:{parts:[{thought:true,text:'private thought'},{text:'สวัสดีครับ'}]}}]})}});
  const r=await handler(send({message:'ช่วยดูภาพ',image:'YWJj'}));const data=await r.json();assert.equal(data.reply,'สวัสดีครับ');assert.equal(payload.contents[0].parts[1].inlineData.mimeType,'image/jpeg');assert(!JSON.stringify(data).includes('unit-test-only'));
});
