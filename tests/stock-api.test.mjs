import test from 'node:test';
import assert from 'node:assert/strict';
import {createStockHandler, stockInput, stockLoginChannel, STOCK_LOGIN_CHANNEL} from '../supabase/functions/stock/core.ts';
import {verifyStockLineProfile} from '../supabase/functions/stock/line-profile.ts';
import {createStockWatch} from '../supabase/functions/stock/realtime.ts';

const requestId='e0ab0357-f282-4b85-b119-e90e0300e962';
const variantId='12f7c19d-3894-46af-8e02-3c53991091ef';
const shopId='ecabac61-e610-435f-acbc-c04f7fe1f1b9';
const profile={line_user_id:'U'+'1'.repeat(32),display_name:'ชื่อจาก LINE จริง'};
const variant={id:variantId,product_id:requestId,product_name:'Disposable fixture',sku:'test-only',color:'black',size:'M',stock_quantity:2,low_stock_threshold:3,revision:2};
const transaction={id:requestId,type:'OUT',quantity:3,before_quantity:5,after_quantity:2,sales_channel:'LINE',order_reference:null,customer_name:null,note:null,line_user_id:profile.line_user_id,display_name:profile.display_name,product_name:variant.product_name,color:variant.color,size:variant.size,sku:variant.sku,created_at:'2026-10-06T00:00:00Z'};
const snapshot=(role='STAFF')=>({shop:{id:shopId,name:'Fixture only',default_threshold:3},user:{...profile,role},variants:['OWNER','STAFF'].includes(role)?[variant]:[],summary:{sold_today:3,total_stock:2,low_stock_count:1,out_of_stock_count:0,channels:[{sales_channel:'LINE',quantity:3}]}});
const out=()=>({action:'transaction',request_id:requestId,variant_id:variantId,type:'OUT',quantity:3,sales_channel:'LINE'});

function harness({identity=profile,owner=false,rpcError,data,role='STAFF',configured=true,envOverride={},verifyError=false,watchError=false}={}){
 const calls=[];
 const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'disposable-test-key',LINE_LOGIN_CHANNEL_ID:STOCK_LOGIN_CHANNEL,LINE_CHANNEL_ID:'unrelated-legacy-channel',...envOverride};
 const deps={env:k=>configured?env[k]:undefined,verifyLine:async(id,access,channel)=>{calls.push(['verify',id,access,channel]);if(verifyError)throw new Error('sensitive provider text');return identity},isOwner:async id=>{calls.push(['owner',id]);return owner},rpc:async(name,args)=>{
  calls.push(['rpc',name,args]);if(rpcError)return {error:rpcError};
  if(data!==undefined)return {data};
  const outputs={snapshot:snapshot(role),transaction:{transaction,variant,replayed:false},product_create:{variant,transaction:null},history:{transactions:[transaction]},members:{members:[{...profile,role:'STAFF',status:'ACTIVE'}]},join:{user:{...profile,role:'PENDING'}},member_update:{user:{...profile,role:'STAFF'}},request_status:{found:true,result:{transaction,variant,replayed:false}}};
  return {data:outputs[args.p_action]};
 },watch:async input=>{
  calls.push(['watch',input]);if(watchError)throw new Error('provider details');
  return new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('event: connected\ndata: {}\n\nevent: stock_changed\ndata: {}\n\n'));c.close()}});
 }};
 const handler=createStockHandler(deps);
 return {calls,send:async(body,{method='POST',headers={},raw,signal}={})=>{
  const res=await handler(new Request('https://example.supabase.co/functions/v1/stock',{method,headers:{'content-type':'application/json','x-line-id-token':'fixture-id-token','x-line-access-token':'fixture-access-token',...headers},...(method==='POST'?{body:raw??JSON.stringify(body)}:{}),...(signal?{signal}:{})}));
  return {status:res.status,headers:res.headers,body:res.status===204?null:res.headers.get('content-type')?.startsWith('text/event-stream')?await res.text():await res.json()};
 }};
}

test('Stock endpoint requires service configuration and both LINE credentials, never a billing subscription',async()=>{
 assert.equal((await harness({configured:false}).send({action:'snapshot'})).body.error,'stock_not_configured');
 for(const key of ['x-line-id-token','x-line-access-token']){
  const h=harness();assert.equal((await h.send({action:'snapshot'},{headers:{[key]:''}})).status,401);assert.equal(h.calls.length,0);
 }
 const h=harness();assert.equal((await h.send({action:'snapshot'})).status,200);
 assert.equal(h.calls.some(c=>String(c[0]).includes('membership')),false);
});

