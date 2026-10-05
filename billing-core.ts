export const PLAN_ID = 'chaylueklab_monthly_59';
export const PLAN = {name:'CHAYLUEKLAB Plus',amount:5900,currency:'thb',interval:'month',trialDays:7};
export function subscriptionSnapshot(sub:any){
  const item=sub.items?.data?.[0],price=item?.price;
  if(sub.items?.data?.length!==1||item.quantity!==1||price?.unit_amount!==PLAN.amount||price?.currency!==PLAN.currency||price?.recurring?.interval!=='month'||price?.recurring?.interval_count!==1||sub.metadata?.plan!==PLAN_ID)return null;
  const end=item.current_period_end??sub.current_period_end;
  return {id:sub.id,line_user_id:sub.metadata?.line_user_id,customer:typeof sub.customer==='string'?sub.customer:sub.customer?.id,status:sub.status,paid:sub.latest_invoice?.status==='paid',period_end:end?new Date(end*1000).toISOString():null,cancel_at_period_end:!!sub.cancel_at_period_end};
}
export function returnUrl(base:string,payment?:string){
  const url=new URL(base);
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('invalid_return_url');
  url.searchParams.set('view','membership');
  if(payment)url.searchParams.set('payment',payment);
  return url.href;
}
export function checkoutParams(customer:string,user:string,base:string){
  return {mode:'subscription' as const,customer,client_reference_id:user,payment_method_types:['card' as const],
    line_items:[{quantity:1,price_data:{currency:PLAN.currency,unit_amount:PLAN.amount,recurring:{interval:'month' as const},product_data:{name:PLAN.name}}}],
    subscription_data:{metadata:{line_user_id:user,plan:PLAN_ID}},metadata:{line_user_id:user,plan:PLAN_ID},
    success_url:returnUrl(base,'success'),cancel_url:returnUrl(base,'cancelled'),expires_at:Math.floor(Date.now()/1000)+3600,
    custom_text:{submit:{message:'Plus 59 บาท/เดือน ต่ออายุอัตโนมัติ ยกเลิกการต่ออายุได้ในหน้าจัดการสมาชิก'}}};
}
