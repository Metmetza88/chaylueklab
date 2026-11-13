/* Browser controller: all imported data stays in this page's memory. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const core = globalThis.WorametInsights;
  let revision = 0, report = null, busy = false, dataKind = 'ข้อมูลนำเข้า';
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
    for (const id of ['revenue', 'units', 'rows', 'products', 'period', 'post', 'trend-summary', 'copy-status', 'source-label']) $(id).textContent = '';
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
    } catch (error) { status(error.message || 'ไม่สามารถอ่านข้อมูลได้', 'error'); }
  }
  $('csv').addEventListener('input', () => {
    invalidate(); dataKind = 'ข้อมูลที่วางหรือแก้ไข';
    status('ข้อมูลเปลี่ยนแล้ว กดวิเคราะห์ยอดขายอีกครั้ง');
  });
  function loadSample() {
    invalidate(); $('file').value = ''; $('csv').value = core.sample; dataKind = 'ข้อมูลสมมติ';
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
    $('csv').value = ''; dataKind = 'ข้อมูลจากไฟล์';
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
  $('clear').addEventListener('click', () => {
    invalidate(); $('csv').value = ''; $('file').value = ''; dataKind = 'ข้อมูลนำเข้า';
    status('ล้างข้อมูลในหน้าจอแล้ว (ไฟล์ที่ดาวน์โหลดไว้ยังอยู่ในเครื่อง)');
  });
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
