import {adminDb,json,lineIdentity,isOwner,requirePost} from '../_shared/membership.ts';
import {ACTIONS,RATE_LIMITS,roleAllows,resolveRole,makeRateLimiter,isUuid,isSlug,cleanText,validateCustomer,validateItems,computeTotals,validateSlip,toCsv,validDateRange,validateProduct,validateService,validateAgent,validateTransaction,validateContact} from './core.mjs';

// Every request is authorised on the server from the action table in core.mjs.
// Rate limits are held per function instance (best-effort); Supabase/edge limits still apply on top.
const limiter:any=makeRateLimiter();
const contactLimiter:any=makeRateLimiter();
const fail=(error:string,status=400)=>json({ok:false,error},status);
const clientIp=(req:Request)=>(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'unknown';
const MAX_BODY=5_000_000, MAX_JSON=20_000;
const audit=async(db:any,actor:string,action:string,resource:string,id:string|null,detail:any=null)=>{
  const r=await db.from('cc_audit_logs').insert({actor_id:actor,action,resource,record_id:id,detail});
  if(r.error)console.error('platform audit write failed');
};
const must=(r:any)=>{if(r.error)throw r.error;return r.data;};
const KNOWN:Record<string,[string,number]>={
  invalid_items:['invalid_items',400],invalid_quantity:['invalid_quantity',400],item_not_found:['item_not_found',404],price_not_set:['price_not_set',409],
  payment_not_found:['payment_not_found',404],payment_already_reviewed:['payment_already_reviewed',409],slip_required:['slip_required',409],amount_mismatch:['amount_mismatch',409]
};
const money=(env:string)=>Deno.env.get(env)||null;

Deno.serve(async(req:Request)=>{
  const early=requirePost(req);if(early)return early;
  if(Number(req.headers.get('content-length')||0)>MAX_BODY)return fail('request_too_large',413);
  let b:any,raw='';
  try{raw=await req.text();if(raw.length>MAX_BODY)return fail('request_too_large',413);b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))return fail('invalid_request');}catch{return fail('invalid_request');}
  const action=b.action;
  if(typeof action!=='string'||!Object.hasOwn(ACTIONS,action))return fail('unknown_action');
  if(action!=='payment_submit'&&raw.length>MAX_JSON)return fail('request_too_large',413);
  const ip=clientIp(req);
  if(!limiter(`ip:${ip}`,RATE_LIMITS.customer.map((n:number,i:number)=>i===0?n*2:n)))return fail('rate_limited',429);
  try{
    const db=adminDb();
    let actor='',role='guest',owner=false;
    if((ACTIONS as any)[action]!=='guest'){
      const who=await lineIdentity(b);
      if(!who)return fail('invalid_line_login',401);
      actor=who;owner=await isOwner(db,actor);
      const p=await db.from('cc_profiles').select('role').eq('line_user_id',actor).maybeSingle();
      if(p.error)throw p.error;
      role=resolveRole({owner,profileRole:p.data?.role});
    }
    if(!roleAllows(role,action))return fail('forbidden',403);
    if(actor&&!limiter(`user:${actor}`,(RATE_LIMITS as any)[role]))return fail('rate_limited',429);
    if(!actor&&!limiter(`guest:${ip}`,RATE_LIMITS.guest))return fail('rate_limited',429);

    switch(action){
      case 'catalog':{
        const [cats,prods,svcs]=await Promise.all([
          db.from('cc_categories').select('id,slug,name_th,name_en,sort_order').order('sort_order'),
          db.from('cc_products').select('id,slug,category_id,name_th,name_en,summary_th,summary_en,cover_url,status,price_cents,trial_url,tested_at').eq('is_published',true).neq('status','archived').order('created_at'),
          db.from('cc_services').select('id,slug,name_th,name_en,summary_th,summary_en,price_cents').eq('is_published',true).order('created_at')]);
        const products=must(prods).map((p:any)=>({id:p.id,slug:p.slug,categoryId:p.category_id,nameTh:p.name_th,nameEn:p.name_en,summaryTh:p.summary_th,summaryEn:p.summary_en,coverUrl:p.cover_url,status:p.status,priceCents:p.price_cents,
          tested:!!p.tested_at,trialUrl:['beta','available'].includes(p.status)?p.trial_url:null}));
        return json({ok:true,categories:must(cats),products,services:must(svcs).map((s:any)=>({id:s.id,slug:s.slug,nameTh:s.name_th,nameEn:s.name_en,summaryTh:s.summary_th,summaryEn:s.summary_en,priceCents:s.price_cents}))});
      }
      case 'contact':{
        if(!contactLimiter(ip,[5,3600]))return fail('rate_limited',429);
        const c=validateContact(b);if(!c)return fail('invalid_contact');
        must(await db.from('cc_support_tickets').insert(c));
        return json({ok:true});
      }
      case 'me':{
        const name=cleanText(b.displayName,120);
        must(await db.from('cc_profiles').upsert({line_user_id:actor,display_name:name||null,updated_at:new Date().toISOString()},{onConflict:'line_user_id'}));
        return json({ok:true,role,owner,lineUserId:actor});
      }
      case 'payment_info':{
        const promptpay=money('PROMPTPAY_ID'),bank=money('BANK_TRANSFER_INFO');
        return json({ok:true,configured:!!(promptpay||bank),promptpayId:promptpay,accountName:money('PAYMENT_ACCOUNT_NAME'),bankInfo:bank});
      }
      case 'my_overview':{
        const [orders,quotes,licenses,notes]=await Promise.all([
          db.from('cc_orders').select('id,order_no,status,total_cents,created_at,cc_order_items(description,quantity,unit_price_cents),cc_payments(status,review_note)').eq('line_user_id',actor).order('created_at',{ascending:false}).limit(50),
          db.from('cc_quotations').select('id,quote_no,status,total_cents,created_at').eq('line_user_id',actor).order('created_at',{ascending:false}).limit(50),
          db.from('cc_licenses').select('id,product_id,status,issued_at,expires_at,license_key,cc_products(slug,name_th,name_en,download_path)').eq('line_user_id',actor).order('issued_at',{ascending:false}),
          db.from('cc_notifications').select('id,title,body,read_at,created_at').eq('line_user_id',actor).order('created_at',{ascending:false}).limit(20)]);
        const lic=must(licenses).map((l:any)=>({id:l.id,productId:l.product_id,status:l.status,issuedAt:l.issued_at,expiresAt:l.expires_at,licenseKey:l.license_key,product:{slug:l.cc_products?.slug,nameTh:l.cc_products?.name_th,nameEn:l.cc_products?.name_en,downloadable:!!l.cc_products?.download_path}}));
        return json({ok:true,orders:must(orders),quotes:must(quotes),licenses:lic,notifications:must(notes)});
      }
      case 'quote_create':{
        const customer=validateCustomer(b.customer),items=validateItems(b.items,{max:30,kinds:['product','service']});
        if(!customer||!items)return fail('invalid_quote');
        const r=must(await db.rpc('cc_create_quotation',{p_user:actor,p_customer:customer,p_items:items}));
        await audit(db,actor,'quote_created','cc_quotations',r.id,{quote_no:r.quote_no});
        return json({ok:true,quote:r});
      }
      case 'quote_get':{
        if(!isUuid(b.id))return fail('invalid_id');
        const q=must(await db.from('cc_quotations').select('*,cc_quotation_items(description,quantity,unit_price_cents,kind)').eq('id',b.id).maybeSingle());
        if(!q||(q.line_user_id!==actor&&role==='customer'))return fail('not_found',404);
        const {line_user_id:_u,...safe}=q;
        return json({ok:true,quote:safe,issuer:{name:money('QUOTE_ISSUER_NAME'),address:money('QUOTE_ISSUER_ADDRESS'),taxId:money('QUOTE_ISSUER_TAX_ID')}});
      }
      case 'order_create':{
        const items=validateItems(b.items,{max:20,kinds:['product']});if(!items)return fail('invalid_order');
        const o=must(await db.rpc('cc_create_order',{p_user:actor,p_items:items.map((i:any)=>({id:i.id,quantity:i.quantity}))}));
        await audit(db,actor,'order_created','cc_orders',o.id,{order_no:o.order_no});
        const promptpay=money('PROMPTPAY_ID'),bank=money('BANK_TRANSFER_INFO');
        return json({ok:true,order:o,payment:{configured:!!(promptpay||bank),promptpayId:promptpay,accountName:money('PAYMENT_ACCOUNT_NAME'),bankInfo:bank}});
      }
      case 'payment_submit':{
        if(!isUuid(b.orderId)||!['promptpay','bank_transfer'].includes(b.method))return fail('invalid_payment');
        const slip=validateSlip(b.slip);if(!slip)return fail('invalid_slip');
        const order=must(await db.from('cc_orders').select('id,status,total_cents,line_user_id').eq('id',b.orderId).maybeSingle());
        if(!order||order.line_user_id!==actor)return fail('not_found',404);
        if(order.status!=='pending_payment')return fail('order_not_payable',409);
        const path=`${order.id}/${crypto.randomUUID()}.${slip.ext}`;
        const up=await db.storage.from('cc-slips').upload(path,slip.bytes,{contentType:slip.mime,upsert:false});
        if(up.error)throw up.error;
        const ins=await db.from('cc_payments').insert({order_id:order.id,method:b.method,amount_cents:order.total_cents,slip_path:path});
        if(ins.error){await db.storage.from('cc-slips').remove([path]);if((ins.error as any).code==='23505')return fail('payment_pending',409);throw ins.error;}
        must(await db.from('cc_orders').update({status:'payment_review'}).eq('id',order.id));
        await audit(db,actor,'payment_submitted','cc_payments',order.id,{method:b.method});
        return json({ok:true,status:'payment_review'});
      }
      case 'download_link':{
        if(!isUuid(b.productId))return fail('invalid_id');
        const lic=must(await db.from('cc_licenses').select('id,status,expires_at').eq('line_user_id',actor).eq('product_id',b.productId).eq('status','active').limit(5));
        const valid=lic.find((l:any)=>!l.expires_at||new Date(l.expires_at).getTime()>Date.now());
        if(!valid)return fail('license_required',403);
        const prod=must(await db.from('cc_products').select('download_path,status').eq('id',b.productId).maybeSingle());
        if(!prod?.download_path||prod.status!=='available')return fail('download_unavailable',404);
        const s=await db.storage.from('cc-downloads').createSignedUrl(prod.download_path,60);
        if(s.error||!s.data?.signedUrl)throw s.error||new Error('sign failed');
        await audit(db,actor,'download_link','cc_licenses',valid.id);
        return json({ok:true,url:s.data.signedUrl,expiresIn:60});
      }
      case 'notifications_read':{
        must(await db.from('cc_notifications').update({read_at:new Date().toISOString()}).eq('line_user_id',actor).is('read_at',null));
        return json({ok:true});
      }

      case 'admin_overview':{
        const c=(t:string,f?:(q:any)=>any)=>{let q=db.from(t).select('id',{count:'exact',head:true});if(f)q=f(q);return q;};
        const [review,tickets,quotes,products,agents]=await Promise.all([
          c('cc_payments',q=>q.eq('status','submitted')),c('cc_support_tickets',q=>q.eq('status','open')),c('cc_quotations',q=>q.eq('status','submitted')),c('cc_products'),c('cc_ai_agents',q=>q.eq('status','running'))]);
        for(const r of [review,tickets,quotes,products,agents])if(r.error)throw r.error;
        return json({ok:true,role,counts:{paymentsToReview:review.count||0,openTickets:tickets.count||0,quotesToDecide:quotes.count||0,products:products.count||0,runningAgents:agents.count||0}});
      }
      case 'admin_orders':return json({ok:true,orders:must(await db.from('cc_orders').select('id,order_no,line_user_id,status,total_cents,created_at,cc_order_items(description,quantity,unit_price_cents)').order('created_at',{ascending:false}).limit(100))});
      case 'admin_payments':return json({ok:true,payments:must(await db.from('cc_payments').select('id,order_id,method,amount_cents,status,submitted_at,reviewed_by,reviewed_at,review_note,cc_orders(order_no,line_user_id)').order('submitted_at',{ascending:false}).limit(100))});
      case 'admin_quotes':return json({ok:true,quotes:must(await db.from('cc_quotations').select('id,quote_no,customer_name,customer_email,customer_phone,company,status,subtotal_cents,discount_cents,tax_rate_bp,total_cents,created_at,decided_at').order('created_at',{ascending:false}).limit(100))});
      case 'admin_tickets':return json({ok:true,tickets:must(await db.from('cc_support_tickets').select('id,name,contact,message,status,created_at').order('created_at',{ascending:false}).limit(100))});
      case 'admin_licenses':return json({ok:true,licenses:must(await db.from('cc_licenses').select('id,line_user_id,product_id,order_id,status,issued_at,expires_at,cc_products(name_th)').order('issued_at',{ascending:false}).limit(200))});
      case 'ticket_close':{
        if(!isUuid(b.id))return fail('invalid_id');
        must(await db.from('cc_support_tickets').update({status:'closed'}).eq('id',b.id));
        await audit(db,actor,'ticket_closed','cc_support_tickets',b.id);return json({ok:true});
      }
      case 'slip_link':{
        if(!isUuid(b.paymentId))return fail('invalid_id');
        const p=must(await db.from('cc_payments').select('slip_path').eq('id',b.paymentId).maybeSingle());
        if(!p?.slip_path)return fail('not_found',404);
        const s=await db.storage.from('cc-slips').createSignedUrl(p.slip_path,60);
        if(s.error||!s.data?.signedUrl)throw s.error||new Error('sign failed');
        await audit(db,actor,'slip_viewed','cc_payments',b.paymentId);
        return json({ok:true,url:s.data.signedUrl,expiresIn:60});
      }

      case 'product_save':{
        const p=validateProduct(b);if(!p)return fail('invalid_product');
        const {tested,...row}:any=p;
        const data:any={...row,tested_at:tested?new Date().toISOString():null};
        const res=b.id?(isUuid(b.id)?await db.from('cc_products').update(data).eq('id',b.id).select('id').maybeSingle():{error:{message:'invalid_id'}}):await db.from('cc_products').insert(data).select('id').maybeSingle();
        if((res as any).error)throw (res as any).error;
        await audit(db,actor,b.id?'product_updated':'product_created','cc_products',(res as any).data?.id||b.id,{slug:p.slug,status:p.status,price_cents:p.price_cents});
        return json({ok:true,id:(res as any).data?.id});
      }
      case 'service_save':{
        const s=validateService(b);if(!s)return fail('invalid_service');
        const res=b.id?(isUuid(b.id)?await db.from('cc_services').update(s).eq('id',b.id).select('id').maybeSingle():{error:{message:'invalid_id'}}):await db.from('cc_services').insert(s).select('id').maybeSingle();
        if((res as any).error)throw (res as any).error;
        await audit(db,actor,b.id?'service_updated':'service_created','cc_services',(res as any).data?.id||b.id,{slug:s.slug,price_cents:s.price_cents});
        return json({ok:true,id:(res as any).data?.id});
      }
      case 'category_save':{
        const th=cleanText(b.nameTh,120,{required:true}),en=cleanText(b.nameEn,120,{required:true});
        if(!isSlug(b.slug)||th===null||en===null||!Number.isInteger(b.sortOrder??0))return fail('invalid_category');
        must(await db.from('cc_categories').upsert({slug:b.slug,name_th:th,name_en:en,sort_order:b.sortOrder??0},{onConflict:'slug'}));
        await audit(db,actor,'category_saved','cc_categories',b.slug);return json({ok:true});
      }
      case 'quote_decide':{
        if(!isUuid(b.id)||!['approve','reject'].includes(b.decision))return fail('invalid_request');
        const q=must(await db.from('cc_quotations').select('id,status,subtotal_cents,line_user_id,quote_no').eq('id',b.id).maybeSingle());
        if(!q)return fail('not_found',404);
        if(q.status!=='submitted')return fail('quote_already_decided',409);
        const t=computeTotals({subtotalCents:q.subtotal_cents,discountCents:b.discountCents??0,taxRateBp:b.taxRateBp??0});
        if(!t)return fail('invalid_amounts');
        must(await db.from('cc_quotations').update({status:b.decision==='approve'?'approved':'rejected',discount_cents:t.discountCents,tax_rate_bp:t.taxRateBp,tax_cents:t.taxCents,total_cents:t.totalCents,decided_by:actor,decided_at:new Date().toISOString()}).eq('id',q.id));
        must(await db.from('cc_notifications').insert({line_user_id:q.line_user_id,title:b.decision==='approve'?'ใบเสนอราคาได้รับการอนุมัติ':'ใบเสนอราคาไม่ได้รับการอนุมัติ',body:q.quote_no}));
        await audit(db,actor,'quote_'+b.decision,'cc_quotations',q.id,{total_cents:t.totalCents});
        return json({ok:true,totals:t});
      }
      case 'payment_review':{
        if(!isUuid(b.paymentId)||typeof b.approve!=='boolean')return fail('invalid_request');
        const note=cleanText(b.note,500);if(note===null)return fail('invalid_note');
        if(!b.approve&&!note)return fail('note_required');
        const r=must(await db.rpc('cc_review_payment',{p_admin:actor,p_payment:b.paymentId,p_approve:b.approve,p_note:note||null}));
        return json({ok:true,...r});
      }
      case 'license_revoke':{
        if(!isUuid(b.id))return fail('invalid_id');
        must(await db.from('cc_licenses').update({status:'revoked'}).eq('id',b.id));
        await audit(db,actor,'license_revoked','cc_licenses',b.id);return json({ok:true});
      }
      case 'members_list':return json({ok:true,members:must(await db.from('cc_profiles').select('line_user_id,display_name,role,created_at').order('created_at',{ascending:false}).limit(200))});
      case 'member_role':{
        if(typeof b.lineUserId!=='string'||!/^U[0-9a-f]{32}$/.test(b.lineUserId)||!['customer','staff','admin'].includes(b.role))return fail('invalid_request');
        if(b.lineUserId===actor)return fail('cannot_change_own_role',409);
        must(await db.from('cc_profiles').upsert({line_user_id:b.lineUserId,role:b.role,updated_at:new Date().toISOString()},{onConflict:'line_user_id'}));
        await audit(db,actor,'member_role_changed','cc_profiles',b.lineUserId,{role:b.role});return json({ok:true});
      }
      case 'agents_list':{
        const [agents,flows]=await Promise.all([db.from('cc_ai_agents').select('*').order('created_at'),db.from('cc_workflows').select('id,agent_id,name,schedule,enabled,created_at').order('created_at')]);
        return json({ok:true,agents:must(agents),workflows:must(flows),executorConnected:false});
      }
      case 'agent_save':{
        const a=validateAgent(b);if(!a)return fail('invalid_agent');
        const res=b.id?(isUuid(b.id)?await db.from('cc_ai_agents').update(a).eq('id',b.id).select('id').maybeSingle():{error:{message:'invalid_id'}}):await db.from('cc_ai_agents').insert({...a,created_by:actor}).select('id').maybeSingle();
        if((res as any).error)throw (res as any).error;
        await audit(db,actor,b.id?'agent_updated':'agent_created','cc_ai_agents',(res as any).data?.id||b.id,{permissions:a.permissions,requires_approval:a.requires_approval});
        return json({ok:true,id:(res as any).data?.id});
      }
      case 'agent_status':{
        if(!isUuid(b.id)||!['stopped','running','paused'].includes(b.status))return fail('invalid_request');
        must(await db.from('cc_ai_agents').update({status:b.status}).eq('id',b.id));
        await audit(db,actor,'agent_status_'+b.status,'cc_ai_agents',b.id);
        // Records the requested state only. No runner is attached, so no run is fabricated.
        return json({ok:true,status:b.status,executorConnected:false});
      }
      case 'workflow_save':{
        const name=cleanText(b.name,120,{required:true}),schedule=cleanText(b.schedule,80);
        const def=b.definition===undefined?{}:b.definition;
        if(name===null||schedule===null||!def||typeof def!=='object'||Array.isArray(def)||JSON.stringify(def).length>8000||(b.agentId!==undefined&&b.agentId!==null&&!isUuid(b.agentId)))return fail('invalid_workflow');
        must(await db.from('cc_workflows').insert({name,schedule:schedule||null,definition:def,agent_id:b.agentId||null,enabled:false,created_by:actor}));
        await audit(db,actor,'workflow_created','cc_workflows',null,{name});return json({ok:true});
      }
      case 'runs_list':return json({ok:true,runs:must(await db.from('cc_automation_runs').select('id,workflow_id,agent_id,status,cost_cents,error,started_at,finished_at').order('started_at',{ascending:false}).limit(100))});
      case 'income_summary':{
        const range=validDateRange(b.from,b.to);if(!range||!['day','month','year'].includes(b.grain))return fail('invalid_range');
        return json({ok:true,...must(await db.rpc('cc_income_summary',{p_from:range.from,p_to:range.to,p_grain:b.grain}))});
      }
      case 'income_csv':{
        const range=validDateRange(b.from,b.to);if(!range)return fail('invalid_range');
        const rows=must(await db.from('cc_transactions').select('occurred_at,kind,source,amount_cents,order_id,note').gte('occurred_at',`${range.from}T00:00:00+07:00`).lte('occurred_at',`${range.to}T23:59:59.999+07:00`).order('occurred_at').limit(20000));
        const csv=toCsv(['occurred_at','kind','source','amount_thb','order_id','note'],rows.map((r:any)=>[r.occurred_at,r.kind,r.source,(r.amount_cents/100).toFixed(2),r.order_id,r.note]));
        await audit(db,actor,'income_csv_exported','cc_transactions',null,{from:range.from,to:range.to,rows:rows.length});
        return json({ok:true,filename:`income-${range.from}_${range.to}.csv`,csv});
      }
      case 'transaction_add':{
        const t=validateTransaction(b);if(!t)return fail('invalid_transaction');
        must(await db.from('cc_transactions').insert({...t,created_by:actor}));
        await audit(db,actor,'transaction_added','cc_transactions',null,{kind:t.kind,source:t.source,amount_cents:t.amount_cents});return json({ok:true});
      }
      case 'audit_list':return json({ok:true,logs:must(await db.from('cc_audit_logs').select('id,actor_id,action,resource,record_id,detail,created_at').order('created_at',{ascending:false}).limit(200))});
      case 'system_status':{
        const ping=await db.from('cc_products').select('id',{count:'exact',head:true});
        const buckets=await db.storage.listBuckets();
        const names=(buckets.data||[]).map((x:any)=>x.name);
        return json({ok:true,database:!ping.error,storage:{slips:names.includes('cc-slips'),downloads:names.includes('cc-downloads')},config:{promptpay:!!money('PROMPTPAY_ID'),bank:!!money('BANK_TRANSFER_INFO'),quoteIssuer:!!money('QUOTE_ISSUER_NAME'),lineLogin:!!money('LINE_LOGIN_CHANNEL_ID')},aiProvider:{connected:false}});
      }
      default:return fail('unknown_action');
    }
  }catch(e){
    const m=e instanceof Error?e.message:String((e as any)?.message||'');
    for(const k of Object.keys(KNOWN))if(m.includes(k))return fail(KNOWN[k][0],KNOWN[k][1]);
    const code=(e as any)?.code;
    if(code==='23505')return fail('duplicate',409);
    if(code==='23514')return fail('constraint_failed',409);
    if(code==='22P02')return fail('invalid_request',400);
    console.error('platform request failed');
    return fail('platform_unavailable',503);
  }
});
