import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createLineWebhookHandler, verifyLineSignature, replyForText, sendLineReply } from '../../server/woramet/line-webhook.mjs';
import { createLinePreviewServer } from '../../server/woramet/line-preview.mjs';
const secret = 'TEST_ONLY_LINE_CHANNEL_SECRET';
const accessToken = 'TEST_ONLY_LINE_ACCESS_TOKEN';
const event = (text, extra = {}) => ({ type: 'message', source: { type: 'user', userId: 'Utest' }, replyToken: 'test-reply-token-0001', message: { type: 'text', text }, ...extra });
function signed(body, { signature, headers = {} } = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const sig = signature ?? createHmac('sha256', secret).update(raw).digest('base64');
  return new Request('http://localhost/webhooks/line', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-line-signature': sig, ...headers }, body: raw });
}
function setup() {
  const calls = [];
  const handler = createLineWebhookHandler({ channelSecret: secret, channelAccessToken: accessToken,
    sendReply: async (payload, token) => calls.push({ payload, token }) });
  return { handler, calls };
}
test('valid raw-body signature passes and altered payload fails', () => {
  const raw = Buffer.from('{"events":[]}');
  const signature = createHmac('sha256', secret).update(raw).digest('base64');
  assert.equal(verifyLineSignature(raw, signature, secret), true);
  assert.equal(verifyLineSignature(Buffer.from('{"events":[1]}'), signature, secret), false);
  assert.equal(verifyLineSignature(raw, 'not-base64', secret), false);
  assert.equal(verifyLineSignature(raw, signature, ''), false);
});
test('no credentials fail closed; wrong route and method are rejected', async () => {
  const unconfigured = createLineWebhookHandler();
  assert.equal((await unconfigured(signed({ events: [] }))).status, 503);
  const { handler } = setup();
  assert.equal((await handler(new Request('http://localhost/nope'))).status, 404);
  assert.equal((await handler(new Request('http://localhost/webhooks/line'))).status, 405);
});
test('invalid signature, content type and malformed JSON are rejected', async () => {
  const { handler, calls } = setup();
  assert.equal((await handler(signed({ events: [] }, { signature: 'bogus' }))).status, 401);
  assert.equal((await handler(signed({ events: [] }, { headers: { 'Content-Type': 'text/plain' } }))).status, 415);
  assert.equal((await handler(signed('{"events":'))).status, 400);
  assert.equal(calls.length, 0);
});
test('large bodies and oversized event batches are rejected', async () => {
  const { handler, calls } = setup();
  assert.equal((await handler(signed(' '.repeat(65537)))).status, 413);
  assert.equal((await handler(signed({ events: Array(21).fill({}) }))).status, 400);
  assert.equal(calls.length, 0);
});
test('LINE verification with no events succeeds without replies', async () => {
  const { handler, calls } = setup();
  assert.equal((await handler(signed({ events: [] }))).status, 200);
  assert.equal(calls.length, 0);
});
test('menu and sample report use real local deterministic core, not AI', async () => {
  const { handler, calls } = setup();
  const response = await handler(signed({ events: [event('เมนู'), event('สรุปยอดขายตัวอย่าง', { replyToken: 'test-reply-token-0002' })] }));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0].payload.messages[0].text, /WORAMET AI LAB/);
  assert.match(calls[1].payload.messages[0].text, /7,200/);
  assert.match(calls[1].payload.messages[0].text, /ข้อมูลสมมติ/);
  assert.equal(calls[1].token, accessToken);
});
test('never claims live sales, AI, document reading or image generation', () => {
  assert.match(replyForText('ยอดขายวันนี้'), /ยังไม่ได้เชื่อม/);
  assert.match(replyForText('สร้างรูป'), /ยังไม่เปิดใช้งานจริง/);
  assert.match(replyForText('ส่งเอกสาร'), /ยังไม่เปิดใช้งานจริง/);
  assert.match(replyForText('ถาม AI'), /ยังไม่เปิดใช้งานจริง/);
});
test('group messages are ignored; non-text private messages get a safe notice', async () => {
  const { handler, calls } = setup();
  const group = event('เมนู', { source: { type: 'group', groupId: 'Ctest' } });
  const image = event('', { message: { type: 'image', id: '123' }, replyToken: 'test-reply-token-0002' });
  assert.equal((await handler(signed({ events: [group, image] }))).status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].payload.messages[0].text, /ยังไม่รับไฟล์หรือรูปภาพ/);
});
test('outbound failures are masked without leaking tokens', async () => {
  const handler = createLineWebhookHandler({ channelSecret: secret, channelAccessToken: accessToken,
    sendReply: async () => { throw Error('TEST_ONLY_LINE_ACCESS_TOKEN secret'); } });
  const response = await handler(signed({ events: [event('เมนู')] }));
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /TEST_ONLY|secret/);
});
test('reply transport targets only official LINE API and uses bearer header', async () => {
  let call;
  await sendLineReply({ replyToken: 'test-token', messages: [{ type: 'text', text: 'hello' }] }, 'test-bearer', async (url, opts) => {
    call = { url, opts }; return { ok: true };
  });
  assert.equal(call.url, 'https://api.line.me/v2/bot/message/reply');
  assert.equal(call.opts.headers.Authorization, 'Bearer test-bearer');
});
test('local preview listens on loopback for signed offline smoke test', async () => {
  const calls = [];
  const server = createLinePreviewServer({ channelSecret: secret, channelAccessToken: accessToken,
    sendReply: async payload => calls.push(payload) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const body = JSON.stringify({ events: [event('เมนู')] });
    const sig = createHmac('sha256', secret).update(body).digest('base64');
    const response = await fetch(base + '/webhooks/line', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-line-signature': sig }, body });
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal((await fetch(base + '/')).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
