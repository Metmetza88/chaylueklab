/** Testable LINE group assistant. Only opt-in group events are processed. */
export type GroupMessage = {message_id:string;content:string;is_note:boolean;created_at:string};
export type GroupTask = {id:string;title:string;due_at:string|null;status:string};
export type GroupMemory = {id:string;content:string;created_at:string};
export type GroupDeps = {
 secret:string|undefined; now:()=>Date; isOwner:(user:string)=>Promise<boolean>;
 getGroup:(group:string)=>Promise<{enabled:boolean}|null>;
 setGroup:(group:string,user:string,enabled:boolean)=>Promise<void>;
 record:(group:string,message:string,user:string|null,content:string,isNote:boolean)=>Promise<boolean>;
 addTask:(group:string,user:string|null,message:string,title:string,due:string|null)=>Promise<GroupTask>;
 tasks:(group:string)=>Promise<GroupTask[]>;
 notes:(group:string)=>Promise<GroupMessage[]>;
 remember:(group:string,user:string|null,message:string,content:string)=>Promise<GroupMemory>;
 memories:(group:string)=>Promise<GroupMemory[]>;
 forget:(group:string,idPrefix:string)=>Promise<'done'|'not_found'|'ambiguous'>;
 clearMemories:(group:string)=>Promise<void>;
 recent:(group:string)=>Promise<GroupMessage[]>;
 finish:(group:string,idPrefix:string)=>Promise<'done'|'not_found'|'ambiguous'>;
 clear:(group:string)=>Promise<void>;
 reply:(token:string,text:string)=>Promise<void>;
 answer:(kind:'summary'|'question',question:string,context:GroupMessage[])=>Promise<string|null>;
 dispatch:(req:Request)=>Promise<Response>;
 appUrl?:string;
};