test('Stock uses bundled Login channel and rejects an explicit mismatch without consulting legacy LINE_CHANNEL_ID',async()=>{
 assert.equal(stockLoginChannel(()=>undefined),STOCK_LOGIN_CHANNEL);
 const h=harness();await h.send({action:'snapshot'});assert.equal(h.calls.find(c=>c[0]==='verify')[3],STOCK_LOGIN_CHANNEL);
 const bad=harness({envOverride:{LINE_LOGIN_CHANNEL_ID:'wrong-channel'}});
 assert.equal((await bad.send({action:'snapshot'})).body.error,'stock_login_not_configured');assert.equal(bad.calls.length,0);
});

test('Preflight allows required token headers while GET cannot expose stock',async()=>{
 const h=harness();const preflight=await h.send(null,{method:'OPTIONS'});
 assert.equal(preflight.status,204);assert.match(preflight.headers.get('access-control-allow-headers'),/x-line-access-token/);
 assert.equal((await h.send(null,{method:'GET'})).status,405);assert.equal(h.calls.length,0);
});

test('Actor/name/owner are exclusively verified server context and RPC strips action',async()=>{
 const h=harness({owner:true});const res=await h.send(out());assert.equal(res.status,200);
 const rpc=h.calls.find(c=>c[0]==='rpc');assert.equal(rpc[1],'stock_action');
 assert.deepEqual(rpc[2].p_actor,{...profile,is_app_owner:true});
 assert.equal(rpc[2].p_input.action,undefined);assert.equal(rpc[2].p_input.shop_slug,'main');
 for(const spoof of [{line_user_id:'owner'},{display_name:'fake'},{is_app_owner:true},{role:'OWNER'},{actor:{line_user_id:'owner'}}]){
  const bad=harness();assert.equal((await bad.send({...out(),...spoof})).status,422);assert.equal(bad.calls.length,0);
 }
});

test('Invalid LINE credentials and provider outages cannot invoke any stock RPC',async()=>{
 for(const opts of [{identity:null},{identity:{line_user_id:'',display_name:'bad'}}]){const h=harness(opts);assert.equal((await h.send(out())).status,401);assert.equal(h.calls.some(c=>c[0]==='rpc'),false)}
 const h=harness({verifyError:true});const res=await h.send(out());assert.equal(res.status,503);assert.equal(res.body.error,'line_verification_unavailable');assert.equal(h.calls.some(c=>c[0]==='rpc'),false);
});

test('Transaction validation requires positive quantities, sales source for OUT, target+revision for ADJUST',async()=>{
 for(const patch of [{quantity:0},{quantity:-1},{quantity:1.5},{quantity:'3'},{sales_channel:'UNKNOWN'},{sales_channel:undefined},{request_id:'bad'},{variant_id:'bad'},{type:'ADJUST'},{stock_quantity:3},{expected_revision:1}]){
  const h=harness();assert.equal((await h.send({...out(),...patch})).status,422,JSON.stringify(patch));assert.equal(h.calls.length,0);
 }
 assert.equal((await harness().send({action:'transaction',request_id:requestId,variant_id:variantId,type:'IN',quantity:2})).status,200);
 assert.equal((await harness().send({action:'transaction',request_id:requestId,variant_id:variantId,type:'ADJUST',stock_quantity:0,expected_revision:2})).status,200);
 assert.throws(()=>stockInput({action:'transaction',request_id:requestId,variant_id:variantId,type:'IN',quantity:2,sales_channel:'LINE'}));
});

test('Authoritative variant/result and same-request retry flag come from database, not browser calculation',async()=>{
 const result={transaction:{...transaction,after_quantity:1},variant:{...variant,stock_quantity:1,revision:5},replayed:true};
 const h=harness({data:result});const res=await h.send(out());assert.deepEqual(res.body,result);assert.equal(res.body.variant.stock_quantity,1);assert.equal(res.body.replayed,true);
 for(const malformed of [null,{},[],{transaction:{id:requestId},variant:{id:variantId}}])assert.equal((await harness({data:malformed}).send(out())).status,503);
});

