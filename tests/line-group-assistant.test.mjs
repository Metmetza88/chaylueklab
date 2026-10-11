import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGroupAssistantHandler,parseAssistantCommand,parseTaskText,verifyLineSignature} from '../supabase/functions/line-group-assistant/core.ts';

const group='C'+'a'.repeat(32),owner='U'+'b'.repeat(32);
const secret='unit-test-line-secret';
const data={messages:[],tasks:[],enabled:false,replies:[],writes:0,pushed:0};
function reset(){data.messages=[];data.tasks=[];data.enabled=false;data.replies=[];data.writes=0;data.pushed=0;}
function deps(){
 return {
  secret,now:()=>new Date('2026-10-12T01:00:00Z'),
  isOwner:async u=>u===owner,getGroup:async()=>({enabled:data.enabled}),
  setGroup:async(g,u,on)=>{assert.equal(g,group);assert.equal(u,owner);data.enabled=on;},
  record:async(g,id,u,content,is_note)=>{
   assert.equal(g,group);
   if(data.messages.some(m=>m.message_id===id))return false;
   data.messages.push({message_id:id,content,is_note,created_at:'2026-10-12T01:00:00Z'});
   data.writes++;return true;
  },
  addTask:async(g,u,id,title,due_at)=>{
   const task={id:'abcdef01-0000-0000-0000-000000000000',title,due_at,status:'open'};
   data.tasks.push(task);return task;
  },
  tasks:async()=>data.tasks.filter(x=>x.status==='open'),
  notes:async()=>data.messages.filter(x=>x.is_note),
  recent:async()=>data.messages,
  finish:async(g,prefix)=>{
   const t=data.tasks.find(x=>x.id.startsWith(prefix)&&x.status==='open');
   if(!t)return 'not_found';t.status='done';return 'done';
  },
  clear:async()=>{data.messages=[];},
  reply:async(t,s)=>{data.replies.push(s);},
  answer:async()=>null,
  dispatch:async req=>{data.pushed++;return Response.json({ok:true});},
  appUrl:'https://liff.line.me/2011681452-yexLrODy',
 };
}
async function signature(body){
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(body));
 return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
