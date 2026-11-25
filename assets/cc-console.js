import { $, h, t, api, baht, pick, nav, errorText, authToken, liffInit } from './cc.js';

$('#nav').replaceWith(nav('console'));
const app = $('#app');
let auth = null, me = null;
const rank = { customer: 1, staff: 2, admin: 3 };
const can = r => rank[me.role] >= rank[r];
const fmt = d => d ? new Date(d).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '';
const call = (a, b) => api(a, b, auth);
const say = (el, text, ok) => { el.className = 'msg ' + (ok ? 'ok' : 'bad'); el.textContent = text; };
const empty = msg => h('div', { class: 'state' }, msg || t('empty'));
const table = (heads, rows) => rows.length ? h('div', { class: 'tbl' }, h('table', {}, h('thead', {}, h('tr', {}, heads.map(x => h('th', {}, x)))), h('tbody', {}, rows.map(r => h('tr', {}, r.map(c => h('td', {}, c))))))) : empty();
const run = async (btn, msgEl, fn, okText) => { btn.disabled = true; try { await fn(); if (okText) say(msgEl, okText, true); } catch (e) { say(msgEl, errorText(e.code || 'platform_unavailable')); } finally { btn.disabled = false; } };

const TABS = [
  ['orders', 'คำสั่งซื้อ', 'customer', ordersView], ['quotes', 'ใบเสนอราคา', 'customer', quotesView], ['licenses', 'โปรแกรมของฉัน', 'customer', licensesView], ['notices', 'การแจ้งเตือน', 'customer', noticesView],
  ['pay', 'ตรวจการชำระเงิน', 'staff', paymentsView], ['aq', 'อนุมัติใบเสนอราคา', 'admin', adminQuotesView], ['tickets', 'ข้อความติดต่อ', 'staff', ticketsView],
  ['catalog', 'โปรแกรม/บริการ', 'admin', catalogView], ['members', 'สมาชิกและสิทธิ์', 'admin', membersView], ['lic', 'License', 'staff', adminLicensesView],
  ['income', 'รายได้', 'admin', incomeView], ['ai', 'AI Control Center', 'admin', aiView], ['sys', 'ระบบและ Audit', 'admin', systemView]
];

async function start() {
  try {
    auth = await authToken(false);
    if (!auth) { app.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'เข้าสู่ระบบ'), h('p', {}, 'ใช้บัญชี LINE เดิมของคุณ'), h('button', { class: 'btn btn-primary', type: 'button', onclick: () => authToken(true) }, t('login')))); return; }
    let name = ''; try { name = (await window.liff.getProfile()).displayName; } catch { /* optional */ }
    me = await call('me', { displayName: name });
  } catch (e) { app.replaceChildren(h('div', { class: 'state err' }, errorText(e.code || 'platform_unavailable'), h('div', { style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: start }, t('retry'))))); return; }
  const tabs = TABS.filter(x => can(x[2]));
  const panel = h('div', { id: 'panel', role: 'tabpanel' });
  const bar = h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) => h('button', { role: 'tab', 'data-id': id, 'aria-selected': 'false', onclick: () => show(id) }, label)));
  app.replaceChildren(h('h1', {}, 'บัญชีของฉัน'), h('p', { class: 'sub' }, 'สิทธิ์ของคุณ: ' + ({ customer: 'Customer', staff: 'Staff', admin: 'Admin' }[me.role])), bar, panel);
  async function show(id) {
    for (const b of bar.children) b.setAttribute('aria-selected', String(b.dataset.id === id));
    history.replaceState(null, '', '#' + id); panel.replaceChildren(h('p', { class: 'state' }, t('loading')));
    try { panel.replaceChildren(await tabs.find(x => x[0] === id)[3]()); } catch (e) { panel.replaceChildren(h('div', { class: 'state err' }, errorText(e.code || 'platform_unavailable'), h('div', { style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: () => show(id) }, t('retry'))))); }
  }
  const first = tabs.find(x => x[0] === location.hash.slice(1)) ? location.hash.slice(1) : tabs[0][0];
  if (can('staff')) { try { const o = (await call('admin_overview')).counts; panel.before(h('div', { class: 'kpis' }, [['รอตรวจชำระเงิน', o.paymentsToReview], ['ใบเสนอราคารออนุมัติ', o.quotesToDecide], ['ข้อความที่ยังไม่ปิด', o.openTickets], ['โปรแกรมทั้งหมด', o.products], ['Agent ที่ตั้งเป็นเริ่ม', o.runningAgents]].map(([l, v]) => h('div', { class: 'card' }, h('div', { class: 'kpi' }, v), h('div', { class: 'sub' }, l))))); } catch { /* shown per tab */ } }
  show(first);
}

