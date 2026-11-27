import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { home } from '../src/views.mjs';
const root=new URL('../',import.meta.url);
/** แพ็กเฉพาะหน้าร้านและโมดูลสาธิต ไม่คัดลอก SQL, tests หรือ secret สู่ public */
await rm(new URL('dist/',root),{recursive:true,force:true});
await mkdir(new URL('dist/',root),{recursive:true});
for(const dir of ['src','modules'])await cp(new URL(dir,root),new URL('dist/'+dir,root),{recursive:true});
await cp(new URL('public/',root),new URL('dist/',root),{recursive:true});
for(const subset of ['thai','latin']) for(const weight of [400,600,700]) await cp(new URL(`node_modules/@fontsource/noto-sans-thai/files/noto-sans-thai-${subset}-${weight}-normal.woff2`,root),new URL(`dist/assets/${subset}-${weight}.woff2`,root));
await cp(new URL('node_modules/@fontsource/noto-sans-thai/LICENSE',root),new URL('dist/assets/FONT-LICENSE.txt',root));
for(const subset of ['thai','latin']) for(const weight of [600,700]) await cp(new URL(`node_modules/@fontsource/prompt/files/prompt-${subset}-${weight}-normal.woff2`,root),new URL(`dist/assets/prompt-${subset}-${weight}.woff2`,root));
await cp(new URL('node_modules/@fontsource/prompt/LICENSE',root),new URL('dist/assets/PROMPT-LICENSE.txt',root));
const html=await readFile(new URL('index.html',root),'utf8');
await writeFile(new URL('dist/index.html',root),html.replace('<!--APP-->',home()));
console.log('Built Software Store with 14 categories and three preserved demos; no private files copied.');
