import {adminDb,json,lineIdentity,isOwner,requirePost} from '../_shared/membership.ts';

const channels=['store','line','facebook','tiktok','shopee','website','other'];
const uuid=(x:unknown)=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const integer=(x:unknown,max:number)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0&&x<=max;
const text=(x:unknown,max:number)=>typeof x==='string'&&x.trim().length>0&&x.trim().length<=max;
const fail=(error:string,status:number)=>json({ok:false,error},status);

Deno.serve(async(req:Request)=>{
 const method=requirePost(req);if(method)return method;
 if(Number(req.headers.get('content-length')||0)>16000)return fail('request_too_large',413);
 let b:any;try{const raw=await req.text();if(raw.length>16000)return fail('request_too_large',413);b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))return fail('invalid_json',400)}catch{return fail('invalid_json',400)}
 try{
  const actor=await lineIdentity(b);if(!actor)return fail('invalid_line_login',401);
  const db=adminDb();const owner=await isOwner(db,actor);
  if(!owner){const staff=await db.from('retail_staff').select('active').eq('line_user_id',actor).maybeSingle();if(staff.error)throw staff.error;if(!staff.data?.active)return json({ok:false,error:'staff_access_required',lineUserId:actor},403)}
  const action=b.action||'snapshot';
  if(action==='snapshot'){
   const day=b.day||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)return fail('invalid_date',400);
   const r=await db.rpc('retail_snapshot',{p_day:day});if(r.error)throw r.error;
   return json({ok:true,owner,lineUserId:actor,...r.data});
  }
  if(action==='transact'){
   if(!uuid(b.requestId)||!uuid(b.productId)||!['sale','receive'].includes(b.kind)||!integer(b.quantity,100000)||b.quantity<1||!channels.includes(b.channel)||!integer(b.priceCents,100000000)||typeof b.note!=='string'||b.note.length>500)return fail('invalid_transaction',400);
   const r=await db.rpc('retail_transact',{p_actor:actor,p_request_id:b.requestId,p_product:b.productId,p_kind:b.kind,p_quantity:b.quantity,p_channel:b.channel,p_note:b.note,p_price_cents:b.priceCents});if(r.error)throw r.error;
   return json({ok:true,...r.data});
  }
  if(!owner)return fail('owner_required',403);
  if(action==='create_product'){
   if(!text(b.sku,80)||!text(b.name,160)||typeof b.variant!=='string'||b.variant.length>80||!integer(b.priceCents,100000000)||!integer(b.lowThreshold,100000))return fail('invalid_product',400);
   // Product starts at zero. All received units are recorded through the same ledger.
   const r=await db.from('retail_products').insert({sku:b.sku.trim(),name:b.name.trim(),variant:b.variant.trim(),price_cents:b.priceCents,low_threshold:b.lowThreshold}).select().single();if(r.error)throw r.error;return json({ok:true,product:r.data},201);
  }
  if(action==='staff_list'){const r=await db.from('retail_staff').select('line_user_id,display_name,active').order('created_at');if(r.error)throw r.error;return json({ok:true,staff:r.data})}
  if(action==='staff_save'){
   if(typeof b.lineUserId!=='string'||!/^U[0-9a-f]{32}$/.test(b.lineUserId)||!text(b.displayName,100)||typeof b.active!=='boolean')return fail('invalid_staff',400);
   const r=await db.from('retail_staff').upsert({line_user_id:b.lineUserId,display_name:b.displayName.trim(),active:b.active});if(r.error)throw r.error;return json({ok:true});
  }
  return fail('unknown_action',400);
 }catch(e){
  const m=e instanceof Error?e.message:String((e as any)?.message||'');
  if(['insufficient_stock','request_conflict','product_not_found','stock_limit'].some(code=>m.includes(code)))return fail(['insufficient_stock','request_conflict','product_not_found','stock_limit'].find(code=>m.includes(code))!,409);
  if((e as any)?.code==='23505')return fail('duplicate_sku',409);
  console.error('retail-control request failed');return fail('retail_unavailable',503);
 }
});
