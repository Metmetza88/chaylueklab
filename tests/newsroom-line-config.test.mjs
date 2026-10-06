import test from 'node:test';
import assert from 'node:assert/strict';
import { newsroomConfig } from '../data/newsroom-config.js';
import { resolveLineLoginChannel } from '../supabase/functions/newsroom/line-config.ts';
import { createNewsroomHandler } from '../supabase/functions/newsroom/core.ts';

test('bundled owner-supplied LIFF selects the Login audience without another secret',()=>{
 assert.equal(resolveLineLoginChannel(newsroomConfig.liffId),'2011681452');
 assert.equal(resolveLineLoginChannel(newsroomConfig.liffId,'2011681452'),'2011681452');
});
test('malformed or mismatched app configuration fails closed',()=>{
 for(const liff of [null,undefined,{},'','2011681452','https://liff.line.me/2011681452-yexLrODy','2011681452-../../other'])
  assert.equal(resolveLineLoginChannel(liff),undefined);
 for(const override of ['', '2011675334', ' 2011681452', '2011681452,2011675334'])
  assert.equal(resolveLineLoginChannel(newsroomConfig.liffId,override),undefined);
});
test('other integration channel and browser claims cannot alter verified owner audience',async()=>{
 const stored={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'disposable-test-key',LINE_CHANNEL_ID:'2011675334',NEWSROOM_OWNER_LINE_ID:'owner'};
 const channel=resolveLineLoginChannel(newsroomConfig.liffId);
 const verified=[];let writes=0;
 const handler=createNewsroomHandler({
  env:name=>['LINE_LOGIN_CHANNEL_ID','LINE_CHANNEL_ID'].includes(name)?channel:stored[name],
  verifyLine:async(token,audience)=>{verified.push([token,audience]);return 'other-user'},
  rpc:async()=>{writes++;return {data:{}}},published:async()=>({data:[]}),
 });
 const response=await handler(new Request('https://example.com/newsroom',{method:'POST',headers:{'Content-Type':'application/json','x-line-id-token':'untrusted-test-token'},body:JSON.stringify({action:'create',client_id:'2011675334',owner:'owner'})}));
 assert.equal(response.status,403);
 assert.deepEqual(verified,[['untrusted-test-token','2011681452']]);assert.equal(writes,0);
});
test('invalid explicit override blocks owner requests while public reading remains available',async()=>{
 const channel=resolveLineLoginChannel(newsroomConfig.liffId,'2011675334');let privilegedCalls=0;
 const stored={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'disposable-test-key',NEWSROOM_OWNER_LINE_ID:'owner'};
 const handler=createNewsroomHandler({
  env:name=>['LINE_LOGIN_CHANNEL_ID','LINE_CHANNEL_ID'].includes(name)?channel:stored[name],
  verifyLine:async()=>{privilegedCalls++;return 'owner'},rpc:async()=>{privilegedCalls++;return {data:{}}},published:async()=>({data:[]}),
 });
 assert.equal((await handler(new Request('https://example.com/newsroom',{method:'POST',headers:{'x-line-id-token':'test-only'}}))).status,503);
 assert.deepEqual(await (await handler(new Request('https://example.com/newsroom'))).json(),[]);
 assert.equal(privilegedCalls,0);
});
