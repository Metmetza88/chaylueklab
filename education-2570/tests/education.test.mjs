import assert from 'node:assert/strict';
import test from 'node:test';
import { InputError, validateQuote, isSchoolStaff, calculateEstimate, toSatang } from '../lib/education-core.mjs';
import { createEducationHandler } from '../api/education.mjs';
const SCHOOL = '00000000-0000-4000-8000-000000000001';
const CATALOG = '00000000-0000-4000-8000-000000000002';
const USER = '00000000-0000-4000-8000-000000000003';
const PROGRAM = '00000000-0000-4000-8000-000000000004';
const quote = { school_id: SCHOOL, items: [{ catalog_id: CATALOG, quantity: 3 }] };
function makeResponse() {
  return {
    code: 200, headers: {}, body: null,
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }
  };
}
function makeHandler({ memberRole = 'teacher', catalogPrice = '19.95', rejectedAuth = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), headers: options.headers });
    const path = new URL(url).pathname;
    if (path === '/auth/v1/user') return { ok: !rejectedAuth, json: async () => ({ id: USER }) };
    let records = [];
    if (path.endsWith('/members')) records = memberRole ? [{ school_id: SCHOOL, role: memberRole }] : [];
    if (path.endsWith('/catalog')) records = [{ id: CATALOG, program_id: PROGRAM, price: catalogPrice }];
    return { ok: true, json: async () => records };
  };
  const handler = createEducationHandler({
    env: { EDU_SUPABASE_URL: 'https://example.supabase.co', EDU_SUPABASE_PUBLISHABLE_KEY: 'public-key' },
    fetchImpl
  });
  return { handler, calls };
}
async function execute(handler, action, method = 'GET', body = undefined, authorization = 'Bearer test.token') {
  const response = makeResponse();
  await handler({ method, query: { action }, body, headers: { authorization } }, response);
  return response;
}
test('quote validates UUID, counts and quantities', () => {
  assert.deepEqual(validateQuote(quote), quote);
  assert.throws(() => validateQuote({ ...quote, items: [] }), InputError);
  assert.throws(() => validateQuote({ ...quote, items: [{ catalog_id: CATALOG, quantity: 0 }] }), InputError);
  assert.throws(() => validateQuote({ ...quote, school_id: 'invalid' }), InputError);
});
test('membership only permits teacher and admin from same school', () => {
  assert.equal(isSchoolStaff([{ school_id: SCHOOL, role: 'teacher' }], SCHOOL), true);
  assert.equal(isSchoolStaff([{ school_id: SCHOOL, role: 'student' }], SCHOOL), false);
  assert.equal(isSchoolStaff([{ school_id: SCHOOL, role: 'admin' }], CATALOG), false);
});
test('price uses exact satang, Map lookup and ignores client-supplied price', () => {
  assert.equal(toSatang('19.95'), 1995);
  assert.equal(calculateEstimate({ ...quote, price: 1 }, [{ id: CATALOG, program_id: PROGRAM, price: '19.95' }]).total, 59.85);
  assert.throws(() => toSatang('19.999'), InputError);
  assert.throws(() => calculateEstimate(quote, []), InputError);
});
test('API authenticates, forwards JWT and uses RLS profile', async () => {
  const { handler, calls } = makeHandler();
  const result = await execute(handler, 'estimate', 'POST', quote);
  assert.equal(result.code, 200);
  assert.equal(result.body.total, 59.85);
  assert.equal(result.body.persisted, false);
  assert.equal(calls[0].headers.Authorization, 'Bearer test.token');
  assert.equal(calls[1].headers['Accept-Profile'], 'education_2570');
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('API rejects missing or invalid auth', async () => {
  const { handler } = makeHandler();
  assert.equal((await execute(handler, 'catalog', 'GET', undefined, '')).code, 401);
  assert.equal((await execute(makeHandler({ rejectedAuth: true }).handler, 'catalog')).code, 401);
});
test('API denies students and malformed estimates', async () => {
  const { handler } = makeHandler({ memberRole: 'student' });
  assert.equal((await execute(handler, 'estimate', 'POST', quote)).code, 403);
  assert.equal((await execute(handler, 'estimate', 'POST', {})).code, 400);
});
test('API supports me/catalog/quotes and rejects unknown operations', async () => {
  const { handler } = makeHandler();
  assert.equal((await execute(handler, 'me')).body.id, USER);
  assert.equal((await execute(handler, 'catalog')).body.length, 1);
  assert.equal((await execute(handler, 'quotes')).code, 200);
  assert.equal((await execute(handler, 'nope')).code, 405);
  assert.equal((await execute(handler, 'estimate')).code, 405);
});
test('API refuses missing configuration', async () => {
  const handler = createEducationHandler({ env: {} });
  assert.equal((await execute(handler, 'catalog')).code, 503);
});
