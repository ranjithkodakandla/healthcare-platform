#!/usr/bin/env node
/**
 * Warn (exit 1 on hard exceed) if Next.js build output exceeds budgets.
 * Usage: node scripts/bundle-budget.js apps/citizen-app
 */
const fs = require('fs');
const path = require('path');

const appDir = process.argv[2];
if (!appDir) {
  console.error('Usage: node scripts/bundle-budget.js <appDir>');
  process.exit(2);
}

const nextDir = path.join(appDir, '.next');
const warnMb = Number(process.env.BUNDLE_WARN_MB || 45);
const failMb = Number(process.env.BUNDLE_FAIL_MB || 90);

function dirSize(p) {
  if (!fs.existsSync(p)) return 0;
  let total = 0;
  const st = fs.statSync(p);
  if (st.isFile()) return st.size;
  for (const ent of fs.readdirSync(p)) {
    total += dirSize(path.join(p, ent));
  }
  return total;
}

if (!fs.existsSync(nextDir)) {
  console.warn(`[bundle-budget] ${nextDir} missing — skip`);
  process.exit(0);
}

const bytes = dirSize(nextDir);
const mb = bytes / (1024 * 1024);
console.log(
  `[bundle-budget] ${appDir} .next = ${mb.toFixed(1)} MiB (warn>${warnMb}, fail>${failMb})`,
);

if (mb > failMb) {
  console.error(`[bundle-budget] FAIL: exceeds hard budget ${failMb} MiB`);
  process.exit(1);
}
if (mb > warnMb) {
  console.warn(`[bundle-budget] WARN: exceeds soft budget ${warnMb} MiB`);
}
process.exit(0);
