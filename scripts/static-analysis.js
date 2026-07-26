#!/usr/bin/env node
/**
 * Workspace static analysis gate: ESLint --max-warnings 0 across packages.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = [
  { cwd: 'apps/api', cmd: ['npm', 'run', 'lint', '--', '--max-warnings', '0'] },
  { cwd: 'apps/citizen-app', cmd: ['npm', 'run', 'lint', '--', '--max-warnings', '0'] },
  { cwd: 'apps/provider-portal', cmd: ['npm', 'run', 'lint', '--', '--max-warnings', '0'] },
  { cwd: 'apps/admin-console', cmd: ['npm', 'run', 'lint', '--', '--max-warnings', '0'] },
];

let failed = false;
for (const t of targets) {
  console.log(`\n=== static: ${t.cwd} ===`);
  const r = spawnSync(t.cmd[0], t.cmd.slice(1), {
    cwd: path.join(root, t.cwd),
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) failed = true;
}

if (failed) {
  console.error('\n[static-analysis] FAIL');
  process.exit(1);
}
console.log('\n[static-analysis] PASS');
