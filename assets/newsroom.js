import { newsroomConfig } from '../data/newsroom-config.js';
const API=window.CHAYLUEKLAB_NEWSROOM_API||newsroomConfig.apiUrl;
const grid=document.querySelector('#stories'),filters=document.querySelectorAll('[data-category]');
let stories=[];
for(const id of ['studioLink','studioCta']){const a=document.getElementById(id);if(a)a.href=newsroomConfig.studioUrl}
const lineCta=document.getElementById('lineCta');
if(lineCta&&newsroomConfig.liffId){lineCta.href=`https://liff.line.me/${encodeURIComponent(newsroomConfig.liffId)}/newsroom.html`;lineCta.textContent='เปิดใน LINE'}
function node(tag,text,className){const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el}
function safeUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}}
function link(label,url){const el=node('a',label);el.href=url;el.target='_blank';el.rel='noopener noreferrer';return el}
function empty(text){grid.replaceChildren(node('div',text,'empty'))}
function render(category='ทั้งหมด'){
 const list=stories.filter(s=>category==='ทั้งหมด'||s.category===category);
 if(!list.length){empty('ยังไม่มีข่าวที่ผ่านการตรวจสอบและอนุมัติจากเจ้าของ');return}
 grid.replaceChildren(...list.map(s=>{
  const card=node('article',null,'card'),media=node('div','CHAYLUEKLAB NEWSROOM','card-media');
  const output=safeUrl(s.media?.url);
  if(output){const el=node(s.media.type==='video'?'video':'img');el.src=output;if(el.tagName==='VIDEO'){el.controls=true;el.preload='metadata'}else{el.loading='lazy';el.alt=String(s.title||'')}media.replaceChildren(el)}
  const body=node('div',null,'card-body'),meta=node('div',null,'meta');
  meta.append(node('span',s.category||'ข่าว'),node('span',new Date(s.published_at).toLocaleDateString('th-TH')));
  if(s.verified)meta.append(node('span','✓ Verified','verified'));
  const links=node('div',null,'links');
  const share=`${s.title}\n${location.origin}/newsroom.html#${encodeURIComponent(s.slug||s.id)}`;
  links.append(link('แชร์ LINE',`https://line.me/R/msg/text/?${encodeURIComponent(share)}`));
  for(const [i,source]of(s.sources||[]).entries()){const url=safeUrl(typeof source==='string'?source:source.url);if(url)links.append(link(`แหล่งอ้างอิง ${i+1}`,url))}
  card.id=String(s.slug||s.id);body.append(meta,node('h2',s.title),node('p',s.summary||'','summary'));
  if(s.body){const details=node('details'),summary=node('summary','อ่านข่าวเต็ม');details.append(summary,node('p',s.body,'story-content'));body.append(details)}
  body.append(links);card.append(media,body);return card;
 }));
}
async function load(){if(!API){render();return}try{const url=safeUrl(API);if(!url)throw new Error();const r=await fetch(`${url.replace(/\/$/,'')}/published`);if(!r.ok)throw new Error();const data=await r.json();if(!Array.isArray(data))throw new Error();stories=data;render()}catch{empty('ไม่สามารถโหลดข่าวได้ในขณะนี้')}}
filters.forEach(b=>b.addEventListener('click',()=>{filters.forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.category)}));load();
