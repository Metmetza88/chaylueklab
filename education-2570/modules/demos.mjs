import { esc, head } from '../src/views.mjs';
let questions = [];
export const getQuestions = () => questions;
/** เก็บระบบข้อสอบเดิมไว้ในโมดูลแยก โดยไม่ติดต่อ AI หรือฐานข้อมูล */
export function generateQuestions(count) {
 const n = Math.max(1, Math.min(30, Math.floor(Number(count)||1)));
 questions = Array.from({length:n}, () => {
  const a=1+Math.floor(Math.random()*50), b=1+Math.floor(Math.random()*50);
  return {a,b,answer:a+b};
 });
 return questions;
}
export function scoreAnswers(answers) {
 return questions.filter((q,i)=>answers[i]!=='' && Number(answers[i])===q.answer).length;
}
export function demoPage(slug) {
 const names={'exam-studio':'Exam Studio','smart-exam':'Smart Exam','smart-certificate':'Smart Certificate'};
 if(!names[slug]) return head('ไม่พบหน้าสาธิต');
 const tabs=`<div class="demo-tabs no-print">${Object.entries(names).map(([key,name])=>`<a class="button ${key===slug?'':'secondary'}" href="#/demo/${key}">${name}</a>`).join('')}</div>`;
 const notice='<div class="notice no-print">รุ่นสาธิตในเบราว์เซอร์ ใช้ข้อมูลสมมติ · ไม่บันทึกลงโรงเรียน · ไม่ได้เชื่อม AI</div>';
 let content='';
 if(slug==='exam-studio') content=`<form id="exam-form" class="no-print"><label class="field">จำนวนข้อ (1–30)<input name="count" type="number" min="1" max="30" value="5" required></label><button type="submit">สร้างข้อสอบบวกเลข</button></form><h2 style="margin-top:25px">ข้อสอบและเฉลย</h2><div id="questions">${questionList()}</div><div class="stack-actions no-print"><button class="secondary" data-print>พิมพ์ข้อสอบพร้อมเฉลย</button><a class="button" href="#/demo/smart-exam">ทดลองทำข้อสอบ →</a></div>`;
 if(slug==='smart-exam') content=questions.length?`<form id="quiz-form"><div>${questions.map((q,i)=>`<label class="answer-row">${i+1}. ${q.a} + ${q.b} = <input name="answer${i}" type="number" inputmode="numeric" aria-label="คำตอบข้อ ${i+1}"></label>`).join('')}</div><button type="submit">ส่งคำตอบ</button><p id="score" role="status" style="margin-top:20px"></p></form>`:'<p>กรุณาสร้างข้อสอบก่อนเริ่มทำแบบทดสอบ</p><a class="button" href="#/demo/exam-studio">สร้างข้อสอบ</a>';
 if(slug==='smart-certificate') content=`<form id="certificate-form" class="no-print"><label class="field">ชื่อผู้รับ (ข้อมูลสมมติ)<input name="person" maxlength="100" required></label><label class="field">กิจกรรม<input name="activity" maxlength="200" required></label><button type="submit">สร้างเกียรติบัตร</button></form><div id="certificate-output" class="certificate" style="margin-top:25px"><h2>เกียรติบัตรตัวอย่าง</h2><p>ขอมอบให้</p><h3 id="recipient">ชื่อผู้รับ</h3><p id="event-name">กิจกรรม</p><small>เอกสารสาธิต ไม่ใช่ใบรับรองอย่างเป็นทางการ<br>ยังไม่มีระบบตรวจสอบใบประกาศ</small></div><button class="secondary no-print" style="margin-top:20px" data-print>พิมพ์ / บันทึก PDF ผ่านเบราว์เซอร์</button>`;
 return head(names[slug],'Software Module · สาธิตการทำงานเดิม')+`<section class="section container">${tabs}${notice}<div class="panel">${content}</div></section>`;
}
export function questionList() {
 return questions.length?questions.map((q,i)=>`<p>${i+1}. ${q.a} + ${q.b} = <strong>${q.answer}</strong></p>`).join(''):'<p class="muted">ยังไม่มีข้อสอบ กรุณากดสร้างข้อสอบ</p>';
}
/** ใส่ชื่อผ่าน textContent โดยไม่อนุญาตให้ HTML ทำงาน */
export function updateCertificate(form,doc=document) {
 const fields=new FormData(form);
 doc.getElementById('recipient').textContent=String(fields.get('person')).trim();
 doc.getElementById('event-name').textContent=String(fields.get('activity')).trim();
}
export function quoteDraft({schoolName,note,products}) {
 return `<div class="quote-draft"><h2>สรุปคำขอใบเสนอราคา</h2><p><strong>หน่วยงาน:</strong> ${esc(schoolName)}</p><ul>${products.map(p=>`<li>${esc(p.name)} — ขอใบเสนอราคา</li>`).join('')}</ul><p>${esc(note)}</p><p class="notice">ฉบับร่างเพื่อประเมินความต้องการ · ยังไม่ใช่ใบเสนอราคาอย่างเป็นทางการ · ยังไม่ได้ส่งให้ทีมงาน</p></div>`;
}
