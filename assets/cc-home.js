import { $, h, t, api, baht, pick, nav, errorText, authToken, getLang } from './cc.js';

$('#nav').replaceWith(nav('home'));
const th = getLang() === 'th';
const set = (id, v) => { $(id).textContent = v; };
set('#heroTitle', t('heroTitle')); set('#heroSub', t('heroSub')); set('#ctaShop', t('buy')); set('#ctaQuote', t('quote')); set('#ctaJoin', t('join'));
set('#shopH', t('shop')); set('#shopSub', th ? 'ค้นหา กรอง ทดลองใช้ หรือขอใบเสนอราคา โปรแกรมที่ยังไม่ผ่านการทดสอบจะแสดงเป็น "กำลังพัฒนา" และยังสั่งซื้อไม่ได้' : 'Search, filter, try or request a quote. Programs without a recorded test are shown as "In development" and cannot be ordered.');
set('#svcH', t('services')); set('#svcSub', th ? 'บริการพัฒนาระบบตามความต้องการ' : 'Custom system development');
set('#ctlH', t('control')); set('#ctlSub', th ? 'ศูนย์ควบคุม AI Agents, Workflow และงานอัตโนมัติ' : 'Control AI agents, workflows and automations');
set('#quoteH', t('quote')); set('#contactH', t('contact')); set('#contactBtn', t('send')); $('#q').placeholder = t('search');
$('#ctlCard').append(h('div', { class: 'card' }, h('p', {}, th ? 'ศูนย์ควบคุมอยู่ในหน้า "บัญชีของฉัน" สำหรับผู้ดูแลระบบ ต้องเข้าสู่ระบบด้วย LINE' : 'The control center lives in the admin area and requires LINE sign-in.'), h('a', { class: 'btn', href: './console.html#ai' }, t('control'))));

const cart = new Map();
let data = null;
const statusLabel = s => ({ in_development: t('inDev'), beta: t('beta'), available: t('available') }[s]);

function stateBox(msg, err, retry) { return h('div', { class: 'state' + (err ? ' err' : '') }, msg, retry ? h('div', { style: 'margin-top:10px' }, h('button', { class: 'btn', type: 'button', onclick: retry }, t('retry'))) : null); }

function productCard(p) {
  const sellable = p.status === 'available' && p.priceCents > 0;
  const quotable = ['beta', 'available'].includes(p.status);
  return h('article', { class: 'card' },
    h('div', { class: 'cover' }, p.coverUrl ? h('img', { src: p.coverUrl, alt: pick(p, 'name'), loading: 'lazy', width: 640, height: 360 }) : pick(p, 'name').slice(0, 2).toUpperCase()),
    h('span', { class: 'badge b-' + p.status }, statusLabel(p.status)),
    h('h3', {}, pick(p, 'name')), h('p', {}, pick(p, 'summary') || (p.status === 'in_development' ? (th ? 'กำลังพัฒนา ยังไม่เปิดใช้งาน' : 'Under development, not yet released') : '')),
    h('div', { class: 'price' }, baht(p.priceCents) || t('priceNone')),
    h('div', { class: 'row' },
      p.trialUrl ? h('a', { class: 'btn', href: p.trialUrl, target: '_blank', rel: 'noopener noreferrer' }, t('trial')) : h('button', { class: 'btn', type: 'button', disabled: true }, t('trial')),
      h('button', { class: 'btn btn-primary', type: 'button', disabled: !sellable, onclick: () => order(p) }, t('order')),
      h('button', { class: 'btn', type: 'button', disabled: !quotable, onclick: () => addQuote('product', p) }, t('addQuote'))));
}

function renderProducts() {
  const box = $('#products'); box.replaceChildren();
  const q = $('#q').value.trim().toLowerCase(), c = $('#cat').value, s = $('#stat').value;
  const list = data.products.filter(p => (!c || p.categoryId === c) && (!s || p.status === s) && (!q || (p.nameTh + ' ' + p.nameEn + ' ' + (p.summaryTh || '') + ' ' + (p.summaryEn || '')).toLowerCase().includes(q)));
  box.append(list.length ? h('div', { class: 'grid' }, list.map(productCard)) : stateBox(t('empty')));
}

function renderServices() {
  const box = $('#serviceList'); box.replaceChildren();
  box.append(data.services.length ? h('div', { class: 'grid' }, data.services.map(s => h('article', { class: 'card' }, h('h3', {}, pick(s, 'name')), h('p', {}, pick(s, 'summary')), h('div', { class: 'price' }, baht(s.priceCents) || t('priceNone')),
    h('button', { class: 'btn', type: 'button', onclick: () => addQuote('service', s) }, t('addQuote'))))) : stateBox(th ? 'ยังไม่มีบริการที่เปิดแสดง เจ้าของเพิ่มได้ในหน้าผู้ดูแล' : 'No services published yet.'));
}

function addQuote(kind, item) { cart.set(kind + item.id, { kind, id: item.id, name: pick(item, 'name'), quantity: (cart.get(kind + item.id)?.quantity || 0) + 1 }); renderQuote(); location.hash = '#quote'; }

