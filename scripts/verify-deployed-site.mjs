import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const base = new URL(process.env.SITE_URL);
assert.equal(base.protocol, 'https:');
const expected = process.env.EXPECTED_RELEASE_SHA;
assert.ok(expected, 'Expected release commit is required');
let lastError;
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    const manifestResponse = await fetch(new URL(`release.json?release=${expected}`, base), { signal: AbortSignal.timeout(10000), redirect: 'error' });
    assert.equal(manifestResponse.status, 200);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.commit, expected, 'Published commit must match the checked commit');
    const paths = ['index.html', 'app-20261007.html', 'control.html', 'stock.html', 'notes.html', 'ai-video.html', 'newsroom.html', 'news/index.html'];
    await Promise.all(paths.map(async path => {
      const response = await fetch(new URL(`${path}?release=${expected}`, base), { signal: AbortSignal.timeout(10000), redirect: 'error' });
      assert.equal(response.status, 200, path);
      const digest = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
      assert.equal(digest, manifest.hashes[path], `Published ${path} must match the built artifact`);
    }));
    console.log(`PASS deployed ${expected}: eight public routes match the checked artifact`);
    lastError = null;
    break;
  } catch (error) { lastError = error; if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1))); }
}
if (lastError) throw lastError;
