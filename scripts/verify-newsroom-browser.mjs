// UI verification with explicit test fixtures; this does NOT prove production deployment.
import assert from 'node:assert/strict';
const { chromium }=await import(process.env.NEWSROOM_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NEWSROOM_BROWSER_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const id='11111111-1111-4111-8111-111111111111';
const fixture={id,slug:'test-fixture',category:'AI',title:'<img src=x onerror=alert(1)>',summary:'UI test fixture',body:'Test article only',verified:true,published_at:'2026-10-06T00:00:00Z',sources:[{url:'https://example.com/reference',label:'Source'},{url:'javascript:alert(1)',label:'Unsafe'}],media:{type:'image',url:'javascript:alert(1)'}};
await page.route('https://yobymeygbfiwlngmwjcn.supabase.co/functions/v1/newsroom**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify([fixture])}));
try{
 await page.goto(`${base}/newsroom.html`);
 await page.locator('.card').waitFor();
 assert.equal(await page.locator('.card img').count(),0,'Unsafe media must not become an element');
 assert.equal(await page.locator('.card h2').textContent(),fixture.title,'Title is inert text');
 assert.equal(await page.locator('.card a[href^="javascript:"]').count(),0);
 assert.equal(await page.locator('.card a[href^="https://example.com"]').count(),1);
 assert.equal(await page.locator('#lineCta').getAttribute('href'),'https://liff.line.me/2011681452-yexLrODy/newsroom.html');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile page overflow');
 await page.getByRole('button',{name:'TikTok',exact:true}).click();
 assert.equal(await page.locator('.card').count(),0);
 assert.match(await page.locator('#stories').textContent(),/ยังไม่มีข่าว/);
 await page.unrouteAll();
 // Local UI fixtures stand in for the existing registered endpoint, never production auth.
 await page.route('**/data/newsroom-config.js',async r=>{
  const response=await r.fetch();
  const body=(await response.text()).replace("liffEndpointUrl: 'https://metmetza88.github.io/chaylueklab/'",`liffEndpointUrl: '${base}/'`);
  await r.fulfill({response,body});
 });
 let fixtureLoggedIn=false;
 await page.route('https://static.line-scdn.net/liff/**',r=>r.fulfill({contentType:'application/javascript',body:`window.testLiffInitIds=[];window.testLoginCalls=0;window.liff={init:async({liffId})=>{window.testLiffInitIds.push(liffId)},isLoggedIn:()=>${fixtureLoggedIn},getIDToken:()=>"test-only-owner-token",login:()=>{window.testLoginCalls++}};`}));
 let story=null;const actions=[];
 await page.route('https://yobymeygbfiwlngmwjcn.supabase.co/functions/v1/newsroom',async r=>{
  const input=r.request().postDataJSON();actions.push(input.action);assert.equal(r.request().headers()['x-line-id-token'],'test-only-owner-token');
  if(input.action==='list')return r.fulfill({contentType:'application/json',body:JSON.stringify({stories:story?[story]:[]})});
  if(input.action==='create'){assert.match(input.request_id,/^[a-f0-9-]{36}$/);story={...input.fields,id,revision:1,status:'pitched',sources:input.fields.sources.map(source=>({...source,label:'Preserved fixture source label'}))}}
  else {assert.equal(input.expected_revision,story.revision);story={...story,revision:story.revision+1};if(input.action==='transition')story.status=input.to_status;if(input.action==='factcheck')story.verified=true;if(input.action==='approve')story.owner_approved_at='2026-10-06T00:00:00Z';if(input.action==='publish')story.status='published'}
  return r.fulfill({contentType:'application/json',body:JSON.stringify({story})});
 });
 await page.goto(`${base}/newsroom-owner.html`);
 await page.waitForFunction(()=>window.testLiffInitIds?.length===1);
 assert.equal(await page.locator('#ownerDesk').isVisible(),false);
 assert.equal(actions.length,0,'Logged-out page must not request owner data');
 await page.getByRole('button',{name:'เข้าสู่ระบบด้วยบัญชี LINE เดิม'}).click();
 await page.waitForFunction(()=>window.testLoginCalls===1);
 assert.deepEqual(await page.evaluate(()=>window.testLiffInitIds),['2011681452-yexLrODy']);
 fixtureLoggedIn=true;
 await page.reload(); // A signed-in callback must resume without requiring a second click.
 await page.locator('#ownerDesk').waitFor();
 assert.deepEqual(actions,['list'],'Resuming LINE login must not write or publish');
 assert.deepEqual(await page.evaluate(()=>window.testLiffInitIds),['2011681452-yexLrODy']);
 await page.locator('#storyTitle').fill('Test fixture draft');await page.locator('#storySlug').fill('test-fixture');await page.locator('#storyReporter').fill('Test reporter');await page.locator('#storyBody').fill('Test body');await page.locator('#storySources').fill('https://example.com/reference');await page.locator('#storySocial').fill('Test copy');await page.locator('#storyImageBrief').fill('Test brief');
 await page.locator('#saveStory').click();await page.waitForFunction(()=>document.querySelector('#storyState').textContent.includes('เวอร์ชัน 1'));
 // Unsaved content must not be fact-checked or handed off as though it were the saved revision.
 await page.locator('#storyBody').fill('An unsaved change must not enter the editorial workflow.');
 const actionsBeforeDirty=actions.length;
 await page.locator('#transitionStory').click();
 await page.waitForFunction(()=>document.querySelector('#ownerStatus').textContent.includes('ยังไม่ได้บันทึก'));
 assert.equal(actions.length,actionsBeforeDirty,'Dirty form must not send a transition');
 await page.locator('.editor-panel details').last().evaluate(details=>details.open=true);
 await page.getByRole('button',{name:'ขอร่างจาก AI',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#ownerStatus').textContent.includes('ยังไม่ได้บันทึก'));
 assert.equal(actions.length,actionsBeforeDirty,'Dirty form must not request provider work');
 await page.locator('#storyBody').fill('Test body');
 // Saving an unrelated field must preserve source labels rather than rewrite them blank.
 await page.locator('#storySocial').fill('Updated test copy');
 const updateWait=page.waitForRequest(request=>request.url().endsWith('/newsroom')&&request.postDataJSON()?.action==='update');
 await page.locator('#saveStory').click();
 const updateRequest=await updateWait;
 assert.equal(updateRequest.postDataJSON().patch.sources[0].label,'Preserved fixture source label');
 await page.waitForFunction(()=>document.querySelector('#storyState').textContent.includes('เวอร์ชัน 2'));
 for(const next of ['assigned','drafting','factcheck']){await page.locator('#nextStatus').selectOption(next);await page.locator('#transitionStory').click();await page.waitForFunction(value=>document.querySelector('#storyState').textContent.startsWith(value),next==='assigned'?'มอบหมายแล้ว':next==='drafting'?'กำลังเขียน':'ตรวจข้อเท็จจริง')}
 await page.locator('#storyBody').fill('Another unsaved edit must not receive a verified flag.');
 const actionsBeforeFactcheck=actions.length;
 await page.locator('#factcheckStory').click();
 await page.waitForFunction(()=>document.querySelector('#ownerStatus').textContent.includes('ยังไม่ได้บันทึก'));
 assert.equal(actions.length,actionsBeforeFactcheck,'Dirty form must not verify previously saved content');
 await page.locator('#storyBody').fill('Test body');
 await page.locator('#reviewNote').fill('Test evidence reviewed against source');await page.locator('#factcheckStory').click();await page.waitForFunction(()=>document.querySelector('#storyState').textContent.includes('เวอร์ชัน 6'));
 for(const [next,label] of [['editing','เกลาต้นฉบับ'],['ready','รอเจ้าของอนุมัติ']]){await page.locator('#nextStatus').selectOption(next);await page.locator('#transitionStory').click();await page.waitForFunction(value=>document.querySelector('#storyState').textContent.startsWith(value),label)}
 assert.equal(actions.includes('publish'),false,'No automatic publication');assert.equal(await page.locator('#storyBody').isDisabled(),true);
 assert.equal(await page.locator('#publishStory').isVisible(),false);
 await page.locator('#approveStory').click();await page.locator('#publishStory').waitFor();
 assert.equal(actions.includes('publish'),false,'Approval alone does not publish');
 await page.locator('#publishStory').click();await page.waitForFunction(()=>document.querySelector('#storyState').textContent.startsWith('เผยแพร่แล้ว'));
 assert.equal(actions.filter(x=>x==='publish').length,1);assert.equal(errors.length,0,errors.join('\n'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile owner form overflow');
 console.log('Browser UI fixtures passed: inert public data, filters, mobile layout, owner draft → factcheck → approval → explicit publication. Production credentials not exercised.');
}finally{await browser.close()}
