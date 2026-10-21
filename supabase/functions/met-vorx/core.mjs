export function metHandler({identity,owner,env,request=fetch}){
  return async req=>{
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
    const reply=(body,status=200)=>Response.json(body,{status,headers});
    if(req.method==='OPTIONS')return new Response('ok',{headers});
    if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
    let body;try{const raw=await req.text();if(raw.length>3100000)return reply({error:'BODY_TOO_LARGE'},413);body=JSON.parse(raw)}catch{return reply({error:'INVALID_BODY'},400)}
    try{
      const uid=await identity(body);if(!uid)return reply({error:'LOGIN_REQUIRED'},401);
      if(!await owner(uid))return reply({error:'OWNER_ONLY'},403);
      const key=env('GEMINI_API_KEY');if(!key)return reply({error:'NOT_CONFIGURED',message:'ยังไม่พบ Gemini API Key ใน backend เดิม'},503);
      if(typeof body.message!=='string'||!body.message.trim()||body.message.length>1500)return reply({error:'INVALID_MESSAGE'},400);
      const parts=[{text:body.message.trim()}];
      if(body.image!==undefined){if(typeof body.image!=='string'||body.image.length>3000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.image))return reply({error:'INVALID_IMAGE'},400);parts.push({inlineData:{mimeType:'image/jpeg',data:body.image}})}
      const model=env('MET_VORX_GEMINI_MODEL')||'gemini-2.5-flash';
      const response=await request('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(25000),body:JSON.stringify({systemInstruction:{parts:[{text:'คุณชื่อ เมท (MET VORX) ผู้ช่วยภาษาไทย ตอบตรงประเด็น ห้ามอ้างว่าทำงานสำเร็จหากไม่มีหลักฐาน และห้ามอ้างว่าเห็นภาพหากไม่มีภาพแนบ'}]},contents:[{role:'user',parts}],generationConfig:{maxOutputTokens:800}})});
      if(!response.ok)return reply({error:response.status===429?'AI_QUOTA':'AI_UNAVAILABLE'},response.status===429?429:502);
      const data=await response.json();const answer=data.candidates?.[0]?.content?.parts?.filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('\n').trim();
      return answer?reply({reply:answer}):reply({error:'EMPTY_RESPONSE'},502);
    }catch{return reply({error:'SERVICE_UNAVAILABLE'},502)}
  };
}
