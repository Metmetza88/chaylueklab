import { modules } from './catalog.mjs';
import * as view from './views.mjs';
import { demoPage,generateQuestions,questionList,scoreAnswers,updateCertificate,quoteDraft } from '../modules/demos.mjs';
import { api,downloadCsv } from './api-client.mjs';
const main=document.getElementById('main');
let compare=[];
try { compare=JSON.parse(localStorage.getItem('edu_compare')??'[]').filter(s=>modules.some(m=>m.slug===s)).slice(0,3); } catch { compare=[]; }
let user=null, schoolId='', draft=null, routeVersion=0, reportRows=[];
let config={authConfigured:false,platformEnabled:false};
let toastTimer;
/** แสดงข้อความสถานะที่อ่านได้ด้วย Screen Reader */
function toast(message) {
 const target=document.getElementById('toast');target.textContent=message;target.hidden=false;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{target.hidden=true;},5000);
}
function setCompare() {
 try{localStorage.setItem('edu_compare',JSON.stringify(compare));}catch{/* ทำงานต่อเมื่อพื้นที่จัดเก็บถูกปิด */}
 document.getElementById('compare-count').textContent=compare.length;
}
function routeInfo() {
 const [path,search='']=(location.hash.slice(1)||'/').split('?');
 return {path,query:new URLSearchParams(search)};
}
/** อ่านบัญชีจากเซิร์ฟเวอร์ทุกครั้ง ไม่เชื่อสิทธิ์ที่อยู่ใน localStorage */
async function loadUser() {
 user=await api('me');
 if(!user.members.some(m=>m.school_id===schoolId)) schoolId=user.members[0]?.school_id??'';
 return user;
}
function renderError(error) {
 const login=error.status===401;
 return view.workspaceShell(`<div class="panel"><h2>${login?'กรุณาเข้าสู่ระบบ':'ยังไม่สามารถเปิดพื้นที่ทำงานได้'}</h2><div class="notice ${login?'':'error'}" role="alert">${view.esc(error.message)}</div><div class="stack-actions">${login?'<a class="button" href="#/login">เข้าสู่ระบบ</a>':'<button class="button" data-retry>ลองอีกครั้ง</button>'}<a class="button secondary" href="#/catalog">สำรวจโปรแกรม</a></div></div>`,user);
}
/** Router แยกหน้าร้านสาธารณะจาก Workspace ที่ต้องยืนยันตัวตน */
async function renderRoute() {
 const version=++routeVersion;
 const {path,query}=routeInfo();
 const isCurrent=()=>version===routeVersion;
 document.getElementById('navigation').classList.remove('open');
 document.querySelector('.mobile-menu').setAttribute('aria-expanded','false');
 try {
  let html;
  if(path==='/') html=view.home();
  else if(path==='/catalog') html=view.catalog(query,compare);
  else if(path.startsWith('/product/')) html=view.product(modules.find(m=>m.slug===path.split('/')[2]));
  else if(path==='/compare') html=view.comparison(compare);
  else if(path==='/quote') html=view.quotePage(query,compare);
  else if(path==='/demos') html=view.demos(compare);
  else if(path.startsWith('/demo/')) html=demoPage(path.split('/')[2]);
  else if(path==='/help') html=view.help();
  else if(path==='/manual') html=view.manual();
  else if(path==='/login') {
   main.innerHTML=view.loading();config=await api('config');html=view.login(config);
  } else if(['/workspace','/account','/admin','/reports'].includes(path)) {
   main.innerHTML=view.loading();
   await loadUser();
   if(!isCurrent())return;
   if(!user.platformEnabled) throw Object.assign(new Error('พื้นที่ทำงานยังไม่เปิดใช้งาน รอการตรวจฐานข้อมูลจริง'),{status:503});
   if(path==='/admin') html=view.admin(await api('admin',{query:{page:query.get('page')??1}}),user);
   else if(!schoolId) html=view.workspaceShell(view.empty('ยังไม่มีโรงเรียนที่ได้รับสิทธิ์','ผู้ดูแลต้องเพิ่มสมาชิกโรงเรียนให้บัญชีของคุณก่อนใช้งาน',null),user);
   else if(path==='/workspace') html=view.workspace(await api('workspace',{query:{school_id:schoolId}}),user,schoolId);
   else if(path==='/account') {
    const [quotes,services,profiles]=await Promise.all([api('quotations',{query:{school_id:schoolId}}),api('services',{query:{school_id:schoolId}}),api('profile',{query:{school_id:schoolId}})]);
    html=view.account({quotes,services,profile:profiles[0]},user,schoolId);
   } else {
    const [quotes,services]=await Promise.all([api('quotations',{query:{school_id:schoolId}}),api('services',{query:{school_id:schoolId}})]);
    reportRows=[['ประเภท','เลขอ้างอิง','สถานะ','วันที่'],...quotes.map(r=>['คำขอใบเสนอราคา',r.id,view.workflowLabel(r.status),view.dateThai(r.created_at)]),...services.map(r=>['งานบริการ',r.id,view.workflowLabel(r.status),view.dateThai(r.created_at)])];
    html=view.workspaceShell(`${view.schoolSelector(user,schoolId)}<section class="panel"><h2>รายงานคำขอและงานบริการ</h2><p>คำขอใบเสนอราคา ${quotes.length} รายการ · งานบริการ ${services.length} รายการ</p><p class="item-meta">สรุปรายการล่าสุดสูงสุด 25 รายการต่อประเภทในโรงเรียนที่เลือก</p><button data-export-report>ส่งออก CSV</button></section>`,user);
   }
  } else html=view.head('ไม่พบหน้า')+`<section class="section container">${view.empty('ไม่พบหน้าที่ร้องขอ','กลับไปสำรวจโปรแกรมที่มีในแพลตฟอร์ม')}</section>`;
  if(!isCurrent())return;
  main.innerHTML=html;
  document.title=`${main.querySelector('h1')?.textContent??'Education 2570'} | Education 2570 — พ.สมนึก 2&3`;
  setCompare();
  // การ์ดหน้าหลักใช้ข้อมูลการเลือกปัจจุบันหลัง render
  document.querySelectorAll('[data-compare]').forEach(input=>{input.checked=compare.includes(input.dataset.compare);});
 } catch(error) {if(isCurrent())main.innerHTML=renderError(error);}
}
/** ป้องกันการส่งซ้ำระหว่างรอ API และแสดง error ให้ผู้ใช้แก้ไขต่อได้ */
async function submitTask(form,task) {
 const button=form.querySelector('button[type="submit"]');
 const label=button.textContent;button.disabled=true;button.textContent='กำลังดำเนินการ…';
 try {await task();} catch(error) {
  const status=form.querySelector('[role="status"]')??document.getElementById('toast');
  status.textContent=error.message;status.className='notice error';status.hidden=false;
 } finally {if(button.isConnected){button.disabled=false;button.textContent=label;}}
}
main.addEventListener('submit',async event=>{
 const form=event.target;event.preventDefault();
 if(form.id==='exam-form') {generateQuestions(new FormData(form).get('count'));document.getElementById('questions').innerHTML=questionList();toast('สร้างข้อสอบแล้ว');}
 if(form.id==='quiz-form') {
  const fields=new FormData(form),answers=Array.from(form.querySelectorAll('input')).map(input=>fields.get(input.name));
  document.getElementById('score').textContent=`คะแนน ${scoreAnswers(answers)} / ${answers.length}`;
 }
 if(form.id==='certificate-form') {updateCertificate(form);toast('สร้างเกียรติบัตรตัวอย่างแล้ว');}
 if(form.id==='login-form') await submitTask(form,async()=>{
  const fields=new FormData(form);await api('login',{body:{email:fields.get('email'),password:fields.get('password')}});form.reset();location.hash='/workspace';
 });
 if(form.id==='quote-form') {
  const fields=new FormData(form),slugs=fields.getAll('module');
  const result=document.getElementById('quote-result');
  if(!slugs.length){result.textContent='กรุณาเลือกอย่างน้อย 1 โปรแกรม';return;}
  draft={schoolName:fields.get('school_name').trim(),note:fields.get('note').trim(),products:modules.filter(m=>slugs.includes(m.slug))};
  result.innerHTML=quoteDraft(draft)+`<div class="no-print"><p>คัดลอกสรุป แล้วเปิด LINE ของ พ.สมนึก 2&3 เพื่อส่งข้อความให้ทีมงาน กรุณางดแนบข้อมูลนักเรียน</p><div class="stack-actions"><button type="button" class="secondary" data-copy-draft>คัดลอกสรุป</button><a class="button" href="https://lin.ee/8qkUbdt" target="_blank" rel="noopener noreferrer">เปิด LINE พ.สมนึก 2&3</a><button type="button" class="secondary" data-print-draft>พิมพ์สรุปคำขอ</button><button type="button" class="secondary" data-send-quote>เข้าสู่ระบบ / ส่งคำขอ</button></div><div id="send-status" role="status"></div></div>`;
 }
 if(form.id==='profile-form') await submitTask(form,async()=>{
  await api('customer-profile',{body:{school_id:schoolId,contact_name:new FormData(form).get('contact_name')}});toast('บันทึกข้อมูลผู้ติดต่อแล้ว');
 });
 if(form.id==='provision-form') await submitTask(form,async()=>{
  const fields=new FormData(form);await api('provision',{body:Object.fromEntries(fields)});toast('ออกสิทธิ์เรียบร้อยแล้ว');await renderRoute();
 });
 if(form.id==='service-form') await submitTask(form,async()=>{
  const fields=new FormData(form);await api('service',{body:{school_id:schoolId,subject:fields.get('subject'),description:fields.get('description')}});toast('ส่งเรื่องแจ้งปัญหาแล้ว');await renderRoute();
 });
});
main.addEventListener('input',event=>{
 if(event.target.id==='search') updateCatalog();
});
function updateCatalog() {
 const {query}=routeInfo();
 document.getElementById('catalog-list').innerHTML=view.catalogList({category:query.get('category')??'',status:document.getElementById('status-filter').value,search:document.getElementById('search').value},compare);
}
main.addEventListener('change',event=>{
 const target=event.target;
 if(target.dataset.compare){
  const slug=target.dataset.compare;
  if(target.checked&&compare.length===3){target.checked=false;toast('เลือกเปรียบเทียบได้สูงสุด 3 โปรแกรม');return;}
  compare=target.checked?[...compare,slug]:compare.filter(s=>s!==slug);setCompare();
 }
 if(target.id==='status-filter')updateCatalog();
 if(target.id==='school-select'){schoolId=target.value;if(routeInfo().path!=='/quote')void renderRoute();}
});
main.addEventListener('click',async event=>{
 const target=event.target.closest('button');if(!target)return;
 if(target.hasAttribute('data-retry'))void renderRoute();
 if(target.dataset.removeCompare){compare=compare.filter(s=>s!==target.dataset.removeCompare);setCompare();void renderRoute();}
 if(target.hasAttribute('data-print'))window.print();
 if(target.hasAttribute('data-print-draft')){
  const section=main.querySelector('section');section.classList.add('print-target');
  document.body.classList.add('printing');window.print();
 }
 if(target.hasAttribute('data-copy-draft')&&draft){
  const status=document.getElementById('send-status');
  const text=['ขอใบเสนอราคา Education 2570',`หน่วยงาน: ${draft.schoolName}`,`โปรแกรม: ${draft.products.map(product=>product.name).join(', ')}`,draft.note].filter(Boolean).join('\n');
  try {
   await navigator.clipboard.writeText(text);
   status.textContent='คัดลอกแล้ว เปิด LINE แล้ววางข้อความเพื่อส่งคำขอ';
  } catch {
   const field=document.createElement('textarea');
   field.value=text;field.readOnly=true;field.rows=5;
   field.setAttribute('aria-label','สรุปคำขอสำหรับคัดลอก');
   status.replaceChildren('เลือกคัดลอกข้อความด้านล่าง แล้วส่งให้ทีมงานผ่าน LINE',field);
   field.focus();field.select();
  }
 }
 if(target.hasAttribute('data-export-report'))downloadCsv(reportRows,'education-2570-report.csv');
 if(target.hasAttribute('data-send-quote')) {
  target.disabled=true;
  try {
   await loadUser();
   const output=document.getElementById('send-status');
   if(!user.platformEnabled)throw new Error('การส่งคำขอยังไม่เปิดใช้งาน สรุปนี้ยังไม่ได้ส่งเข้าสู่ระบบ');
   if(!user.members.length)throw new Error('บัญชีนี้ยังไม่ได้รับสิทธิ์โรงเรียน กรุณาติดต่อผู้ดูแล');
   output.innerHTML=`${view.schoolSelector(user,schoolId)}<p class="notice">ส่งให้โรงเรียนที่เลือกด้านบน ตรวจสอบก่อนยืนยัน</p><button type="button" data-confirm-quote>ยืนยันส่งคำขอ</button>`;
  }catch(error){document.getElementById('send-status').innerHTML=`<p class="notice error">${view.esc(error.message)}</p>${error.status===401?'<a class="button" href="#/login">เข้าสู่ระบบ</a>':''}`;}
  finally{target.disabled=false;}
 }
 if(target.hasAttribute('data-confirm-quote')&&draft){
  target.disabled=true;
  try {
   const rows=await api('quotation',{body:{school_id:schoolId,modules:draft.products.map(m=>m.slug),note:draft.note}});
   document.getElementById('send-status').innerHTML=`<p class="notice success">บันทึกคำขอแล้ว เลขอ้างอิง ${view.esc(rows[0]?.id)} · ดูสถานะได้ในบัญชีลูกค้า</p>`;draft=null;
  }catch(error){toast(error.message);target.disabled=false;}
 }
 const actions=[['moduleFlag','module-flag',()=>({slug:target.dataset.moduleFlag,enabled:target.dataset.enabled==='true'})],['entitlement','entitlement',()=>({id:target.dataset.entitlement,status:target.dataset.status})],['serviceStatus','service-status',()=>({id:target.dataset.serviceStatus,status:target.dataset.status})],['readNotification','notification-read',()=>({id:target.dataset.readNotification})]];
 for(const [key,action,body] of actions) if(target.dataset[key]){
  target.disabled=true;try{const rows=await api(action,{body:body()});if(!rows.length)throw new Error('ไม่พบรายการหรือไม่มีสิทธิ์แก้ไข');toast('บันทึกการเปลี่ยนแปลงแล้ว');await renderRoute();}catch(error){toast(error.message);target.disabled=false;}
 }
 if(target.hasAttribute('data-logout')){target.disabled=true;try{await api('logout',{body:{}});user=null;schoolId='';location.hash='/login';}catch(error){toast(error.message);target.disabled=false;}}
});
document.querySelector('.skip').addEventListener('click',event=>{
 event.preventDefault();main.focus();main.scrollIntoView({block:'start'});
});
document.querySelector('.mobile-menu').addEventListener('click',event=>{
 const button=event.currentTarget;const open=button.getAttribute('aria-expanded')!=='true';
 button.setAttribute('aria-expanded',String(open));document.getElementById('navigation').classList.toggle('open',open);
});
window.addEventListener('afterprint',()=>{document.body.classList.remove('printing');document.querySelectorAll('.print-target').forEach(el=>el.classList.remove('print-target'));});
window.addEventListener('hashchange',()=>{void renderRoute();main.focus({preventScroll:true});window.scrollTo(0,0);});
setCompare();void renderRoute();
