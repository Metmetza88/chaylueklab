import assert from 'node:assert/strict';
import { readdir, readFile, writeFile, mkdir, rm, copyFile, lstat } from 'node:fs/promises';
import { resolve, relative, extname, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { sourceRoot, verifyPublicSite } from './verify-public-site.mjs';

const output = resolve(sourceRoot, process.argv[2] || '_site');
assert.notEqual(output, sourceRoot, 'Do not overwrite the source checkout');
assert.ok(dirname(output) === sourceRoot && /^_site(?:-[a-z0-9-]+)?$/.test(basename(output)), 'Build only into a _site directory inside this checkout');
await verifyPublicSite();
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const secret = /(?:sb_secret_[A-Za-z0-9_-]{12,}|sk_(?:test|live)_[A-Za-z0-9]{12,}|whsec_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,})/;
const hashes = {};
async function copyPublic(path) {
  const info = await lstat(path);
  assert.ok(!info.isSymbolicLink(), 'Do not follow symlinks into private files');
  if (info.isDirectory()) {
    for (const item of await readdir(path)) {
      assert.ok(!item.startsWith('.'), 'Do not package hidden files');
      await copyPublic(resolve(path, item));
    }
    return;
  }
  const name = relative(sourceRoot, path).split('\\').join('/');
  assert.ok(!secret.test((await readFile(path)).toString('utf8')), `Secret-like value detected in public file ${name}`);
  const destination = resolve(output, name);
  await mkdir(resolve(destination, '..'), { recursive: true });
  await copyFile(path, destination);
  hashes[name] = createHash('sha256').update(await readFile(path)).digest('hex');
}
for (const name of await readdir(sourceRoot)) {
  if (!name.startsWith('.') && ['.html', '.css', '.js'].includes(extname(name))) await copyPublic(resolve(sourceRoot, name));
}
for (const name of ['assets', 'data', 'news']) await copyPublic(resolve(sourceRoot, name));
await writeFile(resolve(output, '.nojekyll'), '');
await writeFile(resolve(output, 'release.json'), JSON.stringify({ commit: process.env.GITHUB_SHA || 'local-verification', files: Object.keys(hashes).length, hashes }));
await verifyPublicSite(output);
console.log(`PASS public artifact: ${Object.keys(hashes).length} files; server code, SQL, secrets and test fixtures excluded`);
