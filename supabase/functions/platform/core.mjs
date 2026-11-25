// Pure, dependency-free rules for the Command Center API. Imported by index.ts (Deno) and tests (Node).

export const ROLE_RANK = Object.freeze({ guest: 0, customer: 1, staff: 2, admin: 3 });

// Every action declares the minimum role. index.ts refuses anything not listed here.
export const ACTIONS = Object.freeze({
  catalog: 'guest', contact: 'guest',
  me: 'customer', my_overview: 'customer', quote_create: 'customer', quote_get: 'customer', order_create: 'customer',
  payment_submit: 'customer', payment_info: 'customer', download_link: 'customer', notifications_read: 'customer',
  admin_overview: 'staff', admin_orders: 'staff', admin_payments: 'staff', admin_quotes: 'staff', admin_tickets: 'staff',
  ticket_close: 'staff', admin_licenses: 'staff', slip_link: 'staff',
  product_save: 'admin', service_save: 'admin', category_save: 'admin', quote_decide: 'admin', payment_review: 'admin',
  license_revoke: 'admin', members_list: 'admin', member_role: 'admin', agents_list: 'admin', agent_save: 'admin',
  agent_status: 'admin', workflow_save: 'admin', runs_list: 'admin', income_summary: 'admin', income_csv: 'admin',
  transaction_add: 'admin', audit_list: 'admin', system_status: 'admin'
});

// Per-identity request budget [max requests, window seconds]. Anonymous actions are keyed by IP.
export const RATE_LIMITS = Object.freeze({ guest: [20, 60], customer: [60, 60], staff: [120, 60], admin: [240, 60] });

export function roleAllows(role, action) {
  const need = ACTIONS[action];
  return Boolean(need) && (ROLE_RANK[role] ?? -1) >= ROLE_RANK[need];
}

export function resolveRole({ owner, profileRole }) {
  if (owner) return 'admin';
  return ['staff', 'admin'].includes(profileRole) ? profileRole : 'customer';
}

export function makeRateLimiter(now = () => Date.now()) {
  const hits = new Map();
  return function take(key, [max, windowSeconds]) {
    const t = now();
    const recent = (hits.get(key) || []).filter(x => t - x < windowSeconds * 1000);
    if (recent.length >= max) { hits.set(key, recent); return false; }
    recent.push(t); hits.set(key, recent);
    if (hits.size > 5000) for (const k of hits.keys()) { if (!(hits.get(k) || []).some(x => t - x < windowSeconds * 1000)) hits.delete(k); }
    return true;
  };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = v => typeof v === 'string' && UUID.test(v);
export const isSlug = v => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,62}$/.test(v);
export const isMoney = v => Number.isSafeInteger(v) && v >= 0 && v <= 100_000_000_00;

export function cleanText(value, max, { required = false } = {}) {
  if (value === undefined || value === null || value === '') return required ? null : '';
  if (typeof value !== 'string') return null;
  // Strip control characters; HTML is never trusted and is escaped again on output.
  const text = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (required && !text) return null;
  return text.length <= max ? text : null;
}

export function validateCustomer(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const name = cleanText(input.name, 160, { required: true });
  const email = cleanText(input.email, 200);
  const phone = cleanText(input.phone, 40);
  const company = cleanText(input.company, 200);
  const note = cleanText(input.note, 2000);
  if (name === null || email === null || phone === null || company === null || note === null) return null;
  if (email && !/^[^\s@]{1,100}@[^\s@]{1,100}\.[^\s@]{2,}$/.test(email)) return null;
  if (!email && !phone) return null;
  if (phone && !/^[0-9+()\-\s]{6,40}$/.test(phone)) return null;
  return { name, email, phone, company, note };
}

export function validateItems(items, { max, kinds }) {
  if (!Array.isArray(items) || items.length < 1 || items.length > max) return null;
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') return null;
    const kind = item.kind ?? 'product';
    const limit = kind === 'product' && kinds.length === 1 ? 100 : 1000;
    if (!kinds.includes(kind) || !isUuid(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > limit) return null;
    const key = kind + item.id;
    if (seen.has(key)) return null;
    seen.add(key);
    out.push({ kind, id: item.id.toLowerCase(), quantity: item.quantity });
  }
  return out;
}

export function computeTotals({ subtotalCents, discountCents = 0, taxRateBp = 0 }) {
  if (![subtotalCents, discountCents, taxRateBp].every(Number.isSafeInteger) || subtotalCents < 0 || discountCents < 0 || taxRateBp < 0 || taxRateBp > 3000) return null;
  if (discountCents > subtotalCents) return null;
  const base = subtotalCents - discountCents;
  const tax = Math.round(base * taxRateBp / 10000);
  return { subtotalCents, discountCents, taxRateBp, taxCents: tax, totalCents: base + tax };
}

