const LIMIT=12000;
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.GROQ_API_KEY,secret=process.env.AI_OS_ACCESS_TOKEN;
 if(!key||!secret)return res.status(503).json({error:'AI ยังไม่ตั้งค่า GROQ_API_KEY และ AI_OS_ACCESS_TOKEN บนเซิร์ฟเวอร์'});
 const provided=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 const crypto=require('crypto');
 const a=Buffer.from(provided),b=Buffer.from(secret);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).json({error:'รหัสเข้าใช้งานไม่ถูกต้อง'});
 const body=req.body||{},mode=body.mode==='plan'?'plan':'chat';
 const messages=Array.isArray(body.messages)?body.messages.slice(-12):[];
 if(!messages.length||messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>3000)||JSON.stringify(messages).length>LIMIT)return res.status(400).json({error:'ข้อมูลข้อความไม่ถูกต้องหรือยาวเกินไป'});
 const system=mode==='plan'?'คุณเป็นผู้ช่วยวางแผนงาน ตอบเป็นภาษาไทย สร้างขั้นตอนชัดเจน ห้ามอ้างว่าได้ลงมือทำงานหรือเชื่อมบริการแล้ว':'คุณคือ WORAMET AI OS ผู้ช่วยภาษาไทย ตอบตรงประเด็น และระบุเมื่อไม่ทราบข้อมูล';
 try{
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
 let response;
 try{response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.GROQ_MODEL||'llama-3.3-70b-versatile',messages:[{role:'system',content:system},...messages],max_tokens:800}),signal:controller.signal})}finally{clearTimeout(timeout)}
 const data=await response.json().catch(()=>({}));
 if(!response.ok)return res.status(response.status===429?429:502).json({error:response.status===429?'โควตาหรืออัตราการเรียกใช้เกินกำหนด':'ผู้ให้บริการ AI ตอบกลับผิดพลาด'});
 return res.status(200).json({answer:data.choices?.[0]?.message?.content||'ไม่ได้รับคำตอบ'});
 }catch(e){return res.status(502).json({error:'ไม่สามารถติดต่อบริการ AI ได้'})}
};