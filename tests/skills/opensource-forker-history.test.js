#!/usr/bin/env node
/**
 * Runs the documented Step 6 of agents/opensource-forker.md in a throwaway dir that already
 * holds FORK_REPORT.md / SANITIZATION_REPORT.md (as if the source project shipped them), and
 * checks they stay out of the first commit.
 *
 * Run with: node tests/skills/opensource-forker-history.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const AGENT_MD = path.join(__dirname, '..', '..', 'agents', 'opensource-forker.md');

const step = fs.readFileSync(AGENT_MD, 'utf8').split('### Step 6: Clean Git History')[1];
assert.ok(step, 'opensource-forker.md is missing "### Step 6: Clean Git History"');
const block = step.match(/```bash\n([\s\S]*?)```/);
assert.ok(block, 'no bash block in Step 6');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oss-forker-'));
try {
  for (const f of ['README.md', 'FORK_REPORT.md', 'SANITIZATION_REPORT.md']) {
    fs.writeFileSync(path.join(dir, f), 'x\n');
  }
  const r = spawnSync('bash', ['-ec', block[1].replaceAll('TARGET_DIR', dir)], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com',
      GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com',
    },
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const files = spawnSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], { cwd: dir, encoding: 'utf8' }).stdout.trim();
  assert.strictEqual(files, 'README.md', `first commit must hold only README.md, got: ${files}`);
  console.log('  ✓ pre-existing reports stay out of the first fork commit');
} catch (err) {
  console.log('  ✗ pre-existing reports stay out of the first fork commit');
  console.log(`    Error: ${err.message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
