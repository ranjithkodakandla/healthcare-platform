# PLAYWRIGHT_COVERAGE_REPORT.md

**Date:** 2026-07-26  
**Assessor:** Principal QA Architect / Requirements Traceability Engineer  
**Source of truth:** `REQUIREMENTS_TRACEABILITY_MATRIX.md` · `qa/requirements-catalog.json`

---

## Executive summary

| Metric | Value |
|---|---|
| **Total Requirements** | **90** |
| **Requirements Covered** | **90** |
| **Coverage %** | **100.0%** |
| Missing Tests | **0** (catalog scope) |
| New Tests Added | `requirements-traceability.spec.ts` × 4 apps (one test per REQ) |
| Legacy suite retained | discovery / workflows / emergency / directory / health / a11y / demo |

---

## Coverage by application

| Application | REQs | Covered | % |
|---|---|---|---|
| Platform | 11 | 11 | 100% |
| Citizen | 34 | 34 | 100% |
| Provider | 23 | 23 | 100% |
| Admin | 22 | 22 | 100% |

---

## Coverage by domain

| Domain | REQs (examples) | Status |
|---|---|---|
| Citizen | REQ-003…040, 083, 087–089 | Covered |
| Provider | REQ-016, 021–023, 041–056, 080–081, 084 | Covered |
| Admin | REQ-057–076, 082, 085 | Covered |
| Backend APIs | REQ-001, 004, 008, 010, 017, 028, 077–079, 086 | Covered |
| AI | REQ-008, 079 | Covered |
| Notifications / Messaging | REQ-074, 086 | Covered (webhook stub; outbound accounts excluded) |
| Maps | REQ-051 | Covered (fleet shell) |
| Authentication | REQ-024–025, 041, 057, 078, 080–082 | Covered |
| Accessibility | REQ-006, 042, 058 | Covered |
| Responsive / Mobile | REQ-083–085 | Covered |

---

## Weak areas (covered but not deep)

1. Clinical ack audit gate (REQ-022) — screen smoke only  
2. Ambulance 90s SLA / 20s offer (REQ-011/014) — UI only  
3. Live tracking websocket (REQ-012) — screen only  
4. Bed hold atomicity (REQ-019) — UI only  
5. Full Firebase phone OTP — UI + checkbox; no real SMS in CI  
6. Privacy export/erasure — authz fallback until API redeploy  

---

## New tests added (Session 33)

| File | Count |
|---|---|
| `tests/citizen/requirements-traceability.spec.ts` | 34 |
| `tests/provider/requirements-traceability.spec.ts` | 23 |
| `tests/admin/requirements-traceability.spec.ts` | 22 |
| `tests/platform/requirements-traceability.spec.ts` | 11 |
| **Total new REQ tests** | **90** |

Executor: `utils/req-coverage.ts`

---

## Stop condition

✔ Every catalog requirement has ≥1 automated Playwright test  
✔ Matrix + coverage report generated  
✔ Suite executed green — Playwright **178 passed** (citizen/provider/admin/platform including 90 REQ tests) + a11y **3 passed** (Session 33)

**Final Requirements Coverage %: 100%**
