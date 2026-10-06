// Browser checks use explicit local fixtures. No production LINE identity, stock,
// credentials, sale, or Supabase deployment is exercised by this script.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';

const playwrightModule = process.env.STOCK_PLAYWRIGHT_MODULE || '/opt/codex/runtimes/cua/lib/node_modules/playwright-core/index.mjs';
const { chromium } = await import(playwrightModule);
const base = process.env.STOCK_BROWSER_BASE || 'http://127.0.0.1:4175';
const api = 'https://yobymeygbfiwlngmwjcn.supabase.co/functions/v1/stock';
const screenshotDir = process.env.STOCK_SCREENSHOT_DIR || '/tmp/chaylueklab-stock-qa';
await mkdir(screenshotDir, { recursive: true });
const ownerId = `U${'a'.repeat(32)}`;
const staffId = `U${'b'.repeat(32)}`;
const fixtureIds = [1, 2, 3, 4].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const productId = '10000000-0000-4000-8000-000000000001';
const variantFixture = () => [
  { id: fixtureIds[0], product_id: productId, product_name: 'เสื้อทดสอบ', sku: 'FIX-NAVY-XL', color: 'กรม', size: 'XL', stock_quantity: 12, low_stock_threshold: 3, revision: 1 },
  { id: fixtureIds[1], product_id: productId, product_name: 'เสื้อทดสอบ', sku: 'FIX-NAVY-3XL', color: 'กรม', size: '3XL', stock_quantity: 5, low_stock_threshold: 3, revision: 1 },
  { id: fixtureIds[2], product_id: productId, product_name: 'เสื้อทดสอบ', sku: 'FIX-BLACK-M', color: 'ดำ', size: 'M', stock_quantity: 0, low_stock_threshold: 3, revision: 1 },
  { id: fixtureIds[3], product_id: productId, product_name: 'เสื้อทดสอบ', sku: 'FIX-GREY-L', color: 'เทา', size: 'L', stock_quantity: 2, low_stock_threshold: 3, revision: 1 },
];
const json = value => ({ contentType: 'application/json', body: JSON.stringify(value) });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  const response = await fetch(`${base}/stock.html`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch {
  throw new Error(`Start a static server in the repository first: python3 -m http.server 4175 --bind 127.0.0.1 (expected ${base}/stock.html)`);
}
const fixtureTransaction = (variant, overrides = {}) => ({
  id: '20000000-0000-4000-8000-000000000001', type: 'OUT', quantity: 2,
  before_quantity: 12, after_quantity: 10, sales_channel: 'STORE', order_reference: null,
  customer_name: null, note: null, line_user_id: ownerId, display_name: 'เจ้าของทดสอบ',
  product_name: variant.product_name, color: variant.color, size: variant.size, sku: variant.sku,
  created_at: new Date().toISOString(), ...overrides,
});
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const failures = [];
const completed = [];

async function withPage(options, task) {
  const context = await browser.newContext({ viewport: { width: options.width || 390, height: 844 }, isMobile: options.mobile !== false, hasTouch: options.mobile !== false, reducedMotion: options.reducedMotion || 'reduce' });
  const page = await context.newPage();
  const localEndpoint = `${base}${options.pathPrefix || ''}/`;
  const errors = [];
  const fixtureErrors = [];
  const fixtureCheck = (condition, message) => { if (!condition) fixtureErrors.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  const state = { role: options.role || 'OWNER', loggedIn: options.loggedIn !== false,
    variants: variantFixture(), requests: [], transactions: [], persisted: new Map(),
    transactionDelay: 0, authoritativeRemaining: undefined, failNextTransaction: false,
    blockStatus: false, watches: [], snapshots: 0, history: [],
    members: [{ line_user_id: ownerId, display_name: 'เจ้าของทดสอบ', role: 'OWNER', status: 'ACTIVE' },
      { line_user_id: staffId, display_name: 'พนักงานรออนุมัติ', role: 'STAFF', status: 'PENDING' }], ...options };
  if (options.pathPrefix) await page.route(`${base}${options.pathPrefix}/**`, async route => {
    const url = route.request().url().replace(`${base}${options.pathPrefix}/`, `${base}/`);
    const upstream = await route.fetch({ url });
    await route.fulfill({ response: upstream });
  });
  await page.route('**/data/newsroom-config.js', async route => {
    const url = options.pathPrefix ? route.request().url().replace(`${base}${options.pathPrefix}/`, `${base}/`) : route.request().url();
    const upstream = await route.fetch({ url });
    // The app must reject an unexpected LIFF callback origin in production.
    // Only this intercepted local fixture module permits localhost for UI tests.
    const source = (await upstream.text()).replace(/liffEndpointUrl:\s*(['"])[^'"]*\1/, `liffEndpointUrl: '${localEndpoint}'`);
    await route.fulfill({ response: upstream, body: source });
  });
  await page.route('https://static.line-scdn.net/liff/**', route => route.fulfill({
    contentType: 'application/javascript', body: `window.fixtureLiffInit=[];window.fixtureLoginCount=0;window.liff={init:async({liffId})=>window.fixtureLiffInit.push(liffId),isLoggedIn:()=>${state.loggedIn},getIDToken:()=>"fixture-id-token",getAccessToken:()=>"fixture-access-token",getProfile:async()=>({userId:"${ownerId}",displayName:"เจ้าของทดสอบ"}),login:()=>window.fixtureLoginCount++,isInClient:()=>true};`,
  }));
  await page.route(`${api}**`, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    let input;
    try { input = request.postDataJSON(); } catch { input = null; }
    if (!input) input = Object.fromEntries(new URL(request.url()).searchParams.entries());
    const action = input.action;
    state.requests.push({ action, input, headers: request.headers() });
    if (state.loggedIn) {
      fixtureCheck(request.headers()['x-line-id-token'] === 'fixture-id-token', 'LINE ID token stays request authentication only');
      fixtureCheck(request.headers()['x-line-access-token'] === 'fixture-access-token', 'LINE access token is required by the stock contract');
    }
    if (action === 'snapshot') {
      state.snapshots++;
      const active = ['OWNER', 'STAFF'].includes(state.role);
      const variants = active || state.leakInventory ? state.variants : [];
      return route.fulfill(json({ shop: { id: productId, name: 'ร้านทดสอบ', default_threshold: 3 },
        user: { line_user_id: ownerId, display_name: 'เจ้าของทดสอบ', role: state.role }, variants,
        summary: { sold_today: active ? 4 : 0, total_stock: variants.reduce((sum, variant) => sum + variant.stock_quantity, 0),
          low_stock_count: variants.filter(variant => variant.stock_quantity > 0 && variant.stock_quantity <= variant.low_stock_threshold).length,
          out_of_stock_count: variants.filter(variant => variant.stock_quantity === 0).length,
          channels: active ? [{ sales_channel: 'STORE', quantity: 3 }, { sales_channel: 'LINE', quantity: 1 }] : [] } }));
    }
    if (action === 'history') {
      fixtureCheck([1, 7, 30].includes(Number(input.days)), 'History sends allowed day filter');
      const history = state.history.length ? state.history : state.transactions;
      return route.fulfill(json({ transactions: history.filter(item => !input.sales_channel || item.sales_channel === input.sales_channel), truncated: state.historyTruncated === true }));
    }
    if (action === 'transaction') {
      if (!['OWNER', 'STAFF'].includes(state.role) || (input.type === 'ADJUST' && state.role !== 'OWNER')) return route.fulfill({ status: 403, ...json({ error: 'stock_access_required' }) });
      fixtureCheck(/^[a-f0-9-]{36}$/i.test(input.request_id), 'Mutations have idempotency keys');
      if (state.transactionDelay) await sleep(state.transactionDelay);
      if (state.failNextTransaction) { state.failNextTransaction = false; return route.abort('failed'); }
      if (state.persisted.has(input.request_id)) return route.fulfill(json({ ...state.persisted.get(input.request_id), replayed: true }));
      const variant = state.variants.find(item => item.id === input.variant_id);
      if (!variant) { fixtureCheck(false, 'Transaction references persisted variant'); return route.fulfill({ status: 422, ...json({ error: 'invalid_request' }) }); }
      const before = variant.stock_quantity;
      if (input.type === 'OUT' && input.quantity > before) return route.fulfill({ status: 409, ...json({ error: 'insufficient_stock' }) });
      const remaining = state.authoritativeRemaining ?? (input.type === 'OUT' ? before - input.quantity : input.type === 'IN' ? before + input.quantity : input.stock_quantity);
      const next = { ...variant, stock_quantity: remaining, revision: variant.revision + 1 };
      state.variants = state.variants.map(item => item.id === next.id ? next : item);
      const transaction = fixtureTransaction(variant, { type: input.type, quantity: input.quantity ?? Math.abs(remaining - before), before_quantity: before,
        after_quantity: remaining, sales_channel: input.sales_channel ?? null, order_reference: input.order_reference ?? null,
        customer_name: input.customer_name ?? null, note: input.note ?? null });
      state.transactions.push(transaction);
      const result = { transaction, variant: next, replayed: false };
      state.persisted.set(input.request_id, result);
      return route.fulfill(json(result));
    }
    if (action === 'request_status') {
      if (state.blockStatus) return route.abort('failed');
      if (state.revokeAfterRecovery) state.role = 'NONE';
      return route.fulfill(json({ found: state.persisted.has(input.request_id), ...(state.persisted.has(input.request_id) ? { result: state.persisted.get(input.request_id) } : {}) }));
    }
    if (action === 'watch') { state.watches.push(route); return; }
    if (action === 'members') return route.fulfill(json({ members: state.members }));
    if (action === 'member_update') {
      fixtureCheck(state.role === 'OWNER' && input.role === 'STAFF', 'Only owner can grant a staff role');
      const member = state.members.find(member => member.line_user_id === input.member_line_user_id);
      if (!member || member.role === 'OWNER') return route.fulfill({ status: 403, ...json({ error: 'permission_denied' }) });
      member.status = input.status;
      return route.fulfill(json({ user: member }));
    }
    if (action === 'product_create') {
      fixtureCheck(state.role === 'OWNER', 'Only owner can create catalog variants');
      const variant = { id: '00000000-0000-4000-8000-000000000006', product_id: productId,
        product_name: input.name, sku: input.sku, color: input.color, size: input.size,
        stock_quantity: input.initial_quantity ?? 0, low_stock_threshold: input.threshold ?? 3, revision: 1 };
      state.variants.push(variant);
      const transaction = variant.stock_quantity ? fixtureTransaction(variant, { type: 'IN', quantity: variant.stock_quantity, before_quantity: 0, after_quantity: variant.stock_quantity, sales_channel: null }) : null;
      const result = { variant, transaction, replayed: false };
      state.persisted.set(input.request_id, result);
      return route.fulfill(json(result));
    }
    if (action === 'join') { state.role = 'PENDING'; return route.fulfill(json({ user: { line_user_id: ownerId, display_name: 'เจ้าของทดสอบ', role: 'PENDING' } })); }
    return route.fulfill({ status: 422, ...json({ error: `unexpected_fixture_action:${action}` }) });
  });
  try {
    await task(page, state);
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    assert.deepEqual(fixtureErrors, [], 'Client requests follow server contract');
  } finally {
    for (const watch of state.watches) { try { await watch.fulfill({ contentType: 'text/event-stream', body: 'event: connected\ndata: {}\n\n' }); } catch {} }
    await context.close();
  }
}
async function test(name, task) {
  try { await task(); completed.push(name); console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, error }); console.error(`FAIL ${name}: ${error.stack}`); }
}
async function start(page) { await page.goto(`${base}/stock.html`); await page.locator('#screenHome').waitFor({ state: 'visible' }); }
async function screen(page, name) { await page.locator(`[data-screen="${name}"]:visible`).last().click(); }
async function chooseChannel(page, channel) {
  const choice = page.locator(`[data-channel="${channel}"]`);
  if (await choice.getAttribute('aria-pressed') === 'true') return;
  if (!await choice.isVisible()) await page.locator('#changeChannel').click();
  await choice.click();
}
async function openProductSizes(page, color = 'กรม', container = 'sellProducts') {
  await page.locator(`#${container} [data-product-group]`).filter({ hasText: `สี ${color}` }).first().click();
  await page.locator('#stockSheet').waitFor({ state: 'visible' });
}
async function openSale(page, id = fixtureIds[0]) {
  await screen(page, 'sell');
  await chooseChannel(page, 'STORE');
  await openProductSizes(page);
  await page.locator(`#stockSheet [data-variant-id="${id}"]`).click();
  await page.locator('#saleQuantity').waitFor({ state: 'visible' });
}
async function mobileChecks(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
  const tooSmall = await page.locator('button:visible,input:visible,select:visible,textarea:visible,summary:visible').evaluateAll(buttons => buttons.filter(button => {
    const rect = button.getBoundingClientRect();
    return rect.width < 43 || rect.height < 43;
  }).map(button => ({ id: button.id, text: button.textContent.trim(), width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
  assert.deepEqual(tooSmall, [], 'Visible interactive touch targets are at least 44 CSS pixels (allow 1px rounding)');
}

try {
  await test('mobile 320/360/390/412 dashboard, STORE fast path, zero-stock guard, and optional online fields', async () => {
    const mixedZero = { ...variantFixture()[0], id: '00000000-0000-4000-8000-000000000005', sku: 'FIX-NAVY-S', size: 'S', stock_quantity: 0 };
    for (const width of [320, 360, 390, 412]) await withPage({ width, variants: [...variantFixture(), mixedZero] }, async (page, state) => {
      await start(page);
      await mobileChecks(page);
      await page.screenshot({ path: `${screenshotDir}/stock-home-${width}.png`, fullPage: true });
      assert.match(await page.locator('#metricTotalStock').textContent(), /19/);
      assert.match(await page.locator('#metricLowStock').textContent(), /1/);
      assert.match(await page.locator('#metricOutStock').textContent(), /2/);
      await screen(page, 'sell');
      await chooseChannel(page, 'STORE');
      assert.equal(await page.locator('[data-channel="STORE"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#sellProducts [data-product-group]').filter({ hasText: 'สี ดำ' }).first().isDisabled(), true, 'Zero-stock product cannot be sold');
      await openProductSizes(page);
      assert.equal(await page.locator(`#stockSheet [data-variant-id="${mixedZero.id}"]`).isDisabled(), true, 'Zero-stock size in a stocked product is disabled');
      await page.locator(`#stockSheet [data-variant-id="${fixtureIds[0]}"]`).click();
      assert.equal(await page.locator('#orderReference').count(), 0, 'STORE fast path needs no online fields');
      await page.locator('#sheetClose').click();
      await chooseChannel(page, 'LINE');
      await openProductSizes(page);
      await page.locator(`#stockSheet [data-variant-id="${fixtureIds[0]}"]`).click();
      await page.locator('#stockSheet details').evaluate(details => { details.open = true; });
      for (const id of ['orderReference', 'customerName', 'transactionNote']) {
        assert.equal(await page.locator(`#${id}`).isVisible(), true);
        assert.equal(await page.locator(`#${id}`).getAttribute('required'), null, 'Online metadata stays optional');
      }
      await mobileChecks(page);
      await page.screenshot({ path: `${screenshotDir}/stock-sale-${width}.png`, fullPage: true });
      assert.equal(state.requests.filter(request => request.action === 'transaction').length, 0);
    });
  });
  await test('search กรม XL and 3XL finds persisted variants without price guesses', async () => {
    await withPage({}, async page => {
      await start(page); await screen(page, 'sell');
      await chooseChannel(page, 'STORE');
      await page.locator('#stockSearch').fill('กรม XL');
      assert.ok(await page.locator(`#sellProducts [data-testid="quick-variant"][data-variant-id="${fixtureIds[0]}"]:visible`).count(), 'Compound Thai color and size search finds XL');
      assert.equal(await page.locator(`#sellProducts [data-variant-id="${fixtureIds[1]}"]:visible`).count(), 0, 'XL search excludes 3XL');
      await page.locator(`#sellProducts [data-variant-id="${fixtureIds[0]}"]`).click();
      await page.locator('#saleQuantity').waitFor({ state: 'visible' });
      assert.match(await page.locator('#sheetBody').textContent(), /ไซซ์ XL/);
      await page.locator('#sheetClose').click();
      await page.locator('#stockSearch').fill('3XL');
      assert.ok(await page.locator(`#sellProducts [data-variant-id="${fixtureIds[1]}"]:visible`).count(), '3XL is searchable');
      assert.equal(await page.locator(`#sellProducts [data-variant-id="${fixtureIds[0]}"]:visible`).count(), 0);
      await page.locator(`#sellProducts [data-variant-id="${fixtureIds[1]}"]`).click();
      await page.locator('#saleQuantity').waitFor({ state: 'visible' });
      assert.match(await page.locator('#sheetBody').textContent(), /ไซซ์ 3XL/);
      assert.doesNotMatch(await page.locator('body').textContent(), /฿\s*\d|\d+\s*บาท/);
      await mobileChecks(page);
    });
  });
  await test('STORE default-one sale completes in four taps from the dashboard', async () => {
    await withPage({}, async (page, state) => {
      await start(page);
      await page.locator('[data-testid="action-sell"]').click();
      await page.locator('[data-testid="channel-store"]').click();
      await page.locator(`#sellProducts [data-testid="quick-variant"][data-variant-id="${fixtureIds[0]}"]`).click();
      assert.equal(await page.locator('#saleQuantity').inputValue(), '1');
      assert.equal(await page.locator('#orderReference').count(), 0);
      await page.locator('#confirmSale').click();
      await page.locator('#saleSuccess').waitFor({ state: 'visible' });
      assert.equal(state.transactions.length, 1);
      assert.equal(state.transactions[0].quantity, 1);
      assert.equal(state.transactions[0].sales_channel, 'STORE');
      assert.match(await page.locator('#remainingStock').textContent(), /11/);
    });
  });
  await test('Control Center and existing Stock routes share one balance across STORE and LINE sales', async () => {
    await withPage({}, async (page, state) => {
      const apiRequests = [];
      page.on('request', request => { if (request.url().includes('.supabase.co/functions/')) apiRequests.push(request.url()); });
      await page.goto(`${base}/control.html`);
      await page.locator('#screenHome').waitFor({ state: 'visible' });
      const fontLoaded = await page.evaluate(async () => {
        const faces = await document.fonts.load('16px ControlThai', 'ระบบหลังร้าน');
        return faces.length > 0 && faces.every(face => face.status === 'loaded');
      });
      assert.equal(fontLoaded, true, 'The supplied licensed Thai font decodes and loads locally');
      await mobileChecks(page);
      await page.screenshot({ path: `${screenshotDir}/control-home-390.png`, fullPage: true });
      await openSale(page);
      await page.locator('#saleQuantity').fill('2');
      await page.locator('#confirmSale').click();
      await page.locator('#saleSuccess').waitFor({ state: 'visible' });
      assert.match(await page.locator('#remainingStock').textContent(), /10/);
      await start(page);
      assert.equal(state.variants[0].stock_quantity, 10);
      await screen(page, 'sell');
      await chooseChannel(page, 'LINE');
      await openProductSizes(page);
      await page.locator(`#stockSheet [data-variant-id="${fixtureIds[0]}"]`).click();
      await page.locator('#confirmSale').click();
      await page.locator('#saleSuccess').waitFor({ state: 'visible' });
      assert.match(await page.locator('#remainingStock').textContent(), /9/);
      assert.deepEqual(state.transactions.map(row => row.sales_channel), ['STORE', 'LINE']);
      assert.equal(state.variants[0].stock_quantity, 9);
      assert.ok(apiRequests.length > 0);
      assert.ok(apiRequests.every(url => url === api), 'Both routes must use the canonical Stock API, never an independent retail ledger');
    });
  });
  await test('sale preview and authoritative remaining differ correctly; double click submits once', async () => {
    await withPage({ authoritativeRemaining: 8, transactionDelay: 300 }, async (page, state) => {
      await start(page); await openSale(page);
      assert.match(await page.locator('#stockNow').textContent(), /12/);
      await page.locator('#saleQuantity').fill('2');
      assert.match(await page.locator('#stockAfter').textContent(), /10/);
      await page.locator('#confirmSale').evaluate(button => { button.click(); button.click(); });
      await page.locator('#saleSuccess').waitFor({ state: 'visible' });
      assert.match(await page.locator('#remainingStock').textContent(), /8/, 'Success uses authoritative server remaining, never preview');
      assert.equal(state.requests.filter(request => request.action === 'transaction').length, 1, 'Double click sends one mutation');
      assert.equal(state.transactions[0].sales_channel, 'STORE');
      await mobileChecks(page);
    });
  });
  await test('staff receive stock without a sales channel; before and after are server-confirmed', async () => {
    await withPage({ role: 'STAFF' }, async (page, state) => {
      await start(page); await screen(page, 'receive');
      await openProductSizes(page, 'กรม', 'receiveProducts');
      await page.locator(`#stockSheet [data-variant-id="${fixtureIds[0]}"]`).click();
      await page.locator('#saleQuantity').fill('3');
      assert.match(await page.locator('#stockNow').textContent(), /12/);
      assert.match(await page.locator('#stockAfter').textContent(), /15/);
      await page.locator('#confirmSale').click();
      await page.locator('#saleSuccess').waitFor({ state: 'visible' });
      assert.match(await page.locator('#remainingStock').textContent(), /15/);
      const mutation = state.requests.find(request => request.action === 'transaction');
      assert.equal(mutation.input.type, 'IN');
      assert.equal(mutation.input.sales_channel, undefined);
      assert.equal(state.transactions[0].before_quantity, 12);
      assert.equal(state.transactions[0].after_quantity, 15);
      await mobileChecks(page);
    });
  });
  await test('pending/nonmember sessions do not render inventory; logged-out browser sends no inventory requests', async () => {
    for (const role of ['PENDING', 'NONE']) await withPage({ role, leakInventory: true }, async (page, state) => {
      await page.goto(`${base}/stock.html`);
      await page.waitForFunction(() => document.body.textContent.includes('อนุมัติ') || document.body.textContent.includes('เข้าร่วม'));
      assert.equal(await page.locator('[data-variant-id]').count(), 0);
      assert.doesNotMatch(await page.locator('body').textContent(), /FIX-NAVY|เสื้อทดสอบ|รวม.*19/);
      assert.equal(state.requests.some(request => ['transaction', 'history', 'watch'].includes(request.action)), false);
    });
    await withPage({ loggedIn: false }, async (page, state) => {
      await page.goto(`${base}/stock.html`);
      await page.waitForFunction(() => window.fixtureLiffInit?.length === 1);
      assert.equal(state.requests.length, 0);
      assert.equal(await page.locator('[data-variant-id]').count(), 0);
    });
  });
  await test('history filters preserve actor and order references; untrusted text remains inert', async () => {
    const history = [fixtureTransaction(variantFixture()[0], { display_name: '<img src=x onerror=alert(1)>', order_reference: 'FIX-ORDER-99', sales_channel: 'LINE' }), fixtureTransaction(variantFixture()[1], { id: '20000000-0000-4000-8000-000000000002', display_name: 'พนักงานทดสอบ', sales_channel: 'STORE' })];
    await withPage({ history, historyTruncated: true }, async (page, state) => {
      await start(page); await screen(page, 'history');
      await page.locator('#historyList').getByText('FIX-ORDER-99', { exact: false }).waitFor();
      assert.match(await page.locator('#historyList').textContent(), /<img src=x onerror=alert\(1\)>/);
      assert.equal(await page.locator('#historyList img').count(), 0);
      assert.match(await page.locator('#historyList').textContent(), /แสดง 500 รายการล่าสุด/, 'Capped history is clearly labelled');
      await page.locator('[data-days="7"]').click();
      await page.locator('#historyChannel').selectOption('LINE');
      await page.waitForFunction(() => !document.querySelector('#historyList').textContent.includes('พนักงานทดสอบ'));
      assert.ok(state.requests.some(request => request.action === 'history' && Number(request.input.days) === 7 && request.input.sales_channel === 'LINE'));
      await page.locator('[data-days="30"]').click();
      await mobileChecks(page);
    });
  });
  await test('staff cannot open owner adjustment controls', async () => {
    await withPage({ role: 'STAFF' }, async page => {
      await start(page); await screen(page, 'check');
      assert.equal(await page.locator('#addVariantButton').isVisible(), false);
      assert.equal(await page.locator('#teamButton').isVisible(), false);
      await page.locator(`#checkList [data-variant-id="${fixtureIds[0]}"]`).click();
      assert.equal(await page.getByRole('button', { name: 'ปรับเป็นยอดนับจริง', exact: true }).count(), 0);
      assert.equal(await page.locator('#confirmAdjust:visible').count(), 0);
      await mobileChecks(page);
    });
  });
  await test('network failure and reload preserve the request ID for safe retry', async () => {
    await withPage({ failNextTransaction: true, blockStatus: true }, async (page, state) => {
      await start(page); await openSale(page);
      await page.locator('#saleQuantity').fill('2');
      await page.locator('#confirmSale').click();
      await page.locator('#stockRetryPending').waitFor({ state: 'visible' });
      const original = state.requests.find(request => request.action === 'transaction').input.request_id;
      assert.equal(state.transactions.length, 0, 'Failed request has not changed fixture stock');
      const stored = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(sessionStorage))));
      assert.ok(stored.includes(original), 'Pending request survives reload in this session');
      assert.doesNotMatch(stored, /fixture-id-token|fixture-access-token/, 'LINE tokens never enter pending storage');
      state.blockStatus = false;
      await page.reload();
      await page.locator('#stockRetryPending').waitFor({ state: 'visible' });
      await page.locator('#stockRetryPending').click();
      await page.locator('#saleSuccess').waitFor({ state: 'visible' });
      const mutations = state.requests.filter(request => request.action === 'transaction');
      assert.equal(mutations.length, 2);
      assert.equal(mutations[1].input.request_id, original, 'Retry reuses the original idempotency key');
      assert.equal(state.transactions.length, 1, 'Only one recorded stock change');
      assert.match(await page.locator('#remainingStock').textContent(), /10/);
    });
  });
  await test('revoked access during pending recovery cannot redisplay private inventory or success', async () => {
    await withPage({ role: 'STAFF', failNextTransaction: true, blockStatus: true }, async (page, state) => {
      await start(page); await openSale(page);
      await page.locator('#confirmSale').click();
      await page.locator('#stockRetryPending').waitFor({ state: 'visible' });
      const requestId = state.requests.find(request => request.action === 'transaction').input.request_id;
      const variant = { ...state.variants[0], stock_quantity: 11, revision: 2 };
      state.persisted.set(requestId, { transaction: fixtureTransaction(variant, { quantity: 1, after_quantity: 11 }), variant, replayed: false });
      state.blockStatus = false;
      state.revokeAfterRecovery = true;
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#gateTitle')?.textContent.includes('ขอสิทธิ์'));
      await sleep(100);
      assert.equal(await page.locator('#saleSuccess').count(), 0);
      assert.equal(await page.locator('[data-variant-id]').count(), 0);
      assert.equal(await page.locator('#authorizedContent').isVisible(), false);
      assert.doesNotMatch(await page.locator('body').textContent(), /FIX-NAVY|เสื้อทดสอบ|คงเหลือที่ระบบยืนยัน/);
    });
  });
  await test('stock change invalidation refreshes authoritative stock and preserves dirty form fields', async () => {
    await withPage({}, async (page, state) => {
      await start(page); await screen(page, 'sell');
      await chooseChannel(page, 'LINE');
      await openProductSizes(page);
      await page.locator(`#stockSheet [data-variant-id="${fixtureIds[0]}"]`).click();
      await page.locator('#stockSheet details').evaluate(details => { details.open = true; });
      await page.locator('#saleQuantity').fill('2');
      await page.locator('#orderReference').fill('UNSAVED-ORDER');
      const snapshots = state.snapshots;
      state.variants[0] = { ...state.variants[0], stock_quantity: 9, revision: 2 };
      for (let attempt = 0; !state.watches.length && attempt < 30; attempt++) await sleep(100);
      assert.ok(state.watches.length, 'Live invalidation watch is connected');
      await state.watches.shift().fulfill({ contentType: 'text/event-stream', body: 'event: connected\ndata: {}\n\nevent: stock_changed\ndata: {}\n\n' });
      await page.waitForFunction(() => document.querySelector('#stockNow')?.textContent.includes('9'), null, { timeout: 15000 });
      assert.ok(state.snapshots > snapshots, 'SSE invalidation fetches a fresh snapshot');
      assert.equal(await page.locator('#saleQuantity').inputValue(), '2');
      assert.equal(await page.locator('#orderReference').inputValue(), 'UNSAVED-ORDER');
      assert.match(await page.locator('#stockAfter').textContent(), /7/);
      assert.equal(state.requests.some(request => request.action === 'transaction'), false, 'Live refresh never submits unsaved fields');
    });
  });
  await test('owner adjustment submits counted quantity and current revision', async () => {
    await withPage({}, async (page, state) => {
      await start(page); await screen(page, 'check');
      await page.locator(`#checkList [data-variant-id="${fixtureIds[0]}"]`).click();
      await page.getByRole('button', { name: 'ปรับเป็นยอดนับจริง', exact: true }).click();
      await page.locator('#countedQuantity').fill('13');
      await page.locator('#confirmAdjust').click();
      await page.locator('#saleSuccess').waitFor({ state: 'visible' });
      const adjustment = state.requests.find(request => request.action === 'transaction');
      assert.equal(adjustment.input.type, 'ADJUST');
      assert.equal(adjustment.input.stock_quantity, 13);
      assert.equal(adjustment.input.expected_revision, 1);
      assert.equal(state.variants[0].stock_quantity, 13);
      assert.equal(adjustment.input.sales_channel, undefined, 'Inventory counts do not pretend to be a sale');
    });
  });
  await test('owner submits counted catalog stock and approves existing LINE staff, without a new account', async () => {
    await withPage({}, async (page, state) => {
      await start(page); await screen(page, 'check');
      await page.locator('#addVariantButton').click();
      await page.locator('#newProductName').fill('<svg onload=alert(1)>');
      await page.locator('#newProductSku').fill('FIX-OWNER-CATALOG');
      await page.locator('#newProductColor').fill('น้ำตาล');
      await page.locator('#newProductSize').fill('L');
      await page.locator('#newInitialQuantity').fill('4');
      await page.locator('#newLowThreshold').fill('1');
      await page.locator('#confirmProductCreate').click();
      await page.locator('#checkList').getByText('FIX-OWNER-CATALOG', { exact: false }).waitFor();
      assert.match(await page.locator('#checkList').textContent(), /<svg onload=alert\(1\)>/);
      assert.equal(await page.locator('#checkList svg[onload]').count(), 0);
      const create = state.requests.find(request => request.action === 'product_create');
      assert.equal(create.input.initial_quantity, 4);
      assert.equal(create.input.threshold, 1);
      await page.locator('#teamButton').click();
      await page.locator(`[data-member-id="${staffId}"]`).waitFor();
      assert.equal(await page.locator(`[data-member-id="${ownerId}"]`).count(), 0, 'Owner role cannot be edited through staff controls');
      await page.locator(`[data-member-id="${staffId}"]`).click();
      await page.locator('#confirmMemberUpdate').click();
      await page.waitForFunction(() => document.querySelector('#sheetBody')?.textContent.includes('ทีมงาน · ใช้งานได้'));
      const grant = state.requests.find(request => request.action === 'member_update');
      assert.equal(grant.input.member_line_user_id, staffId);
      assert.equal(grant.input.status, 'ACTIVE');
      assert.equal(grant.input.role, 'STAFF');
      assert.equal(state.requests.some(request => ['signup', 'membership_create', 'checkout'].includes(request.action)), false);
      await mobileChecks(page);
    });
  });
  await test('desktop control center and reduced-motion preference render without overflow', async () => {
    await withPage({ width: 1280, mobile: false, reducedMotion: 'reduce' }, async page => {
      await start(page);
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `${screenshotDir}/stock-home-desktop.png`, fullPage: true });
    });
  });
  await test('registered LIFF GitHub Pages subpath keeps assets and modules inside /chaylueklab/', async () => {
    await withPage({ pathPrefix: '/chaylueklab' }, async page => {
      const localRequests = [];
      page.on('request', request => { if (request.url().startsWith(base)) localRequests.push(request.url()); });
      for (const route of ['stock.html', 'control.html']) {
        await page.goto(`${base}/chaylueklab/${route}`);
        await page.locator('#screenHome').waitFor({ state: 'visible' });
        await mobileChecks(page);
      }
      const outside = localRequests.filter(url => !url.startsWith(`${base}/chaylueklab/`));
      assert.deepEqual(outside, [], 'GHPages pages must not reference root-absolute local assets');
      assert.deepEqual(await page.evaluate(() => window.fixtureLiffInit), ['2011681452-yexLrODy']);
      await mobileChecks(page);
    });
  });
  await test('static stock sources expose no privileged API secrets', async () => {
    for (const file of ['stock.html', 'control.html', 'assets/stock.js', 'assets/stock-client.js', 'data/stock-config.js']) {
      const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
      assert.doesNotMatch(source, /sb_secret_[A-Za-z0-9_-]+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|service_role["']\s*[:=]/, `${file}: no privileged key in browser code`);
    }
  });
} finally { await browser.close(); }
console.log(`Stock UI fixtures: ${completed.length} passed, ${failures.length} failed. Production credentials/inventory not exercised.`);
if (failures.length) process.exitCode = 1;
