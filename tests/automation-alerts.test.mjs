import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile(new URL('../.github/workflows/automation-alerts.yml', import.meta.url), 'utf8');
const source = workflow.split('          script: |\n')[1].split('\n').map(line => line.replace(/^            /, '')).join('\n');
const execute = new (Object.getPrototypeOf(async function () {}).constructor)('github', 'context', 'core', 'process', source);

function fixture(changes = {}, issues = [], comments = [], jobs = []) {
  const writes = [];
  const run = { id: 42, name: 'Control Center CI', head_repository: { full_name: 'Metmetza88/chaylueklab' }, head_branch: 'fix/control-center-plus59', head_sha: 'a'.repeat(40), status: 'completed', conclusion: 'failure', ...changes };
  const github = {
    rest: {
      actions: { getWorkflowRun: async () => ({ data: run }), listJobsForWorkflowRun: 'jobs' },
      issues: {
        listForRepo: 'issues', listComments: 'comments',
        create: async args => { writes.push({ type: 'create', ...args }); return { data: { number: 7 } }; },
        createComment: async args => { writes.push({ type: 'comment', ...args }); return {}; }
      }
    },
    paginate: async method => ({ issues, comments, jobs })[method]
  };
  return {
    writes,
    run: current => execute(github, { repo: { owner: 'Metmetza88', repo: 'chaylueklab' }, runId: current || 100 }, { info() {}, notice() {} }, { env: { ALERT_RUN_ID: '42' } })
  };
}

test('real failed CI creates an issue assigned to the repository owner without logs', async () => {
  const f = fixture();
  await f.run();
  assert.equal(f.writes.length, 1);
  assert.deepEqual(f.writes[0].assignees, ['Metmetza88']);
  assert.ok(f.writes[0].body.includes('https://github.com/Metmetza88/chaylueklab/actions/runs/42'));
});

test('forks and unrelated branches cannot write privileged failure notifications', async () => {
  for (const change of [{ head_repository: { full_name: 'someone/chaylueklab' } }, { head_branch: 'unreviewed' }, { name: 'Unknown workflow' }]) {
    const f = fixture(change);
    await f.run();
    assert.equal(f.writes.length, 0);
  }
});

test('successful or cancelled runs do not create failure issues', async () => {
  for (const conclusion of ['success', 'cancelled', 'skipped']) {
    const f = fixture({ conclusion });
    await f.run();
    assert.equal(f.writes.length, 0);
  }
});

test('repeated failure run does not create duplicate issues or comments', async () => {
  const title = '[Automation] Control Center CI (fix/control-center-plus59)';
  const marker = '<!-- chaylueklab-automation-run:42 -->';
  for (const [body, comments] of [[marker, []], ['', [{ body: marker }]]]) {
    const f = fixture({}, [{ title, number: 7, body }], comments);
    await f.run();
    assert.equal(f.writes.length, 0);
  }
});

test('new failed run updates an existing owner issue', async () => {
  const f = fixture({}, [{ title: '[Automation] Control Center CI (fix/control-center-plus59)', number: 7, body: 'Previous failure' }]);
  await f.run();
  assert.equal(f.writes[0].type, 'comment');
  assert.equal(f.writes[0].issue_number, 7);
});

test('reusable notification requires a failed job in its own running workflow', async () => {
  const changes = { status: 'in_progress', conclusion: null, name: 'Publish existing CHAYLUEKLAB site' };
  const own = fixture(changes, [], [], [{ conclusion: 'failure' }]);
  await own.run(42);
  assert.equal(own.writes.length, 1);
  const unrelated = fixture(changes, [], [], [{ conclusion: 'failure' }]);
  await unrelated.run(100);
  assert.equal(unrelated.writes.length, 0);
  const clean = fixture(changes, [], [], [{ conclusion: 'success' }]);
  await clean.run(42);
  assert.equal(clean.writes.length, 0);
});
