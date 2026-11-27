import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir,mkdir,writeFile } from 'node:fs/promises';
import pg from 'pg';
const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002';
const U1='20000000-0000-4000-8000-000000000001',U2='20000000-0000-4000-8000-000000000002',ADMIN='20000000-0000-4000-8000-000000000003';
/** ใช้เฉพาะฐานข้อมูลทดสอบท้องถิ่น และไม่รับ URL ของ Production */
test('PostgreSQL migration, RLS, constraints and query plans on local fixture',async t=>{
 const connectionString=process.env.TEST_DATABASE_URL??'postgres://postgres:local-test-only@127.0.0.1:55470/postgres';
 const url=new URL(connectionString);
 if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='55470'||url.pathname!=='/postgres')throw new Error('Dedicated localhost:55470/postgres test DB only');
 const client=new pg.Client({connectionString});await client.connect();
 const q=(sql,values)=>client.query(sql,values);
 const asUser=async(user,sql,values)=>{
  await q('set role authenticated');await q("select set_config('request.jwt.claim.sub',$1,false)",[user]);
  try{return await q(sql,values);}finally{await q('reset role');await q("select set_config('request.jwt.claim.sub','',false)");}
 };
 try {
  // รีเซ็ตเฉพาะฐานข้อมูลทดสอบ localhost เพื่อให้รันทดสอบซ้ำได้
  await q('drop schema if exists education_2570 cascade; drop schema if exists auth cascade; drop table if exists public.education_test_sentinel;');
  await q("do $$ begin if exists(select 1 from pg_roles where rolname='authenticated') then drop owned by authenticated; drop role authenticated; end if; if exists(select 1 from pg_roles where rolname='anon') then drop owned by anon; drop role anon; end if; end $$;");
  await q(await readFile(new URL('./baseline.sql',import.meta.url),'utf8'));
  await q(await readFile(new URL('../../sql/education_2570_fk_indexes.sql',import.meta.url),'utf8'));
  const before=(await q("select indexname,indexdef from pg_indexes where schemaname='education_2570' order by indexname")).rows;
  const path=new URL('../../supabase/migrations/',import.meta.url);
  const migration=(await readdir(path)).find(f=>f.endsWith('_platform_phase_a.sql'));
  await q(await readFile(new URL(migration,path),'utf8'));
  await t.test('preserves all ten original tables, indexes and outside-schema sentinel',async()=>{
   const after=(await q("select indexname,indexdef from pg_indexes where schemaname='education_2570' order by indexname")).rows;
   assert.ok(before.every(i=>after.some(j=>i.indexname===j.indexname&&i.indexdef===j.indexdef)));
   assert.equal((await q('select value from public.education_test_sentinel')).rows[0].value,'preserve outside schema');
   assert.equal((await q("select count(*)::int n from pg_tables where schemaname='education_2570'")).rows[0].n,21);
  });
  await t.test('all 21 tables have RLS and public sees only published catalog',async()=>{
   assert.equal((await q("select count(*)::int n from pg_tables where schemaname='education_2570' and not rowsecurity")).rows[0].n,0);
   assert.equal((await q("select has_table_privilege('anon','education_2570.platform_admins','INSERT') allowed")).rows[0].allowed,false);
   assert.equal((await q("select has_function_privilege('anon','education_2570.can_use_module(uuid,text)','EXECUTE') allowed")).rows[0].allowed,false);
   await q('set role anon');
   assert.equal((await q('select count(*)::int n from education_2570.software_modules')).rows[0].n,17);
   await assert.rejects(q('select * from education_2570.quotation_requests'),/permission denied/);
   await q('reset role');
  });
  let quoteId;
  await t.test('member can create own quotation; audit and notification are atomic',async()=>{
   const result=await asUser(U1,'insert into education_2570.quotation_requests(school_id,created_by,module_slugs) values($1,$2,$3) returning id',[A,U1,['exam-studio']]);quoteId=result.rows[0].id;
   assert.equal((await asUser(U1,'select * from education_2570.notifications')).rowCount,1);
   assert.equal((await q("select * from education_2570.audit_logs where table_name='quotation_requests'")).rowCount,1);
  });
  await t.test('school B cannot read school A quotations, services, customers, licenses or audit',async()=>{
   for(const table of ['quotation_requests','service_requests','customers','licenses','school_module_entitlements','audit_logs','school_subscriptions','notifications'])assert.equal((await asUser(U2,'select * from education_2570.'+table+' where school_id=$1',[A])).rowCount,0);
  });
  await t.test('teachers and students cannot read another person’s request or school audit',async()=>{
   const teacher='20000000-0000-4000-8000-000000000009';
   const student='20000000-0000-4000-8000-000000000010';
   await q("insert into education_2570.members(school_id,user_id,role) values ($1,$2,'teacher'),($1,$3,'student')",[A,teacher,student]);
   assert.equal((await asUser(teacher,'select id from education_2570.quotation_requests where id=$1',[quoteId])).rowCount,0);
   assert.equal((await asUser(student,'select id from education_2570.quotation_requests where id=$1',[quoteId])).rowCount,0);
   assert.equal((await asUser(teacher,'select id from education_2570.audit_logs where school_id=$1',[A])).rowCount,0);
   const service=await asUser(student,'insert into education_2570.service_requests(school_id,created_by,subject,description) values ($1,$2,$3,$4) returning id',[A,student,'Test topic','Test body']);
   assert.equal(service.rowCount,1);
   assert.equal((await asUser(teacher,'select id from education_2570.service_requests where id=$1',[service.rows[0].id])).rowCount,0);
   assert.equal((await asUser(U1,'select id from education_2570.service_requests where id=$1',[service.rows[0].id])).rowCount,1);
  });
  await t.test('cross-school writes, forged author, unknown module and self-escalation are denied',async()=>{
   await assert.rejects(asUser(U2,'insert into education_2570.quotation_requests(school_id,created_by,module_slugs) values($1,$2,$3)',[A,U2,['exam-studio']]),/row-level security/);
   await assert.rejects(asUser(U1,'insert into education_2570.quotation_requests(school_id,created_by,module_slugs) values($1,$2,$3)',[A,U2,['exam-studio']]),/row-level security/);
   await assert.rejects(asUser(U1,'insert into education_2570.quotation_requests(school_id,created_by,module_slugs) values($1,$2,$3)',[A,U1,['unknown']]),/Unknown module/);
   await assert.rejects(asUser(U1,'insert into education_2570.platform_admins(user_id) values($1)',[U1]),/permission denied/);
   await assert.rejects(asUser(U1,"update education_2570.members set role='admin'"),/permission denied/);
   await assert.rejects(asUser(U1,"update education_2570.quotation_requests set status='responded' where id=$1",[quoteId]),/permission denied/);
  });
  await t.test('notification updates limited to own read_at; audit cannot be forged',async()=>{
   const id=(await asUser(U1,'select id from education_2570.notifications')).rows[0].id;
   assert.equal((await asUser(U2,'update education_2570.notifications set read_at=now() where id=$1 returning id',[id])).rowCount,0);
   assert.equal((await asUser(U1,'update education_2570.notifications set read_at=now() where id=$1 returning id',[id])).rowCount,1);
   await assert.rejects(asUser(U1,"update education_2570.notifications set user_id=$1 where id=$2",[U2,id]),/permission denied/);
   await assert.rejects(asUser(U1,"insert into education_2570.audit_logs(action,table_name,record_id) values('INSERT','forged',gen_random_uuid())"),/permission denied/);
   await assert.rejects(asUser(U1,'select education_2570.record_platform_change()'),/permission denied/);
  });
  await q('insert into education_2570.platform_admins(user_id) values($1)',[ADMIN]);
  let subscription,license,entitlement;
  await t.test('only platform admin can provision license and entitlement',async()=>{
   subscription=(await asUser(ADMIN,"insert into education_2570.school_subscriptions(school_id,expires_at) values($1,now()+interval '1 year') returning id",[A])).rows[0].id;
   license=(await asUser(ADMIN,"insert into education_2570.licenses(school_id,subscription_id,module_slug,expires_at) values($1,$2,'exam-studio',now()+interval '1 year') returning id",[A,subscription])).rows[0].id;
   entitlement=(await asUser(ADMIN,"insert into education_2570.school_module_entitlements(school_id,module_slug,license_id,expires_at) values($1,'exam-studio',$2,now()+interval '1 year') returning id",[A,license])).rows[0].id;
   assert.equal((await asUser(U1,'select * from education_2570.licenses')).rowCount,1);
   assert.equal((await asUser(U2,'select * from education_2570.licenses')).rowCount,0);
   assert.equal((await asUser(U1,"update education_2570.school_module_entitlements set status='suspended' where id=$1 returning id",[entitlement])).rowCount,0);
   await assert.rejects(asUser(ADMIN,"insert into education_2570.school_module_entitlements(school_id,module_slug,license_id,expires_at) values($1,'exam-studio',$2,now()+interval '1 year')",[B,license]),/foreign key/);
  });
  await t.test('trial module never grants real usage; flag, expiry and revocation enforced',async()=>{
   const can=async()=> (await asUser(U1,"select education_2570.can_use_module($1,'exam-studio') allowed",[A])).rows[0].allowed;
   assert.equal(await can(),false);
   await asUser(ADMIN,"update education_2570.software_modules set enabled=true where slug='exam-studio'");
   assert.equal(await can(),false);
   await assert.rejects(asUser(ADMIN,"update education_2570.software_modules set status='ready' where slug='exam-studio'"),/permission denied/);
   // Only the test owner changes status to exercise the future module gate.
   await q("update education_2570.software_modules set status='ready' where slug='exam-studio'");
   assert.equal(await can(),true);
   assert.equal((await asUser(U2,"select education_2570.can_use_module($1,'exam-studio') allowed",[A])).rows[0].allowed,false);
   await asUser(ADMIN,"update education_2570.licenses set status='revoked' where id=$1",[license]);assert.equal(await can(),false);
   await asUser(ADMIN,"update education_2570.licenses set status='active',expires_at=now()-interval '1 day' where id=$1",[license]);assert.equal(await can(),false);
   await asUser(ADMIN,"update education_2570.licenses set expires_at=now()+interval '1 year' where id=$1",[license]);
   await asUser(ADMIN,"update education_2570.school_subscriptions set status='suspended' where id=$1",[subscription]);assert.equal(await can(),false);
  });
  await t.test('provision RPC is atomic, rejects ordinary users and rolls back duplicate grants',async()=>{
   await assert.rejects(asUser(U1,"select * from education_2570.provision_school_module($1,'smart-exam',now()+interval '1 year')",[A]),/Platform admin required/);
   const provisioned=await asUser(ADMIN,"select * from education_2570.provision_school_module($1,'smart-exam',now()+interval '1 year')",[A]);
   assert.equal(provisioned.rowCount,1);
   const before=(await q('select count(*)::int n from education_2570.licenses')).rows[0].n;
   await assert.rejects(asUser(ADMIN,"select * from education_2570.provision_school_module($1,'smart-exam',now()+interval '1 year')",[A]),/unique constraint/);
   assert.equal((await q('select count(*)::int n from education_2570.licenses')).rows[0].n,before);
   await assert.rejects(asUser(ADMIN,"select * from education_2570.provision_school_module($1,'smart-certificate',now()-interval '1 day')",[A]),/Invalid expiry/);
  });
  await t.test('customer can only update own contact name and student cannot request a quote',async()=>{
   const contact=await asUser(U1,'insert into education_2570.customers(school_id,user_id,contact_name) values($1,$2,$3) returning id',[A,U1,'Teacher A']);
   const id=contact.rows[0].id;
   assert.equal((await asUser(U2,"update education_2570.customers set contact_name='Forged' where id=$1 returning id",[id])).rowCount,0);
   await assert.rejects(asUser(U1,'update education_2570.customers set school_id=$1 where id=$2',[B,id]),/permission denied/);
   const student='20000000-0000-4000-8000-000000000004';
   await q("insert into education_2570.members(school_id,user_id,role) values($1,$2,'student')",[A,student]);
   await assert.rejects(asUser(student,"insert into education_2570.quotation_requests(school_id,created_by,module_slugs) values($1,$2,$3)",[A,student,['exam-studio']]),/row-level security/);
  });
  await t.test('all foreign keys have leading indexes and paginated query can use index',async()=>{
   const unindexed=await q(`select c.conname from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where c.contype='f' and n.nspname='education_2570' and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid and (i.indkey::smallint[])[0:cardinality(c.conkey)-1] @> c.conkey)`);
   assert.deepEqual(unindexed.rows,[]);
   await q('set enable_seqscan=off');
   const explain=(await q('explain (format json) select id from education_2570.quotation_requests where school_id=$1 order by created_at desc limit 25',[A])).rows;
   await q('reset enable_seqscan');
   assert.match(JSON.stringify(explain),/edu2570_quotation_school_recent_idx/);
   await mkdir(new URL('../../evidence/',import.meta.url),{recursive:true});
   await writeFile(new URL('../../evidence/query-plan.json',import.meta.url),JSON.stringify({scope:'LOCAL FIXTURE ONLY; seqscan disabled to verify index eligibility, not a production performance benchmark',plan:explain},null,2)+'\n');
  });
 } finally {await client.end();}
});
