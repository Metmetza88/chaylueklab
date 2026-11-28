export const lineMessage = message => `https://line.me/R/oaMessage/%40125cbuuu/?${encodeURIComponent(message)}`;
export const greetingLine = lineMessage('สวัสดีครับ สนใจแพ็กเกจระบบโรงเรียน ขอรายละเอียดและนัดสาธิตครับ');
export const procurementLine = lineMessage('สวัสดีครับ ขอรับไฟล์ตัวอย่างเอกสารเบิกงบสำหรับโรงเรียนครับ');
export const procurementDocs = 'https://store.chaylueklab.com/school-systems#procurement-samples';
export const sports = {
  slug: 'met-sport',
  name: 'ระบบบริหารจัดการแข่งขันกีฬาสีภายในโรงเรียน',
  tagline: 'MET Sport · จัดทีมสีและบันทึกผลการแข่งขัน',
  description: 'ทดลองจัดตารางและบันทึกผลการแข่งขันกีฬาสี สั่งทำตามขอบเขตโครงการได้',
  category: 'activities',
  status: 'development',
  image: '/assets/met-sport-demo.webp',
  features: ['จัดทีมสี', 'บันทึกผลแข่งขัน'],
  price: 'ขอใบเสนอราคา',
  offer: 'เปิดรับออเดอร์ · พร้อมวางระบบ',
  demo: 'https://store.chaylueklab.com/demo/met-sport',
  limitations: 'เดโมใช้ข้อมูลสมมติ ร้านจะยืนยันราคา วันติดตั้ง และขอบเขตในใบเสนอราคา',
  detail: 'https://store.chaylueklab.com/products/met-sport',
  quote: '#/quote?module=activities&interest=met-sport',
  quoteNote: 'สนใจ MET Sport ระบบบริหารจัดการแข่งขันกีฬาสีภายในโรงเรียน'
};

const paths={
  school:'<path d="M3 21h18M5 21v-9l7-5 7 5v9M10 21v-4h4v4M12 7V3h5l-1.5 2L17 7h-5"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  docs:'<path d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6m-6 4h6"/>'
};
export const marketIcon = name => `<svg class="market-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

export const answers = {
  price:'MET Sport เปิดรับออเดอร์ ระบุจำนวนทีม รายการแข่งขัน และบริการที่ต้องการเพื่อขอใบเสนอราคาตามขอบเขตงาน',
  documents:'สอบถามใบเสนอราคา ใบส่งของ และเอกสารผู้ขายได้ตามรายการที่ฝ่ายพัสดุของโรงเรียนขอ เริ่มจากเปิดเอกสารจัดซื้อหรือเตรียมคำขอใบเสนอราคาในเว็บนี้',
  budget:'การเบิกงบขึ้นอยู่กับประเภทโครงการ งบที่ได้รับอนุมัติ และขั้นตอนของโรงเรียน ควรให้ฝ่ายพัสดุยืนยันก่อนสั่งงาน ระบุชื่อโครงการและเอกสารที่ต้องใช้ในคำขอได้',
  sports:'MET Sport ทดลองบันทึกผลและดูตารางคะแนนได้ แจ้งวันจัดกีฬาสี จำนวนทีม และขอบเขตที่ต้องการเพื่อประเมินงานได้',
  fallback:'ตอนนี้ผมตอบอัตโนมัติได้เรื่องราคา กีฬาสี เอกสารจัดซื้อ และการเบิกงบ เลือกหัวข้อด้านบน หรือสอบถามทีมงานทาง LINE สำหรับกรณีเฉพาะโรงเรียน'
};
export function answerQuestion(question) {
  if (/เบิก|งบ|budget/i.test(question)) return answers.budget;
  if (/เอกสาร|จัดซื้อ|พัสดุ|ใบส่งของ/i.test(question)) return answers.documents;
  if (/ราคา|กี่บาท|ค่าใช้จ่าย|ประเมิน|price/i.test(question)) return answers.price;
  if (/กีฬา|ทีมสี|sport/i.test(question)) return answers.sports;
  return answers.fallback;
}
