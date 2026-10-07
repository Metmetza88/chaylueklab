import test from 'node:test';
import assert from 'node:assert/strict';
import { lifeOsEntryUrl } from '../assets/site-entry.js';

const root = 'https://metmetza88.github.io/chaylueklab/';
test('a public website visit opens the brand homepage without forcing LINE login', () => {
  assert.equal(lifeOsEntryUrl(root, 'Mozilla/5.0 Safari/604.1'), null);
  assert.equal(lifeOsEntryUrl(`${root}?campaign=line#products`, 'Mozilla/5.0'), null);
});
test('the existing LINE in-app entry opens Life OS on the same origin and preserves the query', () => {
  const entry = `${root}?liff.source=oa#home`;
  assert.equal(lifeOsEntryUrl(entry, 'Mozilla/5.0 Line/14.2.0'), `${root}app-20261007.html?liff.source=oa#home`);
  assert.equal(lifeOsEntryUrl(root, 'Mozilla/5.0 Line/14.2.0'), `${root}app-20261007.html`);
});
test('reminder and control deep links and LINE OAuth callbacks survive the public entrance', () => {
  for (const query of ['view=snooze&id=00000000-0000-4000-8000-000000000001', 'view=control', 'code=callback-value&state=original-state', 'payment=success']) {
    assert.equal(lifeOsEntryUrl(`${root}?${query}#target`), `${root}app-20261007.html?${query}#target`);
  }
});
test('an opaque LIFF state cannot select an external redirect destination', () => {
  for (const value of ['https://untrusted.example/', '//untrusted.example/', 'javascript:alert(1)']) {
    const query = new URLSearchParams({ 'liff.state': value });
    const result = new URL(lifeOsEntryUrl(`${root}?${query}`));
    assert.equal(result.origin, new URL(root).origin);
    assert.equal(result.pathname, '/chaylueklab/app-20261007.html');
    assert.equal(result.searchParams.get('liff.state'), value);
  }
});
test('visitors can explicitly browse the public website inside LINE', () => {
  assert.equal(lifeOsEntryUrl(`${root}?site=1`, 'Line/14.2.0'), null);
});
