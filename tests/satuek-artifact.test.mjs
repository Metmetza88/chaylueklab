import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { sourceRoot } from '../scripts/verify-public-site.mjs';

test('Satuek ships as an isolated public route with local assets and no SQL/test data', async () => {
  const name = `_site-satuek-${randomUUID()}`;
  const output = resolve(sourceRoot,name);
  try {
    const build = spawnSync(process.execPath,['scripts/build-public-site.mjs',name],{cwd:sourceRoot,encoding:'utf8'});
    assert.equal(build.status,0,build.stderr||build.stdout);
    const html = await readFile(resolve(output,'satuek-connect/index.html'),'utf8');
    for (const path of [...html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)].map(m=>m[1]).filter(path=>!path.includes('${'))) await access(resolve(output,'satuek-connect',path));
    for (const path of ['rice.webp','fish.webp','bamboo.webp','vegetables.webp','tools.webp','community-market.webp','sarabun-400.woff2','sarabun-500.woff2','sarabun-600.woff2','sarabun-700.woff2','tailwind.css']) await access(resolve(output,'satuek-connect/assets',path));
    const manifest=JSON.parse(await readFile(resolve(output,'release.json'),'utf8'));
    assert.ok(manifest.hashes['satuek-connect/index.html']);
    for(const path of ['docs/satuek-connect/schema.sql','tests/satuek-connect/database.sql','tests/satuek-connect/browser.mjs','tests/satuek-connect/package.json']) await assert.rejects(access(resolve(output,path)),{code:'ENOENT'});
    for(const path of ['index.html','stock.html','control.html','ai-gallery/index.html','ai-money-studio/index.html','affiliate/index.html']) assert.equal(await readFile(resolve(output,path),'utf8'),await readFile(resolve(sourceRoot,path),'utf8'));
  } finally {await rm(output,{recursive:true,force:true});}
});
