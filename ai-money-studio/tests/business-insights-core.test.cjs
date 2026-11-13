'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../business-insights-core.js');
const csv = row => 'product,quantity,unit_price\n' + row;
const days = (values, start = 1) => 'date,product,quantity,unit_price\n' + values.map((n, i) => `2026-11-${String(i + start).padStart(2, '0')},Sample,1,${n}`).join('\n');

test('decimal arithmetic is exact in satang (0.10 + 0.20 = 0.30)', () => {
  const r = core.analyze(csv('A,1,0.10\nB,1,0.20')); assert.equal(r.revenueCents, 30);
  assert.equal(r.rank[0].revenueCents, 20); assert.equal(r.engine, 'deterministic-rules');
});
test('Thai headers, Thai digits, quoted thousands and Buddhist dates', () => {
  const r = core.analyze('\uFEFFวันที่,ชื่อสินค้า,จำนวนสินค้า,ราคาต่อหน่วย\r\n๑/๑๑/๒๕๖๙,สมุด,๒,"฿๑,๒๐๐.๕๐"');
  assert.equal(r.revenueCents, 240100); assert.equal(r.daily[0].date, '2026-11-01');
});
test('English aliases are case insensitive and reordered columns work', () => {
  const r = core.analyze(' UNIT PRICE , QTY , Product_Name ,sale_date\n12.50,2,Pen,2026-11-01');
  assert.equal(r.revenueCents, 2500); assert.equal(r.units, 2);
});
test('semicolon/tab delimiters work, including commas and escaped quotes in product', () => {
  for (const delimiter of [';', '\t']) {
    const r = core.analyze(['product', 'quantity', 'price'].join(delimiter) + '\n' + ['"Blue, ""White"""', '2', '"1,200.50"'].join(delimiter));
    assert.equal(r.revenueCents, 240100); assert.equal(r.rank[0].product, 'Blue, "White"'); assert.equal(r.delimiter, delimiter);
  }
});
test('empty physical lines do not pollute following rows or reported line numbers', () => {
  assert.equal(core.analyze('\nproduct,quantity,price\r\n\r\nA,1,2\r\n\r\nB,2,3\r\n').revenueCents, 800);
  assert.throws(() => core.analyze('product,quantity,price\n\nA,1,no'), /แถวที่ 3/);
  assert.throws(() => core.analyze('\n\nproduct,quantity,price\n\nA,1,no'), /แถวที่ 5/);
  assert.throws(() => core.analyze('\tproduct\tqty\tprice\nX\tA\t1\t2'), /หัวคอลัมน์/);
});
test('absent dates allow totals but never assert a trend; extra private columns are discarded', () => {
  const r = core.analyze('customer,product,quantity,price\nPRIVATE_CUSTOMER,A,1,2');
  assert.equal(r.daily.length, 0); assert.equal(r.trend.available, false); assert.equal(r.ignoredColumns, 1);
  assert.doesNotMatch(JSON.stringify(r), /PRIVATE_CUSTOMER/); assert.doesNotMatch(core.reportText(r), /PRIVATE_CUSTOMER/);
});
test('zero-price items are allowed and no Infinity/NaN shares or claims are emitted', () => {
  const r = core.analyze(csv('A,1,0\nB,2,0'));
  assert.equal(r.revenueCents, 0); assert.match(r.tips.join(' '), /ยอดขายเป็นศูนย์/);
  assert.doesNotMatch(core.reportText(r), /NaN|Infinity/);
});
test('revenue winner and units winner differ; ties sort deterministically', () => {
  const r = core.analyze(csv('Expensive,1,100\nMany,5,1\nAlpha,1,100'));
  assert.equal(r.rank[0].product, 'Alpha'); assert.equal(r.topUnits.product, 'Many');
});
test('repeated rows count as separate sales; product normalization combines canonical names', () => {
  const r = core.analyze(csv('Café,1,1\nCafe\u0301,1,1'));
  assert.equal(r.productCount, 1); assert.equal(r.rowCount, 2); assert.equal(r.units, 2);
});
test('14 consecutive dates compare equal 7-day periods irrespective of row order', () => {
  const text = days([...Array(7).fill(10), ...Array(7).fill(20)]);
  const [header, ...rows] = text.split('\n'); const r = core.analyze([header, ...rows.reverse()].join('\n'));
  assert.deepEqual(r.trend, { available: true, previousCents: 7000, currentCents: 14000, changePercent: 100,
    previousStart: '2026-11-01', previousEnd: '2026-11-07', currentStart: '2026-11-08', currentEnd: '2026-11-14' });
});
test('missing dates, too few days and duplicated days never invent a trend', () => {
  for (const text of [days(Array(13).fill(1)), days(Array(15).fill(1)).replace('2026-11-08,Sample,1,1\n', ''), days(Array(7).fill(1)) + '\n2026-11-07,Sample,1,10']) {
    assert.equal(core.analyze(text).trend.available, false);
  }
});
test('zero trend baseline does not divide by zero; declining sales are negative', () => {
  assert.equal(core.analyze(days([...Array(7).fill(0), ...Array(7).fill(20)])).trend.changePercent, null);
  assert.equal(core.analyze(days([...Array(7).fill(20), ...Array(7).fill(10)])).trend.changePercent, -50);
});
test('only latest 14 days are compared; older missing dates do not corrupt periods', () => {
  const r = core.analyze(days(Array(14).fill(10), 2) + '\n2026-10-01,Sample,1,100');
  assert.equal(r.trend.available, true); assert.equal(r.trend.previousStart, '2026-11-02');
});
test('date validation checks leap years and always interprets slash dates as day/month/year', () => {
  assert.equal(core.parseDate('29/02/2567'), '2024-02-29'); assert.equal(core.parseDate('01/02/2026'), '2026-02-01');
  for (const value of ['2026-02-29', '31/04/2026', '2026-13-01', '2026-00-01', '1/2/26', '11/13/2026', '2026-11-01T00:00:00Z', '', '2026-11-00', '1899-01-01']) assert.equal(core.parseDate(value), null, value);
});
const invalidCases = [
  ['blank quantity', 'A,,10'], ['negative quantity', 'A,-1,10'], ['zero quantity', 'A,0,10'],
  ['fractional units', 'A,1.5,10'], ['blank price', 'A,1,'], ['negative price', 'A,1,-10'],
  ['scientific notation', 'A,1,1e3'], ['hex price', 'A,1,0x10'], ['NaN', 'A,1,NaN'], ['infinity', 'A,1,Infinity'],
  ['bad thousands', 'A,1,"12,34"'], ['decimal comma', 'A,1,"1,20"'], ['fraction of satang', 'A,1,0.001'],
  ['excess quantity', 'A,10000001,10'], ['excess price', 'A,1,100000001'], ['unsafe line amount', 'A,10000000,100000000'],
  ['empty name', ',1,10'], ['long name', 'x'.repeat(161) + ',1,10'], ['multiline name', '"A\nB",1,10'],
  ['Unicode line separator', 'A\u2028B,1,10'], ['C1 control', 'A\u0085B,1,10'], ['bidi spoof', '\u202eabc,1,10'], ['NUL', 'A\u0000,1,10'], ['replacement char', 'A\ufffd,1,10'],
  ['trailing columns', 'A,1,10,extra'], ['missing columns', 'A,1'], ['empty delimited row', ',,'],
  ['broken quotes', '"A,1,10'], ['quote in unquoted value', 'A"B,1,10'], ['junk after quote', '"A"x,1,10']
];
for (const [name, row] of invalidCases) test('rejects ' + name, () => assert.throws(() => core.analyze(csv(row))));
for (const header of ['product,qty,quantity,price', 'product,quantity,price,unit_price', 'product,product,quantity,price', 'product,,quantity,price', 'product,price', 'product,quantity,price,date,sale_date']) {
  test('rejects missing/duplicate/ambiguous header: ' + header, () => assert.throws(() => core.analyze(header + '\nA,1,10,2,3')));
}
test('invalid or missing date in a present date column rejects the entire dataset', () => {
  for (const date of ['', '2026-02-30', 'hello']) assert.throws(() => core.analyze('date,product,qty,price\n' + date + ',A,1,10'), /วันที่/);
});
test('safe totals cannot overflow even when each individual line is safe', () => {
  assert.throws(() => core.analyze(csv('A,1000000,50000000\nB,1000000,50000000')), /ยอดรวม/);
});
test('size, row and column limits cover pasted text too', () => {
  assert.throws(() => core.analyze('ก'.repeat(700000)), /2 MB/);
  assert.throws(() => core.analyze('product,qty,price\n' + 'A,1,1\n'.repeat(10001)), /10,000/);
  assert.throws(() => core.analyze(Array(65).fill('a').join(',') + '\nA'), /64/);
  assert.equal(core.analyze('product,qty,price\n' + 'A,1,1\n'.repeat(10000)).rowCount, 10000);
});
test('UTF-8 BOM, UTF-16 LE/BE BOM and explicit Windows-874 decoding', () => {
  const text = 'สินค้า,จำนวน,ราคา\nสมุด,2,35.50';
  assert.equal(core.decodeCSV(Buffer.from('\ufeff' + text)).text, text);
  const le = Buffer.concat([Buffer.from([255, 254]), Buffer.from(text, 'utf16le')]);
  assert.equal(core.decodeCSV(le).text, text);
  const be = Buffer.from(le); be.swap16(); assert.equal(core.decodeCSV(be).text, text);
  const th = Buffer.from([0xca, 0xc1, 0xd8, 0xb4]); // สมุด in Windows-874/TIS-620
  assert.equal(core.decodeCSV(th, 'windows-874').text, 'สมุด');
  assert.throws(() => core.decodeCSV(th), /Windows-874/);
  assert.throws(() => core.decodeCSV(Buffer.from([0xff, 0x00]), 'utf-8'), /encoding/);
  assert.throws(() => core.decodeCSV(Buffer.from('x'), 'unknown'), /encoding/);
});
test('HTML/formula-like product strings remain inert text; prototype property names aggregate normally', () => {
  const r = core.analyze(csv('=HYPERLINK(test),1,1\n__proto__,2,2\nconstructor,1,3\n<img src=x>,1,4'));
  assert.equal(r.productCount, 4); assert.equal(r.revenueCents, 1200); assert.match(core.reportText(r), /<img src=x>/);
  assert.equal({}.polluted, undefined);
});

test('satang stays exact in display at the maximum safe integer total', () => {
  const r = core.analyze('product,qty,price\nA,900719,100000000\nB,1,92547409.91');
  assert.equal(r.revenueCents, Number.MAX_SAFE_INTEGER);
  assert.equal(core.money(r.revenueCents), '90,071,992,547,409.91');
  assert.match(core.reportText(r), /90,071,992,547,409\.91/);
});
