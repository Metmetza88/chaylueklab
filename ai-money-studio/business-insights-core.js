/* Shared deterministic calculations. No network, storage, AI calls or dependencies. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WorametInsights = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_ROWS = 10000;
  const fmt = n => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(n);
  const money = cents => {
    const fraction = String(cents % 100).padStart(2, '0').replace(/0+$/, '');
    return fmt(Math.floor(cents / 100)) + (fraction ? '.' + fraction : '');
  };
  const digits = value => String(value).replace(/[๐-๙]/g, c => String(c.charCodeAt(0) - 3664));
  const aliases = {
    product: ['product', 'product_name', 'item', 'สินค้า', 'ชื่อสินค้า', 'รายการสินค้า'],
    quantity: ['quantity', 'qty', 'จำนวน', 'จำนวนสินค้า'],
    price: ['unit_price', 'unit price', 'price', 'ราคาต่อหน่วย', 'ราคาขายต่อหน่วย', 'ราคา'],
    date: ['date', 'sale_date', 'sales_date', 'วันที่', 'วันที่ขาย']
  };
  const fail = message => { throw Error(message); };
  function sizeCheck(input) {
    if (typeof input !== 'string') fail('ข้อมูลต้องเป็นข้อความ CSV');
    if (input.length > MAX_BYTES || new TextEncoder().encode(input).length > MAX_BYTES) fail('ข้อมูลใหญ่เกิน 2 MB');
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffd]/u.test(input)) fail('พบอักขระที่อ่านไม่ได้ กรุณาตรวจ encoding ของไฟล์');
  }
  function decodeCSV(buffer, encoding = 'auto') {
    const bytes = new Uint8Array(buffer);
    if (bytes.byteLength > MAX_BYTES) fail('ไฟล์ใหญ่เกิน 2 MB');
    if (!['auto', 'utf-8', 'windows-874'].includes(encoding)) fail('รูปแบบ encoding ไม่รองรับ');
    let selected = encoding === 'auto' ? 'utf-8' : encoding;
    if (encoding === 'auto' && bytes[0] === 0xff && bytes[1] === 0xfe) selected = 'utf-16le';
    if (encoding === 'auto' && bytes[0] === 0xfe && bytes[1] === 0xff) selected = 'utf-16be';
    try {
      const text = new TextDecoder(selected, { fatal: true }).decode(bytes);
      sizeCheck(text);
      return { text, encoding: selected };
    } catch {
      fail('อ่าน encoding ไม่ได้ ลองเลือก Windows-874 สำหรับ CSV ภาษาไทยรุ่นเก่า หรือบันทึกใหม่เป็น UTF-8');
    }
  }
  function detectDelimiter(input) {
    let quoted = false;
    const counts = { ',': 0, ';': 0, '\t': 0 };
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (c === '"') {
        if (quoted && input[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && (c === '\r' || c === '\n')) break;
      else if (!quoted && Object.hasOwn(counts, c)) counts[c]++;
    }
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  }
  function parseCSV(input) {
    sizeCheck(input);
    input = input.replace(/^\uFEFF/, '');
    const leading = /^(?:[ \t]*(?:\r\n|\r|\n))*/.exec(input)[0];
    const firstLine = 1 + (leading.match(/\r\n|\r|\n/g) || []).length;
    input = input.slice(leading.length);
    const delimiter = detectDelimiter(input);
    const rows = [];
    let row = [], field = '', state = 'start', line = firstLine, rowLine = firstLine;
    function addField() {
      row.push(field.trim()); field = ''; state = 'start';
      if (row.length > 64) fail('รองรับไม่เกิน 64 คอลัมน์');
    }
    function addRow() {
      addField();
      if (row.length > 1 || row[0] !== '') rows.push({ cells: row, line: rowLine });
      row = [];
      if (rows.length > MAX_ROWS + 1) fail('รองรับไม่เกิน 10,000 รายการต่อครั้ง');
    }
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (state === 'quoted') {
        if (c === '"') {
          if (input[i + 1] === '"') { field += '"'; i++; }
          else state = 'closed';
        } else { field += c; if (c === '\n') line++; }
        continue;
      }
      if (c === delimiter) { addField(); continue; }
      if (c === '\r' || c === '\n') {
        addRow(); if (c === '\r' && input[i + 1] === '\n') i++;
        line++; rowLine = line; continue;
      }
      if (state === 'closed') {
        if (c === ' ') continue;
        fail('อักขระหลังอัญประกาศไม่ถูกต้องที่บรรทัด ' + line);
      }
      if (c === '"') {
        if (field.trim() !== '') fail('อัญประกาศไม่ถูกต้องที่บรรทัด ' + line);
        field = ''; state = 'quoted';
      } else { field += c; state = 'plain'; }
    }
    if (state === 'quoted') fail('เครื่องหมายอัญประกาศใน CSV ไม่ครบ');
    addRow();
    return { rows, delimiter };
  }
  function numeric(raw, money = false) {
    let value = digits(raw).trim();
    if (money) value = value.replace(/^(?:฿\s*|THB\s+)/i, '').replace(/\s*(?:฿|\sTHB)$/i, '');
    // Commas are thousands separators only; never guess decimal-comma formats.
    if (!/^(?:\d+|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d+)?$/.test(value)) return NaN;
    value = value.replace(/,/g, '');
    if (money) {
      if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return NaN;
      const [whole, fraction = ''] = value.split('.');
      return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    }
    return Number(value);
  }
  function parseDate(raw) {
    const value = digits(raw).trim();
    let year, month, day, match;
    if ((match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value))) [, year, month, day] = match;
    else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value))) [, day, month, year] = match;
    else return null;
    year = Number(year); month = Number(month); day = Number(day);
    if (year >= 2400) year -= 543;
    if (year < 1900 || year > 2199 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) return null;
    return d.toISOString().slice(0, 10);
  }
  function parseSales(input) {
    const { rows, delimiter } = parseCSV(input);
    if (rows.length < 2) fail('ต้องมีหัวตารางและข้อมูลอย่างน้อย 1 รายการ');
    const headers = rows[0].cells.map(v => v.normalize('NFC').toLowerCase().trim());
    if (headers.some(h => !h) || new Set(headers).size !== headers.length) fail('หัวคอลัมน์ว่างหรือซ้ำกัน');
    const indexes = {};
    for (const [key, names] of Object.entries(aliases)) {
      const matches = headers.flatMap((h, i) => names.includes(h) ? [i] : []);
      if (matches.length > 1) fail('พบคอลัมน์ความหมายซ้ำกัน: ' + names[0]);
      if (!matches.length && key !== 'date') fail('ไม่พบคอลัมน์ ' + names[0]);
      indexes[key] = matches[0] ?? -1;
    }
    const sales = rows.slice(1).map(({ cells, line }) => {
      if (cells.length !== headers.length) fail('จำนวนคอลัมน์ไม่ตรงหัวตารางที่แถวที่ ' + line);
      const product = cells[indexes.product].normalize('NFC').trim();
      const quantity = numeric(cells[indexes.quantity]);
      const priceCents = numeric(cells[indexes.price], true);
      if (!product || product.length > 160 || /[\r\n\t\u2028\u2029\u202a-\u202e\u2066-\u2069]/u.test(product)) fail('ชื่อสินค้าไม่ถูกต้อง (ไม่เกิน 160 ตัวอักษรและไม่ขึ้นบรรทัดใหม่) ที่แถวที่ ' + line);
      if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 10000000 || !Number.isSafeInteger(priceCents) || priceCents < 0 || priceCents > 10000000000) fail('จำนวนหรือราคาไม่ถูกต้องที่แถวที่ ' + line + ' (จำนวนเต็มบวก ราคาไม่เกิน 2 ทศนิยม)');
      const revenueCents = quantity * priceCents;
      if (!Number.isSafeInteger(revenueCents)) fail('ยอดขายเกินขอบเขตที่คำนวณแม่นยำที่แถวที่ ' + line);
      const date = indexes.date < 0 ? null : parseDate(cells[indexes.date]);
      if (indexes.date >= 0 && !date) fail('วันที่ไม่ถูกต้องที่แถวที่ ' + line + ' ใช้ YYYY-MM-DD หรือ DD/MM/YYYY');
      return { product, quantity, priceCents, revenueCents, date };
    });
    return { sales, delimiter, ignoredColumns: headers.filter((_, i) => !Object.values(indexes).includes(i)).length };
  }
  function safeAdd(a, b) {
    if (!Number.isSafeInteger(a + b)) fail('ยอดรวมเกินขอบเขตที่คำนวณได้แม่นยำ กรุณาแบ่งข้อมูล');
    return a + b;
  }
  function analyze(input) {
    const { sales, delimiter, ignoredColumns } = parseSales(input);
    const products = new Map(), dates = new Map();
    let revenueCents = 0, units = 0;
    for (const row of sales) {
      revenueCents = safeAdd(revenueCents, row.revenueCents);
      units = safeAdd(units, row.quantity);
      const product = products.get(row.product) || { product: row.product, units: 0, revenueCents: 0 };
      product.units = safeAdd(product.units, row.quantity);
      product.revenueCents = safeAdd(product.revenueCents, row.revenueCents);
      products.set(row.product, product);
      if (row.date) dates.set(row.date, safeAdd(dates.get(row.date) || 0, row.revenueCents));
    }
    const rank = [...products.values()].sort((a, b) => b.revenueCents - a.revenueCents || a.product.localeCompare(b.product, 'th'));
    const topUnits = [...products.values()].sort((a, b) => b.units - a.units || a.product.localeCompare(b.product, 'th'))[0];
    const daily = [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, revenueCents]) => ({ date, revenueCents }));
    let trend = { available: false, reason: 'ต้องมีวันที่ครบทุกวันในช่วง 14 วันล่าสุด จึงเปรียบเทียบ 7 วันกับ 7 วันก่อนหน้าได้' };
    if (daily.length >= 14) {
      const recent = daily.slice(-14);
      const span = (Date.parse(recent[13].date) - Date.parse(recent[0].date)) / 86400000;
      if (span === 13) {
        const previousCents = recent.slice(0, 7).reduce((s, d) => safeAdd(s, d.revenueCents), 0);
        const currentCents = recent.slice(7).reduce((s, d) => safeAdd(s, d.revenueCents), 0);
        trend = { available: true, previousCents, currentCents, changePercent: previousCents ? (currentCents - previousCents) / previousCents * 100 : null,
          previousStart: recent[0].date, previousEnd: recent[6].date, currentStart: recent[7].date, currentEnd: recent[13].date };
      }
    }
    const share = revenueCents ? rank[0].revenueCents / revenueCents * 100 : 0;
    const tips = [
      'ยอดขายสูงสุด: ' + rank[0].product + ' (฿' + money(rank[0].revenueCents) + ') · อันดับเท่ากันเรียงตามชื่อสินค้า',
      'ขายได้มากสุดตามจำนวน: ' + topUnits.product + ' (' + fmt(topUnits.units) + ' ชิ้น)',
      revenueCents ? 'สินค้าอันดับหนึ่งคิดเป็น ' + fmt(share) + '% ของยอดขาย' + (share >= 60 ? ' ควรตรวจสต็อกก่อนวางแผนโปรโมต' : '') : 'ยอดขายเป็นศูนย์ ยังสรุปสัดส่วนสินค้าขายดีไม่ได้',
      'ยอดขาย = จำนวน × ราคาต่อหน่วย ไม่หักต้นทุน ภาษี ค่าธรรมเนียม ส่วนลด หรือคืนสินค้า จึงไม่ใช่กำไรสุทธิ',
      'แต่ละแถวคือรายการสินค้า ไม่ใช่จำนวนบิล ไม่ตัดแถวซ้ำเพราะอาจเป็นการขายจริงคนละครั้ง',
      'วันที่ไม่มีแถวข้อมูลถือว่าไม่ทราบยอด ไม่สมมติว่ายอดเป็นศูนย์ และไม่พยากรณ์อนาคต'
    ];
    if (ignoredColumns) tips.push('ละเว้นคอลัมน์อื่น ' + ignoredColumns + ' คอลัมน์ ไม่รวมไว้ในรายงาน');
    if (!daily.length) tips.push('ไม่มีคอลัมน์วันที่: วิเคราะห์ยอดรวมได้ แต่ยังวิเคราะห์แนวโน้มไม่ได้');
    if (trend.available) tips.push('ยอด 7 วันล่าสุด ฿' + money(trend.currentCents) + ' เทียบ 7 วันก่อนหน้า ฿' + money(trend.previousCents) + (trend.changePercent === null ? ' ฐานเดิมเป็นศูนย์จึงไม่คิดเปอร์เซ็นต์' : ' เปลี่ยนแปลง ' + fmt(trend.changePercent) + '%') + ' เฉพาะช่วงวันที่ในข้อมูล');
    const post = 'แนะนำ ' + rank[0].product + ' ✨\nสนใจรายละเอียดสินค้า? ทักแชตเพื่อสอบถามราคาและการจัดส่งได้เลย\n\nร่างจากเทมเพลต: ตรวจชื่อสินค้า ราคา และสต็อกก่อนโพสต์';
    return { schemaVersion: 1, engine: 'deterministic-rules', currency: 'THB', revenueCents, units, rowCount: sales.length,
      productCount: rank.length, rank, topUnits, daily, trend, tips, post, delimiter, ignoredColumns };
  }
  function reportText(report) {
    return ['WORAMET AI LAB | Business Insights', 'วิธีวิเคราะห์: สูตรและกฎ (ไม่ใช่ Generative AI)',
      'ยอดขายรวม: ฿' + money(report.revenueCents), 'จำนวนชิ้น: ' + fmt(report.units), 'จำนวนแถว: ' + report.rowCount,
      'จำนวนสินค้า: ' + report.productCount, 'ช่วงวันที่: ' + (report.daily.length ? report.daily[0].date + ' ถึง ' + report.daily.at(-1).date : 'ไม่มีวันที่'),
      '', 'อันดับสินค้าตามยอดขาย', ...report.rank.map((r, i) => (i + 1) + '. ' + r.product + ' | ฿' + money(r.revenueCents) + ' | ' + fmt(r.units) + ' ชิ้น'),
      '', 'ยอดขายรายวันที่มีข้อมูล', ...report.daily.map(d => d.date + ' | ฿' + money(d.revenueCents)),
      '', 'ข้อสังเกต', ...report.tips, !report.trend.available ? report.trend.reason : '', '', 'ร่างข้อความจากเทมเพลต', report.post].join('\r\n');
  }
  const sample = ['date,product,quantity,unit_price', '2026-11-01,FIRST CHAPTER Ivory,2,600', '2026-11-02,FIRST CHAPTER Noir,3,600',
    '2026-11-03,FIRST CHAPTER Forest,1,600', '2026-11-04,FIRST CHAPTER Ivory,2,600', '2026-11-05,FIRST CHAPTER Noir,1,600',
    '2026-11-06,FIRST CHAPTER Forest,2,600', '2026-11-07,FIRST CHAPTER Ivory,1,600'].join('\n');
  return { MAX_BYTES, MAX_ROWS, fmt, money, decodeCSV, parseCSV, parseSales, parseDate, analyze, reportText, sample };
});
