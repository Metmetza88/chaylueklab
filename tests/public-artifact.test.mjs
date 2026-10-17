import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { sourceRoot, verifyPublicSite } from '../scripts/verify-public-site.mjs';

test('public artifact includes linked sections, excludes backend files and rejects missing pages', async () => {
  const name = `_site-test-${randomUUID()}`;
  const output = resolve(sourceRoot, name);
  const commit = '1234567890abcdef1234567890abcdef12345678';
  try {
    const build = spawnSync(process.execPath, ['scripts/build-public-site.mjs', name], {
      cwd: sourceRoot, encoding: 'utf8', env: { ...process.env, VERCEL_GIT_COMMIT_SHA: commit }
    });
    assert.equal(build.status, 0, build.stderr || build.stdout);
    await verifyPublicSite(output);
    const manifest = JSON.parse(await readFile(resolve(output, 'release.json'), 'utf8'));
    assert.equal(manifest.commit, commit);
    for (const path of ['ai-gallery/index.html', 'ai-money-studio/index.html', 'ai-money-studio/app.js', 'ai-sales-boost/index.html', 'review-chaylueklab-starter-drop/index.html']) {
      await access(resolve(output, path));
      assert.match(manifest.hashes[path], /^[a-f0-9]{64}$/);
    }
    for (const path of ['supabase', 'scripts', 'tests', '.env.example', 'billing.ts', 'setup-owner.sql', 'vercel.json']) {
      await assert.rejects(access(resolve(output, path)), { code: 'ENOENT' });
    }
    await rm(resolve(output, 'ai-gallery/index.html'));
    await assert.rejects(verifyPublicSite(output), { code: 'ENOENT' });
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
