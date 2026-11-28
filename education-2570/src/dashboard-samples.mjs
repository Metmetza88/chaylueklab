const examples = {
  management: ['โครงการ', ['อ่านออกเขียนได้', 'แผนพัฒนาครู', 'ปรับปรุงอาคาร']],
  students: ['นักเรียน', ['รับสมัคร ม.1', 'ทะเบียน ม.2', 'ย้ายเข้า ม.3']],
  personnel: ['รายการ', ['ครูประจำการ', 'คำขอลา', 'บันทึกลงเวลา']],
  academic: ['รายการ', ['ตารางเรียน ม.1', 'ตารางสอนคณิตศาสตร์', 'แผนการสอนวิทย์']],
  finance: ['บาท', ['ใบเสร็จค่าอุปกรณ์', 'เบิกค่ากิจกรรม', 'ค่าบำรุงการศึกษา']],
  assets: ['ชิ้น', ['กระดาษ A4', 'หมึกพิมพ์', 'อุปกรณ์กีฬา']],
  procurement: ['รายการ', ['ขอซื้อวัสดุ', 'รอเทียบราคา', 'ตรวจรับครุภัณฑ์']],
  documents: ['ฉบับ', ['หนังสือรับ', 'หนังสือส่ง', 'หนังสือภายใน']],
  care: ['รายการ', ['เช็กชื่อรายวัน', 'ติดตามมาสาย', 'นัดเยี่ยมบ้าน']],
  nutrition: ['รายการ', ['เมนูกลางวัน', 'ตรวจรับวัตถุดิบ', 'ค่าอาหารรายสัปดาห์']],
  library: ['ครั้ง', ['ยืมวรรณกรรม', 'คืนหนังสือวิทย์', 'จองสื่อการเรียน']],
  facilities: ['รายการ', ['แจ้งซ่อมอาคาร', 'ตรวจงานไฟฟ้า', 'จองห้องประชุม']],
  activities: ['รายการ', ['ลงทะเบียนกีฬาสี', 'รายชื่อชมรม', 'เกียรติบัตร']],
  ai: ['รายการ', ['ร่างหนังสือ', 'เตรียมแผนงาน', 'สรุปรายงาน']],
};

export function dashboardMarkup(module, esc, interactive = false) {
  const [unit, labels] = examples[module.slug] ?? ['รายการ', module.features.slice(0, 3)];
  const amounts = module.slug === 'finance' ? [1450, 960, 630] : [12, 8, 5];
  const rows = labels.map((label, index) => ({label, amount: amounts[index], status: ['เสร็จแล้ว', 'รอตรวจ', 'รอตรวจ'][index]}));
  const bar = (amount) => Math.round(amount / amounts[0] * 100);
  return `<div class="edu-sample-dashboard${interactive?' edu-sample-full':''}" ${interactive?'data-edu-dashboard':`role="img" aria-label="หน้าจอตัวอย่าง ${esc(module.name)} · ข้อมูลสมมติ"`}>
    <header><b>${esc(module.name)}</b><small>ข้อมูลสมมติ</small></header>
    <div class="edu-sample-metrics">
      <div><b data-edu-count>${rows.length}</b><small>รายการที่แสดง</small></div>
      <div><b>${amounts[0].toLocaleString('th-TH')}</b><small>สูงสุด (${esc(unit)})</small></div>
    </div>
    ${interactive?'<label>กรองสถานะ <select data-edu-demo-filter><option value="">ทั้งหมด</option><option>เสร็จแล้ว</option><option>รอตรวจ</option></select></label>':''}
    <div class="edu-sample-layout">
      <div class="edu-sample-chart" aria-label="กราฟรายการตัวอย่าง">
        ${rows.map(({label,amount,status})=>`<div data-sample-status="${status}"><span>${esc(label)}</span><i style="--bar:${bar(amount)}%"></i></div>`).join('')}
      </div>
      <div class="edu-sample-table">
        <table><thead><tr><th scope="col">รายการ</th><th scope="col">${esc(unit)}</th>${interactive?'<th scope="col">สถานะ</th>':''}</tr></thead><tbody>
        ${rows.map(({label,amount,status})=>`<tr data-sample-status="${status}"><td>${esc(label)}</td><td>${amount.toLocaleString('th-TH')}</td>${interactive?`<td>${status}</td>`:''}</tr>`).join('')}
        </tbody></table>
      </div>
    </div>
    ${interactive?`<p role="status" data-edu-demo-result>แสดง ${rows.length} รายการ</p>`:''}
  </div>`;
}
