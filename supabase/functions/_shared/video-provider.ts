const GOOGLE_BASE="https://generativelanguage.googleapis.com/v1beta";
const RUNWAY_BASE="https://api.dev.runwayml.com/v1";

export type VideoInput={model:string;prompt:string;imageBase64:string;mimeType:string;ratio:"9:16"|"16:9";duration:number};
export type ProviderJob={provider:string;providerJobId:string;operation?:string};
export type ProviderPoll={state:"running"|"completed"|"failed";progress?:number;videoUrl?:string;error?:string};

export class ProviderError extends Error{
  status:number;retryable:boolean;
  constructor(message:string,status=502,retryable=true){super(message);this.name="ProviderError";this.status=status;this.retryable=retryable;}
}

function timeoutSignal(ms:number){const c=new AbortController();const timer=setTimeout(()=>c.abort(),ms);return {signal:c.signal,clear:()=>clearTimeout(timer)};}
async function request(url:string,init:RequestInit,timeout=30000){
  // Creating a paid job is not idempotent at the provider. Never retry POST.
  const attempts=init.method==="GET"?3:1;
  for(let attempt=0;attempt<attempts;attempt++){
    const t=timeoutSignal(timeout);
    try{
      const r=await fetch(url,{...init,signal:t.signal});
      const text=await r.text();let data:any={};try{data=text?JSON.parse(text):{}}catch{data={message:text};}
      if(r.ok)return data;
      const retryable=r.status===408||r.status===409||r.status===425||r.status===429||r.status>=500;
      if(!retryable||attempt===attempts-1)throw new ProviderError(data?.error?.message||data?.message||`provider_http_${r.status}`,r.status,retryable);
    }catch(e){
      if(e instanceof ProviderError){if(!e.retryable||attempt===attempts-1)throw e;}
      else if(attempt===attempts-1)throw new ProviderError(e instanceof Error&&e.name==="AbortError"?"provider_timeout":"provider_network_error",504,true);
    }finally{t.clear();}
    await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
  }
  throw new ProviderError("provider_unavailable",503,true);
}

function key(name:string){const value=Deno.env.get(name);if(!value)throw new ProviderError(`${name}_missing`,503,false);return value;}
function toDataUri(input:VideoInput){return `data:${input.mimeType};base64,${input.imageBase64}`;}

export async function createProviderJob(input:VideoInput):Promise<ProviderJob>{
  if(input.model==="veo"){
    const apiKey=key("GEMINI_API_KEY");
    const duration=input.duration===4||input.duration===6||input.duration===8?input.duration:8;
    const data=await request(`${GOOGLE_BASE}/models/${encodeURIComponent(Deno.env.get("GEMINI_VIDEO_MODEL")||"veo-3.1-generate-preview")}:predictLongRunning`,{
      method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
      body:JSON.stringify({instances:[{prompt:input.prompt,image:{bytesBase64Encoded:input.imageBase64,mimeType:input.mimeType}}],parameters:{aspectRatio:input.ratio,durationSeconds:duration,resolution:Deno.env.get("GEMINI_VIDEO_RESOLUTION")||"720p",personGeneration:"allow_adult",sampleCount:1}})
    });
    if(typeof data?.name!=="string")throw new ProviderError("provider_invalid_job_response",502,true);
    return {provider:"veo",providerJobId:data.name,operation:data.name};
  }
  if(input.model==="runway"){
    const apiKey=key("RUNWAYML_API_SECRET");
    if(input.prompt.length>1000)throw new ProviderError("runway_prompt_too_long",400,false);
    if(input.imageBase64.length>4_500_000)throw new ProviderError("runway_image_too_large",413,false);
    const ratio=input.ratio==="9:16"?"720:1280":"1280:720";
    const data=await request(`${RUNWAY_BASE}/image_to_video`,{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"X-Runway-Version":"2024-11-06","Content-Type":"application/json"},body:JSON.stringify({model:Deno.env.get("RUNWAY_VIDEO_MODEL")||"gen4.5",promptImage:toDataUri(input),promptText:input.prompt,ratio,duration:Math.min(10,Math.max(2,input.duration))})});
    if(typeof data?.id!=="string")throw new ProviderError("provider_invalid_job_response",502,true);
    return {provider:"runway",providerJobId:data.id};
  }
  throw new ProviderError("unsupported_video_model",400,false);
}

export async function pollProviderJob(job:ProviderJob):Promise<ProviderPoll>{
  if(job.provider==="veo"){
    const data=await request(`${GOOGLE_BASE}/${job.operation||job.providerJobId}`,{method:"GET",headers:{"x-goog-api-key":key("GEMINI_API_KEY")}});
    if(data?.error)return {state:"failed",error:data.error.message||"veo_generation_failed"};
    const op=data?.metadata;
    if(!data?.done)return {state:"running",progress:typeof op?.progressPercent==="number"?Math.max(0,Math.min(100,op.progressPercent))/100:undefined};
    const sample=data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
    if(!sample?.uri)return {state:"failed",error:data?.response?.generateVideoResponse?.raiMediaFilteredCount?"provider_safety_filter":"provider_missing_video"};
    return {state:"completed",progress:1,videoUrl:sample.uri};
  }
  if(job.provider==="runway"){
    const data=await request(`${RUNWAY_BASE}/tasks/${encodeURIComponent(job.providerJobId)}`,{method:"GET",headers:{Authorization:`Bearer ${key("RUNWAYML_API_SECRET")}`,"X-Runway-Version":"2024-11-06"}});
    const status=String(data?.status||"").toUpperCase();
    if(["PENDING","THROTTLED","RUNNING"].includes(status))return {state:"running",progress:typeof data?.progress==="number"?data.progress:undefined};
    if(status!=="SUCCEEDED")return {state:"failed",error:data?.failure||data?.failureCode||"runway_generation_failed"};
    const url=Array.isArray(data?.output)?data.output[0]:null;
    return typeof url==="string"?{state:"completed",progress:1,videoUrl:url}:{state:"failed",error:"provider_missing_video"};
  }
  return {state:"failed",error:"unsupported_video_model"};
}

export async function downloadProviderVideo(url:string):Promise<Uint8Array>{
  const t=timeoutSignal(120000);
  try{
    let current=url;
    for(let hop=0;hop<4;hop++){
      const u=new URL(current);const headers:Record<string,string>={};
      if(u.protocol!=="https:")throw new ProviderError("provider_video_url_invalid",502,false);
      if(u.hostname==="generativelanguage.googleapis.com")headers["x-goog-api-key"]=key("GEMINI_API_KEY");
      const r=await fetch(current,{headers,signal:t.signal,redirect:"manual"});
      if(r.status>=300&&r.status<400){const location=r.headers.get("location");if(!location)throw new ProviderError("provider_video_redirect_missing",502,true);current=new URL(location,current).toString();continue;}
      if(!r.ok)throw new ProviderError("provider_video_download_failed",r.status,r.status>=500||r.status===429);
      const limit=50*1024*1024;
      if(Number(r.headers.get("content-length"))>limit)throw new ProviderError("provider_video_too_large",413,false);
      if(!r.body)throw new ProviderError("provider_video_empty",502,true);
      const reader=r.body.getReader();const chunks:Uint8Array[]=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new ProviderError("provider_video_too_large",413,false);}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
    }
    throw new ProviderError("provider_video_redirect_loop",502,false);
  }catch(e){if(e instanceof ProviderError)throw e;throw new ProviderError("provider_video_download_failed",504,true);}finally{t.clear();}
}
