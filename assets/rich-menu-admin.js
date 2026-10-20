const API='https://bxaplhrunxiadjsdobyl.supabase.co/functions/v1/rich-menu-admin';
async function call(body){
  if(!window.liff?.isLoggedIn?.())throw Error('กรุณาเข้าสู่ระบบ LINE ก่อน');
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,accessToken:liff.getAccessToken()||'',idToken:liff.getIDToken()||''}),signal:AbortSignal.timeout(90000)});const data=await r.json();
  if(!r.ok||!data.ok)throw Error(data.error||'สำรองเมนูไม่สำเร็จ');return data;
}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
export function openRichMenuAdmin(){
  document.getElementById('richMenuAdminDialog')?.remove();const dialog=document.createElement('dialog');dialog.id='richMenuAdminDialog';dialog.setAttribute('aria-label','สำรองและเตรียม Rich Menu');dialog.style.cssText='max-width:640px;width:94vw;padding:24px;border-radius:20px;background:#10151e;color:#f5f2eb;border:1px solid #657484';
  const title=document.createElement('h2');title.textContent='Rich Menu · เจ้าของ';const note=document.createElement('p');note.textContent='สำรองเมนู API และเมนูที่ผูกกับบัญชีนี้ก่อนสร้างฉบับร่าง เมนูเดิมยังใช้งานตามเดิม';
  const status=document.createElement('p');status.setAttribute('role','status');const backup=document.createElement('button');backup.textContent='สำรอง Rich Menu จาก LINE API';const file=document.createElement('input');file.type='file';file.accept='image/jpeg';file.setAttribute('aria-label','ภาพ Rich Menu JPEG');file.hidden=true;
  const draft=document.createElement('button');draft.textContent='สร้างเมนูฉบับร่าง (ยังไม่เปิดใช้)';draft.hidden=true;const close=document.createElement('button');close.textContent='ปิด';close.onclick=()=>dialog.close();let saved=false;
  backup.onclick=async()=>{backup.disabled=true;status.textContent='กำลังอ่านและสำรองค่าจาก LINE…';try{const data=await call({action:'backup'});download(data.backup,'chaylueklab-richmenu-api-backup.json');status.textContent='สำรองสำเร็จ: '+data.backup.menus.length+' เมนู · '+data.backup.images.length+' ภาพ';saved=true;file.hidden=false;draft.hidden=false}catch(e){status.textContent=e.message}finally{backup.disabled=false}};
  draft.onclick=async()=>{if(!saved)return;const image=file.files?.[0];if(!image||image.type!=='image/jpeg'||image.size>1000000){status.textContent='เลือก JPEG ไม่เกิน 1 MB';return}draft.disabled=true;try{const bytes=new Uint8Array(await image.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const data=await call({action:'draft',image:btoa(binary)});download(data,'chaylueklab-richmenu-draft.json');status.textContent='สร้างฉบับร่างแล้ว: '+data.richMenuId+' · ยังไม่เปลี่ยนเมนูผู้ใช้'}catch(e){status.textContent=e.message}finally{draft.disabled=false}};
  dialog.append(title,note,backup,status,file,draft,close);document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
}
window.openRichMenuAdmin=openRichMenuAdmin;
