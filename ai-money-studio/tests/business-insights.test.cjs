// Run: node --test ai-money-studio/tests/*.test.cjs ai-money-studio/tests/*.test.mjs
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../business-insights-core.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'business-insights.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'business-insights.js'), 'utf8');
function element() {
  return {
    value: '', textContent: '', hidden: false, disabled: false, style: {}, className: '',
    children: [], handlers: {}, files: [],
    addEventListener(event, handler) { this.handlers[event] = handler; },
    replaceChildren(...items) { this.children = items; },
    append(...items) { this.children.push(...items); },
    remove() {},
    click() { return this.handlers.click?.(); }
  };
}
function app({ clipboard = async () => {} } = {}) {
  const items = new Map(), blobs = [], links = [];
  const document = {
    body: { append(node) { links.push(node); } },
    getElementById(id) { if (!items.has(id)) items.set(id, element()); return items.get(id); },
    createElement() { return element(); }
  };
  const context = { document, WorametInsights: core, navigator: { clipboard: { writeText: clipboard } },
    URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:test'; }, revokeObjectURL() {} },
    Blob, setTimeout() {} };
  vm.runInNewContext(script, context, { timeout: 1500 });
  const $ = id => document.getElementById(id);
  $('encoding').value = 'auto';
  $.blobs = blobs; $.links = links;
  return $;
}
function sampleApp(options) { const $ = app(options); $('sample').click(); $('analyze').click(); return $; }
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const buffer = text => new TextEncoder().encode(text).buffer;
const inputFile = (text, wait) => ({ size: buffer(text).byteLength, arrayBuffer: () => wait || Promise.resolve(buffer(text)) });
function load($, file) { $('file').files = [file]; return $('file').handlers.change({ target: { files: [file] } }); }

