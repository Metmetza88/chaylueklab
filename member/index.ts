import {requireMember,requirePremium} from "../_shared/membership.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json = (body: unknown, status = 200) => Response.json(body, {status, headers: cors});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authenticate(body: any): Promise<string | null> {
  const clientId = Deno.env.get("LINE_LOGIN_CHANNEL_ID") || "2011681452";
  if (typeof body.idToken === "string" && body.idToken) {
    const r = await fetch("https://api.line.me/oauth2/v2.1/verify", {method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({id_token:body.idToken,client_id:clientId})});
    if (r.ok) { const p = await r.json(); if (typeof p.sub === "string") return p.sub; }
  }
  if (typeof body.accessToken !== "string" || !body.accessToken) return null;
  const verification = await fetch("https://api.line.me/oauth2/v2.1/verify?" + new URLSearchParams({access_token:body.accessToken}));
  if (!verification.ok) return null;
  const v = await verification.json();
  if (String(v.client_id) !== clientId || Number(v.expires_in) <= 0) return null;
  const r = await fetch("https://api.line.me/v2/profile", {headers:{Authorization:"Bearer " + body.accessToken}});
  if (!r.ok) return null;
  const p = await r.json();
  return typeof p.userId === "string" ? p.userId : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if (req.method !== "POST") return json({ok:false,error:"method_not_allowed"},405);
  try {
    let body;
    try { body = await req.json(); } catch { return json({ok:false,error:"invalid_json"},400); }
    if (!body || typeof body !== "object") return json({ok:false,error:"invalid_json"},400);
    const user = await authenticate(body);
    if (!user) return json({ok:false,error:"invalid_line_login"},401);
    const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
    const key = keys ? JSON.parse(keys).default : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key) throw new Error("admin key unavailable");
    const db = createClient(Deno.env.get("SUPABASE_URL")!,key);
    // Only personal chat data is exposed. Group records stay in their original chat.
    if(body.action==="create_finance"||(body.action==="update_task"&&body.status==="pending")){
      const denied=await requireMember(db,user);if(denied)return denied;
    }
    if(body.action==="update_task"&&body.kind==="reminder"&&body.status==="pending"){const denied=await requirePremium(db,user);if(denied)return denied;}
    const own = (query: any) => query.eq("line_user_id",user).eq("target_id",user);
    if (body.action === "list") {
      const results = await Promise.all([
        own(db.from("line_reminders").select("id,title,remind_at,status,created_at,sent_at")).neq("status","cancelled").order("created_at",{ascending:false}).limit(500),
        own(db.from("line_tasks").select("id,title,due_at,status,created_at")).neq("status","cancelled").order("created_at",{ascending:false}).limit(500),
        own(db.from("line_finances").select("id,title,entry_type,amount,created_at")).order("created_at",{ascending:false}).limit(500)
      ]);
      for (const r of results) if (r.error) throw r.error;
      return json({ok:true,reminders:results[0].data,tasks:results[1].data,finances:results[2].data});
    }
    if (body.action === "update_task") {
      if (!uuid.test(String(body.id)) || !["reminder","task"].includes(body.kind) || !["done","pending","cancelled"].includes(body.status)) return json({ok:false,error:"invalid_task"},400);
      const table = body.kind === "reminder" ? "line_reminders" : "line_tasks";
      const changes: any = {status:body.status};
      if (body.kind === "task") changes.completed_at = body.status === "done" ? new Date().toISOString() : null;
      // A queued notification may already be in transit; don't claim to cancel it.
      let q = own(db.from(table).update(changes).eq("id",body.id));
      if (body.kind === "reminder") q = q.neq("status","queued");
      const r = await q.select("id,status").maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) return json({ok:false,error:"not_found_or_in_transit"},409);
      return json({ok:true,item:r.data});
    }
    if (body.action === "create_finance") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const amount = Number(body.amount);
      const date = String(body.date || "");
      const at = new Date(date + "T12:00:00+07:00");
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(at.getTime()) && new Date(at.getTime()+7*3600000).toISOString().slice(0,10) === date;
      if (!title || title.length > 500 || !Number.isFinite(amount) || amount <= 0 || amount > 1e12 || !["income","expense"].includes(body.type) || !validDate) return json({ok:false,error:"invalid_finance"},400);
      const r = await db.from("line_finances").insert({line_user_id:user,target_id:user,title,amount,entry_type:body.type,created_at:at.toISOString()}).select("id,title,entry_type,amount,created_at").single();
      if (r.error) throw r.error;
      return json({ok:true,finance:r.data});
    }
    if (body.action === "delete_finance") {
      if (!uuid.test(String(body.id))) return json({ok:false,error:"invalid_id"},400);
      const r = await own(db.from("line_finances").delete().eq("id",body.id)).select("id").maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) return json({ok:false,error:"not_found"},404);
      return json({ok:true});
    }
    return json({ok:false,error:"unknown_action"},400);
  } catch (e) {
    console.error(e);
    return json({ok:false,error:/โควตา/.test(String((e as any)?.message))?"quota_exceeded":"server_error",message:/โควตา/.test(String((e as any)?.message))?String((e as any).message):undefined},500);
  }
});
