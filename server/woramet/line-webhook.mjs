/** WORAMET-only LINE Messaging API bridge. No AI provider, database or customer data. */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const insights = require('../../ai-money-studio/business-insights-core.js');
const LIMIT = 64 * 1024;
const MAX_EVENTS = 20;
const ENDPOINT = 'https://api.line.me/v2/bot/message/reply';
const json = (status, value) => Response.json(value, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
} });

export function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!Buffer.isBuffer(rawBody) || typeof channelSecret !== 'string' || !channelSecret ||
      typeof signature !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const received = Buffer.from(signature, 'base64');
  const expected = createHmac('sha256', channelSecret).update(rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function readBounded(request) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > LIMIT)) throw Error('too_large');
  if (!request.body) throw Error('bad_body');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > LIMIT) { await reader.cancel(); throw Error('too_large'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}

export function replyForText(input) {
  const command = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ').toLowerCase() : '';
  if (['เริ่ม', 'เริ่มใช้งาน', 'เมนู', 'help', 'start'].includes(command)) {
    return 'WORAMET AI LAB (รุ่นทดลอง)\n\nพิมพ์คำสั่ง:\n• สรุปยอดขายตัวอย่าง\n• ใบเสนอราคา\n• ส่งเอกสาร\n• สร้างรูป\n\nขณะนี้ยังไม่มี AI สร้างข้อความ/ภาพหรือข้อมูลร้านจริงเชื่อมต่อ';
  }
  if (['สรุปยอดขายตัวอย่าง', 'ทดลอง', 'demo'].includes(command)) {
    const report = insights.analyze(insights.sample);
    return ['📊 รายงานจากข้อมูลสมมติ (ไม่ใช่ยอดขายจริง)', 'ยอดขายรวม: ฿' + insights.money(report.revenueCents),
      'จำนวนสินค้า: ' + report.units + ' ชิ้น', 'รายการ: ' + report.rowCount + ' แถว',
      'สินค้าขายดี: ' + report.rank[0].product, '', 'คำนวณด้วยสูตร ไม่ใช่ Generative AI'].join('\n');
  }
  if (command === 'สรุปยอดขาย' || command === 'ยอดขายวันนี้') {
    return 'ยังไม่ได้เชื่อมยอดขายร้านจริง จึงไม่สามารถรายงานยอดขายวันนี้ได้\nพิมพ์ “สรุปยอดขายตัวอย่าง” เพื่อทดลองข้อมูลสมมติ';
  }
  if (['ใบเสนอราคา', 'ส่งเอกสาร', 'สร้างรูป', 'ทำแบบ 3d', 'ถาม ai'].includes(command)) {
    return 'ฟังก์ชันนี้อยู่ระหว่างเตรียมเชื่อมต่อ ยังไม่เปิดใช้งานจริงและยังไม่คิดค่าบริการ\nพิมพ์ “เมนู” เพื่อดูคำสั่งที่ทดลองได้';
  }
  return 'WORAMET AI LAB รุ่นทดลอง: พิมพ์ “เมนู” เพื่อดูคำสั่งที่รองรับ (ยังไม่ใช่ AI สนทนา)';
}

export async function sendLineReply(payload, token, fetchImpl = fetch) {
  const response = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw Error('line_reply_failed');
}

/** Inject sendReply for offline tests. No outbound requests until configured and invoked. */
export function createLineWebhookHandler({ channelSecret, channelAccessToken, sendReply = sendLineReply } = {}) {
  return async request => {
    if (new URL(request.url).pathname !== '/webhooks/line') return json(404, { error: 'not_found' });
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
    if (!channelSecret || !channelAccessToken || typeof sendReply !== 'function') return json(503, { error: 'line_not_configured' });
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json(415, { error: 'json_required' });
    let raw;
    try { raw = await readBounded(request); } catch { return json(413, { error: 'invalid_body_or_too_large' }); }
    if (!verifyLineSignature(raw, request.headers.get('x-line-signature'), channelSecret)) return json(401, { error: 'invalid_signature' });
    let payload;
    try { payload = JSON.parse(raw.toString('utf8')); } catch { return json(400, { error: 'invalid_json' }); }
    if (!payload || !Array.isArray(payload.events) || payload.events.length > MAX_EVENTS) return json(400, { error: 'invalid_events' });
    try {
      for (const event of payload.events) {
        // Direct 1:1 demo only. Never process shop/group chats or real files here.
        if (event?.source?.type !== 'user' || event.type !== 'message') continue;
        const token = event.replyToken;
        if (typeof token !== 'string' || token.length < 8 || token.length > 200) continue;
        const text = event.message?.type === 'text' ? replyForText(event.message.text) :
          'รุ่นทดลองยังไม่รับไฟล์หรือรูปภาพจริง กรุณาพิมพ์ “เมนู”';
        await sendReply({ replyToken: token, messages: [{ type: 'text', text }] }, channelAccessToken);
      }
    } catch { return json(502, { error: 'reply_unavailable' }); }
    return json(200, { ok: true });
  };
}
