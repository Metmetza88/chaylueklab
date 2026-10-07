import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const sourceRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));

export async function verifyPublicSite(directory = sourceRoot) {
  const required = ['index.html', 'business.html', 'app-20261007.html', 'notes.html', 'control.html', 'stock.html', 'ai-video.html', 'newsroom.html', 'news/index.html', 'assets/premium.css', 'assets/quantum.css', 'assets/brand-links.js', 'assets/brand/quantum/icon.svg', 'assets/brand/quantum/horizontal.svg', 'assets/brand/quantum/vertical.svg', 'assets/site-entry.js', 'assets/stock.js', 'assets/stock-client.js', 'assets/stock.css', 'assets/video-media.js', 'data/stock-config.js', 'data/newsroom-config.js'];
  await Promise.all(required.map(name => access(resolve(directory, name))));
  const stock = await readFile(resolve(directory, 'stock.html'), 'utf8');
  const control = await readFile(resolve(directory, 'control.html'), 'utf8');
  assert.equal(control, stock.replace('<!doctype html>', '<!doctype html>\n<!-- Generated from stock.html by scripts/prepare-control.mjs. -->'), 'Control Center must use the same Stock page');
  assert.ok(control.includes('static.line-scdn.net/liff'), 'The existing LINE SDK must be loaded');
  const { stockConfig } = await import(pathToFileURL(resolve(directory, 'data/stock-config.js')));
  const { newsroomConfig } = await import(pathToFileURL(resolve(directory, 'data/newsroom-config.js')));
  assert.equal(stockConfig.liffId, newsroomConfig.liffId, 'Reuse one configured LINE app');
  assert.equal(stockConfig.liffEndpointUrl, newsroomConfig.liffEndpointUrl, 'Preserve the LINE callback endpoint');
  assert.match(stockConfig.liffId, /^\d+-[A-Za-z0-9]+$/);
  assert.equal(new URL(stockConfig.liffEndpointUrl).protocol, 'https:');
  assert.equal(stockConfig.apiUrl, new URL('stock', newsroomConfig.apiUrl).href, 'Use the shared stock API');
  assert.equal(new URL(stockConfig.apiUrl).protocol, 'https:');
  console.log('PASS public routes, shared Stock markup, configured LIFF and server endpoint');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await verifyPublicSite();
