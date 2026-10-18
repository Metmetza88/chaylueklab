// MET VORX server-side Gemini endpoint. Requires GEMINI_API_KEY and MET_VORX_LINE_USER_IDS.
const MAX_IMAGE=3_000_000;
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
  const key=process.env.GEMINI_API_KEY;
  const owners=(process.env.MET_VORX_LINE_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!key||!process.env.MET_VORX_LINE_CHANNEL_ID||owners.length===0)return res.status(503).json({error:'NOT_CONFIGURED',message:'ยังไม่ได้ตั้งค่าการเชื่อมต่อ AI และสิทธิ์เจ้าของ'});
  const token=req.headers.authorization?.match(/^Bearer ([A-Za-z0-9._~+\/=-]+)$/)?.[1];
  if(!token||token.length>3000)return res.status(401).json({error:'LOGIN_REQUIRED'});
  try{
    const verify=await fetch('https://api.line.me/oauth2/v2.1/verify?'+new URLSearchParams({access_token:token}),{signal:AbortSignal.timeout(8000)});
    if(!verify.ok)return res.status(401).json({error:'INVALID_LINE_TOKEN'});
    const claims=await verify.json();
    if(String(claims.client_id)!==String(process.env.MET_VORX_LINE_CHANNEL_ID||'')||Number(claims.expires_in)<=0)return res.status(403).json({error:'WRONG_LINE_CHANNEL'});
    const profileResponse=await fetch('https://api.line.me/v2/profile',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});
    if(!profileResponse.ok)return res.status(401).json({error:'PROFILE_UNAVAILABLE'});
    const profile=await profileResponse.json();
    if(!owners.includes(profile.userId))return res.status(403).json({error:'OWNER_ONLY'});
    let body=req.body;
    if(typeof body==='string'){try{body=JSON.parse(body)}catch{return res.status(400).json({error:'INVALID_BODY'})}}
    if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({error:'INVALID_BODY'});
    const {message,image}=body;
    if(typeof message!=='string'||!message.trim()||message.length>1500)return res.status(400).json({error:'INVALID_MESSAGE'});
    const parts=[{text:message.trim()}];
    if(image!==undefined){
      if(typeof image!=='string'||image.length>MAX_IMAGE||!/^[A-Za-z0-9+/]+={0,2}$/.test(image))return res.status(400).json({error:'INVALID_IMAGE'});
      parts.push({inline_data:{mime_type:'image/jpeg',data:image}});
    }
    const model=process.env.MET_VORX_GEMINI_MODEL||'gemini-2.5-flash';
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),22000);
    let response;
    try{response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:'คุณชื่อ เมท (MET VORX) เป็นผู้ช่วยภาษาไทย ตอบตรงประเด็น เป็นมิตร และห้ามอ้างว่ามองเห็นภาพถ้าไม่มีภาพแนบ'}]},contents:[{role:'user',parts}],generationConfig:{maxOutputTokens:800}}),signal:controller.signal});}
    finally{clearTimeout(timeout);}
    if(!response.ok)return res.status(response.status===429?429:502).json({error:response.status===429?'AI_QUOTA':'AI_UNAVAILABLE'});
    const result=await response.json();
    const answer=result.candidates?.[0]?.content?.parts?.filter(p=>typeof p.text==='string').map(p=>p.text).join('\n').trim();
    if(!answer)return res.status(502).json({error:'EMPTY_RESPONSE'});
    return res.status(200).json({reply:answer});
  }catch{return res.status(502).json({error:'SERVICE_UNAVAILABLE'});}
}
