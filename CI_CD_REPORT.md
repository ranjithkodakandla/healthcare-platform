# CI/CD Report — Sahayak Healthcare Platform

**Date:** 2026-07-26  
**Prepared by:** Principal DevOps / Platform / Release Engineering (Session 34)  
**Repository:** https://github.com/ranjithkodakandla/healthcare-platform  
**Document version:** 1.0

---

## Repository Health

| Check                | Status | Notes                                                                                                           |
| -------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| Git initialized      | ✅     | Conventional commits; remote `origin` configured                                                                |
| `.gitignore`         | ✅     | Excludes `node_modules`, `.env*`, `.next`, coverage, Playwright artifacts, Terraform state, zips, `.wireframes` |
| Secrets in git       | ✅     | Working-tree `.env` ignored; `npm run secrets:scan` PASS                                                        |
| Community docs       | ✅     | README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, LICENSE (MIT)                                       |
| Issue / PR templates | ✅     | Bug + Feature + PR template                                                                                     |
| Dependabot           | ✅     | npm + GitHub Actions weekly                                                                                     |

**Verdict:** Clean collaborative baseline ready for team development.

---

## Pipeline Summary

| Workflow           | File                                     | Triggers                                           |
| ------------------ | ---------------------------------------- | -------------------------------------------------- |
| CI                 | `.github/workflows/ci.yml`               | PR, push `main`/`develop`/`release/**`/`hotfix/**` |
| Quality (reusable) | `.github/workflows/reusable-quality.yml` | `workflow_call`                                    |
| CodeQL             | `.github/workflows/codeql.yml`           | PR, push, weekly                                   |
| Deploy             | `.github/workflows/deploy.yml`           | `v*.*.*` tags, `workflow_dispatch`                 |
| Local parity       | `npm run ci:local`                       | Developer workstation                              |

```text
PR / push → reusable-quality
  ├─ shared-constants (≥95% coverage)
  ├─ API (lint · tsc · ≥90% · build · /health)
  ├─ Frontends ×3 (lint · tsc · ≥85% · build · bundle budget)
  ├─ Prettier · static ESLint · secret scan · Gitleaks
  ├─ npm audit (High/Critical fail)
  ├─ OpenAPI generate + validate
  └─ Playwright (citizen/provider/admin/platform) + a11y → artifacts

tag / dispatch → quality → Artifact Registry → Cloud Run (env-gated)
```

---

## Quality Gates

| Gate                   | Target                            | Local result (2026-07-26)               |
| ---------------------- | --------------------------------- | --------------------------------------- |
| Install / build        | All apps                          | ✅                                      |
| TypeScript             | 0 errors                          | ✅                                      |
| ESLint                 | max-warnings 0                    | ✅                                      |
| Prettier               | `format:check`                    | ✅                                      |
| Unit coverage — API    | ≥90%                              | ✅ (~97% stmts)                         |
| Unit coverage — FE     | ≥85%                              | ✅                                      |
| Unit coverage — shared | ≥95%                              | ✅                                      |
| OpenAPI contract       | validate                          | ✅ (CI job)                             |
| Dependency audit       | fail High/Critical                | ✅ (OSV fallback when registry blocked) |
| Secret scan            | clean tree                        | ✅                                      |
| Playwright regression  | 100% pass                         | ✅ **178 passed**                       |
| Accessibility          | a11y project                      | ✅ **3 passed**                         |
| Bundle budget          | warn 45 MiB / fail 90 MiB `.next` | ⚠️ soft warn (admin ~47 MiB)            |
| CodeQL                 | security-and-quality              | ⏳ runs on GitHub after push            |
| Gitleaks               | no leaks                          | ⏳ runs on GitHub after push            |

---

## Coverage

| Package                                             | Floor | Observed               |
| --------------------------------------------------- | ----- | ---------------------- |
| `@sahayak/api`                                      | 90%   | ~97% statements        |
| `citizen-app` / `provider-portal` / `admin-console` | 85%   | ≥85% (Jest thresholds) |
| `@sahayak/shared-constants`                         | 95%   | ≥95% (`test:ci`)       |

