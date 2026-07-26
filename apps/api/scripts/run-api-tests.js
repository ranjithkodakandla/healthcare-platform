#!/usr/bin/env node
const net = require('net');
const { spawnSync } = require('child_process');

function dbUp(host = '127.0.0.1', port = 5432) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    const done = (ok) => {
      s.destroy();
      resolve(ok);
    };
    s.setTimeout(400);
    s.on('connect', () => done(true));
    s.on('timeout', () => done(false));
    s.on('error', () => done(false));
  });
}

(async () => {
  const up = await dbUp();
  const env = { ...process.env };
  if (!up) {
    console.warn(
      '[tests] Postgres not reachable on :5432 — skipping DB integration suites (CI provides Postgres).',
    );
    env.SKIP_DB_INTEGRATION = '1';
  }
  const args = process.argv.slice(2);
  const r = spawnSync('npx', ['jest', ...args], { stdio: 'inherit', env, shell: true });
  process.exit(r.status ?? 1);
})();
