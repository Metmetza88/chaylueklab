import { HttpError } from './platform-core.mjs';
const PROJECT_HOST = 'yobymeygbfiwlngmwjcn.supabase.co';
/** ส่ง JWT ของผู้ใช้ทุกคำขอเพื่อให้ RLS เป็นด่านตรวจสิทธิ์สุดท้าย */
export function createDatabase({ env, token, fetchImpl = fetch }) {
  const url = new URL(env.EDU_SUPABASE_URL);
  if (url.protocol !== 'https:' || url.hostname !== PROJECT_HOST || url.port || url.username || url.password) throw new HttpError(503, 'ตั้งค่าการเชื่อมต่อไม่ถูกต้อง');
  const key=env.EDU_SUPABASE_PUBLISHABLE_KEY??'';
  let legacyRole;
  try { legacyRole=JSON.parse(Buffer.from(key.split('.')[1]??'','base64url').toString()).role; } catch { /* คีย์แบบใหม่ไม่ใช่ JWT */ }
  if(key.startsWith('sb_secret_') || legacyRole==='service_role') throw new HttpError(503,'ต้องใช้ Publishable Key เท่านั้น');
  const headers = { apikey: env.EDU_SUPABASE_PUBLISHABLE_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  async function request(path, options = {}, profile = false) {
    const result = await fetchImpl(new URL(path, url), {
      ...options, signal: AbortSignal.timeout(8000),
      headers: { ...headers, ...(profile ? { 'Accept-Profile': 'education_2570', 'Content-Profile': 'education_2570' } : {}), ...options.headers }
    });
    if (!result.ok) {
      if (result.status === 401) throw new HttpError(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
      if (result.status === 403) throw new HttpError(403, 'ไม่มีสิทธิ์ดำเนินการ');
      throw new HttpError(503, 'ระบบข้อมูลยังไม่พร้อม กรุณาลองใหม่ภายหลัง');
    }
    return result.status === 204 ? null : result.json();
  }
  return {
    auth: (path, body) => request('/auth/v1/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    logout: () => request('/auth/v1/logout', { method: 'POST' }),
    provision: body => request('/rest/v1/rpc/provision_school_module', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}, true),
    select: (table, params) => request('/rest/v1/' + table + '?' + new URLSearchParams(params), {}, true),
    insert: (table, body) => request('/rest/v1/' + table, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(body) }, true),
    update: (table, id, body) => request('/rest/v1/' + table + '?id=eq.' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(body) }, true)
  };
}
