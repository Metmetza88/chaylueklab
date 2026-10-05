import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, validSources, readyRequirements } from '../data/newsroom.js';
test('editorial transitions follow approval workflow',()=>{assert.equal(canTransition('editing','ready'),true);assert.equal(canTransition('ready','published'),true);assert.equal(canTransition('drafting','published'),false)});
test('sources require bounded http(s) references',()=>{assert.equal(validSources(['https://example.com']),true);assert.equal(validSources(['javascript:alert(1)']),false);assert.equal(validSources([]),false)});
test('ready requires editorial and media handoff fields',()=>{const s={title:'T',body:'B',sources:['https://example.com'],social_copy:'S',image_brief:'I'};assert.equal(readyRequirements(s),true);assert.equal(readyRequirements({...s,image_brief:''}),false)});
