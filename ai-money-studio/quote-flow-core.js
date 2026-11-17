/* QuoteFlow MVP core: local, deterministic; no OCR, AI or network calls. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WorametQuoteFlow = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_BYTES = 512 * 1024;
  const MAX_ITEMS = 500;
  const aliases = {
    name: ['name', 'item', 'product', 'product_name', 'description', 'สินค้า', 'ชื่อสินค้า', 'รายการสินค้า', 'รายการ'],
    quantity: ['quantity', 'qty', 'จำนวน', 'จำนวนสินค้า'],
    price: ['unit_price', 'unit price', 'price', 'ราคาต่อหน่วย', 'ราคา/หน่วย', 'ราคา']
  };
  const fail = msg => { throw new Error(msg); };
  const thaiDigits = s => String(s).replace(/[๐-๙]/g, n => String(n.charCodeAt(0) - 3664));
  const headerKey = s => String(s).trim().toLowerCase().replace(/[\s_]+/g, '');
  const normalize = s => String(s ?? '').normalize('NFC').trim();

  function parsePrice(raw) {
    let value = thaiDigits(raw).trim().replace(/^(?:฿|THB\s*)/i, '').replace(/\s*บาท$/, '').trim();
    if (!/^(?:0|[1-9]\d{0,6}|[1-9]\d{0,2}(?:,\d{3}){1,2})(?:\.\d{1,2})?$/.test(value)) fail('ราคาต้องเป็นจำนวนเงินบาทที่ไม่ติดลบ มีทศนิยมไม่เกิน 2 ตำแหน่ง');
    value = value.replace(/,/g, '');
    const [whole, fraction = ''] = value.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(cents) || cents > 100000000) fail('ราคาต่อหน่วยต้องไม่เกิน 1,000,000 บาท');
    return cents;
  }
  function parseQuantity(raw) {
    const value = thaiDigits(raw).trim();
    if (!/^[1-9]\d{0,4}$/.test(value)) fail('จำนวนต้องเป็นจำนวนเต็มบวก 1–10,000');
    const n = Number(value);
    if (n > 10000) fail('จำนวนต้องไม่เกิน 10,000');
    return n;
  }
  function formatCents(cents) {
    if (!Number.isSafeInteger(cents) || cents < 0) fail('ยอดเงินไม่ถูกต้อง');
    return Math.floor(cents / 100).toLocaleString('th-TH') + '.' + String(cents % 100).padStart(2, '0');
  }
  function calculate(items) {
    if (!Array.isArray(items) || items.length === 0) fail('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
    if (items.length > MAX_ITEMS) fail('รายการต้องไม่เกิน 500 แถว');
    let totalCents = 0, units = 0;
    const lines = items.map((item, i) => {
      const line = i + 1, name = normalize(item.name);
      if (!name || name.length > 160 || /[\u0000-\u001f\u007f-\u009f]/.test(name)) fail('รายการที่ ' + line + ': ชื่อสินค้าไม่ถูกต้อง (สูงสุด 160 อักขระ)');
      let quantity, unitCents;
      try {
        quantity = parseQuantity(item.quantity);
        unitCents = parsePrice(item.unitPrice);
      } catch (e) { fail('รายการที่ ' + line + ': ' + e.message); }
      const amountCents = quantity * unitCents;
      if (!Number.isSafeInteger(amountCents) || !Number.isSafeInteger(totalCents + amountCents)) fail('ยอดรวมสูงเกินขีดจำกัด');
      totalCents += amountCents;
      units += quantity;
      return { name, quantity, unitCents, amountCents };
    });
    return { lines, count: lines.length, units, totalCents, currency: 'THB', engine: 'deterministic-rules' };
  }
  function delimiterFor(header) {
    const counts = { '\t': 0, ';': 0, ',': 0 };
    let inside = false;
    for (let i = 0; i < header.length; i++) {
      const ch = header[i];
      if (ch === '"') { if (inside && header[i + 1] === '"') i++; else inside = !inside; }
      else if (!inside && Object.hasOwn(counts, ch)) counts[ch]++;
    }
    const selected = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!selected || selected[1] < 2) fail('ต้องมีหัวคอลัมน์ 3 ช่อง: สินค้า,จำนวน,ราคาต่อหน่วย');
    return selected[0];
  }
  function parseSeparated(text, delimiter) {
    let value = '', values = [], rows = [], quoted = false, line = 1, start = 1;
    function finish() {
      values.push(value);
      if (values.some(v => v.trim())) rows.push({ cells: values, line: start });
      values = []; value = '';
    }
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { value += '"'; i++; }
          else quoted = false;
        } else { value += ch; if (ch === '\n') line++; }
      } else if (ch === '"' && value === '') quoted = true;
      else if (ch === delimiter) { values.push(value); value = ''; }
      else if (ch === '\n') { finish(); line++; start = line; }
      else if (ch === '"') fail('รูปแบบเครื่องหมายคำพูดไม่ถูกต้องที่แถว ' + line);
      else value += ch;
    }
    if (quoted) fail('เครื่องหมายคำพูดไม่ปิดที่แถว ' + start);
    finish();
    return rows;
  }
  function parseTable(input) {
    if (typeof input !== 'string') fail('ข้อมูลต้องเป็นข้อความ CSV หรือ TSV');
    if (new TextEncoder().encode(input).length > MAX_BYTES) fail('ไฟล์ต้องไม่เกิน 512 KB');
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffd]/.test(input)) fail('พบอักขระควบคุมหรืออักขระอ่านไม่ออก');
    const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const first = text.split('\n').find(s => s.trim());
    if (!first) fail('ยังไม่มีรายการ');
    const delimiter = delimiterFor(first);
    const rows = parseSeparated(text, delimiter);
    if (rows.length < 2) fail('ไม่พบรายการสินค้าหลังหัวตาราง');
    if (rows.length - 1 > MAX_ITEMS) fail('รายการต้องไม่เกิน 500 แถว');
    const headers = rows[0].cells.map(headerKey);
    const indices = {};
    for (const [key, names] of Object.entries(aliases)) {
      const hits = headers.map((h, i) => names.map(headerKey).includes(h) ? i : -1).filter(i => i >= 0);
      if (hits.length !== 1) fail('หัวคอลัมน์ ' + key + ' หายไปหรือซ้ำกัน');
      indices[key] = hits[0];
    }
    const items = rows.slice(1).map(row => {
      if (row.cells.length !== headers.length) fail('แถวที่ ' + row.line + ': จำนวนช่องไม่ตรงหัวตาราง');
      return { name: row.cells[indices.name], quantity: row.cells[indices.quantity], unitPrice: row.cells[indices.price] };
    });
    try {
      const result = calculate(items);
      return { items: items.map((r, i) => ({ name: result.lines[i].name, quantity: String(result.lines[i].quantity), unitPrice: formatCents(result.lines[i].unitCents) })), summary: result, delimiter };
    } catch (e) {
      const match = e.message.match(/^รายการที่ (\d+):/);
      if (match) fail(e.message.replace(/^รายการที่ \d+:/, 'แถวข้อมูลที่ ' + match[1] + ':'));
      throw e;
    }
  }
  const sample = ['สินค้า,จำนวน,ราคาต่อหน่วย', ...Array.from({ length: 30 }, (_, i) => 'สมุดตัวอย่าง ' + String(i + 1).padStart(2, '0') + ',2,12.50')].join('\n');
  return { MAX_ITEMS, MAX_BYTES, parseTable, calculate, parsePrice, parseQuantity, formatCents, sample };
});
