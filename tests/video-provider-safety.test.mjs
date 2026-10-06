import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const jobId = '11111111-1111-4111-8111-111111111111';
const body = { model: 'veo', ratio: '16:9', duration: 4, prompt: 'Explicit provider safety fixture', imageData: 'data:image/jpeg;base64,YQ==', requestId: 'fixture-request-only' };
class FixtureProviderError extends Error {
  constructor(message, status, retryable) { super(message); this.status = status; this.retryable = retryable; }
}
function createHandler({ reservation = { job_id: jobId, status: 'queued', replayed: false }, providerError, persistError = false, identityError = false } = {}) {
  let handle, providerCalls = 0;
  const calls = [];
  const db = {
    rpc: async name => { calls.push(name); return { data: name === 'video_create_job' ? reservation : {} }; },
    from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => { if (persistError) throw new Error('fixture database unavailable'); return { data: { id: jobId } }; } }) }) }) }) })
  };
  const json = (value, status = 200) => status === 204 ? new Response(null, { status }) : Response.json(value, { status });
  const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/video-create/index.ts', import.meta.url), 'utf8').replace(/^import .*;\s*$/mg, ''));
  vm.runInNewContext(source, { Request, Response, Error, Set, console: { error() {} }, setTimeout,
    Deno: { serve: fn => { handle = fn; } }, json,
    requirePost: req => req.method === 'POST' ? null : json({}, 405),
    lineIdentity: async () => { if (identityError) throw new Error('fixture LINE timeout'); return 'verified-fixture-only'; },
    adminDb: () => db, membership: async () => ({ status: 'trialing' }), ProviderError: FixtureProviderError,
    createProviderJob: async () => { providerCalls++; if (providerError) throw providerError; return { provider: 'veo', providerJobId: 'fixture-provider-job' }; }
  });
  return { send: value => handle(new Request('https://test.invalid', { method: 'POST', body: JSON.stringify(value || body) })), calls, count: () => providerCalls };
}

test('replaying a queued video job never starts another paid generation', async () => {
  const h = createHandler({ reservation: { job_id: jobId, status: 'queued', replayed: true } });
  const response = await h.send();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).replayed, true);
  assert.equal(h.count(), 0);
  assert.deepEqual(h.calls, ['video_create_job']);
});

test('unknown provider response preserves the reservation for the same job', async () => {
  const h = createHandler({ providerError: new FixtureProviderError('provider_network_error', 504, true) });
  const response = await h.send();
  assert.equal(response.status, 503);
  const data = await response.json();
  assert.equal(data.error, 'provider_acceptance_pending');
  assert.equal(data.job.id, jobId);
  assert.equal(h.count(), 1);
  assert.ok(!h.calls.includes('video_release_credit'));
});

test('accepted provider work is not refunded when its database response fails', async () => {
  const h = createHandler({ persistError: true });
  assert.equal((await h.send()).status, 500);
  assert.equal(h.count(), 1);
  assert.ok(!h.calls.includes('video_release_credit'));
});

test('definite missing credential releases its reserved credit without pretending to generate', async () => {
  const h = createHandler({ providerError: new FixtureProviderError('GEMINI_API_KEY_missing', 503, false) });
  const response = await h.send();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'video_provider_not_configured');
  assert.ok(h.calls.includes('video_release_credit'));
});

test('LINE timeout and overlong Runway prompts never contact a paid provider', async () => {
  const timeout = createHandler({ identityError: true });
  assert.equal((await timeout.send()).status, 500);
  assert.equal(timeout.count(), 0);
  const runway = createHandler();
  assert.equal((await runway.send({ ...body, model: 'runway', prompt: 'x'.repeat(1001) })).status, 400);
  assert.equal(runway.count(), 0);
  assert.equal(runway.calls.length, 0);
});

test('the provider adapter never retries a billable POST after an unknown response', async () => {
  let calls = 0;
  const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/_shared/video-provider.ts', import.meta.url), 'utf8').replace(/^export /mg, ''));
  const provider = vm.runInNewContext(source + '\n({createProviderJob})', { Request, Response, Error, AbortController, setTimeout, clearTimeout,
    Deno: { env: { get: name => name === 'GEMINI_API_KEY' ? 'fixture-key-only' : undefined } },
    fetch: async () => { calls++; throw new Error('fixture lost provider response'); }
  });
  await assert.rejects(provider.createProviderJob({ model: 'veo', prompt: 'Fixture provider call', imageBase64: 'YQ==', mimeType: 'image/jpeg', ratio: '16:9', duration: 4 }), error => error.message === 'provider_network_error');
  assert.equal(calls, 1);
});
