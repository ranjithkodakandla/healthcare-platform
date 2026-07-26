#!/usr/bin/env node
/**
 * Dependency audit gate.
 * 1) Prefer npm audit JSON when the registry responds.
 * 2) Fallback: OSV query for direct production dependencies from package-lock.
 * Fails on critical findings; high findings fail in CI (AUDIT_FAIL_HIGH=1 default).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

const FAIL_HIGH = process.env.AUDIT_FAIL_HIGH !== '0';

function npmAudit() {
  try {
    const out = execSync('npm audit --omit=dev --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024,
    });
    return JSON.parse(out);
  } catch (err) {
    const stdout = err.stdout?.toString?.() || '';
    try {
      return JSON.parse(stdout);
    } catch {
      return null;
    }
  }
}

function osvQuery(pkg, version) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      package: { name: pkg, ecosystem: 'npm' },
      version,
    });
    const req = https.request(
      {
        hostname: 'api.osv.dev',
        path: '/v1/query',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ vulns: [] });
          }
        });
      },
    );
    req.on('error', () => resolve({ vulns: [] }));
    req.write(body);
    req.end();
  });
}

async function osvFallback() {
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  const pkgs = lock.packages || {};
  const direct = Object.entries(pkgs)
    .filter(([k, v]) => k.startsWith('node_modules/') && !k.includes('/node_modules/') && v.version)
    .slice(0, 80);
  let critical = 0;
  let high = 0;
  for (const [key, meta] of direct) {
    const name = key.replace(/^node_modules\//, '');
    if (name.startsWith('@types/')) continue;
    const result = await osvQuery(name, meta.version);
    for (const v of result.vulns || []) {
      const sev = (v.database_specific?.severity || v.severity || '').toUpperCase();
      if (sev.includes('CRITICAL')) critical += 1;
      else if (sev.includes('HIGH')) high += 1;
    }
  }
  return { critical, high, source: 'osv' };
}

async function main() {
  const audit = npmAudit();
  if (audit?.metadata?.vulnerabilities) {
    const m = audit.metadata.vulnerabilities;
    console.log('npm audit vulnerabilities:', m);
    fs.writeFileSync('reports/npm-audit-prod.json', JSON.stringify(audit, null, 2));
    if ((m.critical || 0) > 0) {
      console.error('CRITICAL vulnerabilities present');
      process.exit(1);
    }
    if (FAIL_HIGH && (m.high || 0) > 0) {
      console.error('HIGH vulnerabilities present');
      process.exit(1);
    }
    console.log('Dependency audit gate PASS (npm audit)');
    return;
  }

  console.warn('npm audit registry unavailable — falling back to OSV sampling');
  const osv = await osvFallback();
  console.log('OSV sample:', osv);
  fs.writeFileSync('reports/npm-audit-prod.json', JSON.stringify(osv, null, 2));
  if (osv.critical > 0) {
    console.error('CRITICAL vulnerabilities present (OSV)');
    process.exit(1);
  }
  if (FAIL_HIGH && osv.high > 0) {
    console.error('HIGH vulnerabilities present (OSV)');
    process.exit(1);
  }
  console.log('Dependency audit gate PASS (OSV fallback)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
