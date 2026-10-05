import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {checkoutParams,subscriptionSnapshot,returnUrl,PLAN_ID} from '../billing-core.ts';
const sub=()=>({id:'sub_1',customer:'cus_1',status:'active',metadata:{plan:PLAN_ID,line_user_id:'U123'},items:{data:[{quantity:1,current_period_end:2000000000,price:{unit_amount:5900,currency:'thb',recurring:{interval:'month',interval_count:1}}}]},latest_invoice:{status:'paid'}});
test('checkout charges the server price and binds membership to verified identity',()=>{
 const p=checkoutParams('cus_1','U123','https://chaylueklab.com/?other=1');
 assert.equal(p.mode,'subscription');assert.equal(p.line_items[0].price_data.unit_amount,5900);assert.equal(p.subscription_data.metadata.line_user_id,'U123');assert.equal(p.subscription_data.metadata.plan,PLAN_ID);
 assert.equal(new URL(p.success_url).searchParams.get('payment'),'success');assert.equal(new URL(p.cancel_url).searchParams.get('payment'),'cancelled');assert.deepEqual(p.payment_method_types,['card']);
});
test('snapshot only grants paid matching monthly 59 THB plan',()=>{
 assert.equal(subscriptionSnapshot(sub()).paid,true);
 for(const mutate of [s=>s.metadata.plan='chaylueklab_monthly_99',s=>s.items.data[0].price.unit_amount=9900,s=>s.items.data[0].quantity=2,s=>s.items.data[0].price.currency='usd',s=>s.items.data.push(s.items.data[0]),s=>s.items.data[0].price.recurring.interval='year']){const s=sub();mutate(s);assert.equal(subscriptionSnapshot(s),null)}
 const s=sub();s.latest_invoice.status='open';assert.equal(subscriptionSnapshot(s).paid,false);
});
test('return URL rejects plaintext and embedded credentials',()=>{
 assert.throws(()=>returnUrl('http://example.com'));assert.throws(()=>returnUrl('https://name:password@example.com'));assert.throws(()=>returnUrl('invalid'));
});
function handler({identity='U123',ready=true,mode='trialing',lease={acquired:true,customer:'cus_1'},subscriptions=[],saveError=false}={}){
 const calls=[],env={STRIPE_SECRET_KEY:'sk_test_example',BILLING_RETURN_URL:'https://chaylueklab.com'};
 const db={from(table){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},maybeSingle:async()=>({data:{stripe_customer_id:'cus_1'}}),update(data){calls.push(['update',table,data]);return q},then(resolve){resolve(saveError?{error:{message:'db failure'}}:{data:[{line_user_id:identity}]})}};return q},rpc:async()=>({data:lease})};
 const stripe={subscriptions:{list:async()=>({data:subscriptions,has_more:false})},checkout:{sessions:{create:async(params)=>{calls.push(['checkout',params]);return {id:'cs_1',url:'https://checkout.stripe.com/test',expires_at:2000000000}},expire:async id=>calls.push(['expire',id])}},billingPortal:{sessions:{create:async()=>({url:'https://billing.stripe.com/test'})}}};
 function Stripe(){return stripe}Stripe.createFetchHttpClient=()=>({});
 const m={active:mode==='trialing'||mode==='active',status:mode,owner:false};
 let handle;
 const context=vm.createContext({Response,Request,URL,crypto,console:{error(){}},Stripe,checkoutParams,returnUrl,adminDb:()=>db,lineIdentity:async()=>identity,membership:async()=>m,accountPlan:async()=>({tier:'trial',usage:{}}),isOwner:async()=>false,CORS:{},json:(body,status=200)=>Response.json(body,{status}),billingReady:()=>ready,Deno:{env:{get:k=>env[k]},serve:h=>handle=h}});
 const source=readFileSync(new URL('../billing.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export async function','async function');
 vm.runInContext(stripTypeScriptTypes(source),context);
 return {calls,send:async(body,method='POST')=>{const res=await handle(new Request('https://example.com/billing',{method,...(method==='POST'?{body:JSON.stringify(body)}:{})}));return {status:res.status,body:method==='OPTIONS'?null:await res.json()}}};
}
test('endpoint supports preflight and rejects missing identity',async()=>{
 assert.equal((await handler().send({},'OPTIONS')).status,200);
 assert.equal((await handler({identity:null}).send({action:'checkout',recurringConsent:true})).status,401);
});
test('server requires consent and configuration before creating checkout',async()=>{
 for(const [options,body,status] of [[{ready:false},{action:'checkout',recurringConsent:true},503],[{},{action:'checkout'},400],[{mode:'blocked'},{action:'checkout',recurringConsent:true},403]]){
 const h=handler(options);assert.equal((await h.send(body)).status,status);assert.equal(h.calls.filter(c=>c[0]==='checkout').length,0);
 }
});
test('trial member can buy Plus and existing subscriptions cannot buy twice',async()=>{
 const h=handler();assert.equal((await h.send({action:'checkout',recurringConsent:true})).status,200);assert.equal(h.calls.find(c=>c[0]==='checkout')[1].customer,'cus_1');
 const duplicate=handler({subscriptions:[{status:'active'}]});assert.equal((await duplicate.send({action:'checkout',recurringConsent:true})).status,409);assert.equal(duplicate.calls.filter(c=>c[0]==='checkout').length,0);
});
test('reservation reuses checkout and blocks simultaneous requests',async()=>{
 const cached=handler({lease:{cached:true,url:'https://checkout.stripe.com/cached'}});assert.equal((await cached.send({action:'checkout',recurringConsent:true})).body.url,'https://checkout.stripe.com/cached');assert.equal(cached.calls.length,0);
 assert.equal((await handler({lease:{busy:true}}).send({action:'checkout',recurringConsent:true})).status,409);
});
test('failed checkout persistence expires Stripe session',async()=>{
 const h=handler({saveError:true});assert.equal((await h.send({action:'checkout',recurringConsent:true})).status,503);assert.ok(h.calls.some(c=>c[0]==='expire'&&c[1]==='cs_1'));
});
test('status distinguishes test payments and admin summary requires ownership',async()=>{
 const h=handler();const status=await h.send({action:'status'});assert.equal(status.body.mode,'test');assert.equal(status.body.checkoutReady,true);assert.equal((await h.send({action:'admin_summary'})).status,403);
});
function webhook({valid=true,subscription=sub(),event={id:'evt_1',type:'invoice.paid',created:10,data:{object:{parent:{subscription_details:{subscription:'sub_1'}}}}}}={}){
 const calls=[];let handle;
 const stripe={webhooks:{constructEventAsync:async()=>{if(!valid)throw new Error('bad signature');return event}},subscriptions:{retrieve:async id=>{calls.push(['retrieve',id]);return subscription}}};
 function Stripe(){return stripe}Stripe.createFetchHttpClient=()=>({});Stripe.createSubtleCryptoProvider=()=>({});
 const context=vm.createContext({Response,console:{error(){}},Stripe,subscriptionSnapshot,adminDb:()=>({rpc:async(name,args)=>{calls.push(['rpc',name,args]);return {data:true}}}),Deno:{env:{get:()=> 'configured'},serve:h=>handle=h}});
 const source=readFileSync(new URL('../index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export .*;\n/gm,'');
 vm.runInContext(stripTypeScriptTypes(source),context);
 return {calls,send:()=>handle(new Request('https://example.com/webhook',{method:'POST',body:'signed body',headers:{'stripe-signature':'signature'}}))};
}
test('webhook rejects invalid signatures without database writes',async()=>{
 const h=webhook({valid:false});assert.equal((await h.send()).status,400);assert.equal(h.calls.length,0);
});
test('paid invoice verifies current Stripe subscription before applying entitlement',async()=>{
 const h=webhook();assert.equal((await h.send()).status,200);const r=h.calls.find(c=>c[0]==='rpc');assert.equal(r[1],'billing_apply_event');assert.equal(r[2].p_subscription.paid,true);assert.equal(r[2].p_subscription.line_user_id,'U123');
});
test('signed webhook for a different price cannot grant Plus',async()=>{
 const s=sub();s.items.data[0].price.unit_amount=9900;const h=webhook({subscription:s});assert.equal((await h.send()).status,200);assert.equal(h.calls.filter(c=>c[0]==='rpc').length,0);
});
