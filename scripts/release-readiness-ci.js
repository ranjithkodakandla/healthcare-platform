#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'reports');
fs.mkdirSync(outDir, { recursive: true });

const payload = {
  generatedAt: new Date().toISOString(),
  pipeline: 'github-actions',
  gates: {
    build: 'required',
    typescript: 'required',
    lint: 'required',
    unitCoverage: { backend: 90, frontend: 85, shared: 95 },
    playwright: 'required',
    a11y: 'required',
    dependencyAudit: 'fail-on-high-critical',
    secretScan: 'required',
    codeql: 'required-on-main',
  },
  artifacts: ['coverage', 'playwright-report', 'npm-audit', 'release-readiness.json'],
};

fs.writeFileSync(path.join(outDir, 'release-readiness.json'), JSON.stringify(payload, null, 2));
console.log('[release-readiness] wrote reports/release-readiness.json');
