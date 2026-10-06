import test from 'node:test';
import assert from 'node:assert/strict';
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