const help='ผู้ช่วยจำและเตือนอัตโนมัติ\n• เตือน ส่งของ พรุ่งนี้ 09:00\n• จำไว้ว่า ลูกค้ารับของวันศุกร์\n• จำอะไรไว้บ้าง\n• ผู้ช่วย งาน (ดูรายการเตือน)\n• ผู้ช่วย สรุป (สรุปแชตย้อนหลังที่ได้รับ)\n• ผู้ช่วย เปิด / ปิด (เฉพาะเจ้าของ)';
const enc=new TextEncoder();
export async function verifyLineSignature(secret:string|undefined,raw:string,signature:string|null):Promise<boolean>{
 if(!secret||!signature||!/^[A-Za-z0-9+/]+={0,2}$/.test(signature))return false;
 try{
  const sig=Uint8Array.from(atob(signature),c=>c.charCodeAt(0));
  if(sig.length!==32)return false;
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',key,sig,enc.encode(raw));
 }catch{return false;}
}
export function parseAssistantCommand(text:string):string|null{
 const input=text.trim();
 const match=input.match(/^(?:@?ผู้ช่วย|\/(?:assistant|bot))(?:\s+|$)([\s\S]*)/iu);
 if(match)return match[1].trim();
 // Short explicit requests without the assistant prefix; ordinary chat remains silent.
 return /^(?:เตือน(?:ฉัน|หน่อย|ด้วย)?\s+.+|จำไว้ว่า\s+.+|จำ\s+.+|จำอะไรไว้บ้าง)$/su.test(input)?input:null;
}
function thaiDay(now:Date,addDays:number):{y:number;m:number;d:number}{
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const p=(k:string)=>Number(parts.find(x=>x.type===k)?.value);
 const shifted=new Date(Date.UTC(p('year'),p('month')-1,p('day')+addDays));
 return {y:shifted.getUTCFullYear(),m:shifted.getUTCMonth()+1,d:shifted.getUTCDate()};
}
export function parseTaskText(raw:string,now:Date):{title:string;dueAt:string|null;error?:string}{
 const match=raw.trim().match(/^(.*?)\s+กำหนด\s+(วันนี้|พรุ่งนี้|\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})$/u);
 if(!match)return {title:raw.trim(),dueAt:null};
 const title=match[1].trim(), day=match[2],hh=Number(match[3]),mm=Number(match[4]);
 if(hh>23||mm>59)return {title,dueAt:null,error:'เวลาไม่ถูกต้อง'};
 let y:number,m:number,d:number;
 if(day==='วันนี้'||day==='พรุ่งนี้')({y,m,d}=thaiDay(now,day==='วันนี้'?0:1));
 else{
  [y,m,d]=day.split('-').map(Number);
  if(new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)!==day)return {title,dueAt:null,error:'วันที่ไม่ถูกต้อง'};
 }
 const due=new Date(Date.UTC(y,m-1,d,hh-7,mm));
 if(due.getTime()<=now.getTime())return {title,dueAt:null,error:'เวลาต้องอยู่ในอนาคต'};
 return {title,dueAt:due.toISOString()};
}
function formatTask(t:GroupTask):string{
 const date=t.due_at?new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(t.due_at)):'ไม่กำหนดเวลา';
 return '• '+t.id.slice(0,8)+' '+t.title+' — '+date;
}
type Event={type?:string;source?:{type?:string;groupId?:string;userId?:string};message?:{type?:string;id?:string;text?:string};replyToken?:string};
export function createGroupAssistantHandler(deps:GroupDeps){
 return async function handle(req:Request):Promise<Response>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const path=new URL(req.url).pathname;
  if(path.endsWith('/dispatch'))return deps.dispatch(req);
  const len=Number(req.headers.get('content-length')||0);
  if(len>65536)return new Response('Payload too large',{status:413});
  let raw:string;
  try{raw=await req.text();}catch{return new Response('Invalid body',{status:400});}
  if(enc.encode(raw).length>65536)return new Response('Payload too large',{status:413});
  if(!await verifyLineSignature(deps.secret,raw,req.headers.get('x-line-signature')))return new Response('Invalid signature',{status:401});
  let events:Event[];
  try{const obj=JSON.parse(raw);if(!Array.isArray(obj.events)||obj.events.length>20)throw Error();events=obj.events;}
  catch{return new Response('Invalid events',{status:400});}
  try{
   for(const e of events){
    if(e.type!=='message'||e.source?.type!=='group'||e.message?.type!=='text')continue;
    const group=e.source.groupId,user=e.source.userId||null,msg=e.message.id;
    if(!group||!/^C[0-9a-f]{32}$/i.test(group)||!msg||msg.length>120||!e.replyToken)continue;
    const rawText=e.message.text||'';
    if(!rawText||rawText.length>2000)continue;
    const command=parseAssistantCommand(rawText);
    const state=await deps.getGroup(group);
    const owner=async()=>!!user&&await deps.isOwner(user);
    const reply=async(s:string)=>deps.reply(e.replyToken!,s.slice(0,4500));
    if(command!==null&&/^(?:เปิด|เริ่ม|เปิดใช้งาน)$/u.test(command)){
     if(!await owner()){await reply('เฉพาะเจ้าของระบบที่เปิดผู้ช่วยในกลุ่มได้');continue;}
     if(state?.enabled){await reply('ผู้ช่วยเปิดอยู่แล้วครับ');continue;}
     await deps.setGroup(group,user!,true);
     await reply('เปิดผู้ช่วยกลุ่มแล้ว ✅\nหลังจากนี้ ระบบจะอ่านแชตใหม่เพื่อช่วยสรุป (ประวัติ 30 วัน) บันทึกที่สั่ง “จำไว้ว่า” จะเก็บจนสั่งลืม และแจ้งเตือนรายการที่ระบุวันเวลา กรุณาแจ้งสมาชิกว่าระบบเริ่มเก็บข้อความในกลุ่มแล้ว');
     continue;
    }
    if(!state?.enabled)continue; // Never record or answer in unapproved groups.
    if(command!==null&&command==='ปิด'){
     if(!await owner()){await reply('เฉพาะเจ้าของระบบที่ปิดผู้ช่วยได้');continue;}
     await deps.setGroup(group,user!,false);await reply('ปิดผู้ช่วยแล้ว จะไม่เก็บข้อความใหม่ในกลุ่มนี้');continue;
    }
    if(command!==null&&command==='ล้างประวัติ'){
     if(!await owner()){await reply('เฉพาะเจ้าของระบบที่ล้างประวัติได้');continue;}
     await deps.clear(group);await reply('ลบประวัติข้อความของผู้ช่วยในกลุ่มนี้แล้ว (รายการงานยังอยู่)');continue;
    }
    const memoryText=command?.match(/^(?:จด|จำ|จำไว้ว่า)\s+(.+)$/su)?.[1]?.trim()||null;
    const isNote=!!memoryText;
    if(!await deps.record(group,msg,user,rawText,isNote))continue; // LINE redelivery is idempotent.
    if(command===null)continue; // Silent observer until addressed.
    if(command==='ช่วย'||command==='คำสั่ง'||command==='') {await reply(help);continue;}
    if(command==='งาน'||command==='ดูงาน'){
     const tasks=await deps.tasks(group);
     await reply(tasks.length?'งานที่ยังไม่เสร็จ ('+tasks.length+'):\n'+tasks.slice(0,20).map(formatTask).join('\n'):'ไม่มีงานค้างครับ');
     continue;
    }
    if(/^(?:เพิ่มงาน\s+|งานใหม่\s+|เตือน(?:ฉัน|หน่อย|ด้วย)?\s+)/u.test(command)){
     const direct=command.match(/^เตือน(?:ฉัน|หน่อย|ด้วย)?\s+(.+?)\s+(วันนี้|พรุ่งนี้|\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})$/u);
     const directReminder=/^เตือน(?:ฉัน|หน่อย|ด้วย)?\s+/u.test(command);
     if(directReminder&&!direct){await reply('ระบุวันเวลาให้ชัด เช่น “เตือน ส่งของ พรุ่งนี้ 09:00”');continue;}
     const taskText=direct?direct[1]+' กำหนด '+direct[2]+' '+direct[3]:
       command.replace(/^(?:เพิ่มงาน|งานใหม่)\s+/u,'');
     const parsed=parseTaskText(taskText,deps.now());
     if(parsed.error){await reply(parsed.error+' ลองใช้ “กำหนด พรุ่งนี้ 09:00”');continue;}
     if(!parsed.title||parsed.title.length>300){await reply('ชื่อรายการต้องมี 1–300 ตัวอักษร');continue;}
     const task=await deps.addTask(group,user,msg,parsed.title,parsed.dueAt);
     await reply('บันทึกงานแล้ว ✅\n'+formatTask(task));
     continue;
    }
    if(/^เสร็จ\s+/u.test(command)){
     const id=command.replace(/^เสร็จ\s+/u,'').trim();
     if(!/^[a-f0-9]{8}$/i.test(id)){await reply('ใส่รหัสงาน 8 ตัวจากคำสั่ง “ผู้ช่วย งาน”');continue;}
     const done=await deps.finish(group,id.toLowerCase());
     await reply(done==='done'?'ปิดงานเรียบร้อย ✅':done==='ambiguous'?'รหัสซ้ำ กรุณาลองใหม่':'ไม่พบงานค้างที่มีรหัสนี้');continue;
    }
    if(isNote){
     if(memoryText!.length>1000){await reply('ข้อความที่ให้จำยาวเกิน 1,000 ตัวอักษร');continue;}
     await deps.remember(group,user,msg,memoryText!);
     await reply('จำไว้แล้ว ✅ (เก็บจนกว่าจะสั่งลืม)');
     continue;
    }
    if(command==='โน้ต'||command==='ดูโน้ต'||command==='จำอะไรไว้บ้าง'||command==='ความจำ'){
     const memories=await deps.memories(group);
     await reply(memories.length?'สิ่งที่จำไว้:\n'+memories.slice(0,15).map(m=>'• '+m.id.slice(0,8)+' '+m.content).join('\n'):
       'ยังไม่มีข้อมูลที่สั่งให้จำครับ');
     continue;
    }
    if(command==='ลืมทั้งหมด'){
     if(!await owner()){await reply('เฉพาะเจ้าของที่ล้างความจำทั้งหมดได้');continue;}
     await deps.clearMemories(group);
     await reply('ลบความจำที่บันทึกไว้ทั้งหมดในกลุ่มนี้แล้ว');continue;
    }
    if(/^ลืม\s+/u.test(command)){
     if(!await owner()){await reply('เฉพาะเจ้าของที่ลบความจำได้');continue;}
     const id=command.replace(/^ลืม\s+/u,'').trim();
     if(!/^[a-f0-9]{8}$/i.test(id)){await reply('ใช้รหัส 8 ตัวจาก “จำอะไรไว้บ้าง” เช่น “ผู้ช่วย ลืม abcdef01”');continue;}
     const result=await deps.forget(group,id.toLowerCase());
     await reply(result==='done'?'ลืมข้อมูลนี้แล้ว ✅':result==='ambiguous'?'รหัสซ้ำ กรุณาลองใหม่':'ไม่พบความจำนี้');continue;
    }
    if(command==='เปิดแอป'){
     await reply(deps.appUrl?'เปิดแอป LINE LIFF: '+deps.appUrl:'ยังไม่ได้ตั้งค่าลิงก์ LIFF สำหรับผู้ช่วย');continue;
    }
    if(command==='สรุป'||/^ถาม\s+.+/su.test(command)){
     const context=await deps.recent(group);
     const result=await deps.answer(command==='สรุป'?'summary':'question',command.replace(/^ถาม\s+/u,''),context);
     await reply(result||'ยังไม่ได้ตั้งค่า AI หรือ AI ไม่พร้อมทำงานตอนนี้ บันทึกงานและดูโน้ตยังใช้ได้ตามปกติ');continue;
    }
    await reply(help);
   }
   return Response.json({ok:true});
  }catch{console.error('line group assistant event failed');return Response.json({ok:false,error:'retry_required'},{status:503});}
 };
}