test('sample data: 7 rows, 12 units, 3 products, THB 7200', () => {
  const $ = sampleApp();
  assert.equal($('revenue').textContent, '฿7,200'); assert.equal($('units').textContent, '12');
  assert.equal($('rows').textContent, '7'); assert.equal($('products').textContent, '3');
  assert.equal($('ranking').children.length, 3); assert.equal($('results').hidden, false);
  assert.equal($('source-label').textContent, 'ข้อมูลสมมติ');
});
test('blank prices must fail, not silently become zero', () => {
  const $ = app(); $('csv').value = 'product,quantity,unit_price\nSample,2,'; $('analyze').click();
  assert.match($('status').textContent, /แถวที่ 2/); assert.equal($('results').hidden, true);
});
test('negative quantities must fail', () => {
  const $ = app(); $('csv').value = 'product,quantity,unit_price\nSample,-2,100'; $('analyze').click();
  assert.match($('status').textContent, /แถวที่ 2/);
});
test('quoted commas inside a product name must work', () => {
  const $ = app(); $('csv').value = 'product,quantity,unit_price\n"Blue, White",2,100'; $('analyze').click();
  assert.equal($('revenue').textContent, '฿200');
});
test('invalid CSV hides previous results and prevents stale downloads and copies', async () => {
  let copies = 0; const $ = sampleApp({ clipboard: async () => { copies++; } });
  $('csv').value = 'invalid'; $('analyze').click();
  assert.equal($('results').hidden, true); assert.equal($('marketing').hidden, true);
  $('export').click(); $('export-json').click(); await $('copy').click();
  assert.equal($.blobs.length, 0); assert.equal(copies, 0); assert.equal($('post').textContent, '');
});
test('clear resets the form and result panels', () => {
  const $ = sampleApp(); $('clear').click();
  assert.equal($('csv').value, ''); assert.equal($('results').hidden, true); assert.equal($('revenue').textContent, '');
});
test('data is displayed using text, not HTML injection; browser is network-isolated', () => {
  assert.doesNotMatch(script, /\.innerHTML\s*=|\beval\(|\bfetch\(|localStorage|sessionStorage|XMLHttpRequest/);
  assert.match(source, /connect-src 'none'/); assert.match(source, /script-src 'self'/);
  const $ = app(); const name = '<img src=x onerror=alert(1)>';
  $('csv').value = 'product,quantity,unit_price\n' + name + ',1,1'; $('analyze').click();
  assert.equal($('ranking').children[0].children[0].children[0].textContent, '1. ' + name);
});
test('editing CSV invalidates previously shown report', () => {
  const $ = sampleApp(); $('csv').value = 'product,quantity,unit_price\nChanged,1,99'; $('csv').handlers.input();
  assert.equal($('results').hidden, true); assert.equal($('marketing').hidden, true);
  assert.equal($('export').disabled, true); assert.match($('status').textContent, /ข้อมูลเปลี่ยนแล้ว/);
});
test('loading a new sample invalidates prior analyzed results', () => {
  const $ = sampleApp(); $('sample').click(); assert.equal($('results').hidden, true);
});
test('exports contain the current report with Windows-friendly BOM, plus JSON and draft', async () => {
  const $ = sampleApp(); $('export').click(); $('export-json').click(); $('download-post').click();
  assert.equal($.blobs.length, 3);
  const bytes = new Uint8Array(await $.blobs[0].arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191]);
  const text = await $.blobs[0].text(); assert.match(text, /7,200/); assert.match(text, /ไม่ใช่ Generative AI/);
  assert.match(text, /ข้อมูลสมมติ/); assert.match(text, /\r\n/);
  assert.equal(JSON.parse(await $.blobs[1].text()).revenueCents, 720000);
  assert.equal($.links[0].download, 'woramet-business-report.txt');
  assert.equal(await $.blobs[2].text(), $('post').textContent);
});
test('clipboard failure provides selection and download fallback', async () => {
  const $ = sampleApp({ clipboard: async () => { throw Error('denied'); } }); await $('copy').click();
  assert.match($('copy-status').textContent, /บันทึกร่าง/);
});
test('late clipboard completion cannot restore a stale success message', async () => {
  const wait = deferred(); const $ = sampleApp({ clipboard: () => wait.promise });
  const operation = $('copy').click(); $('clear').click(); wait.resolve(); await operation;
  assert.equal($('copy-status').textContent, '');
});
test('new file invalidates results immediately; analyze waits for reading', async () => {
  const $ = sampleApp(), wait = deferred(); const operation = load($, inputFile('x', wait.promise));
  assert.equal($('results').hidden, true); assert.equal($('csv').value, ''); assert.equal($('analyze').disabled, true);
  $('analyze').click(); assert.equal($('results').hidden, true);
  wait.resolve(buffer('สินค้า,จำนวน,ราคา\nสมุด,2,35.50')); await operation; $('analyze').click();
  assert.equal($('revenue').textContent, '฿71'); assert.equal($('source-label').textContent, 'ข้อมูลจากไฟล์');
});
test('clear, sample and manual edits cancel pending file reads', async () => {
  for (const action of ['clear', 'sample', 'input']) {
    const $ = sampleApp(), wait = deferred(); const operation = load($, inputFile('x', wait.promise));
    if (action === 'input') { $('csv').value = 'manual'; $('csv').handlers.input(); } else $(action).click();
    const expected = $('csv').value; wait.resolve(buffer('old-file')); await operation;
    assert.equal($('csv').value, expected); assert.equal($('results').hidden, true); assert.equal($('analyze').disabled, false);
  }
});
test('two overlapping file imports use only the latest selection, even after old read fails', async () => {
  for (const oldFails of [false, true]) {
    const $ = app(), first = deferred(), second = deferred();
    const a = load($, inputFile('a', first.promise)); const b = load($, inputFile('b', second.promise));
    second.resolve(buffer('product,quantity,price\nNew,1,20')); await b;
    if (oldFails) first.reject(Error('old error')); else first.resolve(buffer('old-file'));
    await a; $('analyze').click(); assert.equal($('revenue').textContent, '฿20');
  }
});
test('oversized and unreadable files remove previous CSV and report', async () => {
  for (const file of [{ size: core.MAX_BYTES + 1 }, { size: 1, arrayBuffer: async () => { throw Error('unreadable'); } }]) {
    const $ = sampleApp(); await load($, file); assert.equal($('csv').value, '');
    assert.equal($('results').hidden, true); $('export').click(); assert.equal($.blobs.length, 0);
  }
});
test('encoding changes re-read selected file and invalidate existing report', async () => {
  const $ = sampleApp(); const file = inputFile('product,quantity,price\nNew,1,20');
  $('file').files = [file]; $('encoding').value = 'utf-8'; await $('encoding').handlers.change();
  assert.equal($('results').hidden, true); $('analyze').click(); assert.equal($('revenue').textContent, '฿20');
});
