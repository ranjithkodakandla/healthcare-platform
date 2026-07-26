# Contributing to Sahayak

Thank you for helping build India’s healthcare coordination platform. This repository uses an enterprise quality bar: **every PR must pass all CI quality gates** before merge.

## Branch strategy

| Branch      | Purpose                                      |
| ----------- | -------------------------------------------- |
| `main`      | Production-ready; protected                  |
| `develop`   | Integration branch                           |
| `feature/*` | Feature work (branch from `develop`)         |
| `release/*` | Release hardening                            |
| `hotfix/*`  | Urgent production fixes (branch from `main`) |

### Flow

1. Create `feature/<short-name>` from `develop` (or `hotfix/*` from `main`).
2. Open a Pull Request into `develop` (hotfixes → `main`, then back-merge to `develop`).
3. Ensure all required GitHub checks are green.
4. Squash or merge with a [Conventional Commit](https://www.conventionalcommits.org/) subject.

## Conventional Commits

```
feat(api): add privacy erasure endpoint
fix(citizen): correct guest triage copy
ci: add Cloud Run deploy workflow
docs: update DEVOPS rollback section
chore(deps): bump playwright
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `ci`, `chore`, `revert`.

## Local setup

See `DEVOPS.md` for full instructions. Minimal:

```bash
nvm use   # Node 20+
npm ci
cp .env.example apps/api/.env   # or root .env per your local layout
docker compose up -d            # Postgres + Redis
cd apps/api && npx prisma migrate deploy && npm run start:dev
```

## Quality gates (must pass)

| Gate            | Command                  |
| --------------- | ------------------------ |
| Format          | `npm run format:check`   |
| Secrets         | `npm run secrets:scan`   |
| Unit + coverage | `npm run test:unit`      |
| Static / lint   | `npm run analyze:static` |
| Dep audit       | `npm run audit:deps`     |
| Full local CI   | `npm run ci:local`       |
| Playwright      | `npm run e2e`            |

Coverage floors: **Backend ≥90%**, **Frontend ≥85%**, **Shared ≥95%**.

## PR checklist

- [ ] Linked issue / REQ id when applicable
- [ ] Tests updated
- [ ] No secrets or `.env` files
- [ ] `IMPLEMENTATION_MASTER_PLAN.md` updated if the change is session-scoped work
- [ ] Accessibility considered for UI changes

## Code of Conduct

By participating, you agree to `CODE_OF_CONDUCT.md`.
