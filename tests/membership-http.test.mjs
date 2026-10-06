import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

function shared() {
  const source = readFileSync(new URL('../supabase/functions/_shared/membership.ts', import.meta.url), 'utf8')
    .replace(/^import .*;\s*$/mg, '').replace(/^export \{PLAN\};?$/mg, '').replace(/^export /mg, '');
  return vm.runInNewContext(stripTypeScriptTypes(source) + '\n({json, requirePost, CORS})', { Request, Response, PLAN: {} });
}

for (const endpoint of ['video-create', 'video-status']) {
  test(`${endpoint} preflight succeeds without reading credentials or contacting providers`, async () => {
    let handle;
    const { json, requirePost, CORS } = shared();
    const denied = () => { throw new Error('Preflight must not authenticate or call the database/provider'); };
    const source = readFileSync(new URL(`../supabase/functions/${endpoint}/index.ts`, import.meta.url), 'utf8').replace(/^import .*;\s*$/mg, '');
    vm.runInNewContext(stripTypeScriptTypes(source), { Request, Response, Set, json, requirePost, CORS,
      Deno: { serve: fn => { handle = fn; }, env: { get: () => undefined } }, lineIdentity: denied, adminDb: denied,
      createProviderJob: denied, pollProviderJob: denied, downloadProviderVideo: denied, membership: denied });
    const response = await handle(new Request('https://test.invalid', { method: 'OPTIONS' }));
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.match(response.headers.get('access-control-allow-methods'), /POST/);
    const unsupported = await handle(new Request('https://test.invalid', { method: 'GET' }));
    if (endpoint === 'video-status') {
      assert.equal(unsupported.status, 200);
      assert.deepEqual(await unsupported.json(), { ok: true, models: { veo: false, runway: false } });
    } else {
      assert.equal(unsupported.status, 405);
      assert.equal((await unsupported.json()).error, 'method_not_allowed');
    }
  });
}

test('video submission requires a persisted job identifier before contacting a paid provider', async () => {
  const source = readFileSync(new URL('../supabase/functions/video-create/index.ts', import.meta.url), 'utf8').replace(/^import .*;\s*$/mg, '');
  for (const result of [null, {}, { job_id: null }, { job_id: '' }, { job_id: 12 }]) {
    let handle, providerCalls = 0;
    const { json, requirePost, CORS } = shared();
    vm.runInNewContext(stripTypeScriptTypes(source), { Request, Response, Set, Error, json, requirePost, CORS,
      Deno: { serve: fn => { handle = fn; } }, lineIdentity: async () => 'verified-fixture-only',
      adminDb: () => ({ rpc: async () => ({ data: result }) }), membership: async () => ({ status: 'none' }),
      ProviderError: class extends Error {}, console: { error() {} },
      createProviderJob: async () => { providerCalls++; throw new Error('Provider must not be reached'); } });
    const response = await handle(new Request('https://test.invalid', { method: 'POST', body: JSON.stringify({
      model: 'runway', ratio: '16:9', duration: 4, prompt: 'Explicit boundary test',
      imageData: 'data:image/jpeg;base64,YQ==', requestId: 'fixture-request-only' }) }));
    assert.equal(response.status, 500);
    assert.equal((await response.json()).error, 'video_create_failed');
    assert.equal(providerCalls, 0, 'A malformed reservation must never start a billable provider job');
  }
});
