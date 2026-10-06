// Explicit UI/API fixtures only: no production LINE login, reminder, charge,
// membership change, or Supabase credential is exercised by this verifier.
import assert from 'node:assert/strict';
import { newsroomConfig } from '../data/newsroom-config.js';
import { mkdir, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const { chromium } = await import(process.env.LIFEOS_PLAYWRIGHT_MODULE || '/opt/codex/runtimes/cua/lib/node_modules/playwright-core/index.mjs');
const base = process.env.LIFEOS_BROWSER_BASE || 'http://127.0.0.1:4175';
const api = 'https://bxaplhrunxiadjsdobyl.supabase.co/functions/v1';
const liffId = newsroomConfig.liffId;
const reminderId = '30000000-0000-4000-8000-000000000001';
const replacementId = '30000000-0000-4000-8000-000000000002';
const screenshotDir = process.env.LIFEOS_SCREENSHOT_DIR || '/tmp/chaylueklab-lifeos-qa';
await mkdir(screenshotDir, { recursive: true });
try {
  const response = await fetch(`${base}/index.html`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch { throw new Error(`Start the repository static server first: python3 -m http.server 4175 --bind 127.0.0.1 (expected ${base}/index.html)`); }

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const failures = [], passed = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const json = value => ({ contentType: 'application/json', body: JSON.stringify(value) });
// Chromium does not inherit the execution environment's network proxy. Retrieve
// the unchanged existing CDN compiler through curl, which does, then serve that
// actual source to the browser. LIFEOS_TAILWIND_SOURCE supports an offline cache.
const tailwindSource = process.env.LIFEOS_TAILWIND_SOURCE
  ? await readFile(process.env.LIFEOS_TAILWIND_SOURCE, 'utf8')
  : (await promisify(execFile)('curl', ['--fail','--silent','--show-error','--location','--max-time','20','https://cdn.tailwindcss.com/'], { maxBuffer: 2000000 })).stdout;
assert.ok(tailwindSource.length > 10000, 'Use the actual existing Tailwind compiler, not an empty CSS fixture');

function membership(state) {
  return { ok: true, checkoutReady: state.checkoutReady === true, mode: 'test', canManage: false,
    membership: { owner: false, active: state.membershipActive, status: state.membershipActive ? 'active' : 'trial_expired', periodEnd: null, cancelAtPeriodEnd: false },
    account: { usage: { tasks: 2, reminders: 1, finance: 0, notes: 1 } } };
}
function snoozeResult(state, body) {
  if (state.persisted.has(body.requestId)) return { ...state.persisted.get(body.requestId), replayed: true };
  const remindAt = body.remindAt || new Date(Date.now() + body.minutes * 60000).toISOString();
  const result = { ok: true, reminder: { ...state.reminder, id: replacementId, remind_at: remindAt, status: 'pending' }, replayed: false };
  state.persisted.set(body.requestId, result);
  return result;
}
async function waitState(condition, message) {
  for (let attempt = 0; attempt < 100; attempt++) { if (condition()) return; await sleep(50); }
  assert.fail(message);
}
async function withPage(options, task) {
  const context = await browser.newContext({ viewport: { width: options.width || 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', timezoneId: 'UTC' });
  const page = await context.newPage();
  const errors = [], fixtureErrors = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = { membershipActive: false, checkoutReady: false, requests: [], held: [], persisted: new Map(),
    reminder: { id: reminderId, title: 'ชื่อจริงจาก Cloud', remind_at: new Date(Date.now() + 3600000).toISOString(), status: 'sent', created_at: new Date().toISOString() }, ...options };
  const check = (condition, message) => { if (!condition) fixtureErrors.push(message); };
  await page.route('https://static.line-scdn.net/liff/**', route => route.fulfill({ contentType: 'application/javascript', body: `window.fixtureLiffInit=[];window.fixtureLoginCalls=0;window.fixtureMessages=[];window.liff={init:async({liffId})=>window.fixtureLiffInit.push(liffId),isLoggedIn:()=>true,isInClient:()=>true,getIDToken:()=>"fixture-lifeos-id-token",getAccessToken:()=>"fixture-lifeos-access-token",getProfile:async()=>({userId:"Uaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",displayName:"บัญชีทดสอบ"}),getContext:()=>({type:"utou"}),login:()=>window.fixtureLoginCalls++,sendMessages:async data=>window.fixtureMessages.push(data)};` }));
  await page.route('https://cdn.tailwindcss.com/**', route => route.fulfill({ contentType: 'application/javascript', body: tailwindSource }));
  await page.route(`${api}/**`, async route => {
    const endpoint = new URL(route.request().url()).pathname.split('/').at(-1);
    let body;
    try { body = route.request().postDataJSON(); } catch { body = {}; }
    state.requests.push({ endpoint, body });
    check(body.idToken === 'fixture-lifeos-id-token', 'API uses fixture LINE ID authentication only');
    check(body.accessToken === 'fixture-lifeos-access-token', 'API uses fixture LINE access authentication only');
    if (endpoint === 'billing') {
      if (body.action === 'status') {
        if (state.holdBilling) { state.held.push({ kind: 'billing', route, body }); return; }
        return route.fulfill(json(membership(state)));
      }
      if (body.action === 'checkout' && state.checkoutUrl) return route.fulfill(json({ ok: true, url: state.checkoutUrl }));
      return route.fulfill({ status: 503, ...json({ ok: false, error: 'billing_not_configured' }) });
    }
    if (endpoint === 'liff-dashboard') {
      if (body.action === 'list') return route.fulfill(json({ ok: true, reminders: [], tasks: [], finances: [] }));
      if (body.action === 'get_reminder') {
        check(body.id === reminderId, 'Snooze reads the server reminder ID');
        return route.fulfill(json({ ok: true, reminder: state.reminder, replacement: null,
          premium: state.membershipActive, canSnooze: state.canSnooze ?? state.membershipActive }));
      }
      if (body.action === 'snooze_reminder') {
        check(/^[a-f0-9-]{36}$/i.test(body.requestId), 'Snooze writes use a UUID idempotency key');
        check(body.id === reminderId, 'Snooze references the server-loaded reminder');
        check(body.title === undefined, 'URL/client titles are never submitted as reminder truth');
        if (state.failNextSnooze) { state.failNextSnooze = false; return route.abort('failed'); }
        if (state.holdSnooze) { state.held.push({ kind: 'snooze', route, body }); return; }
        return route.fulfill(json(snoozeResult(state, body)));
      }
      if (body.action === 'update_task') {
        check(body.id === reminderId && body.kind === 'reminder' && body.status === 'cancelled', 'Cancellation reaches the existing Cloud reminder');
        if (state.failCancel) return route.abort('failed');
        if (state.holdCancel) { state.held.push({ kind: 'cancel', route, body }); return; }
        return route.fulfill(json({ ok: true }));
      }
    }
    if (endpoint === 'life-tools') return route.fulfill(json({ ok: true, debts: [], weekly: null, debtTotals: { receivable: 0, payable: 0 } }));
    if (endpoint === 'recurring-tools') return state.membershipActive
      ? route.fulfill(json({ ok: true, rules: [] }))
      : route.fulfill({ status: 402, ...json({ ok: false, error: 'premium_required' }) });
    if (endpoint === 'liff-vault') return route.fulfill(json({ ok: true, files: [], notes: [] }));
    fixtureErrors.push(`Unexpected fixture API: ${endpoint}:${body.action}`);
    return route.fulfill({ status: 422, ...json({ ok: false, error: 'unexpected_fixture_action' }) });
  });
  try {
    await task(page, state);
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    assert.deepEqual(fixtureErrors, [], 'Only supported fixture API requests');
    assert.equal(await page.evaluate(() => window.fixtureMessages?.length || 0), 0, 'UI test never sends LINE messages');
  } finally {
    for (const held of state.held) { try { await held.route.abort('failed'); } catch {} }
    await context.close();
  }
}
async function test(name, task) {
  try { await task(); passed.push(name); console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, error }); console.error(`FAIL ${name}: ${error.stack}`); }
}
async function start(page, query = '') {
  await page.goto(`${base}/index.html${query}`);
  await page.waitForFunction(() => document.querySelector('#deskPlan')?.textContent === 'FREE' || document.querySelector('#deskPlan')?.textContent === 'PLUS');
}
async function startSnooze(page) {
  await start(page, `?view=snooze&id=${reminderId}&title=FORGED-URL-TITLE`);
  await page.locator('#snoozeBody h3').waitFor();
}
async function mobileCheck(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow'); }

try {
  await test('mobile 360/390 quota table and Plus 59 pricing preserve modules and legacy LIFF', async () => {
    for (const width of [360, 390]) await withPage({ width }, async (page, state) => {
      await start(page, '?view=membership');
      assert.deepEqual(await page.evaluate(() => window.fixtureLiffInit), [liffId]);
      const rows = await page.locator('#membershipPage table tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim())));
      assert.deepEqual(rows, [['สร้างงาน','10','200'],['ตั้งเตือน','3','30'],['บันทึกเงิน','30','500'],['โน้ต','10','200'],['อัปโหลดรวม','5 MB','100 MB'],['ต่อไฟล์','1 MB','10 MB']]);
      assert.match(await page.locator('#membershipPage').textContent(), /59\s*บาท/);
      assert.ok(await page.locator('a[href="./?view=control"]').count(), 'Control Center uses the registered LIFF entry route for the central Stock API');
      assert.ok(await page.locator('a[href$="newsroom.html"]').count(), 'Newsroom module remains linked');
      assert.ok(await page.locator('a[href$="ai-video.html"]').count(), 'Existing Studio module remains linked');
      await mobileCheck(page);
      await page.screenshot({ path: `${screenshotDir}/lifeos-membership-${width}.png`, fullPage: true });
      assert.equal(state.requests.some(request => request.endpoint !== 'billing' && request.body.action === 'checkout'), false);
    });
  });
  await test('checkoutReady false keeps checkout disabled after consent; payment success never grants Plus locally', async () => {
    await withPage({}, async (page, state) => {
      await start(page, '?view=membership&payment=success&active=true&plan=plus');
      assert.equal(await page.locator('#deskPlan').textContent(), 'FREE');
      assert.equal(await page.locator('#subscribeBtn').isDisabled(), true);
      await page.locator('#recurringConsent').check();
      assert.equal(await page.locator('#subscribeBtn').isDisabled(), true);
      assert.match(await page.locator('#billingNotice').textContent(), /รอยืนยัน/);
      assert.doesNotMatch(await page.locator('#memberState').textContent(), /สมาชิกใช้งานได้/);
      assert.equal(state.requests.some(request => request.endpoint === 'billing' && request.body.action === 'checkout'), false);
      state.membershipActive = true;
      await page.getByRole('button', { name: 'ตรวจสอบสถานะอีกครั้ง', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#deskPlan').textContent === 'PLUS');
      assert.match(await page.locator('#memberState').textContent(), /สมาชิกใช้งานได้/);
      assert.ok(state.requests.filter(request => request.endpoint === 'billing' && request.body.action === 'status').length >= 2);
    });
  });
  await test('membership remains unconfirmed until the status API responds', async () => {
    await withPage({ holdBilling: true }, async (page, state) => {
      await page.goto(`${base}/index.html?view=membership&payment=success`);
      await waitState(() => state.held.some(held => held.kind === 'billing'), 'Membership status request reached fixture');
      assert.notEqual(await page.locator('#deskPlan').textContent(), 'PLUS');
      assert.equal(await page.locator('#subscribeBtn').isDisabled(), true);
      const held = state.held.find(held => held.kind === 'billing');
      state.holdBilling = false;
      await held.route.fulfill(json(membership(state)));
      state.held = state.held.filter(item => item !== held);
      await page.waitForFunction(() => document.querySelector('#deskPlan').textContent === 'FREE');
    });
  });
  await test('ready checkout still requires explicit consent, sends it to the server, and rejects a wrong checkout host', async () => {
    await withPage({ checkoutReady: true, checkoutUrl: 'https://checkout.stripe.com.attacker.example/pay' }, async (page, state) => {
      await start(page, '?view=membership');
      assert.equal(await page.locator('#subscribeBtn').isDisabled(), false);
      await page.locator('#subscribeBtn').click();
      assert.match(await page.locator('#membershipError').textContent(), /ยืนยันการต่ออายุ/);
      assert.equal(state.requests.some(request => request.endpoint === 'billing' && request.body.action === 'checkout'), false);
      await page.locator('#recurringConsent').check();
      await page.locator('#subscribeBtn').click();
      await page.waitForFunction(() => document.querySelector('#membershipError').textContent.includes('ลิงก์ชำระเงินไม่ถูกต้อง'));
      const checkout = state.requests.find(request => request.endpoint === 'billing' && request.body.action === 'checkout');
      assert.equal(checkout.body.recurringConsent, true, 'Explicit consent reaches the existing billing endpoint');
      assert.equal(new URL(page.url()).origin, new URL(base).origin, 'Wrong host does not navigate anywhere');
      assert.equal(await page.locator('#deskPlan').textContent(), 'FREE', 'Requesting checkout never grants Plus');
    });
  });
  await test('Snooze loads Cloud title, escapes content, and uses 10/30/60 minute API writes', async () => {
    for (const minutes of [10, 30, 60]) await withPage({ membershipActive: true,
      reminder: { id: reminderId, title: '<img src=x onerror=alert(1)> ชื่อ Cloud', remind_at: '2030-01-01T02:00:00Z', status: 'sent' } }, async (page, state) => {
      await startSnooze(page);
      assert.match(await page.locator('#snoozeBody h3').textContent(), /<img src=x onerror=alert\(1\)>/);
      assert.equal(await page.locator('#snoozeBody img').count(), 0);
      assert.doesNotMatch(await page.locator('#snoozeBody').textContent(), /FORGED-URL-TITLE/);
      await page.getByRole('button', { name: `${minutes} นาที`, exact: true }).click();
      await page.locator('#snoozeSave').click();
      await page.getByRole('heading', { name: 'บันทึกเวลาใหม่แล้ว ✓', exact: true }).waitFor();
      const write = state.requests.find(request => request.body.action === 'snooze_reminder').body;
      assert.equal(write.minutes, minutes);
      assert.equal(write.remindAt, undefined);
      await mobileCheck(page);
    });
  });
  await test('custom Snooze uses explicit Thailand UTC+7 ISO independently of browser timezone', async () => {
    await withPage({ membershipActive: true }, async (page, state) => {
      await startSnooze(page);
      await page.locator('#snoozeCustom').fill('2035-02-03T09:20');
      await page.locator('#snoozeCustom').dispatchEvent('change');
      await page.locator('#snoozeSave').click();
      await page.getByRole('heading', { name: 'บันทึกเวลาใหม่แล้ว ✓', exact: true }).waitFor();
      const write = state.requests.find(request => request.body.action === 'snooze_reminder').body;
      assert.equal(write.remindAt, '2035-02-03T02:20:00.000Z');
      assert.equal(write.minutes, undefined);
    });
  });
  await test('failed Snooze retry preserves UUID and success waits for Cloud confirmation', async () => {
    await withPage({ membershipActive: true, failNextSnooze: true }, async (page, state) => {
      await startSnooze(page);
      await page.locator('#snoozeSave').click();
      await page.waitForFunction(() => document.querySelector('#snoozeResult')?.textContent.includes('Cloud ไม่สำเร็จ'));
      const first = state.requests.find(request => request.body.action === 'snooze_reminder').body;
      assert.equal(await page.getByRole('heading', { name: 'บันทึกเวลาใหม่แล้ว ✓', exact: true }).count(), 0);
      state.holdSnooze = true;
      await page.locator('#snoozeSave').click();
      await waitState(() => state.held.some(held => held.kind === 'snooze'), 'Retry reaches fixture');
      const held = state.held.find(held => held.kind === 'snooze');
      assert.equal(held.body.requestId, first.requestId);
      assert.equal(await page.locator('#snoozeSave').isDisabled(), true);
      assert.equal(await page.getByRole('heading', { name: 'บันทึกเวลาใหม่แล้ว ✓', exact: true }).count(), 0);
      await held.route.fulfill(json(snoozeResult(state, held.body)));
      state.held = state.held.filter(item => item !== held);
      await page.getByRole('heading', { name: 'บันทึกเวลาใหม่แล้ว ✓', exact: true }).waitFor();
      assert.equal(state.requests.filter(request => request.body.action === 'snooze_reminder').length, 2);
    });
  });
  await test('cancel requires successful Cloud update; network failure never reports cancellation', async () => {
    await withPage({ membershipActive: true, failCancel: true }, async (page, state) => {
      page.on('dialog', dialog => dialog.accept());
      await startSnooze(page);
      await page.locator('#snoozeCancel').click();
      await page.waitForFunction(() => document.querySelector('#snoozeResult')?.textContent.includes('Cloud ไม่สำเร็จ'));
      assert.doesNotMatch(await page.locator('#snoozeBody').textContent(), /ยกเลิกการเตือนแล้ว ✓/);
      state.failCancel = false; state.holdCancel = true;
      await page.locator('#snoozeCancel').click();
      await waitState(() => state.held.some(held => held.kind === 'cancel'), 'Cancellation reaches fixture');
      assert.doesNotMatch(await page.locator('#snoozeBody').textContent(), /ยกเลิกการเตือนแล้ว ✓/);
      const held = state.held.find(held => held.kind === 'cancel');
      await held.route.fulfill(json({ ok: true }));
      state.held = state.held.filter(item => item !== held);
      await page.waitForFunction(() => document.querySelector('#snoozeBody').textContent.includes('ยกเลิกการเตือนแล้ว ✓'));
    });
  });
  await test('Free Snooze and recurring tools show Plus guidance without issuing premium writes', async () => {
    await withPage({}, async (page, state) => {
      await startSnooze(page);
      assert.equal(await page.locator('#snoozeSave').count(), 0);
      assert.match(await page.locator('#snoozeBody').textContent(), /Plus 59 บาท/);
      await page.getByRole('button', { name: 'ดูสิทธิ์สมาชิก', exact: true }).click();
      assert.equal(await page.locator('#membershipPage').isVisible(), true);
      await page.locator('#membershipPage').getByRole('button', { name: '← กลับหน้าหลัก', exact: true }).click();
      await page.getByRole('button', { name: '＋ ตั้งเตือนประจำ', exact: true }).click();
      assert.equal(await page.locator('#lifeDialog').isVisible(), false);
      assert.equal(await page.locator('#membershipPage').isVisible(), true);
      assert.equal(state.requests.some(request => request.body.action === 'snooze_reminder' || request.body.action === 'create'), false);
    });
  });
  await test('mobile Snooze and home respect reduced motion with no horizontal overflow', async () => {
    for (const width of [360, 390]) await withPage({ width, membershipActive: true }, async page => {
      await startSnooze(page);
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      assert.equal(await page.locator('.snooze-clock').evaluate(node => getComputedStyle(node).animationName), 'none');
      await mobileCheck(page);
      await page.screenshot({ path: `${screenshotDir}/lifeos-snooze-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'ปิดหน้าต่าง', exact: true }).click();
      await mobileCheck(page);
      await page.screenshot({ path: `${screenshotDir}/lifeos-home-${width}.png`, fullPage: true });
    });
  });
  await test('notes redirects to the existing legacy LIFF vault without provisioning an account', async () => {
    await withPage({}, async page => {
      await page.route('https://liff.line.me/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Explicit redirect fixture</title><p>Local UI redirect test only</p>' }));
      await page.goto(`${base}/notes.html`);
      await page.waitForURL(`https://liff.line.me/${liffId}?view=vault`);
      assert.equal(page.url(), `https://liff.line.me/${liffId}?view=vault`);
    });
  });
} finally { await browser.close(); }
console.log(`Life OS premium UI fixtures: ${passed.length} passed, ${failures.length} failed. Production credentials, payments, and LINE reminders not exercised.`);
if (failures.length) process.exitCode = 1;
