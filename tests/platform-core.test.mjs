import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ACTIONS, ROLE_RANK, roleAllows, resolveRole, makeRateLimiter, validateCustomer, validateItems, computeTotals,
  validateSlip, csvCell, toCsv, validDateRange, validateProduct, validateService, validateAgent, validateTransaction, validateContact, cleanText
} from '../supabase/functions/platform/core.mjs';

const id = '123e4567-e89b-42d3-a456-426614174000';

test('every action has a known minimum role and guest actions are only the public ones', () => {
  for (const [action, role] of Object.entries(ACTIONS)) assert.ok(role in ROLE_RANK, action);
  assert.deepEqual(Object.keys(ACTIONS).filter(a => ACTIONS[a] === 'guest').sort(), ['catalog', 'contact']);
});

test('role matrix: guest < customer < staff < admin; unknown actions are denied', () => {
  assert.equal(roleAllows('guest', 'catalog'), true);
  assert.equal(roleAllows('guest', 'my_overview'), false);
  assert.equal(roleAllows('customer', 'admin_overview'), false);
  assert.equal(roleAllows('customer', 'income_summary'), false);
  assert.equal(roleAllows('staff', 'admin_payments'), true);
  assert.equal(roleAllows('staff', 'payment_review'), false);
  assert.equal(roleAllows('staff', 'income_csv'), false);
  assert.equal(roleAllows('staff', 'agent_status'), false);
  assert.equal(roleAllows('admin', 'payment_review'), true);
  assert.equal(roleAllows('admin', 'nope'), false);
  assert.equal(roleAllows('hacker', 'catalog'), false);
});

test('owner is admin; profile role cannot be spoofed by unknown values', () => {
  assert.equal(resolveRole({ owner: true, profileRole: 'customer' }), 'admin');
  assert.equal(resolveRole({ owner: false, profileRole: 'staff' }), 'staff');
  assert.equal(resolveRole({ owner: false, profileRole: 'root' }), 'customer');
  assert.equal(resolveRole({ owner: false, profileRole: undefined }), 'customer');
});

test('rate limiter blocks after the budget and recovers after the window', () => {
  let t = 0; const take = makeRateLimiter(() => t);
  for (let i = 0; i < 3; i++) assert.equal(take('a', [3, 60]), true);
  assert.equal(take('a', [3, 60]), false);
  assert.equal(take('b', [3, 60]), true);
  t = 61000; assert.equal(take('a', [3, 60]), true);
});

test('customer validation requires a name and a contact, rejects bad email/phone and oversize text', () => {
  const ok = validateCustomer({ name: ' สมชาย ', email: 'a@b.co' });
  assert.equal(ok.name, 'สมชาย');
  assert.ok(validateCustomer({ name: 'A', phone: '081-234-5678' }));
  assert.equal(validateCustomer({ name: 'A' }), null);
  assert.equal(validateCustomer({ name: '', email: 'a@b.co' }), null);
  assert.equal(validateCustomer({ name: 'A', email: 'not-an-email' }), null);
  assert.equal(validateCustomer({ name: 'A', phone: 'abc' }), null);
  assert.equal(validateCustomer({ name: 'A'.repeat(161), email: 'a@b.co' }), null);
  assert.equal(validateCustomer({ name: 'A', email: 'a@b.co', note: 'x'.repeat(2001) }), null);
  assert.equal(validateCustomer(null), null);
  assert.equal(validateCustomer([]), null);
});

test('control characters are removed and non-strings rejected', () => {
  assert.equal(cleanText('a\u0000b\u001fc', 10), 'abc');
  assert.equal(cleanText(5, 10), null);
  assert.equal(cleanText({}, 10), null);
});

test('items: valid shape only, no duplicates, bounded quantity, client price is never read', () => {
  const ok = validateItems([{ kind: 'product', id, quantity: 2, price: 1 }], { max: 30, kinds: ['product', 'service'] });
  assert.deepEqual(ok, [{ kind: 'product', id, quantity: 2 }]);
  assert.equal('price' in ok[0], false);
  assert.equal(validateItems([], { max: 30, kinds: ['product'] }), null);
  assert.equal(validateItems([{ id, quantity: 0 }], { max: 30, kinds: ['product'] }), null);
  assert.equal(validateItems([{ id, quantity: 1.5 }], { max: 30, kinds: ['product'] }), null);
  assert.equal(validateItems([{ id, quantity: 101 }], { max: 20, kinds: ['product'] }), null);
  assert.equal(validateItems([{ id: 'x', quantity: 1 }], { max: 30, kinds: ['product'] }), null);
  assert.equal(validateItems([{ id, quantity: 1 }, { id, quantity: 1 }], { max: 30, kinds: ['product'] }), null);
  assert.equal(validateItems([{ kind: 'service', id, quantity: 1 }], { max: 30, kinds: ['product'] }), null);
  assert.equal(validateItems('x', { max: 30, kinds: ['product'] }), null);
});

