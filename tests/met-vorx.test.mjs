import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/met-vorx.js';
const names=['GEMINI_API_KEY','MET_VORX_LINE_CHANNEL_ID','MET_VORX_LINE_USER_IDS'];
async function run({configured=true,token='token+/=',body={message:'สวัสดี เมท'},responses=[],method='POST'}={}){
  const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));const oldFetch=globalThis.fetch;const calls=[];
  // Local test fixtures only: fetch is replaced, no external request can be made.
  if(configured){process.env.GEMINI_API_KEY='local-test-fixture';process.env.MET_VORX_LINE_CHANNEL_ID='123';process.env.MET_VORX_LINE_USER_IDS='owner'}else names.forEach(n=>delete process.env[n]);
  globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});const next=responses.shift();assert.ok(next,'Unexpected external call');return {ok:next.status===undefined||next.status===200,status:next.status||200,json:async()=>next.body}};
  const res={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(value){this.body=value;return this}};
  try{await handler({method,headers:token?{authorization:'Bearer '+token}:{},body},res);return {res,calls}}finally{globalThis.fetch=oldFetch;for(const n of names){if(previous[n]===undefined)delete process.env[n];else process.env[n]=previous[n]}}
}
const verified={body:{client_id:'123',expires_in:300,scope:'profile'}};
const owner={body:{userId:'owner'}};
test('MET denies non-POST and unconfigured requests without external calls',async()=>{
  assert.equal((await run({method:'GET'})).res.code,405);
  const {res,calls}=await run({configured:false});assert.equal(res.code,503);assert.equal(calls.length,0);
});
test('MET denies missing tokens before contacting LINE',async()=>{assert.equal((await run({token:''})).res.code,401)});
test('MET verifies standard bearer characters with GET and channel binding',async()=>{
  const {res,calls}=await run({responses:[{body:{client_id:'wrong',expires_in:300}}]});assert.equal(res.code,403);
  assert.equal(new URL(calls[0].url).searchParams.get('access_token'),'token+/=');assert.equal(calls[0].options.method,undefined);
});
test('MET denies invalid LINE tokens and unauthorized accounts before Gemini',async()=>{
  assert.equal((await run({responses:[{status:400}]})).res.code,401);
  const {res,calls}=await run({responses:[verified,{body:{userId:'other'}}]});assert.equal(res.code,403);assert.equal(calls.length,2);
});
test('MET rejects malformed bodies and oversized images',async()=>{
  for(const body of ['{',[],{message:''},{message:'hi',image:'a'.repeat(3000001)}])assert.equal((await run({body,responses:[verified,owner]})).res.code,400);
});
test('MET returns Thai answer and attaches image only to protected server request',async()=>{
  const {res,calls}=await run({body:{message:'รูปนี้คืออะไร',image:'/9j/2Q=='},responses:[verified,owner,{body:{candidates:[{content:{parts:[{text:'สวัสดีครับ'}]}}]}}]});
  assert.equal(res.code,200);assert.equal(res.body.reply,'สวัสดีครับ');assert.equal(calls.length,3);
  const payload=JSON.parse(calls[2].options.body);assert.equal(payload.contents[0].parts[1].inline_data.mime_type,'image/jpeg');assert.ok(payload.systemInstruction);
  assert.ok(!JSON.stringify(res.body).includes('local-test-fixture'));
});
test('MET maps quota, upstream failure and empty answers without exposing responses',async()=>{
  for(const [upstream,expected] of [[{status:429},429],[{status:500},502],[{body:{}},502]])assert.equal((await run({responses:[verified,owner,upstream]})).res.code,expected);
});
