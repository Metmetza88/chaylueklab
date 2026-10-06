// Both static routes use the same markup, scripts, LIFF configuration and API.
// A full page avoids changing the callback URL before the LIFF SDK initializes.
import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('../stock.html', import.meta.url), 'utf8');
await writeFile(new URL('../control.html', import.meta.url), source.replace('<!doctype html>', '<!doctype html>\n<!-- Generated from stock.html by scripts/prepare-control.mjs. -->'));
