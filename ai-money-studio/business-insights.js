/* Browser controller: all imported data stays in this page's memory. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const core = globalThis.WorametInsights;
  let revision = 0, report = null, busy = false, dataKind = 'ข้อมูลนำเข้า', sampleBased = false;
  let nextEntryId = 1;
  let entries = [];
  function status(text, kind = 'muted') {
    $('status').textContent = text;
    $('status').className = 'status ' + kind;
  }
  function invalidate() {
    revision++;
    report = null; busy = false;
    $('analyze').disabled = false;
    $('results').hidden = true; $('marketing').hidden = true;
    for (const id of ['export', 'export-json', 'copy', 'download-post']) $(id).disabled = true;
    for (const id of ['ranking', 'daily', 'insights']) $(id).replaceChildren();
    for (const id of ['revenue', 'units', 'rows', 'products', 'period', 'post', 'trend-summary', 'copy-status', 'source-label', 'result-context']) $(id).textContent = '';
  }
  function setText(id, text) { $(id).textContent = text; }
  function barItem(name, total, share, daily = false) {
    const item = document.createElement('div'); item.className = 'item';
    const row = document.createElement('div'); row.className = 'row';
    const label = document.createElement('strong'); label.textContent = name;
    const value = document.createElement('span'); value.textContent = total;
    row.append(label, value);
    const bar = document.createElement('div'); bar.className = daily ? 'bar tone-cyan' : 'bar';
    const fill = document.createElement('span'); fill.style.width = Math.max(0, Math.min(100, share)) + '%';
    bar.append(fill); item.append(row, bar); return item;
  }
  function render() {
    if (busy) return;
    invalidate();
    try {
      const result = core.analyze($('csv').value);
      result.dataKind = dataKind;
      setText('revenue', '฿' + core.money(result.revenueCents));
      setText('units', core.fmt(result.units)); setText('rows', core.fmt(result.rowCount)); setText('products', core.fmt(result.productCount));
      setText('source-label', dataKind);
      setText('result-context', sampleBased ? 'กำลังดูข้อมูลตัวอย่าง — ยอดนี้ไม่ใช่ยอดขายร้านคุณ' : 'ยอดนี้รวมจากรายการที่คุณกรอกหรือนำเข้า ไม่ได้ดึงจากระบบขายของร้านโดยอัตโนมัติ');
      $('result-context').className = 'result-context ' + (sampleBased ? 'sample-warning' : 'entered-data');
      setText('period', result.daily.length ? 'ช่วงข้อมูล ' + result.daily[0].date + ' — ' + result.daily.at(-1).date + ' · ' + result.daily.length + ' วันที่มีรายการขาย' : 'ไม่มีคอลัมน์วันที่ · แสดงเฉพาะยอดรวมและอันดับสินค้า');
      $('ranking').replaceChildren(...result.rank.slice(0, 10).map((r, i) => barItem((i + 1) + '. ' + r.product, '฿' + core.money(r.revenueCents) + ' · ' + core.fmt(r.units) + ' ชิ้น', result.revenueCents ? r.revenueCents / result.revenueCents * 100 : 0)));
      const maxDay = Math.max(0, ...result.daily.map(d => d.revenueCents));
      $('daily').replaceChildren(...result.daily.slice(-14).map(d => barItem(d.date, '฿' + core.money(d.revenueCents), maxDay ? d.revenueCents / maxDay * 100 : 0, true)));
      const trend = result.trend;
      setText('trend-summary', trend.available ? '7 วันล่าสุด (' + trend.currentStart + ' ถึง ' + trend.currentEnd + ') ฿' + core.money(trend.currentCents) + ' เทียบ 7 วันก่อนหน้า (' + trend.previousStart + ' ถึง ' + trend.previousEnd + ') ฿' + core.money(trend.previousCents) + (trend.changePercent === null ? ' · ฐานเดิมเป็นศูนย์ ไม่คิดเปอร์เซ็นต์' : ' · เปลี่ยนแปลง ' + core.fmt(trend.changePercent) + '%') : trend.reason);
      $('insights').replaceChildren(...result.tips.map(tip => { const p = document.createElement('p'); p.textContent = '• ' + tip; return p; }));
      setText('post', result.post);
      report = result;
      $('results').hidden = false; $('marketing').hidden = false;
      for (const id of ['export', 'export-json', 'copy', 'download-post']) $(id).disabled = false;
      status('วิเคราะห์สำเร็จ · ' + dataKind + ' · ข้อมูลอยู่ในเบราว์เซอร์ของคุณ', 'success');
      return true;
    } catch (error) { status(error.message || 'ไม่สามารถอ่านข้อมูลได้', 'error'); return false; }
  }
  function manualStatus(text, kind = 'muted') {
    $('manual-status').textContent = text;
    $('manual-status').className = 'status ' + kind;
  }
  function draftChanged() {
    invalidate();
    manualStatus('รายการเปลี่ยนแล้ว กด “สรุปยอดขาย” เพื่อดูยอดใหม่');
  }
  function newEntry() { return { id: nextEntryId++, product: '', quantity: '1', price: '' }; }
  function drawEntries(focusLast = false) {
    const cards = entries.map((entry, index) => {
      const card = document.createElement('fieldset'); card.className = 'sale-card';
      const legend = document.createElement('legend'); legend.textContent = 'สินค้า ' + (index + 1);
      const fields = document.createElement('div'); fields.className = 'sale-fields';
      let firstInput;
      for (const [key, title, placeholder, mode] of [
        ['product', 'ชื่อสินค้า', 'เช่น ปากกา', 'text'],
        ['quantity', 'จำนวนที่ขาย', 'เช่น 3', 'numeric'],
        ['price', 'ราคาขายต่อชิ้น (บาท)', 'เช่น 10', 'decimal']
      ]) {
        const wrapper = document.createElement('div');
        const id = 'sale-' + key + '-' + entry.id;
        const label = document.createElement('label'); label.htmlFor = id; label.textContent = title;
        const input = document.createElement('input'); input.id = id; input.type = 'text';
        input.inputMode = mode; input.autocomplete = 'off'; input.value = entry[key]; input.placeholder = placeholder;
        input.maxLength = key === 'product' ? 160 : 40;
        input.addEventListener('input', () => { entry[key] = input.value; draftChanged(); });
        wrapper.append(label, input); fields.append(wrapper);
        if (key === 'product') firstInput = input;
      }
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'quiet remove-sale';
      remove.textContent = 'ลบรายการนี้'; remove.setAttribute('aria-label', 'ลบสินค้า ' + (index + 1));
      remove.addEventListener('click', () => {
        entries = entries.filter(item => item.id !== entry.id);
        if (!entries.length) entries.push(newEntry());
        drawEntries(); draftChanged();
      });
      card.append(legend, fields, remove);
      return { card, firstInput };
    });
    $('sale-entries').replaceChildren(...cards.map(item => item.card));
    $('add-sale').disabled = entries.length >= core.MAX_MANUAL_ROWS;
    if (focusLast) cards.at(-1).firstInput.focus();
  }
  function resetManual() {
    entries = [newEntry()]; drawEntries();
    const today = new Date();
    $('sale-date').value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    manualStatus('กรอกสินค้าอย่างน้อย 1 รายการ แล้วกด “สรุปยอดขาย”');
  }
  $('add-sale').addEventListener('click', () => {
    if (entries.length >= core.MAX_MANUAL_ROWS) return;
    entries.push(newEntry()); drawEntries(true); draftChanged();
  });
  $('sale-date').addEventListener('input', draftChanged);
  $('sale-form').addEventListener('submit', event => {
    event.preventDefault();
    invalidate(); sampleBased = false; dataKind = 'รายการที่คุณกรอก';
    try {
      $('csv').value = core.manualCSV(entries, $('sale-date').value);
      $('file').value = '';
      if (!render()) throw Error($('status').textContent);
      manualStatus('รวมยอดแล้วจาก ' + entries.length + ' รายการที่คุณกรอก', 'success');
      $('results').scrollIntoView({ block: 'start' });
    } catch (error) {
      // A CSV header is one line; manual row numbers start at the first product.
      const message = error.message.replace(/แถวที่ (\d+)/g, (_, n) => 'สินค้าแถวที่ ' + Math.max(1, Number(n) - 1));
      manualStatus(message, 'error');
    }
  });
  $('manual-return').addEventListener('click', () => {
    invalidate();
    manualStatus('กรอกรายการของคุณด้านบน แล้วกด “สรุปยอดขาย” ข้อมูลตัวอย่างจะไม่ถูกรวมด้วย');
    $('workspace').scrollIntoView({ block: 'start' });
  });
  resetManual();
  $('csv').addEventListener('input', () => {
    invalidate(); dataKind = sampleBased ? 'ข้อมูลสมมติที่แก้ไข' : 'ข้อมูลที่วางหรือแก้ไข';
    status('ข้อมูลเปลี่ยนแล้ว กดวิเคราะห์ยอดขายอีกครั้ง');
  });
  function loadSample() {
    invalidate(); $('file').value = ''; $('csv').value = core.sample; dataKind = 'ข้อมูลสมมติ'; sampleBased = true;
    status('โหลดข้อมูลสมมติแล้ว กดวิเคราะห์ยอดขายได้เลย');
  }
  $('sample').addEventListener('click', loadSample);
  $('sample-quick').addEventListener('click', () => {
    loadSample(); render(); $('results').scrollIntoView({ block: 'start' });
  });
  async function loadFile(file) {
    if (!file) return;
    invalidate();
    // Clear old input as well: a failed import must never leave old sales analyzable.
    $('csv').value = ''; dataKind = 'ข้อมูลจากไฟล์'; sampleBased = false;
    if (file.size > core.MAX_BYTES) { status('ไฟล์ใหญ่เกิน 2 MB', 'error'); return; }
    const current = revision, encoding = $('encoding').value;
    busy = true; $('analyze').disabled = true;
    status('กำลังอ่านไฟล์ในเครื่อง…');
    try {
      const buffer = await file.arrayBuffer();
      if (current !== revision) return;
      const decoded = core.decodeCSV(buffer, encoding);
      $('csv').value = decoded.text;
      status('อ่านไฟล์ในเครื่องแล้ว (' + decoded.encoding + ') กดวิเคราะห์ยอดขาย');
    } catch (error) {
      if (current === revision) status(error.message || 'ไม่สามารถอ่านไฟล์ได้', 'error');
    } finally {
      if (current === revision) { busy = false; $('analyze').disabled = false; }
    }
  }
  $('file').addEventListener('change', event => loadFile(event.target.files[0]));
  $('encoding').addEventListener('change', () => {
    const file = $('file').files[0];
    if (file) return loadFile(file);
    invalidate(); status('เปลี่ยน encoding แล้ว เลือกไฟล์หรือวิเคราะห์ข้อความอีกครั้ง');
  });
  $('analyze').addEventListener('click', render);
  function clearAll() {
    invalidate(); $('csv').value = ''; $('file').value = ''; dataKind = 'ข้อมูลนำเข้า'; sampleBased = false;
    resetManual();
    status('ล้างข้อมูลในหน้าจอแล้ว (ไฟล์ที่ดาวน์โหลดไว้ยังอยู่ในเครื่อง)');
  }
  $('clear').addEventListener('click', clearAll);
  $('manual-clear').addEventListener('click', clearAll);
  function download(text, filename, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([type.startsWith('text/') ? '\uFEFF' : '', text], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  $('export').addEventListener('click', () => {
    if (report) download('แหล่งข้อมูล: ' + report.dataKind + '\r\n' + core.reportText(report), 'woramet-business-report.txt');
  });
  $('export-json').addEventListener('click', () => {
    if (report) download(JSON.stringify(report, null, 2), 'woramet-business-report.json', 'application/json;charset=utf-8');
  });
  $('download-post').addEventListener('click', () => {
    if (report) download(report.post, 'woramet-content-draft.txt');
  });
  $('copy').addEventListener('click', async () => {
    if (!report) return;
    const current = revision;
    try {
      await navigator.clipboard.writeText(report.post);
      if (current === revision) setText('copy-status', 'คัดลอกข้อความแล้ว ตรวจข้อมูลก่อนโพสต์จริง');
    } catch {
      if (current === revision) setText('copy-status', 'คัดลอกอัตโนมัติไม่ได้ แตะค้าง/ลากเลือกข้อความด้านบน หรือกด “บันทึกร่าง .txt”');
    }
  });
})();
