# DEVOPS.md — Sahayak Platform Engineering

Enterprise CI/CD, local development, deployment, and release operations for the Sahayak monorepo.

## Contents

1. [Local development](#local-development)
2. [Running tests](#running-tests)
3. [Playwright](#playwright)
4. [CI/CD pipeline](#cicd-pipeline)
5. [Deployment (Cloud Run)](#deployment-cloud-run)
6. [Rollback](#rollback)
7. [Release process](#release-process)
8. [Secrets & environment variables](#secrets--environment-variables)
9. [Branch protection](#branch-protection)
10. [Quality gates](#quality-gates)

---

## Local development

**Prerequisites:** Node 20 (`nvm use`), Docker, optional `gcloud` for deploy.

```bash
npm ci
docker compose up -d
cp .env.example .env          # never commit real values
npm run build -w @sahayak/shared-constants
cd apps/api && npx prisma migrate deploy && npm run start:dev
```

| Service  | Default                                                   |
| -------- | --------------------------------------------------------- |
| API      | `http://localhost:3000`                                   |
| Postgres | `postgresql://sahayak:sahayak_dev@localhost:5432/sahayak` |
| Redis    | `redis://localhost:6379`                                  |

Next apps: `npm run dev -w citizen-app|provider-portal|admin-console`.

Helper: `bash scripts/dev.sh` (if present).

---

## Running tests

```bash
# All unit + coverage floors
npm run test:unit

# Per package
npm run test:ci -w @sahayak/shared-constants   # ≥95%
npm test -w @sahayak/api -- --ci --coverage    # ≥90%
npm run test:coverage -w citizen-app           # ≥85%
npm run test:coverage -w provider-portal
npm run test:coverage -w admin-console

# Lint / format / secrets / audit
npm run analyze:static
npm run format:check
npm run secrets:scan
npm run audit:deps

# Full local parity with CI (set SKIP_E2E=1 to skip Playwright)
npm run ci:local
```

---

## Playwright

Config: `playwright.config.ts`  
Projects: `citizen`, `provider`, `admin`, `platform`, `a11y`, `demo`

```bash
# Against Cloud Run dev (default URLs in CI)
export E2E_API_URL=https://sahayak-dev-api-j2iqu7nnqq-el.a.run.app
export E2E_CITIZEN_URL=https://sahayak-dev-citizen-j2iqu7nnqq-el.a.run.app
export E2E_PROVIDER_URL=https://sahayak-dev-provider-j2iqu7nnqq-el.a.run.app
export E2E_ADMIN_URL=https://sahayak-dev-admin-j2iqu7nnqq-el.a.run.app

npm run e2e                 # regression + a11y
npx playwright show-report  # HTML report
```

Artifacts (CI): `playwright-report/`, `test-results/` (videos, traces, screenshots when configured).

RTM: `npm run rtm:generate` → `REQUIREMENTS_TRACEABILITY_MATRIX.md`.

---

## CI/CD pipeline

| Workflow               | Trigger                                             | Purpose                                                        |
| ---------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `ci.yml`               | PR / push `main` `develop` `release/**` `hotfix/**` | Calls reusable quality gates                                   |
| `reusable-quality.yml` | `workflow_call`                                     | Build, TS, lint, coverage, OpenAPI, audit, secrets, Playwright |
| `codeql.yml`           | PR / push / weekly                                  | CodeQL javascript-typescript                                   |
| `deploy.yml`           | `v*.*.*` tags / `workflow_dispatch`                 | Cloud Run after quality                                        |

```mermaid
flowchart LR
  PR[Pull Request] --> Q[reusable-quality]
  Q --> B[Build all apps]
  Q --> T[Unit + coverage]
  Q --> L[Lint + Prettier]
  Q --> S[Secrets + audit]
  Q --> P[Playwright + a11y]
  Q --> O[OpenAPI]
  main[main / tag] --> D[deploy.yml]
  D --> Q2[quality again]
  Q2 --> CR[Artifact Registry + Cloud Run]
```

**Merge is blocked** when any required check fails (configure branch protection — below).

---

## Deployment (Cloud Run)

Target project (dev): `sahyak` · Region: `asia-south1` · Artifact Registry: `sahayak-dev`

### GitHub Actions deploy

1. Configure **Environments**: `development`, `staging`, `production` (protection rules on prod).
2. Set secrets / vars (see below).
3. Run **Actions → Deploy Cloud Run → Run workflow**, or push tag `vX.Y.Z` (maps to `production`).

Deployment runs **only if** reusable quality succeeds (unless emergency `skip_quality=true`).

### Manual / scripted (dev)

```bash
# API via Cloud Build
gcloud builds submit --config apps/cloudbuild-api.yaml .

# Web apps
TAG=session34 bash scripts/deploy-web-apps.sh
```

---

## Rollback

```bash
# List revisions
gcloud run revisions list --service=sahayak-dev-api --region=asia-south1

# Shift 100% traffic to previous revision
gcloud run services update-traffic sahayak-dev-api \
  --to-revisions=REVISION_NAME=100 \
  --region=asia-south1 \
  --project=sahyak
```

Deploy workflows print previous revision names on failure.

---

## Release process

1. Cut `release/x.y.z` from `develop` (or tag from `main` when ready).
2. Ensure CI green; update `CHANGELOG.md`.
3. Merge to `main` via PR.
4. Tag `vX.Y.Z` → triggers production deploy workflow.
5. Smoke `/health` + critical Playwright paths.
6. If regression: rollback traffic; open hotfix.

---

## Secrets & environment variables

### Never commit

`.env`, `.env.local`, SA JSON keys, NVIDIA keys, WhatsApp/Exotel tokens.

### GitHub Actions secrets

| Secret                           | Use                                  |
| -------------------------------- | ------------------------------------ |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF for `google-github-actions/auth` |
| `GCP_SERVICE_ACCOUNT`            | Deploy SA email                      |
| `NEXT_PUBLIC_FIREBASE_API_KEY`   | Web image bake-in                    |
| `NEXT_PUBLIC_FIREBASE_APP_ID`    | Web image bake-in                    |

### GitHub Actions variables

| Variable                 | Example                                 |
| ------------------------ | --------------------------------------- |
| `GCP_PROJECT_ID`         | `sahyak`                                |
| `GCP_REGION`             | `asia-south1`                           |
| `AR_REPO`                | `sahayak-dev`                           |
| `NEXT_PUBLIC_API_URL`    | Cloud Run API URL                       |
| `NEXT_PUBLIC_FIREBASE_*` | Auth domain / project / bucket / sender |
| `CLOUD_RUN_*_SERVICE`    | Service names per env                   |

### Runtime (API — Secret Manager / Cloud Run env)

See `.env.example`: `DATABASE_URL`, `REDIS_URL`, `FIREBASE_*`, `NVIDIA_API_KEY`, WhatsApp/Exotel, `WEBHOOK_SHARED_SECRET`.

---

## Branch protection

Recommended GitHub settings for **`main`** (and preferably `develop`):

- Require pull request before merging
- Require approvals ≥ 1
- Require status checks:
  - `Quality gate summary` (or all jobs from `reusable-quality`)
  - `CodeQL / Analyze (javascript-typescript)`
- Require conversation resolution
- Restrict force pushes and deletions
- Optionally: require linear history / squash

Enable: **Secret scanning**, **Push protection**, **Dependabot alerts**, **Dependabot security updates**.

---

## Quality gates

| Gate                  | Threshold / rule                           |
| --------------------- | ------------------------------------------ |
| Install + build       | All workspaces                             |
| TypeScript            | Zero errors                                |
| ESLint                | `--max-warnings 0`                         |
| Prettier              | `format:check` on CI-owned paths           |
| Unit coverage         | API ≥90%, FE ≥85%, shared ≥95%             |
| Integration / OpenAPI | Generate + validate                        |
| Playwright            | Full citizen/provider/admin/platform       |
| Accessibility         | `e2e:a11y`                                 |
| Dependency audit      | Fail High/Critical                         |
| Secret scan           | `secrets:scan` + Gitleaks                  |
| CodeQL                | Security-and-quality                       |
| Bundle size           | Soft warn 45 MiB `.next`, hard fail 90 MiB |

Report: [`CI_CD_REPORT.md`](CI_CD_REPORT.md)
