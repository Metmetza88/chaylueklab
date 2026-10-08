import test from 'node:test';
import assert from 'node:assert/strict';
import {appEntryUrl} from '../assets/site-entry.js';
const base='https://metmetza88.github.io/chaylueklab/';
test('primary homepage opens personal Life OS for every visitor',()=>assert.equal(appEntryUrl(base,'Mozilla'),base+'app-20261007.html'));
test('LINE browser enters personal workspace',()=>assert.equal(appEntryUrl(base,'Mozilla Line/15.0'),base+'app-20261007.html'));
test('SDK callback query is preserved untouched for LIFF initialization',()=>{const q='?liff.state=%3Fview%3Dcontrol&code=fixture&state=fixture';assert.equal(appEntryUrl(base+q),base+'app-20261007.html'+q)});
test('explicit workspace route survives redirect',()=>assert.equal(appEntryUrl(base+'?view=stock'),base+'app-20261007.html?view=stock'));
test('analytics parameters survive personal entry',()=>assert.equal(appEntryUrl(base+'?utm_source=share'),base+'app-20261007.html?utm_source=share'));

import {readFile} from 'node:fs/promises';
test('business shortcuts stay in a labeled group separate from personal actions',async()=>{
  const html=await readFile(new URL('../app-20261007.html',import.meta.url),'utf8');
  const home=html.slice(html.indexOf('<section id="homePage"'),html.indexOf('<section id="calendarPage"'));
  const business=home.match(/<section\b[^>]*aria-labelledby="businessToolsHeading"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(business,'business shortcuts need their own labeled section');
  assert.match(business,/<h2 id="businessToolsHeading">เครื่องมือธุรกิจและสตูดิโอ<\/h2>/);
  for(const route of ['./control.html','./ai-video.html','./newsroom.html']) assert.ok(business.includes(`href="${route}"`));
  const personal=home.replace(business,'');
  assert.ok(!/workspace-switch|href="[^"]*(?:control|ai-video|newsroom)/.test(personal));
  for(const control of ['homeTasks','openTaskModal()','openFinanceModal()','ownerDeskLink']) assert.ok(personal.includes(control));
  assert.ok(html.includes('href="./business.html"'));
});
test('business page has no automatic app redirect',async()=>{const html=await readFile(new URL('../business.html',import.meta.url),'utf8');assert.ok(!html.includes('assets/site-entry.js'));assert.ok(html.includes('./control.html'))});
