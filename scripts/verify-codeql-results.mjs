import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const directory = resolve(process.argv[2] || 'codeql-results');
const files = (await readdir(directory)).filter(name => name.endsWith('.sarif'));
if (!files.length) throw new Error('CodeQL did not produce a SARIF analysis');
let blocked = 0;
for (const name of files) {
  const report = JSON.parse(await readFile(resolve(directory, name), 'utf8'));
  assert.ok(Array.isArray(report.runs) && report.runs.length, 'CodeQL report must contain an analysis run');
  for (const run of report.runs) {
    assert.ok(Array.isArray(run.results), 'CodeQL report must contain results, including an empty array when clean');
    const rules = new Map([run.tool?.driver, ...(run.tool?.extensions || [])].flatMap(tool => tool?.rules || []).map(rule => [rule.id, rule]));
    for (const result of run.results) {
      const rule = rules.get(result.ruleId);
      const level = result.level || rule?.defaultConfiguration?.level;
      const security = Number(result.properties?.['security-severity'] ?? rule?.properties?.['security-severity'] ?? 0);
      if (level === 'error' || security >= 7) {
        blocked++;
        console.error(`Blocked deployment: CodeQL ${result.ruleId}, security severity ${security}, level ${level}`);
      }
    }
  }
}
if (blocked) throw new Error(`${blocked} CodeQL error/high severity findings must be fixed before deployment`);
console.log('PASS CodeQL: no error or high severity findings');
