// SMOKE GUARD AI — isolated Roboflow inference gateway.
// Keep ROBOFLOW_API_KEY on the server, never in browser code or repository.
'use strict';

const MODEL_ID = 'smoke-uvylj-5sztn/1';
const recent = new Map();

function reply(res, status, value) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(value);
}

function sameOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return url.protocol === 'https:' && url.host === host;
  } catch { return false; }
}

function limited(req) {
  const now = Date.now();
  // Per-function-instance best-effort throttle. NOT a durable global quota.
  const key = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim().slice(0, 90);
  const row = recent.get(key) || { start: now, count: 0, last: 0 };
  if (now - row.start > 60_000) { row.start = now; row.count = 0; }
  if (now - row.last < 2000 || row.count >= 12) return true;
  row.last = now; row.count += 1; recent.set(key, row);
  if (recent.size > 2000) recent.clear();
  return false;
}

function mapPredictions(value) {
  const raw = Array.isArray(value?.predictions) ? value.predictions : [];
  return raw.slice(0, 25).filter(p =>
    Number.isFinite(p?.x) && Number.isFinite(p?.y) &&
    Number.isFinite(p?.width) && Number.isFinite(p?.height) &&
    Number.isFinite(p?.confidence)
  ).map(p => ({
    x: p.x, y: p.y, width: Math.max(0,p.width), height: Math.max(0,p.height),
    confidence: Math.max(0,Math.min(1,p.confidence)),
    label: String(p.class || 'smoke').slice(0,32)
  }));
}

async function handler(req, res) {
  if (req.method === 'GET') {
    return reply(res,200,{
      ready: process.env.SMOKE_GUARD_ENABLED === '1' && Boolean(process.env.ROBOFLOW_API_KEY),
      model: MODEL_ID, intervalSeconds: 3
    });
  }
  if (req.method !== 'POST') return reply(res,405,{error:'method_not_allowed'});
  if (!sameOrigin(req)) return reply(res,403,{error:'origin_not_allowed'});
  if (process.env.SMOKE_GUARD_ENABLED !== '1' || !process.env.ROBOFLOW_API_KEY) {
    return reply(res,503,{error:'ai_not_configured'});
  }
  const length = Number(req.headers?.['content-length'] || 0);
  if (length > 700_000) return reply(res,413,{error:'image_too_large'});
  let payload;
  try { payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return reply(res,400,{error:'invalid_json'}); }
  if (!payload || typeof payload.image !== 'string' ||
      payload.image.length > 650_000 ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(payload.image)) {
    return reply(res,400,{error:'invalid_image'});
  }
  const base64 = payload.image.slice('data:image/jpeg;base64,'.length);
  const bytes = Buffer.from(base64,'base64');
  if (bytes.length < 16 || bytes.length > 460_000 ||
      bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return reply(res,400,{error:'invalid_jpeg'});
  }
  if (limited(req)) return reply(res,429,{error:'rate_limited'});
  try {
    const url = new URL('https://serverless.roboflow.com/' + MODEL_ID);
    url.searchParams.set('api_key',process.env.ROBOFLOW_API_KEY);
    url.searchParams.set('confidence','40');
    const upstream = await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:base64,
      signal:AbortSignal.timeout(10_000)
    });
    if (!upstream.ok) return reply(res,502,{error:'model_unavailable'});
    const result = await upstream.json();
    const iw=Number(result?.image?.width), ih=Number(result?.image?.height);
    if (!(iw>0 && ih>0 && iw<=10000 && ih<=10000)) {
      return reply(res,502,{error:'unexpected_model_response'});
    }
    return reply(res,200,{
      predictions:mapPredictions(result),
      image:{width:iw,height:ih},
      model:MODEL_ID
    });
  } catch {
    return reply(res,504,{error:'model_timeout_or_network'});
  }
}
module.exports = handler;
module.exports.mapPredictions = mapPredictions;
