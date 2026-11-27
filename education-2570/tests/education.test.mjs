import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,SCHOOL,OTHER,env} from './helpers.mjs';
import {modules,categories} from '../src/catalog.mjs';
import {validateQuotation,pagination,requireMembership,DisabledAiAdapter} from '../lib/platform-core.mjs';
import {generateQuestions,scoreAnswers} from '../modules/demos.mjs';
import {toCsv} from '../src/api-client.mjs';
test('catalog covers 14 categories; only real demos have trial links; no unapproved prices',()=>{
 assert.equal(categories.length,14);assert.equal(modules.length,17);
 for(const module of modules){assert.equal(module.priceMode,'quotation');assert.equal('price' in module,false);assert.ok(categories.some(c=>c.slug===module.category));assert.ok(module.image&&module.features.length&&module.benefits.length&&module.steps.length);assert.equal(!!module.demo,module.status==='trial');}
});
test('quotation validates module registry, strips supplied prices and deduplicates',()=>{
 const clean=validateQuotation({school_id:SCHOOL,modules:['smart-exam','smart-exam'],note:' Test ',price:1,status:'approved'});
 assert.deepEqual(clean,{school_id:SCHOOL,module_slugs:['smart-exam'],note:'Test'});
 assert.throws(()=>validateQuotation({school_id:SCHOOL,modules:['fake']}));assert.throws(()=>validateQuotation({school_id:1,modules:[]}));
});
test('pagination rejects injection, negative and unbounded pages',()=>{
 assert.deepEqual(pagination({page:2}),{limit:'25',offset:'25'});
 for(const page of [-1,0,'or(id.eq.1)',10001,1.5])assert.throws(()=>pagination({page}));
});
test('membership requires selected school and administrator for admin-only work',()=>{
 assert.throws(()=>requireMembership([{school_id:SCHOOL,role:'teacher'}],OTHER));
 assert.throws(()=>requireMembership([{school_id:SCHOOL,role:'teacher'}],SCHOOL,true));
});
test('AI adapter is disabled and makes no paid calls',async()=>{const adapter=new DisabledAiAdapter();assert.equal(adapter.status.connected,false);await assert.rejects(adapter.generate(),/ยังไม่เชื่อม AI/);});
test('old exam generation and scoring remain functional',()=>{
 const qs=generateQuestions(5);assert.equal(qs.length,5);assert.equal(scoreAnswers(qs.map(q=>q.answer)),5);assert.equal(scoreAnswers(qs.map(()=>'')),0);assert.equal(generateQuestions(100).length,30);
});
test('CSV escapes spreadsheet formulas, quotes and Thai text',()=>{assert.match(toCsv([['=1+1','"ไทย"',' safe']]),/"'=1\+1","""ไทย"""," safe"/);});
test('public catalog/config work even without backend configuration',async()=>{
 const h=harness({config:{}});assert.equal((await h.run('catalog')).data.modules.length,17);assert.equal((await h.run('config')).data.authConfigured,false);assert.equal((await h.run('me')).code,503);assert.equal(h.calls.length,0);
});
test('login creates Secure HttpOnly SameSite cookie, caps expiry, does not return token',async()=>{
 const h=harness();const result=await h.run('login',{method:'POST',body:{email:'staff@example.test',password:' with spaces '}});
 assert.equal(result.code,200);assert.deepEqual(result.data,{signedIn:true});assert.match(result.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict; Max-Age=3600/);assert.equal(JSON.parse(h.calls[0].body).password,' with spaces ');
});
test('logout clears cookie and revokes provider session',async()=>{
 const h=harness();const result=await h.run('logout',{method:'POST',body:{}});assert.equal(result.code,200);assert.match(result.headers['Set-Cookie'],/Max-Age=0/);assert.ok(h.calls[0].url.endsWith('/auth/v1/logout'));
});
test('API validates JWT at auth endpoint and forwards same token with schema profile',async()=>{
 const h=harness();const result=await h.run('workspace',{query:{school_id:SCHOOL}});assert.equal(result.code,200);
 assert.equal(h.calls[0].headers.Authorization,'Bearer jwt.test.token');assert.equal(h.calls[1].headers['Accept-Profile'],'education_2570');assert.ok(h.calls.every(c=>c.headers.Authorization==='Bearer jwt.test.token'));
});
test('quote is persisted without price and success returned only from DB',async()=>{
 const h=harness();const result=await h.run('quotation',{method:'POST',body:{school_id:SCHOOL,modules:['exam-studio'],note:'needs',price:0}});
 assert.equal(result.code,201);const call=h.calls.at(-1);assert.equal(call.method,'POST');assert.equal(call.headers['Content-Profile'],'education_2570');assert.equal('price' in JSON.parse(call.body),false);assert.equal(result.data[0].id,OTHER);
});
test('admin API rejects school admin without platform admin grant',async()=>{
 assert.equal((await harness().run('admin')).code,403);assert.equal((await harness({admin:true}).run('admin')).code,200);
});
test('backend and disabled platform errors are visible and sanitized',async()=>{
 assert.equal((await harness({config:{...env,EDU_PLATFORM_ENABLED:'false'}}).run('workspace',{query:{school_id:SCHOOL}})).code,503);
 const h=harness({fetchImpl:async()=>{throw new Error('sensitive internal detail');}});const result=await h.run('me');assert.equal(result.code,503);assert.ok(!JSON.stringify(result.data).includes('sensitive'));
});
test('customer profile persists only current authenticated identity',async()=>{
 const h=harness();const result=await h.run('customer-profile',{method:'POST',body:{school_id:SCHOOL,contact_name:' คุณครูทดสอบ ',user_id:OTHER}});
 assert.equal(result.code,200);assert.equal(result.data[0].user_id,'20000000-0000-4000-8000-000000000001');assert.equal(result.data[0].contact_name,'คุณครูทดสอบ');
});
