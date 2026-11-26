import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,SCHOOL,OTHER,env} from './helpers.mjs';
import {createDatabase} from '../lib/supabase-client.mjs';
import {esc} from '../src/views.mjs';
import {securityHeaders} from '../scripts/security-headers.mjs';
test('CSRF: POST requires exact configured Origin and application/json',async()=>{
 for(const headers of [{origin:'https://attacker.test'},{origin:''},{'content-type':'text/plain'}]){
  const h=harness();const result=await h.run('quotation',{method:'POST',body:{school_id:SCHOOL,modules:['exam-studio']},headers});assert.ok([403,415].includes(result.code));assert.equal(h.calls.length,0);
 }
});
test('anonymous, Bearer-only and malformed sessions cannot read school data',async()=>{
 for(const cookie of ['', '__Host-edu_session=bad<script>', 'other=session']){
  const h=harness();assert.equal((await h.run('me',{headers:{cookie,authorization:'Bearer forged'}})).code,401);assert.equal(h.calls.length,0);
 }
});
test('cross-school API reads/writes fail before accessing tenant records',async()=>{
 for(const [action,method]of [['workspace','GET'],['quotations','GET'],['quotation','POST'],['service','POST']]){
  const h=harness();const result=await h.run(action,{method,query:{school_id:OTHER},body:method==='POST'?{school_id:OTHER,modules:['exam-studio']}:undefined});assert.equal(result.code,403);assert.equal(h.calls.length,2);
 }
});
test('no arbitrary actions, method override, oversized body or PostgREST injection',async()=>{
 assert.equal((await harness().run('drop-table')).code,405);
 assert.equal((await harness().run('login')).code,405);
 assert.equal((await harness().run('login',{method:'POST',body:{password:'x'.repeat(13000)}})).code,413);
 assert.equal((await harness().run('workspace',{query:{school_id:'x&or=(id.gt.0)'}})).code,400);
});
test('Supabase destination pinned to authorized project; no SSRF or service role',()=>{
 for(const url of ['http://localhost','https://attacker.test','https://yobymeygbfiwlngmwjcn.supabase.co.attacker.test'])assert.throws(()=>createDatabase({env:{...env,EDU_SUPABASE_URL:url}}));
});
test('HTML output escapes hostile customer inputs and CSP blocks remote scripts',()=>{
 assert.equal(esc('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;');
 assert.match(securityHeaders['Content-Security-Policy'],/script-src 'self';/);assert.match(securityHeaders['Content-Security-Policy'],/frame-ancestors 'none'/);
});
test('invalid auth never proceeds to the database; no cache for private API',async()=>{
 const h=harness({fetchImpl:async()=>({ok:false,status:401})});const result=await h.run('workspace',{query:{school_id:SCHOOL}});
 assert.equal(result.code,401);assert.equal(h.calls.length,1);assert.equal(result.headers['Cache-Control'],'no-store');
});
test('student cannot request quotation or provision a license',async()=>{
 assert.equal((await harness({memberRole:'student'}).run('quotation',{method:'POST',body:{school_id:SCHOOL,modules:['smart-exam']}})).code,403);
 assert.equal((await harness().run('provision',{method:'POST',body:{school_id:SCHOOL,module_slug:'smart-exam',expires_on:'2027-12-01'}})).code,403);
});
test('client rejects secret and service-role keys even in server config',()=>{
 const legacy='e30.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature';
 for(const key of ['sb_secret_test_only',legacy])assert.throws(()=>createDatabase({env:{...env,EDU_SUPABASE_PUBLISHABLE_KEY:key}}),/Publishable Key/);
});
