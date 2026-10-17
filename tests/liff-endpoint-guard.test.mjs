import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const root=resolve(import.meta.dirname,"..");
const read=path=>readFileSync(resolve(root,path),"utf8");
test("Life OS must not launch LINE OAuth on foreign Vercel origins",()=>{
 const page=read("app-20261007.html");
 assert.match(page,/const LIFF_ENDPOINT='https:\/\/metmetza88\.github\.io\/chaylueklab\/'/);
 assert.match(page,/if\(!isLiffEndpoint\(\)\)/);
 assert.match(page,/connect\.onclick=\(\)=>location\.assign\('https:\/\/liff\.line\.me\/'\+LIFF_ID\)/);
 assert.match(page,/liff\.login\(\{redirectUri:location\.href\}\)/);
});
test("Video Studio enforces registered LIFF origin before attempting OAuth",()=>{
 const page=read("ai-video.html");
 assert.match(page,/const endpoint=new URL\(newsroomConfig\.liffEndpointUrl\)/);
 assert.match(page,/location\.origin!==endpoint\.origin/);
 assert.match(page,/liff\.login\(\{redirectUri:location\.href\}\)/);
});
test("AI Chat provides a manual LIFF entry instead of automatic cross-origin login",()=>{
 const page=read("ai-chat/index.html");
 assert.match(page,/const inScope=location\.origin===endpoint\.origin/);
 assert.match(page,/if\(!inScope\)/);
});
