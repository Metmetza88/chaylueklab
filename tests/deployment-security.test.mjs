import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

async function check(report) {
  const dir = await mkdtemp(join(tmpdir(), 'chaylueklab-codeql-'));
  try {
    await writeFile(join(dir, 'results.sarif'), JSON.stringify(report));
    return spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/verify-codeql-results.mjs', import.meta.url)), dir], { encoding: 'utf8' });
  } finally { await rm(dir, { recursive: true, force: true }); }
}

test('deployment security gate accepts an analyzed clean report', async () => {
  const result = await check({ runs: [{ tool: { driver: { rules: [] } }, results: [] }] });
  assert.equal(result.status, 0, result.stderr);
});

test('deployment security gate blocks error and high severity findings from rule metadata', async () => {
  const cases = [
    { rule: { id: 'unsafe' }, result: { ruleId: 'unsafe', level: 'error' } },
    { rule: { id: 'unsafe', defaultConfiguration: { level: 'error' } }, result: { ruleId: 'unsafe' } },
    { rule: { id: 'unsafe', properties: { 'security-severity': '8.1' } }, result: { ruleId: 'unsafe', level: 'warning' } }
  ];
  for (const { rule, result } of cases) {
    const checked = await check({ runs: [{ tool: { driver: { rules: [rule] } }, results: [result] }] });
    assert.notEqual(checked.status, 0);
  }
});

test('deployment security gate rejects missing analysis instead of reporting a pass', async () => {
  for (const report of [{}, { runs: [] }, { runs: [{}] }]) assert.notEqual((await check(report)).status, 0);
});
