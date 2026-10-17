// CHAYLUEKLAB Life OS: commands inside the existing LINE LIFF web app.
// Commands here navigate existing pages or open existing forms; they never write data on their own.
// Replying to messages typed in an OA chat requires a separately configured Messaging API webhook.
export const COMMANDS = Object.freeze([
  {id:'menu',label:'/เมนู',title:'คำสั่งทั้งหมด',aliases:['เมนู','คำสั่ง','help','/help'],action:'help'},
  {id:'tasks',label:'/งาน',title:'รายการงาน',aliases:['งาน','task','tasks'],action:'page',target:'tasksPage'},
  {id:'remind',label:'/เตือน',title:'เพิ่มงานและแจ้งเตือน',aliases:['เตือน','เพิ่มงาน','นัดหมาย'],action:'form',target:'openTaskModal',acceptTitle:true},
  {id:'calendar',label:'/ปฏิทิน',title:'ปฏิทิน',aliases:['ปฏิทิน','calendar'],action:'page',target:'calendarPage'},
  {id:'finance',label:'/การเงิน',title:'รายรับรายจ่าย',aliases:['การเงิน','เงิน','finance'],action:'page',target:'financePage'},
  {id:'record',label:'/บันทึกเงิน',title:'บันทึกรายรับรายจ่าย',aliases:['บันทึกเงิน','เพิ่มรายการเงิน'],action:'form',target:'openFinanceModal'},
  {id:'vault',label:'/ไฟล์',title:'ไฟล์และโน้ตส่วนตัว',aliases:['ไฟล์','คลัง','โน้ต','vault'],action:'page',target:'vaultPage',after:'loadVault'},
  {id:'debts',label:'/เงินค้าง',title:'ติดตามเงินค้าง',aliases:['เงินค้าง','หนี้'],action:'tools',target:'debts'},
  {id:'recurring',label:'/เตือนประจำ',title:'แจ้งเตือนประจำ',aliases:['เตือนประจำ','ประจำ'],action:'tools',target:'recurring'},
  {id:'report',label:'/รายงาน',title:'รายงานการเงิน',aliases:['รายงาน','report'],action:'tools',target:'report'},
  {id:'membership',label:'/สมาชิก',title:'สิทธิ์สมาชิก',aliases:['สมาชิก','สิทธิ์','membership'],action:'page',target:'membershipPage',after:'loadMembership'},
  {id:'video',label:'/วิดีโอ',title:'AI Video Studio',aliases:['วิดีโอ','คลิป','video'],action:'link',target:'./ai-video.html'},
  {id:'ai',label:'/AI',title:'AI Studio',aliases:['ai','สตูดิโอ','studio'],action:'link',target:'https://ai.chaylueklab.com/ai/'},
  {id:'image',label:'/ภาพ',title:'AI Image (ต้องเปิด API ก่อน)',aliases:['ภาพ','รูป','สร้างภาพ','image'],action:'link',target:'https://ai.chaylueklab.com/ai-image/'},
  {id:'chat',label:'/แชตAI',title:'AI Chat (ต้องเปิด API ก่อน)',aliases:['แชตai','แชต ai','ai chat'],action:'link',target:'https://ai.chaylueklab.com/ai-chat/'},
  {id:'business',label:'/ธุรกิจ',title:'ศูนย์บริการ CHAYLUEKLAB',aliases:['ธุรกิจ','บริการ','business'],action:'link',target:'./business.html'},
]);

