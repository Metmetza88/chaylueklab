import { chromium, webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.env.SATUEK_BASE_URL || 'http://127.0.0.1:8765/satuek-connect/').replace(/\/?$/, '/');
const out = new URL('../../docs/satuek-connect/screenshots/', import.meta.url);
await mkdir(out, { recursive: true });
const KEY = 'satuek-connect:v1';
const checks = [], issues = [];
const check = (name, fn) => (async () => { await fn(); checks.push(name); console.log('ผ่าน: '+name); })();
const assertOverflow = async page => {
  const dimensions = await page.evaluate(() => ({ viewport:innerWidth, body:document.body.scrollWidth, document:document.documentElement.scrollWidth }));
  assert.ok(dimensions.body <= dimensions.viewport && dimensions.document <= dimensions.viewport, JSON.stringify(dimensions));
};
const fillListing = async (page, name = 'ข้าวทดลองจากสวน') => {
  const f = page.locator('#entry-form');
  await f.locator('[name=title]').fill(name);
  await f.locator('[name=category]').selectOption('เกษตรและข้าว');
  await f.locator('[name=area]').selectOption('ทุ่งวัง');
  await f.locator('[name=price]').fill('55');
  await f.locator('[name=unit]').fill('กก.');
  await f.locator('[name=seller]').fill('ร้านทดลองของฉัน');
  await f.locator('[name=description]').fill('ข้าวจากสวน ใช้ทดสอบการบันทึกประกาศเท่านั้น');
  await f.locator('[name=consent]').check();
};
const submit = async page => {
  await page.clock.fastForward(1700);
  await page.locator('#entry-form button[type=submit]').click();
};

