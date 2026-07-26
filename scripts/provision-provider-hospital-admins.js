#!/usr/bin/env node
/**
 * Attach hospital-admin claims to existing Firebase users (same emails/password).
 * Keeps role=ADMIN so Admin Console access remains; adds orgId for Provider Portal.
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const admin = require('firebase-admin');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'sahyak';
const HOSPITAL_ID = process.env.PROVIDER_HOSPITAL_ID || 'hosp-apollo-blr';
const HOSPITAL_NAME = process.env.PROVIDER_HOSPITAL_NAME || 'Apollo Hospital (Bengaluru)';
const PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD;

const USERS = [
  { name: 'Ranjith', email: 'ranjith@sahyak.test' },
  { name: 'Saad', email: 'saad@sahyak.test' },
  { name: 'Hasan', email: 'hasan@sahyak.test' },
];

async function main() {
  if (!PASSWORD) {
    throw new Error('Set ADMIN_BOOTSTRAP_PASSWORD before provisioning hospital admins');
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
  for (const u of USERS) {
    const user = await auth.getUserByEmail(u.email);
    await auth.updateUser(user.uid, {
      password: PASSWORD,
      displayName: u.name,
      emailVerified: true,
      disabled: false,
    });
    // Dual-portal access: ADMIN for console + org scoping for hospital portal.
    await auth.setCustomUserClaims(user.uid, {
      role: 'ADMIN',
      orgId: HOSPITAL_ID,
      hospitalPortalRole: 'HOSPITAL_ADMINISTRATOR',
    });
    console.log(`hospital admin claims set for ${u.email} → orgId=${HOSPITAL_ID}`);
  }

  console.log('\n=== Provider Portal (Hospital Admin) logins ===');
  console.log('URL: https://sahayak-dev-provider-j2iqu7nnqq-el.a.run.app/login');
  console.log(`Organization ID: ${HOSPITAL_ID}`);
  console.log(`Hospital: ${HOSPITAL_NAME}`);
  console.log(`Password (all): ${PASSWORD}`);
  for (const u of USERS) console.log(`- ${u.name}: ${u.email}`);
  console.log('\nNote: same accounts also work on Admin Console (role=ADMIN retained).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
