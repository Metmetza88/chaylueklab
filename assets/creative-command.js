import {videoOutputUrl} from './video-media.js';
const API='https://bxaplhrunxiadjsdobyl.supabase.co/functions/v1';
const messages={invalid_line_login:'กรุณาเข้าสู่ระบบ LINE ใหม่',owner_only:'การสร้างสื่อ AI เปิดให้เจ้าของบัญชีเท่านั้น',invalid_prompt:'คำสั่งวิดีโอต้องมีรายละเอียดอย่างน้อย 8 ตัวอักษร เช่น โลโก้สีทองหมุนช้าๆ',account_suspended:'บัญชีนี้ถูกระงับสิทธิ์ กรุณาติดต่อแอดมิน',video_quota_exceeded:'เครดิตสร้างวิดีโอไม่เพียงพอ กรุณาตรวจสิทธิ์ใน Video Studio',video_create_failed:'เริ่มสร้างวิดีโอไม่สำเร็จ กรุณาตรวจสิทธิ์โมเดลและโควตาใน Google AI Studio',invalid_aspect_ratio:'กรุณาเลือกสัดส่วน 9:16 หรือ 16:9',image_provider_not_configured:'บริการสร้างภาพยังไม่เปิดใช้งาน เจ้าของต้องตั้งค่า Gemini ใน backend ก่อน',provider_quota:'โควตาบริการ AI เต็ม กรุณาตรวจเครดิต',provider_timeout:'บริการใช้เวลานานเกินไป กรุณาลองใหม่',no_image_returned:'บริการไม่ส่งภาพกลับมา ลองปรับคำสั่งใหม่'};
let currentUrl=null;
function node(tag,text,cls){const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el}
async function mediaApi(kind,body){
  if(!window.liff?.isLoggedIn?.())throw Error('กรุณาเปิดผ่าน LINE และเข้าสู่ระบบก่อน');
  const res=await fetch(API+(kind==='video'?'/video-create':'/image-create'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,accessToken:window.liff.getAccessToken()||'',idToken:window.liff.getIDToken()||''}),signal:AbortSignal.timeout(100000)});
  const data=await res.json().catch(()=>({}));
  if(data.error==='provider_acceptance_pending'&&data.job?.id)return {...data,ok:true};if(!res.ok||!data.ok)throw Error(messages[data.error]||(data.error==='video_provider_not_configured'?'บริการสร้างวิดีโอยังไม่เปิดใช้งาน':null)||'เชื่อมต่อบริการ AI ไม่สำเร็จ');return data;
}
export function openCreativeCommand(kind,prompt=''){
  window.switchPage?.('homePage');
  let panel=document.getElementById('creativeCommandPanel');
  if(!panel){panel=node('section',null,'creative-panel');panel.id='creativeCommandPanel';document.getElementById('liffCommandPanel')?.after(panel)}
  panel.replaceChildren();panel.setAttribute('aria-label',kind==='video'?'สั่งสร้างวิดีโอ':'สั่งสร้างภาพ');
  panel.append(node('div','CHAYLUEKLAB / CREATIVE ENGINE','creative-eyebrow'),node('h2',kind==='video'?'เปลี่ยนคำสั่งเป็นวิดีโอ':'เปลี่ยนไอเดียเป็นภาพ'));
  const label=node('label','คำสั่งของคุณ');const input=node('textarea');input.maxLength=2000;input.minLength=kind==='video'?8:3;input.placeholder=kind==='video'?'เช่น โลโก้สีทองหมุนช้าๆ บนฉากดำ แสงไซเบอร์':'เช่น โปสเตอร์ CHAYLUEKLAB โทนดำทอง';input.rows=3;input.value=prompt;input.id='creativePrompt';label.htmlFor=input.id;panel.append(label,input);
  const ratioLabel=node('label','สัดส่วน');const ratio=node('select');ratio.id='creativeRatio';ratioLabel.htmlFor=ratio.id;
  for(const value of kind==='video'?['9:16','16:9']:['1:1','4:5','3:4','9:16','16:9']){const option=node('option',value);option.value=value;ratio.append(option)}
  if(prompt.includes('9:16'))ratio.value='9:16';else if(prompt.includes('16:9'))ratio.value='16:9';panel.append(ratioLabel,ratio);
  const status=node('p','กำลังตรวจการเชื่อมต่อบริการ…','creative-status');status.setAttribute('role','status');
  const button=node('button',kind==='video'?'สร้างวิดีโอ 8 วินาที':'สร้างรูปภาพ');button.type='button';button.disabled=true;
  const result=node('div',null,'creative-result');panel.append(status,button,result);
  let busy=false;const requestId=crypto.randomUUID();
  if(kind==='video'){const studio=node('button','แนบภาพใน Video Studio');studio.type='button';studio.addEventListener('click',()=>{sessionStorage.setItem('chaylueklab.creative.video',JSON.stringify({prompt:input.value.trim(),ratio:ratio.value}));location.assign(new URL('./ai-video.html',location.href).href)});panel.insertBefore(studio,result)}
  button.addEventListener('click',async()=>{
    if(busy)return;const minLength=kind==='video'?8:3;if(input.value.trim().length<minLength){status.textContent=kind==='video'?messages.invalid_prompt:'พิมพ์รายละเอียดภาพอย่างน้อย 3 ตัวอักษร';input.focus({preventScroll:true});return}
    busy=true;button.disabled=true;panel.classList.add('is-generating');status.textContent=kind==='video'?'กำลังส่งงานวิดีโอไปยัง backend…':'กำลังสร้างภาพจริง กรุณารอสักครู่…';result.replaceChildren();
    try{
      if(kind==='video'){
        const created=await mediaApi('video',{requestId,model:'veo',duration:8,prompt:input.value.trim(),ratio:ratio.value});
        const start=Date.now();let job=created.job;
        while(job&&['queued','generating'].includes(job.status)){
          if(Date.now()-start>960000)throw Error('งานใช้เวลานาน กรุณาตรวจสถานะใน Video Studio');
          status.textContent=job.status==='queued'?'รับงานแล้ว กำลังยืนยันกับผู้ให้บริการ':'กำลังสร้างวิดีโอ'+(job.progress>0?' · '+Math.round(job.progress*100)+'%':'…');
          await new Promise(resolve=>setTimeout(resolve,4000));
          const res=await fetch(API+'/video-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId:job.id,accessToken:window.liff.getAccessToken()||'',idToken:window.liff.getIDToken()||''}),signal:AbortSignal.timeout(100000)});
          const polled=await res.json();if(!res.ok||!polled.ok)throw Error('ตรวจสถานะวิดีโอไม่สำเร็จ');job=polled.job;
        }
        if(job?.status!=='completed'||!job.videoUrl)throw Error('สร้างวิดีโอไม่สำเร็จ กรุณาตรวจโควตาและคำสั่ง');
        const url=videoOutputUrl(job.videoUrl,API);const video=node('video');video.controls=true;video.playsInline=true;video.src=url;video.style.maxWidth='100%';
        const download=node('a','ดาวน์โหลดวิดีโอ MP4');download.href=url;download.download='chaylueklab-video.mp4';download.target='_blank';download.rel='noopener';result.append(video,download);status.textContent='สร้างวิดีโอสำเร็จ พร้อมเล่นและดาวน์โหลด';return;
      }
      const data=await mediaApi('image',{prompt:input.value.trim(),ratio:ratio.value});const image=data.image;
      if(!['image/png','image/jpeg','image/webp'].includes(image?.mimeType)||typeof image.data!=='string'||image.data.length>12000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data))throw Error('รูปแบบภาพจากบริการไม่ถูกต้อง');
      const bytes=Uint8Array.from(atob(image.data),c=>c.charCodeAt(0));const bitmap=await createImageBitmap(new Blob([bytes],{type:image.mimeType}));
      if(bitmap.width*bitmap.height>40000000){bitmap.close();throw Error('ภาพมีขนาดใหญ่เกินไป')}
      const canvas=node('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.setAttribute('aria-label','ภาพที่สร้างจากคำสั่งของคุณ');canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('บันทึกภาพไม่ได้');
      if(currentUrl)URL.revokeObjectURL(currentUrl);currentUrl=URL.createObjectURL(blob);const download=node('a','ดาวน์โหลดภาพ PNG');download.href=currentUrl;download.download='chaylueklab-image.png';result.append(canvas,download);status.textContent='สร้างภาพสำเร็จ พร้อมดาวน์โหลด';
    }catch(e){status.textContent=e.name==='TimeoutError'?'บริการใช้เวลานานเกินไป กรุณาลองใหม่':e.message}
    finally{busy=false;button.disabled=false;panel.classList.remove('is-generating')}
  });
  mediaApi(kind,{action:'status',model:'veo'}).then(data=>{status.textContent=data.configured?'บริการพร้อม รับคำสั่งได้เลย':'บริการ AI ยังไม่เปิดใช้งาน รอเจ้าของตั้งค่า Gemini ใน backend';button.disabled=!data.configured}).catch(e=>{status.textContent=e.message});
  panel.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});input.focus({preventScroll:true});
  return {ok:true,message:kind==='video'?'เตรียมคำสั่งวิดีโอแล้ว':'เปิดพื้นที่สั่งสร้างภาพแล้ว'};
}
