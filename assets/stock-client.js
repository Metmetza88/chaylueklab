import { stockConfig as config } from '../data/stock-config.js';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const WRITES = new Set(['transaction', 'product_create', 'member_update']);
const messages = {
  stock_not_configured: 'ระบบหลังร้านยังติดตั้งไม่ครบ',
  line_login_not_configured: 'ค่าของแอป LINE ยังไม่ตรงกัน',
  stock_login_not_configured: 'ค่าของแอป LINE ยังไม่ตรงกัน',
  line_connection_timeout: 'เชื่อมต่อ LINE นานเกินไป กรุณาลองอีกครั้ง',
  line_verification_unavailable: 'LINE ยังตอบกลับไม่สำเร็จ กรุณาลองอีกครั้ง',
  owner_login_not_configured: 'ยังไม่ได้ตั้งค่าเจ้าของร้าน',
  line_identity_required: 'กรุณาเชื่อมต่อ LINE อีกครั้ง',
  identity_required: 'กรุณาเชื่อมต่อ LINE อีกครั้ง',
  shop_not_ready: 'ให้เจ้าของร้านเปิดระบบหลังร้านครั้งแรกก่อน',
  shop_access_required: 'รอเจ้าของร้านอนุญาตก่อนใช้งาน',
  access_denied: 'บัญชีนี้ยังไม่มีสิทธิ์ใช้งานร้าน',
  permission_denied: 'บัญชีนี้ยังไม่มีสิทธิ์ทำรายการนี้',
  owner_required: 'รายการนี้ต้องให้เจ้าของร้านทำ',
  insufficient_stock: 'สินค้าเหลือไม่พอ กรุณาเช็กยอดล่าสุด',
  revision_conflict: 'ยอดเปลี่ยนแล้ว กรุณาเช็กจำนวนใหม่',
  request_conflict: 'รายการเดิมมีข้อมูลไม่ตรงกัน กรุณาตรวจประวัติ',
  request_id_conflict: 'รายการเดิมมีข้อมูลไม่ตรงกัน กรุณาตรวจประวัติ',
  variant_not_found: 'ไม่พบสินค้านี้ กรุณาโหลดรายการใหม่',
  duplicate_variant: 'มีสินค้าสีและไซซ์นี้แล้ว',
  duplicate_sku: 'มีรหัสสินค้านี้แล้ว กรุณาใช้รหัสอื่น',
  no_change: 'จำนวนตรงกับยอดปัจจุบันแล้ว',
  invalid_request: 'กรุณาตรวจข้อมูลและจำนวนอีกครั้ง',
  request_pending: 'มีรายการที่ยังไม่ทราบผล กรุณาตรวจรายการเดิมก่อน',
  storage_unavailable: 'เครื่องนี้ยังเก็บรหัสรายการไม่ได้ กรุณาเปิด LINE อีกครั้งก่อนทำรายการ',
  network_error: 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจรายการเดิมก่อนส่งซ้ำ'
};

export class StockError extends Error {
  constructor(code, status = 0) {
    super(messages[code] || 'ยังทำรายการไม่สำเร็จ กรุณาลองใหม่');
    this.name = 'StockError'; this.code = code; this.status = status;
  }
}
const clone = value => JSON.parse(JSON.stringify(value));
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const intent = (action, fields) => JSON.stringify(canonical({ action, fields }));

