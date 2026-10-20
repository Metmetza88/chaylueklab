// Owner-only image generation. No provider credential or raw upstream error leaves this handler.
export function imageHandler({identity,isOwner,env,request=fetch}) {
  return async req => {
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
    const reply=(data,status=200)=>Response.json(data,{status,headers});
    if(req.method==='OPTIONS')return new Response('ok',{headers});
    if(req.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
    let body;
    try{const raw=await req.text();if(raw.length>16000)return reply({ok:false,error:'request_too_large'},413);body=JSON.parse(raw)}catch{return reply({ok:false,error:'invalid_json'},400)}
    if(!body||typeof body!=='object')return reply({ok:false,error:'invalid_json'},400);
    try {
      const user=await identity(body);
      if(!user)return reply({ok:false,error:'invalid_line_login'},401);
      if(!await isOwner(user))return reply({ok:false,error:'owner_only'},403);
      const key=env('GEMINI_API_KEY'),model=env('GEMINI_IMAGE_MODEL');
      const configured=!!key&&!!model&&/^[a-zA-Z0-9.-]{3,100}$/.test(model);
      if(body.action==='status')return reply({ok:true,configured});
      if(!configured)return reply({ok:false,error:'image_provider_not_configured'},503);
      const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
      if(prompt.length<3||prompt.length>2000)return reply({ok:false,error:'invalid_prompt'},400);
      const ratio=['1:1','4:5','3:4','9:16','16:9'].includes(body.ratio)?body.ratio:'1:1';
      const res=await request('https://generativelanguage.googleapis.com/v1/models/'+encodeURIComponent(model)+':generateContent',{
        method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(90000),
        body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:ratio}}})
      });
      if(!res.ok)return reply({ok:false,error:res.status===429?'provider_quota':'image_provider_failed'},res.status===429?429:502);
      const data=await res.json();
      const parts=data?.candidates?.[0]?.content?.parts||[];
      const image=parts.find(p=>!p.thought&&['image/png','image/jpeg','image/webp'].includes(p.inlineData?.mimeType))?.inlineData;
      if(!image||typeof image.data!=='string'||image.data.length>12000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data))return reply({ok:false,error:'no_image_returned'},502);
      return reply({ok:true,image:{mimeType:image.mimeType,data:image.data}});
    }catch(e){return reply({ok:false,error:e?.name==='TimeoutError'||e?.name==='AbortError'?'provider_timeout':'image_service_error'},502)}
  };
}
