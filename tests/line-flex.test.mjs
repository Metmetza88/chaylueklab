import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reminderConfirmationFlex, dailySummaryFlex, financeConfirmationFlex } from '../supabase/functions/_shared/line-flex.ts';
import { newsroomConfig } from '../data/newsroom-config.js';

function nodes(message) {
  const found = [];
  function visit(value) { if (!value || typeof value !== 'object') return; if (value.type) found.push(value); for (const child of Object.values(value)) Array.isArray(child) ? child.forEach(visit) : visit(child); }
  visit(message); return found;
}
test('reminder Flex carries the saved title, Bangkok time and existing LIFF without secrets', () => {
  const card = reminderConfirmationFlex('นัดกับลูกค้า', '2026-10-06T18:30:00Z');
  const components = nodes(card);
  assert.ok(components.some(item => item.type === 'text' && item.text === '01:30'));
  assert.ok(components.some(item => item.type === 'text' && item.text === 'นัดกับลูกค้า'));
  assert.ok(components.some(item => item.type === 'text' && item.text === '7 ตุลาคม 2569'));
  assert.equal(components.find(item => item.type === 'uri').uri, `https://liff.line.me/${newsroomConfig.liffId}`);
  assert.ok(Buffer.byteLength(JSON.stringify(card)) < 30 * 1024);
  assert.doesNotMatch(JSON.stringify(card), /sb_secret_|sk_live_|accessToken|idToken/);
});
test('long reminder alt text respects the LINE limit; account values stay literal text', () => {
  const title = '<img src=x onerror=alert(1)>'.repeat(20);
  const card = reminderConfirmationFlex(title, '2026-10-06T18:30:00Z');
  assert.ok(Array.from(card.altText).length <= 400);
  assert.ok(nodes(card).some(item => item.type === 'text' && item.text === title));
  assert.throws(() => reminderConfirmationFlex('test', 'invalid'));
});
test('summary and money templates reject invalid authoritative values', () => {
  assert.throws(() => dailySummaryFlex({ completed: 1, pending: -1, overdue: 0 }));
  assert.throws(() => financeConfirmationFlex({ title: 'เงินเข้า', type: 'income', amount: NaN }));
  const summary = dailySummaryFlex({ completed: 4, pending: 7, overdue: 2 });
  assert.match(summary.altText, /เสร็จ 4 ค้าง 7 เลยกำหนด 2/);
});
test('animated brand header meets LINE image and APNG playback limits', () => {
  const png = readFileSync(new URL('../assets/line-header.png', import.meta.url));
  assert.ok(png.length <= 300 * 1024, 'LINE animated images must be at most 300 KB');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let frames = 0, plays = -1, duration = 0;
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8), start = offset + 8;
    assert.ok(start + length + 4 <= png.length, 'PNG chunks must fit the file');
    if (type === 'IHDR') {
      assert.equal(png.readUInt32BE(start), 640);
      assert.equal(png.readUInt32BE(start + 4), 240);
    }
    if (type === 'acTL') { frames = png.readUInt32BE(start); plays = png.readUInt32BE(start + 4); }
    if (type === 'fcTL') duration += png.readUInt16BE(start + 20) / (png.readUInt16BE(start + 22) || 100);
    offset = start + length + 4;
  }
  assert.equal(frames, 16);
  assert.equal(plays, 1, 'The subtle light pass plays once');
  assert.equal(duration, 4);
  const hero = reminderConfirmationFlex('ทดสอบ', '2026-10-07T02:00:00Z').contents.hero;
  assert.equal(hero.animated, true);
  assert.equal(new URL(hero.url).protocol, 'https:');
});
