import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {appEntryUrl} from '../assets/site-entry.js';
const base='https://metmetza88.github.io/chaylueklab/';

test('canonical GitHub Pages LIFF entry continues to open personal Life OS',()=>{
  assert.equal(appEntryUrl(base),base+'app-20261007.html');
  assert.equal(appEntryUrl(base+'index.html'),base+'app-20261007.html');
  assert.equal(appEntryUrl(base+'?liff.state=%3Fview%3Dcontrol&code=fixture&state=fixture'),base+'app-20261007.html?liff.state=%3Fview%3Dcontrol&code=fixture&state=fixture');
});
test('custom brand domain and Vercel previews open existing shop and services',()=>{
  assert.equal(appEntryUrl('https://chaylueklab.com/'),'https://chaylueklab.com/business.html');
  assert.equal(appEntryUrl('https://chaylueklab.com/?utm_source=share#products'),'https://chaylueklab.com/business.html?utm_source=share#products');
  assert.equal(appEntryUrl('https://preview.vercel.app/'),'https://preview.vercel.app/business.html');
});
test('LIFF and explicit workspace deep links still route to personal Life OS',()=>{
  assert.equal(appEntryUrl('https://chaylueklab.com/?liff.state=%2Fstock'),'https://chaylueklab.com/app-20261007.html?liff.state=%2Fstock');
  assert.equal(appEntryUrl('https://chaylueklab.com/?liffClientId=2011681452'),'https://chaylueklab.com/app-20261007.html?liffClientId=2011681452');
  assert.equal(appEntryUrl('https://chaylueklab.com/?code=x&state=y'),'https://chaylueklab.com/app-20261007.html?code=x&state=y');
  assert.equal(appEntryUrl('https://chaylueklab.com/?view=stock'),'https://chaylueklab.com/app-20261007.html?view=stock');
});
test('brand entry includes useful fallback links when JavaScript is blocked',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.includes('src="./assets/site-entry.js"'));
  assert.ok(html.includes('href="./business.html"'));
  assert.ok(html.includes('href="./app-20261007.html"'));
  assert.ok(!html.includes('FIRST CHAPTER media landing page'));
});
test('business shortcuts stay in a labeled group separate from personal actions',async()=>{
  const html=await readFile(new URL('../app-20261007.html',import.meta.url),'utf8');
  const home=html.slice(html.indexOf('<section id="homePage"'),html.indexOf('<section id="calendarPage"'));
  const business=home.match(/<section\b[^>]*aria-labelledby="businessToolsHeading"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(business,'business shortcuts need their own labeled section');
  assert.match(business,/<h2 id="businessToolsHeading">เครื่องมือธุรกิจและสตูดิโอ<\/h2>/);
  for(const route of ['./control.html','./ai-video.html','./newsroom.html'])assert.ok(business.includes('href="'+route+'"'));
  const personal=home.replace(business,'');
  assert.ok(!/workspace-switch|href="[^"]*(?:control|ai-video|newsroom)/.test(personal));
  for(const control of ['homeTasks','openTaskModal()','openFinanceModal()','ownerDeskLink'])assert.ok(personal.includes(control));
  assert.ok(html.includes('href="./business.html"'));
});
test('business page has no automatic app redirect',async()=>{
  const html=await readFile(new URL('../business.html',import.meta.url),'utf8');
  assert.ok(!html.includes('assets/site-entry.js'));
  assert.ok(html.includes('./control.html'));
});
import {lifeOsEntry} from '../assets/liff-entry-router.js';
test('other Pages LIFF helper also distinguishes brand domain',()=>{
  assert.equal(lifeOsEntry(base),base+'app-20261007.html');
  assert.equal(lifeOsEntry('https://chaylueklab.com/'),null);
  assert.equal(lifeOsEntry(base+'?liff.state=%2Fmet-vorx.html#callback'),base+'app-20261007.html?liff.state=%2Fmet-vorx.html#callback');
});
test('reconnect uses canonical LIFF ID without duplicating endpoint filename',async()=>{
  const html=await readFile(new URL('../app-20261007.html',import.meta.url),'utf8');
  assert.ok(html.includes("location.assign('https://liff.line.me/'+LIFF_ID)"));
  assert.ok(!html.includes("LIFF_ID+'/app-20261007.html'"));
});
