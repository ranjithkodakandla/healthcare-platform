#!/usr/bin/env node
/**
 * Lightweight secret/pattern scan for local + CI (complements gitleaks / GitHub secret scanning).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skipDirs = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'coverage',
  'reports',
  'playwright-report',
  'test-results',
  '.wireframes',
  '.terraform',
]);

const patterns = [
  { name: 'AWS key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'GitHub PAT', re: /ghp_[A-Za-z0-9]{36}/ },
  { name: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'NVIDIA key-ish', re: /nvapi-[A-Za-z0-9_-]{20,}/ },
  {
    name: 'Hardcoded credential assignment',
    // Ignore placeholders / empty / env interpolation
    re: /(api[_-]?key|client_secret|auth_token)\s*[:=]\s*['"](?!build-placeholder|changeme|your-|xxx|test)[A-Za-z0-9_\-+/=]{20,}['"]/i,
  },
];

const allowFileHints = [
  '.env.example',
  '.env.e2e.example',
  'secret-scan.js',
  'dependency-audit.js',
];

const findings = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(p);
      continue;
    }
    // Local env files are gitignored — never scan working-tree secrets.
    if (/^\.env($|\.)/.test(ent.name) && !ent.name.endsWith('.example')) {
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|json|yml|yaml|md|sh|tf)$/i.test(ent.name)) {
      continue;
    }
    if (allowFileHints.some((h) => p.endsWith(h))) continue;
    let text;
    try {
      text = fs.readFileSync(p, 'utf8');
    } catch {
      continue;
    }
    if (text.length > 2_000_000) continue;
    for (const { name, re } of patterns) {
      if (re.test(text)) {
        findings.push({ file: path.relative(root, p), name });
      }
    }
  }
}

walk(root);

if (findings.length) {
  console.error('[secret-scan] FAIL — potential secrets:');
  for (const f of findings) console.error(`  - ${f.file}: ${f.name}`);
  process.exit(1);
}
console.log('[secret-scan] PASS');
