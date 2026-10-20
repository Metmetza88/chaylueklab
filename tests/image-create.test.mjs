import test from 'node:test';
import assert from 'node:assert/strict';
import {imageHandler} from '../supabase/functions/image-create/core.mjs';
const req=body=>new Request('https://example.test',{method:'POST',body:JSON.stringify(body)});
const base={identity:async()=> 'owner',isOwner:async()=>true,env:()=>undefined,request:()=>{throw Error('Unexpected provider call')}};
test('image generation refuses unauthenticated and non-owner requests before provider access',async()=>{
  assert.equal((await imageHandler({...base,identity:async()=>null})(req({}))).status,401);
  assert.equal((await imageHandler({...base,isOwner:async()=>false})(req({}))).status,403);
});
test('missing credentials are an explicit unavailable state, never a fake image',async()=>{
  const handler=imageHandler(base);assert.deepEqual(await (await handler(req({action:'status'}))).json(),{ok:true,configured:false});
  assert.equal((await handler(req({prompt:'รูปเสื้อ'}))).status,503);
});
test('provider output is restricted to a real non-thought raster and keys stay on server',async()=>{
  let call;const handler=imageHandler({...base,env:n=>n==='GEMINI_API_KEY'?'unit-test-only':'configured-model',request:async(url,init)=>{call={url,init};return Response.json({candidates:[{content:{parts:[{thought:true,inlineData:{mimeType:'image/png',data:'YWJj'}},{inlineData:{mimeType:'image/png',data:'ZGVm'}}]}}]})}});
  const result=await (await handler(req({prompt:'เสื้อสีดำพรีเมียม',ratio:'9:16'}))).json();assert.equal(result.image.data,'ZGVm');assert.equal(JSON.parse(call.init.body).generationConfig.imageConfig.aspectRatio,'9:16');assert(!JSON.stringify(result).includes('unit-test-only'));assert(!call.url.includes('unit-test-only'));
});
test('upstream secrets and errors never return to the client',async()=>{
  const handler=imageHandler({...base,env:()=> 'configured',request:async()=>Response.json({error:{message:'private-provider-detail'}},{status:429})});
  const result=await handler(req({prompt:'เสื้อสีดำ'}));assert.equal(result.status,429);assert.deepEqual(await result.json(),{ok:false,error:'provider_quota'});
});
