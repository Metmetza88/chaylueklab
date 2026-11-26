const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAFF_ROLES = new Set(['admin', 'teacher']);
export class InputError extends Error {
  constructor(message) { super(message); this.name = 'InputError'; }
}
/** ตรวจสอบคำขอโดยไม่รับราคาที่ผู้ใช้ส่งมา */
export function validateQuote(body) {
  if (!body || typeof body !== 'object' || !UUID_PATTERN.test(body.school_id)) throw new InputError('invalid school');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new InputError('invalid item count');
  const items = body.items.map((item) => {
    if (!item || !UUID_PATTERN.test(item.catalog_id) ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) throw new InputError('invalid item');
    return { catalog_id: item.catalog_id, quantity: item.quantity };
  });
  return { school_id: body.school_id, items };
}
/** ตรวจสอบสิทธิ์เจ้าหน้าที่ในโรงเรียนที่ขอใบเสนอราคา */
export function isSchoolStaff(memberships, schoolId) {
  return memberships.some((member) => member.school_id === schoolId && STAFF_ROLES.has(member.role));
}
/** แปลงราคาจาก Supabase เป็นสตางค์โดยไม่ใช้การปัดเศษแบบ float */
export function toSatang(price) {
  if (typeof price !== 'string' && typeof price !== 'number') throw new InputError('invalid price');
  const text = String(price);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) throw new InputError('invalid price');
  const [baht, fraction = ''] = text.split('.');
  const value = Number(baht) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(value)) throw new InputError('price too large');
  return value;
}
/** ใช้ Map เพื่อลดเวลาค้นหาสินค้าจาก O(n × m) เป็น O(n + m) */
export function calculateEstimate(quote, publishedCatalog) {
  const catalogById = new Map(publishedCatalog.map((entry) => [entry.id, entry]));
  let totalSatang = 0;
  const items = quote.items.map(({ catalog_id: catalogId, quantity }) => {
    const program = catalogById.get(catalogId);
    if (!program || program.price == null) throw new InputError('unavailable item');
    const unitPriceSatang = toSatang(program.price);
    const itemTotal = unitPriceSatang * quantity;
    if (!Number.isSafeInteger(itemTotal) || !Number.isSafeInteger(totalSatang + itemTotal)) throw new InputError('total too large');
    totalSatang += itemTotal;
    return { program_id: program.program_id, quantity, unit_price: unitPriceSatang / 100 };
  });
  return { school_id: quote.school_id, items, total: totalSatang / 100, currency: 'THB', persisted: false };
}
