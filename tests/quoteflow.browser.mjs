import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=process.env.QUOTEFLOW_QA_ROOT||path.join(repo,'docs/quoteflow-2026/local-qa');
const base=process.env.QUOTEFLOW_BASE_URL||'http://127.0.0.1:4173/ai-money-studio/quote-flow.html';
await fs.mkdir(path.join(root,'qa'),{recursive:true});await fs.mkdir(path.join(root,'output'),{recursive:true});
const fixture=repo+'/ai-money-studio/fixtures/';const truth=JSON.parse(await fs.readFile(fixture+'quote-ground-truth.json','utf8'));
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const checks=[];let errors=[];const requests=[];
try{
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
async function open(){await page.goto(base);await page.evaluate(()=>document.fonts.ready);}
async function tab(n){await page.locator('.steps [data-step="'+n+'"]').click();}
async function upload(name,good=true){await tab(1);await page.locator('#file').setInputFiles(fixture+name);await page.waitForFunction(()=>document.querySelector('#global-status').textContent.startsWith('อ่านได้')||document.querySelector('#global-status').classList.contains('error'));if(good)assert.equal(await page.locator('#global-status').evaluate(e=>e.classList.contains('error')),false,await page.locator('#global-status').textContent());}
await open();await page.screenshot({path:root+'/qa/desktop-start.png',fullPage:true});
for(const ext of ['csv','xlsx','docx','pdf']){
 await upload('quote-30-items.'+ext);
 const actual=await page.locator('.item-row').evaluateAll(rs=>rs.map(r=>{const inputs=r.querySelectorAll('input:not([type=checkbox])');return {name:inputs[0].value,quantity:inputs[1].value,unit:inputs[2].value,unitPrice:inputs[3].value}}));
 assert.deepEqual(actual,truth.rows,ext+' all fields equal truth');assert.equal(await page.locator('#total').textContent(),'฿750.00');
 assert.equal(await page.locator('#print').isEnabled(),false);await page.locator('#expected').fill('30');await page.locator('#review-all').click();await tab(3);
 await page.locator('#seller').fill('ร้านตัวอย่าง');await page.locator('#customer').fill('โรงเรียนตัวอย่าง (สมมติ)');await page.locator('#quote-number').fill('DEMO-001');
 assert.equal(await page.locator('#print').isEnabled(),true);checks.push(ext+': 30 rows / every field matches / 750.00 / review gate');
 if(ext==='pdf'){assert.match(await page.locator('#pages').textContent(),/หน้า 1: 15 รายการหน้า 2: 15 รายการ/);await page.screenshot({path:root+'/qa/desktop-quotation.png',fullPage:true});await page.pdf({path:root+'/output/QuoteFlow_Demo_Quotation.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});}
}
await tab(2);await page.getByLabel('จำนวน รายการที่ 1',{exact:true}).fill('3');assert.equal(await page.locator('#reviewed-count').textContent(),'29 / 30');assert.equal(await page.locator('#total').textContent(),'฿762.50');assert.equal(await page.locator('#print').isEnabled(),false);await page.getByLabel('ยืนยันตรวจรายการที่ 1',{exact:true}).check();assert.equal(await page.locator('#print').isEnabled(),true);checks.push('editing resets only that row review; totals exact');
await page.getByLabel('ราคา/หน่วย รายการที่ 1',{exact:true}).fill('1.234');assert.equal(await page.locator('#total').textContent(),'ยังคำนวณไม่ได้');assert.equal(await page.locator('#print').isEnabled(),false);await page.getByLabel('ราคา/หน่วย รายการที่ 1',{exact:true}).fill('12.50');await page.getByLabel('ยืนยันตรวจรายการที่ 1',{exact:true}).check();checks.push('invalid money blocks output and clears displayed sum');
await page.locator('#expected').fill('31');assert.equal(await page.locator('#print').isEnabled(),false);await page.locator('#expected').fill('30');
await tab(3);let d=page.waitForEvent('download');await page.locator('#save-draft').click();let download=await d;await download.saveAs(root+'/qa/roundtrip.json');
let e=page.waitForEvent('download');await page.locator('#export-csv').click();download=await e;await download.saveAs(root+'/qa/export.csv');assert.match(await fs.readFile(root+'/qa/export.csv','utf8'),/762.50|สมุดเส้นบรรทัด/);
await tab(1);await page.locator('#file').setInputFiles(root+'/qa/roundtrip.json');await page.waitForFunction(()=>document.querySelector('#global-status').textContent.startsWith('อ่านได้'));assert.equal(await page.locator('#reviewed-count').textContent(),'0 / 30');assert.equal(await page.locator('#print').isEnabled(),false);checks.push('JSON and CSV downloads; draft restores data with reviews reset');
await upload('quote-missing-8.csv');await page.locator('#expected').fill('30');assert.equal(await page.locator('#review-all').isEnabled(),false);assert.match(await page.locator('#count-status').textContent(),/22/);await page.screenshot({path:root+'/qa/missing-eight.png',fullPage:false});checks.push('known 30 vs 22 is blocked');
await upload('quote-unreadable-page.pdf');await page.locator('#expected').fill('15');assert.equal(await page.locator('#review-all').isEnabled(),false);assert.match(await page.locator('#pages').textContent(),/หน้า 2/);assert.equal(await page.locator('#print').isEnabled(),false);checks.push('unreadable PDF page blocks partial-result finalization');
await upload('quote-formula.xlsx',false);assert.match(await page.locator('#global-status').textContent(),/สูตร/);assert.equal(await page.locator('#print').isEnabled(),false);checks.push('XLSX formulas rejected');
await upload('quote-scan-only.pdf',false);assert.match(await page.locator('#global-status').textContent(),/ไม่มีข้อความ/);checks.push('scan-only PDF rejected explicitly');
await tab(1);await page.locator('#paste-details').evaluate(el=>{el.open=true});await page.locator('#source').fill('สินค้า,จำนวน,ราคา\nA,1,1\nA,1,1');await page.locator('#import').click();await page.locator('#expected').fill('2');await page.locator('#review-all').click();assert.equal(await page.locator('#print').isEnabled(),false);await page.locator('#duplicate-confirm').check();assert.equal(await page.locator('#print').isEnabled(),true);checks.push('duplicates retained; explicit duplicate review required');
await tab(1);await page.locator('#source').fill('สินค้า,จำนวน,ราคา\n<img src=x onerror=alert(1)>,1,12');await page.locator('#import').click();assert.equal(await page.locator('#paper-items img').count(),0);checks.push('HTML input rendered as text');
await page.locator('#expected').fill('1');await page.locator('#review-all').click();await tab(1);await page.locator('#source').fill('สินค้า,จำนวน,ราคา\nnew,1,');assert.equal(await page.locator('#print').isEnabled(),false);checks.push('unimported pasted changes invalidate stale quotation');
await open();await page.locator('#sample').click();await page.locator('#review-all').click();await tab(3);await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('#print').isEnabled(),true);
for(const width of [360,390,430,768,1024,1440]){
 await page.setViewportSize({width,height:900});await tab(1);const over1=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(over1,false,'import width '+width);
 if(width===390)await page.screenshot({path:root+'/qa/iphone-import.png',fullPage:true});await tab(2);const over2=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(over2,false,'review width '+width);
 if(width===390)await page.screenshot({path:root+'/qa/iphone-review.png',fullPage:false});await tab(3);const over3=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(over3,false,'document width '+width);
 checks.push('no horizontal overflow at '+width+'px on all three steps');
}
await page.setViewportSize({width:1440,height:1000});await tab(2);await page.screenshot({path:root+'/qa/desktop-review.png',fullPage:false});
const nonlocal=requests.filter(r=>!r.url.startsWith('http://127.0.0.1:4173/')&&!r.url.startsWith('data:')&&!r.url.startsWith('blob:'));assert.deepEqual(nonlocal,[]);assert.deepEqual(requests.filter(r=>r.method!=='GET'),[]);assert.deepEqual(errors,[]);checks.push('no external document requests, no POST, no browser console errors');
await fs.writeFile(root+'/qa/browser-summary.json',JSON.stringify({engine:await browser.version(),device:'Chromium viewport emulation; not physical iPhone Safari or Windows',checks,requests:requests.length,errors,passed:true},null,2));console.log(JSON.stringify({passed:true,checks},null,2));await context.close();
}catch(e){console.error(e);await fs.writeFile(root+'/qa/browser-summary.json',JSON.stringify({passed:false,error:e.stack,checks,errors},null,2));process.exitCode=1;}finally{await browser.close();}