const SLIP_TYPES = Object.freeze({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' });
export const MAX_SLIP_BYTES = 3 * 1024 * 1024;

// Returns {mime, ext, bytes} only when the declared type matches the actual file signature.
export function validateSlip(slip) {
  if (!slip || typeof slip !== 'object' || !SLIP_TYPES[slip.mime] || typeof slip.data !== 'string') return null;
  if (slip.data.length > Math.ceil(MAX_SLIP_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(slip.data)) return null;
  let bin;
  try { bin = atob(slip.data); } catch { return null; }
  if (bin.length < 16 || bin.length > MAX_SLIP_BYTES) return null;
  const head = bin.slice(0, 12);
  const ok = {
    'image/png': head.startsWith('\x89PNG'),
    'image/jpeg': head.startsWith('\xff\xd8\xff'),
    'image/webp': head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP',
    'application/pdf': head.startsWith('%PDF')
  }[slip.mime];
  if (!ok) return null;
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime: slip.mime, ext: SLIP_TYPES[slip.mime], bytes };
}

// CSV cells starting with = + - @ are neutralised so spreadsheets never execute them.
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\n\r]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}
export function toCsv(headers, rows) {
  return '﻿' + [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function validDateRange(from, to) {
  const ok = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
  if (!ok(from) || !ok(to) || from > to) return null;
  return (Date.parse(to) - Date.parse(from)) / 86400000 <= 3660 ? { from, to } : null;
}

export function validateProduct(b) {
  const name_th = cleanText(b?.nameTh, 160, { required: true });
  const name_en = cleanText(b?.nameEn, 160, { required: true });
  const summary_th = cleanText(b?.summaryTh, 1000);
  const summary_en = cleanText(b?.summaryEn, 1000);
  const test_note = cleanText(b?.testNote, 1000);
  const status = ['in_development', 'beta', 'available', 'archived'].includes(b?.status) ? b.status : null;
  const price = b?.priceCents === null || b?.priceCents === undefined ? null : b.priceCents;
  if (!isSlug(b?.slug) || name_th === null || name_en === null || summary_th === null || summary_en === null || test_note === null || !status) return null;
  if (price !== null && !isMoney(price)) return null;
  const cover = b.coverUrl ? cleanText(b.coverUrl, 500) : null;
  const trial = b.trialUrl ? cleanText(b.trialUrl, 500) : null;
  if (cover && !/^(https:\/\/|\.\/)/.test(cover)) return null;
  if (trial && !/^https:\/\//.test(trial)) return null;
  const tested = Boolean(b.tested);
  // Selling or trialing requires a recorded test; the UI cannot claim a working product without one.
  if (['beta', 'available'].includes(status) && (!tested || !test_note)) return null;
  return {
    slug: b.slug, name_th, name_en, summary_th: summary_th || null, summary_en: summary_en || null, status,
    price_cents: price, cover_url: cover || null, trial_url: trial || null, test_note: test_note || null,
    tested, is_published: b.isPublished !== false, category_id: isUuid(b.categoryId) ? b.categoryId : null
  };
}

export function validateService(b) {
  const name_th = cleanText(b?.nameTh, 160, { required: true });
  const name_en = cleanText(b?.nameEn, 160, { required: true });
  const summary_th = cleanText(b?.summaryTh, 1000);
  const summary_en = cleanText(b?.summaryEn, 1000);
  const price = b?.priceCents === null || b?.priceCents === undefined ? null : b.priceCents;
  if (!isSlug(b?.slug) || name_th === null || name_en === null || summary_th === null || summary_en === null) return null;
  if (price !== null && !isMoney(price)) return null;
  return { slug: b.slug, name_th, name_en, summary_th: summary_th || null, summary_en: summary_en || null, price_cents: price, is_published: b.isPublished !== false };
}

export const AGENT_PERMISSIONS = Object.freeze(['read', 'draft', 'data_write', 'finance', 'notify']);
export function validateAgent(b) {
  const name = cleanText(b?.name, 120, { required: true });
  const description = cleanText(b?.description, 1000);
  if (name === null || description === null || !Array.isArray(b?.permissions) || b.permissions.length > 5) return null;
  if (!b.permissions.every(p => AGENT_PERMISSIONS.includes(p))) return null;
  const permissions = [...new Set(b.permissions)];
  // Agents that can change data or money always wait for human approval.
  const sensitive = permissions.some(p => p === 'data_write' || p === 'finance');
  return { name, description: description || null, permissions, requires_approval: sensitive ? true : b.requiresApproval !== false };
}

export function validateTransaction(b) {
  const note = cleanText(b?.note, 500);
  if (!['income', 'expense', 'api_cost'].includes(b?.kind) || !['product', 'service', 'membership', 'other'].includes(b?.source)) return null;
  if (!Number.isSafeInteger(b?.amountCents) || b.amountCents < 1 || b.amountCents > 100_000_000_00 || note === null) return null;
  // Product income is created only by payment review so it cannot be double counted by hand.
  if (b.kind === 'income' && b.source === 'product') return null;
  return { kind: b.kind, source: b.source, amount_cents: b.amountCents, note: note || null };
}

export function validateContact(b) {
  const name = cleanText(b?.name, 120, { required: true });
  const contact = cleanText(b?.contact, 200, { required: true });
  const message = cleanText(b?.message, 3000, { required: true });
  if (name === null || contact === null || message === null || contact.length < 3) return null;
  return { name, contact, message };
}
