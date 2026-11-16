import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const handler=require('../api/smoke-detect.js');

function request(method,body,headers={}){
  return {method,body,headers:{host:'smoke.example.test',origin:'https://smoke.example.test',...headers}};
}
async function invoke(req){
  const res={code:200,headers:{},body:null,
    setHeader(k,v){this.headers[k]=v;return this;},
    status(n){this.code=n;return this;},
    json(data){this.body=data;return this;}
  };
  await handler(req,res);
  return res;
}
function jpeg(){
  return 'data:image/jpeg;base64,'+Buffer.from([255,216,255,224,0,16,74,70,73,70,0,1,1,0,0,1,0,1,0,0]).toString('base64');
}
test('disabled gateway reports status without key',async()=>{
  const old=process.env.SMOKE_GUARD_ENABLED;
  const oldKey=process.env.ROBOFLOW_API_KEY;
  delete process.env.SMOKE_GUARD_ENABLED;delete process.env.ROBOFLOW_API_KEY;
  try{
    const r=await invoke(request('GET'));
    assert.equal(r.code,200);assert.equal(r.body.ready,false);
    const p=await invoke(request('POST',{image:jpeg()}));
    assert.equal(p.code,503);assert.equal(p.body.error,'ai_not_configured');
  }finally{
    if(old===undefined)delete process.env.SMOKE_GUARD_ENABLED;else process.env.SMOKE_GUARD_ENABLED=old;
    if(oldKey===undefined)delete process.env.ROBOFLOW_API_KEY;else process.env.ROBOFLOW_API_KEY=oldKey;
  }
});
test('validates image and origin before calling provider',async()=>{
  const old=process.env.SMOKE_GUARD_ENABLED, oldKey=process.env.ROBOFLOW_API_KEY;
  process.env.SMOKE_GUARD_ENABLED='1';process.env.ROBOFLOW_API_KEY='mock_test_key';
  try{
    assert.equal((await invoke(request('POST',{image:'nope'}))).code,400);
    assert.equal((await invoke(request('POST',{image:jpeg()},{origin:'https://other.example.test'}))).code,403);
    assert.equal((await invoke(request('PUT',{image:jpeg()}))).code,405);
  }finally{
    if(old===undefined)delete process.env.SMOKE_GUARD_ENABLED;else process.env.SMOKE_GUARD_ENABLED=old;
    if(oldKey===undefined)delete process.env.ROBOFLOW_API_KEY;else process.env.ROBOFLOW_API_KEY=oldKey;
  }
});
test('returns sanitized model coordinates, not credentials or image payload',async()=>{
  const old=process.env.SMOKE_GUARD_ENABLED,oldKey=process.env.ROBOFLOW_API_KEY,oldFetch=global.fetch;
  process.env.SMOKE_GUARD_ENABLED='1';process.env.ROBOFLOW_API_KEY='mock_test_key';
  let called=0;
  global.fetch=async (url,opts)=>{
    called++;assert.match(String(url),/serverless\.roboflow\.com\/smoke-uvylj-5sztn\/1/);
    assert.equal(opts.method,'POST');
    return {ok:true,json:async()=>({image:{width:640,height:480},predictions:[
      {x:320,y:240,width:150,height:100,confidence:.83,class:'smoke',secret:'omit'},
      {x:'invalid',y:2,width:10,height:20,confidence:1,class:'smoke'}
    ]})};
  };
  try{
    const r=await invoke(request('POST',{image:jpeg()},{'x-forwarded-for':'test-client-1'}));
    assert.equal(r.code,200);assert.equal(called,1);
    assert.deepEqual(r.body.predictions,[{x:320,y:240,width:150,height:100,confidence:.83,label:'smoke'}]);
    assert.equal(r.headers['Cache-Control'],'no-store, max-age=0');
    assert.ok(!JSON.stringify(r.body).includes('mock_test_key'));
  }finally{
    global.fetch=oldFetch;
    if(old===undefined)delete process.env.SMOKE_GUARD_ENABLED;else process.env.SMOKE_GUARD_ENABLED=old;
    if(oldKey===undefined)delete process.env.ROBOFLOW_API_KEY;else process.env.ROBOFLOW_API_KEY=oldKey;
  }
});
