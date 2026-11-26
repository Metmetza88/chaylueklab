import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('../ai-money-studio/quote-flow-core.js');

test('sample demo contains exactly 30 rows and exact satang totals', () => {
  const { items, summary } = core.parseTable(core.sample);
  assert.equal(items.length, 30);
  assert.equal(summary.count, 30);
  assert.equal(summary.units, 60);
  assert.equal(summary.totalCents, 75000);
  assert.equal(summary.engine, 'deterministic-rules');
});

test('money calculation uses satang rather than accumulating floats', () => {
  const { summary } = core.parseTable('สินค้า,จำนวน,ราคาต่อหน่วย\nA,1,0.10\nB,1,0.20');
  assert.equal(summary.totalCents, 30);
  assert.equal(core.formatCents(summary.totalCents), '0.30');
});

test('Thai headers, Thai numerals, grouped prices and UTF-8 BOM', () => {
  const { summary } = core.parseTable('\uFEFFรายการ,จำนวน,ราคา\r\nสมุด,๒,"฿๑,๒๐๐.๕๐"');
  assert.equal(summary.totalCents, 240100);
});

test('tab separated rows are supported', () => {
  const { summary, delimiter } = core.parseTable('item\tqty\tunit price\nNotebook\t2\t12.50');
  assert.equal(delimiter, '\t');
  assert.equal(summary.totalCents, 2500);
});

test('semicolon delimited and quoted item text are supported', () => {
  const { summary } = core.parseTable('name;quantity;price\n"A; B";3;1.25');
  assert.equal(summary.lines[0].name, 'A; B');
  assert.equal(summary.totalCents, 375);
});

test('invalid or incomplete rows are rejected instead of silently skipped', () => {
  assert.throws(() => core.parseTable('สินค้า,จำนวน,ราคา\nA,1,3\nB,2'), /จำนวนช่อง/);
  assert.throws(() => core.parseTable('สินค้า,จำนวน,ราคา\nA,1,3\nB,two,4'), /แถวข้อมูลที่ 2/);
  assert.throws(() => core.parseTable('สินค้า,จำนวน,ราคา\n"Unclosed,2,12'), /เครื่องหมายคำพูดไม่ปิด/);
});

test('negative, fractional units and prices with more than 2 decimals are rejected', () => {
  assert.throws(() => core.calculate([{ name: 'A', quantity: '-1', unitPrice: '10.00' }]), /จำนวน/);
  assert.throws(() => core.calculate([{ name: 'A', quantity: '1.5', unitPrice: '10.00' }]), /จำนวน/);
  assert.throws(() => core.calculate([{ name: 'A', quantity: '1', unitPrice: '1.234' }]), /ทศนิยม/);
  assert.throws(() => core.calculate([{ name: 'A', quantity: '1', unitPrice: '-3' }]), /ราคาต้อง/);
});

test('empty item name and duplicate headers are rejected', () => {
  assert.throws(() => core.parseTable('สินค้า,จำนวน,ราคา\n,1,20'), /ชื่อสินค้า/);
  assert.throws(() => core.parseTable('สินค้า,ชื่อสินค้า,จำนวน,ราคา\nA,A,1,2'), /ซ้ำกัน/);
});

test('size and row limit protects the browser', () => {
  assert.throws(() => core.parseTable('X'.repeat(core.MAX_BYTES + 1)), /512 KB/);
  const over = 'สินค้า,จำนวน,ราคา\n' + Array.from({ length: core.MAX_ITEMS + 1 }, () => 'A,1,10').join('\n');
  assert.throws(() => core.parseTable(over), /500 แถว/);
});

test('zero price remains valid and quote totals are not claimed as AI', () => {
  const summary = core.calculate([{ name: '<script>non executable text</script>', quantity: '2', unitPrice: '0' }]);
  assert.equal(summary.totalCents, 0);
  assert.equal(summary.lines[0].name, '<script>non executable text</script>');
  assert.equal(summary.engine, 'deterministic-rules');
});
