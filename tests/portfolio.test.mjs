import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const read = path => readFile(new URL('../'+path,import.meta.url),'utf8');
test('portfolio includes all six sections and local assets',async()=>{
 const html=await read('portfolio.html');
 for(const id of ['profile','about','stack','projects','stats','contact']) assert.ok(html.includes('id="'+id+'"'));
 for(const path of ['assets/portfolio.css','assets/portfolio.js','business.html','hire.html','contact-line.html','index.html']) {assert.ok(html.includes('./'+path));await read(path);}
 assert.match(await read('assets/portfolio.css'),/prefers-reduced-motion/);
});
test('GitHub stats render validated public data and handle failure',async()=>{
 const script=await read('assets/portfolio.js');
 for(const success of [true,false]){
 const elements=Object.fromEntries(['repos','followers','following','stats-status'].map(id=>[id,{textContent:'—'}]));
 await vm.runInNewContext(script,{document:{getElementById:id=>elements[id]},AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{assert.equal(url,'https://api.github.com/users/Metmetza88');assert.equal(options.credentials,'omit');return {ok:success,json:async()=>({public_repos:22,followers:3,following:4})};}});
 assert.equal(elements.repos.textContent,success?'22':'—');
 assert.notEqual(elements['stats-status'].textContent,'—');
 }
});
test('business page links to portfolio',async()=>assert.ok((await read('business.html')).includes('href="./portfolio.html"')));
