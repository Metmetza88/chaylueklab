import test from 'node:test';
import assert from 'node:assert/strict';
import {appEntryUrl} from '../assets/site-entry.js';
const base='https://metmetza88.github.io/chaylueklab/';
test('public visitors retain the landing page',()=>assert.equal(appEntryUrl(base,'Mozilla'),null));
test('LINE browser enters personal workspace',()=>assert.equal(appEntryUrl(base,'Mozilla Line/15.0'),base+'app-20261007.html'));
test('SDK callback query is preserved untouched for LIFF initialization',()=>{const q='?liff.state=%3Fview%3Dcontrol&code=fixture&state=fixture';assert.equal(appEntryUrl(base+q),base+'app-20261007.html'+q)});
test('explicit workspace route survives redirect',()=>assert.equal(appEntryUrl(base+'?view=stock'),base+'app-20261007.html?view=stock'));
test('unrelated analytics params do not trigger app login',()=>assert.equal(appEntryUrl(base+'?utm_source=share'),null));