test('Database shop permissions, oversell and stale revisions return safe errors without SQL/customer details',async()=>{
 for(const [code,status]of [['permission_denied',403],['insufficient_stock',409],['revision_conflict',409],['request_id_conflict',409],['shop_not_found',404],['variant_not_found',404],['validation_failed',422]]){
  const res=await harness({rpcError:{message:code}}).send(out());assert.equal(res.status,status);assert.equal(res.body.error,code);
 }
 const res=await harness({rpcError:{message:'private SQL contacts and table names'}}).send(out());assert.equal(res.status,503);assert.deepEqual(res.body,{error:'stock_unavailable'});
 assert.equal((await harness({rpcError:{code:'PGRST202',message:'missing private RPC'}}).send(out())).body.error,'stock_not_configured');
});

test('History filters, catalog, members, join and request recovery normalize only supported input',async()=>{
 const requests=[{action:'history',days:7,sales_channel:'SHOPEE'},{action:'product_create',request_id:requestId,name:'Fixture only',sku:'shirt-black-m',color:'black',size:'M',threshold:3,initial_quantity:0},{action:'members'},{action:'join'},{action:'member_update',request_id:requestId,member_line_user_id:'U'+'2'.repeat(32),status:'ACTIVE',role:'STAFF'},{action:'request_status',request_id:requestId}];
 for(const body of requests)assert.equal((await harness().send(body)).status,200,body.action);
 for(const body of [{action:'history',days:2},{action:'history',days:'7'},{action:'product_create',request_id:requestId,name:'missing variant fields'},{action:'member_update',request_id:requestId,member_line_user_id:'other',status:'ACTIVE',role:'OWNER'},{action:'request_status',request_id:'invalid'},{action:'members',shop_slug:'../../another'}])assert.equal((await harness().send(body)).status,422);
});

test('Unknown fields, large payloads and invalid JSON fail before verification or database work',async()=>{
 for(const [options,expected]of [[{raw:'not JSON'},400],[{raw:'[]'},400],[{raw:JSON.stringify({data:'x'.repeat(17000)})},413],[{headers:{'content-type':'text/plain'}},415]]){
  const h=harness();assert.equal((await h.send(out(),options)).status,expected);assert.equal(h.calls.length,0);
 }
});

test('Watch authenticates and checks current shop role; emits invalidation only and checks revocation',async()=>{
 const h=harness();const res=await h.send({action:'watch'});assert.equal(res.status,200);assert.match(res.body,/event: connected/);assert.match(res.body,/event: stock_changed/);assert.equal(res.body.includes(profile.display_name),false);assert.equal(res.body.includes(variant.sku),false);
 const watched=h.calls.find(c=>c[0]==='watch')[1];assert.equal(watched.shopId,shopId);assert.equal(await watched.authorized(),true);
 for(const role of ['NONE','PENDING']){const bad=harness({role});assert.equal((await bad.send({action:'watch'})).status,403);assert.equal(bad.calls.some(c=>c[0]==='watch'),false)}
 assert.equal((await harness({watchError:true}).send({action:'watch'})).body.error,'stock_realtime_unavailable');
});

function lineFetcher({identityPatch={},accessPatch={},profilePatch={},identityStatus=200,profileStatus=200}={}){
 const calls=[];
 const fetcher=async(url,options={})=>{
  calls.push({url:String(url),options});
  if(String(url).endsWith('/v2/profile'))return Response.json({userId:profile.line_user_id,displayName:profile.display_name,...profilePatch},{status:profileStatus});
  if(options.method==='POST')return Response.json({iss:'https://access.line.me',sub:profile.line_user_id,aud:STOCK_LOGIN_CHANNEL,exp:Math.floor(Date.now()/1000)+3600,...identityPatch},{status:identityStatus});
  return Response.json({client_id:STOCK_LOGIN_CHANNEL,expires_in:3600,...accessPatch});
 };
 return {fetcher,calls};
}

test('LINE profile verification checks ID audience/issuer/expiry, access client/expiry and equal provider identity',async()=>{
 const good=lineFetcher();assert.deepEqual(await verifyStockLineProfile('id-token','access-token',STOCK_LOGIN_CHANNEL,good.fetcher),profile);
 assert.equal(good.calls.length,3);assert.equal(new URLSearchParams(good.calls.find(c=>c.options.method==='POST').options.body).get('client_id'),STOCK_LOGIN_CHANNEL);
 assert.equal(good.calls.find(c=>c.url.endsWith('/v2/profile')).options.headers.Authorization,'Bearer access-token');
 for(const opts of [{identityPatch:{aud:'other'}},{identityPatch:{iss:'https://evil.example'}},{identityPatch:{exp:1}},{accessPatch:{client_id:'legacy-other'}},{accessPatch:{expires_in:0}},{profilePatch:{userId:'another-user'}},{profilePatch:{displayName:'bad\nheader'}},{identityStatus:400}]){
  const mock=lineFetcher(opts);assert.equal(await verifyStockLineProfile('id','access',STOCK_LOGIN_CHANNEL,mock.fetcher),null);
 }
});

