import { dashboardMarkup } from "./dashboard-samples.mjs";
import { categories, modules, statusLabels } from './catalog.mjs';
import { marketIcon, procurementDocs, procurementLine, sports } from './marketplace.mjs';
const store = 'https://store.chaylueklab.com';
const schoolSupplies = 'https://psomnuek.chaylueklab.com/work?view=shop';
const starterDemos = [
  ['exam-studio', 'ลองสร้างข้อสอบ'],
  ['smart-exam', 'ลองสอบออนไลน์'],
  ['smart-certificate', 'ลองทำเกียรติบัตร']
];
const entryLinks = [
  ['▤', 'ดูโปรแกรม', 'ค้นหา เปรียบเทียบ และดูรายละเอียด', '#/catalog'],
  ['▷', 'ทดลองระบบ', 'รับสมัคร เช็กชื่อ ข้อสอบ และเกียรติบัตร', '#/demos'],
  ['≡', 'ราคาและเอกสารจัดซื้อ', 'เตรียมคำขอใบเสนอราคาและดูแบบฟอร์ม', '#/quote'],
  ['⌂', 'เข้าพื้นที่โรงเรียน', 'เข้าสู่ระบบด้วยบัญชีครูหรือผู้ดูแล', '#/workspace']
];
const storeDemos = [
  ['กีฬาสี', 'MET Sport', 'บันทึกเหรียญและดูอันดับทีมสี', 'met-sport'],
  ['เช็กชื่อ', 'MET Attendance', 'เช็กชื่อรายคาบและดาวน์โหลด CSV', 'met-attendance'],
  ['เลือกตั้งสภา', 'MET Vote', 'ลงคะแนนตัวอย่างและดูกราฟผลทันที', 'met-vote'],
  ['รับสมัครนักเรียน', 'MET Admission', 'ส่งใบสมัคร ตรวจ และประกาศผล', 'met-admission'],
  ['เว็บไซต์โรงเรียน', 'MET School Pro', 'จัดหน้าโรงเรียนและประกาศข่าว', 'met-school-pro']
];
const homeFeatures = [
  ['students','งานทะเบียน','วางขั้นตอนตั้งแต่รับสมัคร จัดห้องเรียน ไปจนถึงดูประวัตินักเรียน','รับสมัครและทะเบียน'],
  ['finance','งานการเงิน','วางระบบบันทึกรายรับรายจ่าย ค่าธรรมเนียม และรายงานงบประมาณ','งานการเงิน'],
  ['activities','งานกิจกรรม','วางขั้นตอนลงทะเบียน บันทึกผู้เข้าร่วม และตรวจสอบเกียรติบัตร','กิจกรรมและบริการ']
];
const homeQuestions = [
  ['โรงเรียนขนาดเล็กใช้งานได้ไหม','ทดลองเดโมได้โดยไม่ต้องมีบัญชี และเลือกเฉพาะโปรแกรมที่จำเป็นได้ ก่อนเริ่มใช้งานจริง ทีมงานจะตรวจความเหมาะสมกับจำนวนผู้ใช้และงานของโรงเรียน'],
  ['มีทีมงานอบรมการใช้งานให้หรือไม่','ระบุได้ในคำขอใบเสนอราคาว่าต้องการอบรมให้ใคร กี่คน และอยากอบรมแบบไหน ทีมงานจะยืนยันรูปแบบ ขอบเขต และค่าใช้จ่ายก่อนเริ่มงาน'],
  ['ข้อมูลนักเรียนปลอดภัยแค่ไหน','เดโมใช้ข้อมูลสมมติ ไม่ควรกรอกข้อมูลนักเรียนจริง พื้นที่โรงเรียนตรวจบัญชีและสิทธิ์ตามโรงเรียน ก่อนนำข้อมูลจริงเข้าใช้ควรยืนยันสิทธิ์ผู้ใช้และแนวทางจัดเก็บข้อมูลร่วมกัน']
];
/** Escape ข้อมูลก่อนประกอบ HTML เพื่อไม่ให้ข้อความกลายเป็นสคริปต์ */
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const publicStatus = module => module.offer || module.status === 'unavailable' || module.status === 'development' ? 'order' : module.status;
const publicLabel = module => publicStatus(module) === 'order' ? 'เปิดรับออเดอร์ · พร้อมวางระบบ' : statusLabels[module.status];
const publicLimitations = module => module.limitations.replace(
  'ยังไม่เปิดใช้งานจริง','ตัวอย่างใช้ข้อมูลสมมติ ขอบเขตและกำหนดติดตั้งยืนยันในใบเสนอราคา',
);
const demoLink = module => module.demo ?? `#/demo/${module.slug}`;
export const badge = module => `<span class="badge ${publicStatus(module)==='order'?'ready':esc(module.status)}">${esc(publicLabel(module))}</span>`;
export const categoryName = slug => categories.find(c => c.slug === slug)?.name ?? slug;
export const head = (title, text = '') => `<div class="page-head"><div class="container"><div class="breadcrumb"><a href="#/">หน้าหลัก</a> / ${esc(title)}</div><h1>${esc(title)}</h1>${text ? `<p>${esc(text)}</p>` : ''}</div></div>`;
export const loading = () => '<div class="container loading" role="status"><span class="spinner"></span>กำลังโหลดข้อมูล…</div>';
export const empty = (title, text, link = '#/catalog', label = 'สำรวจโปรแกรม') => `<div class="empty"><span class="symbol">▤</span><h2>${esc(title)}</h2><p>${esc(text)}</p>${link ? `<a class="button secondary" href="${esc(link)}">${esc(label)}</a>` : ''}</div>`;
export const workflowLabel = value => ({active:'เปิดใช้งาน',suspended:'ระงับ',revoked:'เพิกถอน',expired:'หมดอายุ',requested:'รับคำขอแล้ว',reviewing:'กำลังตรวจสอบ',responded:'ตอบกลับแล้ว',closed:'ปิดคำขอ',open:'รอรับเรื่อง',in_progress:'กำลังดำเนินการ',resolved:'ดำเนินการแล้ว',admin:'ผู้ดูแลโรงเรียน',teacher:'ครู',student:'นักเรียน'}[value]??value);
export const dateThai = date => date ? new Intl.DateTimeFormat('th-TH', { dateStyle:'medium', timeZone:'Asia/Bangkok' }).format(new Date(date)) : 'ไม่ระบุ';
/** ใช้การ์ดเดียวกันทั้งหน้าหลัก แคตตาล็อก และผลค้นหา */
export function productCard(module, selected = []) {
  const featured = module === sports;
  const detail = featured ? sports.detail : `#/product/${module.slug}`;
  const price = featured ? `<span class="badge ready">${esc(sports.offer)}</span> <strong>${sports.price}</strong><small>ประเมินตามขอบเขตงาน</small>` : '<strong>ขอราคาเบื้องต้น</strong><small>ประเมินตามขอบเขตงาน</small>';
  const tech = module.demo ? 'เว็บแอป · เดโม' : 'แดชบอร์ดทดลอง';
  return `<article class="product-card${featured?' featured-product':''}" data-market-card="${module.slug}">
    <a class="product-image" href="${detail}" aria-label="รายละเอียด ${esc(module.name)}">${featured?`<img src="${module.image}" width="640" height="360" loading="lazy" alt="หน้าจอเดโม MET Sport">`:dashboardMarkup(module,esc)}<span class="product-ribbon">${featured?'ไฮไลต์ · กีฬาสี':esc(publicLabel(module))}</span><span class="product-concept">ข้อมูลสมมติ</span></a>
    <div class="product-body"><div class="product-category">${esc(categoryName(module.category))}</div><h3><a href="${detail}">${esc(module.name)}</a></h3><p>${esc(module.tagline)}</p>
      <div class="market-card-meta"><span>${marketIcon('school')} <span>ยังไม่เผยแพร่ยอดโรงเรียน</span></span><span class="market-tech">${tech}</span></div>
      <div class="market-price">${price}</div>
      <button class="market-product-cta" type="button" data-market-product="${module.slug}" aria-haspopup="dialog">ดูรายละเอียด / ขอใบเสนอราคา ${marketIcon('arrow')}</button>
      <div class="card-actions"><a class="button secondary small" href="${demoLink(module)}">ทดลองใช้ตัวจริง (Live Demo)</a>${featured ? `<a href="${sports.detail}">เปิดรายละเอียดใน MET Store →</a>` : `<label class="check-label"><input type="checkbox" data-compare="${module.slug}" ${selected.includes(module.slug)?'checked':''}> เปรียบเทียบ</label>`}</div>
    </div></article>`;
}
export function marketProductDetail(module) {
  const featured=module===sports;
  return `<p class="eyebrow">${esc(categoryName(module.category))}</p><h2 id="market-dialog-title">${esc(module.name)}</h2>
    ${badge(module)}<p>${esc(module.description)}</p><ul>${module.features.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>
    <p class="notice">${esc(publicLimitations(module))}</p><div class="market-procurement"><h3>${marketIcon('docs')} การเบิกงบโครงการ</h3><p>แจ้งชื่อโครงการ ขอบเขตงาน และรายการเอกสารที่ฝ่ายพัสดุต้องใช้ในคำขอใบเสนอราคา การเบิกงบขึ้นอยู่กับงบที่ได้รับอนุมัติและขั้นตอนของแต่ละโรงเรียน</p><a href="${procurementDocs}">ดูเอกสารจัดซื้อและแบบฟอร์ม</a><p><a href="${procurementLine}" target="_blank" rel="noopener noreferrer">ขอตัวอย่างไฟล์ทาง LINE</a></p><p>ออกเอกสารในนาม ร้าน พ.สมนึก 2&amp;3 · ตลาดสดอำเภอสตึก จ.บุรีรัมย์ · <a href="tel:0843232324">โทร 084-3232324</a> · <a href="https://lin.ee/Vgg2m3N">LINE OA @125cbuuu</a></p></div>
    <div class="stack-actions"><a class="button" href="${featured?sports.quote:`#/quote?module=${module.slug}`}">เตรียมคำขอใบเสนอราคา</a><a class="button secondary" href="${featured?sports.detail:`#/product/${module.slug}`}">เปิดหน้ารายละเอียด</a></div>`;
}
export function home() {
  return `
  <section class="campus-hero">
    <div class="container campus-grid">
      <div class="campus-copy">
        <p class="campus-brand"><span aria-hidden="true">◆</span> วรเมธ โซลูชัน · ในเครือ พ.สมนึก 2&amp;3</p>
        <h1>งานโรงเรียนที่ง่ายขึ้น<br><span>ทุกระบบเริ่มที่นี่</span></h1>
        <p class="campus-lead">สร้างข้อสอบ ทดลองสอบออนไลน์ และออกเกียรติบัตร แล้วเลือกโปรแกรมที่เหมาะกับโรงเรียนจากหน้าเดียว</p>
        <div class="campus-featured" role="group" aria-label="เดโมสำหรับครู">
          <a class="campus-demo-primary" href="#/demo/exam-studio">ทดลองสร้างข้อสอบ</a>
          <a class="campus-demo-secondary" href="#/demo/smart-certificate">ทดลองทำเกียรติบัตร</a>
        </div>
        <p class="campus-demo-note">เดโมใช้ข้อมูลสมมติ · ยังไม่ต้องเข้าสู่ระบบ</p>
        <nav class="campus-entry" aria-label="เลือกงานที่ต้องการ">
          ${entryLinks.map(([icon, title, description, href]) => `<a href="${href}"><span class="campus-entry-icon" aria-hidden="true">${icon}</span><strong>${title}</strong><span class="campus-entry-description">${description}</span></a>`).join('')}
        </nav>
      </div>
      <figure class="campus-figure">
        <div class="campus-frame">
          <div class="campus-toolbar"><span aria-hidden="true">● ● ●</span><strong>MET School Pro</strong></div>
          <a href="#/demos" aria-label="ดูเดโมระบบโรงเรียน">
            <img src="/assets/school-portal-preview.png" width="1440" height="1677" alt="หน้าเว็บโรงเรียนตัวอย่างในเดโม MET School Pro" fetchpriority="high">
          </a>
        </div>
        <figcaption>ภาพจากเดโมเว็บไซต์โรงเรียน · CHAYLUEKLAB</figcaption>
      </figure>
    </div>
  </section>
  <section class="campus-stats" aria-labelledby="campus-stats-title" data-campus-stats>
    <div class="container campus-stats-layout">
      <h2 id="campus-stats-title">Education 2570 ในตัวเลข</h2>
      <dl>
        ${[[modules.length,'โปรแกรม Education 2570'],[categories.length,'หมวดงานโรงเรียน'],[modules.filter(m=>m.demo).length + storeDemos.length,'เดโมที่เปิดให้ทดลอง']].map(([value,label])=>`<div><dt>${label}</dt><dd><span class="campus-sr">${value}</span><span aria-hidden="true" data-count-to="${value}">${value}</span></dd></div>`).join('')}
      </dl>
    </div>
  </section>
  <section class="container campus-next market-highlight" aria-labelledby="market-highlight-title">
    <div class="market-section-title"><div><p class="eyebrow">MARKETPLACE · โปรแกรมโรงเรียน</p><h2 id="market-highlight-title">ไฮไลต์สำหรับโรงเรียน</h2><p>เตรียมงานกีฬาสี และเลือกโปรแกรมตามงานที่ครูต้องทำ</p></div><a class="button secondary" href="#/catalog">ดูระบบทั้งหมด ${marketIcon('arrow')}</a></div>
    ${productCard(sports)}
  </section>
  <section class="container campus-next campus-features" aria-labelledby="campus-features-title">
    <p class="eyebrow">เลือกระบบตามงานของคุณ</p>
    <h2 id="campus-features-title">สำรวจฟีเจอร์ระบบโรงเรียน</h2>
    <div class="campus-tabs" role="tablist" aria-label="หมวดฟีเจอร์" data-campus-tabs>
      ${homeFeatures.map(([slug,label],i)=>`<button type="button" role="tab" id="campus-tab-${slug}" aria-selected="${i===0}" aria-controls="campus-panel-${slug}" tabindex="${i===0?0:-1}">${label}</button>`).join('')}
    </div>
    ${homeFeatures.map(([slug,label,description,storeCategory],i)=>{
      const module=modules.find(m=>m.slug===slug);
      return `<section class="campus-feature-panel" role="tabpanel" id="campus-panel-${slug}" aria-labelledby="campus-tab-${slug}" tabindex="0" ${i?'hidden':''}>
        <figure>${dashboardMarkup(module,esc)}<figcaption>หน้าจอตัวอย่าง · ข้อมูลสมมติ</figcaption></figure>
        <div><span class="campus-feature-status">เปิดรับออเดอร์ · พร้อมวางระบบ</span><h3>${label}</h3><p>${description}</p><ul>${module.features.slice(0,3).map(item=>`<li>${esc(item)}</li>`).join('')}</ul><a class="button" href="${store}/products?category=${encodeURIComponent(storeCategory)}">ดูโปรแกรม${label}ใน Store</a></div>
      </section>`;
    }).join('')}
  </section>
  <section class="container campus-next" aria-labelledby="campus-next-title">
    <div class="campus-next-heading"><p class="eyebrow">สำหรับครูและฝ่ายจัดซื้อ</p><h2 id="campus-next-title">จากทดลองใช้ ถึงเตรียมขอราคา</h2></div>
    <ol class="campus-steps">
      <li><strong>ลองทำงานด้วยข้อมูลสมมติ</strong><p>ดูขั้นตอนสร้างข้อสอบ สอบออนไลน์ และทำเกียรติบัตร</p><a href="#/demos">ดูเดโมทั้งหมด</a></li>
      <li><strong>เลือกเฉพาะโปรแกรมที่ต้องใช้</strong><p>ค้นตามหมวดหรือเปรียบเทียบก่อนจัดชุดให้โรงเรียน</p><a href="#/catalog">สำรวจแคตตาล็อก</a></li>
      <li><strong>เตรียมสรุปให้ฝ่ายจัดซื้อ</strong><p>เลือกโปรแกรมและสร้างสรุปคำขอไว้ตรวจทานก่อนส่ง</p><a href="#/quote">เตรียมคำขอใบเสนอราคา</a></li>
    </ol>
  </section>
  <section class="container campus-next campus-faq" aria-labelledby="campus-faq-title">
    <p class="eyebrow">ก่อนเริ่มใช้งาน</p>
    <h2 id="campus-faq-title">คำถามที่พบบ่อย</h2>
    ${homeQuestions.map(([question,answer])=>`<details><summary>${question}</summary><p>${answer}</p></details>`).join('')}
  </section>
  `;
}
export function demos(selected) {
  return head('ทดลองระบบโรงเรียน','เลือกเดโมตามงานที่ต้องการลอง ทุกเดโมใช้ข้อมูลสมมติ') + `<section class="section container">
    <h2>ระบบโรงเรียนที่เปิดให้ทดลอง</h2>
    <div class="card-grid campus-demo-grid">${storeDemos.map(([title, product, description, slug]) => `<article class="panel"><h3>${title}</h3><p class="muted">${product} · ${description}</p><span class="badge ready">เปิดรับออเดอร์ · พร้อมวางระบบ</span><div class="stack-actions"><a class="button secondary" href="${store}/demo/${slug}">ทดลอง${title}</a><a class="button secondary" href="${store}/contact?product=${slug}#quotation">ขอใบเสนอราคา</a></div></article>`).join('')}</div>
    <h2>ข้อสอบและเกียรติบัตร</h2>
    <div class="card-grid">${modules.filter(module => module.demo).map(module => productCard(module, selected)).join('')}</div>
  </section>`;
}
export function catalog(query, selected) {
  const category = query.get('category') ?? '';
  const starterQuote = new URLSearchParams(starterDemos.map(([slug]) => ['module', slug]));
  return head('แคตตาล็อกซอฟต์แวร์','เลือกโปรแกรมตามหมวดงานและดูสถานะความพร้อม') + `<section class="section">
    <div class="container catalog-layout"><aside class="filter-sidebar"><h2>หมวดซอฟต์แวร์</h2><button type="button" class="ghost small" data-market-jump="catalog-shortcuts">ไปชุดข้อสอบและเดโม ↓</button><div><a href="#/catalog" class="${!category?'active':''}">ทั้งหมด (${modules.length+1})</a>${categories.map(c=>`<a class="${category===c.slug?'active':''}" href="#/catalog?category=${c.slug}">${esc(c.name)}</a>`).join('')}</div></aside><div class="catalog-results"><div class="toolbar"><input id="search" type="search" aria-label="ค้นหาโปรแกรม" placeholder="ค้นหาโปรแกรมหรือคุณสมบัติ…" value="${esc(query.get('q')??'')}"><select id="status-filter" aria-label="สถานะโปรแกรม"><option value="">ทุกสถานะ</option>${Object.entries({ready:statusLabels.ready, trial:statusLabels.trial, order:"เปิดรับออเดอร์ · พร้อมวางระบบ"}).map(([key,name])=>`<option value="${key}" ${query.get('status')===key?'selected':''}>${name}</option>`).join('')}</select></div><div id="catalog-list">${catalogList({category,status:query.get('status')??'',search:query.get('q')??''},selected)}</div></div></div>
    <div id="catalog-shortcuts" class="container market-shortcuts" tabindex="-1">
      <section class="panel catalog-starter" aria-labelledby="starter-title">
        <h2 id="starter-title">ชุดข้อสอบและเกียรติบัตร</h2>
        <p class="muted">ลองทำตั้งแต่เตรียมข้อสอบ จัดสอบ ไปจนถึงทำเกียรติบัตรด้วยข้อมูลสมมติ</p>
        <div class="stack-actions">
          <a class="button" href="#/quote?${esc(starterQuote)}">ขอราคาทั้งชุด</a>
          ${starterDemos.map(([slug, label]) => `<a class="button secondary" href="#/demo/${slug}">${label}</a>`).join('')}
        </div>
      </section>
      <p class="catalog-collection">ระบบ MET สำหรับเว็บไซต์โรงเรียน รับสมัคร เช็กชื่อ และกีฬาสี เปิดรับออเดอร์ตามขอบเขตงาน <a class="button secondary small" href="#/demos">ทดลองดูตัวอย่าง</a> <a class="button secondary small" href="${store}/products">เปิดแคตตาล็อก MET</a></p>
      <p class="catalog-collection">สอบถามกระดาษ วัสดุสำนักงาน และอุปกรณ์สำหรับโรงเรียน <a class="button secondary small" href="${schoolSupplies}">ติดต่อร้าน พ.สมนึก 2&amp;3</a></p>
    </div>
  </section>`;
}
export function catalogList({category='',status='',search=''}, selected=[]) {
  const results=[sports,...modules].filter(m=>(!category||m.category===category)&&(!status||publicStatus(m)===(status==='unavailable'||status==='development'?'order':status))&&[m.name,m.tagline,categoryName(m.category),...m.features].join(' ').toLowerCase().includes(search.toLowerCase().trim()));
  return `<p class="results-count" role="status">พบ ${results.length} โปรแกรม</p>${results.length?`<div class="card-grid">${results.map(m=>productCard(m,selected)).join('')}</div>`:empty('ยังไม่พบโปรแกรม','ลองเปลี่ยนคำค้นหาหรือเลือกสถานะอื่น')}`;
}
export function product(module) {
  if(!module) return head('ไม่พบโปรแกรม')+`<section class="section container">${empty('ไม่พบโปรแกรมที่ต้องการ','กลับไปเลือกโปรแกรมในแคตตาล็อก')}</section>`;
  return head(module.name,categoryName(module.category))+`<section class="section container product-detail"><div class="two-col"><div><div class="eyebrow">${esc(categoryName(module.category))}</div><h2 class="product-title">${esc(module.name)}</h2>${badge(module)}<p style="margin-top:20px">${esc(module.description)}</p><div class="notice">${esc(publicLimitations(module))}</div><div class="detail-section"><h2>คุณสมบัติในตัวอย่าง</h2><ul class="feature-list">${module.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div><div class="detail-section"><h2>ประโยชน์ที่ออกแบบไว้</h2><ul class="feature-list">${module.benefits.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div><div class="detail-section"><h2>วิธี${module.demo?'ทดลองใช้งาน':'เริ่มต้น'}</h2><ol>${module.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div></div><aside>${dashboardMarkup(module,esc)}<div class="panel"><h2>ให้เราช่วยประเมินความต้องการ</h2><p class="muted">ราคาจะระบุในใบเสนอราคาที่ได้รับอนุมัติจากเจ้าของเท่านั้น</p><div class="stack-actions"><a class="button" href="#/quote?module=${module.slug}">ขอใบเสนอราคา</a><a class="button secondary" href="${demoLink(module)}">ทดลองใช้ตัวจริง (Live Demo)</a></div><p class="item-meta" style="margin-top:15px">ภาษาไทย · ขอใบเสนอราคาเป็นเงินบาท</p></div></aside></div></section>`;
}
export function comparison(selected) {
  const products=modules.filter(m=>selected.includes(m.slug));
  return head('เปรียบเทียบโปรแกรม','เลือกได้สูงสุด 3 โปรแกรม เพื่อดูความเหมาะสมกับงานของคุณ')+`<section class="section container">${!products.length?empty('ยังไม่ได้เลือกโปรแกรม','เลือก “เปรียบเทียบ” บนการ์ดโปรแกรมที่สนใจ'): `<div class="compare-wrap"><table class="compare-table"><thead><tr><th scope="col">รายการ</th>${products.map(m=>`<th scope="col">${esc(m.name)}<br><button class="ghost small" data-remove-compare="${m.slug}">นำออก</button></th>`).join('')}</tr></thead><tbody>${[['หมวดงาน',m=>esc(categoryName(m.category))],['สถานะ',badge],['คุณสมบัติ',m=>`<ul>${m.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`],['ข้อจำกัด',m=>esc(publicLimitations(m))],['ราคา',()=>'ขอใบเสนอราคา'],['ทดลองใช้',m=>`<a href="${demoLink(m)}">เปิดหน้าสาธิต →</a>`]].map(([label,fn])=>`<tr><th scope="row">${label}</th>${products.map(m=>`<td>${fn(m)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="hero-actions"><a class="button" href="#/quote">ขอใบเสนอราคา</a><a class="button secondary" href="#/catalog">เลือกโปรแกรมเพิ่ม</a></div>`}</section>`;
}
export function quotePage(query, selected) {
  const requested = query.getAll('module').filter(Boolean);
  const initial = requested.length ? requested : selected;
  const note = query.get('interest')===sports.slug ? sports.quoteNote : '';
  return head('ขอใบเสนอราคา','แจ้งความต้องการเพื่อให้ทีมงานประเมิน ไม่มีการคิดราคาขายโดยอัตโนมัติ')+`<section class="section container two-col"><form id="quote-form" class="panel"><h2>โปรแกรมที่โรงเรียนสนใจ</h2><div class="quote-options">${modules.map(m=>`<label><input type="checkbox" name="module" value="${m.slug}" ${initial.includes(m.slug)?'checked':''}> ${esc(m.name)}</label>`).join('')}</div><label class="field">ชื่อโรงเรียน / หน่วยงาน<input name="school_name" maxlength="200" required autocomplete="organization"></label><label class="field">รายละเอียดความต้องการ<textarea name="note" maxlength="2000" placeholder="เช่น จำนวนผู้ใช้งาน งานที่ต้องการปรับปรุง (ไม่ต้องใส่ข้อมูลนักเรียน)">${esc(note)}</textarea></label><div class="stack-actions"><button type="submit">สร้างสรุปคำขอ</button></div><div id="quote-result" role="status"></div></form><aside><div class="panel"><h2>เอกสารจัดซื้อและโดเมน</h2><p class="muted">ดูช่องทางขอใบเสนอราคา ใบส่งของ และเอกสารบริษัท พร้อมแบบฟอร์มจด .ac.th</p><a class="button secondary" href="${store}/school-systems#procurement">ดูเอกสารจัดซื้อและแบบฟอร์ม .ac.th</a></div><div class="panel"><h2>ขั้นตอนถัดไป</h2><ol><li>เลือกโปรแกรมและระบุความต้องการ</li><li>ตรวจสรุปคำขอ หรือพิมพ์เก็บไว้</li><li>ส่งสรุปทาง LINE หรือเข้าสู่ระบบเพื่อบันทึกคำขอ</li></ol><p class="item-meta">คำขอเป็นข้อมูลประกอบการประเมิน ยังไม่ใช่ใบเสนอราคาหรือสัญญาซื้อขาย</p><a href="#/login" class="button secondary">เข้าสู่ระบบลูกค้า</a></div><div class="notice">สถานะโปรแกรมตามแคตตาล็อก ขอบเขตการติดตั้งและวันที่เริ่มใช้ยืนยันในใบเสนอราคา</div></aside></section>`;
}
export function login(config) {
  return head('เข้าสู่ระบบ','บัญชีสำหรับลูกค้า โรงเรียน และผู้ดูแลแพลตฟอร์ม')+`<div class="container narrow"><form id="login-form" class="panel"><h2>ยินดีต้อนรับกลับ</h2><p class="muted">ใช้บัญชีที่ผู้ดูแลจัดเตรียมให้โรงเรียนของคุณ</p>${!config.authConfigured?'<div class="notice">ระบบบัญชียังไม่เชื่อมต่อ คุณสามารถทดลองโปรแกรมผ่านหน้าสาธิตได้</div>':`<label class="field">อีเมล<input name="email" type="email" required autocomplete="username" maxlength="254"></label><label class="field">รหัสผ่าน<input name="password" type="password" required autocomplete="current-password" maxlength="256"></label><button type="submit">เข้าสู่ระบบ →</button>`}<div id="form-status" role="status"></div><a class="ghost" href="#/demo/exam-studio">ไปหน้าทดลองใช้งาน</a></form></div>`;
}
export function workspaceShell(content, user) {
 return head('พื้นที่ทำงานโรงเรียน','โปรแกรมและข้อมูลเฉพาะโรงเรียนที่คุณได้รับสิทธิ์')+`<div class="container workspace-layout"><aside class="workspace-nav"><h2>School Workspace</h2><a href="#/workspace">▥ ภาพรวมโรงเรียน</a><a href="#/account">♙ บัญชีลูกค้า / แจ้งปัญหา</a><a href="#/quote">▤ ขอใบเสนอราคา</a><a href="#/reports">▧ รายงาน</a><a href="#/admin">⚙ ผู้ดูแลแพลตฟอร์ม</a><a href="#/manual">? คู่มือการใช้งาน</a>${user?'<button data-logout>ออกจากระบบ</button>':''}</aside><div>${content}</div></div>`;
}
export function schoolSelector(user, selected) {
 return `<label class="field">เลือกโรงเรียนที่ได้รับสิทธิ์<select id="school-select">${user.members.map((m,i)=>`<option value="${esc(m.school_id)}" ${m.school_id===selected?'selected':''}>${esc(m.schools?.name??`โรงเรียน ${i+1} · ${m.school_id.slice(0,8)}`)} · ${esc(workflowLabel(m.role))}</option>`).join('')}</select></label>`;
}
export function workspace(data, user, selected) {
  return workspaceShell(`${schoolSelector(user,selected)}<h2>${esc(data.school?.name??'โรงเรียนของคุณ')}</h2><div class="dashboard-stats"><div class="stat"><b>${data.entitlements.length}</b><small>รายการสิทธิ์ในหน้านี้</small></div><div class="stat"><b>${data.licenses.length}</b><small>ใบอนุญาตในหน้านี้</small></div><div class="stat"><b>${data.notifications.filter(n=>!n.read_at).length}</b><small>แจ้งเตือนที่ยังไม่อ่าน</small></div></div><section class="panel"><h2>สิทธิ์ใช้งานโปรแกรม</h2>${data.entitlements.length?data.entitlements.map(e=>`<div class="list-item"><h3>${esc(modules.find(m=>m.slug===e.module_slug)?.name??e.module_slug)}</h3><span class="badge">${esc(workflowLabel(e.status))}</span><p>สิ้นสุด ${dateThai(e.expires_at)}</p><p class="muted">ยังไม่เปิด Workspace ของโมดูลนี้ · ทดลองได้จากแคตตาล็อกเมื่อมี Demo</p></div>`).join(''):empty('ยังไม่มีโปรแกรมที่ได้รับสิทธิ์','ขอใบเสนอราคาหรือติดต่อผู้ดูแลเพื่อเตรียมสิทธิ์โรงเรียน','#/quote','ขอใบเสนอราคา')}</section><section class="panel"><h2>ศูนย์แจ้งเตือน</h2>${notificationList(data.notifications)}</section>`,user);
}
export function notificationList(rows) {
 return rows.length?rows.map(n=>`<div class="list-item"><p>${esc(n.message)}</p><small>${dateThai(n.created_at)}</small> ${!n.read_at?`<button class="secondary small" data-read-notification="${esc(n.id)}">อ่านแล้ว</button>`:'<span class="badge">อ่านแล้ว</span>'}</div>`).join(''):'<p class="muted">ยังไม่มีการแจ้งเตือน</p>';
}
export function account(data,user,selected) {
 return workspaceShell(`${schoolSelector(user,selected)}<section class="panel"><h2>บัญชีลูกค้า</h2><p>${esc(user.email)}</p><p class="item-meta">ติดต่อและติดตามบริการของโรงเรียนที่เลือก</p><form id="profile-form"><label class="field">ชื่อผู้ติดต่อ<input name="contact_name" value="${esc(data.profile?.contact_name??'')}" maxlength="200" required autocomplete="name"></label><button type="submit">บันทึกชื่อผู้ติดต่อ</button><div role="status"></div></form></section><section class="panel"><h2>คำขอใบเสนอราคา</h2>${data.quotes.length?data.quotes.map(q=>`<div class="list-item"><span class="badge">${esc(workflowLabel(q.status))}</span> ${dateThai(q.created_at)}<p>${q.module_slugs.map(esc).join(', ')}</p><small>เลขอ้างอิง ${esc(q.id)}</small></div>`).join(''):'<p class="muted">ยังไม่มีคำขอใบเสนอราคา</p>'}</section><section class="panel"><h2>แจ้งปัญหา / ขอรับบริการ</h2><form id="service-form"><label class="field">หัวข้อ<input name="subject" maxlength="200" required></label><label class="field">รายละเอียด<textarea name="description" maxlength="4000" required placeholder="ระบุปัญหาโดยไม่แนบข้อมูลนักเรียนหรือรหัสผ่าน"></textarea></label><button type="submit">ส่งเรื่องแจ้งปัญหา</button><div id="form-status" role="status"></div></form>${data.services.map(s=>`<div class="list-item"><h3>${esc(s.subject)}</h3><span class="badge">${esc(workflowLabel(s.status))}</span><p>${esc(s.description)}</p><small>${dateThai(s.created_at)}</small></div>`).join('')}</section>`,user);
}
export function admin(data,user) {
 const lists=[['โรงเรียน',data.schools,s=>`${esc(s.name)} <span class="item-meta">${esc(s.id)}</span>`],['ลูกค้า',data.customers,c=>`${esc(c.contact_name)} · ${esc(c.school_id)}`],['ใบอนุญาต',data.licenses,l=>`${esc(l.module_slug)} · ${esc(workflowLabel(l.status))} · ${dateThai(l.expires_at)}`],['คำขอใบเสนอราคา',data.quotations,q=>`${esc(q.school_id)} · ${q.module_slugs.map(esc).join(', ')} · ${esc(workflowLabel(q.status))}`],['บันทึกการตรวจสอบ',data.audit,a=>`${esc(a.action)} · ${esc(a.table_name)} · ${dateThai(a.created_at)}`]];
 return workspaceShell(`<h2>ผู้ดูแลแพลตฟอร์ม</h2><p class="muted">หน้าที่ ${data.page} · แสดงสูงสุด 25 รายการต่อประเภท</p><section class="panel"><h2>ทะเบียนโปรแกรม / Feature Flags</h2>${data.products.map(p=>`<div class="list-item"><strong>${esc(p.name)}</strong> <span class="badge">${esc(statusLabels[p.status])}</span><p class="item-meta">Feature Flag ${p.enabled?'เปิด':'ปิด'} · การเปิด Flag ไม่เปลี่ยนความพร้อมของโปรแกรม</p><button class="secondary small" data-module-flag="${esc(p.slug)}" data-enabled="${!p.enabled}">${p.enabled?'ปิด':'เปิด'} Flag</button></div>`).join('')}</section><section class="panel"><h2>จัดการสิทธิ์โรงเรียน</h2><form id="provision-form"><label class="field">โรงเรียน<select name="school_id" required><option value="">เลือกโรงเรียน</option>${data.schools.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label><label class="field">โปรแกรม<select name="module_slug" required>${data.products.map(p=>`<option value="${esc(p.slug)}">${esc(p.name)} · ${esc(statusLabels[p.status])}</option>`).join('')}</select></label><label class="field">วันสิ้นสุดสิทธิ์ (เวลาไทย)<input name="expires_on" type="date" required></label><label class="check-label"><input type="checkbox" required> ยืนยันว่าได้รับอนุมัติการออกสิทธิ์แล้ว</label><div class="notice">การออกสิทธิ์ไม่เปลี่ยนสถานะโปรแกรมที่ยังไม่เปิดบริการ และไม่ทำรายการชำระเงิน</div><button type="submit">ออก License และสิทธิ์โรงเรียน</button><div role="status"></div></form>${data.entitlements.length?data.entitlements.map(e=>`<div class="list-item"><p>${esc(e.school_id)} · ${esc(e.module_slug)} · ${esc(workflowLabel(e.status))}</p><button class="secondary small" data-entitlement="${esc(e.id)}" data-status="${e.status==='active'?'suspended':'active'}">${e.status==='active'?'ระงับ':'เปิด'}สิทธิ์</button></div>`).join(''):'<p class="muted">ยังไม่มีรายการสิทธิ์ ต้องจัดเตรียม License และ Subscription หลังอนุมัติ</p>'}</section><section class="panel"><h2>บริการหลังการขาย</h2>${data.services.map(s=>`<div class="list-item"><h3>${esc(s.subject)}</h3><p>${esc(s.description)}</p><span class="badge">${esc(workflowLabel(s.status))}</span><button class="secondary small" data-service-status="${esc(s.id)}" data-status="${s.status==='open'?'in_progress':'resolved'}">${s.status==='open'?'รับดำเนินการ':'ปิดเรื่อง'}</button></div>`).join('')||'<p class="muted">ยังไม่มีคำขอบริการ</p>'}</section>${lists.map(([title,rows,render])=>`<section class="panel"><h2>${title}</h2>${rows.map(row=>`<div class="list-item">${render(row)}</div>`).join('')||'<p class="muted">ยังไม่มีรายการ</p>'}</section>`).join('')}<div class="stack-actions">${data.page>1?`<a class="button secondary" href="#/admin?page=${data.page-1}">หน้าก่อน</a>`:''}<a class="button secondary" href="#/admin?page=${data.page+1}">หน้าถัดไป</a></div>`,user);
}
export function help() {
 return head('ศูนย์ช่วยเหลือ','เรียนรู้การเลือกโปรแกรม การทดลองใช้ และการติดต่อทีมดูแล')+`<section class="section container two-col"><div class="panel"><h2>คำถามที่พบบ่อย</h2>${[['เริ่มทดลองใช้ได้อย่างไร?','เลือกโปรแกรมที่มีสถานะ “ทดลองใช้” แล้วกดทดลองใช้งาน ใช้ข้อมูลสมมติเพื่อทดสอบ ระบบสาธิตไม่บันทึกผลเข้าสู่โรงเรียน'],['ต้องการทราบราคาโปรแกรม','เลือกขอใบเสนอราคาและระบุความต้องการ ราคาต้องได้รับอนุมัติจากเจ้าของก่อน จึงไม่มีราคาขายอัตโนมัติในแคตตาล็อก'],['ทำไมเปิดบางโปรแกรมไม่ได้?','ทุกหมวดมีหน้าจอให้ทดลองด้วยข้อมูลสมมติ ตรวจรายการที่จะติดตั้งได้จากใบเสนอราคา'],['ข้อมูลโรงเรียนถูกแยกอย่างไร?','ระบบส่วนกลางออกแบบให้ตรวจสมาชิกและสิทธิ์ตามโรงเรียนทั้งใน API และฐานข้อมูล ก่อนเปิดใช้จริงต้องผ่านการทดสอบกับบัญชีของแต่ละโรงเรียน'],['เชื่อม AI หรือ e-GP แล้วหรือยัง?','ยังไม่เชื่อม AI Provider และยังไม่เชื่อม e-GP ไม่มีการอ้างการรับรองจากหน่วยงานราชการ'],['ลืมรหัสผ่านหรือต้องการบัญชีใหม่','ติดต่อผู้ดูแลที่จัดเตรียมบัญชีโรงเรียน ขณะนี้ยังไม่เปิดรับสมัครบัญชีหรือกู้รหัสผ่านด้วยตนเอง']].map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div><aside class="panel"><h2>ต้องการความช่วยเหลือเพิ่มเติม</h2><p class="muted">ส่งเรื่องผ่านบัญชีลูกค้า เพื่อติดตามสถานะในพื้นที่โรงเรียน</p><a href="#/account" class="button">แจ้งปัญหา / ขอรับบริการ</a><a href="#/manual" class="ghost">อ่านคู่มือการใช้งาน →</a></aside></section>`;
}
export function manual() {
 return head('คู่มือการใช้งาน','เริ่มต้นจากหน้าร้าน แล้วเข้าสู่พื้นที่ทำงานของโรงเรียน')+`<section class="section container"><div class="panel"><h2>1. สำรวจโปรแกรม</h2><p>เปิดแคตตาล็อก เลือกหมวดงานหรือค้นด้วยคุณสมบัติ ตรวจสถานะของโปรแกรมทุกครั้ง</p><h2>2. ทดลองโปรแกรมเดิม</h2><p>Exam Studio สร้างโจทย์บวกเลข → Smart Exam ทำข้อสอบและตรวจคะแนน → Smart Certificate สร้างเอกสารสาธิต ผลอยู่ในหน่วยความจำของแท็บนี้และหายเมื่อรีเฟรช</p><h2>3. ขอใบเสนอราคา</h2><p>เลือกโปรแกรม ระบุหน่วยงาน และสร้างสรุปคำขอ การพิมพ์สรุปยังไม่ได้ส่งคำขอเข้าสู่ระบบ ต้องเข้าสู่ระบบและเลือกโรงเรียนที่คุณมีสิทธิ์ก่อนส่ง</p><h2>4. พื้นที่โรงเรียน</h2><p>เข้าสู่ระบบด้วยบัญชีที่ผู้ดูแลจัดให้ เลือกโรงเรียน ตรวจรายการสิทธิ์ ใบอนุญาต แจ้งเตือน และติดตามบริการ การมี License ไม่ได้หมายความว่าโมดูลที่ยังพัฒนาจะเปิดใช้งานได้</p><h2>5. ผู้ดูแลแพลตฟอร์ม</h2><p>สิทธิ์ส่วนกลางต้องได้รับการจัดเตรียมจากเจ้าของระบบเท่านั้น สามารถดูคำขอ จัดการ Feature Flag ระงับสิทธิ์ และติดตาม Audit Log ได้หลังเปิดระบบข้อมูล</p><div class="notice">อย่าป้อนข้อมูลนักเรียนจริง รหัสผ่าน หรือข้อมูลอ่อนไหวในหน้าสาธิตหรือเรื่องแจ้งปัญหา</div></div></section>`;
}

export function dashboardDemo(module) {
  return head(`ทดลอง ${module.name}`, 'เลือกตัวกรองเพื่อดูกราฟและรายการด้วยข้อมูลสมมติ') +
    `<section class="section container"><div class="panel"><p>สนใจวางระบบในนาม ร้าน พ.สมนึก 2&amp;3</p><a class="button" href="#/quote?module=${module.slug}">ขอใบเสนอราคา</a></div>
    ${dashboardMarkup(module,esc,true)}<a href="#/product/${module.slug}">กลับไปดูรายละเอียดโปรแกรม</a></section>`;
}
