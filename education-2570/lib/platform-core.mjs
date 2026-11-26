import { modules } from '../src/catalog.mjs';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
/** ตรวจ UUID ก่อนนำไปใช้ใน PostgREST เพื่อป้องกันการแทรกตัวกรอง */
export function requireId(value) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new HttpError(400, 'ข้อมูลอ้างอิงไม่ถูกต้อง');
  return value;
}
/** จำกัดความยาวข้อความและไม่ยอมรับชนิดข้อมูลอื่น */
export function requireText(value, max, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new HttpError(400, 'กรุณาตรวจสอบข้อมูลในแบบฟอร์ม');
  return value.trim();
}
/** ตรวจอีเมลด้วยการแบ่งส่วนแบบ O(n) ไม่ใช้ Regex ที่ย้อนหาจุดแบ่งซ้ำจนเกิด ReDoS */
export function isValidEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || /\s/.test(value)) return false;
  const parts = value.split('@');
  if (parts.length !== 2 || !parts[0].length || parts[0].length > 64) return false;
  const labels = parts[1].split('.');
  return labels.length > 1 && labels.every(label => label.length > 0 && label.length <= 63 &&
    /^[A-Za-z0-9-]+$/.test(label) && !label.startsWith('-') && !label.endsWith('-'));
}
/** รับเฉพาะรายการจากทะเบียนโปรแกรมและไม่รับราคาหรือสถานะจากผู้ใช้ */
export function validateQuotation(body) {
  requireId(body?.school_id);
  if (!Array.isArray(body.modules) || body.modules.length < 1 || body.modules.length > 17) throw new HttpError(400, 'กรุณาเลือกโปรแกรม');
  const slugs = [...new Set(body.modules)];
  if (!slugs.every(slug => modules.some(module => module.slug === slug))) throw new HttpError(400, 'ไม่พบโปรแกรมที่เลือก');
  return { school_id: body.school_id, module_slugs: slugs, note: requireText(body.note ?? '', 2000, 0), status: 'requested', currency: 'THB' };
}
/** ทุกการอ่านมีขนาดหน้าที่จำกัดและป้องกัน offset ติดลบ */
export function pagination(query = {}) {
  const page = Number(query.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new HttpError(400, 'หน้าที่ร้องขอไม่ถูกต้อง');
  return { limit: '25', offset: String((page - 1) * 25) };
}
/** ตรวจสมาชิกจากข้อมูลที่ยืนยันแล้ว ไม่ใช้ role จากฟอร์มหรือ user_metadata */
export function requireMembership(members, schoolId, adminOnly = false) {
  requireId(schoolId);
  const membership = members.find(m => m.school_id === schoolId);
  if (!membership || (adminOnly && membership.role !== 'admin')) throw new HttpError(403, 'ไม่มีสิทธิ์ในโรงเรียนนี้');
  return membership;
}
/** แยก Adapter AI ออกจากระบบจริง และไม่เรียก Provider ที่ยังไม่ได้รับอนุญาต */
export class DisabledAiAdapter {
  async generate() { throw new HttpError(503, 'ยังไม่เชื่อม AI Provider'); }
  get status() { return { connected: false, provider: null }; }
}
