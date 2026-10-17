import { CORS, adminDb, json, lineIdentity } from "../_shared/membership.ts";

// LINE-authenticated text-to-image endpoint. Secrets and image files stay server-side.
// API spending is disabled by default until the owner explicitly enables it.
const MAX_BODY=8000;
const DAILY_LIMIT=2;
const MAX_IMAGE_BYTES=12*1024*1024;
const BUCKET="chaylueklab-ai-images";
const SIZES=new Set(["1024x1024","1024x1536","1536x1024"]);
const error=(code:string,status:number)=>json({ok:false,error:code},status);

async function removeOlderImages(db:any,userId:string) {
  // Keep up to 10 recent creations per authenticated LINE account.
  // Cleanup is best-effort; a failed cleanup must not invalidate a successful creation.
  try {
    const {data, error:listingError}=await db.storage.from(BUCKET).list("users/"+userId,{
      limit:100,sortBy:{column:"created_at",order:"desc"}
    });
    if(listingError||!Array.isArray(data))return;
    const old=data.filter((item:any)=>typeof item.name==="string"&&item.name.endsWith(".png")).slice(10);
    if(old.length)await db.storage.from(BUCKET).remove(old.map((item:any)=>"users/"+userId+"/"+item.name));
  }catch{/* best-effort */}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
  if(req.method!=="POST")return error("method_not_allowed",405);
  if(Number(req.headers.get("content-length")||"0")>MAX_BODY)return error("request_too_large",413);
  if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return error("invalid_content_type",415);
  let body:any;
  try{const raw=await req.text();if(raw.length>MAX_BODY)return error("request_too_large",413);body=JSON.parse(raw);}
  catch{return error("invalid_json",400);}
  const prompt=typeof body?.prompt==="string"?body.prompt.trim():"";
  const size=typeof body?.size==="string"?body.size:"1024x1024";
  if(prompt.length<8||prompt.length>1200||!SIZES.has(size))return error("invalid_image_request",400);

  let userId:string|null;
  try{userId=await lineIdentity(body);}
  catch{return error("line_verification_unavailable",503);}
  if(!userId)return error("line_login_required",401);
  if(!/^[a-zA-Z0-9_-]{1,128}$/.test(userId))return error("invalid_line_identity",401);
  if(Deno.env.get("CHAYLUEKLAB_AI_ENABLED")!=="true")return error("feature_not_enabled",503);
  const key=Deno.env.get("OPENAI_API_KEY");
  if(!key)return error("provider_not_configured",503);

  let count=0;let db:any;
  try{
    db=adminDb();
    const {data,error:quotaError}=await db.rpc("ai_image_consume_quota",{
      p_user_id:userId,p_daily_limit:DAILY_LIMIT
    });
    if(quotaError)return error("usage_limit_unavailable",503);
    count=Number(data);
    if(!Number.isInteger(count)||count<0)return error("usage_limit_unavailable",503);
    if(count===0)return error("daily_limit_reached",429);
  }catch{return error("usage_limit_unavailable",503);}

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),65000);
  try{
    const response=await fetch("https://api.openai.com/v1/images/generations",{
      method:"POST",
      headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
      body:JSON.stringify({model:"gpt-image-1",prompt,size,quality:"low",n:1}),
      signal:controller.signal
    });
    if(!response.ok)return error(response.status===429?"provider_busy":"provider_unavailable",503);
    const result=await response.json();
    const encoded=result?.data?.[0]?.b64_json;
    if(typeof encoded!=="string"||encoded.length<100)return error("provider_empty_image",502);
    if(encoded.length>Math.ceil(MAX_IMAGE_BYTES*4/3)+4)return error("image_too_large",502);
    let bytes:Uint8Array;
    try{bytes=Uint8Array.from(atob(encoded),(char:string)=>char.charCodeAt(0));}
    catch{return error("invalid_provider_image",502);}
    if(bytes.length===0||bytes.length>MAX_IMAGE_BYTES)return error("image_too_large",502);

    const path="users/"+userId+"/"+crypto.randomUUID()+".png";
    const uploaded=await db.storage.from(BUCKET).upload(path,bytes,{
      contentType:"image/png",upsert:false,cacheControl:"3600"
    });
    if(uploaded.error)return error("private_image_storage_unavailable",503);
    const signed=await db.storage.from(BUCKET).createSignedUrl(path,3600);
    if(signed.error||!signed.data?.signedUrl)return error("image_link_unavailable",503);
    await removeOlderImages(db,userId);
    const reply=json({
      ok:true,imageUrl:signed.data.signedUrl,
      expiresInSeconds:3600,size,remainingToday:Math.max(0,DAILY_LIMIT-count)
    });
    reply.headers.set("Cache-Control","no-store");
    return reply;
  }catch{return error("provider_request_failed",502);}
  finally{clearTimeout(timeout);}
});