import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {Script} from "node:vm";

const root=resolve(import.meta.dirname,"..");
const read=path=>readFileSync(resolve(root,path),"utf8");
const chat=read("ai-chat/index.html");
const api=read("supabase/functions/ai-chat/index.ts");
const migration=read("supabase/migrations/20261017152100_ai_chat_quota.sql");
const aiHome=read("ai/index.html");
const business=read("business.html");
const config=read("supabase/config.toml");

test("chat is discoverable on AI Studio and brand website",()=>{
 assert.match(aiHome,/href="\.\.\/ai-chat\/"/);
 assert.match(business,/href="\.\/ai-chat\/"/);
 assert.match(chat,/CHAYLUEKLAB/);
});

test("chat handles LINE browser outside endpoint without starting forced OAuth",()=>{
 assert.match(chat,/const inScope=location\.origin===endpoint\.origin/);
 assert.match(chat,/if\(!inScope\)/);
 assert.match(chat,/liff\.login\(\{redirectUri:location\.href\}\)/);
 assert.match(chat,/role="status"/);
});

test("chat client is escaped and has a clear backend dependency",()=>{
 assert.match(chat,/document\.createTextNode\(content\)/);
 assert.doesNotMatch(chat,/\.innerHTML\s*=/);
 assert.match(chat,/provider_not_configured/);
 assert.match(chat,/usage_limit_unavailable/);
 assert.match(chat,/idToken:liff\.getIDToken\(\)/);
 assert.match(chat,/OPENAI_API_KEY ฝั่ง Supabase/);
});

test("new client module parses",()=>{
 const start=chat.indexOf('<script type="module">');
 const end=chat.indexOf('</script>',start);
 assert.ok(start>=0&&end>start);
 const module=chat.slice(start+'<script type="module">'.length,end);
 const withoutImport=module.replace('import {newsroomConfig} from "../data/newsroom-config.js";','');
 assert.notEqual(module,withoutImport);
 assert.doesNotThrow(()=>new Script(withoutImport));
});

test("chat function validates LINE, provider allowlist, and quota before invoking AI",()=>{
 assert.match(api,/lineIdentity\(body\)/);
 assert.match(api,/Deno\.env\.get\("OPENAI_API_KEY"\)/);
 assert.match(api,/new Set\(\["gpt-4\.1-mini", "gpt-4\.1"\]\)/);
 assert.match(api,/ai_chat_consume_quota/);
 assert.match(api,/store:false/);
 assert.match(api,/MAX_OUTPUT_TOKENS = 650/);
 assert.match(api,/validHistory\(body\?\.messages\)/);
 assert.match(api,/AbortController/);
});

test("quota is atomic and never publicly accessible",()=>{
 assert.match(migration,/enable row level security/);
 assert.match(migration,/on conflict \(line_user_id, usage_day\)/);
 assert.match(migration,/where usage\.requests < p_daily_limit/);
 assert.match(migration,/revoke all on function .* from public,anon,authenticated/);
 assert.match(migration,/grant execute on function .* to service_role/);
 assert.match(config,/\[functions\.ai-chat\]/);
});
