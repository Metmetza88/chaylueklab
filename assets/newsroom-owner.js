import { newsroomConfig as config } from '../data/newsroom-config.js';
import { NEWSROOM_STATUS, NEWSROOM_TRANSITIONS, NEWSROOM_BEATS } from '../data/newsroom.js';
import { newsroomStages, newsroomRoles } from '../data/newsroom-workforce.js';
const $=id=>document.getElementById(id);
let token=null,selected=null,busy=false,savedFields='',liffInitialization=null;
const status=text=>{$('ownerStatus').textContent=text};
const el=(tag,text)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;return e};
async function request(action,fields={}){
 if(!token)throw new Error('กรุณาเข้าสู่ระบบ LINE');
 const response=await fetch(config.apiUrl,{method:'POST',headers:{'Content-Type':'application/json','x-line-id-token':token},body:JSON.stringify({action,...fields}),signal:AbortSignal.timeout(20000)});
 const data=await response.json();if(!response.ok){const messages={owner_identity_required:'บัญชี LINE นี้ไม่มีสิทธิ์เจ้าของ',owner_login_not_configured:'ยังไม่ได้ตั้งค่าบัญชีเจ้าของฝั่งเซิร์ฟเวอร์',newsroom_not_configured:'กองบรรณาธิการยังไม่ได้ติดตั้ง',revision_conflict:'ข่าวถูกแก้ไขแล้ว กรุณาโหลดรายการใหม่',ready_locked:'ฉบับนี้ล็อกแล้ว ให้ส่งกลับไปแก้ไขก่อน',factcheck_required:'ต้องตรวจข้อเท็จจริงของฉบับปัจจุบันก่อน',owner_approval_required:'ต้องให้เจ้าของอนุมัติฉบับปัจจุบันก่อน',assignment_required:'ระบุนักข่าวก่อนมอบหมาย',workforce_not_configured:'ยังไม่ได้เชื่อมระบบ AI Workforce จริง',invalid_request:'ข้อมูลไม่ครบหรือไม่ถูกต้อง กรุณาตรวจฟอร์มและบันทึกการตรวจ'};throw new Error(messages[data.error]||'บันทึกไม่สำเร็จ กรุณาลองใหม่')}return data;
}
async function run(work){if(busy)return;busy=true;document.querySelectorAll('[data-write]').forEach(b=>b.disabled=true);try{await work()}catch(e){status(e.message||'ระบบยังไม่พร้อม กรุณาลองใหม่')}finally{busy=false;document.querySelectorAll('[data-write]').forEach(b=>b.disabled=false);$('transitionStory').disabled=!$('nextStatus').options.length}}
async function load(){const data=await request('list');const list=$('ownerStories');list.replaceChildren();for(const s of data.stories||[]){const b=el('button',`${NEWSROOM_STATUS[s.status]||s.status} · ${s.title}`);b.type='button';b.className='story-choice';b.onclick=()=>select(s);list.append(b)}if(!(data.stories||[]).length)list.append(el('p','ยังไม่มีข่าวฉบับร่าง'))}
function select(s){selected=s;$('storyTitle').value=s.title||'';$('storySlug').value=s.slug||'';$('storyCategory').value=s.category||'AI';$('storySummary').value=s.summary||'';$('storyBody').value=s.body||'';$('storySources').value=(s.sources||[]).map(x=>typeof x==='string'?x:x.url).join('\n');$('storySocial').value=s.social_copy||'';$('storyImageBrief').value=s.image_brief||'';$('storyReporter').value=s.reporter||'';$('storyMediaUrl').value=s.media?.url||'';$('storyMediaType').value=s.media?.type||'image';$('storyState').textContent=s.id?`${NEWSROOM_STATUS[s.status]} · เวอร์ชัน ${s.revision}`:'ข่าวใหม่';$('approveStory').hidden=s.status!=='ready';$('publishStory').hidden=s.status!=='ready'||!s.owner_approved_at;$('factcheckStory').hidden=s.status!=='factcheck';const next=$('nextStatus');next.replaceChildren(...(NEWSROOM_TRANSITIONS[s.status]||[]).filter(x=>x!=='published').map(x=>{const option=el('option',NEWSROOM_STATUS[x]);option.value=x;return option}));$('transitionStory').disabled=!next.options.length;$('studioBrief').textContent=s.image_brief||'';$('lineDraft').textContent=s.social_copy||'';document.querySelectorAll('#storyForm input,#storyForm textarea,#storyForm select').forEach(x=>x.disabled=['ready','published','killed'].includes(s.status));$('storySlug').disabled=Boolean(s.id)||['ready','published','killed'].includes(s.status);$('saveStory').hidden=['ready','published','killed'].includes(s.status);savedFields=JSON.stringify(fields());}
function fields(){const labels=new Map((selected?.sources||[]).map(source=>typeof source==='string'?[source,'']:[source.url,source.label||'']));return {title:$('storyTitle').value.trim(),slug:$('storySlug').value.trim(),category:$('storyCategory').value,summary:$('storySummary').value.trim(),body:$('storyBody').value.trim(),sources:$('storySources').value.split('\n').map(x=>x.trim()).filter(Boolean).map(url=>({url,label:labels.get(url)||''})),social_copy:$('storySocial').value.trim(),image_brief:$('storyImageBrief').value.trim(),reporter:$('storyReporter').value.trim(),media:$('storyMediaUrl').value.trim()?{type:$('storyMediaType').value,url:$('storyMediaUrl').value.trim(),...(selected?.media?.url===$('storyMediaUrl').value.trim()&&selected.media.alt!==undefined?{alt:selected.media.alt}:{})}:null}}
function requireSavedReview(){if(!selected?.id)throw new Error('เลือกข่าวที่บันทึกแล้วก่อน');if(JSON.stringify(fields())!==savedFields)throw new Error('มีการแก้ไขที่ยังไม่ได้บันทึก กรุณาบันทึกฉบับร่างก่อนส่งต่อ ตรวจข้อเท็จจริง หรือขอร่างจาก AI')}
async function mutate(action,extra={}){if(!selected?.id)throw new Error('เลือกข่าวที่บันทึกแล้วก่อน');if(action!=='update')requireSavedReview();const data=await request(action,{story_id:selected.id,expected_revision:selected.revision,...extra});select(data.story);await load();status('บันทึกสำเร็จ')}
async function connectOwner(startLogin=false){
 if(!config.liffId)throw new Error('ยังไม่ได้ตั้งค่าแอป LINE เดิม');
 const endpoint=new URL(config.liffEndpointUrl),current=new URL(location.href);
 if(current.origin!==endpoint.origin||!current.pathname.startsWith(endpoint.pathname)){
  status('กดเข้าสู่ระบบเพื่อเปิดกองบรรณาธิการผ่านแอป LINE เดิม');
  if(startLogin)location.assign(`https://liff.line.me/${encodeURIComponent(config.liffId)}/newsroom-owner.html`);
  return;
 }
 if(!window.liff)throw new Error('โหลด LINE Login ไม่สำเร็จ');
 if(!liffInitialization)liffInitialization=window.liff.init({liffId:config.liffId}).catch(error=>{liffInitialization=null;throw error});
 await liffInitialization;
 if(!window.liff.isLoggedIn()){if(startLogin)window.liff.login({redirectUri:location.href});return}
 token=window.liff.getIDToken();if(!token)throw new Error('แอป LINE เดิมต้องเปิดสิทธิ์ openid');
 try{await load()}catch(error){token=null;$('ownerDesk').hidden=true;throw error}
 $('ownerDesk').hidden=false;status('เข้าสู่กองบรรณาธิการแล้ว');
}
$('loginOwner').onclick=()=>run(()=>connectOwner(true));
// Complete LIFF initialization on every page load, including the login callback.
if(document.readyState==='complete')run(()=>connectOwner());
else window.addEventListener('load',()=>run(()=>connectOwner()),{once:true});
$('newStory').onclick=()=>{if(busy)return;delete $('storyForm').dataset.requestId;select({status:'pitched',category:'AI'})};
$('storyForm').onsubmit=e=>{e.preventDefault();run(async()=>{const values=fields();if(selected?.id){const {slug,...patch}=values;await mutate('update',{patch})}else{const requestId=$('storyForm').dataset.requestId||crypto.randomUUID();$('storyForm').dataset.requestId=requestId;const data=await request('create',{request_id:requestId,fields:values});delete $('storyForm').dataset.requestId;select(data.story);await load();status('บันทึกข่าวฉบับร่างแล้ว')}})};
$('transitionStory').onclick=()=>run(()=>mutate('transition',{to_status:$('nextStatus').value,note:$('reviewNote').value.trim()}));
$('factcheckStory').onclick=()=>run(()=>mutate('factcheck',{verdict:'verified',note:$('reviewNote').value.trim()}));
$('approveStory').onclick=()=>run(()=>mutate('approve'));
$('publishStory').onclick=()=>run(()=>mutate('publish'));
$('copyLine').onclick=()=>run(async()=>{await navigator.clipboard.writeText(selected?.social_copy||'');status('คัดลอกข้อความ LINE แล้ว ยังไม่มีการส่งข้อความ')});
$('copyImageBrief').onclick=()=>run(async()=>{await navigator.clipboard.writeText(selected?.image_brief||'');status('คัดลอกบรีฟภาพแล้ว')});
for(const category of NEWSROOM_BEATS){const option=el('option',category);option.value=category;$('storyCategory').append(option)}
const studioHandoff=document.querySelector('.handoff a');if(studioHandoff)studioHandoff.href=config.studioUrl;
const workforceBox=el('details');workforceBox.className='handoff';workforceBox.append(el('summary',`AI Workforce · ${newsroomRoles.length} บทบาท`));
const stageSelect=el('select');stageSelect.setAttribute('aria-label','ขั้นตอน AI');
const labels={reporter:'นักข่าว / ค้นข่าว',factcheck:'ข้อเสนอการตรวจข้อเท็จจริง',editor:'Editor',social:'Social / LINE copy',image_brief:'บรีฟภาพ / วิดีโอ'};
for(const stage of Object.keys(newsroomStages)){const option=el('option',labels[stage]);option.value=stage;stageSelect.append(option)}
const draftButton=el('button','ขอร่างจาก AI');draftButton.type='button';draftButton.className='button';draftButton.dataset.write='';
const proposal=el('pre');proposal.className='story-content';proposal.setAttribute('aria-live','polite');
draftButton.onclick=()=>run(async()=>{requireSavedReview();const snapshot={id:selected.id,revision:selected.revision};const result=await request('workforce',{story_id:snapshot.id,expected_revision:snapshot.revision,stage:stageSelect.value,request_id:crypto.randomUUID()});if(selected?.id!==snapshot.id||selected?.revision!==snapshot.revision||result.story_id!==snapshot.id||result.story_revision!==snapshot.revision)throw new Error('ฉบับข่าวเปลี่ยนแล้ว กรุณาขอร่างจาก AI ใหม่สำหรับฉบับปัจจุบัน');proposal.textContent=JSON.stringify(result.draft||result,null,2);status('ได้ข้อเสนอจาก AI แล้ว กรุณาตรวจและนำข้อมูลไปบันทึกเอง ยังไม่มีการอนุมัติหรือเผยแพร่')});
workforceBox.append(el('p','ผลจาก AI เป็นข้อเสนอ ต้องตรวจและบันทึกเองก่อนอนุมัติ'),stageSelect,draftButton,proposal);document.querySelector('.editor-panel').append(workforceBox);
select({status:'pitched',category:'AI'});
