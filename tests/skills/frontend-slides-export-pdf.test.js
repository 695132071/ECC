#!/usr/bin/env node
/**
 * Stubbed run of skills/frontend-slides/scripts/export-pdf.sh: npm, npx and
 * node are replaced by stubs, so no network or browser is needed.
 *
 * Run with: node tests/skills/frontend-slides-export-pdf.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'skills', 'frontend-slides', 'scripts', 'export-pdf.sh');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing frontend-slides export-pdf.sh ===\n');

  if (process.platform === 'win32') {
    console.log('  - skipped: bash script test on Windows');
    console.log('\nPassed: 0');
    console.log('Failed: 0');
    return;
  }

  let passed = 0;
  let failed = 0;

  if (test('writes a relative output path next to the caller, not into the deleted temp dir', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-export-'));
    try {
      const bin = path.join(root, 'bin');
      const work = path.join(root, 'work');
      fs.mkdirSync(bin);
      fs.mkdirSync(work);
      // npm/npx succeed without doing anything; open/xdg-open must not launch a viewer.
      for (const name of ['npm', 'npx', 'open', 'xdg-open']) {
        fs.writeFileSync(path.join(bin, name), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      }
      // node stub writes the PDF to the output path argument, resolved against its cwd.
      fs.writeFileSync(path.join(bin, 'node'), '#!/bin/sh\nprintf "%%PDF-stub" > "$4"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(work, 'presentation.html'), '<html></html>\n');

      const result = spawnSync('bash', [SCRIPT, './presentation.html', './slides.pdf'], {
        cwd: work,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
      });

      assert.strictEqual(result.status, 0, result.stdout + result.stderr);
      assert.ok(fs.existsSync(path.join(work, 'slides.pdf')), 'slides.pdf was not written to the working directory');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exitCode = failed > 0 ? 1 : 0;
}

runTests();
