/** Inactive integration boundary. No built-in provider, credentials or outbound requests. */
const LIMIT = 16 * 1024;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v, keys) => object(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
function validSummary(s) {
  if (!exact(s, ['currency', 'revenueCents', 'units', 'rowCount', 'productCount', 'topProducts']) || s.currency !== 'THB' ||
      !integer(s.revenueCents, 0, Number.MAX_SAFE_INTEGER) || !integer(s.units, 1, 100000000000) ||
      !integer(s.rowCount, 1, 10000) || !integer(s.productCount, 1, s.rowCount) ||
      !Array.isArray(s.topProducts) || s.topProducts.length !== Math.min(5, s.productCount)) return false;
  let revenue = 0, units = 0;
  for (const [i, p] of s.topProducts.entries()) {
    if (!exact(p, ['label', 'units', 'revenueCents']) || p.label !== 'Product ' + (i + 1) ||
        !integer(p.units, 1, s.units) || !integer(p.revenueCents, 0, s.revenueCents) ||
        (i && p.revenueCents > s.topProducts[i - 1].revenueCents)) return false;
    revenue += p.revenueCents; units += p.units;
    if (!Number.isSafeInteger(revenue) || revenue > s.revenueCents || units > s.units) return false;
  }
  return s.productCount > 5 || (revenue === s.revenueCents && units === s.units);
}
async function boundedBody(request) {
  if (Number(request.headers.get('content-length')) > LIMIT || !request.body) throw Error('invalid_body');
  const reader = request.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > LIMIT) { await reader.cancel(); throw Error('invalid_body'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
const json = (status, body) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
} });
/** Implement identity + durable per-user quota BEFORE injecting an approved provider.
 * A true quota result must atomically reserve one request under the owner's budget.
 * This boundary never stores raw rows or reads keys. No frontend consumes it yet.
 */
export function createAIHandler({ enabled = false, authenticate, consumeQuota, provider, timeoutMs = 10000 } = {}) {
  return async request => {
    const url = new URL(request.url);
    if (url.pathname !== '/api/business-insights/ai') return json(404, { error: 'not_found' });
    if (request.method === 'GET') return json(200, { mode: 'not-connected', generativeAI: false });
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
    // All four explicit prerequisites are mandatory; an environment flag alone cannot enable AI.
    if (!enabled || typeof authenticate !== 'function' || typeof consumeQuota !== 'function' || typeof provider !== 'function') return json(503, { error: 'ai_disabled', generativeAI: false });
    if (request.headers.get('origin') !== url.origin) return json(403, { error: 'origin_rejected' });
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json(415, { error: 'json_required' });
    try {
      const identity = await authenticate(request);
      if (typeof identity !== 'string' || !identity.trim() || identity.length > 128) return json(401, { error: 'unauthorized' });
      let body;
      try { body = await boundedBody(request); } catch { return json(400, { error: 'invalid_request' }); }
      if (!exact(body, ['action', 'summary']) || body.action !== 'draft-observations' || !validSummary(body.summary)) return json(400, { error: 'invalid_request' });
      if (await consumeQuota(identity) !== true) return json(429, { error: 'quota_exceeded' });
      const controller = new AbortController();
      const signal = controller.signal;
      let timer;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(Error('provider_timeout')); }, timeoutMs);
      });
      let result;
      try {
        result = await Promise.race([Promise.resolve().then(() => provider({ summary: body.summary,
          instruction: 'Draft observations using only supplied totals. Do not recalculate, forecast, claim profit or invent promotions. Product labels are anonymous. Return draft text only.',
          tools: false, signal })), deadline]);
      } finally { clearTimeout(timer); }
      if (!exact(result, ['text', 'model']) || typeof result.text !== 'string' || !result.text.trim() || result.text.length > 4000 ||
          /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(result.text) || typeof result.model !== 'string' || !/^[a-zA-Z0-9._:/-]{1,100}$/.test(result.model)) return json(502, { error: 'provider_invalid_response' });
      return json(200, { mode: 'provider-draft', draft: result.text, model: result.model, reviewRequired: true });
    } catch { return json(502, { error: 'provider_unavailable' }); }
  };
}
/** Explicit data minimization: product names, dates, customers and raw CSV never enter this payload. */
export function buildAIRequest(report) {
  const summary = { currency: 'THB', revenueCents: report.revenueCents, units: report.units, rowCount: report.rowCount,
    productCount: report.productCount, topProducts: report.rank.slice(0, 5).map((p, i) => ({ label: 'Product ' + (i + 1), units: p.units, revenueCents: p.revenueCents })) };
  if (!validSummary(summary)) throw Error('invalid_summary');
  return { action: 'draft-observations', summary };
}
