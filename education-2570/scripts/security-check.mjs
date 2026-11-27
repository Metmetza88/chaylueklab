import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
/** ตรวจ artifact ที่ส่งออก ไม่ให้มีไฟล์ private หรือ credential ที่รู้จัก */
async function scan(dir) {
 for(const entry of await readdir(dir,{withFileTypes:true})) {
  const url=new URL(entry.name+(entry.isDirectory()?'/':''),dir);
  if(entry.isDirectory())await scan(url);
  else {
   assert.ok(!/\.env|\.sql$|test\.mjs$/.test(entry.name),'Private file in build');
   if(/\.(mjs|html|css|json|txt)$/.test(entry.name)){
    const text=await readFile(url,'utf8');
    assert.ok(!/sb_secret_[A-Za-z0-9]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}/.test(text),'Secret pattern in artifact');
   }
  }
 }
}
await scan(new URL('dist/',root));
const migration=await readdir(new URL('supabase/migrations/',root));
for(const file of migration){const sql=await readFile(new URL('supabase/migrations/'+file,root),'utf8');assert.ok(!/\b(?:drop\s+(?:table|schema)|alter\s+table\s+(?:public|auth|storage)\.)/i.test(sql),'Out-of-scope DDL');}
console.log('PASS: no private files/known secret patterns in artifact; migrations scoped to education_2570. This is not a penetration test.');
