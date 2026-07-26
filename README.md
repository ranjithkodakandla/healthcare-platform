# Sahayak — Healthcare Coordination Platform

[![CI](https://github.com/ranjithkodakandla/healthcare-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ranjithkodakandla/healthcare-platform/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ranjithkodakandla/healthcare-platform/actions/workflows/codeql.yml/badge.svg)](https://github.com/ranjithkodakandla/healthcare-platform/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Coverage](https://img.shields.io/badge/coverage-API%20≥90%25%20%7C%20FE%20≥85%25%20%7C%20Shared%20≥95%25-brightgreen)](DEVOPS.md#quality-gates)
[![Playwright](https://img.shields.io/badge/Playwright-E2E%20%2B%20a11y-green)](QA_AUTOMATION.md)
[![Security](https://img.shields.io/badge/security-CodeQL%20%2B%20audit-informational)](SECURITY.md)

India-focused **healthcare coordination** platform: one Case, one Timeline, one Resource Coordination Engine — across Citizen, Provider, and Admin products.

> Living engineering plan: [`IMPLEMENTATION_MASTER_PLAN.md`](IMPLEMENTATION_MASTER_PLAN.md)

## Products

| App      | Path                        | Role                                    |
| -------- | --------------------------- | --------------------------------------- |
| API      | `apps/api`                  | NestJS modular monolith                 |
| Citizen  | `apps/citizen-app`          | Emergency + care journey (mobile-first) |
| Provider | `apps/provider-portal`      | Hospital / fleet / pharmacy ops         |
| Admin    | `apps/admin-console`        | Platform operations                     |
| Shared   | `packages/shared-constants` | Domain constants + events               |

## Quick start

```bash
nvm use                 # Node 20 (see .nvmrc)
npm ci
docker compose up -d    # Postgres + Redis
cp .env.example .env    # fill locally — never commit secrets
npm run build -w @sahayak/shared-constants
cd apps/api && npx prisma migrate deploy && npm run start:dev
```

Frontends (separate terminals):

```bash
npm run dev -w citizen-app
npm run dev -w provider-portal
npm run dev -w admin-console
```

Full DevOps guide: [`DEVOPS.md`](DEVOPS.md) · Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## CI/CD

- **CI:** `.github/workflows/ci.yml` → reusable quality gates (build, TypeScript, lint/Prettier, unit coverage, OpenAPI, audit, secrets, Playwright + a11y).
- **Security:** `.github/workflows/codeql.yml`
- **Deploy:** `.github/workflows/deploy.yml` → Google Cloud Run (`development` / `staging` / `production`) after gates pass.

Pipeline health report: [`CI_CD_REPORT.md`](CI_CD_REPORT.md)

## Branch strategy

`main` ← `develop` ← `feature/*` · `release/*` · `hotfix/*`

`main` must be protected: require PRs + passing required checks (see `DEVOPS.md`).

## License

[MIT](LICENSE)
