#!/usr/bin/env node
// Execute the actual migration and RPC using isolated, in-memory Postgres.
// Install outside the application:
// npm install --prefix /tmp/chaylueklab-stock-sql @electric-sql/pglite@0.5.8
// STOCK_PGLITE_MODULE=/tmp/chaylueklab-stock-sql/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-stock-sql.mjs
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createStockHandler} from '../supabase/functions/stock/core.ts';

const moduleName=process.env.STOCK_PGLITE_MODULE || '@electric-sql/pglite';
let PGlite;
try { ({PGlite}=await import(isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName)); }
catch { console.error('Install @electric-sql/pglite@0.5.8 outside the app and set STOCK_PGLITE_MODULE to its dist/index.js (see this script).'); process.exit(1); }
const migrations=new URL('../supabase/migrations/',import.meta.url);
const files=(await readdir(migrations)).filter(name=>name.endsWith('_stock_backoffice.sql'));
assert.equal(files.length,1,'Exactly one stock_backoffice migration must exist');
const db=new PGlite();
let passed=0;
const owner={line_user_id:`U${'1'.repeat(32)}`,display_name:'เจ้าของร้าน',is_app_owner:true};
const staff={line_user_id:`U${'2'.repeat(32)}`,display_name:'พนักงาน',is_app_owner:false};
const other={line_user_id:`U${'3'.repeat(32)}`,display_name:'ผู้ใช้อีกคน',is_app_owner:false};
const trustedOther={...other,is_app_owner:true};
const run=async(action,actor,input={})=>(await db.query('select public.stock_action($1,$2::jsonb,$3::jsonb) as result',
  [action,JSON.stringify(actor),JSON.stringify(input)])).rows[0].result;
