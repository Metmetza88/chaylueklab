import { platformConfig } from '../data/platform-config.js';

export const $ = (s, r = document) => r.querySelector(s);
export const baht = c => (c === null || c === undefined) ? null : new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(c / 100);

// Safe DOM builder: text is always assigned as text, never as HTML.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

const T = {
  th: { home: 'หน้าแรก', shop: 'โปรแกรม', services: 'บริการ', control: 'ระบบควบคุม AI', quote: 'ขอใบเสนอราคา', contact: 'ติดต่อ', console: 'บัญชีของฉัน',
    heroTitle: 'ศูนย์รวมโปรแกรมและระบบ AI', heroSub: 'เลือกโปรแกรม ขอใบเสนอราคา และควบคุมงาน AI จากที่เดียว',
    buy: 'เลือกซื้อโปรแกรม', trial: 'ทดลองใช้งาน', join: 'สมัครสมาชิก', loading: 'กำลังโหลด…', empty: 'ยังไม่มีรายการ', error: 'โหลดข้อมูลไม่สำเร็จ',
    retry: 'ลองใหม่', inDev: 'กำลังพัฒนา', beta: 'ทดสอบ', available: 'พร้อมใช้งาน', priceNone: 'ติดต่อสอบถามราคา', search: 'ค้นหา', all: 'ทั้งหมด',
    order: 'สั่งซื้อ', addQuote: 'เพิ่มในใบเสนอราคา', send: 'ส่ง', sent: 'ส่งแล้ว', login: 'เข้าสู่ระบบด้วย LINE' },
  en: { home: 'Home', shop: 'Programs', services: 'Services', control: 'AI Control', quote: 'Request a quote', contact: 'Contact', console: 'My account',
    heroTitle: 'One hub for software and AI systems', heroSub: 'Pick a program, request a quote and run AI work from one place.',
    buy: 'Browse programs', trial: 'Try it', join: 'Sign up', loading: 'Loading…', empty: 'Nothing here yet', error: 'Could not load data',
    retry: 'Retry', inDev: 'In development', beta: 'Testing', available: 'Available', priceNone: 'Ask for a price', search: 'Search', all: 'All',
    order: 'Order', addQuote: 'Add to quote', send: 'Send', sent: 'Sent', login: 'Sign in with LINE' }
};
let lang = 'th';
try { const saved = localStorage.getItem('cc.lang'); if (saved === 'en' || saved === 'th') lang = saved; } catch { /* storage unavailable */ }
export const t = k => (T[lang] && T[lang][k]) || T.th[k] || k;
export const getLang = () => lang;
export function setLang(l) { lang = l === 'en' ? 'en' : 'th'; try { localStorage.setItem('cc.lang', lang); } catch { /* ignore */ } document.documentElement.lang = lang; }
document.documentElement.lang = lang;
export const pick = (o, base) => (lang === 'en' ? o[base + 'En'] || o[base + 'Th'] : o[base + 'Th'] || o[base + 'En']) || '';

export const errorText = code => ({
  invalid_line_login: 'กรุณาเข้าสู่ระบบด้วย LINE ใหม่', forbidden: 'ไม่มีสิทธิ์ทำรายการนี้', rate_limited: 'ส่งคำขอถี่เกินไป กรุณารอสักครู่',
  invalid_quote: 'ข้อมูลใบเสนอราคาไม่ครบหรือไม่ถูกต้อง', invalid_contact: 'ข้อมูลติดต่อไม่ครบ', price_not_set: 'รายการนี้ยังไม่ได้ตั้งราคา กรุณาขอใบเสนอราคา',
  item_not_found: 'ไม่พบรายการ หรือยังไม่เปิดขาย', invalid_slip: 'ไฟล์หลักฐานต้องเป็น PNG, JPG, WebP หรือ PDF ไม่เกิน 3MB', payment_pending: 'มีหลักฐานที่รอตรวจสอบอยู่แล้ว',
  platform_unavailable: 'ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง', license_required: 'ยังไม่มีสิทธิ์ใช้งานโปรแกรมนี้', download_unavailable: 'ยังไม่มีไฟล์ให้ดาวน์โหลด',
  amount_mismatch: 'ยอดเงินไม่ตรงกับคำสั่งซื้อ', note_required: 'กรุณาระบุเหตุผล', invalid_product: 'ข้อมูลโปรแกรมไม่ถูกต้อง (สถานะ "ทดสอบ/พร้อมใช้งาน" ต้องบันทึกผลทดสอบ)'
}[code] || 'ทำรายการไม่สำเร็จ (' + code + ')');

export async function api(action, body = {}, auth = null) {
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), platformConfig.requestTimeoutMs);
  try {
    const res = await fetch(platformConfig.apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body, ...(auth || {}) }), signal: ctl.signal });
    const data = await res.json().catch(() => ({ ok: false, error: 'platform_unavailable' }));
    if (!res.ok || !data.ok) throw Object.assign(new Error(data.error || 'platform_unavailable'), { code: data.error || 'platform_unavailable', status: res.status });
    return data;
  } catch (e) { if (e.name === 'AbortError') throw Object.assign(new Error('timeout'), { code: 'platform_unavailable' }); throw e; } finally { clearTimeout(timer); }
}

// LINE login through the shared LIFF app. Tokens are sent only to the server, which verifies them.
let liffReady = null;
export function liffInit() {
  if (!liffReady) liffReady = new Promise((resolve, reject) => {
    const go = () => window.liff.init({ liffId: platformConfig.liffId }).then(resolve, reject);
    if (window.liff) return go();
    const s = document.createElement('script'); s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'; s.onload = go; s.onerror = () => reject(new Error('liff_unavailable')); document.head.append(s);
  });
  return liffReady;
}
export async function authToken(interactive = false) {
  await liffInit();
  if (!window.liff.isLoggedIn()) { if (interactive) window.liff.login({ redirectUri: location.href }); return null; }
  const idToken = window.liff.getIDToken();
  return idToken ? { idToken } : { accessToken: window.liff.getAccessToken() };
}

export function nav(active) {
  const links = [['./command-center.html', 'home'], ['./command-center.html#shop', 'shop'], ['./command-center.html#quote', 'quote'], ['./command-center.html#contact', 'contact'], ['./console.html', 'console']];
  const bar = h('header', { class: 'cc-nav' },
    h('a', { class: 'cc-logo', href: './command-center.html' }, 'CHAYLUEKLAB ', h('span', {}, 'AI COMMAND CENTER')),
    h('button', { class: 'cc-burger', type: 'button', 'aria-label': 'menu', 'aria-expanded': 'false', onclick: e => { const o = bar.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', String(o)); } }, '☰'),
    h('nav', { 'aria-label': 'main' }, links.map(([href, key]) => h('a', { href, 'aria-current': key === active ? 'page' : false }, t(key))),
      h('button', { class: 'cc-lang', type: 'button', onclick: () => { setLang(getLang() === 'th' ? 'en' : 'th'); location.reload(); } }, getLang() === 'th' ? 'EN' : 'TH')));
  return bar;
}
