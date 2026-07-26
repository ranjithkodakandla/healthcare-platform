# RESPONSIVE_REVIEW.md — Rakshak / Sahayak Platform

**Date:** 2026-07-26  
**Assessor:** Principal UX Architect · Enterprise Frontend Architect · Responsive Design Expert  
**Spec baseline:** `Healthcare-Coordination-Platform-UX-Spec.md` §9  
**Artifacts:** `reports/responsive/**` (62 PNGs) · `scripts/responsive-capture.js`

---

## Verdict

| App | Target experience | Post-Session 32 status |
|---|---|---|
| **Citizen** | Premium mobile-first; desktop = centered phone frame | ✅ Matches |
| **Provider** | Enterprise SaaS (desktop primary; tablet drawer; phone functional) | ✅ Architecture aligned; redeploy for Cloud Run |
| **Admin** | Enterprise ops console (desktop ≥1280; tablet functional) | ✅ Architecture aligned; redeploy for Cloud Run |

---

## Breakpoint strategy (implemented)

| Token | Range | Citizen | Provider | Admin |
|---|---|---|---|---|
| Mobile | &lt;768 | Full-bleed phone shell | Drawer + stacked layouts | Drawer + stacked cards |
| Tablet | 768–1023 / 1279 | Centered frame ~430px | Drawer (&lt;1024); 2-col stats | Drawer (&lt;1280); 2-col stats |
| Desktop | ≥1024 / ≥1280 | Centered 390px card | Persistent sidebar | Persistent sidebar |
| Wide | ≥1536 / content max | Same phone frame | Content max ~1600px | Content max 1560px |

Shared primitives: `StatGrid`, `SplitPane`, `ResponsiveTable` / `.data-scroll`, `.ops-row-grid`, shell drawer CSS.

---

## Before → After

### Citizen

| Viewport | Before | After | Evidence |
|---|---|---|---|
| Phone | Phone shell OK; nested double shells on triage | Single shell; emergency hides BottomNav | Local capture `citizen/iphone-14/*` |
| Tablet | Flat 390px strip | Rounded elevated frame ~430px | `citizen/ipad/onboarding_splash.png` |
| Desktop | Centered 390px | Same + subtle device chrome | `citizen/desktop/onboarding_splash.png` |

**Issues found:** Nested `MobileShell` on home emergency routes; no safe-area; no tablet framing.  
**Issues fixed:** Home layout owns shell; hide nav on triage/searching/tracking/arrival; safe-area on shell + BottomNav; tablet/desktop frame CSS.  
**Remaining:** Pinch-zoom still limited by viewport meta (a11y tradeoff); deeper budget-Android density testing.

### Provider

| Viewport | Before | After | Evidence |
|---|---|---|---|
| Desktop ≥1024 | Full sidebar + content | Persistent sidebar; content max-width | `provider/desktop/hospital_dashboard.png` |
| Tablet 820 | Sidebar ate width; grids crushed | Hamburger + drawer; search flex | `provider/tablet/*` |
| Phone 390 | Unusable fixed sidebar | Drawer nav; stacked ops rows; 44px steppers | `provider/phone/hospital_dashboard.png` |

**Issues found:** No drawer; fixed 5-col queue / 4-col beds; tiny steppers; login `w-[420px]` overflow.  
**Issues fixed:** `PortalShell` drawer &lt;1024; `TopHeader` menu; `StatGrid`/`SplitPane`; queue/beds scroll + ops-row-grid; login `max-w`; bed steppers 44×44.  
**Remaining:** Redeploy Cloud Run; secondary portals (pharmacy/insurance CSS grids) still benefit from more `ops-row-grid` adoption; live API needed for full dashboard content in captures.

### Admin

| Viewport | Before | After | Evidence |
|---|---|---|---|
| Desktop ≥1280 | Sidebar + dense tables | Persistent sidebar + scroll tables | `admin/desktop/*` |
| Tablet / phone | Sidebar never collapsed; tables overflowed viewport | Mobile bar + drawer; `ResponsiveTable` | `admin/phone/dashboard.png` |

**Issues found:** No collapse; bare tables without contained H-scroll; fixed `grid-cols-3/4`.  
**Issues fixed:** `ConsoleShell` drawer &lt;1280; `ResponsiveTable` on tickets/users/governance/analytics/SLA/onboarding; `stat-grid` on dashboard/board; login `max-w`.  
**Remaining:** Kanban board still stacks (acceptable); remote-assist / monitoring secondary grids; redeploy.

---

## Screenshot index

Generated under `reports/responsive/`:

```
citizen/{iphone-se,iphone-14,pixel,ipad,desktop}/…
provider/{desktop,laptop,tablet,phone}/…
admin/{desktop,laptop,tablet,phone}/…
manifest.json
```

Capture command:

```bash
E2E_CITIZEN_URL=http://127.0.0.1:3111 \
E2E_PROVIDER_URL=http://127.0.0.1:3112 \
E2E_ADMIN_URL=http://127.0.0.1:3113 \
node scripts/responsive-capture.js
```

Note: Local captures show empty dashboard data (`Failed to fetch`) when API CORS/origin is not the local host — **layout chrome is still valid** for responsive validation.

---

## Playwright validation

| Suite | Result |
|---|---|
| Deployed E2E (citizen/provider/admin/platform) | **88 passed / 0 failed** |
| Accessibility (`e2e:a11y`) | **3 passed** |
| Multi-viewport capture | **62/62** screenshots |

---

## Quality gates (Session 32)

| Gate | Result |
|---|---|
| Build (3 apps) | PASS |
| ESLint | PASS (coverage artifact warnings only) |
| Unit / coverage | PASS (Citizen ~95%; Provider ~91%; Admin ~89%) |
| API tests | PASS (~97% stmts) |
| Dependency audit | PASS |
| Playwright + a11y | PASS |

---

## Architectural decisions

1. **Citizen stays a phone frame on desktop** — intentional product choice (UX Spec §9 / user brief), not a full-bleed web app.  
2. **Provider drawer threshold = 1024px** — matches UX Spec §9.  
3. **Admin drawer threshold = 1280px** — desktop-first; tablet functional via drawer.  
4. **Dense tables scroll inside a container** rather than reflow columns — preserves ops alignment (Admin §9).  
5. **No branding redesign** — only layout architecture.

---

## Remaining improvements (non-blocking)

1. Redeploy Citizen / Provider / Admin Cloud Run with Session 32 shells.  
2. Extend `ops-row-grid` / `SplitPane` to pharmacy, insurance, ambulance, AI assistant pages.  
3. Optional resizable master-detail panes (cases) for ultra-wide.  
4. Playwright project with explicit viewport matrix in CI (beyond capture script).  
5. Inject mock session for authenticated screenshot content richness.
