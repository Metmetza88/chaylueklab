import {adminDb,CORS,json,lineIdentity,requirePost} from "../_shared/membership.ts";
import {downloadProviderVideo,pollProviderJob,ProviderError,ProviderJob} from "../_shared/video-provider.ts";

const BUCKET="video-generations";
const errorResponse=(error:string,status:number,extra:Record<string,unknown>={})=>json({ok:false,error,...extra},status);
const publicJob=(j:any,url:string|null=null)=>({id:j.id,status:j.status,progress:Number(j.progress||0),model:j.model,ratio:j.aspect_ratio,duration:j.duration_seconds,createdAt:j.created_at,updatedAt:j.updated_at,videoUrl:url,errorCode:j.error_code||null,errorMessage:j.error_message||null});

async function failJob(db:any,id:string,code:string,message?:string){await db.rpc("video_release_credit",{p_job:id,p_code:code,p_message:message||code});}

async function signedUrl(db:any,path:string){
  const r=await db.storage.from(BUCKET).createSignedUrl(path,3600,{download:`chaylueklab-${path.split("/").pop()||"video"}.mp4`});
  return r.error?null:r.data?.signedUrl||null;
}

Deno.serve(async(req)=>{
  const method=requirePost(req);if(method)return method;
  let body:any;try{body=await req.json();}catch{return errorResponse("invalid_json",400);}
  const user=await lineIdentity(body);if(!user)return errorResponse("invalid_line_login",401);
  const id=typeof body.jobId==="string"?body.jobId:"";
  if(!/^[0-9a-f-]{36}$/i.test(id))return errorResponse("invalid_job_id",400);
  try{
    const db=adminDb();let q=await db.from("video_jobs").select("*").eq("id",id).eq("line_user_id",user).maybeSingle();
    if(q.error)throw q.error;if(!q.data)return errorResponse("video_job_not_found",404);
    let job=q.data;
    if(job.status==="completed")return json({ok:true,job:publicJob(job,await signedUrl(db,job.video_path))});
    const timeoutAt=Date.parse(job.accepted_at||job.created_at)+Number(Deno.env.get("VIDEO_JOB_TIMEOUT_SECONDS")||900)*1000;
    if(Date.now()>timeoutAt){await failJob(db,id,"video_timeout","provider_timeout");q=await db.from("video_jobs").select("*").eq("id",id).eq("line_user_id",user).maybeSingle();return json({ok:true,job:publicJob(q.data)});}
    if(!job.provider_job_id)return json({ok:true,job:publicJob(job),retryAfterMs:2500});
    const provider:ProviderJob={provider:job.model,providerJobId:job.provider_job_id,operation:job.provider_operation||undefined};
    if(job.status==="queued"){
      const accepted=await db.rpc("video_mark_provider_accepted",{p_job:id,p_provider:provider.provider,p_provider_job_id:provider.providerJobId,p_operation:provider.operation||null});
      if(accepted.error)throw accepted.error;
      q=await db.from("video_jobs").select("*").eq("id",id).eq("line_user_id",user).maybeSingle();job=q.data;
    }
    const result=await pollProviderJob(provider);
    if(result.state==="running"){
      if(typeof result.progress==="number")await db.rpc("video_update_progress",{p_job:id,p_progress:result.progress});
      q=await db.from("video_jobs").select("*").eq("id",id).eq("line_user_id",user).maybeSingle();
      return json({ok:true,job:publicJob(q.data),retryAfterMs:3000});
    }
    if(result.state==="failed"){
      await failJob(db,id,"provider_failed",result.error);q=await db.from("video_jobs").select("*").eq("id",id).eq("line_user_id",user).maybeSingle();
      return json({ok:true,job:publicJob(q.data)});
    }
    if(!result.videoUrl)throw new ProviderError("provider_missing_video",502,false);
    const bytes=await downloadProviderVideo(result.videoUrl);
    const path=`${user}/${id}.mp4`;
    const uploaded=await db.storage.from(BUCKET).upload(path,bytes,{contentType:"video/mp4",upsert:true});
    if(uploaded.error)throw new ProviderError("video_storage_failed",502,true);
    const done=await db.rpc("video_complete_job",{p_job:id,p_path:path});if(done.error)throw done.error;
    q=await db.from("video_jobs").select("*").eq("id",id).eq("line_user_id",user).maybeSingle();
    return json({ok:true,job:publicJob(q.data,await signedUrl(db,path))});
  }catch(e){
    const code=e instanceof ProviderError?e.message:(e instanceof Error?e.message:"server_error");
    console.error("video-status failed",code);
    return errorResponse(e instanceof ProviderError&&e.retryable?"video_status_retry":"video_status_failed",e instanceof ProviderError?e.status:500,{message:e instanceof ProviderError?undefined:undefined});
  }
});