const fail=async(action,actor,input,code)=>assert.rejects(()=>run(action,actor,input),e=>e.message===code && e.code==='P0001',`${action} should reject ${code}`);
const check=async(name,fn)=>{await fn();passed++;console.log(`ok ${passed} - ${name}`);};
const fixture=async(fn)=>{await db.exec('reset role');try{return await fn();}finally{await db.exec('set role service_role');}};
let shop,variant,created,winningInput,winningTxn,adjusted,secondShop,secondVariant;
try {
  // Include Supabase-style default grants to verify that the migration removes them.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
  await db.exec(await readFile(new URL(files[0],migrations),'utf8'));
  for (const name of (await readdir(migrations)).filter(name=>name.endsWith('_stock_foreign_key_indexes.sql')).sort()) {
    await db.exec(await readFile(new URL(name,migrations),'utf8'));
  }
  await db.exec('set role service_role');

  await check('schema is empty; nonowner snapshot does not invent a shop',async()=>{
    const initial=await run('snapshot',staff);
    assert.equal(initial.shop,null);assert.equal(initial.user.role,'NONE');assert.deepEqual(initial.variants,[]);
    assert.equal(initial.summary.sold_today,0);
    const count=await db.query('select count(*)::integer n from public.stock_shops');assert.equal(count.rows[0].n,0);
    await fail('join',staff,{},'shop_not_found');
  });
  await check('all stock tables have RLS; only service SELECT and RPC EXECUTE remain',async()=>{
    const names=['stock_shops','stock_shop_members','stock_products','stock_variants','stock_transactions','stock_requests'];
    for(const name of names){
      const r=await db.query(`select c.relrowsecurity as rls,has_table_privilege('service_role',c.oid,'SELECT') as service_read,
        has_table_privilege('service_role',c.oid,'INSERT') as service_write,
        has_table_privilege('anon',c.oid,'SELECT') as anon_read,has_table_privilege('authenticated',c.oid,'SELECT') as auth_read
        from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1`,[name]);
      assert.deepEqual(r.rows[0],{rls:true,service_read:true,service_write:false,anon_read:false,auth_read:false});
    }
    const r=await db.query(`select prosecdef,proconfig,
      has_function_privilege('anon',oid,'EXECUTE') anon_exec,
      has_function_privilege('authenticated',oid,'EXECUTE') auth_exec
      from pg_proc where oid='public.stock_action(text,jsonb,jsonb)'::regprocedure`);
    assert.equal(r.rows[0].prosecdef,true);assert.ok(r.rows[0].proconfig.includes('search_path=""'));
    assert.equal(r.rows[0].anon_exec,false);assert.equal(r.rows[0].auth_exec,false);
    for(const role of ['anon','authenticated']){
      await db.exec(`set role ${role}`);
      await assert.rejects(()=>run('snapshot',owner),e=>e.code==='42501');
      await assert.rejects(()=>db.query('select * from public.stock_variants'),e=>e.code==='42501');
    }
    await db.exec('reset role');
    await assert.rejects(()=>run('snapshot',owner),e=>e.code==='42501' && e.message==='service_role_required');
    await db.exec('set role service_role');
    await assert.rejects(()=>db.query("insert into public.stock_shops(slug,name) values('direct','forbidden')"),e=>e.code==='42501');
  });
  await check('only verified app owner bootstraps persisted main owner once',async()=>{
    const first=await run('snapshot',owner);shop=first.shop;
    assert.ok(shop.id);assert.equal(shop.default_threshold,3);assert.equal(first.user.role,'OWNER');
    assert.equal(first.user.status,'ACTIVE');assert.deepEqual(first.variants,[]);
    const again=await run('snapshot',owner);assert.equal(again.shop.id,shop.id);
    const second=await run('snapshot',trustedOther);assert.equal(second.user.role,'NONE');
    assert.equal((await run('members',owner)).members.filter(m=>m.role==='OWNER').length,1);
    await fail('members',trustedOther,{},'permission_denied');
    await fail('snapshot',owner,{shop_slug:'missing'},'shop_not_found');
  });
  await check('joining is PENDING and exposes no inventory; owner approves staff',async()=>{
    const joined=await run('join',staff);assert.equal(joined.user.role,'PENDING');assert.equal(joined.user.status,'PENDING');
    assert.equal((await run('join',staff)).user.status,'PENDING');
    assert.deepEqual((await run('snapshot',staff)).variants,[]);
    await fail('members',staff,{},'permission_denied');await fail('history',staff,{days:1},'permission_denied');
    const approved=await run('member_update',owner,{request_id:randomUUID(),member_line_user_id:staff.line_user_id,status:'ACTIVE',role:'STAFF'});
    assert.equal(approved.user.status,'ACTIVE');assert.equal(approved.user.role,'STAFF');
    assert.equal((await run('snapshot',staff)).user.role,'STAFF');
    assert.equal((await run('snapshot',{...staff,display_name:'ชื่อ LINE ล่าสุด'})).user.display_name,'ชื่อ LINE ล่าสุด');
    await fail('member_update',owner,{request_id:randomUUID(),member_line_user_id:owner.line_user_id,status:'REVOKED'},'permission_denied');
    await fail('member_update',staff,{request_id:randomUUID(),member_line_user_id:other.line_user_id,status:'ACTIVE'},'permission_denied');
  });
  await check('catalog records real initial IN snapshots and actor; staff cannot edit catalog',async()=>{
    const input={request_id:randomUUID(),name:'เสื้อทดสอบ',sku:'SHIRT-01',color:'ดำ',size:'M',initial_quantity:5};
    created=await run('product_create',owner,input);variant=created.variant;
    assert.equal(variant.stock_quantity,5);assert.equal(variant.low_stock_threshold,3);assert.equal(variant.revision,1);
    assert.equal(created.transaction.type,'IN');assert.equal(created.transaction.quantity,5);
    assert.equal(created.transaction.before_quantity,0);assert.equal(created.transaction.after_quantity,5);
    assert.equal(created.transaction.line_user_id,owner.line_user_id);assert.equal(created.transaction.display_name,owner.display_name);
    assert.equal(created.transaction.product_name,input.name);assert.equal(created.transaction.sku,input.sku);
    const retry=await run('product_create',owner,input);assert.equal(retry.replayed,true);assert.equal(retry.variant.id,variant.id);
    await fail('product_create',owner,{...input,name:'เปลี่ยนชื่อ'},'request_id_conflict');
    await fail('product_create',owner,{...input,request_id:randomUUID(),sku:'shirt-01'},'duplicate_sku');
    await fail('product_create',staff,{...input,request_id:randomUUID(),sku:'STAFF-SKU'},'permission_denied');
    const sameProduct=await run('product_create',owner,{request_id:randomUUID(),name:input.name,sku:'SHIRT-02',color:'ขาว',size:'L'});
    assert.equal(sameProduct.variant.product_id,variant.product_id);assert.equal(sameProduct.variant.stock_quantity,0);assert.equal(sameProduct.transaction,null);
    assert.equal((await run('snapshot',owner)).summary.out_of_stock_count,1);
  });
  await check('parallel OUT 3 + OUT 3 against stock 5 yields one success, stock 2',async()=>{
    const inputs=[{request_id:randomUUID(),variant_id:variant.id,type:'OUT',quantity:3,sales_channel:'LINE'},
      {request_id:randomUUID(),variant_id:variant.id,type:'OUT',quantity:3,sales_channel:'STORE'}];
    const outcomes=await Promise.allSettled(inputs.map(input=>run('transaction',staff,input)));
    assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
    const winner=outcomes.findIndex(r=>r.status==='fulfilled');winningInput=inputs[winner];winningTxn=outcomes[winner].value.transaction;
    const rejected=outcomes.find(r=>r.status==='rejected');assert.equal(rejected.reason.message,'insufficient_stock');
    const snapshot=await run('snapshot',owner);assert.equal(snapshot.variants.find(v=>v.id===variant.id).stock_quantity,2);
    assert.equal(snapshot.summary.total_stock,2);assert.equal(snapshot.summary.sold_today,3);
    assert.equal(snapshot.summary.low_stock_count,1);assert.equal(snapshot.summary.out_of_stock_count,1);
    assert.equal(snapshot.summary.channels.find(c=>c.sales_channel===winningInput.sales_channel).quantity,3);
    assert.equal(winningTxn.before_quantity,5);assert.equal(winningTxn.after_quantity,2);
  });
  await check('retry returns original transaction; changed retry conflicts; request lookup actor isolated',async()=>{
    const retry=await run('transaction',staff,winningInput);assert.equal(retry.replayed,true);assert.equal(retry.transaction.id,winningTxn.id);
    assert.equal(retry.variant.stock_quantity,2);
    await fail('transaction',staff,{...winningInput,quantity:1},'request_id_conflict');
    const status=await run('request_status',staff,{request_id:winningInput.request_id});assert.equal(status.found,true);assert.equal(status.result.transaction.id,winningTxn.id);
    assert.equal((await run('request_status',owner,{request_id:winningInput.request_id})).found,false);
    assert.equal((await run('request_status',staff,{request_id:randomUUID()})).found,false);
    const rows=await db.query('select count(*)::integer n from public.stock_transactions where request_id=$1',[winningInput.request_id]);assert.equal(rows.rows[0].n,1);
  });
  await check('ADJUST is owner-only and compare-and-swap protects stock revision',async()=>{
    const current=(await run('snapshot',owner)).variants.find(v=>v.id===variant.id);
    const input={request_id:randomUUID(),variant_id:variant.id,type:'ADJUST',stock_quantity:4,expected_revision:current.revision,note:'ตรวจนับจริง'};
    await fail('transaction',staff,input,'permission_denied');
    await fail('transaction',owner,{...input,expected_revision:current.revision-1},'revision_conflict');
    adjusted=await run('transaction',owner,input);assert.equal(adjusted.variant.stock_quantity,4);assert.equal(adjusted.variant.revision,current.revision+1);
    assert.equal(adjusted.transaction.type,'ADJUST');assert.equal(adjusted.transaction.quantity,2);assert.equal(adjusted.transaction.sales_channel,null);
    assert.equal((await run('transaction',owner,input)).replayed,true);
    await fail('transaction',owner,{...input,request_id:randomUUID()},'revision_conflict');
    await fail('transaction',owner,{...input,request_id:randomUUID(),expected_revision:adjusted.variant.revision},'no_change');
    assert.equal((await run('snapshot',owner)).summary.sold_today,3);
  });
  await check('SQL validates independently of API and failed requests do not write receipts',async()=>{
    const invalid=[{quantity:0},{quantity:-1},{quantity:1.5},{quantity:'3'},{quantity:null},{quantity:1000000001},
      {quantity:1,sales_channel:'EMAIL'},{quantity:1,role:'OWNER'},{quantity:1,stock_quantity:0}];
    for(const patch of invalid){const id=randomUUID();await fail('transaction',staff,{...winningInput,request_id:id,...patch},'validation_failed');
      assert.equal((await run('request_status',staff,{request_id:id})).found,false);}
    await fail('transaction',owner,{request_id:randomUUID(),variant_id:variant.id,type:'ADJUST',stock_quantity:-1,expected_revision:adjusted.variant.revision},'validation_failed');
    await fail('product_create',owner,{request_id:randomUUID(),name:'x',sku:'INVALID',initial_quantity:-1},'validation_failed');
    await fail('snapshot',{...staff,is_app_owner:'true'},{},'validation_failed');
    await fail('snapshot',staff,{role:'OWNER'},'validation_failed');
    await fail('history',staff,{days:2},'validation_failed');
  });
  await check('history days and channel filters use Bangkok calendar days',async()=>{
    await fixture(()=>db.query(`update public.stock_transactions set created_at=(date_trunc('day',now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok')-interval '1 second' where id=$1`,[winningTxn.id]));
    const today=await run('history',staff,{days:1});assert.ok(!today.transactions.some(t=>t.id===winningTxn.id));
    const week=await run('history',staff,{days:7,sales_channel:winningInput.sales_channel});
    assert.ok(week.transactions.some(t=>t.id===winningTxn.id));assert.ok(week.transactions.every(t=>t.sales_channel===winningInput.sales_channel));
    assert.equal((await run('snapshot',owner)).summary.sold_today,0);
    const out=await run('transaction',staff,{request_id:randomUUID(),variant_id:variant.id,type:'OUT',quantity:1,sales_channel:'SHOPEE',
      order_reference:'ORDER-LOCAL-FIXTURE',customer_name:'ชื่อลูกค้าทดสอบ',note:'บรรทัดแรก\nบรรทัดสอง\tคำสั่ง'});
    assert.equal(out.transaction.order_reference,'ORDER-LOCAL-FIXTURE');assert.equal(out.transaction.customer_name,'ชื่อลูกค้าทดสอบ');
    assert.equal(out.transaction.note,'บรรทัดแรก\nบรรทัดสอง\tคำสั่ง');
    const current=await run('snapshot',owner);assert.equal(current.summary.sold_today,1);assert.equal(current.summary.channels.find(c=>c.sales_channel==='SHOPEE').quantity,1);
    assert.equal(current.summary.channels.find(c=>c.sales_channel===winningInput.sales_channel).quantity,0);
    assert.ok((await run('history',staff,{days:30})).transactions.some(t=>t.id===out.transaction.id));
  });
  await check('shop role and variant scope cannot be crossed; request namespace includes shop',async()=>{
    secondShop=randomUUID();
    await fixture(()=>db.query(`insert into public.stock_shops(id,slug,name) values($1,'second','ร้านอีกแห่ง')`,[secondShop]));
    await fixture(()=>db.query(`insert into public.stock_shop_members(shop_id,line_user_id,display_name,role,status) values($1,$2,$3,'OWNER','ACTIVE')`,[secondShop,owner.line_user_id,owner.display_name]));
    secondVariant=(await run('product_create',owner,{shop_slug:'second',request_id:randomUUID(),name:'สินค้าอีกแห่ง',sku:'SHIRT-01',color:'น้ำเงิน',size:'L',initial_quantity:7})).variant;
    const staffView=await run('snapshot',staff,{shop_slug:'second'});assert.equal(staffView.user.role,'NONE');assert.deepEqual(staffView.variants,[]);
    await fail('transaction',staff,{...winningInput,shop_slug:'second',request_id:randomUUID(),variant_id:secondVariant.id},'permission_denied');
    await fail('transaction',owner,{...winningInput,request_id:randomUUID(),variant_id:secondVariant.id},'variant_not_found');
    assert.equal((await run('request_status',owner,{shop_slug:'second',request_id:winningInput.request_id})).found,false);
    const result=await run('transaction',owner,{shop_slug:'second',request_id:winningInput.request_id,variant_id:secondVariant.id,type:'OUT',quantity:1,sales_channel:'STORE'});
    assert.equal(result.variant.stock_quantity,6);
    const main=await run('history',owner,{days:30});assert.ok(main.transactions.every(t=>t.shop_id===shop.id));
    const second=await run('history',owner,{shop_slug:'second',days:30});assert.ok(second.transactions.every(t=>t.shop_id===secondShop));
    assert.equal((await run('snapshot',owner,{shop_slug:'second'})).summary.total_stock,6);
  });
  await check('canonical response shapes and server input boundaries match stock API',async()=>{
    const snap=await run('snapshot',owner);assert.ok(Array.isArray(snap.summary.channels));
    assert.deepEqual(snap.summary.channels.map(c=>c.sales_channel),['STORE','LINE','FACEBOOK','TIKTOK','SHOPEE','OTHER']);
    assert.ok(snap.variants.every(v=>Number.isInteger(v.low_stock_threshold)));
    const maxActor={...owner,display_name:'ก'.repeat(200)};
    assert.equal((await run('snapshot',maxActor)).user.display_name.length,200);
    const input={request_id:randomUUID(),name:'น'.repeat(200),sku:'s'.repeat(100),color:'ค'.repeat(100),size:'z'.repeat(50),threshold:0,initial_quantity:0};
    const boundary=await run('product_create',maxActor,input);assert.equal(boundary.variant.product_name.length,200);
    assert.equal(boundary.variant.low_stock_threshold,0);assert.equal(boundary.variant.sku.length,100);
    const incoming=await run('transaction',maxActor,{request_id:randomUUID(),variant_id:boundary.variant.id,type:'IN',quantity:1,note:'x'.repeat(1999)+'\n'});
    assert.equal(incoming.transaction.display_name.length,200);assert.equal(incoming.transaction.note.length,2000);
    for(const patch of [{name:'x'.repeat(201)},{sku:'x'.repeat(101)},{color:'x'.repeat(101)},{size:'x'.repeat(51)}]){
      await fail('product_create',owner,{...input,request_id:randomUUID(),...patch},'validation_failed');
    }
    await fail('transaction',owner,{request_id:randomUUID(),variant_id:boundary.variant.id,type:'IN',quantity:1,note:'x'.repeat(2001)},'validation_failed');
    await fail('transaction',owner,{request_id:randomUUID(),variant_id:boundary.variant.id,type:'IN',quantity:1,customer_name:'x'.repeat(101)},'validation_failed');
    await fail('member_update',owner,{request_id:randomUUID(),member_line_user_id:staff.line_user_id,status:'ACTIVE',role:'OWNER'},'validation_failed');
    await fail('member_update',owner,{request_id:randomUUID(),member_line_user_id:'not-a-LINE-user',status:'ACTIVE',role:'STAFF'},'validation_failed');
    await fail('snapshot',{...owner,line_user_id:'not-a-LINE-user'},{},'validation_failed');
  });
  await check('revocation blocks mutation, history and request replay immediately',async()=>{
    const input={request_id:randomUUID(),member_line_user_id:staff.line_user_id,status:'REVOKED'};
    const revoked=await run('member_update',owner,input);assert.equal(revoked.user.status,'REVOKED');
    assert.equal((await run('member_update',owner,input)).replayed,true);
    const snap=await run('snapshot',staff);assert.equal(snap.user.role,'NONE');assert.equal(snap.user.status,'REVOKED');assert.deepEqual(snap.variants,[]);
    await fail('transaction',staff,winningInput,'permission_denied');await fail('history',staff,{days:1},'permission_denied');
    await fail('request_status',staff,{request_id:winningInput.request_id},'permission_denied');
    assert.equal((await run('join',staff)).user.status,'REVOKED');
  });
  await check('actual API core and SQL agree on catalog, member role and OUT snapshots',async()=>{
    const profile={line_user_id:`U${'4'.repeat(32)}`,display_name:'พนักงาน API ทดสอบ',is_app_owner:false};
    const profiles=new Map([['fixture-owner',owner],['fixture-staff',profile]]);
    const handler=createStockHandler({
      env:key=>({SUPABASE_URL:'https://local-fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'local-fixture-no-network'})[key],
      verifyLine:async(idToken,accessToken)=>accessToken==='fixture-access'?profiles.get(idToken)||null:null,
      isOwner:async(id)=>id===owner.line_user_id,
      rpc:async(name,args)=>{
        assert.equal(name,'stock_action');
        try{return {data:await run(args.p_action,args.p_actor,args.p_input),error:null};}
        catch(error){return {data:null,error:{code:error.code,message:error.message}};}
      },
    });
    const send=async(token,body)=>{
      const response=await handler(new Request('https://local-fixture.invalid/stock',{method:'POST',
        headers:{'content-type':'application/json','x-line-id-token':token,'x-line-access-token':'fixture-access'},body:JSON.stringify(body)}));
      return {status:response.status,body:await response.json()};
    };
    const joined=await send('fixture-staff',{action:'join'});assert.equal(joined.status,200);assert.equal(joined.body.user.role,'PENDING');
    const approval=await send('fixture-owner',{action:'member_update',request_id:randomUUID(),member_line_user_id:profile.line_user_id,role:'STAFF',status:'ACTIVE'});
    assert.equal(approval.status,200);assert.equal(approval.body.user.status,'ACTIVE');assert.equal(approval.body.user.role,'STAFF');
    const catalog=await send('fixture-owner',{action:'product_create',request_id:randomUUID(),name:'เสื้อ API ทดสอบ',sku:'API-SHIRT',color:'แดง',size:'XL',threshold:4,initial_quantity:5});
    assert.equal(catalog.status,200);assert.equal(catalog.body.variant.low_stock_threshold,4);assert.equal(catalog.body.variant.stock_quantity,5);
    const saleInput={action:'transaction',request_id:randomUUID(),variant_id:catalog.body.variant.id,type:'OUT',quantity:2,sales_channel:'FACEBOOK',
      order_reference:'API-ORDER-FIXTURE',customer_name:'ลูกค้า API ทดสอบ',note:'หมายเหตุจริง\nบรรทัดสอง'};
    const sale=await send('fixture-staff',saleInput);assert.equal(sale.status,200);assert.equal(sale.body.variant.stock_quantity,3);
    assert.equal(sale.body.transaction.order_reference,saleInput.order_reference);assert.equal(sale.body.transaction.customer_name,saleInput.customer_name);
    assert.equal(sale.body.transaction.note,saleInput.note);assert.equal(sale.body.transaction.line_user_id,profile.line_user_id);
    assert.equal(sale.body.transaction.display_name,profile.display_name);assert.equal(sale.body.replayed,false);
    const retry=await send('fixture-staff',saleInput);assert.equal(retry.status,200);assert.equal(retry.body.replayed,true);assert.equal(retry.body.transaction.id,sale.body.transaction.id);
    const changed=await send('fixture-staff',{...saleInput,quantity:1});assert.equal(changed.status,409);assert.equal(changed.body.error,'request_id_conflict');
    const snapshot=await send('fixture-staff',{action:'snapshot'});assert.equal(snapshot.status,200);
    assert.ok(Array.isArray(snapshot.body.summary.channels));assert.ok(snapshot.body.variants.every(v=>Number.isInteger(v.low_stock_threshold)));
    const history=await send('fixture-staff',{action:'history',days:1,sales_channel:'FACEBOOK'});assert.equal(history.status,200);
    assert.equal(history.body.truncated,false);assert.ok(history.body.transactions.some(t=>t.id===sale.body.transaction.id));
    const status=await send('fixture-staff',{action:'request_status',request_id:saleInput.request_id});assert.equal(status.status,200);assert.equal(status.body.found,true);
  });
  await check('history returns at most 500 and explicitly marks a bounded 501-row fixture',async()=>{
    await fixture(()=>db.query(`insert into public.stock_transactions(shop_id,variant_id,request_id,type,quantity,before_quantity,after_quantity,revision,
      product_name,sku,color,size,line_user_id,display_name,note)
      select $1,$2,gen_random_uuid(),'IN',1,0,1,1,'ประวัติ fixture','HISTORY-FIXTURE','ดำ','M',$3,$4,'fixture only'
      from generate_series(1,501)`,[secondShop,secondVariant.id,owner.line_user_id,owner.display_name]));
    const history=await run('history',owner,{shop_slug:'second',days:30});
    assert.equal(history.transactions.length,500);assert.equal(history.truncated,true);
    assert.ok(history.transactions.every(t=>t.shop_id===secondShop));
    const filtered=await run('history',owner,{shop_slug:'second',days:30,sales_channel:'STORE'});
    assert.equal(filtered.transactions.length,1);assert.equal(filtered.truncated,false);
    assert.equal((await run('history',owner,{shop_slug:'main',days:30})).truncated,false);
  });
  console.log(`Passed ${passed} stock SQL checks using actual PGlite Postgres and ${files[0]}.`);
  console.log('PGlite queues simultaneous queries on one connection; run a multi-session Postgres race test before live rollout. No live database was contacted.');
} catch(e) {
  console.error(`Stock SQL verification failed: ${e.message}`);
  if(e.code)console.error(`SQLSTATE: ${e.code}`);
  if(e.internalQuery)console.error(`SQL statement: ${e.internalQuery}`);
  process.exitCode=1;
} finally {await db.close();}
