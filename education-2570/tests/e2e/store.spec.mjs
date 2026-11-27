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
 for(const img of await page.locator('img').all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);}
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
 await expect(page.getByRole('link',{name:'ดูเอกสารจัดซื้อและแบบฟอร์ม .ac.th'})).toHaveAttribute('href','https://store.chaylueklab.com/school-systems#procurement');
 await page.getByRole('link',{name:'หน้าหลัก',exact:true}).click();
 await entry.getByRole('link',{name:/^เข้าพื้นที่โรงเรียน/}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('พื้นที่ทำงานโรงเรียน');
});
test('catalog search, availability filter, empty state and real demos only',async({page})=>{
 await page.goto('/#/catalog');await expect(page.locator('.product-card')).toHaveCount(17);
 await page.getByRole('searchbox').fill('QR Code');await expect(page.locator('.product-card')).toHaveCount(2);
 await page.getByRole('searchbox').fill('not-existing-test');await expect(page.getByRole('heading',{name:'ยังไม่พบโปรแกรม'})).toBeVisible();
 await page.getByRole('searchbox').fill('');await page.getByLabel('สถานะโปรแกรม').selectOption('trial');await expect(page.locator('.product-card')).toHaveCount(3);
 await page.getByLabel('สถานะโปรแกรม').selectOption('development');await expect(page.locator('.card-actions a')).toHaveCount(0);
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
  await page.getByRole('button',{name:'เปิดเมนู'}).click();await expect(page.getByRole('navigation')).toBeVisible();await page.getByRole('navigation').getByRole('link',{name:'โปรแกรมทั้งหมด',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('แคตตาล็อกซอฟต์แวร์');
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
