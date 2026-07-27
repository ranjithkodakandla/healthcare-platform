# AI Onboarding Prompt — read this before touching any code

> Paste this entire file as your first message to any AI coding assistant (Claude Code, Cursor, Codex, Gemini, etc.) right after cloning this repo, before asking it to fix or build anything. It gives the AI the context it needs to work safely in this codebase instead of guessing.

---

## What this is

**Sahayak** — an India Healthcare Coordination Platform. It connects citizens in medical emergencies to hospitals, ambulances, pharmacies, blood banks, diagnostic centers, and insurers in real time (bed availability, ambulance dispatch, hold/confirm workflows), plus admin/ops and provider-facing consoles for the organizations on the other side of those transactions.

## Step 1 — Read these files in order, fully, before doing anything else

1. `IMPLEMENTATION_MASTER_PLAN.md` — **the single most important file in this repo.** Living execution plan: architecture, tech stack, phase history, a full session-by-session log of what's been built and by whom, an open Technical Debt list (`TD-NNN`), and a Decision Log (`DL-NNN`) recording every non-obvious architectural call and why it was made. Read the whole thing, especially the **Session Log** (most recent sessions first) and **Technical Debt** section — it tells you what's already known-broken or intentionally deferred so you don't "rediscover" and re-fix the same thing differently.
2. `Healthcare-Coordination-Platform-PRD.md` (+ `Healthcare-Coordination-Platform-PRD-Modules-3-9-Expansion.md`) — **the functional source of truth.** Business rules (`BR-##`), functional requirements (`FR-XXX-###`), Golden Threads (`GT-##`) are authoritative. If code and PRD disagree, the PRD wins — log the conflict in `IMPLEMENTATION_MASTER_PLAN.md`'s Decision Log rather than silently picking one.
3. `Healthcare-Coordination-Platform-UX-Spec.md` — screen inventory, flows, component hierarchy.
4. `Healthcare-Design-System.md` — design tokens/components if you're touching UI.
5. `REQUIREMENTS_TRACEABILITY_MATRIX.md`, `PLAYWRIGHT_COVERAGE_REPORT.md`, `RELEASE_READINESS.md`, `PRIVACY_COMPLIANCE_REPORT.md`, `CI_CD_REPORT.md` — current-state snapshots of test coverage, release posture, DPDP/privacy compliance, and CI/CD pipeline. Skim these for whatever area you're about to touch.
6. If you're working in the Provider Portal specifically, also read `PROVIDER_UAT_FIX_REPORT.md` — a recent UAT pass and the root-cause fixes applied, including the auth/RBAC architecture (see below).

**Do not start writing code until you've done this.** A fix that ignores the master plan's session history or contradicts a logged Decision Log entry creates drift that costs more to untangle later than the time saved skipping the read.

## Step 2 — Architecture cheat sheet (so you're not starting from zero)

- **Monorepo**, npm workspaces. `apps/api` (NestJS backend), `apps/citizen-app`, `apps/provider-portal`, `apps/admin-console` (all Next.js), `apps/mobile`. Shared code in `packages/shared-constants` (enums, error codes — `Role`, `ProviderType`, `HospitalPortalRole`, `CaseSeverity`, `BedCategory`, etc.).
- **Auth model:** Firebase Auth, custom claims (`role`, `orgId`, `providerType`) — **not** a database-backed membership/session table. `POST /v1/auth/session` verifies the Firebase ID token and returns the principal; the frontend stores it and trusts it. This is a deliberate simplification (logged as `TD-025` in the master plan: no persisted `Provider`/`Membership` table yet) — know this before you assume there's a `users` table to query.
- **API-side authorization** is layered: `AuthGuard` (verifies bearer token) → `RolesGuard` (role check via `@Roles()`) → `OrgScopeGuard` (compares `request.user.orgId` to the `:hospitalId`/`:providerId` route param — added recently specifically to close a cross-org IDOR; see `apps/api/src/shared-services/auth/org-scope.guard.ts`). Any new provider-scoped route needs all three.
- **Provider Portal frontend** has a `PortalGuard` component (`apps/provider-portal/src/components/shell/PortalGuard.tsx`) wrapping every portal's `layout.tsx`, checking the session's `providerType` against the mounted portal. This is UX/defense-in-depth only — the real security boundary is the API's `OrgScopeGuard`. Don't mistake a frontend nav fix for a real access-control fix.
- **CI/CD:** GitHub Actions. `.github/workflows/ci.yml` runs on every push/PR (lint, typecheck, unit test with coverage thresholds, build, Playwright, a11y, dependency audit, secret scan). `.github/workflows/deploy.yml` runs the same quality gates as a **pre-deploy gate**, then auto-deploys `api`/`citizen`/`provider`/`admin` to Cloud Run **development** on every push to `main` (tags `v*.*.*` deploy to production). There is no separate staging merge step — pushing to `main` is live within minutes. Be deliberate about what you push.
- **Test conventions:** Jest per app/package. Files named `*.unit.spec.ts` are isolated (mocked dependencies, no real DB/Firebase) — this is the pattern to follow for new tests. Plain `*.spec.ts` files may require a live Postgres and are skipped locally via `SKIP_DB_INTEGRATION=1 npm test` when one isn't running (CI has real Postgres so these do run there). Playwright specs live in `tests/<app>/` at the repo root, run against either a deployed Cloud Run URL or `localhost` via `E2E_*_URL` env vars.
- **Coverage thresholds are enforced and will fail CI** if you add code without tests — check each app's `jest.config.*` for the exact numbers before assuming "some tests" is enough.

## Step 3 — Working rules

1. **Validate before fixing.** If you're given a bug report, UAT findings, or an issue list, check it against the actual running code first — don't assume the report is correct. State what you found (confirmed / not reproducible / already fixed / different root cause) before changing anything.
2. **Fix root causes, not symptoms.** E.g., if something is broken because of a missing authorization check, add the actual guard — don't just hide a UI element.
3. **No fabricated results.** If you can't reach a deployed environment, run a test, or verify a claim, say so explicitly rather than presenting a guess as a verified fact.
4. **Every fix needs a regression test.** Match the existing pattern in the file/directory you're editing.
5. **Update `IMPLEMENTATION_MASTER_PLAN.md`** after any non-trivial change: bump the document version/date in the header, add a `### Session N` entry (follow the existing format — AI Tool Used / Summary / Files Changed / Features Completed / Current Blockers / Next Recommended Task), and log any new technical debt (`TD-NNN`) or architectural decision (`DL-NNN`) you introduce or discover. This file is how the next person (human or AI) picks up where you left off — don't skip it.
6. **Run the actual quality gates locally before pushing** — at minimum: lint, typecheck, unit tests with coverage, build, for whichever app(s) you touched. `main` auto-deploys to real GCP infrastructure on push; a broken push isn't just a red CI badge, it's a live deploy attempt.
7. **Don't touch GCP IAM, secrets, or infra config** without explicit sign-off — this is a shared project on a real GCP project (`sahyak`) with billing and other collaborators.

---

*Keep this file up to date if the architecture materially changes (e.g., if `TD-025`'s Provider/Membership table gets built, update the auth model description above).*