function renderQuote() {
  const box = $('#quoteBox'); box.replaceChildren();
  const items = [...cart.values()];
  const form = h('form', { class: 'card', novalidate: true },
    items.length ? h('div', { class: 'tbl' }, h('table', {}, h('tbody', {}, items.map(i => h('tr', {}, h('td', {}, i.name), h('td', { style: 'width:110px' }, h('input', { type: 'number', min: 1, max: 1000, value: i.quantity, 'aria-label': 'จำนวน', onchange: e => { i.quantity = Math.max(1, Math.min(1000, parseInt(e.target.value, 10) || 1)); } })), h('td', {}, h('button', { class: 'btn', type: 'button', onclick: () => { cart.delete(i.kind + i.id); renderQuote(); } }, '✕')))))))
      : h('p', { class: 'sub' }, th ? 'ยังไม่ได้เลือกรายการ กด "เพิ่มในใบเสนอราคา" ที่โปรแกรมหรือบริการ' : 'Nothing selected yet.'),
    h('label', { for: 'qn' }, 'ชื่อลูกค้า'), h('input', { id: 'qn', name: 'name', maxlength: 160, required: true }),
    h('label', { for: 'qe' }, 'อีเมล'), h('input', { id: 'qe', name: 'email', type: 'email', maxlength: 200 }),
    h('label', { for: 'qp' }, 'เบอร์โทร (กรอกอีเมลหรือเบอร์อย่างน้อยหนึ่งช่อง)'), h('input', { id: 'qp', name: 'phone', maxlength: 40, inputmode: 'tel' }),
    h('label', { for: 'qc' }, 'บริษัท (ถ้ามี)'), h('input', { id: 'qc', name: 'company', maxlength: 200 }),
    h('label', { for: 'qm' }, 'หมายเหตุ'), h('textarea', { id: 'qm', name: 'note', maxlength: 2000 }),
    h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn btn-primary', type: 'submit', disabled: !items.length }, t('quote'))),
    h('p', { class: 'msg', role: 'status' }), h('p', { class: 'sub' }, th ? 'ราคาและส่วนลดคำนวณโดยระบบหลังบ้าน ไม่ใช้ตัวเลขจากหน้าเว็บ ส่วนภาษีผู้ดูแลกำหนดตอนอนุมัติ' : 'Prices come from the server. Discount and tax are set by the administrator on approval.'));
  form.addEventListener('submit', async e => {
    e.preventDefault(); const msg = $('.msg', form), btn = $('button[type=submit]', form); msg.className = 'msg';
    const f = Object.fromEntries(new FormData(form));
    try {
      btn.disabled = true; const auth = await authToken(true);
      if (!auth) { msg.textContent = th ? 'กำลังพาไปเข้าสู่ระบบด้วย LINE…' : 'Redirecting to LINE sign-in…'; return; }
      const r = await api('quote_create', { customer: { name: f.name, email: f.email, phone: f.phone, company: f.company, note: f.note }, items: items.map(i => ({ kind: i.kind, id: i.id, quantity: i.quantity })) }, auth);
      cart.clear(); renderQuote(); const m = $('#quoteBox .msg'); m.className = 'msg ok'; m.textContent = (th ? 'ส่งแล้ว เลขที่ใบเสนอราคา ' : 'Submitted. Quote no. ') + r.quote.quote_no + (th ? ' ดูสถานะและพิมพ์ PDF ได้ที่ "บัญชีของฉัน"' : ' See status and print PDF under My account.');
    } catch (err) { msg.className = 'msg bad'; msg.textContent = errorText(err.code || 'platform_unavailable'); btn.disabled = false; }
  });
  box.append(form);
}

async function order(p) {
  try {
    const auth = await authToken(true); if (!auth) return;
    await api('order_create', { items: [{ id: p.id, quantity: 1 }] }, auth);
    location.href = './console.html#orders';
  } catch (err) { alert(errorText(err.code || 'platform_unavailable')); }
}

async function load() {
  $('#products').replaceChildren(stateBox(t('loading')));
  try {
    data = (await api('catalog'));
    $('#cat').replaceChildren(h('option', { value: '' }, t('all')), ...data.categories.map(c => h('option', { value: c.id }, pick(c, 'name'))));
    $('#stat').replaceChildren(h('option', { value: '' }, t('all')), ...['in_development', 'beta', 'available'].map(s => h('option', { value: s }, statusLabel(s))));
    renderProducts(); renderServices();
  } catch (err) { const m = stateBox(t('error') + ' — ' + errorText(err.code || 'platform_unavailable'), true, load); $('#products').replaceChildren(m); $('#serviceList').replaceChildren(stateBox(t('error'), true, load)); }
}
for (const id of ['#q', '#cat', '#stat']) $(id).addEventListener('input', () => data && renderProducts());
renderQuote();
$('#contactForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)), msg = $('#contactMsg'), btn = $('#contactBtn'); msg.className = 'msg'; btn.disabled = true;
  try { await api('contact', f); e.currentTarget.reset(); msg.className = 'msg ok'; msg.textContent = th ? 'ส่งข้อความแล้ว' : 'Message sent'; }
  catch (err) { msg.className = 'msg bad'; msg.textContent = errorText(err.code === 'invalid_request' ? 'invalid_contact' : err.code || 'platform_unavailable'); } finally { btn.disabled = false; }
});
load();
