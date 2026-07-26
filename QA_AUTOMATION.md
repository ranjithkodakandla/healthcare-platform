# Sahayak / Rakshak — End-to-End Automation Framework

Production-quality Playwright + TypeScript suite for the deployed GCP **dev** stack.

**Excluded by design:** WhatsApp / IVR / SMS account integrations (code exists; accounts deferred).

## Architecture

| Path | Purpose |
|---|---|
| `playwright.config.ts` | Projects: `citizen`, `provider`, `admin`, `platform`, `demo` |
| `tests/` | Specs by app + discovery + cinematic demo |
| `pages/` | Page Object Model |
| `fixtures/test.ts` | Shared fixtures (`stepShot`, page objects) |
| `utils/routes.ts` | **Screen inventory** — extend when UI ships |
| `utils/env.ts` | Environment URLs + credentials |
| `utils/demo.ts` | Human-paced demo helpers |
| `utils/api.ts` | API health + guest case helpers |
| `utils/stitch-demo.ts` | FFmpeg stitch → `Rakshak-Demo.mp4` |

Default targets (Cloud Run):

- API: `https://sahayak-dev-api-j2iqu7nnqq-el.a.run.app`
- Citizen / Provider / Admin: matching `sahayak-dev-*` Cloud Run URLs

## Install

```bash
npm install
npx playwright install chromium
```

Optional credentials:

```bash
cp .env.e2e.example .env.e2e
# fill E2E_PROVIDER_* / E2E_ADMIN_*
set -a; source .env.e2e; set +a
```

## How to run

```bash
# Full regression (all apps + API) — videos, traces, screenshots ON
npm run e2e

# One project
npm run e2e:citizen
npm run e2e:provider
npm run e2e:admin
npm run e2e:platform

# Cinematic demo (slowMo, serial)
npm run e2e:demo

# Stitch demo artifacts into Rakshak-Demo.mp4 (requires ffmpeg)
npm run e2e:stitch

# Open HTML report
npm run e2e:report
```

## Artifacts

| Artifact | Location |
|---|---|
| HTML report | `playwright-report/` |
| Videos / traces / screenshots | `test-results/` |
| Demo stills | `test-results/demo-stills/` |
| Stitched demo | `Rakshak-Demo.mp4` |

Every test run uses `trace: on`, `video: on`, `screenshot: on`.

## How to debug

```bash
# UI mode
npx playwright test --ui

# Headed single file
npx playwright test tests/citizen/emergency-flow.spec.ts --headed --project=citizen

# Show last trace
npx playwright show-trace test-results/**/trace.zip
```

Failures always keep video + trace under `test-results/<test-name>/`.

## How to record / regenerate demo video

```bash
rm -rf test-results/demo-stills Rakshak-Demo.mp4
E2E_DEMO=1 npm run e2e:demo
npm run e2e:stitch
```

Demo mode:

- `slowMo` mouse movement
- deliberate pauses / scrolls
- full-page stills for title cards
- happiest Citizen → Provider → Admin path (no WhatsApp)

## How to update locators

1. Prefer **role + accessible name** (already used in POM).
2. When UI text is unstable, add `data-testid` in the app and bind it in `pages/**`.
3. Keep business paths in POM methods (`CitizenTriagePage.submitEmergency`), not in raw specs.

## How to add a new screen

1. Add a row to `utils/routes.ts` (`CITIZEN_SCREENS` / `PROVIDER_SCREENS` / `ADMIN_SCREENS`).
2. Discovery specs pick it up automatically.
3. Optionally add a POM method + a workflow assertion.

## Auth strategy

| App | Mode without creds | Mode with creds |
|---|---|---|
| Citizen | Guest emergency + directory screens | Phone OTP UI smoke only (real OTP needs Firebase test number) |
| Provider | Screen discovery + login validation | Full console nav when `E2E_PROVIDER_*` set |
| Admin | Screen discovery + login validation | Full console nav when `E2E_ADMIN_PASSWORD` set |

## Coverage map

- Authentication UI (Citizen OTP, Provider, Admin)
- Citizen: onboarding, guest emergency, triage, case tracking, beds/hospitals/blood/diagnostics/doctors/pharmacy/insurance/cancer, profile
- Provider: login, dashboard, beds, queue, cases, reports, analytics, AI, fleet, pharmacy, blood, doctors
- Admin: login, dashboard, onboarding, support, issues, users, monitoring, analytics, AI, governance
- Platform: `/health`, bed search API
- **Not covered:** WhatsApp / Exotel live messaging

## CI tip

```bash
npx playwright test --reporter=html
# upload playwright-report/ and test-results/
```
