import { copyFile, mkdir, readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
if (!html.includes('EDUCATION 2570')) throw new Error('Education entry page missing');
await mkdir(new URL('dist/', root), { recursive: true });
await copyFile(new URL('index.html', root), new URL('dist/index.html', root));
console.log('Built Education 2570 static page; Vercel API remains in api/');
