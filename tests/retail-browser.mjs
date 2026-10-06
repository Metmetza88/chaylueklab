// UI contract tests only: LINE and API are fixtures. No simulated data ships in control.js.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const server=createServer(async(req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1);if(!['control.html','control.js','control.css','index.html','assets/fonts/control-thai.woff2'].includes(name)){res.writeHead(404);return res.end()}try{res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':'text/html');res.end(await readFile(new URL('../'+name,import.meta.url)))}catch{res.writeHead(500);res.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const testURL=`http://127.0.0.1:${server.address().port}/control.html`;
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/../package.json`:import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.RETAIL_BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const actor='U'+'a'.repeat(32),id='22222222-2222-4222-8222-222222222222';
try{
 for(const width of [320,390,412,1280]){
 const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1});const page=await context.newPage();let errors=[],requests=[],stock=8,lost=false,ledger=new Map();
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://static.line-scdn.net/**',r=>r.fulfill({contentType:'application/javascript',body:`window.liff={init:async()=>{},isLoggedIn:()=>true,getIDToken:()=>"test-id",getAccessToken:()=>null}` }));
 await page.route('**/functions/v1/retail-control',async route=>{
  const b=route.request().postDataJSON();requests.push(b);
  if(b.action==='transact'){
   if(!ledger.has(b.requestId)){stock+=b.kind==='sale'?-b.quantity:b.quantity;ledger.set(b.requestId,{product_id:id,stock_after:stock,kind:b.kind,quantity:b.quantity})}
   if(lost){lost=false;return route.abort('failed')}
   return route.fulfill({json:{ok:true,transaction:ledger.get(b.requestId),replayed:requests.filter(x=>x.requestId===b.requestId).length>1}});
  }
  return route.fulfill({json:{ok:true,owner:true,lineUserId:actor,day:b.day,stats:{sold:8-stock,remaining:stock+2,low:1,out:1,revenue_cents:(8-stock)*5900,received:0},products:[{id,name:'เสื้อสีกรม',variant:'XL',sku:'NAVY-XL',quantity:stock,price_cents:5900,low_threshold:3},{id:'33333333-3333-4333-8333-333333333333',name:'เสื้อสีครีม',variant:'M',sku:'CREAM-M',quantity:2,price_cents:5900,low_threshold:3},{id:'44444444-4444-4444-8444-444444444444',name:'เสื้อสีดำ',variant:'L',sku:'BLACK-L',quantity:0,price_cents:5900,low_threshold:3}],channels:[{channel:'line',units:8-stock,revenue_cents:(8-stock)*5900}],recent:[]}});
 });
 await page.goto(process.env.RETAIL_TEST_URL||testURL);await page.waitForSelector('.product-card');
 assert.equal(await page.locator(`[data-product="${id}"] .stock-number`).textContent(),'08');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow at ${width}`);
 assert.equal(await page.locator('.product-card.out [data-sell]').isDisabled(),true);
 await page.evaluate(()=>document.fonts.ready);if(width===390)await page.screenshot({path:'/tmp/chaylueklab-control-mobile.png',fullPage:true});
 await page.locator(`[data-sell="${id}"]`).click();await page.locator('label:has(input[value="line"])').click();await page.locator('#confirm').click();await page.waitForFunction(()=>!document.querySelector('#transactionDialog').open);await page.waitForFunction(()=>document.querySelector('.stock-number').textContent==='07');
 assert.equal(requests.find(x=>x.action==='transact').channel,'line');assert.equal(await page.locator('#toast').textContent(),'✓ ขายเรียบร้อย');
 lost=true;await page.locator(`[data-sell="${id}"]`).click();await page.locator('#confirm').click();await page.waitForFunction(()=>document.querySelector('#confirm').textContent==='ตรวจรายการเดิมอีกครั้ง');
 const original=requests.filter(x=>x.action==='transact').at(-1).requestId;
 await page.locator('#transactionDialog [data-close]').click();await page.reload();await page.waitForSelector('#pendingBanner:not([hidden])');await page.locator('#recover').click();await page.locator('#confirm').click();await page.waitForFunction(()=>!document.querySelector('#transactionDialog').open);
 assert.equal(requests.filter(x=>x.action==='transact').at(-1).requestId,original);assert.equal(stock,6);assert.equal(ledger.size,2);
 await page.locator(`[data-receive="${id}"]`).click();await page.locator('#quantity').fill('3');await page.locator('#confirm').click();await page.waitForFunction(()=>!document.querySelector('#transactionDialog').open);await page.waitForFunction(()=>document.querySelector('.stock-number').textContent==='09');assert.equal(stock,9);
 await page.locator('.bottom-nav [data-go="reports"]').click();await page.waitForFunction(()=>document.querySelector('#reportSummary').textContent.includes('ขาย'));
 assert.equal(await page.locator('#reports').isVisible(),true);const downloaded=page.waitForEvent('download');await page.locator('#export').click();assert.match((await downloaded).suggestedFilename(),/^CHAYLUEKLAB-.*\.csv$/);assert.deepEqual(errors,[]);
 console.log(`PASS ${width}px: shared stock rendering, online sale, receive stock, lost-response reload/retry, reports/CSV, no overflow/errors`);
 await context.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
