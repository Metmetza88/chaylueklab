import {adminDb,CORS,json,lineIdentity,membership,requirePost} from "../_shared/membership.ts";
import {createProviderJob,ProviderError} from "../_shared/video-provider.ts";

const MAX_IMAGE_BYTES=5*1024*1024;
const allowedMime=new Set(["image/jpeg","image/png","image/webp"]);
const errorResponse=(error:string,status:number,extra:Record<string,unknown>={})=>json({ok:false,error,...extra},status);

function parseImage(value:any){
  if(typeof value!=="string")throw new Error("invalid_image");
  const match=value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if(!match)throw new Error("invalid_image");
  const mimeType=match[1];const imageBase64=match[2].replace(/\s/g,"");
  if(!allowedMime.has(mimeType)||!imageBase64||imageBase64.length>Math.ceil(MAX_IMAGE_BYTES/3)*4+32)throw new Error("image_too_large");
  return {mimeType,imageBase64};
}

async function markAccepted(db:any,jobId:string,provider:any){
  let last:any;
  for(let i=0;i<3;i++){
    const r=await db.rpc("video_mark_provider_accepted",{p_job:jobId,p_provider:provider.provider,p_provider_job_id:provider.providerJobId,p_operation:provider.operation||null});
    if(!r.error)return r.data;
    last=r.error;await new Promise(resolve=>setTimeout(resolve,400*(i+1)));
  }
  throw last||new Error("provider_acceptance_not_recorded");
}

Deno.serve(async(req)=>{
  const method= requirePost(req);if(method)return method;
  let body:any;try{body=await req.json();}catch{return errorResponse("invalid_json",400);}
  let db:any;let jobId:string|undefined;let providerAccepted=false;
  try{const user=await lineIdentity(body);if(!user)return errorResponse("invalid_line_login",401);
    db=adminDb();const m=await membership(db,user);if(m.status==="blocked")return errorResponse("account_suspended",403);
    const model=body.model||"veo";const ratio=body.ratio;const duration=Number(body.duration);const prompt=typeof body.prompt==="string"?body.prompt.trim():"";
    if(!["veo","runway"].includes(model))return errorResponse("unsupported_video_model",400);
    if(!["9:16","16:9"].includes(ratio))return errorResponse("invalid_aspect_ratio",400);
    if(![4,6,8,10].includes(duration)||(model==="veo"&&![4,6,8].includes(duration)))return errorResponse("invalid_duration",400);
    if(prompt.length<8||prompt.length>12000)return errorResponse("invalid_prompt",400);
    if(model==="runway"&&prompt.length>1000)return errorResponse("runway_prompt_too_long",400);
    const image=parseImage(body.imageData);
    const requestId=typeof body.requestId==="string"&&body.requestId.length>=8?body.requestId:crypto.randomUUID();
    const created=await db.rpc("video_create_job",{p_user:user,p_request_id:requestId,p_model:model,p_ratio:ratio,p_duration:duration,p_prompt:prompt});
    if(created.error){
      const code=String(created.error.message||"").replace(/^.*?video_/i,"video_");
      if(code.includes("quota_exceeded"))return errorResponse("video_quota_exceeded",402,{price:59,membershipUrl:"https://liff.line.me/2011681452-yexLrODy?view=membership"});
      if(code.includes("invalid_")||code.includes("unsupported_"))return errorResponse(code,400);
      throw created.error;
    }
    const info=created.data;jobId=typeof info?.job_id==="string"?info.job_id:undefined;
    if(!jobId)throw new Error("video_job_not_recorded");
    if(info.replayed)return json({ok:true,job:{id:jobId,status:info.status,progress:info.status==="completed"?1:0},replayed:true});
    const provider=await createProviderJob({model,prompt,imageBase64:image.imageBase64,mimeType:image.mimeType,ratio,duration});
    providerAccepted=true;
    const persisted=await db.from("video_jobs").update({provider_job_id:provider.providerJobId,provider_operation:provider.operation||null,updated_at:new Date().toISOString()}).eq("id",jobId).eq("status","queued").select("id").maybeSingle();
    if(persisted.error||!persisted.data){return errorResponse("provider_acceptance_pending",503,{job:{id:jobId,status:"queued"}});}
    try{await markAccepted(db,jobId,provider);providerAccepted=true;}catch(e){return errorResponse("provider_acceptance_pending",503,{job:{id:jobId,status:"queued"}});}
    return json({ok:true,job:{id:jobId,status:"generating",progress:0,model,ratio,duration},credits:{tier:info.tier,limit:info.credit_limit,used:info.used_credits+info.cost,reserved:info.reserved_credits-info.cost,cost:info.cost},replayed:false},202);
  }catch(e){
    // A lost response does not prove rejection. Keep the reservation and poll
    // this job; a repeated request must never submit another paid generation.
    if(db&&jobId&&e instanceof ProviderError&&e.retryable)return errorResponse("provider_acceptance_pending",503,{job:{id:jobId,status:"queued"}});
    if(db&&jobId&&!providerAccepted){try{await db.rpc("video_release_credit",{p_job:jobId,p_code:"provider_create_failed",p_message:e instanceof Error?e.message:"provider_create_failed"});}catch(releaseError){console.error("video credit release failed",releaseError);}}
    const code=e instanceof ProviderError?e.message:(e instanceof Error?e.message:"server_error");
    if(code==="image_too_large")return errorResponse(code,413);
    if(code==="runway_image_too_large")return errorResponse(code,413);
    if(code==="invalid_image")return errorResponse(code,400);
    if(e instanceof ProviderError&&code.endsWith("_missing")){
      return errorResponse("video_provider_not_configured",503,{credential:code.replace(/_missing$/,""),job:null});
    }
    console.error("video-create failed",code);
    return errorResponse("video_create_failed",e instanceof ProviderError?e.status:500);
  }
});