test('LINE outage is a retriable verifier error and never a fabricated profile',async()=>{
 const mock=lineFetcher({identityStatus:503});await assert.rejects(verifyStockLineProfile('id','access',STOCK_LOGIN_CHANNEL,mock.fetcher),/line_verification_unavailable/);
 const profileFail=lineFetcher({profileStatus:503});await assert.rejects(verifyStockLineProfile('id','access',STOCK_LOGIN_CHANNEL,profileFail.fetcher),/line_verification_unavailable/);
});

function realtimeHarness(subscribed=true){
 const timers=new Map(),intervals=new Map(),cleared=[],filters=[];let id=0,changed,removed=0;
 const channel={on(type,filter,handler){filters.push({type,filter});changed=handler;return channel},subscribe(handler){if(subscribed)handler('SUBSCRIBED');return channel}};
 const client={channel:()=>channel,removeChannel:async()=>{removed++}};
 const options={setTimeout:(fn,ms)=>{const key=++id;timers.set(key,{fn,ms});return key},clearTimeout:key=>{timers.delete(key);cleared.push(key)},setInterval:(fn,ms)=>{const key=++id;intervals.set(key,{fn,ms});return key},clearInterval:key=>{intervals.delete(key);cleared.push(key)}};
 return {watch:createStockWatch(client,options),timers,intervals,filters,changed:payload=>changed(payload),removed:()=>removed};
}

test('Realtime subscribe abort settles immediately and clears its timer/channel without waiting for provider callback',async()=>{
 const h=realtimeHarness(false),abort=new AbortController();
 const stream=h.watch({shopId,actor:{...profile,is_app_owner:false},shopSlug:'main',signal:abort.signal,authorized:async()=>true});
 const rejected=assert.rejects(stream,/stock_realtime_unavailable/);
 abort.abort();await rejected;
 assert.equal(h.removed(),1);assert.equal(h.timers.size,0);assert.equal(h.intervals.size,0);
});

test('Realtime bridges quantity invalidations only and closes with access_revoked when permission changes',async()=>{
 const h=realtimeHarness(),abort=new AbortController();let allowed=true;
 const stream=await h.watch({shopId,actor:{...profile,is_app_owner:false},shopSlug:'main',signal:abort.signal,authorized:async()=>allowed});
 const reader=stream.getReader(),decode=value=>new TextDecoder().decode(value);
 assert.match(decode((await reader.read()).value),/event: connected/);
 assert.equal(h.filters[0].filter.table,'stock_variants');assert.equal(h.filters[0].filter.filter,'shop_id=eq.'+shopId);
 h.changed({new:{customer_name:'PRIVATE',stock_quantity:1}});
 assert.equal(decode((await reader.read()).value),'event: stock_changed\ndata: {}\n\n');
 const heartbeat=[...h.intervals.values()][0];assert.equal(heartbeat.ms,15000);
 await heartbeat.fn();assert.match(decode((await reader.read()).value),/event: heartbeat/);
 allowed=false;await heartbeat.fn();assert.equal(decode((await reader.read()).value),'event: access_revoked\ndata: {}\n\n');
 assert.equal((await reader.read()).done,true);assert.equal(h.removed(),1);assert.equal(h.timers.size,0);assert.equal(h.intervals.size,0);
});

test('Realtime lifetime/cancel cleanup is bounded and removes only its own channel once',async()=>{
 for(const mode of ['deadline','cancel']){
  const h=realtimeHarness(),abort=new AbortController();
  const stream=await h.watch({shopId,actor:{...profile,is_app_owner:false},shopSlug:'main',signal:abort.signal,authorized:async()=>true});
  const reader=stream.getReader();await reader.read();
  if(mode==='deadline'){const lifetime=[...h.timers.values()].find(t=>t.ms===90000);assert.ok(lifetime);lifetime.fn();assert.equal((await reader.read()).done,true)}else await reader.cancel();
  abort.abort();assert.equal(h.removed(),1);assert.equal(h.timers.size,0);assert.equal(h.intervals.size,0);
 }
});
