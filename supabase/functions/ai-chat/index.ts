import { CORS, adminDb, json, lineIdentity } from "../_shared/membership.ts";

// Requires LINE Login; no anonymous provider calls or API keys in the browser.
// OPENAI_API_KEY is read only from Supabase Edge Function secrets.
const MAX_BODY_BYTES = 18000;
const DAILY_LIMIT = 12;
const MAX_OUTPUT_TOKENS = 650;
const MAX_MESSAGES = 12;
const DEFAULT_MODEL = "gpt-4.1-mini";
const MODELS = new Set(["gpt-4.1-mini", "gpt-4.1"]);
type ChatMessage = {role:"user"|"assistant";content:string};
const error = (code:string,status:number) => json({ok:false,error:code},status);
function validHistory(raw:unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_MESSAGES) return null;
  const history:ChatMessage[]=[];
  let bytes=0;
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const role=(item as Record<string,unknown>).role;
    const content=(item as Record<string,unknown>).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const clean=content.trim();
    if (clean.length < 1 || clean.length > 2000) return null;
    bytes+=clean.length;
    if (bytes > 10000) return null;
    history.push({role,content:clean});
  }
  if (history.at(-1)?.role !== "user") return null;
  return history;
}
function extractReply(payload:any):string {
  if (!Array.isArray(payload?.output)) return "";
  return payload.output.flatMap((item:any)=>Array.isArray(item?.content)?item.content:[])
    .filter((item:any)=>item?.type==="output_text" && typeof item.text==="string")
    .map((item:any)=>item.text).join("\n").trim().slice(0,5000);
}

Deno.serve(async(req:Request)=>{
  if (req.method==="OPTIONS") return new Response(null,{status:204,headers:CORS});
  if (req.method!=="POST") return error("method_not_allowed",405);
  const length=Number(req.headers.get("content-length")||"0");
  if (length > MAX_BODY_BYTES) return error("request_too_large",413);
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return error("invalid_content_type",415);

  let body:any;
  try {
    const source=await req.text();
    if (source.length>MAX_BODY_BYTES) return error("request_too_large",413);
    body=JSON.parse(source);
  } catch {return error("invalid_json",400);}
  const model=typeof body?.model==="string" ? body.model : DEFAULT_MODEL;
  if (!MODELS.has(model)) return error("unsupported_model",400);
  const history=validHistory(body?.messages);
  if (!history) return error("invalid_messages",400);

  let userId:string|null;
  try {userId=await lineIdentity(body);}
  catch {return error("line_verification_unavailable",503);}
  if (!userId) return error("line_login_required",401);

  // Opt-in only: newly deployed endpoint cannot start spending provider credits by accident.
  if (Deno.env.get("CHAYLUEKLAB_AI_ENABLED") !== "true") return error("feature_not_enabled",503);
  const apiKey=Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return error("provider_not_configured",503);
  // Database counter is atomic across concurrent calls. Fail closed if migration is missing.
  let remaining=0;
  try {
    const db=adminDb();
    const {data, error:usageError}=await db.rpc("ai_chat_consume_quota",{
      p_user_id:userId,p_daily_limit:DAILY_LIMIT
    });
    if (usageError) return error("usage_limit_unavailable",503);
    remaining=Number(data);
    if (!Number.isInteger(remaining) || remaining<0) return error("usage_limit_unavailable",503);
    if (remaining===0) return error("daily_limit_reached",429);
  } catch {return error("usage_limit_unavailable",503);}

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),30000);
  try {
    const result=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({
        model,
        max_output_tokens:MAX_OUTPUT_TOKENS,
        store:false,
        input:[
          {role:"developer",content:"You are CHAYLUEKLAB AI, a helpful Thai-language creative and business assistant. Be accurate, avoid inventing product claims or costs, and never claim to have generated an image or video. Provide useful, concise, concrete responses."},
          ...history
        ]
      }),
      signal:controller.signal
    });
    if (!result.ok) return error(result.status===429?"provider_busy":"provider_unavailable",503);
    const payload=await result.json();
    const reply=extractReply(payload);
    if (!reply) return error("provider_empty_reply",502);
    return json({ok:true,reply,model,remainingToday:Math.max(0,DAILY_LIMIT-remaining)});
  } catch {return error("provider_request_failed",502);}
  finally {clearTimeout(timeout);}
});