#!/usr/bin/env node
/**
 * Provision Firebase Admin Console users + admin.console_users rows.
 *
 * Usage (from repo root):
 *   GOOGLE_CLOUD_PROJECT=sahyak node scripts/provision-admin-users.js
 *
 * Requires Application Default Credentials with Firebase Admin access.
 * DATABASE_URL must point at the target Postgres (local or Cloud SQL via proxy).
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Load apps/api/.env if present (without printing secrets).
const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const admin = require('firebase-admin');
const { Client } = require('pg');

const PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'sahyak';

const USERS = [
  { name: 'Ranjith', email: 'ranjith@sahyak.test' },
  { name: 'Saad', email: 'saad@sahyak.test' },
  { name: 'Hasan', email: 'hasan@sahyak.test' },
];

async function main() {
  if (!PASSWORD) {
    throw new Error('Set ADMIN_BOOTSTRAP_PASSWORD before provisioning admin users');
  }
  if (!admin.apps.length) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const credential =
      sa && sa !== 'ADC'
        ? admin.credential.cert(JSON.parse(sa))
        : admin.credential.applicationDefault();
    admin.initializeApp({ credential, projectId: PROJECT_ID });
  }

  const auth = admin.auth();
  const results = [];

  for (const u of USERS) {
    let user;
    try {
      user = await auth.getUserByEmail(u.email);
      await auth.updateUser(user.uid, {
        password: PASSWORD,
        displayName: u.name,
        emailVerified: true,
        disabled: false,
      });
      console.log(`updated firebase user ${u.email} (${user.uid})`);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
      user = await auth.createUser({
        email: u.email,
        password: PASSWORD,
        displayName: u.name,
        emailVerified: true,
      });
      console.log(`created firebase user ${u.email} (${user.uid})`);
    }

    await auth.setCustomUserClaims(user.uid, { role: 'ADMIN' });
    console.log(`  claims: role=ADMIN`);

    results.push({ ...u, uid: user.uid });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL unset — skipped console_users upsert');
    printSummary(results);
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const u of results) {
      await client.query(
        `
        INSERT INTO admin.console_users (id, email, role, firebase_uid, created_at, updated_at)
        VALUES ($1, $2, 'CONSOLE_ADMINISTRATOR', $3, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE
          SET role = 'CONSOLE_ADMINISTRATOR',
              firebase_uid = EXCLUDED.firebase_uid,
              updated_at = NOW()
        `,
        [crypto.randomUUID(), u.email, u.uid],
      );
      console.log(`upserted console_users ${u.email} → CONSOLE_ADMINISTRATOR`);
    }
  } finally {
    await client.end();
  }

  printSummary(results);
}

function printSummary(results) {
  console.log('\n=== Admin Console logins ===');
  console.log('URL: https://sahayak-dev-admin-j2iqu7nnqq-el.a.run.app/login');
  console.log(`Password (all): ${PASSWORD}`);
  for (const u of results) {
    console.log(`- ${u.name}: ${u.email}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