/** No stock is cached as truth or changed optimistically; every write reaches the atomic RPC. */
export function createStockClient({ onChange = () => {}, onStatus = () => {} } = {}) {
  let initialized = null, snapshot = null, pending = null, mutation = null, mutationIntent = null, refreshPromise = null;
  let storageKey = null, needsReauth = false, enabled = false, streamConnected = false;
  let streamController = null, pollTimer = null, reconnectTimer = null, refreshTimer = null;
  let refreshQueued = false, disposed = false;
  const status = (message, state, code) => onStatus(message, { state, ...(code ? { code } : {}) });
  const active = () => ['OWNER', 'STAFF'].includes(snapshot?.user?.role);
  const visible = () => document.visibilityState !== 'hidden';

  function persistPending() {
    if (!storageKey) return false;
    try {
      if (pending) {
        const serialized = JSON.stringify(pending);
        sessionStorage.setItem(storageKey, serialized);
        return sessionStorage.getItem(storageKey) === serialized;
      }
      else sessionStorage.removeItem(storageKey);
      return true;
    } catch { return false; }
  }
  function loadPending() {
    pending = null;
    if (!storageKey) return;
    try {
      const entry = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (entry && WRITES.has(entry.action) && UUID.test(entry.request_id)
        && entry.fields && typeof entry.fields === 'object' && !Array.isArray(entry.fields)
        && !Object.hasOwn(entry.fields, 'action') && !Object.hasOwn(entry.fields, 'request_id')) pending = entry;
    } catch { /* Do not submit malformed local state. */ }
  }
  function acceptSnapshot(data) {
    // Stock never leaks into a pending/non-member screen, even if an upstream response is malformed.
    const permitted = ['OWNER', 'STAFF'].includes(data?.user?.role);
    snapshot = permitted ? data : { ...data, variants: [], summary: null };
    const nextKey = data?.user?.line_user_id && data?.shop?.id
      ? `${config.storageNamespace}:${data.shop.id}:${data.user.line_user_id}` : null;
    if (nextKey !== storageKey) { storageKey = nextKey; loadPending(); }
    onChange(snapshot);
    if (!permitted) stopStreams();
    return snapshot;
  }
  function credentials() {
    if (!initialized || !window.liff?.isLoggedIn()) throw new StockError('line_identity_required', 403);
    const idToken = window.liff.getIDToken() || '', accessToken = window.liff.getAccessToken() || '';
    if (!idToken || !accessToken) throw new StockError('line_identity_required', 403);
    return { 'x-line-id-token': idToken, 'x-line-access-token': accessToken };
  }
  async function request(action, fields = {}) {
    let response;
    try {
      response = await fetch(config.apiUrl, {
        method: 'POST', redirect: 'error',
        headers: { 'Content-Type': 'application/json', ...credentials() },
        body: JSON.stringify({ ...fields, action }), signal: AbortSignal.timeout(config.requestTimeoutMs)
      });
    } catch (error) {
      if (error instanceof StockError) throw error;
      throw new StockError('network_error');
    }
    let data;
    try { data = await response.json(); } catch { throw new StockError('network_error'); }
    if (!response.ok) {
      const code = typeof data?.error === 'string' ? data.error : 'stock_unavailable';
      if (['line_identity_required', 'identity_required'].includes(code)) {
        needsReauth = true; stopStreams(); status(messages.line_identity_required, 'login_required', code);
      }
      throw new StockError(code, response.status);
    }
    return data;
  }
  async function refresh({ force = false } = {}) {
    if (refreshPromise) {
      if (force) { try { await refreshPromise; } catch {} return refresh(); }
      refreshQueued = true; return refreshPromise;
    }
    refreshPromise = request('snapshot').then(acceptSnapshot);
    try { return await refreshPromise; }
    finally {
      refreshPromise = null;
      if (refreshQueued) { refreshQueued = false; scheduleRefresh(); }
    }
  }
  function scheduleRefresh() {
    if (refreshTimer || disposed || !active() || !visible()) return;
    refreshTimer = setTimeout(async () => {
      refreshTimer = null;
      try { await refresh(); } catch (error) { status(error.message, 'error', error.code); }
    }, 200);
  }
  async function connect({ startLogin = false } = {}) {
    if (!config.liffId) throw new StockError('line_login_not_configured', 503);
    const endpoint = new URL(config.liffEndpointUrl), current = new URL(location.href);
    if (current.origin !== endpoint.origin || !current.pathname.startsWith(endpoint.pathname)) {
      status('เปิดระบบหลังร้านผ่านแอป LINE เดิม', 'login_required');
      if (startLogin) location.assign(`https://liff.line.me/${encodeURIComponent(config.liffId)}/stock.html`);
      return null;
    }
    if (!window.liff) throw new StockError('line_login_not_configured', 503);
    if (!initialized) {
      let deadline;
      initialized = Promise.race([
        window.liff.init({ liffId: config.liffId }),
        new Promise((_, reject) => { deadline = setTimeout(() => reject(new StockError('line_connection_timeout')), 20000); })
      ]).catch(error => { initialized = null; throw error; }).finally(() => clearTimeout(deadline));
    }
    await initialized;
    if (needsReauth && startLogin) { window.liff.logout(); needsReauth = false; }
    if (!window.liff.isLoggedIn()) {
      status('เชื่อมต่อ LINE เพื่อใช้บัญชีเดิมของคุณ', 'login_required');
      if (startLogin) window.liff.login({ redirectUri: location.href });
      return null;
    }
    const data = await refresh();
    if (active()) { status('เชื่อมต่อร้านแล้ว', 'connected'); subscribe(); }
    return data;
  }
  async function performPending() {
    const entry = pending;
    if (!entry) throw new StockError('invalid_request', 422);
    try {
      const result = await request(entry.action, { ...entry.fields, request_id: entry.request_id });
      pending = null; persistPending();
      // A successful commit stays successful if the follow-up read has a network failure.
      try { await refresh({ force: true }); } catch (error) { status('บันทึกแล้ว แต่เช็กยอดล่าสุดยังไม่สำเร็จ', 'error', error.code); }
      notifyOtherTabs();
      return result;
    } catch (error) {
      const definitive = error instanceof StockError && error.status >= 400 && error.status < 500
        && ![401, 403, 429].includes(error.status) && !['request_conflict', 'request_id_conflict'].includes(error.code);
      if (definitive) { pending = null; persistPending(); }
      try { await refresh({ force: true }); } catch { /* Preserve the request ID when its result is unknown. */ }
      throw error;
    }
  }
  async function mutate(action, fields = {}) {
    if (!WRITES.has(action) || Object.hasOwn(fields, 'action') || Object.hasOwn(fields, 'request_id')) throw new StockError('invalid_request', 422);
    if (!active()) throw new StockError('permission_denied', 403);
    const safeFields = clone(fields);
    const nextIntent = intent(action, safeFields);
    if (mutation && mutationIntent !== nextIntent) throw new StockError('request_pending', 409);
    if (pending && intent(pending.action, pending.fields) !== nextIntent) throw new StockError('request_pending', 409);
    if (mutation) return mutation;
    if (!pending) {
      pending = { action, fields: safeFields, request_id: crypto.randomUUID() };
      // Save the request identity before any write, so a refresh or lost response
      // can only retry the same transaction. Fail before sending if storage fails.
      if (!persistPending()) { pending = null; throw new StockError('storage_unavailable'); }
    }
    mutationIntent = nextIntent; mutation = performPending();
    try { return await mutation; } finally { mutation = null; mutationIntent = null; }
  }
  async function restorePending() {
    if (!pending) return { found: false };
    const result = await request('request_status', { request_id: pending.request_id });
    if (result.found === true) {
      pending = null; persistPending();
      try { await refresh({ force: true }); } catch (error) { status(error.message, 'error', error.code); }
    }
    return result;
  }
  async function retryPending() {
    if (!pending) throw new StockError('invalid_request', 422);
    return mutate(pending.action, pending.fields);
  }

  function stopStreams() {
    streamController?.abort(); streamController = null; streamConnected = false;
    clearTimeout(pollTimer); clearTimeout(reconnectTimer); clearTimeout(refreshTimer);
    pollTimer = reconnectTimer = refreshTimer = null;
  }
  function startPoll() {
    if (pollTimer || !enabled || !active() || !visible() || disposed) return;
    pollTimer = setTimeout(async () => {
      pollTimer = null;
      try { await refresh(); } catch (error) { status(error.message, 'error', error.code); }
      startPoll();
    }, streamConnected ? config.streamHealthIntervalMs : config.refreshIntervalMs);
  }
  async function startStream() {
    if (streamController || !enabled || !active() || !visible() || disposed) return;
    const controller = new AbortController(); streamController = controller;
    const timeout = setTimeout(() => controller.abort(), 110000);
    let reader;
    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', ...credentials() },
        body: JSON.stringify({ action: 'watch' }), signal: controller.signal
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw new StockError('stream_unavailable');
      reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (!controller.signal.aborted) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
        if (buffer.length > 100000) throw new StockError('stream_unavailable');
        let split;
        while ((split = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, split); buffer = buffer.slice(split + 2);
          const event = /^event:\s*([^\n]+)$/m.exec(block)?.[1];
          if (event === 'connected') { streamConnected = true; status('ยอดสต๊อกอัปเดตอัตโนมัติ', 'connected'); }
          if (event === 'stock_changed') scheduleRefresh();
          if (event === 'access_revoked') { stopStreams(); scheduleRefresh(); break; }
        }
      }
    } catch { /* A bounded poll keeps actual database reads working during a stream outage. */ }
    finally {
      clearTimeout(timeout);
      try { await reader?.cancel(); } catch { /* Connection is already closed. */ }
      if (streamController === controller) { streamController = null; streamConnected = false; }
      if (enabled && active() && visible() && !disposed) {
        reconnectTimer = setTimeout(() => { reconnectTimer = null; startStream(); }, config.streamReconnectMs);
        startPoll();
      }
    }
  }
  function subscribe() {
    enabled = true; startPoll(); startStream();
    return () => { enabled = false; stopStreams(); };
  }
  let tabChannel = null;
  try {
    tabChannel = new BroadcastChannel('chaylueklab-stock-refresh');
    tabChannel.onmessage = event => { if (event.data?.shopId === snapshot?.shop?.id) scheduleRefresh(); };
  } catch { /* Supabase stream and polling also cover browsers without BroadcastChannel. */ }
  function notifyOtherTabs() { try { tabChannel?.postMessage({ shopId: snapshot?.shop?.id }); } catch {} }
  const visibilityChanged = () => {
    if (!visible()) stopStreams();
    else if (enabled && active()) { scheduleRefresh(); startPoll(); startStream(); }
  };
  document.addEventListener('visibilitychange', visibilityChanged);
  window.addEventListener('focus', visibilityChanged);
  function disconnect() {
    disposed = true; enabled = false; stopStreams(); tabChannel?.close();
    document.removeEventListener('visibilitychange', visibilityChanged);
    window.removeEventListener('focus', visibilityChanged);
  }
  return { connect, request, refresh, subscribe, disconnect, restorePending, retryPending, mutate,
    getPending: () => pending ? clone(pending) : null };
}