async function ordersView() {
  const d = await call('my_overview'); const wrap = h('div', {});
  const info = d.orders.some(o => o.status === 'pending_payment') ? await call('payment_info') : null;
  wrap.append(d.orders.length ? h('div', {}, d.orders.map(o => orderCard(o, info))) : empty('ยังไม่มีคำสั่งซื้อ'));
  return wrap;
}
function orderCard(o, info) {
  const st = { pending_payment: 'รอชำระเงิน', payment_review: 'รอตรวจหลักฐาน', paid: 'ชำระแล้ว', cancelled: 'ยกเลิก' }[o.status];
  const msg = h('p', { class: 'msg', role: 'status' });
  const card = h('article', { class: 'card', style: 'margin-bottom:12px' }, h('h3', {}, o.order_no + ' · ' + baht(o.total_cents)), h('p', {}, st + ' · ' + fmt(o.created_at)),
    h('ul', {}, (o.cc_order_items || []).map(i => h('li', {}, `${i.description} × ${i.quantity}`))));
  const last = (o.cc_payments || []).at(-1); if (last?.status === 'rejected') card.append(h('p', { class: 'msg bad' }, 'หลักฐานก่อนหน้าไม่ผ่าน: ' + (last.review_note || '')));
  if (o.status === 'pending_payment') {
    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,application/pdf', 'aria-label': 'แนบหลักฐาน' }), method = h('select', { 'aria-label': 'วิธีชำระ' }, h('option', { value: 'promptpay' }, 'PromptPay / QR'), h('option', { value: 'bank_transfer' }, 'โอนเงิน'));
    const btn = h('button', { class: 'btn btn-primary', type: 'button' }, 'ส่งหลักฐานการชำระเงิน');
    btn.onclick = () => run(btn, msg, async () => {
      const f = file.files[0]; if (!f) throw { code: 'invalid_slip' }; if (f.size > 3 * 1024 * 1024) throw { code: 'invalid_slip' };
      const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
      await call('payment_submit', { orderId: o.id, method: method.value, slip: { mime: f.type, data } }); ordersRefresh();
    }, 'ส่งแล้ว รอผู้ดูแลตรวจสอบ');
    card.append(info?.configured ? h('div', { class: 'notice' }, [info.promptpayId && 'PromptPay: ' + info.promptpayId, info.accountName && 'ชื่อบัญชี: ' + info.accountName, info.bankInfo].filter(Boolean).join(' · '), h('br'), 'สถานะ "ชำระแล้ว" เกิดหลังผู้ดูแลตรวจหลักฐานเท่านั้น') : h('div', { class: 'notice warn' }, 'เจ้าของยังไม่ได้ตั้งค่าช่องทางรับเงิน (PROMPTPAY_ID / BANK_TRANSFER_INFO) จึงยังชำระไม่ได้'), method, file, h('div', { class: 'row', style: 'margin-top:8px' }, btn));
  }
  card.append(msg); return card;
}
const ordersRefresh = () => document.querySelector('.tabs [aria-selected=true]')?.click();

