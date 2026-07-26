# India Healthcare Coordination Platform
## Enterprise Design System — v1.0

**Source of truth:** `Healthcare-Coordination-Platform-UX-Spec.md` (v1.0), itself derived from the PRD. This document fills in exactly the layer that spec's §13 left open — "tokens-as-*categories*" become tokens-as-*values* — and extends those values into a full component library. **No business logic, screen, flow, or feature is introduced, changed, or reinterpreted here.** Every token and component below exists to serve a named requirement already in the spec (cited inline as `§X` / `FR-…` / `GT-…` / `BR-…`) or is flagged `[DS-DECISION]` where the spec was visually silent and a design-system-level choice was required to make the component usable — the same traceability discipline the spec itself uses for `[UX-DECISION]`.

This document does not produce Figma files. It is the written specification a design tool, or a designer, builds Figma styles and components *from*.

---

## 0. How to Read This Document

| If you are... | Start at... |
|---|---|
| Setting up Figma styles/variables | §2 Color, §3 Typography, §4 Spacing, §6 Elevation, §7 Radius |
| Building the component library | §11, cross-referenced to spec §8's Atoms/Molecules/Organisms/Templates |
| Reviewing for accessibility sign-off | §12 |
| Scoping mobile vs. desktop work | §13, §14 |

Every component entry in §11 states which spec screen(s) it serves (e.g. "serves C-09, C-12, P-04") so nothing here can drift into inventing a component the spec doesn't need.

---

# 1. Design Principles

Six principles, derived directly from spec language rather than generic design maxims — each is traceable to a specific spec requirement.

### 1. Calm Urgency
The system must communicate severity truthfully without ever feeling alarmist by default. A CRITICAL case *looks* different from a ROUTINE one — but a ROUTINE screen never borrows CRITICAL's visual vocabulary for emphasis. *(Serves spec §10: "no decorative animation on any CRITICAL-severity Case screen — motion is functional only.")*

### 2. One Truth, Many Surfaces
Citizen App, Provider Platform, and Admin Console are three renderings of the same Case object. A StatusBadge, SeverityIndicator, or TimelineEntry must look and behave identically wherever it appears — a hospital admin and a citizen looking at the same Case should recognize it as the same event. *(Serves spec §1: "no product-specific data model exists at the UX layer.")*

### 3. Never Silently Stale
Any degraded, cached, or last-known state is visually distinct from a live one — always labeled, never disguised as fresh data. *(Serves GT-11, BR-03 staleness pattern.)*

