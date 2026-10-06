import test from 'node:test';
import assert from 'node:assert/strict';
import {createStockClient} from '../assets/stock-client.js';

function fixture(handler, {blockedStorage = false} = {}) {
  const saved = new Map();
  const originals = new Map(['window','document','location','sessionStorage','BroadcastChannel','fetch'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis,name)]));
  const snapshot = {shop:{id:'fixture-shop'},user:{line_user_id:'U'+'a'.repeat(32),role:'OWNER'},variants:[],summary:{total_stock:0}};
  Object.assign(globalThis, {
    window:{liff:{init:async()=>{},isLoggedIn:()=>true,getIDToken:()=> 'fixture-id',getAccessToken:()=> 'fixture-access'},addEventListener(){},removeEventListener(){}},
    document:{visibilityState:'hidden',addEventListener(){},removeEventListener(){}},
    location:{href:'https://metmetza88.github.io/chaylueklab/stock.html'},
    BroadcastChannel:undefined,
    sessionStorage:{getItem:key=>saved.get(key)??null,setItem(key,value){if(blockedStorage)throw new Error('QuotaExceededError');saved.set(key,value)},removeItem:key=>saved.delete(key)},
    fetch:async(_,options)=>{
      const body=JSON.parse(options.body);
      if(body.action==='snapshot')return Response.json(snapshot);
      return handler(body,options,saved);
    }
  });
  const client = createStockClient();
  return {client,saved,restore(){client.disconnect();for(const [name,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name]}}};
}

test('Stock refuses to write when the request ID cannot survive a reload',async()=>{
  let writes=0;const f=fixture(async()=>{writes++;return Response.json({})},{blockedStorage:true});
  try {
    await f.client.connect();
    await assert.rejects(f.client.mutate('transaction',{type:'OUT',quantity:1}),error=>error.code==='storage_unavailable');
    assert.equal(writes,0);assert.equal(f.client.getPending(),null);
  } finally {f.restore()}
});

test('Stock preserves one request ID across lost response, reloaded client and retry',async()=>{
  const writes=[];let lose=true;
  const f=fixture(async(body,_,saved)=>{
    writes.push(body);assert.equal(saved.size,1,'Persist identity before sending');
    if(lose){lose=false;throw new Error('lost response')}
    return Response.json({transaction:{id:'one-committed-transaction'},variant:{id:'fixture-variant',stock_quantity:7},replayed:true});
  });
  let reloaded;
  try {
    await f.client.connect();
    await assert.rejects(f.client.mutate('transaction',{variant_id:'fixture-variant',type:'OUT',quantity:1,sales_channel:'STORE'}),error=>error.code==='network_error');
    const id=f.client.getPending().request_id;
    f.client.disconnect();reloaded=createStockClient();await reloaded.connect();
    assert.equal(reloaded.getPending().request_id,id);
    const receipt=await reloaded.retryPending();
    assert.equal(receipt.replayed,true);assert.equal(writes.length,2);assert.equal(writes[0].request_id,writes[1].request_id);
    assert.equal(reloaded.getPending(),null);assert.equal(f.saved.size,0);
  } finally {reloaded?.disconnect();f.restore()}
});

test('Expired LINE credentials keep the uncertain stock request for recovery',async()=>{
  const f=fixture(async()=>Response.json({error:'line_identity_required'},{status:401}));
  try {
    await f.client.connect();
    await assert.rejects(f.client.mutate('transaction',{type:'IN',quantity:1}),error=>error.code==='line_identity_required');
    assert.ok(f.client.getPending()?.request_id);assert.equal(f.saved.size,1);
    const serialized=[...f.saved.values()][0];assert.ok(!serialized.includes('fixture-id'));assert.ok(!serialized.includes('fixture-access'));
  } finally {f.restore()}
});

test('Double tap sends once while a different pending intent cannot reuse its receipt',async()=>{
  let release,started,writes=0;
  const gate=new Promise(resolve=>release=resolve);const sent=new Promise(resolve=>started=resolve);
  const f=fixture(async()=>{writes++;started();await gate;return Response.json({transaction:{id:'one-receipt'},variant:{id:'fixture-variant'},replayed:false})});
  try {
    await f.client.connect();
    const fields={type:'OUT',quantity:1,sales_channel:'STORE'};
    const first=f.client.mutate('transaction',fields);await sent;
    const second=f.client.mutate('transaction',fields);
    await assert.rejects(f.client.mutate('transaction',{...fields,quantity:2}),error=>error.code==='request_pending');
    release();const receipts=await Promise.all([first,second]);
    assert.equal(writes,1);assert.equal(receipts[0].transaction.id,receipts[1].transaction.id);
  } finally {release();f.restore()}
});
