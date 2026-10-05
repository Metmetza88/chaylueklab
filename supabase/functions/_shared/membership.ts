import { createClient } from "npm:@supabase/supabase-js@2.117.2";

export const PLAN = {name:"CHAYLUEKLAB Plus",amount:5900,currency:"thb",interval:"month",trialDays:7};
export const CORS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
export const json = (body:unknown,status=200) => Response.json(body,{status,headers:CORS});

export function adminDb(){
  const keys=Deno.env.get("SUPABASE_SECRET_KEYS");
  let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");
  if(keys){try{key=JSON.parse(keys).default||key}catch{ /* use the explicit key */ }}
  if(!key)throw new Error("admin key unavailable");
  const url=Deno.env.get("SUPABASE_URL");
  if(!url)throw new Error("Supabase URL unavailable");
  return createClient(url,key);
}

export async function lineIdentity(body:any):Promise<string|null>{
  const channel=Deno.env.get("LINE_CHANNEL_ID")||Deno.env.get("LINE_LOGIN_CHANNEL_ID")||"2011681452";
  if(typeof body?.idToken==="string"&&body.idToken){
    const r=await fetch("https://api.line.me/oauth2/v2.1/verify",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({id_token:body.idToken,client_id:channel})});
    if(r.ok){const p=await r.json();if(typeof p.sub==="string")return p.sub;}
  }
  if(typeof body?.accessToken!=="string"||!body.accessToken)return null;
  const r=await fetch("https://api.line.me/oauth2/v2.1/verify?"+new URLSearchParams({access_token:body.accessToken}));
  if(!r.ok)return null;
  const p=await r.json();if(String(p.client_id)!==channel||Number(p.expires_in)<=0)return null;
  const profile=await fetch("https://api.line.me/v2/profile",{headers:{Authorization:"Bearer "+body.accessToken}});
  if(!profile.ok)return null;
  const user=await profile.json();return typeof user.userId==="string"?user.userId:null;
}

export async function isOwner(db:any,user:string){
  if((Deno.env.get("NEWSROOM_OWNER_LINE_ID")||Deno.env.get("LINE_OWNER_USER_ID")||"").split(",").map(s=>s.trim()).filter(Boolean).includes(user))return true;
  const owner=await db.from("app_owner").select("line_user_id").eq("singleton",true).maybeSingle();
  if(owner.error)throw owner.error;
  return owner.data?.line_user_id===user;
}

export async function membership(db:any,user:string){
  const owner=await isOwner(db,user);
  const override=await db.from("member_access_overrides").select("mode,expires_at").eq("line_user_id",user).maybeSingle();
  if(override.error)throw override.error;
  const controlled=override.data&&(!override.data.expires_at||new Date(override.data.expires_at).getTime()>Date.now());
  if(controlled)return {active:owner||override.data.mode==='grant',owner,status:override.data.mode==='grant'?'granted':'blocked',periodEnd:override.data.expires_at,cancelAtPeriodEnd:false};
  const r=await db.from("billing_subscriptions").select("status,paid,current_period_end,cancel_at_period_end").eq("line_user_id",user).order("current_period_end",{ascending:false,nullsFirst:false});
  if(r.error)throw r.error;
  const active=(r.data||[]).find((s:any)=>s.status==="active"&&s.paid&&new Date(s.current_period_end).getTime()>Date.now());
  const row=active||(r.data||[])[0]||null;
  if(owner||active)return {active:!!active,owner,status:row?.status||"none",periodEnd:row?.current_period_end||null,cancelAtPeriodEnd:row?.cancel_at_period_end||false};
  const trial=await db.rpc("membership_start_trial",{p_user:user});
  if(trial.error)throw trial.error;
  const t=Array.isArray(trial.data)?trial.data[0]:trial.data;
  if(!t?.expires_at)throw new Error("trial unavailable");
  const available=new Date(t.expires_at).getTime()>Date.now();
  return {active:available,owner:false,status:available?"trialing":"trial_expired",periodEnd:t.expires_at,cancelAtPeriodEnd:false,trialDays:7};
}

export function requirePost(req:Request){
  if(req.method==="OPTIONS")return json({},204);
  if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
  return null;
}