async function quotesView() {
  const d = await call('my_overview');
  return d.quotes.length ? h('div', {}, d.quotes.map(q => { const msg = h('p', { class: 'msg' }); const b = h('button', { class: 'btn', type: 'button' }, 'ดู / พิมพ์ PDF'); b.onclick = () => run(b, msg, async () => printQuote(await call('quote_get', { id: q.id }))); return h('article', { class: 'card', style: 'margin-bottom:12px' }, h('h3', {}, q.quote_no + ' · ' + baht(q.total_cents)), h('p', {}, { submitted: 'รอพิจารณา', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ', expired: 'หมดอายุ' }[q.status] + ' · ' + fmt(q.created_at)), b, msg); })) : empty('ยังไม่มีใบเสนอราคา');
}
// Print-to-PDF with the embedded Thai font. Issuer details appear only when the owner configured them.
function printQuote({ quote: q, issuer }) {
  const doc = h('section', { class: 'print-doc card', id: 'printDoc' }, h('h2', {}, 'ใบเสนอราคา ' + q.quote_no), issuer.name ? h('p', {}, issuer.name, issuer.address ? h('br') : null, issuer.address || '', issuer.taxId ? h('br') : null, issuer.taxId ? 'เลขประจำตัวผู้เสียภาษี ' + issuer.taxId : '') : h('p', { class: 'no-print notice warn' }, 'ยังไม่ได้ตั้งข้อมูลผู้ออกเอกสาร (QUOTE_ISSUER_NAME) เจ้าของต้องตั้งค่าก่อนส่งให้ลูกค้า'),
    h('p', {}, 'ลูกค้า: ' + q.customer_name + (q.company ? ' · ' + q.company : '')), h('p', {}, 'วันที่: ' + fmt(q.created_at) + ' · สถานะ: ' + q.status),
    table(['รายการ', 'จำนวน', 'ราคา/หน่วย', 'รวม'], q.cc_quotation_items.map(i => [i.description, i.quantity, baht(i.unit_price_cents), baht(i.unit_price_cents * i.quantity)])),
    h('p', {}, 'รวม ' + baht(q.subtotal_cents) + ' · ส่วนลด ' + baht(q.discount_cents) + ' · ภาษี ' + (q.tax_rate_bp / 100) + '% ' + baht(q.tax_cents)), h('h3', {}, 'ยอดสุทธิ ' + baht(q.total_cents)),
    h('div', { class: 'row no-print' }, h('button', { class: 'btn btn-primary', onclick: () => window.print() }, 'พิมพ์ / บันทึกเป็น PDF'), h('button', { class: 'btn', onclick: () => doc.remove() }, 'ปิด')));
  document.querySelector('#printDoc')?.remove(); app.append(doc); doc.scrollIntoView();
}

async function licensesView() {
  const d = await call('my_overview');
  return d.licenses.length ? table(['โปรแกรม', 'สถานะ', 'ออกให้เมื่อ', 'หมดอายุ', 'License key', ''], d.licenses.map(l => { const msg = h('span', { class: 'msg bad' }); const b = h('button', { class: 'btn', disabled: !l.product.downloadable || l.status !== 'active' }, 'ดาวน์โหลด'); b.onclick = () => run(b, msg, async () => { const r = await call('download_link', { productId: l.productId }); location.assign(r.url); }); return [pick(l.product, 'name'), l.status, fmt(l.issuedAt), l.expiresAt ? fmt(l.expiresAt) : 'ไม่มีกำหนด', h('code', {}, l.licenseKey), h('span', {}, b, msg)]; })) : empty('ยังไม่มีสิทธิ์ใช้งาน (ได้รับหลังผู้ดูแลยืนยันการชำระเงิน)');
}
async function noticesView() {
  const d = await call('my_overview'); call('notifications_read').catch(() => {});
  return d.notifications.length ? h('div', {}, d.notifications.map(n => h('div', { class: 'card', style: 'margin-bottom:8px' }, h('strong', {}, n.title), h('p', {}, n.body || ''), h('small', {}, fmt(n.created_at))))) : empty();
}

async function paymentsView() {
  const d = await call('admin_payments');
  return table(['ออเดอร์', 'ช่องทาง', 'ยอด', 'สถานะ', 'ส่งเมื่อ', 'จัดการ'], d.payments.map(p => {
    const msg = h('span', { class: 'msg' }); const box = h('span', { class: 'row' });
    const view = h('button', { class: 'btn' }, 'ดูหลักฐาน'); view.onclick = () => run(view, msg, async () => { const r = await call('slip_link', { paymentId: p.id }); window.open(r.url, '_blank', 'noopener,noreferrer'); });
    box.append(view);
    if (p.status === 'submitted' && can('admin')) {
      const ok = h('button', { class: 'btn btn-primary' }, 'ยืนยันว่าได้รับเงิน'), no = h('button', { class: 'btn' }, 'ไม่ผ่าน');
      ok.onclick = () => confirm('ยืนยันว่าได้รับเงินตรงยอด ' + baht(p.amount_cents) + ' จริง? จะออก License และบันทึกรายได้') && run(ok, msg, async () => { await call('payment_review', { paymentId: p.id, approve: true }); ordersRefresh(); });
      no.onclick = () => { const note = prompt('เหตุผลที่ไม่ผ่าน'); if (note) run(no, msg, async () => { await call('payment_review', { paymentId: p.id, approve: false, note }); ordersRefresh(); }); };
      box.append(ok, no);
    }
    return [p.cc_orders?.order_no, p.method, baht(p.amount_cents), p.status, fmt(p.submitted_at), h('span', {}, box, msg)];
  }));
}
async function adminQuotesView() {
  const d = await call('admin_quotes');
  return table(['เลขที่', 'ลูกค้า', 'ติดต่อ', 'ยอดก่อนส่วนลด', 'สถานะ', 'พิจารณา'], d.quotes.map(q => {
    const msg = h('span', { class: 'msg' }); if (q.status !== 'submitted') return [q.quote_no, q.customer_name, q.customer_email || q.customer_phone, baht(q.subtotal_cents), q.status + ' · ' + baht(q.total_cents), ''];
    const disc = h('input', { type: 'number', min: 0, step: '0.01', placeholder: 'ส่วนลด (บาท)', 'aria-label': 'ส่วนลด' }), tax = h('input', { type: 'number', min: 0, max: 30, step: '0.01', placeholder: 'ภาษี %', 'aria-label': 'ภาษี' });
    const decide = (d2, btn) => run(btn, msg, async () => { await call('quote_decide', { id: q.id, decision: d2, discountCents: Math.round((+disc.value || 0) * 100), taxRateBp: Math.round((+tax.value || 0) * 100) }); ordersRefresh(); });
    const a = h('button', { class: 'btn btn-primary', onclick: e => decide('approve', e.currentTarget) }, 'อนุมัติ'), r = h('button', { class: 'btn', onclick: e => decide('reject', e.currentTarget) }, 'ไม่อนุมัติ');
    return [q.quote_no, q.customer_name, q.customer_email || q.customer_phone, baht(q.subtotal_cents), q.status, h('span', {}, disc, tax, a, r, msg)];
  }));
}
async function ticketsView() {
  const d = await call('admin_tickets');
  return table(['วันที่', 'ชื่อ', 'ติดต่อ', 'ข้อความ', ''], d.tickets.map(x => { const b = h('button', { class: 'btn', disabled: x.status === 'closed' }, x.status === 'closed' ? 'ปิดแล้ว' : 'ปิดเรื่อง'); b.onclick = () => run(b, b, async () => { await call('ticket_close', { id: x.id }); ordersRefresh(); }); return [fmt(x.created_at), x.name, x.contact, x.message, b]; }));
}
async function adminLicensesView() {
  const d = await call('admin_licenses');
  return table(['ผู้ใช้', 'โปรแกรม', 'สถานะ', 'ออกให้', ''], d.licenses.map(l => { const b = h('button', { class: 'btn', disabled: !can('admin') || l.status !== 'active' }, 'เพิกถอน'); b.onclick = () => confirm('เพิกถอน License นี้?') && run(b, b, async () => { await call('license_revoke', { id: l.id }); ordersRefresh(); }); return [l.line_user_id, l.cc_products?.name_th, l.status, fmt(l.issued_at), b]; }));
}

async function catalogView() {
  const cat = await api('catalog'); const wrap = h('div', {});
  const msg = h('p', { class: 'msg', role: 'status' });
  const form = h('form', { class: 'card', novalidate: true }, h('h3', {}, 'เพิ่ม/แก้ไขโปรแกรม'),
    h('div', { class: 'two' }, h('div', {}, h('label', {}, 'Slug (a-z, 0-9, -)'), h('input', { name: 'slug', required: true, pattern: '[a-z0-9][a-z0-9-]*' })), h('div', {}, h('label', {}, 'สถานะ'), h('select', { name: 'status' }, ['in_development', 'beta', 'available', 'archived'].map(s => h('option', { value: s }, s))))),
    h('div', { class: 'two' }, h('div', {}, h('label', {}, 'ชื่อไทย'), h('input', { name: 'nameTh', required: true })), h('div', {}, h('label', {}, 'ชื่ออังกฤษ'), h('input', { name: 'nameEn', required: true }))),
    h('label', {}, 'คำอธิบายไทย'), h('textarea', { name: 'summaryTh' }), h('label', {}, 'คำอธิบายอังกฤษ'), h('textarea', { name: 'summaryEn' }),
    h('div', { class: 'two' }, h('div', {}, h('label', {}, 'ราคา (บาท) เว้นว่าง = ติดต่อสอบถาม'), h('input', { name: 'price', type: 'number', min: 0, step: '0.01' })), h('div', {}, h('label', {}, 'หมวดหมู่'), h('select', { name: 'categoryId' }, h('option', { value: '' }, '-'), cat.categories.map(c => h('option', { value: c.id }, c.name_th))))),
    h('div', { class: 'two' }, h('div', {}, h('label', {}, 'URL ภาพปก (https หรือ ./)'), h('input', { name: 'coverUrl' })), h('div', {}, h('label', {}, 'URL ทดลองใช้ (https)'), h('input', { name: 'trialUrl' }))),
    h('label', {}, 'ผลทดสอบ (จำเป็นเมื่อสถานะ beta/available)'), h('textarea', { name: 'testNote' }), h('label', {}, h('input', { type: 'checkbox', name: 'tested', style: 'width:auto;min-height:0' }), ' ยืนยันว่าทดสอบแล้วจริง'),
    h('input', { type: 'hidden', name: 'id' }), h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'บันทึก')));
  form.addEventListener('submit', e => { e.preventDefault(); const f = Object.fromEntries(new FormData(form)); run($('button[type=submit]', form), msg, async () => { await call('product_save', { id: f.id || undefined, slug: f.slug, nameTh: f.nameTh, nameEn: f.nameEn, summaryTh: f.summaryTh, summaryEn: f.summaryEn, status: f.status, priceCents: f.price === '' ? null : Math.round(+f.price * 100), categoryId: f.categoryId || undefined, coverUrl: f.coverUrl, trialUrl: f.trialUrl, testNote: f.testNote, tested: f.tested === 'on' }); ordersRefresh(); }, 'บันทึกแล้ว'); });
  const list = table(['ชื่อ', 'Slug', 'สถานะ', 'ราคา', 'ทดสอบ', ''], cat.products.map(p => [p.nameTh, p.slug, p.status, baht(p.priceCents) || '-', p.tested ? 'ใช่' : 'ยัง', h('button', { class: 'btn', onclick: () => { for (const [k, v] of Object.entries({ id: p.id, slug: p.slug, nameTh: p.nameTh, nameEn: p.nameEn, summaryTh: p.summaryTh || '', summaryEn: p.summaryEn || '', status: p.status, price: p.priceCents === null ? '' : p.priceCents / 100, categoryId: p.categoryId || '', coverUrl: p.coverUrl || '', trialUrl: p.trialUrl || '' })) form.elements[k].value = v; form.scrollIntoView(); } }, 'แก้ไข')]));
  const sform = h('form', { class: 'card', style: 'margin-top:16px', novalidate: true }, h('h3', {}, 'เพิ่มบริการ'), h('div', { class: 'two' }, h('div', {}, h('label', {}, 'Slug'), h('input', { name: 'slug', required: true })), h('div', {}, h('label', {}, 'ราคา (บาท) เว้นว่างได้'), h('input', { name: 'price', type: 'number', min: 0, step: '0.01' }))),
    h('div', { class: 'two' }, h('div', {}, h('label', {}, 'ชื่อไทย'), h('input', { name: 'nameTh', required: true })), h('div', {}, h('label', {}, 'ชื่ออังกฤษ'), h('input', { name: 'nameEn', required: true }))), h('label', {}, 'คำอธิบาย'), h('textarea', { name: 'summaryTh' }), h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'บันทึกบริการ')));
  sform.addEventListener('submit', e => { e.preventDefault(); const f = Object.fromEntries(new FormData(sform)); run($('button', sform), msg, async () => { await call('service_save', { slug: f.slug, nameTh: f.nameTh, nameEn: f.nameEn, summaryTh: f.summaryTh, priceCents: f.price === '' ? null : Math.round(+f.price * 100) }); ordersRefresh(); }, 'บันทึกแล้ว'); });
  wrap.append(list, form, sform, msg); return wrap;
}
async function membersView() {
  const d = await call('members_list');
  return table(['ชื่อ', 'LINE ID', 'สิทธิ์', ''], d.members.map(m => { const sel = h('select', { 'aria-label': 'สิทธิ์' }, ['customer', 'staff', 'admin'].map(r => h('option', { value: r, selected: r === m.role }, r))); const b = h('button', { class: 'btn', disabled: m.line_user_id === me.lineUserId }, 'เปลี่ยน'); b.onclick = () => confirm('เปลี่ยนสิทธิ์เป็น ' + sel.value + '?') && run(b, b, async () => { await call('member_role', { lineUserId: m.line_user_id, role: sel.value }); }); return [m.display_name || '-', m.line_user_id, sel, b]; }));
}

async function incomeView() {
  const wrap = h('div', {}); const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const from = h('input', { type: 'date', value: today.slice(0, 4) + '-01-01' }), to = h('input', { type: 'date', value: today }), grain = h('select', {}, [['day', 'รายวัน'], ['month', 'รายเดือน'], ['year', 'รายปี']].map(([v, l]) => h('option', { value: v, selected: v === 'month' }, l)));
  const out = h('div', {}), msg = h('p', { class: 'msg' });
  const load = async () => { const d = await call('income_summary', { from: from.value, to: to.value, grain: grain.value }); const T = d.totals; out.replaceChildren(
    h('div', { class: 'kpis' }, [['รายได้', T.income], ['ค่าใช้จ่าย', T.expense], ['ต้นทุน API', T.api_cost], ['กำไรสุทธิ', T.income - T.expense - T.api_cost]].map(([l, v]) => h('div', { class: 'card' }, h('div', { class: 'kpi' }, baht(v)), h('div', { class: 'sub' }, l)))),
    h('h3', {}, 'ตามช่วงเวลา'), table(['ช่วง', 'รายได้', 'ค่าใช้จ่าย', 'ต้นทุน API', 'สุทธิ'], d.periods.map(p => [p.period, baht(p.income), baht(p.expense), baht(p.api_cost), baht(p.net)])),
    h('h3', {}, 'รายได้ตามแหล่ง'), table(['แหล่ง', 'รายได้'], d.by_source.map(s => [{ product: 'ขายโปรแกรม', service: 'บริการ', membership: 'สมาชิก', other: 'อื่น ๆ' }[s.source], baht(s.income)])), h('p', { class: 'sub' }, 'ตัวเลขมาจากรายการที่บันทึกจริงเท่านั้น รายได้ขายโปรแกรมเกิดจากการยืนยันชำระเงิน')); };
  const go = h('button', { class: 'btn btn-primary', onclick: () => run(go, msg, load) }, 'ดูรายงาน'), csv = h('button', { class: 'btn', onclick: () => run(csv, msg, async () => { const r = await call('income_csv', { from: from.value, to: to.value }); const a = h('a', { href: URL.createObjectURL(new Blob([r.csv], { type: 'text/csv;charset=utf-8' })), download: r.filename }); document.body.append(a); a.click(); a.remove(); }) }, 'Export CSV');
  const tf = h('form', { class: 'card', style: 'margin-top:16px', novalidate: true }, h('h3', {}, 'บันทึกรายการด้วยมือ'), h('div', { class: 'two' }, h('div', {}, h('label', {}, 'ประเภท'), h('select', { name: 'kind' }, [['income', 'รายได้'], ['expense', 'ค่าใช้จ่าย'], ['api_cost', 'ต้นทุน API']].map(([v, l]) => h('option', { value: v }, l)))), h('div', {}, h('label', {}, 'แหล่ง'), h('select', { name: 'source' }, [['service', 'บริการ'], ['membership', 'สมาชิก'], ['other', 'อื่น ๆ']].map(([v, l]) => h('option', { value: v }, l))))), h('label', {}, 'จำนวนเงิน (บาท)'), h('input', { name: 'amount', type: 'number', min: 0.01, step: '0.01', required: true }), h('label', {}, 'หมายเหตุ'), h('input', { name: 'note', maxlength: 500 }), h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'บันทึก')));
  tf.addEventListener('submit', e => { e.preventDefault(); const f = Object.fromEntries(new FormData(tf)); run($('button', tf), msg, async () => { await call('transaction_add', { kind: f.kind, source: f.source, amountCents: Math.round(+f.amount * 100), note: f.note }); tf.reset(); await load(); }, 'บันทึกแล้ว'); });
  wrap.append(h('div', { class: 'tools' }, from, to, grain, go, csv), msg, out, tf); await load(); return wrap;
}

