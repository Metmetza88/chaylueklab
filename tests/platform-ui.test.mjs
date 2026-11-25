import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');
const files = ['assets/cc.js', 'assets/cc-home.js', 'assets/cc-console.js', 'command-center.html', 'console.html', 'data/platform-config.js'];

test('UI never injects HTML from data (XSS) and never evaluates strings', async () => {
  for (const f of files) { const s = await read(f); assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(s), f); }
});
test('no secrets, service keys or provider keys in public files', async () => {
  for (const f of files) assert.ok(!/(sk_live|sk_test|whsec_|sb_secret|service_role|AIza[0-9A-Za-z_-]{20,})/.test(await read(f)), f);
});
test('UI sends no prices or user ids to the server', async () => {
  const s = (await read('assets/cc-home.js')).slice((await read('assets/cc-home.js')).indexOf("api('quote_create'"));
  assert.ok(!/priceCents|unitPrice|lineUserId/.test(s.slice(0, 400)));
});
test('external links use noopener and no placeholder text ships', async () => {
  for (const f of files) { const s = await read(f); assert.ok(!/lorem ipsum|TODO|FIXME|xxx@|example\.com/i.test(s), f); }
  assert.match(await read('assets/cc-home.js'), /noopener noreferrer/);
});
test('console is noindex and robots blocks it; home has SEO tags', async () => {
  assert.match(await read('console.html'), /noindex/);
  assert.match(await read('robots.txt'), /Disallow: \/console\.html/);
  const home = await read('command-center.html');
  for (const k of ['og:title', 'og:description', 'rel="canonical"', 'name="description"', 'viewport']) assert.ok(home.includes(k), k);
});
test('unfinished programs cannot be ordered from the UI', async () => {
  const s = await read('assets/cc-home.js');
  assert.match(s, /sellable = p\.status === 'available' && p\.priceCents > 0/);
  assert.match(s, /disabled: !sellable/);
});
test('payment is never shown as confirmed by the client', async () => {
  const s = await read('assets/cc-console.js');
  assert.ok(!/payment=success|status\s*=\s*'paid'/.test(s));
  assert.match(s, /ผู้ดูแลตรวจหลักฐานเท่านั้น/);
});