const normalized=text=>text.trim().replace(/^\//,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('th');

export function resolveLiffCommand(input){
  if(typeof input!=='string'||input.length>160)return null;
  const query=normalized(input);
  if(!query)return null;
  for(const entry of COMMANDS){
    for(const alias of [entry.label,...entry.aliases]){
      const key=normalized(alias);
      if(query===key)return {id:entry.id,command:entry,argument:''};
      // Only the reminder form accepts user text. No financial or destructive command executes on text input.
      if(entry.acceptTitle&&query.startsWith(key+' ')){
        const source=input.trim().replace(/^\//,'').trim();
        const title=source.slice(alias.replace(/^\//,'').length).trim();
        if(title&&title.length<=120)return {id:entry.id,command:entry,argument:title};
      }
    }
  }
  return null;
}

function showStatus(message){
  const target=document.getElementById('liffCommandStatus');
  if(target)target.textContent=message;
}
function jumpToPage(pageName){
  if(typeof window.switchPage!=='function'||!document.getElementById(pageName))return false;
  window.switchPage(pageName);
  return document.getElementById(pageName).classList.contains('active');
}
function openLink(target){
  const url=new URL(target,location.href);
  if(url.protocol!=='https:'&&url.origin!==location.origin)throw Error('ลิงก์ไม่ปลอดภัย');
  // LINE SDK opens external domains in a regular browser; LINE Login context is not forwarded.
  if(url.origin!==location.origin&&window.liff?.isInClient?.()&&typeof window.liff.openWindow==='function'){
    window.liff.openWindow({url:url.href,external:true});
  }else location.assign(url.href);
}
export function runLiffCommand(found){
  if(!found)return {ok:false,message:'ไม่พบคำสั่ง ลอง /เมนู หรือกดปุ่มด้านล่าง'};
  const {command,argument}=found;
  if(command.action==='help'){
    jumpToPage('homePage');
    const details=document.getElementById('liffCommandHelp');
    if(details)details.open=true;
    document.getElementById('liffCommandPanel')?.scrollIntoView({block:'center'});
    return {ok:true,message:'รายการคำสั่งทั้งหมดอยู่ด้านล่าง'};
  }
  if(command.action==='page'){
    if(!jumpToPage(command.target))return {ok:false,message:'ยังเปิดเมนูนี้ไม่ได้'};
    if(command.after&&typeof window[command.after]==='function')window[command.after]();
    return {ok:true,message:'เปิด'+command.title+'แล้ว'};
  }
  if(command.action==='form'){
    if(typeof window[command.target]!=='function')return {ok:false,message:'ไม่พบฟังก์ชันนี้'};
    window[command.target]();
    const modal=document.getElementById(command.target==='openTaskModal'?'taskModal':'financeModal');
    if(!modal?.classList.contains('show'))return {ok:false,message:'กรุณาเชื่อมต่อ LINE ก่อนบันทึกข้อมูล'};
    if(argument&&command.id==='remind'){
      const title=document.getElementById('taskTitle');
      if(title)title.value=argument;
    }
    return {ok:true,message:'เปิดแบบฟอร์มแล้ว กดยืนยันบันทึกเองเพื่อทำรายการ'};
  }
  if(command.action==='tools'){
    if(typeof window.openLifeTools!=='function')return {ok:false,message:'ยังเปิดเครื่องมือนี้ไม่ได้'};
    window.openLifeTools(command.target);
    return {ok:true,message:'เปิด'+command.title+'แล้ว'};
  }
  if(command.action==='link'){
    openLink(command.target);
    return {ok:true,message:'กำลังเปิด'+command.title};
  }
  return {ok:false,message:'ไม่รองรับคำสั่งนี้'};
}

function initCommandCenter(){
  const form=document.getElementById('liffCommandForm');
  const input=document.getElementById('liffCommandInput');
  if(!form||!input)return;
  const submit=command=>{
    const result=resolveLiffCommand(command);
    if(!result){showStatus('ไม่พบคำสั่งนี้ พิมพ์ /เมนู เพื่อดูทั้งหมด');return}
    try{const outcome=runLiffCommand(result);showStatus(outcome.message);}
    catch{showStatus('เปิดเมนูไม่สำเร็จ กรุณาลองอีกครั้ง');}
  };
  form.addEventListener('submit',event=>{event.preventDefault();submit(input.value)});
  document.querySelectorAll('[data-liff-command]').forEach(button=>{
    button.addEventListener('click',()=>{const command=button.getAttribute('data-liff-command');input.value=command||'';submit(input.value)});
  });
  const list=document.getElementById('liffCommandList');
  if(list)for(const command of COMMANDS){
    const item=document.createElement('li');
    const button=document.createElement('button');
    button.type='button';button.className='liff-command-item';button.textContent=command.label+' — '+command.title;
    button.addEventListener('click',()=>{input.value=command.label;submit(command.label)});
    item.append(button);list.append(item);
  }
  // Deep link to the command panel; never perform a write from a URL query parameter.
  if(new URLSearchParams(location.search).get('view')==='commands'){
    jumpToPage('homePage');
    requestAnimationFrame(()=>document.getElementById('liffCommandPanel')?.scrollIntoView({block:'start'}));
  }
}

if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initCommandCenter,{once:true});
  else initCommandCenter();
}
