import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Script } from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(path.join(root, 'ai/index.html'), 'utf8');
const business = readFileSync(path.join(root, 'business.html'), 'utf8');

test('standalone AI route exists and is reachable from brand page', () => {
  assert.match(page, /<title>CHAYLUEKLAB AI Studio/);
  assert.match(business, /href="\.\/ai\/"/);
  assert.ok(existsSync(path.join(root, 'ai-gallery/index.html')));
  assert.ok(existsSync(path.join(root, 'ai-video.html')));
  assert.ok(existsSync(path.join(root, 'ai-money-studio/index.html')));
});
test('Prompt Builder includes all working form controls', () => {
  for (const id of ['subject','goal','style','ratio','lock','generate','reset','output','copy','download','feedback']) {
    assert.match(page, new RegExp('id="'+id+'"'));
  }
  assert.match(page, /navigator\.clipboard\.writeText/);
  assert.match(page, /URL\.createObjectURL/);
  assert.match(page, /textContent=lines\.join/);
});
test('embedded prompt builder JavaScript parses and keeps provider credentials out of browser', () => {
  const start = page.indexOf('<script>');
  const end = page.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start, 'Expected one inline script');
  assert.equal(page.indexOf('<script>', start + 1), -1, 'No additional inline scripts');
  const script = page.slice(start + '<script>'.length, end);
  assert.doesNotThrow(() => new Script(script));
  assert.doesNotMatch(script, /(OPENAI_API_KEY|sk-proj-|AIzaSy)/);
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
});
test('website clearly labels service dependencies and avoids simulated AI results', () => {
  assert.match(page, /ไม่ได้เรียก AI API จริง/);
  assert.match(page, /ต้องมี Backend/);
  assert.match(page, /ไม่มีการส่งข้อมูลขึ้นเซิร์ฟเวอร์/);
});