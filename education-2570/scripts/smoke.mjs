import assert from 'node:assert/strict';
/** ทดสอบ Preview จริงโดยไม่ปิด deployment protection หรือพิมพ์ bypass secret */
const origin=new URL(process.env.EDU_PREVIEW_URL??'http://127.0.0.1:4170');
assert.ok(origin.hostname==='127.0.0.1'||origin.hostname.endsWith('.vercel.app'));
const headers=process.env.EDU_VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.EDU_VERCEL_AUTOMATION_BYPASS_SECRET}:{};
for(const path of ['/','/api/education?action=config','/api/education?action=catalog']){
 const response=await fetch(new URL(path,origin),{headers,signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200,`Smoke failed ${path}: ${response.status}`);
 const content=await response.text();assert.match(content,path==='/'?/EDUCATION 2570/:path.includes('config')?/authConfigured/:/exam-studio/);
}
console.log('PASS: homepage, public catalog and configuration endpoint');