async function aiView() {
  const d = await call('agents_list'); const wrap = h('div', {}); const msg = h('p', { class: 'msg', role: 'status' });
  wrap.append(h('div', { class: 'notice warn' }, 'ยังไม่ได้เชื่อมต่อตัวรันงาน AI (AI provider / scheduler) ปุ่ม เริ่ม/หยุด บันทึกสถานะที่ต้องการเท่านั้น และจะไม่แสดงผลการรันจนกว่าจะมีตัวรันจริง ต้องใช้ API key จากเจ้าของ'),
    h('div', { class: 'notice' }, 'AI Chat · Knowledge Base · File Manager · API Integrations: ยังไม่เปิดใช้ ต้องเชื่อมบริการและ key จริงก่อน'));
  wrap.append(table(['Agent', 'สิทธิ์', 'ขออนุมัติก่อนทำ', 'สถานะ', 'ควบคุม'], d.agents.map(a => { const box = h('span', { class: 'row' }); for (const [s, l] of [['running', 'เริ่ม'], ['paused', 'พัก'], ['stopped', 'หยุด']]) { const b = h('button', { class: 'btn', disabled: a.status === s }, l); b.onclick = () => run(b, msg, async () => { await call('agent_status', { id: a.id, status: s }); ordersRefresh(); }); box.append(b); } return [a.name, (a.permissions || []).join(', ') || 'ไม่มี', a.requires_approval ? 'ใช่' : 'ไม่', a.status, box]; })));
  const form = h('form', { class: 'card', style: 'margin-top:16px', novalidate: true }, h('h3', {}, 'สร้าง AI Agent'), h('label', {}, 'ชื่อ'), h('input', { name: 'name', required: true, maxlength: 120 }), h('label', {}, 'คำอธิบาย'), h('textarea', { name: 'description' }),
    h('fieldset', {}, h('legend', {}, 'สิทธิ์ (data_write และ finance บังคับขออนุมัติทุกครั้ง)'), ['read', 'draft', 'notify', 'data_write', 'finance'].map(p => h('label', {}, h('input', { type: 'checkbox', name: 'p_' + p, style: 'width:auto;min-height:0' }), ' ' + p))), h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'สร้าง')));
  form.addEventListener('submit', e => { e.preventDefault(); const f = new FormData(form); run($('button', form), msg, async () => { await call('agent_save', { name: f.get('name'), description: f.get('description'), permissions: ['read', 'draft', 'notify', 'data_write', 'finance'].filter(p => f.get('p_' + p)) }); ordersRefresh(); }, 'สร้างแล้ว'); });
  const runs = (await call('runs_list')).runs;
  wrap.append(form, h('h3', {}, 'Activity / Automation runs'), runs.length ? table(['เริ่ม', 'สถานะ', 'ต้นทุน', 'ข้อผิดพลาด'], runs.map(r => [fmt(r.started_at), r.status, baht(r.cost_cents), r.error || ''])) : empty('ยังไม่มีการรันงาน'), msg); return wrap;
}
async function systemView() {
  const [s, a] = await Promise.all([call('system_status'), call('audit_list')]); const yes = v => v ? '✅ พร้อม' : '⚠️ ยังไม่ตั้งค่า';
  return h('div', {}, h('h3', {}, 'สถานะระบบ'), table(['รายการ', 'สถานะ'], [['ฐานข้อมูล', yes(s.database)], ['Storage หลักฐานชำระเงิน', yes(s.storage.slips)], ['Storage ไฟล์ดาวน์โหลด', yes(s.storage.downloads)], ['PromptPay', yes(s.config.promptpay)], ['ข้อมูลโอนเงิน', yes(s.config.bank)], ['ข้อมูลผู้ออกใบเสนอราคา', yes(s.config.quoteIssuer)], ['AI provider', s.aiProvider.connected ? '✅' : '⚠️ ยังไม่เชื่อมต่อ']]), h('h3', {}, 'Audit Logs'), table(['เวลา', 'ผู้ทำ', 'การกระทำ', 'ทรัพยากร'], a.logs.map(l => [fmt(l.created_at), l.actor_id, l.action, l.resource + (l.record_id ? ' ' + l.record_id : '')])));
}
liffInit().catch(() => {}).finally(start);