test('totals use integer satang, reject discount above subtotal and absurd tax', () => {
  assert.deepEqual(computeTotals({ subtotalCents: 100000, discountCents: 10000, taxRateBp: 700 }), { subtotalCents: 100000, discountCents: 10000, taxRateBp: 700, taxCents: 6300, totalCents: 96300 });
  assert.equal(computeTotals({ subtotalCents: 1000 }).totalCents, 1000);
  assert.equal(computeTotals({ subtotalCents: 1000, discountCents: 1001 }), null);
  assert.equal(computeTotals({ subtotalCents: 1000, taxRateBp: 3001 }), null);
  assert.equal(computeTotals({ subtotalCents: -1 }), null);
  assert.equal(computeTotals({ subtotalCents: 10.5 }), null);
});

const b64 = bytes => Buffer.from(bytes).toString('base64');
const png = b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);
test('payment slip must match its real file signature and size', () => {
  assert.equal(validateSlip({ mime: 'image/png', data: png }).ext, 'png');
  assert.equal(validateSlip({ mime: 'image/jpeg', data: png }), null);
  assert.equal(validateSlip({ mime: 'text/html', data: png }), null);
  assert.equal(validateSlip({ mime: 'image/png', data: '<script>' }), null);
  assert.equal(validateSlip({ mime: 'image/png', data: b64(new Uint8Array(3 * 1024 * 1024 + 10).fill(65)) }), null);
  assert.equal(validateSlip({ mime: 'application/pdf', data: b64(Buffer.from('%PDF-1.4 hello world')) }).ext, 'pdf');
  assert.equal(validateSlip(null), null);
});

test('CSV export neutralises spreadsheet formulas and quotes special characters', () => {
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvCell('@x'), "'@x");
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell(null), '');
  assert.ok(toCsv(['a'], [['=1']]).includes("'=1"));
  assert.ok(toCsv(['a'], []).startsWith('﻿'));
});

test('date ranges must be real calendar dates in order and bounded', () => {
  assert.deepEqual(validDateRange('2026-01-01', '2026-12-31'), { from: '2026-01-01', to: '2026-12-31' });
  assert.equal(validDateRange('2026-02-30', '2026-03-01'), null);
  assert.equal(validDateRange('2026-05-02', '2026-05-01'), null);
  assert.equal(validDateRange('2000-01-01', '2026-01-01'), null);
  assert.equal(validDateRange("2026-01-01'; drop", '2026-01-02'), null);
});

test('a product cannot be sold or tried without a recorded test; unfinished ones stay in development', () => {
  const base = { slug: 'quoteflow-ai', nameTh: 'QuoteFlow AI', nameEn: 'QuoteFlow AI', status: 'in_development' };
  assert.ok(validateProduct(base));
  assert.equal(validateProduct({ ...base, status: 'available', priceCents: 100 }), null);
  assert.equal(validateProduct({ ...base, status: 'available', tested: true }), null);
  assert.ok(validateProduct({ ...base, status: 'available', tested: true, testNote: 'ผ่านการทดสอบ 2026-11-24', priceCents: 100 }));
  assert.equal(validateProduct({ ...base, slug: 'Bad Slug' }), null);
  assert.equal(validateProduct({ ...base, priceCents: -1 }), null);
  assert.equal(validateProduct({ ...base, priceCents: 1.2 }), null);
  assert.equal(validateProduct({ ...base, coverUrl: 'javascript:alert(1)' }), null);
  assert.equal(validateProduct({ ...base, trialUrl: 'http://insecure.example' }), null);
  assert.equal(validateProduct({ ...base, status: 'bogus' }), null);
});

test('services: validated, price optional', () => {
  assert.ok(validateService({ slug: 'custom-build', nameTh: 'พัฒนาระบบ', nameEn: 'Custom build' }));
  assert.equal(validateService({ slug: 'x y', nameTh: 'a', nameEn: 'b' }), null);
});