Artifacts: uploaded as `*-coverage` from CI; locally under each package’s `coverage/` (gitignored).

---

## Security

| Control         | Implementation                                                                           |
| --------------- | ---------------------------------------------------------------------------------------- |
| Secret scanning | `scripts/secret-scan.js` + Gitleaks action + GitHub push protection (enable in settings) |
| SAST            | CodeQL `javascript-typescript`                                                           |
| SCA             | `npm run audit:deps` + Dependabot                                                        |
| Runtime         | Helmet/CORS/throttling in API (existing); secrets via GCP SM / GitHub Environments       |
| Privacy launch  | Separate gate — DL-011 **CONDITIONAL GO** pilot                                          |

---

## Playwright

| Metric    | Value                                                         |
| --------- | ------------------------------------------------------------- |
| Projects  | citizen, provider, admin, platform (+ a11y)                   |
| Result    | **178 passed** (+ **3** a11y)                                 |
| Artifacts | HTML report, traces (`on`), screenshots (`on`), videos (`on`) |
| Targets   | Cloud Run `dev` URLs (overridable via `E2E_*`)                |

---

## Deployment Readiness

| Item                   | Status                                                         |
| ---------------------- | -------------------------------------------------------------- |
| Dockerfiles            | ✅ `apps/api/Dockerfile`, `apps/web.Dockerfile`                |
| Artifact Registry path | `asia-south1-docker.pkg.dev/sahyak/sahayak-dev/*`              |
| Deploy workflow        | ✅ `.github/workflows/deploy.yml`                              |
| Environments           | `development` / `staging` / `production` (configure in GitHub) |
| Auth                   | Workload Identity Federation secrets required                  |
| Rollback               | Documented (`gcloud run services update-traffic`)              |
| Staging/prod Terraform | Still open (dev only today)                                    |

**Required GitHub configuration before first Actions deploy:**

1. Environments: `development`, `staging`, `production` (protect `production`).
2. Secrets: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, Firebase bake-in keys.
3. Vars: `GCP_PROJECT_ID`, `GCP_REGION`, `AR_REPO`, `NEXT_PUBLIC_*`, Cloud Run service names.
4. Enable Secret scanning + Push protection + Dependabot.

Until WIF secrets are installed, deploy remains **manual** via existing `scripts/deploy-web-apps.sh` / Cloud Build.

---

## Branch Protection Recommendations

Apply to **`main`** (mirror on **`develop`**):

1. Require pull request before merging
2. Require ≥1 approval
3. Require status checks to pass:
   - `Quality gate summary`
   - `Analyze (javascript-typescript)` (CodeQL)
4. Require conversation resolution
5. Block force pushes and branch deletion
6. Restrict who can push to `main`

Branch model: `main` ← `develop` ← `feature/*` · `release/*` · `hotfix/*` (see `CONTRIBUTING.md` / `DEVOPS.md`).

---

## Go / No-Go Recommendation

### **GO — for collaborative enterprise development on `dev` / CI**

Rationale:

- Repository hygiene, community standards, and reusable CI quality gates are in place.
- Local full quality run succeeded (unit/lint/build/audit/secrets + Playwright 178 + a11y 3).
- Cloud Run deploy path is automated in Actions pending WIF/env secrets.

### **CONDITIONAL — for production cutover**

Blockers outside this session:

- GitHub Environment secrets / WIF not yet verified end-to-end on Actions runners
- Staging/prod Terraform not applied
- Privacy PRIV-H1–H3 (DL-011) still open for unrestricted public production
- Cloud Run redeploy still needed for latest privacy + responsive shells on live web apps

---

## References

- `DEVOPS.md` — operator runbook
- `IMPLEMENTATION_MASTER_PLAN.md` — Session 34
- `RELEASE_READINESS.md` — product quality score
- `SECURITY.md` — vulnerability disclosure
