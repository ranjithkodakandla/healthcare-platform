#!/usr/bin/env bash
# Run the enterprise CI quality gates locally (best-effort parity with GitHub Actions).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_E2E="${SKIP_E2E:-0}"
SKIP_API="${SKIP_API:-0}"

echo "==> Secret scan"
node scripts/secret-scan.js

echo "==> Prettier"
npm run format:check

echo "==> Shared constants"
npm run test:ci -w @sahayak/shared-constants
npm run build -w @sahayak/shared-constants

if [[ "$SKIP_API" != "1" ]]; then
  echo "==> API lint / typecheck / test / build"
  (cd apps/api && npm run lint -- --max-warnings 0 && npm run typecheck && npm test -- --ci --coverage && npm run build)
fi

echo "==> Frontends lint / coverage / build / bundle budget"
for app in citizen-app provider-portal admin-console; do
  echo "---- $app ----"
  (cd "apps/$app" && npm run lint -- --max-warnings 0 && npx tsc --noEmit && npm run test:coverage)
  (
    cd "apps/$app"
    export NODE_ENV=production
    export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://example.invalid}"
    export NEXT_PUBLIC_FIREBASE_API_KEY=build-placeholder
    export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sahyak.firebaseapp.com
    export NEXT_PUBLIC_FIREBASE_PROJECT_ID=sahyak
    export NEXT_PUBLIC_FIREBASE_APP_ID=1:0:web:0
    npm run build
  )
  node scripts/bundle-budget.js "apps/$app"
done

echo "==> Dependency audit"
mkdir -p reports
npm run audit:deps

echo "==> Static analysis"
npm run analyze:static

if [[ "$SKIP_E2E" != "1" ]]; then
  echo "==> Playwright + a11y"
  export E2E_API_URL="${E2E_API_URL:-https://sahayak-dev-api-j2iqu7nnqq-el.a.run.app}"
  export E2E_CITIZEN_URL="${E2E_CITIZEN_URL:-https://sahayak-dev-citizen-j2iqu7nnqq-el.a.run.app}"
  export E2E_PROVIDER_URL="${E2E_PROVIDER_URL:-https://sahayak-dev-provider-j2iqu7nnqq-el.a.run.app}"
  export E2E_ADMIN_URL="${E2E_ADMIN_URL:-https://sahayak-dev-admin-j2iqu7nnqq-el.a.run.app}"
  npx playwright test --project=citizen --project=provider --project=admin --project=platform --reporter=line
  npm run e2e:a11y
fi

node scripts/release-readiness-ci.js
echo "==> LOCAL CI PASS"
