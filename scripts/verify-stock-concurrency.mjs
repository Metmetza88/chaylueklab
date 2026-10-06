// Real concurrent PostgreSQL sessions in an isolated Docker test container only.
// docker run --rm -d --name chaylueklab-stock-postgres-check -e POSTGRES_PASSWORD=local-stock-fixture-only postgres:16.13-alpine
// STOCK_POSTGRES_CONTAINER=chaylueklab-stock-postgres-check node scripts/verify-stock-concurrency.mjs
// Remove the container afterward. Never point this fixture runner at production.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const container=process.env.STOCK_POSTGRES_CONTAINER;
if(!container || !/^chaylueklab-stock-[a-z0-9-]+$/.test(container)) throw new Error('Set STOCK_POSTGRES_CONTAINER to an isolated chaylueklab-stock-* Docker container');
const migrations=new URL('../supabase/migrations/',import.meta.url);
const names=(await readdir(migrations)).filter(x=>x.endsWith('_stock_backoffice.sql'));
assert.equal(names.length,1);
function query(sql,name='stock-check-observer',onOutput){
 const child=spawn('docker',['exec','-i','-e',`PGAPPNAME=${name}`,container,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{stdio:['pipe','pipe','pipe']});
 let stdout='',stderr='';
 child.stdout.on('data',chunk=>{stdout+=chunk;onOutput?.(stdout)});child.stderr.on('data',chunk=>stderr+=chunk);
 const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}))});
 child.stdin.end(sql);return done;
}
async function must(sql){const r=await query(sql);assert.equal(r.code,0,r.stderr);return r.stdout.trim()}
const literal=value=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
const owner={line_user_id:`U${'1'.repeat(32)}`,display_name:'เจ้าของทดสอบ',is_app_owner:true};
const staff={line_user_id:`U${'2'.repeat(32)}`,display_name:'พนักงานทดสอบ',is_app_owner:false};
const rpc=(action,actor,input={})=>`select public.stock_action('${action}',${literal(actor)},${literal(input)});`;
const run=async(action,actor,input={})=>JSON.parse((await must('set role service_role;'+rpc(action,actor,input))).split('\n').find(line=>line.startsWith('{')));
const objects=r=>r.stdout.split('\n').filter(x=>x.startsWith('{')).map(x=>JSON.parse(x));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function heldRace(firstSql,secondSql,label){
 let sawFirst;const ready=new Promise(resolve=>sawFirst=resolve);
 const first=query('begin;set local role service_role;'+firstSql+'select pg_sleep(1);commit;',`stock-check-${label}-A`,output=>{if(output.split('\n').some(line=>line.startsWith('{')))sawFirst()});
 await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('First session did not acquire locks')),5000))]);
 const second=query('set role service_role;'+secondSql,`stock-check-${label}-B`);
 let locked=false;
 for(let i=0;i<10;i++){
  const count=await must(`select count(*) from pg_stat_activity where application_name='stock-check-${label}-B' and wait_event_type='Lock';`);
  if(Number(count)>0){locked=true;break}await pause(20);
 }
 assert.equal(locked,true,`${label}: second real session must wait on a database lock`);
 return Promise.all([first,second]);
}
assert.equal(await must("select count(*) from pg_class where relnamespace='public'::regnamespace and relname like 'stock_%';"),'0','Fixture database must be empty');
await must('create role anon;create role authenticated;create role service_role bypassrls;');
await must(await readFile(new URL(names[0],migrations),'utf8'));
for(const name of (await readdir(migrations)).filter(name=>name.endsWith('_stock_foreign_key_indexes.sql')).sort()){
 await must(await readFile(new URL(name,migrations),'utf8'));
}
await run('snapshot',owner);await run('join',staff);
await run('member_update',owner,{request_id:randomUUID(),member_line_user_id:staff.line_user_id,status:'ACTIVE',role:'STAFF'});
const variant=(await run('product_create',owner,{request_id:randomUUID(),name:'สินค้าทดสอบหลายเครื่อง',sku:'RACE-XL',color:'กรม',size:'XL',initial_quantity:5})).variant;
const sale={request_id:randomUUID(),variant_id:variant.id,type:'OUT',quantity:3,sales_channel:'STORE'};
let [a,b]=await heldRace(rpc('transaction',staff,sale),rpc('transaction',staff,{...sale,request_id:randomUUID(),sales_channel:'LINE'}),'oversell');
assert.equal(a.code,0,a.stderr);assert.equal(b.code,3);assert.match(b.stderr,/insufficient_stock/);
assert.equal((await run('snapshot',owner)).variants[0].stock_quantity,2);
assert.equal((await run('history',owner,{days:1})).transactions.filter(t=>t.type==='OUT').length,1);
console.log('ok 1 - real row-lock contention: stock 5, OUT 3 + OUT 3, one sale succeeds, remaining 2');
const refill={request_id:randomUUID(),variant_id:variant.id,type:'IN',quantity:4};
[a,b]=await heldRace(rpc('transaction',staff,refill),rpc('transaction',staff,refill),'idempotency');
assert.equal(a.code,0,a.stderr);assert.equal(b.code,0,b.stderr);
assert.equal(objects(a)[0].transaction.id,objects(b)[0].transaction.id);assert.equal(objects(b)[0].replayed,true);
assert.equal((await run('snapshot',owner)).variants[0].stock_quantity,6);
console.log('ok 2 - real advisory-lock contention: same request commits once and replays one receipt');
const before=(await run('snapshot',owner)).variants[0];
[a,b]=await heldRace(rpc('transaction',staff,{...refill,request_id:randomUUID(),quantity:1}),rpc('transaction',owner,{request_id:randomUUID(),variant_id:variant.id,type:'ADJUST',stock_quantity:3,expected_revision:before.revision}),'revision');
assert.equal(a.code,0,a.stderr);assert.equal(b.code,3);assert.match(b.stderr,/revision_conflict/);
assert.equal((await run('snapshot',owner)).variants[0].stock_quantity,7);
console.log('ok 3 - concurrent receive prevents stale counted-stock overwrite');
[a,b]=await heldRace(rpc('transaction',staff,{...sale,request_id:randomUUID(),quantity:1}),rpc('member_update',owner,{request_id:randomUUID(),member_line_user_id:staff.line_user_id,status:'REVOKED',role:'STAFF'}),'revocation');
assert.equal(a.code,0,a.stderr);assert.equal(b.code,0,b.stderr);
const denied=await query('set role service_role;'+rpc('transaction',staff,{...sale,request_id:randomUUID(),quantity:1}));
assert.equal(denied.code,3);assert.match(denied.stderr,/permission_denied/);
assert.equal((await run('snapshot',owner)).variants[0].stock_quantity,6);
console.log('ok 4 - revocation waits for authorized transaction then blocks further writes');
console.log('Passed 4 real multi-session PostgreSQL checks. No production connection or credentials used.');
