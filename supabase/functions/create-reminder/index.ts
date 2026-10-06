import {requireMember, lineIdentity, membership, billingEnabled, billingReady} from "../_shared/membership.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

import {reminderConfirmationFlex} from "../_shared/line-flex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const secretJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = secretJson ? JSON.parse(secretJson)["default"] : legacy;
  if (!secret) throw new Error("Supabase admin key unavailable");
  return createClient(url, secret);
}

async function lineUserFromAccessToken(accessToken: string) {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { "Authorization":"Bearer " + accessToken }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data?.userId === "string" ? data.userId : null;
}

async function lineUserFromIdToken(idToken: string) {
  const clientId = Deno.env.get("LINE_LOGIN_CHANNEL_ID") || "2011681452";
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({id_token:idToken,client_id:clientId})
  });
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data?.sub === "string" ? data.sub : null;
}

async function pushMessage(to: string, message: any) {
  const token = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) return false;
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method:"POST",
    headers:{
      "Authorization":"Bearer " + token,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({to,messages:[message]})
  });
  if (!res.ok) console.error("confirmation push failed",res.status,await res.text());
  return res.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:corsHeaders});
  if (req.method !== "POST") {
    return Response.json({ok:false,error:"method_not_allowed"},{status:405,headers:corsHeaders});
  }

  try {
    const {idToken,accessToken,title,remindAt,requestId} = await req.json();
    if(requestId != null && (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))){
      return Response.json({ok:false,error:"invalid_request_id"},{status:400,headers:corsHeaders});
    }

    if (!title || typeof title !== "string" || !title.trim() || title.length > 500) {
      return Response.json({ok:false,error:"invalid_title"},{status:400,headers:corsHeaders});
    }

    const date = new Date(remindAt);
    if (!remindAt || Number.isNaN(date.getTime())) {
      return Response.json({ok:false,error:"invalid_remind_at"},{status:400,headers:corsHeaders});
    }

    const lineUserId = await lineIdentity({idToken,accessToken});

    if (!lineUserId) {
      return Response.json({ok:false,error:"invalid_line_login"},{status:401,headers:corsHeaders});
    }

    const supabase = adminClient();
    const denied=await requireMember(supabase,lineUserId);if(denied)return denied;
    const {data,error} = await supabase.rpc("create_liff_reminder",{
      p_user:lineUserId,p_title:title.trim(),p_remind_at:date.toISOString(),p_id:requestId||null
    });
    if(error)throw error;
    if(!data?.reminder)throw new Error("reminder unavailable");
    const replayed=data.created===false;
    const confirmationSent = !replayed && await pushMessage(
      lineUserId, reminderConfirmationFlex(title.trim(),date.toISOString())
    );

    return Response.json(
      {ok:true,reminder:data.reminder,confirmationSent,replayed},
      {status:200,headers:{...corsHeaders,"Content-Type":"application/json"}}
    );
  } catch(e) {
    console.error(e);
    const message=String((e as any)?.message||"");
    const quota=/โควตา/.test(message);
    const conflict=message.includes("request_id_conflict");
    const invalid=["invalid_title","invalid_remind_at","reminder_time_in_past","invalid_line_user"].find(x=>message.includes(x));
    return Response.json(
      {ok:false,error:quota?"quota_exceeded":conflict?"request_id_conflict":invalid||"server_error",message:quota?message:undefined},
      {status:quota?402:conflict?409:invalid?400:500,headers:{...corsHeaders,"Content-Type":"application/json"}}
    );
  }
});
