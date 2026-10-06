import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/retail-control/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/,''));
const json=(body,status=200)=>status===204?new Response(null,{status}):Response.json(body,{status});
function handler({actor=null,owner=false,staff=false}={}){
 let serve,calls=[];
 const db={from:table=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{active:staff}})})})}),rpc:async(name,params)=>{calls.push({name,params});return {data:{products:[],stats:{sold:0},transaction:{stock_after:7}}}}};
 vm.runInNewContext(source,{Request,Response,Intl,Date,Number,JSON,console,Deno:{serve:fn=>serve=fn},adminDb:()=>db,json,lineIdentity:async()=>actor,isOwner:async()=>owner,requirePost:req=>req.method==='OPTIONS'?json({},204):req.method!=='POST'?json({ok:false},405):null});
 return {send:async(body,method='POST')=>serve(new Request('https://test.invalid',{method,...(method==='POST'?{body:JSON.stringify(body)}:{})})),calls};
}
test('no login and unapproved LINE users cannot read central stock',async()=>{
 assert.equal((await handler().send({})).status,401);
 const h=handler({actor:'U'+'a'.repeat(32)});assert.equal((await h.send({action:'snapshot'})).status,403);assert.equal(h.calls.length,0);
});
test('owner and enabled staff reach snapshot; invalid dates are rejected',async()=>{
 for(const access of [{owner:true},{staff:true}]){const h=handler({actor:'U'+'a'.repeat(32),...access});assert.equal((await h.send({day:'2026-10-06'})).status,200);assert.equal(h.calls[0].name,'retail_snapshot');assert.equal((await h.send({day:'2026-02-30'})).status,400)}
});
test('transactions validate price, quantity, UUID and channel before database',async()=>{
 const valid={action:'transact',requestId:'11111111-1111-4111-8111-111111111111',productId:'22222222-2222-4222-8222-222222222222',kind:'sale',quantity:1,channel:'line',priceCents:5900,note:''};
 for(const change of [{quantity:0},{quantity:1.5},{priceCents:-1},{channel:'unapproved'},{requestId:'bad'},{note:'x'.repeat(501)}]){const h=handler({actor:'owner',owner:true});assert.equal((await h.send({...valid,...change})).status,400);assert.equal(h.calls.length,0)}
 const h=handler({actor:'staff',staff:true});assert.equal((await h.send(valid)).status,200);assert.equal(h.calls[0].params.p_actor,'staff');assert.equal(h.calls[0].params.p_channel,'line');assert.equal((await h.send({action:'staff_list'})).status,403);
});
test('preflight is bodyless and unsupported methods are denied',async()=>{const h=handler();const r=await h.send({},'OPTIONS');assert.equal(r.status,204);assert.equal(await r.text(),'');assert.equal((await h.send({},'GET')).status,405)});