test('agents with data-write or finance permission always require approval; unknown permissions rejected', () => {
  assert.equal(validateAgent({ name: 'A', permissions: ['finance'], requiresApproval: false }).requires_approval, true);
  assert.equal(validateAgent({ name: 'A', permissions: ['data_write'], requiresApproval: false }).requires_approval, true);
  assert.equal(validateAgent({ name: 'A', permissions: ['read'], requiresApproval: false }).requires_approval, false);
  assert.equal(validateAgent({ name: 'A', permissions: ['read'] }).requires_approval, true);
  assert.equal(validateAgent({ name: 'A', permissions: ['root'] }), null);
  assert.equal(validateAgent({ name: '', permissions: [] }), null);
});

test('manual transactions cannot fake product income (only verified payments create it)', () => {
  assert.equal(validateTransaction({ kind: 'income', source: 'product', amountCents: 100 }), null);
  assert.ok(validateTransaction({ kind: 'income', source: 'service', amountCents: 100 }));
  assert.ok(validateTransaction({ kind: 'expense', source: 'other', amountCents: 100, note: 'ค่าโดเมน' }));
  assert.equal(validateTransaction({ kind: 'income', source: 'service', amountCents: 0 }), null);
  assert.equal(validateTransaction({ kind: 'income', source: 'service', amountCents: 1.5 }), null);
});

test('contact form requires all fields', () => {
  assert.ok(validateContact({ name: 'a', contact: 'a@b.co', message: 'hi' }));
  assert.equal(validateContact({ name: 'a', contact: '', message: 'hi' }), null);
  assert.equal(validateContact({ name: 'a', contact: 'ab', message: 'hi' }), null);
});

test('migration is additive: no drops, deletes or alters of existing tables; RLS on every cc_ table', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261124000100_command_center_platform.sql', import.meta.url), 'utf8');
  assert.ok(!/\bdrop\s+(table|schema|column|policy)/i.test(sql));
  assert.ok(!/\btruncate\b/i.test(sql));
  assert.ok(!/\bdelete\s+from\b/i.test(sql));
  assert.ok(!/alter\s+table\s+public\.(?!cc_)/i.test(sql.replace(/alter table public\.%I/g, '')));
  const created = [...sql.matchAll(/create table if not exists public\.(cc_\w+)/g)].map(m => m[1]);
  assert.ok(created.length >= 17);
  for (const t of created) assert.ok(sql.includes(`'${t}'`), `${t} must be listed for RLS and grants`);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public\.%I from public, anon, authenticated/);
  assert.match(sql, /constraint cc_payments_verified_needs_review/);
  assert.match(sql, /constraint cc_products_available_needs_test/);
});

test('seeded programs are in development with no invented price', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261124000100_command_center_platform.sql', import.meta.url), 'utf8');
  const seed = sql.slice(sql.indexOf('insert into public.cc_products'));
  for (const slug of ['quoteflow-ai', 'smokewatch-ai', 'ai-exam-generator', 'ai-embroidery-studio', 'spectral-scanner', 'ai-creator-commerce-hub']) assert.ok(seed.includes(`'${slug}'`));
  assert.ok(!/price_cents/.test(seed));
  assert.equal((seed.match(/'in_development'/g) || []).length, 6);
});

test('Edge Function authorises before any action and never trusts client identity or price', async () => {
  const src = await readFile(new URL('../supabase/functions/platform/index.ts', import.meta.url), 'utf8');
  assert.match(src, /Object\.hasOwn\(ACTIONS,action\)/);
  assert.ok(src.indexOf('lineIdentity(b)') < src.indexOf("switch(action)"));
  assert.ok(src.indexOf('roleAllows(role,action)') < src.indexOf("switch(action)"));
  assert.ok(!/b\.(lineUserId|userId|user_id)\b[^;]*actor\s*=/.test(src));
  assert.ok(!/b\.(price|priceCents|unitPrice)\b/.test(src.slice(src.indexOf("case 'quote_create'"), src.indexOf("case 'notifications_read'"))));
  assert.ok(!/\.from\(`/.test(src) && !/rpc\(`/.test(src), 'no dynamic SQL/table names');
  assert.ok(!/(sk_live|sk_test|whsec_|service_role)/.test(src));
  for (const action of Object.keys(ACTIONS)) assert.ok(src.includes(`case '${action}'`), `${action} must be handled`);
});