### 4. Legible Under Stress
Every citizen-facing screen in the Golden Hour path must be readable one-handed, in bright sunlight, by a panicked or low-literacy user, on a budget Android device. Typography, contrast, and touch targets are sized for the worst realistic condition, not the design-review monitor. *(Serves GT-09, §9's budget-device requirement, §1.26.)*

### 5. Dense Where Density Helps, Spacious Where Speed Matters
Provider and Admin surfaces are optimized for repeat expert use — density is a feature there. The Emergency path and Case Dashboard optimize for a first-time, stressed user — clarity beats density. The same system supports both without becoming two systems. *(Serves spec §10 vs. §11/§12 contrast.)*

### 6. Trustworthy, Not Sterile
A healthcare-grade visual language (clinical precision, high contrast, unambiguous states) delivered with warmth — rounded geometry, a human color palette, considered motion — so the product reads as *caring*, not just *compliant*. This is the visual register shared with Apple Health and Stripe Dashboard: precise, quiet confidence rather than either cold institutional gray or over-designed consumer flourish.

---

# 2. Color System

Color is the system's primary tool for two *non-overlapping* jobs, and they must never be visually confused:
- **Brand/UI color** — identity, navigation, primary actions.
- **Semantic color** — status, severity, feedback. Semantic color is never reused for decoration.

Per spec §13.1, **no severity or status meaning is ever conveyed by color alone** — every colored state below is paired with an icon and a text label (see §11 StatusBadge, SeverityIndicator).

## 2.1 Primary

Deep clinical teal — trustworthy, calm, distinct from the "emergency red" reserved exclusively for CRITICAL severity so the brand color never competes with a life-safety signal.

| Token | Hex | Usage |
|---|---|---|
| `color.primary.900` | `#04363D` | Text-on-light headers, Admin Console nav background |
| `color.primary.700` | `#0B5C66` | Default primary buttons, links, active nav state |
| `color.primary.500` | `#1490A0` | Hover/pressed states, secondary emphasis |
| `color.primary.300` | `#6FC7D2` | Selected-state fills, chart accents |
| `color.primary.100` | `#DEF3F5` | Subtle backgrounds, primary-tinted cards |
| `color.primary.50` | `#F3FBFC` | Page-level tint, hover backgrounds |

## 2.2 Secondary

Warm amber-gold — used sparingly for secondary CTAs and highlights; never for status (amber is reserved semantically for Warning).

| Token | Hex | Usage |
|---|---|---|
| `color.secondary.700` | `#8A5A00` | Secondary button text/border (dark mode text) |
| `color.secondary.500` | `#C9821A` | Secondary button default, highlight accents |
| `color.secondary.300` | `#E8B978` | Secondary hover backgrounds |
| `color.secondary.100` | `#FBF0DD` | Tint backgrounds |

## 2.3 Success

| Token | Hex | Usage |
|---|---|---|
| `color.success.700` | `#0E6B3A` | Text on light, icon fills |
| `color.success.500` | `#1E9E5C` | StatusBadge "Confirmed", success toasts |
| `color.success.100` | `#DFF5E9` | Success card/banner backgrounds |

## 2.4 Warning

| Token | Hex | Usage |
|---|---|---|
| `color.warning.700` | `#8A5A00` | Text on light |
| `color.warning.500` | `#D98C0E` | StatusBadge "Pending", StalenessFlag |
| `color.warning.100` | `#FBF0D9` | Warning banner backgrounds |

## 2.5 Danger

Reserved for actual error/failure states — visually distinct from CRITICAL severity (§2.7) even though both are "red family," so a form validation error is never mistakable for a life-threatening Case indicator.

| Token | Hex | Usage |
|---|---|---|
| `color.danger.700` | `#8C1D1D` | Error text |
| `color.danger.500` | `#C62E2E` | Error borders, destructive button, validation messages |
| `color.danger.100` | `#FBE3E3` | Error banner/field backgrounds |

## 2.6 Neutral

A slightly warm gray ramp (not pure gray) so the system reads as human rather than clinical-cold — the Apple Health / Stripe register.

| Token | Hex | Usage |
|---|---|---|
| `color.neutral.900` | `#1A1D1F` | Primary text |
| `color.neutral.700` | `#4A5054` | Secondary text |
| `color.neutral.500` | `#7C8388` | Placeholder text, disabled text |
| `color.neutral.300` | `#C7CDD0` | Borders, dividers |
| `color.neutral.150` | `#E7EBEC` | Input borders, table gridlines |
| `color.neutral.100` | `#F2F4F5` | App/page background |
| `color.neutral.0` | `#FFFFFF` | Surface/card background |

## 2.7 Severity Colors (CRITICAL / URGENT / MODERATE / ROUTINE)

Per spec §A2, §13.1 — the single most safety-critical token set in the system. Each pairs a color with a distinct **shape/icon**, never color alone, and each has a fixed name that never gets reused elsewhere in the palette.

| Severity | Hex | Icon shape | Usage |
|---|---|---|---|
| **CRITICAL** | `#B3261E` (saturated red) | Filled triangle, pulsing-outline treatment *(functional pulse only, per §10)* | Life-threatening Case; drives minimal-chrome emergency UI mode |
| **URGENT** | `#D9631E` (red-orange) | Filled diamond | Time-sensitive but not immediately life-threatening |
| **MODERATE** | `#D98C0E` (amber) — *reuses Warning ramp intentionally, since both signal "needs attention"* | Filled circle | Standard priority, provider queue default |
| **ROUTINE** | `#3E7C8A` (muted teal) | Filled square | Scheduled/non-urgent |

`[DS-DECISION]` CRITICAL is the only severity permitted a pulsing treatment, and only as a functional heartbeat tied to live polling (spec §14, C-06 loading state) — never decorative, never applied to URGENT/MODERATE/ROUTINE.

## 2.8 Dark Mode

`[DS-DECISION]` Dark mode is in scope for Provider Platform night-shift use (ambulance dispatch, ER admissions run 24/7) and out of scope for Phase 1 Citizen App and Admin Console. Dark tokens invert the neutral ramp and desaturate severity reds by ~8% to prevent halation on OLED at night; exact dark-mode token table to be produced alongside Provider Platform Figma file, not blocking this document.

## 2.9 Contrast Requirements

All text-on-background and icon-on-background pairings above are pre-validated to WCAG AA (4.5:1 body text, 3:1 large text/icons) — see §12.

---

# 3. Typography Scale

## 3.1 Typeface Selection

`[DS-DECISION]` Per spec §13.1, the family must hold equivalent legibility across all GT-05 required languages including Devanagari, Bengali, Tamil, and other non-Latin scripts. Recommendation:

- **Primary (UI + body):** **Noto Sans** (Google), used via the script-matched subset (Noto Sans Devanagari, Noto Sans Bengali, Noto Sans Tamil, etc.) — the only major open-source family with full, metrically-consistent coverage across all ten required Indian languages plus Latin, at no licensing cost, and with a mature variable-font release for weight flexibility.
- **Numerals (countdown timers, ETAs, bed counts):** Noto Sans tabular figures — fixed-width digits are mandatory anywhere a number updates live (HoldCountdown, driver offer timer, bed count steppers), so digit-width changes never cause layout jitter.
- **Do not** introduce a second display typeface for headings — one family, weight and size do the differentiating work. This keeps the non-Latin script fallback simple (a second Latin-only display face would silently break for 9 of 10 required languages).

Before lock: validate Noto Sans Devanagari/Bengali/Tamil x-height and line-height against the Latin cut at the same nominal size, since non-Latin scripts often need +10–15% line-height to avoid clipping — confirm with native-language reviewers, not assumption.

## 3.2 Scale

A 4-step-per-octave modular scale, base 16px, tuned for one-handed mobile legibility at the small end and dense provider tables at the small-caption end.

| Token | Size / Line-height | Weight | Usage |
|---|---|---|---|
| `type.display` | 32px / 40px | Bold (700) | Emergency screen countdown, Case severity headline |
| `type.h1` | 28px / 36px | Bold (700) | Screen titles (Case Dashboard header) |
| `type.h2` | 22px / 30px | Semibold (600) | Section headers, card titles |
| `type.h3` | 18px / 26px | Semibold (600) | Subsection headers, list group headers |
| `type.body-lg` | 17px / 26px | Regular (400) | Primary reading text, citizen-facing body |
| `type.body` | 15px / 22px | Regular (400) | Default UI text, provider/admin body |
| `type.body-sm` | 13px / 20px | Regular (400) | Secondary/meta text, table body (dense mode) |
| `type.caption` | 12px / 16px | Medium (500) | Timestamps, StalenessFlag text, helper text |
| `type.label` | 13px / 16px | Semibold (600), uppercase, +0.02em tracking | StatusBadge/SeverityIndicator labels, form labels |
| `type.numeral-lg` | 40px / 44px, tabular | Bold (700) | HoldCountdown, driver-offer 20s timer |
| `type.numeral` | 20px / 24px, tabular | Semibold (600) | Bed counts, ETA minutes |

`type.body-lg` (not `type.body`) is the **floor** for any Citizen Mobile emergency-path screen (C-04 through C-11) — never step down to `type.body` there, per Principle 4.

## 3.3 Language-Length Tolerance

`[DS-DECISION]` UI copy containers (buttons, StatusBadge, nav labels) must be built to accommodate **+35% character length** over English source strings — several GT-05 languages (Tamil, Malayalam, Bengali) run measurably longer than English for equivalent meaning. No fixed-width button/badge may be authored assuming English string length.

---

# 4. Spacing System

An 4px base unit, consistent across all three products so components are drop-in compatible.

| Token | Value | Typical use |
|---|---|---|
| `space.2xs` | 4px | Icon-to-label gap, chip internal padding |
| `space.xs` | 8px | Compact stack spacing, dense table cell padding |
| `space.sm` | 12px | Default internal component padding |
| `space.md` | 16px | Card padding, default section gap |
| `space.lg` | 24px | Between-card gutter, section separation |
| `space.xl` | 32px | Screen-level top/side margin (mobile) |
| `space.2xl` | 48px | Screen-level margin (desktop), major section breaks |
| `space.3xl` | 64px | Admin/Provider dashboard grid gutters |

## 4.1 Touch Target — Hard Constraint

Per spec §9/GT-09: **44×44pt minimum**, non-negotiable, at every screen density, on every citizen and provider screen. This is enforced as a token, not a guideline:

| Token | Value | Rule |
|---|---|---|
| `touch.min` | 44×44pt | Absolute floor for any tappable element, all products |
| `touch.comfortable` | 56×56pt | Default for primary actions (Emergency button, Accept/Decline offer) |
| `touch.emergency` | 72×72pt | Emergency ActionButton, Driver Accept/Decline (§14 C-31 — "large, one-handed-usable") |

Admin Console dense tables may use `touch.min` for row-level icon actions but never below it, even in "compact density" mode.

---

# 5. Grid System

| Product | Columns | Gutter | Margin | Notes |
|---|---|---|---|---|
| Citizen Mobile | 4-column | 16px | 16px (mobile) | Single-column stacking below 375px; never horizontal scroll on primary content |
| Provider Platform — Desktop (≥1024px) | 12-column | 24px | 32px | Sidebar (240px fixed) + 12-col content region |
| Provider Platform — Tablet (768–1023px) | 8-column | 20px | 24px | Sidebar collapses to drawer (per spec §9) |
| Admin Console — Desktop (≥1280px) | 12-column | 24px | 32px | Dense tables may break grid and scroll horizontally within a contained region (spec §9 exception) |

`ProviderDataUpdateForm` (P-03) is exempt from the standard grid's multi-column layout below 1024px — it locks to single-column, full-width fields down to 375px per spec §9's explicit "no horizontal scroll ... at all breakpoints" requirement.

---

# 6. Elevation

A restrained 4-level elevation scale — most of the system stays flat (Stripe-like), elevation reserved for true overlays so it retains meaning.

| Token | Shadow | Usage |
|---|---|---|
| `elevation.0` | none, 1px `neutral.150` border only | Default cards, table rows |
| `elevation.1` | `0 1px 2px rgba(26,29,31,0.06), 0 1px 1px rgba(26,29,31,0.04)` | Hover state on cards, dropdown triggers |
| `elevation.2` | `0 4px 12px rgba(26,29,31,0.08)` | Toasts, popovers, open dropdowns |
| `elevation.3` | `0 12px 32px rgba(26,29,31,0.14)` | Modals |
| `elevation.4` | `0 24px 48px rgba(26,29,31,0.18)` | Bottom sheets (mobile), command palettes |

CRITICAL-severity screens use **no elevation changes on state transition** — flat, functional, no shadow-based "pop" animation, consistent with Principle 1.

---

# 7. Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius.xs` | 4px | Chips, StatusBadge, StalenessFlag |
| `radius.sm` | 8px | Inputs, buttons, small cards |
| `radius.md` | 12px | Cards (ResourceCard, Case Cards, Hospital/Doctor/Ambulance Cards) |
| `radius.lg` | 20px | Modals, bottom sheets (top corners only) |
| `radius.full` | 999px | Pills, avatar, Emergency ActionButton |

Rounded-but-restrained geometry throughout (8–12px default) is a deliberate warmth signal (Principle 6) — never fully square (institutional) and never overly rounded/bubbly (unserious for a life-safety product).

---

# 8. Shadows

Shadow *values* are defined in §6 (Elevation); this section governs shadow *behavior rules*:

- Shadows are used exclusively to communicate **z-axis layering** (this thing is above that thing), never as decoration on flat, same-plane elements.
- No shadow on any element inside an active CRITICAL Case screen beyond `elevation.1`, to preserve the "minimal chrome" emergency mode (spec §10).
- Colored shadows are not used anywhere in the system — all shadows derive from `neutral.900` at low opacity, regardless of the element's own color, to avoid muddying severity/status color perception.

---

# 9. Icon Library

## 9.1 Principles
- Single style: **outlined, 2px stroke, rounded joins** — matches the rounded-but-restrained radius language (§7).
- 24×24px default grid, optically aligned (not just mathematically centered) at 16/20/24/32px export sizes.
- Every icon that pairs with a semantic color (§2.7, StatusBadge states) must remain identifiable in pure grayscale — shape carries the meaning, color reinforces it. This is tested, not assumed (§12).

## 9.2 Required Resource-Type Icon Set

Per spec §13.1: **one distinct icon per Resource Type, reused identically across all three products.**

| Resource | Icon concept |
|---|---|
| Ambulance | Vehicle-front-silhouette with cross mark |
| Bed | Side-profile hospital bed with headboard rail |
| Doctor | Stethoscope-in-circle |
| Blood | Single droplet, filled |
| Pharmacy | Mortar-and-pestle outline |
| Diagnostic | Test-tube-and-flask pair |
| Insurance | Shield-with-checkmark |
| Cancer Hospital/Modality | Radiating-target (oncology convention, non-alarming treatment) |

## 9.3 Severity/Status Icon Set

Shape-coded per §2.7 (triangle/diamond/circle/square for CRITICAL/URGENT/MODERATE/ROUTINE) and a parallel set for generic status: check-circle (success), clock (pending), alert-circle (error), clock-with-slash (stale).

## 9.4 Functional Icon Set
Navigation (home, cases, search, profile — matches spec §3's 4-tab bottom bar), escalation (headset/person-raising-hand for EscalationCTA), map/location pin, timer, camera/upload (document verification), language/globe (LanguageSelector).

---

# 10. Illustrations

`[DS-DECISION]` Illustration is used narrowly and never on any CRITICAL-severity or active-emergency screen (would undercut Principle 1's "calm urgency" — decoration has no place while a Case clock is running).

**Where illustrations are appropriate:**
- Empty states (spec pattern repeated across C-04, P-02, A-04, A-09 etc.) — simple, single-color-tinted (`primary.300` on `primary.50`) line illustrations, never full-color/cartoon, to stay in register with a clinical product.
- Onboarding/splash (C-01) — one restrained illustration, not a multi-screen carousel.
- Success/confirmation states (Arrival Confirmation C-08, Booking confirmed) — a small, quiet checkmark-illustration moment, not a full-screen celebration (this is a healthcare confirmation, not a consumer app win-state).

**Style:** single-weight line illustration, 2px stroke matching the icon system, restricted to a two-tone palette (`primary.300` + `neutral.150`) so illustrations never accidentally borrow a semantic color (e.g., never illustrate an empty state in Danger red).

**Never:** photographic imagery of real patients/medical scenes (privacy + tone risk), stock-photo people, or any illustration on a screen governed by "minimal chrome, no secondary CTAs visible" (spec §10).

---

# 11. Component Library

Structured to match spec §8's Atom → Molecule → Organism → Template hierarchy exactly, so the design file and the spec never drift. Each entry states the screens it serves.

## 11.1 Atoms

**Buttons (`ActionButton`)**
- Variants: Primary, Secondary, Tertiary/Text, Destructive, **Escalation** (its own visual identity — see EscalationCTA below), **Emergency** (unique: `touch.emergency` size, `color.severity.critical` fill, `radius.full`, used only for the single Home-screen Emergency action).
- States: Default, Hover, Pressed, Disabled, Loading (inline spinner, label retained — never a label-only-disappears loading state, per §14's "never blank/loading with no context").
- Sizes: Large (48px, mobile default), Medium (40px, desktop default), Small (32px, dense provider/admin tables).

**Inputs**
- Text, Number (with large steppers per spec P-03 requirement — "not just a bare text field"), OTP (6-segment, auto-advance), Date/Time, File Upload (credential documents, A-04).
- Validation state shown **inline, field-level, immediate** — never only on submit (spec Appendix C1, cited at P-03).
- Numeric steppers use `type.numeral` tabular figures so counts don't jitter as digits change.

**Dropdowns**
- Single-select, multi-select (filter chips), searchable-combobox variant (provider/hospital selection in large lists).
- Max visible 8 items before internal scroll; `elevation.2`.

**Search**
- `GlobalSearchBar` — used identically for Bed/Doctor/Pharmacy/Blood/Diagnostics/Cancer Hospital search (serves C-12, C-15, C-18, C-20, C-22, C-25, C-27 via the shared SearchTemplate).
- Persistent filter-chip row beneath the search field; active filter count badge.

**Tables**
- `DataTable` (Admin/Provider only — never used on Citizen Mobile) — dense (`body-sm`, 40px row height) and comfortable (`body`, 56px row height) density modes.
- Sticky header, sortable columns, horizontal-scroll-within-container behavior below breakpoint (spec §9 exception for Audit Logs/Reports).

**StatusBadge** *(spec §8 Atom — config-driven by status enum)*
- Pill shape (`radius.xs`), icon + label, one component instanced across every module's Status Definitions.
- Palette: Success/Warning/Danger/Neutral per §2.3–2.6 — never a custom one-off color per module.

**SeverityIndicator** *(spec §8 Atom)*
- Shape+color+label per §2.7. Always renders all three channels (shape, color, text) — no icon-only or color-only variant permitted, enforced at the component-prop level (`label` is a required prop, not optional).

**StalenessFlag** *(BR-03 pattern)*
- Small caption-text chip: "Last verified {X}m ago," `color.warning.500` icon (clock), text in `color.neutral.700` — deliberately *not* full warning-red, since staleness is informational, not an error.

**LanguageSelector** *(GT-05)*
- Flag-free (avoids conflating language with nation/region — deliberate for a pan-India, multi-script product) — text-label-in-native-script selector, e.g. "தமிழ்" not a flag icon.

## 11.2 Molecules

**ResourceCard** *(generic, configures to Ambulance/Bed/Doctor/Blood/Pharmacy/Slot)*
- Base layout: icon (§9.2 resource icon) + title + StatusBadge + key metadata row + StalenessFlag (if applicable) + primary action.
- This single component becomes **Hospital Card, Doctor Card, Ambulance Card** purely through configuration/content — never forked into separate components, per spec Appendix C2's "build once, configure many":
  - *Hospital Card:* adds occupancy-% mini-indicator, distance.
  - *Doctor Card:* adds specialty tag, next-available-slot chip.
  - *Ambulance Card:* adds ETA + driver name/photo, ties to `HoldCountdown` only if a hold/offer is active.

**Case Card**
- ResourceCard configuration specific to an active Case on the Home screen (C-04): SeverityIndicator (not StatusBadge, since Case-level state uses severity as primary signal) + Golden Hour elapsed-time + "tap for Case Dashboard."

**HoldCountdown**
- `type.numeral-lg` tabular countdown, color escalates neutral → warning → danger as expiry approaches (thresholds configurable per Business Rule, e.g. BR-02), reused identically across every ResourceHold type (bed, ambulance offer, pharmacy stock hold).

**Timeline / TimelineEntry**
- Vertical connector line + node (severity/status-colored) + timestamp (`type.caption`) + human-readable event text (`type.body`) + optional expand-for-detail.
- Read-only rendering only — no edit affordance exists in this component's API, enforcing spec C-10's "append-only, never edited" at the component level, not just by convention.

**Status Chips / Severity Chips**
- Compact (`type.label`, `radius.xs`) inline variants of StatusBadge/SeverityIndicator for use inside dense table rows and filter bars, where full StatusBadge padding is too large.

**Maps**
- `LiveTrackingMap` (C-07): pin + route line + ETA card overlay; degrades to `ETATextFallback` molecule (no map tiles) under low network, per GT-04 — this fallback is a first-class molecule, not an error state bolted on.
- `FleetMap` (P-14, Ambulance Operator): multi-pin roster view, provider-facing, denser marker clustering.

**Empty States**
- Icon/illustration (§10) + `type.h3` headline + `type.body` supporting text + optional primary action.
- Two registers: *Neutral* (e.g., "No pending applications") and *Prompting* (e.g., onboarding-completion checklist per P-02's empty-state spec) — the prompting register includes a checklist molecule, not just text.

**Loading States**
- `SkeletonBlock` (progressive, per-widget — P-02's dashboard requirement), `HeartbeatPulse` (the C-06 Matching-screen loading state — functional pulse tied to real polling, never decorative per §10), `InlineSpinner` (button-embedded).

**Error States**
- `InlineFieldError` (immediate, field-level), `DegradedCard` (a ResourceCard rendered with StalenessFlag + muted opacity when its data fetch fails, per C-09's "single linked-service failure doesn't block the dashboard"), `FullBlockError` (rare — reserved for true full-screen failures, e.g. no network at all).

**Toasts**
- Bottom-anchored (mobile) / top-right (desktop), `elevation.2`, auto-dismiss 4s (success/info) or persistent-until-dismissed (error), never used for anything requiring an action beyond acknowledgment.

**Modals**
- `elevation.3`, `radius.lg`, max-width 480px (mobile: full-width sheet instead — see Bottom Sheets), scrim `neutral.900` at 48% opacity.
- Reserved for confirmations and short forms; never used for the primary Case flow (which stays in-flow, per Principle 5).

**Bottom Sheets**
- Mobile-only, `elevation.4`, `radius.lg` (top corners), drag-handle affordance. Used for: filter panels, hold confirmation (C-13), driver offer detail — anywhere a modal would be used on desktop.

**Navigation Components**
- `BottomTabBar` (Citizen, 4 items + persistent floating Emergency action, per spec §3).
- `SidebarNav` (Provider desktop / Admin) with capability-cluster grouping (Admin: Onboarding/Support/Operations/Governance per spec §3).
- `TopDrawerNav` (Provider tablet collapse target, <1024px).
- `EscalationCTA` — its own top-level nav-adjacent component, not folded into any menu: fixed position, never nested more than one tap/click deep on any screen (GT-08, enforced identically across all three products per spec §15).

## 11.3 Organisms

**CaseDashboardHeader** — SeverityIndicator + Golden Hour clock (`type.numeral`, live-updating) + linked-services summary row. First screen-reader-announced element on C-09 (§12).

**NextActionBanner** — the deliberately "loudest" element on the Case Dashboard: full-width, `elevation.1`, `color.primary.100` background (not a severity color — this is guidance, not alarm), large `ActionButton` inline.

**SearchResultList** — configures `SearchTemplate`'s result region; list of `ResourceCard` instances, staleness-flag-mandatory per result (spec §13.1), infinite-scroll pagination matching `TimelineEntry`'s pattern.

**ProviderDataUpdateForm** — the P-03 organism: category × count grid using the Number input's large-stepper variant, last-updated timestamp (`StalenessFlag`-style), single `ActionButton` submit, optimistic-UI confirmation state (spec's "10-second update" requirement, §14).

**ClinicalAcknowledgmentPanel** — Hospital Portal only, ICU/Vent two-step ack (BR-04): visually distinct "hard gate" treatment (danger-adjacent but not Danger-red — uses `color.warning.700` border + explicit two-checkbox-style confirmation) versus General bed's single-step auto-confirm, so staff can never mistake one for the other.

**OnboardingStageTracker** — horizontal stepper (Application → Credential Verification → Integration Test → Go-Live Approval), each stage a StatusBadge-driven node; external-registry-check stages show named-registry loading text (spec A-04: "checking NABH" not a generic spinner) as a required prop, not a default spinner fallback.

## 11.4 Templates

**CaseDashboardTemplate** (C-09) — CaseDashboardHeader + NextActionBanner + linked-service ResourceCard list + EscalationCTA, progressive per-card loading.

**SearchTemplate** — GlobalSearchBar + filter chips + SearchResultList; reused by Beds/Doctors/Pharmacy/Blood/Diagnostics/Cancer Hospitals per spec §14.2 with only filter/sort configuration varying.

**ProviderPortalShellTemplate** — SidebarNav (12-capability) + content region + ProviderDataUpdateForm as the ≤2-tap-reachable default action across all 7 portal instances.

**AdminConsoleShellTemplate** — SidebarNav (capability-cluster grouped) + dense DataTable-first content region.

---

# 12. Accessibility Rules

Binding, not aspirational — per spec GT-09, these are Definition-of-Done items on every citizen and provider screen.

1. **Contrast:** All text meets WCAG AA (4.5:1 normal text, 3:1 for `type.h1`/`type.display`/icons). Severity and status colors are pre-validated against both `neutral.0` and `neutral.100` backgrounds (§2.9).
2. **Never color-only:** Every SeverityIndicator and StatusBadge instance renders shape + text label in addition to color, with no variant permitted to omit the label (§11.1).
3. **Touch targets:** 44×44pt floor, enforced at the token level (§4.1) — no exceptions, no "compact mode" override on citizen or provider screens.
4. **Screen reader order:** Matches visual priority, not DOM convenience — e.g., NextActionBanner is announced immediately after CaseDashboardHeader (spec C-09), ETA changes are announced only on significant change, not every poll tick (spec C-07, "avoid announcement flooding").
5. **Voice input:** Available on Triage Intake (C-05) and status-check moments per spec §1.26 — the design system treats a voice-input affordance as a required slot in those specific input components, not a generic nice-to-have.
6. **Motion sensitivity:** All functional motion (HeartbeatPulse, HoldCountdown urgency-color transitions) respects `prefers-reduced-motion` by switching to a static/text-equivalent state — the underlying information (still counting down, still searching) must remain available without animation.
7. **Language equivalence:** No citizen- or provider-facing component ships without translation keys for all GT-05 required languages; components are never hard-coded to Latin-script string lengths (§3.3).
8. **Focus visibility (Provider/Admin desktop):** All interactive elements have a visible 2px `primary.500` focus ring, meeting 3:1 contrast against adjacent surfaces, for full keyboard-only operability of dense back-office workflows.
9. **Error identification:** Every `InlineFieldError` pairs an icon, a color, and specific corrective text ("Enter a number 0 or greater," never just "Invalid") — sufficient for a screen-reader user to correct the error without sighted help.

---

# 13. Mobile Guidelines (Citizen App)

- **One primary action per screen** during any active Case flow (C-04–C-11) — no competing CTAs, no upsell, no secondary navigation surfacing while a Case is CRITICAL-severity (spec §10, Principle 1).
- **Bottom-anchored primary actions** — thumb-reachable zone, especially for Accept/Decline (driver) and Confirm/Cancel (citizen) pairs.
- **Budget-device performance floor:** design and test against low-end Android screen sizes/densities (spec §9) — no component assumes a flagship-class device; skeleton/loading states must render acceptably on 2–3G-class network conditions, aligned with the GT-04 low-network degraded-map fallback.
- **One-handed operation** is the default assumption for the entire emergency path, not just the Driver flow — large touch targets (§4.1 `touch.emergency`), bottom-sheet interactions over modals, minimal typing (voice/tap over free text) wherever a Business Rule allows it.
- **Never a blank loading screen:** every async wait shows progress context (spec-wide GT-11/§14 pattern) — HeartbeatPulse, skeletons, or explicit "last known" states, never an empty screen with a spinner alone.
- **WhatsApp/IVR visual parity:** where the design system's components have a WhatsApp-message equivalent (Tier 1 updates, spec §10), message templates should echo the same StatusBadge language and Severity naming used in-app, so a citizen moving between channels never encounters different terminology for the same state.

---

# 14. Desktop Guidelines (Provider Platform + Admin Console)

- **Density is earned, not default:** Provider Platform uses "comfortable" table density (56px rows) for Dashboard/Booking Queue views (frequent scanning) and "dense" (40px rows) for Reports/Audit Logs (bulk review) — Admin Console defaults to dense throughout, since it's explicitly the platform's power-user tool (spec §12).
- **≤2-click reachability** for `ProviderDataUpdateForm` from any point in the Provider Platform shell (spec §11) — this is a navigation-architecture constraint, not just a design nicety; SidebarNav must always expose it, never bury it in a submenu.
- **Sidebar collapse behavior:** 1024px is the hard breakpoint (spec §9) — SidebarNav collapses to TopDrawerNav below it; below that, `ProviderDataUpdateForm` alone must remain single-column and fully usable down to 375px even though the rest of the portal is "functional but not optimized" at that width.
- **Dense tables never reflow** below their container's minimum comfortable width — they scroll horizontally within a contained region (Admin Console Audit Logs/Reports, spec §9 exception) so column alignment/meaning is never scrambled by wrapping.
- **MFA and org-scoped auth** (P-01, A-01) use standard, unbranded system-level patterns — this is explicitly not a place for the design system's warmth register (Principle 6); authentication screens stay minimal and utilitarian.
- **English-only is acceptable** for Admin Console per spec §14.2's explicit `[UX-DECISION]` — the design system does not need to validate Admin Console typography against non-Latin scripts, unlike every citizen/provider surface.

---

# 15. Visual Style Recommendation — Summary

**Register:** Apple Health's calm clinical clarity + Stripe Dashboard's quiet information density, adapted for a life-safety context that Health and Stripe don't carry.

**What this system borrows from each:**
- *From Apple Health:* generous whitespace on the emergency/citizen path, restrained color usage where every color means something, rounded-but-precise card geometry, typography that never shouts.
- *From Stripe Dashboard:* flat elevation by default (shadows reserved for true overlays), dense-but-scannable tabular data on Provider/Admin, a disciplined 12-column grid, confident use of a single primary brand color rather than a busy palette.
- *What neither needs, that this system adds:* the CRITICAL/URGENT/MODERATE/ROUTINE severity language with mandatory shape+color+text redundancy, a Golden-Hour-aware motion policy (functional pulse only, never decorative, during emergencies), and a ten-script typography validation discipline neither Apple Health nor Stripe has to solve for.

**One-line design brief for anyone joining this project:** *build something a frightened stranger could operate correctly in 10 seconds, and a hospital admissions clerk could operate accurately 200 times a shift — without those being two different products.*

---

# 16. Traceability Appendix

Quick cross-reference confirming every design-system element maps back to a spec anchor (no invented functionality):

| Design System Section | Spec Anchor(s) |
|---|---|
| Severity Colors (§2.7) | §A2, §13.1 |
| Touch target tokens (§4.1) | §9, GT-09, §1.26 |
| StatusBadge/StalenessFlag (§11.1) | §8 Atoms, BR-03 |
| ResourceCard family → Hospital/Doctor/Ambulance Cards (§11.2) | §8 Molecules, Appendix C2 |
| HoldCountdown (§11.2) | BR-02, §8 Molecules |
| Timeline read-only enforcement (§11.2) | §A3.2, C-10 |
| ClinicalAcknowledgmentPanel (§11.3) | BR-04, FR-HOSP-002, P-05 |
| OnboardingStageTracker named-registry loading (§11.3) | A-04 |
| Mobile one-primary-action rule (§13) | §10 |
| ≤2-click ProviderDataUpdateForm reachability (§14) | §11, P-03 |
| Admin English-only exception (§14) | §14.2 `[UX-DECISION]`, GT-05 |

No section of this document introduces a screen, component, or business rule absent from the source spec; every `[DS-DECISION]` above is a *visual* judgment call (typeface, illustration style, dark-mode scoping) analogous to the spec's own `[UX-DECISION]` convention, made explicit for traceability rather than left implicit.
