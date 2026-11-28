export const storeBase = 'https://store.chaylueklab.com';
export const procurementDocs = `${storeBase}/school-systems#procurement-samples`;
export const seller = {
  name: 'ร้าน พ.สมนึก 2&3',
  developer: 'WORAMET AI LAB',
  location: 'ตลาดสดอำเภอสตึก จ.บุรีรัมย์',
  tel: '084-3232324',
  telHref: 'tel:0843232324',
  line: '@125cbuuu',
  lineHref: 'https://lin.ee/Vgg2m3N'
};
export const schoolPackage = {
  estimate: '3,500–8,900 บาทต่อระบบ',
  summary: 'ราคาประมาณการขึ้นอยู่กับขอบเขตงาน ไม่ใช่ราคายืนยัน เปิดขอใบเสนอราคาเพื่อให้ร้านประเมินก่อนสั่งงาน',
  details: [
    'ติดตั้งและปรับโลโก้หรือสีโรงเรียนตามระบบที่รองรับ',
    'ประเมินการนำเข้ารายชื่อนักเรียนจากไฟล์ส่งออก DMC ที่โรงเรียนจัดเตรียม เฉพาะระบบที่ต้องใช้รายชื่อและหลังตรวจรูปแบบไฟล์ ไม่ได้เชื่อม DMC โดยตรง',
    'สอนใช้งานและจัดเตรียมใบเสนอราคา แบบ TOR ตัวอย่าง และเอกสารร้านค้าตามข้อตกลง'
  ]
};
export const storeQuote = slug => `${storeBase}/contact?product=${encodeURIComponent(slug)}#quotation`;
const publicModule = (module) => ({
  status: 'trial',
  market: true,
  ...module,
  image: `/assets/${module.slug}-demo.webp`,
  demo: `${storeBase}/demo/${module.slug}`,
  detail: `${storeBase}/products/${module.slug}`,
  quote: storeQuote(module.slug)
});
export const sports = publicModule({
  slug: 'met-sport',
  name: 'ระบบบริหารจัดการแข่งขันกีฬาสีภายในโรงเรียน',
  tagline: 'MET Sport · จัดทีมสี จับคู่แข่งขัน และบันทึกผล',
  description: 'ลองจัดตาราง บันทึกผล และดูคะแนนรวมของทีมสีจากข้อมูลสมมติ',
  category: 'activities',
  offer: 'รับประเมินงาน',
  imageSize: [1200, 696],
  features: ['จัดทีมสีและตารางแข่งขัน', 'บันทึกผลแข่งขัน', 'ดูตารางคะแนนที่อัปเดตจากผลที่บันทึก'],
  limitations: 'เดโมใช้ข้อมูลสมมติ ร้านจะยืนยันราคา วันติดตั้ง และขอบเขตในใบเสนอราคา',
  quoteNote: 'สนใจ MET Sport ระบบบริหารจัดการแข่งขันกีฬาสีภายในโรงเรียน'
});
export const marketProducts = [
  sports,
  publicModule({
    slug:'met-attendance', name:'MET Attendance', tagline:'เช็กชื่อรายวันและรายคาบ พร้อมรายงานและรายการติดตาม', category:'students',
    description:'ทดลองเช็กชื่อรายวันและรายคาบสำหรับห้องเรียนตัวอย่างและดาวน์โหลด CSV',
    features:['เลือกโรงเรียนและห้องเรียนสมมติ','บันทึกสถานะการมาเรียน','ดูสรุปและดาวน์โหลด CSV ตัวอย่าง'],
    offer:'รับประเมินงาน', imageSize:[1280,800],
    limitations:'เดโมใช้ข้อมูลสมมติ ไม่ส่งข้อมูลเข้าระบบโรงเรียน การนำเข้ารายชื่อหรือการติดตั้งจริงต้องประเมินก่อน'
  }),
  publicModule({
    slug:'met-admission', name:'MET Admission', tagline:'รับสมัครออนไลน์ ตรวจเอกสาร และติดตามสถานะ', category:'students',
    description:'ดูตัวอย่างขั้นตอนส่งใบสมัครและติดตามผลการรับสมัครของโรงเรียน',
    features:['เลือกรอบและระดับชั้น','ยื่นใบสมัครและตรวจสถานะ','ตัวอย่างเอกสารรับสมัคร'],
    offer:'รุ่นทดสอบ · รับปรึกษา', imageSize:[1280,660],
    limitations:'ใช้ข้อมูลสมมติเท่านั้น รับปรึกษาขอบเขตและทดสอบก่อนใช้จริง ยังไม่ยืนยันความพร้อมติดตั้งหรือเปิดรับข้อมูลนักเรียนจริง'
  }),
  publicModule({
    slug:'met-school-pro', name:'MET School Pro', tagline:'เว็บไซต์และข่าวสารโรงเรียน พร้อมตั้งค่าภาพลักษณ์', category:'management',
    description:'ดูหน้าเว็บไซต์ ข่าว และข้อมูลของโรงเรียนตัวอย่าง',
    features:['หน้าหลักและประกาศโรงเรียน','ข้อมูลงานและช่องทางติดต่อ','ตัวอย่างภาพลักษณ์โรงเรียน'],
    offer:'รุ่นทดสอบ · รับปรึกษา', imageSize:[1280,729],
    limitations:'เป็นเดโมของโรงเรียนสมมติ ยังไม่ยืนยันความพร้อมติดตั้งจริง ต้องตรวจขอบเขตและสิทธิ์ก่อนใช้งาน'
  })
];
export const demoOnlyProducts = [
  {
    slug:'met-vote', name:'MET Vote', category:'activities',
    description:'ลองลงคะแนนและดูผลจากข้อมูลสมมติในเบราว์เซอร์ ไม่ใช้สำหรับการลงคะแนนจริง',
    offer:'เดโมเท่านั้น · ยังไม่เปิดขาย', status:'trial', market:true,
    image:'/assets/met-vote-demo.webp',
    imageSize:[1148,652],
    demo:`${storeBase}/demo/met-vote`
  }
];
export const marketProductBySlug = slug => marketProducts.find(module => module.slug===slug);
const paths={
  school:'<path d="M3 21h18M5 21v-9l7-5 7 5v9M10 21v-4h4v4M12 7V3h5l-1.5 2L17 7h-5"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  docs:'<path d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6m-6 4h6"/>'
};
export const marketIcon = name => `<svg class="market-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

export const answers = {
  price:`MET Sport รับประเมินงานตามขอบเขต แพ็กเกจโรงเรียนประมาณ ${schoolPackage.estimate} ระบุจำนวนทีม รายการแข่งขัน และบริการที่ต้องการเพื่อให้ร้านยืนยันราคาในใบเสนอราคา`,
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
