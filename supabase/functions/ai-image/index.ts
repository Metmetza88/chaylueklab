import { CORS, adminDb, json, lineIdentity } from "../_shared/membership.ts";

// Text-to-image only. Image editing from a reference photo is not implemented here.
const MAX_BODY=8000;
const DAILY_LIMIT=2;
const SIZES=new Set(["1024x1024","1024x1536","1536x1024"]);
const error=(code:string,status:number)=>json({ok:false,error:code},status);

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
  const key=Deno.env.get("OPENAI_API_KEY");
  if(!key)return error("provider_not_configured",503);

  let count=0;
  try{
    const {data,error:quotaError}=await adminDb().rpc("ai_image_consume_quota",{
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
    const image=result?.data?.[0]?.b64_json;
    if(typeof image!=="string"||image.length<100)return error("provider_empty_image",502);
    if(image.length>15_000_000)return error("image_too_large",502);
    return json({ok:true,image:"data:image/png;base64,"+image,size,remainingToday:Math.max(0,DAILY_LIMIT-count)});
  }catch{return error("provider_request_failed",502);}
  finally{clearTimeout(timeout);}
});