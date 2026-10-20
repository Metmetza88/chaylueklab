import {requireMember, lineIdentity, membership, billingEnabled, billingReady, adminDb} from "./_shared/membership.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LIFF_URL = "https://liff.line.me/2011681452-yexLrODy";
const corsHeaders = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

async function lineUser(accessToken:string,idToken:string) {
  if (accessToken) {
    const r = await fetch("https://api.line.me/v2/profile",{headers:{"Authorization":"Bearer "+accessToken}});
    if (r.ok) {
      const j = await r.json();
      if (j?.userId) return j.userId;
    }
  }
  if (idToken) {
    const r = await fetch("https://api.line.me/oauth2/v2.1/verify",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({id_token:idToken,client_id:"2011681452"})
    });
    if (r.ok) {
      const j = await r.json();
      if (j?.sub) return j.sub;
    }
  }
  return null;
}

async function botPicture() {
  const token = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) return null;
  try {
    const r = await fetch("https://api.line.me/v2/bot/info", {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.pictureUrl || null;
  } catch {
    return null;
  }
}

export function testFlex(_pictureUrl?: string | null) {
  return {
    type: "flex",
    altText: "CHAYLUEKLAB · LIFE OS — เชื่อมต่อ LINE แล้ว",
    contents: {
      type: "bubble", size: "mega",
      styles: { header: { backgroundColor: "#0B0D12" }, body: { backgroundColor: "#11151D" }, footer: { backgroundColor: "#0B0D12" } },
      header: {
        type: "box", layout: "vertical", paddingAll: "24px", spacing: "sm",
        contents: [
          { type: "text", text: "CHAYLUEKLAB", color: "#DCC79E", size: "xs", weight: "bold" },
          { type: "text", text: "LIFE OS", color: "#F7F4ED", size: "3xl", weight: "bold" },
          { type: "text", text: "YOUR PERSONAL COMMAND CENTER", color: "#8D99AD", size: "xxs", wrap: true }
        ]
      },
      body: {
        type: "box", layout: "vertical", paddingAll: "24px", spacing: "md",
        contents: [
          { type: "box", layout: "horizontal", contents: [
            { type: "text", text: "●", color: "#99DDD7", size: "sm", flex: 0 },
            { type: "text", text: "เชื่อมต่อ LINE แล้ว", color: "#99DDD7", size: "sm", weight: "bold", margin: "sm" }
          ] },
          { type: "text", text: "จัดวันของคุณให้ลงตัว", color: "#F7F4ED", size: "xl", weight: "bold", wrap: true },
          { type: "text", text: "งาน · ปฏิทิน · การเงิน · คลังส่วนตัว", color: "#B4BECD", size: "sm", wrap: true },
          { type: "separator", color: "#2D3542", margin: "lg" },
          { type: "text", text: "ข้อความทดสอบถูกส่งถึงบัญชี LINE ของคุณแล้ว เปิด LIFE OS เพื่อจัดการงานและตั้งเวลาเตือน", color: "#8D99AD", size: "xs", wrap: true, margin: "lg" }
        ]
      },
      footer: {
        type: "box", layout: "vertical", paddingAll: "20px",
        contents: [
          { type: "button", style: "primary", height: "sm", color: "#756344", action: { type: "uri", label: "เปิด LIFE OS", uri: LIFF_URL } }
        ]
      }
    }
  };
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return new Response("Method Not Allowed",{status:405});
  try{
    const {accessToken="",idToken=""}=await req.json();
    const uid=await lineIdentity({accessToken,idToken});
    if(!uid) return Response.json({ok:false,error:"invalid_line_login"},{status:401,headers:corsHeaders});

    const denied=await requireMember(adminDb(),uid);if(denied)return denied;
    const token=Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    if(!token) return Response.json({ok:false,error:"line_token_missing"},{status:503,headers:corsHeaders});

    const res=await fetch("https://api.line.me/v2/bot/message/push",{
      method:"POST",
      headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify({to:uid,messages:[testFlex()]})
    });
    const body=await res.text();
    if(!res.ok) return Response.json({ok:false,error:"line_push_failed",status:res.status,detail:body},{status:502,headers:corsHeaders});
    return Response.json({ok:true},{status:200,headers:corsHeaders});
  }catch(e){
    console.error(e);
    return Response.json({ok:false,error:"server_error"},{status:500,headers:corsHeaders});
  }
});
