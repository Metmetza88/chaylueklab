import Stripe from "npm:stripe@23.0.0";
import {adminDb,PLAN} from "../_shared/membership.ts";

export function subscriptionSnapshot(sub:any){
  const item=sub.items?.data?.[0];
  const price=item?.price;
  const valid=sub.items?.data?.length===1&&item.quantity===1&&price?.unit_amount===PLAN.amount&&price?.currency===PLAN.currency&&price?.recurring?.interval==="month"&&price?.recurring?.interval_count===1;
  if(!valid||sub.metadata?.plan!=="chaylueklab_monthly_99")return null;
  const end=item.current_period_end??sub.current_period_end;
  return {id:sub.id,line_user_id:sub.metadata?.line_user_id,customer:typeof sub.customer==="string"?sub.customer:sub.customer.id,status:sub.status,paid:sub.latest_invoice?.status==="paid",period_end:end?new Date(end*1000).toISOString():null,cancel_at_period_end:!!sub.cancel_at_period_end};
}
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  const key=Deno.env.get("STRIPE_SECRET_KEY"),secret=Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if(!key||!secret)return Response.json({ok:false,error:"billing_not_configured"},{status:503});
  const stripe=new Stripe(key,{httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
  let event:any;
  try{event=await stripe.webhooks.constructEventAsync(await req.text(),req.headers.get("stripe-signature")||"",secret,undefined,Stripe.createSubtleCryptoProvider());}
  catch{return new Response("Invalid signature",{status:400});}
  try{
    const o=event.data.object;
    let id:string|null=null;
    if(["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(event.type))id=o.id;
    if(event.type==="checkout.session.completed"&&o.mode==="subscription")id=typeof o.subscription==="string"?o.subscription:o.subscription?.id;
    if(["invoice.paid","invoice.payment_failed"].includes(event.type)){
      const sub=o.parent?.subscription_details?.subscription??o.subscription;
      id=typeof sub==="string"?sub:sub?.id;
    }
    if(!id)return Response.json({received:true,ignored:true});
    // Read current Stripe state so delayed deliveries don't restore an old state.
    const sub=await stripe.subscriptions.retrieve(id,{expand:["latest_invoice"]});
    const snapshot=subscriptionSnapshot(sub);
    if(!snapshot)return Response.json({received:true,ignored:true});
    if(typeof snapshot.line_user_id!=="string")throw new Error("subscription_identity_missing");
    const r=await adminDb().rpc("billing_apply_event",{p_event_id:event.id,p_event_type:event.type,p_event_created:event.created,p_subscription:snapshot});
    if(r.error)throw r.error;
    return Response.json({received:true,applied:r.data});
  }catch(e){console.error("billing webhook failed",e instanceof Error?e.message:"unknown");return Response.json({ok:false,error:"retry_required"},{status:500});}
});