let serial=0;
async function send(handler,text,options={}){
 const msgId=options.msgId||String(++serial);
 const source=options.source||{type:'group',groupId:group,userId:owner};
 const event={type:'message',source,message:{type:'text',id:msgId,text},replyToken:'test-reply-token'};
 const body=JSON.stringify({events:[event]});
 return handler(new Request('https://example.test/line-group-assistant',{
  method:'POST',
  headers:{'x-line-signature':options.signature||await signature(body)},
  body,
 }));
}
test('Thai commands and Bangkok due dates',()=>{
 assert.equal(parseAssistantCommand('ผู้ช่วย งาน'),'งาน');
 assert.equal(parseAssistantCommand('คุยเรื่องงาน'),null);
 assert.equal(parseAssistantCommand('/bot สรุป'),'สรุป');
 assert.equal(parseTaskText('ส่งของ กำหนด พรุ่งนี้ 09:00',new Date('2026-10-12T01:00:00Z')).dueAt,'2026-10-13T02:00:00.000Z');
 assert.equal(parseTaskText('เช็คสต็อก กำหนด 2026-10-30 15:45',new Date('2026-10-12T01:00:00Z')).dueAt,'2026-10-30T08:45:00.000Z');
 assert.equal(parseTaskText('ผิด กำหนด 2026-02-30 11:00',new Date('2026-01-01T01:00:00Z')).error,'วันที่ไม่ถูกต้อง');
 assert.equal(parseTaskText('ผิด กำหนด พรุ่งนี้ 26:00',new Date('2026-01-01T01:00:00Z')).error,'เวลาไม่ถูกต้อง');
});
test('HMAC verify rejects modified or missing signatures',async()=>{
 const sig=await signature('{"events":[]}');
 assert.equal(await verifyLineSignature(secret,'{"events":[]}',sig),true);
 assert.equal(await verifyLineSignature(secret,'{"events":[1]}',sig),false);
 assert.equal(await verifyLineSignature(secret,'{"events":[]}',null),false);
});
test('unsigned requests are forbidden and do not store messages',async()=>{
 reset();const h=createGroupAssistantHandler(deps());
 assert.equal((await send(h,'ผู้ช่วย เปิด',{signature:'AAAA'})).status,401);
 assert.equal(data.enabled,false);
 assert.equal(data.writes,0);
});
test('private chats never get group data or replies',async()=>{
 reset();const h=createGroupAssistantHandler(deps());
 const resp=await send(h,'ผู้ช่วย เปิด',{source:{type:'user',userId:owner}});
 assert.equal(resp.status,200);assert.equal(data.enabled,false);
 assert.equal(data.replies.length,0);assert.equal(data.writes,0);
});
test('non-owner cannot activate a LINE group',async()=>{
 reset();const h=createGroupAssistantHandler(deps());
 const resp=await send(h,'ผู้ช่วย เปิด',{source:{type:'group',groupId:group,userId:'U'+'e'.repeat(32)}});
 assert.equal(resp.status,200);assert.equal(data.enabled,false);assert.match(data.replies[0],/เฉพาะเจ้าของ/);
});
test('silent until owner activation, then logs conversation, answers only when addressed',async()=>{
 reset();const h=createGroupAssistantHandler(deps());
 await send(h,'คุยกันก่อน');assert.equal(data.writes,0);
 await send(h,'ผู้ช่วย เปิด');assert.equal(data.enabled,true);
 await send(h,'ขอให้ส่งงานก่อนวันศุกร์');assert.equal(data.writes,1);
 assert.equal(data.replies.length,1);
 await send(h,'ผู้ช่วย จด สรุปยอดขาย');assert.equal(data.writes,2);
 assert.match(data.replies[1],/จดบันทึก/);
 await send(h,'ผู้ช่วย โน้ต');assert.match(data.replies[2],/สรุปยอดขาย/);
});
test('task creation deduplicates redeliveries and marks done',async()=>{
 reset();const h=createGroupAssistantHandler(deps());await send(h,'ผู้ช่วย เปิด');
 await send(h,'ผู้ช่วย เพิ่มงาน ส่งของ กำหนด พรุ่งนี้ 09:00',{msgId:'repeat-once'});
 await send(h,'ผู้ช่วย เพิ่มงาน ส่งของ กำหนด พรุ่งนี้ 09:00',{msgId:'repeat-once'});
 assert.equal(data.tasks.length,1);assert.equal(data.tasks[0].due_at,'2026-10-13T02:00:00.000Z');
 await send(h,'ผู้ช่วย งาน');assert.match(data.replies.at(-1),/abcdef01/);
 await send(h,'ผู้ช่วย เสร็จ abcdef01');assert.equal(data.tasks[0].status,'done');
});
test('owner can clear private retention and disable the group',async()=>{
 reset();const h=createGroupAssistantHandler(deps());await send(h,'ผู้ช่วย เปิด');
 await send(h,'บันทึกนี้ควรถูกลบ');
 assert.equal(data.writes,1);
 await send(h,'ผู้ช่วย ล้างประวัติ');assert.equal(data.messages.length,0);
 await send(h,'ผู้ช่วย ปิด');assert.equal(data.enabled,false);
 const before=data.writes;await send(h,'หลังปิดแล้วไม่เก็บ');assert.equal(data.writes,before);
});
test('reject invalid and oversized bodies',async()=>{
 reset();const h=createGroupAssistantHandler(deps());
 assert.equal((await h(new Request('https://example.test/line-group-assistant',{method:'GET'}))).status,405);
 assert.equal((await h(new Request('https://example.test/line-group-assistant',{method:'POST',headers:{'content-length':'65537'},body:'x'}))).status,413);
});

// Deployment configuration is brand-bound: P.Somneuk cannot activate this OA handler.
test('CHAYLUEKLAB LINE group requires its own channel, owner and scheduler credentials',()=>{
 const source=readFileSync(new URL('../supabase/functions/line-group-assistant/index.ts',import.meta.url),'utf8');
 for(const key of [
  'CHAYLUEKLAB_GROUP_CHANNEL_SECRET',
  'CHAYLUEKLAB_GROUP_CHANNEL_ACCESS_TOKEN',
  'CHAYLUEKLAB_GROUP_OWNER_IDS',
  'CHAYLUEKLAB_GROUP_CRON_SECRET',
  'CHAYLUEKLAB_GROUP_LIFF_URL',
  'CHAYLUEKLAB_GROUP_AI_API_KEY',
 ])assert.ok(source.includes("Deno.env.get('"+key+"')"),'missing own configuration: '+key);
 for(const shared of [
  "Deno.env.get('LINE_GROUP_CHANNEL_SECRET')",
  "Deno.env.get('LINE_OWNER_USER_ID')",
  "Deno.env.get('NEWSROOM_OWNER_LINE_ID')",
  "Deno.env.get('GROUP_ASSISTANT_CRON_SECRET')",
  "db.from('app_owner')",
 ])assert.ok(!source.includes(shared),'unsafe shared fallback: '+shared);
});
