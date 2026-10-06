import Stripe from 'npm:stripe@23.0.0';
import {adminDb,lineIdentity,membership,accountPlan,isOwner,json,CORS,billingReady} from '../_shared/membership.ts';
import {checkoutParams,returnUrl} from '../_shared/billing-core.ts';

export async function handleBilling(req:Request){
  if(req.method==='OPTIONS')return new Response(null,{headers:CORS});
  if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  let body:any;try{body=await req.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const action=body?.action;
  if(!['status','checkout','portal','admin_summary'].includes(action))return json({ok:false,error:'invalid_request'},400);
  let token:string|undefined,user:string|undefined,db:any;
  try{
    const verified=await lineIdentity(body);if(!verified)return json({ok:false,error:'invalid_line_login'},401);user=verified;
    db=adminDb();
    if(action==='admin_summary'){
      if(!await isOwner(db,user))return json({ok:false,error:'owner_only'},403);
      const r=await db.from('billing_subscriptions').select('line_user_id,status,paid,current_period_end,cancel_at_period_end').order('updated_at',{ascending:false}).limit(100);
      if(r.error)throw r.error;return json({ok:true,subscriptions:r.data});
    }
    const m=await membership(db,user);
    const record=await db.from('billing_customers').select('*').eq('line_user_id',user).maybeSingle();if(record.error)throw record.error;
    const key=Deno.env.get('STRIPE_SECRET_KEY')||'';
    const base=Deno.env.get('BILLING_RETURN_URL')||'';
    let ready=billingReady();try{returnUrl(base)}catch{ready=false}
    if(action==='status')return json({ok:true,membership:m,account:await accountPlan(db,user),checkoutReady:ready,mode:key.startsWith('sk_live_')?'live':'test',canManage:ready&&!!record.data?.stripe_customer_id});
    if(!ready)return json({ok:false,error:'billing_not_configured'},503);
    if(m.status==='blocked')return json({ok:false,error:'account_suspended'},403);
    const stripe=new Stripe(key,{httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
    if(action==='portal'){
      if(!record.data?.stripe_customer_id)return json({ok:false,error:'no_subscription'},409);
      const session=await stripe.billingPortal.sessions.create({customer:record.data.stripe_customer_id,return_url:returnUrl(base)});
      return json({ok:true,url:session.url});
    }
    if(body.recurringConsent!==true)return json({ok:false,error:'consent_required'},400);
    if(m.owner||(m.active&&m.status!=='trialing'))return json({ok:false,error:'already_subscribed'},409);
    // Reserve one checkout per verified LINE user, across browser tabs and requests.
    token=crypto.randomUUID();
    const lock=await db.rpc('billing_reserve_checkout',{p_user:user,p_token:token});if(lock.error)throw lock.error;
    const lease=lock.data;
    if(lease.busy){token=undefined;return json({ok:false,error:'checkout_in_progress'},409)}
    if(lease.cached){token=undefined;return json({ok:true,url:lease.url})}
    if(!lease.acquired)throw new Error('reservation_failed');
    let customer=lease.customer;
    if(!customer){
      const c=await stripe.customers.create({metadata:{line_user_id:user}},{idempotencyKey:'chaylueklab-customer-'+user});customer=c.id;
      const saved=await db.from('billing_customers').update({stripe_customer_id:customer}).eq('line_user_id',user).eq('checkout_token',token).select('line_user_id');
      if(saved.error||saved.data?.length!==1)throw new Error('customer_save_failed');
    }
    // Stripe is authoritative while a payment webhook is still in transit.
    const existing=await stripe.subscriptions.list({customer,status:'all',limit:100});
    if(existing.has_more||existing.data.some(s=>['active','trialing','past_due','unpaid','incomplete','paused'].includes(s.status)))return json({ok:false,error:'already_subscribed'},409);
    const session=await stripe.checkout.sessions.create(checkoutParams(customer,user,base),{idempotencyKey:'chaylueklab-checkout-'+token});
    if(!session.url)throw new Error('checkout_url_missing');
    const saved=await db.from('billing_customers').update({checkout_session_id:session.id,checkout_url:session.url,checkout_expires_at:new Date(session.expires_at*1000).toISOString(),checkout_lease_until:null}).eq('line_user_id',user).eq('checkout_token',token).select('line_user_id');
    if(saved.error||saved.data?.length!==1){await stripe.checkout.sessions.expire(session.id);throw new Error('checkout_save_failed')}
    return json({ok:true,url:session.url});
  }catch{console.error('billing request failed',action);return json({ok:false,error:'billing_unavailable'},503)}
  finally{
    if(token&&db&&user){try{await db.from('billing_customers').update({checkout_lease_until:null}).eq('line_user_id',user).eq('checkout_token',token)}catch{console.error('checkout lease release failed')}}
  }
}
Deno.serve(handleBilling);
