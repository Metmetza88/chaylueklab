/* QuoteFlow browser UI: all input stays local; never claims AI/OCR. */
(function () {
  'use strict';
  const core = window.WorametQuoteFlow;
  const $ = id => document.getElementById(id);
  let rows = [];
  let canPrint = false;

  function setStatus(id, message, isError = false) {
    const node = $(id);
    node.textContent = message;
    node.classList.toggle('error', isError);
  }
  function textCell(text) {
    const td = document.createElement('td');
    td.textContent = String(text);
    return td;
  }
  function renderRows() {
    const body = $('items');
    body.replaceChildren();
    rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      for (const [field, type, label] of [['name', 'text', 'ชื่อสินค้า'], ['quantity', 'text', 'จำนวน'], ['unitPrice', 'text', 'ราคาต่อหน่วย']]) {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.type = type;
        input.value = row[field];
        input.setAttribute('aria-label', label + ' รายการที่ ' + (index + 1));
        if (field !== 'name') input.inputMode = field === 'quantity' ? 'numeric' : 'decimal';
        input.addEventListener('input', () => { row[field] = input.value; refresh(); });
        td.append(input);
        tr.append(td);
      }
      const action = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'ลบ';
      button.setAttribute('aria-label', 'ลบรายการที่ ' + (index + 1));
      button.addEventListener('click', () => { rows.splice(index, 1); renderRows(); refresh(); });
      action.append(button);
      tr.append(action);
      body.append(tr);
    });
  }
  function paperMeta() {
    const seller = $('seller').value.trim();
    const customer = $('customer').value.trim();
    const number = $('quote-number').value.trim();
    const date = $('quote-date').value;
    $('paper-seller').textContent = seller || '–';
    $('paper-customer').textContent = customer || '–';
    $('paper-number').textContent = number || '–';
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      const parsed = new Date(year, month - 1, day);
      $('paper-date').textContent = parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
        ? new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }).format(parsed)
        : '–';
    } else $('paper-date').textContent = '–';
    return Boolean(seller && customer && number && date && $('paper-date').textContent !== '–');
  }
  function updatePaper(summary) {
    const body = $('paper-items');
    body.replaceChildren();
    const frag = document.createDocumentFragment();
    summary.lines.forEach((line, i) => {
      const tr = document.createElement('tr');
      for (const value of [i + 1, line.name, line.quantity, core.formatCents(line.unitCents), core.formatCents(line.amountCents)]) tr.append(textCell(value));
      frag.append(tr);
    });
    body.append(frag);
    $('paper-total').textContent = '฿' + core.formatCents(summary.totalCents);
  }
  function refresh() {
    canPrint = false;
    $('print').disabled = true;
    const metaReady = paperMeta();
    try {
      const summary = core.calculate(rows);
      updatePaper(summary);
      $('total').textContent = 'รวม ' + summary.count + ' รายการ · ' + summary.units + ' ชิ้น · ฿' + core.formatCents(summary.totalCents);
      if (!metaReady) setStatus('review-status', 'รายการผ่านการตรวจแล้ว กรุณากรอกผู้เสนอราคา ลูกค้า เลขที่ และวันที่ให้ครบ');
      else {
        canPrint = true;
        $('print').disabled = false;
        setStatus('review-status', 'ตรวจผ่าน ' + summary.count + ' รายการ พร้อมพิมพ์ใบเสนอราคา');
      }
    } catch (err) {
      $('paper-items').replaceChildren();
      $('paper-total').textContent = '฿0.00';
      $('total').textContent = 'ยังคำนวณยอดไม่ได้';
      setStatus('review-status', err.message, true);
    }
  }
  function importSource() {
    try {
      const imported = core.parseTable($('source').value);
      rows = imported.items;
      renderRows();
      refresh();
      setStatus('import-status', 'นำเข้า ' + rows.length + ' รายการแล้ว กรุณาตรวจยอดและชื่อก่อนพิมพ์');
    } catch (err) {
      canPrint = false;
      $('print').disabled = true;
      setStatus('import-status', err.message, true);
    }
  }

  $('import').addEventListener('click', importSource);
  $('sample').addEventListener('click', () => {
    $('source').value = core.sample;
    $('seller').value = 'ร้านตัวอย่าง';
    $('customer').value = 'ลูกค้าตัวอย่าง';
    $('quote-number').value = 'DEMO-001';
    importSource();
  });
  $('add').addEventListener('click', () => {
    if (rows.length >= core.MAX_ITEMS) { setStatus('review-status', 'เกิน 500 รายการ', true); return; }
    rows.push({ name: '', quantity: '1', unitPrice: '0.00' });
    renderRows();
    refresh();
  });
  $('file').addEventListener('change', async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > core.MAX_BYTES) { setStatus('import-status', 'ไฟล์ใหญ่เกิน 512 KB', true); return; }
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) { setStatus('import-status', 'รองรับ CSV, TSV, TXT เท่านั้น PDF/รูปภาพยังไม่รองรับ', true); return; }
    try {
      $('source').value = await file.text();
      setStatus('import-status', 'อ่านไฟล์แล้ว กด “ตรวจและนำเข้ารายการ” เพื่อเช็กทุกแถว');
    } catch { setStatus('import-status', 'อ่านไฟล์ไม่สำเร็จ กรุณาบันทึกเป็น UTF-8', true); }
  });
  for (const id of ['seller', 'customer', 'quote-number', 'quote-date']) $(id).addEventListener('input', refresh);
  $('print').addEventListener('click', () => {
    if (!canPrint) return;
    refresh();
    if (canPrint) window.print();
  });
  const d = new Date();
  $('quote-date').value = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  refresh();
})();
