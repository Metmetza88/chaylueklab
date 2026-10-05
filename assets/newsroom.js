const API = window.CHAYLUEKLAB_NEWSROOM_API || '';
const grid = document.querySelector('#stories');
const filters = document.querySelectorAll('[data-category]');
let stories = [];
function shareUrl(story){ return `https://line.me/R/msg/text/?${encodeURIComponent(`${story.title}\n${location.origin}/newsroom.html#${story.slug}`)}`; }
function render(category='ทั้งหมด'){
  const list = stories.filter(s => category==='ทั้งหมด' || s.category===category);
  grid.innerHTML = list.length ? list.map(s=>`<article class="card"><div class="card-media">${s.media?.url ? (s.media.type==='video'?`<video controls preload="metadata" src="${s.media.url}"></video>`:`<img loading="lazy" src="${s.media.url}" alt="${s.title}">`) : 'CHAYLUEKLAB NEWSROOM'}</div><div class="card-body"><div class="meta"><span>${s.category||'ข่าว'}</span><span>${new Date(s.published_at).toLocaleDateString('th-TH')}</span>${s.verified?'<span class="verified">✓ Verified</span>':''}</div><h2>${s.title}</h2><p class="summary">${s.summary||''}</p><div class="links"><a target="_blank" rel="noopener" href="${shareUrl(s)}">แชร์ LINE</a>${s.sources?.[0]?`<a target="_blank" rel="noopener" href="${typeof s.sources[0]==='string'?s.sources[0]:s.sources[0].url}">แหล่งอ้างอิง</a>`:''}</div></div></article>`).join('') : '<div class="empty">ยังไม่มีข่าวที่ผ่านการตรวจสอบและอนุมัติจากเจ้าของ</div>';
}
async function load(){ if(!API){render();return} try { const r=await fetch(`${API.replace(/\/$/,'')}/published`); if(!r.ok) throw new Error('โหลดข่าวไม่สำเร็จ'); stories=await r.json(); render(); } catch { grid.innerHTML='<div class="empty">ไม่สามารถโหลดข่าวได้ในขณะนี้</div>'; } }
filters.forEach(b=>b.addEventListener('click',()=>{filters.forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.category)})); load();
