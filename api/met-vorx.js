// MET VORX serverless API. Secrets must be configured privately in Vercel.
const allowedOrigin='https://metmetza88.github.io';
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
 res.setHeader('Vary','Origin');
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
 res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.GEMINI_API_KEY,channel=process.env.MET_VORX_LINE_CHANNEL_ID,owners=(process.env.MET_VORX_LINE_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!key||!channel||!owners.length)return res.status(503).json({error:'ยังไม่ได้ตั้งค่า Gemini และสิทธิ์เจ้าของระบบ'});
 const bearer=req.headers.authorization||'';
 if(!bearer.startsWith('Bearer '))return res.status(401).json({error:'กรุณาเข้าสู่ระบบ LINE'});
 const token=bearer.slice(7);
 try{
  const verify=await fetch('https://api.line.me/oauth2/v2.1/verify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({access_token:token})});
  const v=await verify.json();
  if(!verify.ok||String(v.client_id)!==String(channel)||Number(v.expires_in)<=0)return res.status(401).json({error:'LINE token ไม่ถูกต้อง'});
  const profileResponse=await fetch('https://api.line.me/v2/profile',{headers:{Authorization:'Bearer '+token}});
  const profile=await profileResponse.json();
  if(!profileResponse.ok||!owners.includes(profile.userId))return res.status(403).json({error:'บัญชี LINE นี้ไม่มีสิทธิ์ใช้ MET VORX'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const message=String(body.message||'').slice(0,6000).trim();
  const parts=[];
  if(message)parts.push({text:message});
  if(body.image){
   const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.image));
   if(!m||m[2].length>8000000)return res.status(400).json({error:'รูปภาพไม่ถูกต้องหรือใหญ่เกินไป'});
   parts.push({inline_data:{mime_type:'image/'+m[1],data:m[2]}});
  }
  if(!parts.length)return res.status(400).json({error:'กรุณาพิมพ์ข้อความหรือเลือกรูปภาพ'});
  const model=process.env.MET_VORX_GEMINI_MODEL||'gemini-2.5-flash';
  const ai=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({system_instruction:{parts:[{text:'คุณคือ MET VORX ผู้ช่วยส่วนตัวภาษาไทยของเจ้าของ CHAYLUEKLAB ตอบตามข้อเท็จจริง ห้ามอ้างว่าทำงานในระบบอื่นสำเร็จหากไม่มีเครื่องมือยืนยัน'}]},contents:[{role:'user',parts}]})});
  const data=await ai.json();
  if(!ai.ok)return res.status(502).json({error:'บริการ AI ตอบกลับข้อผิดพลาด '+ai.status});
  const reply=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('\n').trim();
  if(!reply)return res.status(502).json({error:'AI ไม่ส่งคำตอบกลับ'});
  return res.status(200).json({reply});
 }catch(e){return res.status(500).json({error:'เกิดข้อผิดพลาดในการเชื่อมต่อ'});}
}
