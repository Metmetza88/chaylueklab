import test from 'node:test';
import assert from 'node:assert/strict';
import {createNewsroomHandler, editorialPatch} from '../supabase/functions/newsroom/core.ts';
const storyId='ed40483e-0ecb-45d2-b0a1-e253e04bd99b';
const requestId='2e269d58-d2af-4dda-884f-93837275ba72';
const fields={slug:'test-story',title:'Test',category:'AI',sources:[],reporter:'Research Agent'};
function harness({identity='owner',configured=true,rpcError,story={id:storyId,revision:2},providerError,envOverrides={}}={}){
 const calls=[];
 const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'disposable-test-key',LINE_CHANNEL_ID:'test-channel',NEWSROOM_OWNER_LINE_ID:'owner',...envOverrides};
 const handler=createNewsroomHandler({env:k=>configured?env[k]:undefined,
  verifyLine:async(token,channel)=>{calls.push(['verify',token,channel]);return identity},
  rpc:async(name,args)=>{calls.push(['rpc',name,args]);return rpcError?{error:{message:rpcError}}:{data:args.p_action==='list'?{stories:[story]}:story}},
  published:async()=>{calls.push(['published']);return {data:[]}},
  getStory:async id=>{calls.push(['getStory',id]);return {data:story}},
  workforce:async input=>{calls.push(['workforce',input]);if(providerError)throw providerError;return {stage:input.stage,draft:{social_copy:'Draft'},approval_required:true}},
 });
 const send=async(body,{method='POST',token='id-token',contentType='application/json'}={})=>{
  const req=new Request('https://example.supabase.co/functions/v1/newsroom',{method,headers:{'x-line-id-token':token,'content-type':contentType},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
  const response=await handler(req);return {status:response.status,body:response.status===204?null:await response.json(),headers:response.headers};
 };
 return {send,calls};
}
test('public reading and preflight do not invoke owner or workforce operations',async()=>{
 const h=harness();assert.equal((await h.send(null,{method:'OPTIONS'})).status,204);
 assert.deepEqual((await h.send(null,{method:'GET'})).body,[]);assert.deepEqual(h.calls,[['published']]);
 assert.equal((await h.send(null,{method:'DELETE'})).status,405);
});
test('owner verification precedes writes and provider requests',async()=>{
 for(const identity of [null,'other-user']){const h=harness({identity});assert.equal((await h.send({action:'workforce',stage:'social'})).status,403);assert.equal(h.calls.filter(c=>c[0]!=='verify').length,0)}
 const h=harness();assert.equal((await h.send({action:'list'},{token:''})).status,403);assert.equal(h.calls.length,0);
 assert.equal((await h.send({action:'list'},{token:'x'.repeat(8193)})).status,403);
 assert.equal((await harness({configured:false}).send({action:'list'})).status,503);
});
test('owner ID tokens use the configured Login channel rather than another integration channel',async()=>{
 const h=harness({envOverrides:{LINE_LOGIN_CHANNEL_ID:'confirmed-login-channel',LINE_CHANNEL_ID:'other-channel'}});
 assert.equal((await h.send({action:'list',client_id:'untrusted-channel'})).status,200);
 assert.deepEqual(h.calls.find(c=>c[0]==='verify'),['verify','id-token','confirmed-login-channel']);
 const legacy=harness();await legacy.send({action:'list'});
 assert.equal(legacy.calls.find(c=>c[0]==='verify')[2],'test-channel');
 const missing=harness({envOverrides:{LINE_CHANNEL_ID:undefined}});
 assert.equal((await missing.send({action:'list'})).status,503);assert.equal(missing.calls.length,0);
});
test('create normalizes fields and takes retry ID and actor only from verified context',async()=>{
 const h=harness();const res=await h.send({action:'create',request_id:requestId,fields:{...fields,sources:[{url:'https://example.com',label:' Source '}]}});
 assert.equal(res.status,200);assert.equal(res.body.story.id,storyId);
 const [,name,args]=h.calls.find(c=>c[0]==='rpc');assert.equal(name,'newsroom_owner_action');assert.equal(args.p_actor,'owner');
 assert.deepEqual(args.p_input.fields.sources,[{url:'https://example.com/',label:'Source'}]);
 assert.equal((await h.send({action:'create',request_id:requestId,fields:{...fields,verified:true}})).status,422);
 assert.equal((await h.send({action:'create',fields})).status,422);
});
test('all mutations require revision and cannot forge publication or verification',async()=>{
 const h=harness();const common={story_id:storyId,expected_revision:2};
 for(const action of ['update','transition','factcheck','approve','publish'])assert.equal((await h.send({action,story_id:storyId})).status,422);
 assert.equal((await h.send({action:'update',...common,patch:{verified:true}})).status,422);
 assert.equal((await h.send({action:'transition',...common,to_status:'published'})).status,422);
 assert.equal((await h.send({action:'approve',...common,patch:{title:'Hidden change'}})).status,422);
 assert.equal((await h.send({action:'factcheck',...common,verdict:'verified',note:'short'})).status,422);
 assert.equal((await h.send({action:'factcheck',...common,verdict:'verified',note:'Checked official source and publication dates.'})).status,200);
});
test('payload and safe URL bounds reject invalid requests before database writes',async()=>{
 const h=harness();assert.equal((await h.send('x'.repeat(100001))).status,413);
 assert.equal((await h.send('bad json')).status,400);assert.equal((await h.send({action:'list'},{contentType:'text/plain'})).status,415);
 assert.throws(()=>editorialPatch({media:{type:'image',url:'http://example.com/p.png'}}));
 assert.throws(()=>editorialPatch({sources:['https://user:password@example.com']}));
 assert.throws(()=>editorialPatch({sources:['javascript:alert(1)']}));
 assert.throws(()=>editorialPatch({constructor:'anything'}));
 assert.equal(h.calls.filter(c=>c[0]==='rpc').length,0);
});
test('database conflicts stay safe and do not disclose SQL details',async()=>{
 const common={action:'approve',story_id:storyId,expected_revision:2};
 for(const [rpcError,status,error]of [['revision_conflict',409,'revision_conflict'],['story_not_found',404,'story_not_found'],['sensitive table details',503,'newsroom_action_unavailable']]){
  const res=await harness({rpcError}).send(common);assert.equal(res.status,status);assert.equal(res.body.error,error);
 }
});
test('workforce takes persisted story, checks revisions and returns draft without writes',async()=>{
 const input={action:'workforce',story_id:storyId,expected_revision:2,request_id:requestId,stage:'social'};
 const h=harness();const res=await h.send(input);assert.equal(res.status,200);assert.equal(res.body.approval_required,true);assert.equal(res.body.story_id,storyId);assert.equal(res.body.story_revision,2);
 assert.equal(h.calls.filter(c=>c[0]==='rpc').length,0);assert.equal(h.calls.find(c=>c[0]==='workforce')[1].story.id,storyId);
 const stale=harness();assert.equal((await stale.send({...input,expected_revision:1})).status,409);assert.equal(stale.calls.filter(c=>c[0]==='workforce').length,0);
 assert.equal((await h.send({...input,request_id:''})).status,422);assert.equal((await h.send({...input,story:{verified:true}})).status,422);
 assert.equal((await harness({providerError:{status:503,code:'workforce_not_configured'}}).send(input)).body.error,'workforce_not_configured');
});
