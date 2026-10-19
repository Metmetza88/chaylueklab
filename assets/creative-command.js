const API='https://bxaplhrunxiadjsdobyl.supabase.co/functions/v1';
const messages={invalid_line_login:'กรุณาเข้าสู่ระบบ LINE ใหม่',owner_only:'การสร้างภาพ AI เปิดให้เจ้าของบัญชีเท่านั้น',image_provider_not_configured:'บริการสร้างภาพยังไม่เปิดใช้งาน เจ้าของต้องตั้งค่า Gemini ใน backend ก่อน',provider_quota:'โควตาบริการ AI เต็ม กรุณาตรวจเครดิต',provider_timeout:'บริการใช้เวลานานเกินไป กรุณาลองใหม่',no_image_returned:'บริการไม่ส่งภาพกลับมา ลองปรับคำสั่งใหม่'};
let currentUrl=null;
function node(tag,text,cls){const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el}
async function imageApi(body){
  if(!window.liff?.isLoggedIn?.())throw Error('กรุณาเปิดผ่าน LINE และเข้าสู่ระบบก่อน');
  const res=await fetch(API+'/image-create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,accessToken:window.liff.getAccessToken()||'',idToken:window.liff.getIDToken()||''}),signal:AbortSignal.timeout(100000)});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok)throw Error(messages[data.error]||'เชื่อมต่อบริการสร้างภาพไม่สำเร็จ');return data;
}
export function openCreativeCommand(kind,prompt=''){
  window.switchPage?.('homePage');
  let panel=document.getElementById('creativeCommandPanel');
  if(!panel){panel=node('section',null,'creative-panel');panel.id='creativeCommandPanel';document.getElementById('liffCommandPanel')?.after(panel)}
  panel.replaceChildren();panel.setAttribute('aria-label',kind==='video'?'สั่งสร้างวิดีโอ':'สั่งสร้างภาพ');
  panel.append(node('div','CHAYLUEKLAB / CREATIVE ENGINE','creative-eyebrow'),node('h2',kind==='video'?'เปลี่ยนคำสั่งเป็นวิดีโอ':'เปลี่ยนไอเดียเป็นภาพ'));
  const label=node('label','คำสั่งของคุณ');const input=node('textarea');input.maxLength=2000;input.rows=3;input.value=prompt;input.id='creativePrompt';label.htmlFor=input.id;panel.append(label,input);
  const ratioLabel=node('label','สัดส่วน');const ratio=node('select');ratio.id='creativeRatio';ratioLabel.htmlFor=ratio.id;
  for(const value of kind==='video'?['9:16','16:9']:['1:1','4:5','3:4','9:16','16:9']){const option=node('option',value);option.value=value;ratio.append(option)}
  if(prompt.includes('9:16'))ratio.value='9:16';else if(prompt.includes('16:9'))ratio.value='16:9';panel.append(ratioLabel,ratio);
  const status=node('p',kind==='video'?'ส่งคำสั่งไป Video Studio เดิม แล้วเลือกภาพต้นฉบับก่อนสร้างวิดีโอ':'กำลังตรวจการเชื่อมต่อบริการ…','creative-status');status.setAttribute('role','status');
  const button=node('button',kind==='video'?'เปิด Video Studio พร้อมคำสั่ง':'สร้างรูปภาพ');button.type='button';button.disabled=kind!=='video';
  const result=node('div',null,'creative-result');panel.append(status,button,result);
  let busy=false;
  button.addEventListener('click',async()=>{
    if(busy)return;if(input.value.trim().length<3){status.textContent='พิมพ์รายละเอียดอย่างน้อย 3 ตัวอักษร';return}
    if(kind==='video'){sessionStorage.setItem('chaylueklab.creative.video',JSON.stringify({prompt:input.value.trim(),ratio:ratio.value}));location.assign(new URL('./ai-video.html',location.href).href);return}
    busy=true;button.disabled=true;panel.classList.add('is-generating');status.textContent='กำลังสร้างภาพจริง กรุณารอสักครู่…';result.replaceChildren();
    try{
      const data=await imageApi({prompt:input.value.trim(),ratio:ratio.value});const image=data.image;
      if(!['image/png','image/jpeg','image/webp'].includes(image?.mimeType)||typeof image.data!=='string'||image.data.length>12000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data))throw Error('รูปแบบภาพจากบริการไม่ถูกต้อง');
      const bytes=Uint8Array.from(atob(image.data),c=>c.charCodeAt(0));const bitmap=await createImageBitmap(new Blob([bytes],{type:image.mimeType}));
      if(bitmap.width*bitmap.height>40000000){bitmap.close();throw Error('ภาพมีขนาดใหญ่เกินไป')}
      const canvas=node('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.setAttribute('aria-label','ภาพที่สร้างจากคำสั่งของคุณ');canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('บันทึกภาพไม่ได้');
      if(currentUrl)URL.revokeObjectURL(currentUrl);currentUrl=URL.createObjectURL(blob);const download=node('a','ดาวน์โหลดภาพ PNG');download.href=currentUrl;download.download='chaylueklab-image.png';result.append(canvas,download);status.textContent='สร้างภาพสำเร็จ พร้อมดาวน์โหลด';
    }catch(e){status.textContent=e.name==='TimeoutError'?'บริการใช้เวลานานเกินไป กรุณาลองใหม่':e.message}
    finally{busy=false;button.disabled=false;panel.classList.remove('is-generating')}
  });
  if(kind!=='video')imageApi({action:'status'}).then(data=>{status.textContent=data.configured?'บริการพร้อม รับคำสั่งได้เลย':'บริการสร้างภาพยังไม่เปิดใช้งาน รอเจ้าของตั้งค่า Gemini ใน backend';button.disabled=!data.configured}).catch(e=>{status.textContent=e.message});
  panel.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});input.focus({preventScroll:true});
  return {ok:true,message:kind==='video'?'เตรียมคำสั่งวิดีโอแล้ว':'เปิดพื้นที่สั่งสร้างภาพแล้ว'};
}
