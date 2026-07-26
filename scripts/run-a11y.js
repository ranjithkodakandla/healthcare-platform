#!/usr/bin/env node
const { spawn, execSync } = require('child_process');
const http = require('http');

const apps = [
  { name: 'citizen-app', port: 3101, path: '/onboarding/splash' },
  { name: 'provider-portal', port: 3102, path: '/login' },
  { name: 'admin-console', port: 3103, path: '/login' },
];

const envBase = {
  ...process.env,
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL || 'https://sahayak-dev-api-j2iqu7nnqq-el.a.run.app',
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'build-placeholder',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'sahyak.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sahyak',
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:0:web:0',
};

function waitFor(url, timeoutMs = 120000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) return resolve();
          retry();
        })
        .on('error', retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error(`Timeout waiting for ${url}`));
      setTimeout(tick, 1000);
    };
    tick();
  });
}

async function main() {
  if (process.env.A11Y_SKIP_BUILD !== '1') {
    for (const app of apps) {
      console.log(`Building ${app.name}...`);
      execSync(`npm run build -w ${app.name}`, { stdio: 'inherit', env: envBase });
    }
  }

  const children = [];
  for (const app of apps) {
    const child = spawn('npx', ['next', 'start', '-p', String(app.port), '-H', '127.0.0.1'], {
      cwd: `apps/${app.name}`,
      env: { ...envBase, PORT: String(app.port) },
      stdio: 'ignore',
      detached: true,
    });
    children.push(child);
  }

  const shutdown = () => {
    for (const c of children) {
      try {
        process.kill(-c.pid, 'SIGTERM');
      } catch {
        try {
          c.kill('SIGTERM');
        } catch {
          /* ignore */
        }
      }
    }
  };

  let code = 0;
  try {
    for (const app of apps) {
      await waitFor(`http://127.0.0.1:${app.port}${app.path}`);
      console.log(`Ready ${app.name} on :${app.port}`);
    }
    execSync('npx playwright test --project=a11y --reporter=list', {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (err) {
    code = typeof err.status === 'number' ? err.status : 1;
  } finally {
    shutdown();
  }
  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
