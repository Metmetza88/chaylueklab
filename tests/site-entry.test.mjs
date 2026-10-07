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
test('personal dashboard has no business switcher',async()=>{const html=await readFile(new URL('../app-20261007.html',import.meta.url),'utf8');const home=html.slice(html.indexOf('<section id="homePage"'),html.indexOf('<section id="calendarPage"'));assert.ok(!/workspace-switch|href="[^"]*(?:control|ai-video|newsroom)/.test(home));assert.ok(home.includes('homeTasks'));assert.ok(html.includes('href="./business.html"'))});
test('business page has no automatic app redirect',async()=>{const html=await readFile(new URL('../business.html',import.meta.url),'utf8');assert.ok(!html.includes('assets/site-entry.js'));assert.ok(html.includes('./control.html'))});
