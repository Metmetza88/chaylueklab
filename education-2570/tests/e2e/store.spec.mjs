import {test,expect} from '@playwright/test';
const SCHOOL='10000000-0000-4000-8000-000000000001';
const USER='20000000-0000-4000-8000-000000000001';
test('homepage, illustrations and mobile layout',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toContainText('งานโรงเรียนที่ง่ายขึ้น');
 await expect(page.getByRole('navigation',{name:'เลือกงานที่ต้องการ'}).getByRole('link')).toHaveCount(4);
 await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 for(const img of await page.locator('img:visible').all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);}
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:`evidence/home-${info.project.name.replaceAll(' ','-')}.png`,fullPage:true});
 expect(errors).toEqual([]);
 await page.locator('.skip').focus();await page.keyboard.press('Enter');
 await expect(page.locator('main')).toBeFocused();await expect(page.getByRole('heading',{level:1})).toContainText('งานโรงเรียนที่ง่ายขึ้น');
});
test('the shared homepage goes to catalog, demos, procurement and the school workspace',async({page})=>{
 const entry=page.getByRole('navigation',{name:'เลือกงานที่ต้องการ'});
 await page.goto('/');
 await entry.getByRole('link',{name:/^ดูโปรแกรม/}).click();
 await expect(page.getByRole('link',{name:'เปิดแคตตาล็อก MET'})).toHaveAttribute('href','https://store.chaylueklab.com/products');
 await page.getByRole('link',{name:'หน้าหลัก',exact:true}).click();
 await entry.getByRole('link',{name:/^ทดลองระบบ/}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('ทดลองระบบโรงเรียน');
 await expect(page.getByRole('link',{name:'ทดลองเช็กชื่อ'})).toHaveAttribute('href','https://store.chaylueklab.com/demo/met-attendance');
 await expect(page.locator('.product-card')).toHaveCount(3);
 await page.getByRole('link',{name:'หน้าหลัก',exact:true}).click();
 await entry.getByRole('link',{name:/^ราคาและเอกสารจัดซื้อ/}).click();
 await expect(page.getByRole('link',{name:'ดูเอกสารจัดซื้อและแบบฟอร์ม .ac.th'})).toHaveAttribute('href','https://store.chaylueklab.com/school-systems#procurement-samples');
 await page.getByRole('link',{name:'หน้าหลัก',exact:true}).click();
 await entry.getByRole('link',{name:/^เข้าพื้นที่โรงเรียน/}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('พื้นที่ทำงานโรงเรียน');
});
test('home highlights the two synthetic teacher demos without sign-in',async({page})=>{
 await page.goto('/');
 const featured=page.getByRole('group',{name:'เดโมสำหรับครู'});
 await expect(featured).toBeVisible();
 await expect(page.getByText('เดโมใช้ข้อมูลสมมติ · ยังไม่ต้องเข้าสู่ระบบ')).toBeVisible();
 await featured.getByRole('link',{name:'ทดลองสร้างข้อสอบ',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Exam Studio');
 await page.goBack();
 await featured.getByRole('link',{name:'ทดลองทำเกียรติบัตร',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Smart Certificate');
 await page.goBack();
 await page.getByRole('link',{name:'เตรียมคำขอใบเสนอราคา',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('ขอใบเสนอราคา');
});
test('catalog counters begin when scrolled into view, with a reduced-motion fallback',async({page})=>{
 await page.setViewportSize({width:390,height:480});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/');
 const stats=page.getByRole('region',{name:'Education 2570 ในตัวเลข'});
 await expect(stats).toHaveAttribute('data-counter-state','waiting');
 await stats.scrollIntoViewIfNeeded();
 await expect(stats).toHaveAttribute('data-counter-state','done');
 await expect(stats.locator('[data-count-to]')).toHaveText(['17','14','7']);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.reload();
 await stats.scrollIntoViewIfNeeded();
 await expect(stats.locator('[data-count-to]')).toHaveText(['17','14','7']);
 expect(await stats.getAttribute('data-counter-state')).toBeNull();
});
test('home tabs swap the sample screen in place and FAQ answers toggle',async({page})=>{
 await page.goto('/');
 const tabs=page.getByRole('tablist',{name:'หมวดฟีเจอร์'});
 const previousUrl=page.url();
 const finance=tabs.getByRole('tab',{name:'งานการเงิน'});
 await finance.click();
 await expect(finance).toHaveAttribute('aria-selected','true');
 const panel=page.getByRole('tabpanel',{name:'งานการเงิน'});
 await expect(panel.getByRole('img')).toHaveAttribute('src','/assets/finance.svg');
 await expect.poll(()=>panel.getByRole('img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect(panel.getByText(/วางระบบบันทึกรายรับรายจ่าย/)).toBeVisible();
 await finance.press('ArrowRight');
 await expect(tabs.getByRole('tab',{name:'งานกิจกรรม'})).toBeFocused();
 await expect(page.getByRole('tabpanel',{name:'งานกิจกรรม'}).getByRole('img')).toHaveAttribute('src','/assets/activities.svg');
 expect(page.url()).toBe(previousUrl);
 const answer=page.getByText(/เดโมใช้ข้อมูลสมมติ ไม่ควรกรอกข้อมูลนักเรียนจริง/);
 await expect(answer).toBeHidden();
 const question=page.getByText('ข้อมูลนักเรียนปลอดภัยแค่ไหน',{exact:true});
 await question.click();
 await expect(answer).toBeVisible();
 await question.click();
 await expect(answer).toBeHidden();
});
test('catalog search, availability filter, empty state and real demos only',async({page})=>{
 await page.goto('/#/catalog');await expect(page.locator('.product-card')).toHaveCount(18);
 await page.getByRole('searchbox').fill('QR Code');await expect(page.locator('.product-card')).toHaveCount(2);
 await page.getByRole('searchbox').fill('not-existing-test');await expect(page.getByRole('heading',{name:'ยังไม่พบโปรแกรม'})).toBeVisible();
 await page.getByRole('searchbox').fill('');await page.getByLabel('สถานะโปรแกรม').selectOption('trial');await expect(page.locator('.product-card')).toHaveCount(3);
 await page.getByLabel('สถานะโปรแกรม').selectOption('development');await expect(page.locator('.card-actions a[href^="#/demo/"]')).toHaveCount(0);
});
test('the catalog starter bundle opens each demo and preselects all three quotation items',async({page})=>{
 await page.goto('/#/catalog');
 const bundle=page.getByRole('region',{name:'ชุดข้อสอบและเกียรติบัตร'});
 for(const [label,title] of [
  ['ลองสร้างข้อสอบ','Exam Studio'],
  ['ลองสอบออนไลน์','Smart Exam'],
  ['ลองทำเกียรติบัตร','Smart Certificate']
 ]){
  await bundle.getByRole('link',{name:label}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText(title);
  await page.goBack();
 }
 await expect(page.getByRole('link',{name:'ติดต่อร้าน พ.สมนึก 2&3'})).toHaveAttribute('href','https://psomnuek.chaylueklab.com/work?view=shop');
 await bundle.getByRole('link',{name:'ขอราคาทั้งชุด'}).click();
 const selected=await page.locator('#quote-form input[name="module"]:checked').evaluateAll(inputs=>inputs.map(input=>input.value));
 expect(selected).toEqual(['exam-studio','smart-exam','smart-certificate']);
 await page.getByLabel('ชื่อโรงเรียน / หน่วยงาน').fill('โรงเรียนทดสอบ');
 await page.getByRole('button',{name:'สร้างสรุปคำขอ'}).click();
 await expect(page.locator('#quote-result li')).toHaveCount(3);
 await expect(page.locator('#quote-result')).toContainText('ยังไม่ได้ส่งให้ทีมงาน');
});
test('product details contain features, limitations and quotation without invented price',async({page})=>{
 await page.goto('/#/product/procurement');
 await expect(page.getByRole('heading',{level:1,name:'งานจัดซื้อจัดจ้าง'})).toBeVisible();
 await expect(page.getByText(/ไม่ได้เชื่อมต่อ e-GP/)).toBeVisible();
 await expect(page.getByRole('link',{name:'ทดลองใช้งาน →',exact:true})).toHaveCount(0);
 await expect(page.locator('main')).not.toContainText(/\d[,.]?\d* บาท/);
});
test('comparison limits three selections and persists selection',async({page})=>{
 await page.goto('/#/catalog');
 const picks=page.locator('[data-compare]');
 for(let i=0;i<4;i++)await picks.nth(i).click();
 await expect(picks.nth(3)).not.toBeChecked();
 await expect(page.getByRole('status').last()).toContainText('สูงสุด 3');
 await page.goto('/#/compare');await expect(page.locator('thead th')).toHaveCount(4);
 await page.reload();await expect(page.locator('thead th')).toHaveCount(4);
 await page.getByRole('button',{name:'นำออก'}).first().click();await expect(page.locator('thead th')).toHaveCount(3);
});
test('preserved exam studio and online scoring work',async({page})=>{
 await page.goto('/#/demo/exam-studio');await page.getByLabel('จำนวนข้อ').fill('3');await page.getByRole('button',{name:'สร้างข้อสอบบวกเลข'}).click();
 const answers=await page.locator('#questions strong').allTextContents();expect(answers).toHaveLength(3);
 await page.getByRole('link',{name:'ทดลองทำข้อสอบ →'}).click();
 for(let i=0;i<3;i++)await page.getByLabel(`คำตอบข้อ ${i+1}`).fill(answers[i]);
 await page.getByRole('button',{name:'ส่งคำตอบ'}).click();await expect(page.locator('#score')).toHaveText('คะแนน 3 / 3');
});
test('certificate escapes HTML and has a real print action',async({page})=>{
 await page.goto('/#/demo/smart-certificate');
 await page.getByLabel('ชื่อผู้รับ').fill('<img src=x onerror=alert(1)>');await page.getByLabel('กิจกรรม',{exact:true}).fill('กิจกรรมทดสอบ');
 await page.getByRole('button',{name:'สร้างเกียรติบัตร'}).click();await expect(page.locator('#recipient')).toHaveText('<img src=x onerror=alert(1)>');await expect(page.locator('#recipient img')).toHaveCount(0);
 await page.evaluate(()=>{window.print=()=>{document.body.dataset.printed='true';};});
 await page.getByRole('button',{name:/พิมพ์ \/ บันทึก PDF/}).click();await expect(page.locator('body')).toHaveAttribute('data-printed','true');
});
test('quotation draft is honest, escapes inputs and does not claim submission',async({page})=>{
 await page.goto('/#/quote?module=exam-studio');await page.getByLabel('ชื่อโรงเรียน / หน่วยงาน').fill('โรงเรียนทดสอบ <script>');await page.getByLabel('รายละเอียดความต้องการ').fill('ผู้ใช้งาน 10 คน');
 await page.getByRole('button',{name:'สร้างสรุปคำขอ'}).click();await expect(page.locator('#quote-result')).toContainText('ยังไม่ได้ส่งให้ทีมงาน');await expect(page.locator('#quote-result script')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'เปิด LINE พ.สมนึก 2&3'})).toHaveAttribute('href','https://lin.ee/8qkUbdt');
 await page.getByRole('button',{name:'เข้าสู่ระบบ / ส่งคำขอ'}).click();await expect(page.locator('#send-status')).toContainText('ระบบบัญชียังไม่เชื่อมต่อ');
});
test('unconfigured login and workspace show actual blocker states',async({page})=>{
 await page.goto('/#/login');await expect(page.getByText(/ระบบบัญชียังไม่เชื่อมต่อ/)).toBeVisible();await expect(page.getByRole('textbox',{name:'อีเมล'})).toHaveCount(0);
 await page.goto('/#/workspace');await expect(page.getByRole('alert')).toContainText('ยังไม่เชื่อมต่อ');await expect(page.getByRole('button',{name:'ลองอีกครั้ง'})).toBeVisible();
});
test('help, manual and mobile menu links navigate',async({page},info)=>{
 await page.goto('/#/help');await page.getByText('เชื่อม AI หรือ e-GP แล้วหรือยัง?',{exact:true}).click();await expect(page.getByText(/ไม่มีการอ้างการรับรอง/)).toBeVisible();
 await page.goto('/#/manual');await expect(page.getByRole('heading',{name:'1. สำรวจโปรแกรม'})).toBeVisible();
 if(info.project.name==='iPhone WebKit'){
  await page.getByRole('button',{name:'เปิดเมนู'}).click();const mainNav=page.getByRole('navigation',{name:'เมนูหลัก'});await expect(mainNav).toBeVisible();await mainNav.getByRole('link',{name:'โปรแกรมทั้งหมด',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('แคตตาล็อกซอฟต์แวร์');
 }
});
/** ใช้ mock เฉพาะทดสอบ UI flow; ไม่ใช่หลักฐานเชื่อม Supabase จริง */
async function mockPlatform(page,{admin=false}={}){
 const received=[];
 await page.route('**/api/education?*',async route=>{
  const req=route.request(),url=new URL(req.url()),action=url.searchParams.get('action');
  received.push({action,body:req.postDataJSON()});
  let data={};let status=200;
  if(action==='config')data={authConfigured:true,platformEnabled:true};
  if(action==='login')data={signedIn:true};
  if(action==='me')data={id:USER,email:'test@example.test',members:[{school_id:SCHOOL,role:'admin'}],platformEnabled:true};
  if(action==='workspace')data={school:{name:'โรงเรียนตัวอย่าง (Mock)'},entitlements:[],licenses:[],notifications:[]};
  if(['quotations','services','notifications','profile'].includes(action))data=[];
  if(['service','quotation','provision','customer-profile'].includes(action))data=[{id:'30000000-0000-4000-8000-000000000001'}];
  if(action==='admin') {status=admin?200:403;data=admin?{schools:[{id:SCHOOL,name:'โรงเรียนตัวอย่าง (Mock)'}],customers:[],licenses:[],entitlements:[],products:[{slug:'smart-exam',name:'Smart Exam',status:'trial',enabled:false}],services:[],quotations:[],audit:[],page:1}:{error:'เฉพาะผู้ดูแลแพลตฟอร์ม'};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 return received;
}
test('mocked account: login, school empty state and service request success',async({page})=>{
 const received=await mockPlatform(page);await page.goto('/#/login');await page.getByLabel('อีเมล',{exact:true}).fill('test@example.test');await page.getByLabel('รหัสผ่าน',{exact:true}).fill('test-password');await page.getByRole('button',{name:'เข้าสู่ระบบ →'}).click();
 await expect(page.getByRole('heading',{name:'ยังไม่มีโปรแกรมที่ได้รับสิทธิ์'})).toBeVisible();
 await page.goto('/#/account');await page.getByLabel('หัวข้อ',{exact:true}).fill('ทดสอบการรับเรื่อง');await page.getByLabel('รายละเอียด',{exact:true}).fill('ข้อมูลสมมติสำหรับทดสอบเท่านั้น');await page.getByRole('button',{name:'ส่งเรื่องแจ้งปัญหา'}).click();await expect(page.locator('#toast')).toContainText('ส่งเรื่องแจ้งปัญหาแล้ว');
 expect(received.find(r=>r.action==='service').body.school_id).toBe(SCHOOL);
});
test('mocked quote submission requires confirmation and selected school',async({page})=>{
 const received=await mockPlatform(page);await page.goto('/#/quote?module=smart-exam');await page.getByLabel('ชื่อโรงเรียน / หน่วยงาน').fill('ชื่อหน่วยงานบนเอกสาร');await page.getByRole('button',{name:'สร้างสรุปคำขอ'}).click();await page.getByRole('button',{name:'เข้าสู่ระบบ / ส่งคำขอ'}).click();
 expect(received.filter(r=>r.action==='quotation')).toHaveLength(0);
 await page.getByRole('button',{name:'ยืนยันส่งคำขอ'}).click();await expect(page.locator('#send-status')).toContainText('บันทึกคำขอแล้ว');expect(received.find(r=>r.action==='quotation').body.modules).toEqual(['smart-exam']);
});
test('mocked admin denies ordinary school admin and renders authorized admin',async({page})=>{
 await mockPlatform(page);await page.goto('/#/admin');await expect(page.getByRole('alert')).toContainText('เฉพาะผู้ดูแลแพลตฟอร์ม');
 await page.unrouteAll({behavior:'wait'});await mockPlatform(page,{admin:true});await page.reload();await expect(page.getByRole('heading',{name:'ทะเบียนโปรแกรม / Feature Flags'})).toBeVisible();
});
test('mocked customer profile sends only current school and contact name',async({page})=>{
 const received=await mockPlatform(page);await page.goto('/#/account');await page.getByLabel('ชื่อผู้ติดต่อ',{exact:true}).fill('ครูทดสอบ');await page.getByRole('button',{name:'บันทึกชื่อผู้ติดต่อ'}).click();await expect(page.locator('#toast')).toContainText('บันทึกข้อมูลผู้ติดต่อแล้ว');
 expect(received.find(r=>r.action==='customer-profile').body).toEqual({school_id:SCHOOL,contact_name:'ครูทดสอบ'});
});
test('mocked platform admin issues license only after approval checkbox',async({page})=>{
 const received=await mockPlatform(page,{admin:true});await page.goto('/#/admin');
 const form=page.locator('#provision-form');await form.getByRole('combobox',{name:'โรงเรียน',exact:true}).selectOption(SCHOOL);await form.getByRole('combobox',{name:'โปรแกรม',exact:true}).selectOption('smart-exam');await form.getByLabel('วันสิ้นสุดสิทธิ์').fill('2027-12-01');
 await form.getByRole('button',{name:'ออก License และสิทธิ์โรงเรียน'}).click();expect(received.filter(r=>r.action==='provision')).toHaveLength(0);
 await form.getByRole('checkbox').check();await form.getByRole('button',{name:'ออก License และสิทธิ์โรงเรียน'}).click();await expect(page.locator('#toast')).toContainText('ออกสิทธิ์เรียบร้อยแล้ว');
 expect(received.find(r=>r.action==='provision').body).toEqual({school_id:SCHOOL,module_slug:'smart-exam',expires_on:'2027-12-01'});
});
test('marketplace search filters real cards and the sports card stays first in matching results',async({page})=>{
 await page.goto('/');
 const featured=page.getByRole('region',{name:'ไฮไลต์สำหรับโรงเรียน'});
 await expect(featured.locator('[data-market-card]').first()).toHaveAttribute('data-market-card','met-sport');
 await page.getByRole('button',{name:'ค้นหาโปรแกรมจากแถบด้านบน'}).click();
 const input=page.getByRole('searchbox',{name:'พิมพ์ชื่อโปรแกรมหรือคุณสมบัติ'});
 await input.fill('กีฬาสี');
 await expect(page.getByRole('heading',{level:1})).toHaveText('แคตตาล็อกซอฟต์แวร์');
 await expect(input).toBeFocused();
 await expect(page.locator('#catalog-list .product-card')).toHaveCount(1);
 await expect(page.locator('#catalog-list .product-card').first()).toHaveAttribute('data-market-card','met-sport');
 await input.fill('');
 await expect(page.locator('#catalog-list .product-card')).toHaveCount(18);
 await expect(page.locator('#catalog-list .product-card').first()).toHaveAttribute('data-market-card','met-sport');
 await input.fill('QR Code');
 await expect(page.locator('#catalog-list .product-card')).toHaveCount(2);
 await expect(page.locator('#catalog-list .featured-product')).toHaveCount(0);
 await input.press('Escape');
 await expect(input).toBeHidden();
});
test('marketplace details link to procurement and prefill the existing sports quotation draft',async({page})=>{
 await page.goto('/#/catalog');
 const sport=page.locator('.product-card').first();
 await expect(sport).toContainText('ขอใบเสนอราคา');
 await expect(sport).toContainText('เปิดรับออเดอร์');
 await expect(sport.getByRole('img')).toHaveAttribute('src','/assets/met-sport-demo.webp');
 const cta=sport.getByRole('button',{name:'ดูรายละเอียด / ขอใบเสนอราคา'});
 await cta.click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toHaveAccessibleName('ระบบบริหารจัดการแข่งขันกีฬาสีภายในโรงเรียน');
 await expect(dialog.getByRole('link',{name:'ดูเอกสารจัดซื้อและแบบฟอร์ม'})).toHaveAttribute('href','https://store.chaylueklab.com/school-systems#procurement-samples');
 await dialog.getByRole('button',{name:'ปิดรายละเอียด'}).click();await expect(dialog).toBeHidden();
 await expect(cta).toBeFocused();
 await cta.click();
 await dialog.getByRole('link',{name:'เตรียมคำขอใบเสนอราคา'}).click();
 await expect(dialog).toBeHidden();
 await expect(page.locator('#quote-form input[value="activities"]')).toBeChecked();
 await expect(page.getByLabel('รายละเอียดความต้องการ')).toHaveValue(/MET Sport/);
 await page.getByLabel('ชื่อโรงเรียน / หน่วยงาน').fill('โรงเรียนทดสอบ');
 await page.getByRole('button',{name:'สร้างสรุปคำขอ'}).click();
 await expect(page.locator('#quote-result')).toContainText('MET Sport');
 await expect(page.locator('#quote-result')).toContainText('ยังไม่ได้ส่งให้ทีมงาน');
});
test('marketplace quick questions, notifications, LINE and five mobile shortcuts work',async({page},info)=>{
 await page.goto('/');
 const line=page.getByRole('link',{name:'แชท LINE พ.สมนึก 2&3'});
 await expect(line).toHaveAttribute('href','https://lin.ee/8qkUbdt');
 await page.getByRole('button',{name:/ถามได้เลย/}).click();
 let dialog=page.getByRole('dialog');
 await dialog.getByRole('button',{name:'ราคา',exact:true}).click();
 await expect(dialog.getByRole('log')).toContainText('MET Sport เปิดรับออเดอร์');
 await dialog.getByRole('textbox',{name:'พิมพ์คำถาม'}).fill('เบิกงบได้ไหม');
 await dialog.getByRole('button',{name:'ถาม',exact:true}).click();
 await expect(dialog.getByRole('log')).toContainText('งบที่ได้รับอนุมัติ');
 await dialog.getByRole('button',{name:'ปิดกล่องถามตอบ'}).click();
 await page.getByRole('button',{name:'แจ้งเตือน',exact:true}).click();
 await expect(dialog.getByRole('link',{name:'เปิดบัญชีลูกค้าและแจ้งเตือน'})).toHaveAttribute('href','#/account');
 await dialog.getByRole('button',{name:'ปิดแจ้งเตือน'}).click();
 const nav=page.getByRole('navigation',{name:'ทางลัดบนมือถือ'});
 if(info.project.name==='iPhone WebKit'){
   await expect(nav.getByRole('link')).toHaveCount(4);await expect(nav.getByRole('button')).toHaveCount(1);
   await expect(nav.getByRole('link',{name:'หน้าแรก'})).toHaveAttribute('aria-current','page');
   await expect(nav.getByRole('link',{name:'เอกสารเบิกงบ'})).toHaveAttribute('href','https://store.chaylueklab.com/school-systems#procurement-samples');
   await nav.getByRole('link',{name:'ขอใบเสนอราคา'}).click();
   await expect(nav.getByRole('link',{name:'ขอใบเสนอราคา'})).toHaveAttribute('aria-current','page');
   await nav.getByRole('button',{name:'ติดต่อเรา'}).click();
   await expect(dialog.getByRole('link',{name:'เปิด LINE พ.สมนึก 2&3'})).toHaveAttribute('href','https://lin.ee/8qkUbdt');
   await dialog.getByRole('button',{name:'ปิดช่องทางติดต่อ'}).click();
   await page.setViewportSize({width:320,height:640});
   await nav.getByRole('link',{name:'ระบบทั้งหมด'}).click();
   await expect(page.locator('[data-market-card="met-sport"]')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
   const buttonBox=await line.boundingBox(),navBox=await nav.boundingBox();
   expect(buttonBox.y+buttonBox.height).toBeLessThan(navBox.y);
 }else{
   await expect(nav).toBeHidden();
   await page.locator('.market-header-actions').getByRole('button',{name:'ติดต่อเรา'}).click();
   await expect(dialog.getByRole('link',{name:'เปิด LINE พ.สมนึก 2&3'})).toBeVisible();
 }
});
