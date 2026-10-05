import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../ai-video.html',import.meta.url),'utf8');
const create=fs.readFileSync(new URL('../supabase/functions/video-create/index.ts',import.meta.url),'utf8');
const status=fs.readFileSync(new URL('../supabase/functions/video-status/index.ts',import.meta.url),'utf8');
const provider=fs.readFileSync(new URL('../supabase/functions/_shared/video-provider.ts',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../setup-ai-video.sql',import.meta.url),'utf8');

assert.match(html,/video-create/);
assert.match(html,/video-status/);
assert.match(html,/สร้างวิดีโอ/);
assert.match(html,/Queued/);
assert.match(html,/Generating/);
assert.match(html,/Completed/);
assert.match(html,/Failed/);
assert.doesNotMatch(html,/เปิด Google Flow/);
assert.doesNotMatch(html,/GEMINI_API_KEY\s*=/);
assert.match(provider,/key\("GEMINI_API_KEY"\)/);
assert.match(provider,/key\("RUNWAYML_API_SECRET"\)/);
assert.match(status,/createSignedUrl/);
assert.match(status,/downloadProviderVideo/);
assert.match(sql,/video_mark_provider_accepted/);
assert.match(sql,/state='reserved'/);
assert.match(sql,/state='charged'/);
assert.match(sql,/video-generations/);
console.log('ai-video static flow checks passed');
