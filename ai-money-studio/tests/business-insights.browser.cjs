/* Optional browser QA: PLAYWRIGHT_MODULE points to an installed Playwright package.
 * Run: node ai-money-studio/tests/business-insights.browser.cjs
 * No production host or external provider is contacted. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { createDevServer } = await import('../../server/woramet/dev-server.mjs');
  const server = createDevServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const appPath = '/ai-money-studio/business-insights.html';
  const out = path.resolve(process.env.WORAMET_QA_DIR || path.join(os.tmpdir(), 'woramet-browser-qa'));
  await fs.mkdir(out, { recursive: true });
  const engineName = process.env.WORAMET_BROWSER || 'chromium';
  const engine = engineName === 'webkit' ? webkit : chromium;
  let browser;
  const results = [];
  try {
    browser = await engine.launch({ headless: true, ...(engineName === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const screens = [
      { name: 'small-mobile', width: 320, height: 640 },
      { name: 'iphone-375', width: 375, height: 812 },
      { name: 'iphone-390', width: 390, height: 844 },
      { name: 'iphone-430', width: 430, height: 932 },
      { name: 'desktop-1440', width: 1440, height: 900 }
    ];
    for (const screen of screens) {
      const context = await browser.newContext({ viewport: { width: screen.width, height: screen.height },
        deviceScaleFactor: 1, ...(screen.width < 640 ? { isMobile: true, hasTouch: true } : {}), acceptDownloads: true });
      const page = await context.newPage();
      const errors = [], remote = [], responseErrors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('blob:')) remote.push(request.url()); });
      page.on('response', response => { if (response.status() >= 400) responseErrors.push(response.status() + ' ' + response.url()); });
      const fits = async () => {
        const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
        assert.ok(dimensions.content <= dimensions.viewport, JSON.stringify({ screen, dimensions }));
      };
      await page.goto(base + appPath);
      await page.evaluate(() => document.fonts.ready);
      await fits();
      assert.equal(await page.locator('h1').textContent(), 'มองยอดขายให้ชัดวางแผนร้านให้ง่าย');
      if (screen.width === 390 || screen.width === 1440) await page.screenshot({ path: path.join(out, `${engineName}-${screen.name}-start.png`), fullPage: true });
      await page.locator('#sample-quick').click();
      assert.equal(await page.locator('#revenue').textContent(), '฿7,200');
      await page.locator('#sample').click(); await page.locator('#analyze').click();
      assert.equal(await page.locator('#revenue').textContent(), '฿7,200');
      assert.equal(await page.locator('#units').textContent(), '12');
      assert.equal(await page.locator('#results').isVisible(), true); await fits();
      await page.locator('#results').scrollIntoViewIfNeeded();
      if (screen.width === 390 || screen.width === 1440) await page.screenshot({ path: path.join(out, `${engineName}-${screen.name}-results.png`), fullPage: true });
      const downloadPromise = page.waitForEvent('download'); await page.locator('#export').click();
      const download = await downloadPromise; assert.equal(download.suggestedFilename(), 'woramet-business-report.txt');
      const reportPath = path.join(out, `${engineName}-${screen.name}-report.txt`); await download.saveAs(reportPath);
      const report = await fs.readFile(reportPath, 'utf8'); assert.match(report, /7,200/); assert.match(report, /สูตรและกฎ/);
      await page.locator('#csv').fill('product,quantity,unit_price\nChanged,1,0.30');
      assert.equal(await page.locator('#results').isVisible(), false); assert.equal(await page.locator('#export').isDisabled(), true);
      await page.locator('#analyze').click(); assert.equal(await page.locator('#revenue').textContent(), '฿0.3');
      await page.locator('#file').setInputFiles(path.resolve(__dirname, '../fixtures/thai-sales-14-days.csv'));
      await page.waitForFunction(() => !document.getElementById('analyze').disabled);
      await page.locator('#analyze').click(); assert.equal(await page.locator('#revenue').textContent(), '฿2,100');
      assert.match(await page.locator('#trend-summary').textContent(), /100%/);
      const jsonPromise = page.waitForEvent('download'); await page.locator('#export-json').click();
      const jsonDownload = await jsonPromise; const jsonPath = path.join(out, `${engineName}-${screen.name}-report.json`);
      await jsonDownload.saveAs(jsonPath); assert.equal(JSON.parse(await fs.readFile(jsonPath, 'utf8')).revenueCents, 210000);
      await page.locator('#csv').fill('product,qty,price\n<img src=x onerror=alert(1)>,1,10'); await page.locator('#analyze').click();
      assert.equal(await page.locator('#ranking img').count(), 0); assert.match(await page.locator('#ranking').textContent(), /<img/);
      await page.locator('#csv').fill('product,qty,price\n' + 'Long商品'.repeat(20) + ',10000000,100'); await page.locator('#analyze').click(); await fits();
      await page.locator('#csv').fill('product,qty,price\nBad,-1,20'); await page.locator('#analyze').click();
      assert.equal(await page.locator('#results').isVisible(), false); assert.match(await page.locator('#status').textContent(), /แถวที่ 2/);
      await page.locator('#clear').click(); assert.equal(await page.locator('#csv').inputValue(), '');
      assert.deepEqual(remote, [], 'No external network requests allowed');
      assert.deepEqual(responseErrors, [], 'All requested local assets should load');
      assert.deepEqual(errors, [], 'Browser should have no JavaScript or CSP errors');
      results.push({ screen: screen.name, viewport: screen.width + 'x' + screen.height, passed: true });
      await context.close();
    }
    // Test direct-file operation too: static files still work without any Node server.
    const fileContext = await browser.newContext(); const filePage = await fileContext.newPage();
    let directFilePassed = false, directFileNote = '';
    try {
      await filePage.goto(pathToFileURL(path.resolve(__dirname, '../business-insights.html')).href);
      await filePage.locator('#sample').click(); await filePage.locator('#analyze').click();
      assert.equal(await filePage.locator('#revenue').textContent(), '฿7,200'); directFilePassed = true;
    } catch (error) {
      if (!error.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw error;
      directFileNote = 'Cloud browser policy blocks file://; local HTTP preview passed. Direct-file support is unverified.';
    } finally { await fileContext.close(); }
    // Native HTTP integration: explicit disabled mode, no paid requests.
    assert.equal((await fetch(base + '/api/business-insights/ai', { method: 'POST' })).status, 503);
    const summary = { engine: engineName, version: browser.version(), platform: os.platform(), results,
      directFilePassed, directFileNote, realIPhoneSafariTested: false, nativeWindowsTested: false, externalRequests: 0 };
    await fs.writeFile(path.join(out, `${engineName}-summary.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2)); console.log('QA evidence: ' + out);
  } finally {
    if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