for (const config of [
  {name:'iphone-375',engine:webkit,options:{...devices['iPhone SE'],viewport:{width:375,height:812}}},
  {name:'iphone-390',engine:webkit,options:{...devices['iPhone 13'],viewport:{width:390,height:844}}},
  {name:'android-412',engine:chromium,options:{...devices['Pixel 7'],viewport:{width:412,height:915}}},
  {name:'desktop-1440',engine:chromium,options:{viewport:{width:1440,height:1000}}}
]) {
  const browser = await config.engine.launch({headless:true});
  try {
    const context = await browser.newContext(config.options);
    const page = await context.newPage();
    page.on('pageerror', error => issues.push({profile:config.name,error:error.message}));
    page.on('console', msg => {if(msg.type()==='error')issues.push({profile:config.name,console:msg.text()});});
    page.on('response', response => {if(response.status()>=400)issues.push({profile:config.name,status:response.status(),url:response.url()});});
    await page.clock.install();
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    const navigation = page.locator(config.name.startsWith('desktop') ? '.desktop-nav' : '.bottom-nav');
    const navigate = async label => {
      await navigation.getByRole('link',{name:label,exact:true}).click();
      await page.waitForFunction(label => [...document.querySelectorAll('.nav-link[aria-current=page]')].some(x=>x.textContent.trim()===label),label);
    };
    await check(config.name+' เปิดครบ 4 หน้า ไม่มีหน้าขาว/ล้นแนวนอน ภาพและฟอนต์ครบ', async () => {
      for(const [route,label] of [['home','หน้าหลัก'],['market','ตลาดซื้อขาย'],['services','ช่างและบริการ'],['help','ช่วยเหลือ']]) {
        await navigate(label);
        assert.ok(await page.locator('#main h1').textContent());
        await page.locator('#main img').evaluateAll(images => Promise.all(images.map(img => {img.loading='eager';return img.decode();})));
        await page.evaluate(() => document.fonts.ready);
        await assertOverflow(page);
        if(['iphone-390','desktop-1440'].includes(config.name)) await page.screenshot({path:new URL(`${config.name}-${route}.png`,out).pathname,fullPage:true,animations:'disabled'});
      }
      assert.ok(await page.evaluate(() => document.fonts.check('16px Sarabun', 'สตึกคอนเนค')));
      const tels = await page.locator('a[href^="tel:"]').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
      assert.ok(tels.length>0);assert.ok(tels.every(x=>x==='tel:1669'));
      assert.equal(await page.locator('.agency a[href^="tel:"]').count(),0);
    });
    await check(config.name+' ค้นหาครอบคลุมสินค้า ช่าง และตำบล',async()=>{
      await navigate('หน้าหลัก');
      await page.locator('#home-query').fill('ช่างไฟฟ้า');
      await page.locator('#home-search button').click();
      await page.getByRole('heading',{name:'ค้นหาทุกเรื่องใกล้บ้าน',exact:true}).waitFor();
      assert.equal(await page.locator('.service-card').count(),1);
      await navigate('ตลาดซื้อขาย');
      await page.locator('#list-query').fill('ข้าวหอมมะลิ');
      assert.equal(await page.locator('.product-card').count(),1);
      assert.match(await page.locator('.product-card').textContent(),/ข้าวหอมมะลิใหม่/);
      await page.locator('#list-query').fill('');
      assert.equal(await page.locator('#area-filter option').count(),13);
      await page.locator('#area-filter').selectOption('ท่าม่วง');
      assert.equal(await page.locator('.product-card').count(),1);
      assert.match(await page.locator('.product-card').textContent(),/ปลาส้มแม่น้ำมูล/);
      await page.locator('#area-filter').selectOption('กระสัง');
      assert.match(await page.locator('.empty').textContent(),/ยังไม่พบ/);
      await page.getByRole('button',{name:'ล้างตัวกรอง'}).click();
      await page.locator('#category-filter').selectOption('ผักและผลไม้');
      assert.equal(await page.locator('.product-card').count(),1);
      await navigate('ช่างและบริการ');
      assert.equal(await page.locator('.service-card').count(),6,'navigation resets product category');
    });
    await check(config.name+' แบบฟอร์มตรวจข้อมูล บันทึก รีเฟรช แก้ไข และไม่เปิดปุ่มติดต่อที่ยังไม่ยืนยัน',async()=>{
      await navigate('ตลาดซื้อขาย');
      await page.getByRole('button',{name:'ลงขายสินค้า'}).click();
      assert.ok(await page.locator('#modal').isVisible());
      await page.locator('#entry-form button[type=submit]').click();
      assert.equal(await page.locator('#entry-form').evaluate(f=>f.checkValidity()),false);
      await fillListing(page);
      await page.locator('#entry-form [name=phone]').fill('0812345678');
      await submit(page);
      assert.equal(await page.locator('#modal').isVisible(),false);
      await page.reload();
      assert.match(await page.locator('#list-results').textContent(),/ข้าวทดลองจากสวน/);
      await page.locator('.product-card').filter({hasText:'ข้าวทดลองจากสวน'}).locator('[data-action=detail]').first().click();
      assert.match(await page.locator('#dialog-body').textContent(),/รอยืนยันช่องทางติดต่อ/);
      assert.equal(await page.locator('#dialog-body a[href^="tel:"]').count(),0);
      await page.locator('#dialog-body [data-action=edit-product]').click();
      await page.locator('#entry-form [name=title]').fill('ข้าวทดลองแก้ไขแล้ว');
      await page.locator('#entry-form [name=consent]').check();
      await page.clock.fastForward(11000);
      await submit(page);
      assert.match(await page.locator('#list-results').textContent(),/ข้าวทดลองแก้ไขแล้ว/);
      const db=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
      assert.equal(db.products[0].contactVerified,false);
      assert.equal(db.products[0].verified,false);
      await page.locator('.product-card').filter({hasText:'ข้าวหอมมะลิใหม่'}).locator('[data-action=detail]').first().click();
      assert.equal(await page.locator('#dialog-body [data-action=edit-product]').count(),0,'cannot edit seeded listings');
      await page.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).click();
    });
    await check(config.name+' รายการโปรด รีวิวทดลอง และรายงานแยกจากข้อมูลจริง',async()=>{
      await page.locator('.product-card .save-btn').first().click();
      await page.getByRole('button',{name:'รายการที่บันทึก',exact:false}).click();
      assert.equal(await page.locator('.product-card').count(),1);
      await navigate('ช่างและบริการ');
      await page.locator('[data-action=detail-service]').first().click();
      assert.match(await page.locator('#dialog-body').textContent(),/ยังไม่มีรีวิวจากลูกค้าจริง/);
      await page.locator('[data-action=review]').click();
      await page.locator('#entry-form [name=text]').fill('รีวิวทดลองในเครื่อง ไม่ใช่ประสบการณ์ลูกค้าจริง');
      await page.locator('#entry-form [name=consent]').check();await submit(page);
      await page.locator('[data-action=detail-service]').first().click();
      assert.match(await page.locator('.review-item').textContent(),/รีวิวทดลอง/);
      await page.locator('#dialog-body [data-action=report]').click();
      await page.locator('#entry-form [name=reason]').selectOption('ข้อมูลไม่ถูกต้อง');
      await page.locator('#entry-form [name=description]').fill('ทดสอบรายงานข้อมูลไม่ถูกต้องในเครื่อง');
      await page.locator('#entry-form [name=consent]').check();await submit(page);
      assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).reports.length,KEY),1);
    });
    await check(config.name+' แจ้งเรื่อง สถานะ และป้องกันส่งซ้ำอย่างรวดเร็ว',async()=>{
      await navigate('ช่วยเหลือ');
      await page.getByRole('button',{name:'แจ้งเรื่อง',exact:true}).click();
      assert.match(await page.locator('#dialog-body').textContent(),/ไม่มีเจ้าหน้าที่รับเรื่อง/);
      const fillHelp=async title=>{
        await page.locator('#entry-form [name=title]').fill(title);
        await page.locator('#entry-form [name=area]').selectOption('สตึก');
        await page.locator('#entry-form [name=description]').fill('ทดลองขอความช่วยเหลือขนของเข้าศาลาชุมชน');
        await page.locator('#entry-form [name=consent]').check();
      };
      await fillHelp('ขอแรงขนของทดลอง');await submit(page);
      await page.locator('[data-help-id]').selectOption('กำลังดำเนินการ');
      await page.reload();assert.equal(await page.locator('[data-help-id]').inputValue(),'กำลังดำเนินการ');
      await page.locator('[data-help-id]').selectOption('เสร็จสิ้น');
      await page.getByRole('button',{name:'รอความช่วยเหลือ',exact:true}).click();
      assert.ok(await page.locator('#help-results .empty').isVisible());
      await page.getByRole('button',{name:'แจ้งเรื่อง',exact:true}).click();
      await fillHelp('เรื่องทดลองถัดไปเร็วเกินไป');await submit(page);
      assert.ok(await page.locator('#form-error').isVisible());
      assert.match(await page.locator('#form-error').textContent(),/10 วินาที/);
      await page.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).click();
    });
    await check(config.name+' แพ็กเกจครบ ไม่รับเงินจริง และ LIFF ไม่ใช้ ID สมมติ',async()=>{
      await page.locator('footer a[href="#plans"]').click();
      assert.equal(await page.locator('.plan').count(),5);
      for(const price of ['49','199','149','399'])assert.match(await page.locator('#main').textContent(),new RegExp(price));
      await page.locator('[data-action=plan][data-id=shop]').click();
      await page.locator('#entry-form [name=shop]').fill('ร้านค้าทดลอง');
      await page.locator('#entry-form [name=consent]').check();await submit(page);
      assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).interests.length,KEY),1);
      assert.equal(await page.locator('a[href*="stripe"],a[href*="checkout"]').count(),0);
      await page.locator('[data-action=account]').click();
      await page.locator('[data-action=line-login]').click();
      assert.match(await page.locator('#line-state').textContent(),/ยังเข้าสู่ระบบ LINE ไม่ได้/);
      assert.equal(await page.locator('script[src*="line-scdn"]').count(),0);
      await page.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).click();
    });
    await context.close();

    if(config.name==='iphone-390'){
      await check('ลิงก์หน้าที่ไม่รู้จักไม่เรียกเมธอดจากชื่อใน URL และกลับหน้าหลัก',async()=>{
        const context=await browser.newContext(config.options);const page=await context.newPage();const errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        for(const hash of ['constructor','__proto__','toString','%3Cscript%3E']){
          await page.goto(base+'#'+hash);await page.getByRole('heading',{name:/ทุกเรื่องของคนสตึก/}).waitFor();
        }
        assert.deepEqual(errors,[]);await context.close();
      });
      await check('เปิดเดโมได้แม้เบราว์เซอร์ไม่มี crypto.randomUUID',async()=>{
        const context=await browser.newContext(config.options);const page=await context.newPage();
        await page.addInitScript(()=>Object.defineProperty(crypto,'randomUUID',{value:undefined}));
        await page.goto(base);await page.getByRole('heading',{name:/ทุกเรื่องของคนสตึก/}).waitFor();
        const owner=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).owner,KEY);
        assert.match(owner,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
        await context.close();
      });
      await check('ทางลัดครบ 8 หมวด และย้อนกลับในเบราว์เซอร์ได้',async()=>{
        const context=await browser.newContext(config.options);const page=await context.newPage();
        const targets={food:'market',vegetables:'market',rice:'market',secondhand:'market',services:'services',transport:'services',help:'help'};
        for(const [target,route] of Object.entries(targets)){
          await page.goto(base+'#home');
          await page.locator(`[data-action=shortcut][data-target=${target}]`).click();
          assert.ok(page.url().endsWith('#'+route));
          await page.goBack();await page.getByRole('heading',{name:/ทุกเรื่องของคนสตึก/}).waitFor();
        }
        await page.goto(base+'#home');await page.locator('[data-target=news]').click();
        assert.ok(await page.locator('#community').isVisible());await context.close();
      });
      await check('ลงบริการและแก้ไขบริการในเครื่องได้',async()=>{
        const context=await browser.newContext(config.options);const page=await context.newPage();await page.clock.install();
        await page.goto(base+'#services');await page.getByRole('button',{name:'ลงบริการ',exact:true}).click();
        const f=page.locator('#entry-form');
        await f.locator('[name=title]').fill('บริการประปาทดลอง');
        await f.locator('[name=category]').selectOption('ช่างประปา');
        await f.locator('[name=area]').selectOption('สะแก');
        await f.locator('[name=seller]').fill('ทีมช่างทดลอง');
        await f.locator('[name=description]').fill('บริการที่สร้างเพื่อทดลอง ไม่ใช่ข้อมูลผู้ให้บริการจริง');
        await f.locator('[name=consent]').check();await submit(page);
        await page.reload();await page.locator('.service-card').filter({hasText:'บริการประปาทดลอง'}).getByRole('button').click();
        await page.locator('[data-action=edit-service]').click();await f.locator('[name=title]').fill('บริการประปาแก้ไขแล้ว');
        await f.locator('[name=consent]').check();await page.clock.fastForward(11000);await submit(page);
        assert.match(await page.locator('#list-results').textContent(),/บริการประปาแก้ไขแล้ว/);
        await context.close();
      });
      await check('ข้อมูลเสียหายไม่ถูกเขียนทับ และผู้ใช้เห็นวิธีกู้คืน',async()=>{
        const context=await browser.newContext(config.options);const page=await context.newPage();
        await page.addInitScript(key=>localStorage.setItem(key,'{broken-json'),KEY);
        await page.goto(base);
        assert.match(await page.locator('.storage-error').textContent(),/ไม่สามารถอ่านหรือบันทึก/);
        assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),'{broken-json');
        await context.close();
      });
      await check('พื้นที่เก็บเต็มไม่แสดงว่าบันทึกสำเร็จ และฟอร์มยังอยู่',async()=>{
        const context=await browser.newContext(config.options);const page=await context.newPage();await page.clock.install();
        await page.goto(base+'#market');
        await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
        await page.getByRole('button',{name:'ลงขายสินค้า'}).click();await fillListing(page);await submit(page);
        assert.ok(await page.locator('#modal').isVisible());
        assert.match(await page.locator('#form-error').textContent(),/บันทึกไม่สำเร็จ/);
        assert.equal(await page.locator('#entry-form [name=title]').inputValue(),'ข้าวทดลองจากสวน');
        assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).products.length,KEY),0);
        await context.close();
      });
      await check('เนื้อหาจากประกาศไม่กลายเป็น HTML หรือ JavaScript',async()=>{
        const context=await browser.newContext(config.options);const page=await context.newPage();await page.clock.install();
        await page.goto(base+'#market');await page.getByRole('button',{name:'ลงขายสินค้า'}).click();
        const attack='<img src=x onerror="window.__xss=1">';await fillListing(page,attack);await submit(page);
        assert.equal(await page.evaluate(()=>window.__xss),undefined);
        assert.equal(await page.locator('img[src=x]').count(),0);
        assert.match(await page.locator('#list-results').textContent(),/<img src=x/);
        await assertOverflow(page);await context.close();
      });
    }
  } finally {await browser.close();}
}
assert.deepEqual(issues,[],'browser errors, console errors, or failed assets');
checks.push('ไม่มี JavaScript error, console error หรือ asset HTTP error ใน 4 โปรไฟล์');
await writeFile(new URL('../../docs/satuek-connect/browser-results.json',import.meta.url),JSON.stringify({base,checkedAt:new Date().toISOString(),checks,issues,note:'WebKit จำลอง iPhone ไม่ใช่การทดสอบ Safari/LINE บนอุปกรณ์จริง'},null,2)+'\n');
console.log(`ผ่านทั้งหมด ${checks.length} กลุ่มทดสอบ`);
