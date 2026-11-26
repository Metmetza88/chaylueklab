import { modules, categories } from '../src/catalog.mjs';
import { HttpError, requireId, requireText, validateQuotation, pagination, requireMembership } from '../lib/platform-core.mjs';
import { createDatabase } from '../lib/supabase-client.mjs';
const GET = new Set(['config', 'catalog', 'me', 'workspace', 'quotations', 'services', 'notifications', 'profile', 'admin']);
const POST = new Set(['login', 'logout', 'quotation', 'service', 'entitlement', 'module-flag', 'service-status', 'notification-read', 'customer-profile', 'provision']);
const COOKIE = '__Host-edu_session';
/** แยก session cookie ที่ HttpOnly และไม่ส่ง access token กลับให้ JavaScript */
function readToken(request) {
  const match = String(request.headers?.cookie ?? '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  return match?.slice(COOKIE.length + 1).match(/^[A-Za-z0-9_.-]{1,8000}$/)?.[0];
}
function sessionCookie(token = '', expires = 0) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${expires}`;
}
/** ปฏิเสธ cross-origin write และบังคับ JSON เพื่อลด CSRF โดยไม่เชื่อ Host จากผู้ส่ง */
function checkOrigin(request, env) {
  if (!env.EDU_APP_ORIGIN || request.headers?.origin !== env.EDU_APP_ORIGIN) throw new HttpError(403, 'ต้นทางคำขอไม่ถูกต้อง');
  if (String(request.headers['content-type'] ?? '').split(';')[0].trim() !== 'application/json') throw new HttpError(415, 'รองรับเฉพาะ JSON');
  if (Buffer.byteLength(JSON.stringify(request.body ?? {})) > 12000) throw new HttpError(413, 'ข้อมูลมากเกินกำหนด');
}
/** API กลางจำกัดชื่อ action และตาราง รวม RBAC ระดับแอปกับ RLS ระดับฐานข้อมูล */
export function createEducationHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const action = request.query?.action;
      if (!(request.method === 'GET' && GET.has(action)) && !(request.method === 'POST' && POST.has(action))) throw new HttpError(405, 'ไม่รองรับการทำงานนี้');
      const configured = !!(env.EDU_SUPABASE_URL && env.EDU_SUPABASE_PUBLISHABLE_KEY && env.EDU_APP_ORIGIN);
      const platformEnabled = configured && env.EDU_PLATFORM_ENABLED === 'true';
      if (action === 'config') return response.status(200).json({ authConfigured: configured, platformEnabled, aiConnected: false });
      if (action === 'catalog') return response.status(200).json({ categories, modules });
      if (request.method === 'POST') checkOrigin(request, env);
      if (action === 'logout') {
        response.setHeader('Set-Cookie', sessionCookie());
        const token = readToken(request);
        if (configured && token) { try { await createDatabase({ env, token, fetchImpl }).logout(); } catch { /* ล้าง cookie แม้เครือข่ายขัดข้อง */ } }
        return response.status(200).json({ signedOut: true });
      }
      if (!configured) throw new HttpError(503, 'ระบบบัญชียังไม่เชื่อมต่อ กรุณาใช้หน้าสาธิต');
      if (action === 'login') {
        const email = requireText(request.body?.email, 254);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'อีเมลไม่ถูกต้อง');
        requireText(request.body?.password, 256, 1);
        const password = request.body.password;
        let session;
        try { session = await createDatabase({ env, fetchImpl }).auth('token?grant_type=password', { email, password }); }
        catch (error) { if (error.status === 503 || error.status === 401) throw new HttpError(401, 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจอีเมลและรหัสผ่าน'); throw error; }
        if (!/^[A-Za-z0-9_.-]{1,8000}$/.test(session?.access_token ?? '')) throw new HttpError(503, 'ระบบบัญชีส่งข้อมูลไม่สมบูรณ์');
        response.setHeader('Set-Cookie', sessionCookie(session.access_token, Math.min(Number(session.expires_in) || 3600, 3600)));
        return response.status(200).json({ signedIn: true });
      }
      const token = readToken(request);
      if (!token) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');
      const db = createDatabase({ env, token, fetchImpl });
      const user = await db.auth('user');
      requireId(user?.id);
      const members = await db.select('members', { select: 'school_id,role,schools(name)', user_id: 'eq.' + user.id, limit: '100' });
      if (action === 'me') return response.status(200).json({ id: user.id, email: user.email, members, platformEnabled });
      if (!platformEnabled) throw new HttpError(503, 'พื้นที่ทำงานยังไม่เปิดใช้งาน รอการตรวจฐานข้อมูล');
      const page = pagination(request.query);
      const isPlatformAdmin = async () => {
        const admins = await db.select('platform_admins', { select: 'user_id', user_id: 'eq.' + user.id, limit: '1' });
        if (!admins.length) throw new HttpError(403, 'เฉพาะผู้ดูแลแพลตฟอร์ม');
      };
      if (['admin', 'entitlement', 'module-flag', 'service-status', 'provision'].includes(action)) await isPlatformAdmin();
      if (action === 'admin') {
        const [schools, customers, licenses, entitlements, products, services, quotations, audit] = await Promise.all([
          db.select('schools', { select: 'id,name', order: 'id', ...page }),
          db.select('customers', { select: 'id,school_id,contact_name,created_at', order: 'created_at.desc', ...page }),
          db.select('licenses', { select: 'id,school_id,module_slug,status,expires_at', order: 'created_at.desc', ...page }),
          db.select('school_module_entitlements', { select: '*', order: 'created_at.desc', ...page }),
          db.select('software_modules', { select: 'slug,name,status,enabled', order: 'slug', limit: '100' }),
          db.select('service_requests', { select: '*', order: 'created_at.desc', ...page }),
          db.select('quotation_requests', { select: '*', order: 'created_at.desc', ...page }),
          db.select('audit_logs', { select: 'id,school_id,action,table_name,created_at', order: 'created_at.desc', ...page })
        ]);
        return response.status(200).json({ schools, customers, licenses, entitlements, products, services, quotations, audit, page: Number(request.query?.page ?? 1) });
      }
      if (action === 'provision') {
        const body=request.body;
        requireId(body?.school_id);
        if (!modules.some(m=>m.slug===body.module_slug) || !/^\d{4}-\d{2}-\d{2}$/.test(body.expires_on??'')) throw new HttpError(400,'ข้อมูลโปรแกรมหรือวันสิ้นสุดไม่ถูกต้อง');
        const expiry=body.expires_on+'T23:59:59+07:00';
        if (!Number.isFinite(Date.parse(expiry)) || Date.parse(expiry)<=Date.now()) throw new HttpError(400,'กรุณาระบุวันสิ้นสุดในอนาคต');
        return response.status(201).json(await db.provision({p_school_id:body.school_id,p_module_slug:body.module_slug,p_expires_at:expiry}));
      }
      if (action === 'module-flag') {
        const slug = requireText(request.body?.slug, 60);
        if (!modules.some(m => m.slug === slug) || typeof request.body.enabled !== 'boolean') throw new HttpError(400, 'ข้อมูลไม่ถูกต้อง');
        const rows = await db.select('software_modules', { select: 'id', slug: 'eq.' + slug, limit: '1' });
        if (!rows.length) throw new HttpError(404, 'ไม่พบโปรแกรม');
        return response.status(200).json(await db.update('software_modules', requireId(rows[0].id), { enabled: request.body.enabled }));
      }
      if (action === 'entitlement') {
        const body = request.body;
        if (!['active', 'suspended', 'revoked'].includes(body?.status)) throw new HttpError(400, 'สถานะไม่ถูกต้อง');
        return response.status(200).json(await db.update('school_module_entitlements', requireId(body.id), { status: body.status }));
      }
      if (action === 'service-status') {
        if (!['open', 'in_progress', 'resolved'].includes(request.body?.status)) throw new HttpError(400, 'สถานะไม่ถูกต้อง');
        return response.status(200).json(await db.update('service_requests', requireId(request.body.id), { status: request.body.status }));
      }
      if (action === 'notification-read') return response.status(200).json(await db.update('notifications', requireId(request.body?.id), { read_at: new Date().toISOString() }));
      const schoolId = request.method === 'POST' ? request.body?.school_id : request.query?.school_id;
      const membership = requireMembership(members, schoolId);
      if (action==='quotation' && !['admin','teacher'].includes(membership.role)) throw new HttpError(403,'เฉพาะเจ้าหน้าที่โรงเรียนที่ขอใบเสนอราคาได้');
      if (action === 'profile' || action === 'customer-profile') {
        const rows=await db.select('customers',{select:'id,contact_name',school_id:'eq.'+schoolId,user_id:'eq.'+user.id,limit:'1'});
        if(action==='profile') return response.status(200).json(rows);
        const name=requireText(request.body?.contact_name,200);
        return response.status(200).json(rows.length?await db.update('customers',requireId(rows[0].id),{contact_name:name}):await db.insert('customers',{school_id:schoolId,user_id:user.id,contact_name:name}));
      }
      if (action === 'workspace') {
        const [schools, entitlements, notifications, licenses] = await Promise.all([
          db.select('schools', { select: 'id,name', id: 'eq.' + schoolId, limit: '1' }),
          db.select('school_module_entitlements', { select: 'id,module_slug,status,starts_at,expires_at,licenses(status,expires_at),software_modules(name,enabled,status)', school_id: 'eq.' + schoolId, order: 'module_slug', ...page }),
          db.select('notifications', { select: '*', school_id: 'eq.' + schoolId, order: 'created_at.desc', ...page }),
          db.select('licenses', { select: 'id,module_slug,status,expires_at', school_id: 'eq.' + schoolId, order: 'created_at.desc', ...page })
        ]);
        return response.status(200).json({ school: schools[0] ?? null, entitlements, notifications, licenses });
      }
      if (['quotations', 'services', 'notifications'].includes(action)) {
        const table = { quotations: 'quotation_requests', services: 'service_requests', notifications: 'notifications' }[action];
        return response.status(200).json(await db.select(table, { select: '*', school_id: 'eq.' + schoolId, order: 'created_at.desc', ...page }));
      }
      if (action === 'quotation') return response.status(201).json(await db.insert('quotation_requests', { ...validateQuotation(request.body), created_by: user.id }));
      if (action === 'service') return response.status(201).json(await db.insert('service_requests', { school_id: schoolId, created_by: user.id, subject: requireText(request.body?.subject, 200), description: requireText(request.body?.description, 4000), status: 'open' }));
      throw new HttpError(405, 'ไม่รองรับการทำงานนี้');
    } catch (error) {
      return response.status(error instanceof HttpError ? error.status : 503).json({ error: error instanceof HttpError ? error.message : 'ระบบไม่พร้อมให้บริการ กรุณาลองใหม่ภายหลัง' });
    }
  };
}
export default createEducationHandler();
