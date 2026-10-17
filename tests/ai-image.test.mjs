import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {Script} from "node:vm";
const root=resolve(import.meta.dirname,"..");
const read=path=>readFileSync(resolve(root,path),"utf8");
const page=read("ai-image/index.html");
const api=read("supabase/functions/ai-image/index.ts");
const migration=read("supabase/migrations/20261017154500_ai_image_quota.sql");

test("image studio linked from existing site and AI Studio",()=>{
 assert.match(read("ai/index.html"),/href="\.\.\/ai-image\/"/);
 assert.match(read("business.html"),/href="\.\/ai-image\/"/);
 assert.match(read("supabase/config.toml"),/\[functions\.ai-image\]/);
});
test("image client accepts prompts but only submits after verified LINE login",()=>{
 for(const id of ["prompt","size","generate","resultImage","download","authStatus","notice"]){
  assert.ok(page.includes('id="'+id+'"'),"missing "+id);
 }
 assert.match(page,/const inScope=location\.origin===endpoint\.origin/);
 assert.match(page,/if\(!inScope\)/);
 assert.match(page,/getIDToken\(\)/);
 assert.match(page,/data:image\/png;base64,/);
 assert.doesNotMatch(page,/\.innerHTML\s*=/);
});
test("image page module parses",()=>{
 const open='<script type="module">';
 const start=page.indexOf(open);
 const end=page.indexOf("</script>",start);
 assert.ok(start>=0&&end>start);
 const source=page.slice(start+open.length,end);
 const plain=source.replace('import {newsroomConfig} from "../data/newsroom-config.js";',"");
 assert.notEqual(plain,source);
 assert.doesNotThrow(()=>new Script(plain));
});
test("image endpoint enforces user identity, provider secret, daily budget and low quality",()=>{
 assert.match(api,/lineIdentity\(body\)/);
 assert.match(api,/Deno\.env\.get\("OPENAI_API_KEY"\)/);
 assert.match(api,/ai_image_consume_quota/);
 assert.match(api,/gpt-image-1/);
 assert.match(api,/quality:"low"/);
 assert.match(api,/n:1/);
 assert.match(api,/MAX_BODY=8000/);
 assert.match(api,/setTimeout\(\(\)=>controller\.abort\(\),65000\)/);
});
test("image quota is atomic and private",()=>{
 assert.match(migration,/enable row level security/);
 assert.match(migration,/on conflict\(line_user_id,usage_day\)/);
 assert.match(migration,/where usage\.requests<p_daily_limit/);
 assert.match(migration,/revoke all on function .* from public,anon,authenticated/);
 assert.match(migration,/grant execute on function .* to service_role/);
});
