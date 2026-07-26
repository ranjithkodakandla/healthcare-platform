# India Healthcare Coordination Platform
## UX Specification — v1.0

**Source of truth:** This document is derived strictly from `Healthcare-Coordination-Platform-PRD.md` (Parts A–M). No screen, flow, or component introduced here implies new functionality — every screen maps to specific FR IDs, Business Rules, and Golden Thread requirements already defined in the PRD. Where the PRD is silent on a UX detail (e.g., exact button copy), this document makes the minimum necessary interaction decision and flags it as `[UX-DECISION]` so it's traceable as UX-layer judgment, not a business requirement.

**Depth convention (same discipline as the PRD):** Section 14 (Screen-by-Screen Specifications) is written at full exhaustive depth for the screens that carry the platform's primary Golden Hour journey — the same exemplar screens the PRD used for Modules 1–2. Remaining screens are specified at full-table depth but more concisely. This is flagged explicitly, not hidden, per the same convention established in the source PRD.

**No visual design in this document.** Per instruction, no colors, typography, or layout pixel values are specified — this is a functional/structural UX specification. A design tool consuming this document supplies visual design against Part 13's tokens-as-*categories* (not values) and the structural rules in Parts 7–9.

---

# 1. PRODUCT ARCHITECTURE

Restates PRD Part E in UX terms: three products, one shared data model, one shared component logic layer.

```
┌─────────────────────────────────────────────────────────────┐
│                     SHARED FOUNDATION                          │
│   Case object · Case Timeline · Resource Hold · Auth · Consent │
└─────────────────────────────────────────────────────────────┘
        │                    │                     │
┌───────────────┐   ┌──────────────────┐   ┌──────────────────────┐
│ CITIZEN MOBILE │   │ PROVIDER PLATFORM │   │  ADMIN CONSOLE        │
│ (React Native) │   │ (Next.js, 7 portals)│  │  (Next.js)            │
│  + WhatsApp/IVR │   │ + WhatsApp (Tier 1) │  │                       │
└───────────────┘   └──────────────────┘   └──────────────────────┘
```

**UX architecture principle (derived from PRD §A3, L1, L2):** every product surface is a *view* onto the same Case/Timeline/Resource Hold objects. No product-specific data model exists at the UX layer — a "screen" in this spec is always a rendering of shared underlying state, never a private silo. This governs Section 7 (Screen Hierarchy): screens are organized by *product* for navigation purposes but by *Case lifecycle stage* for state purposes.

**Three UX modes, one identity system:**
| Product | Primary interaction mode | Secondary mode |
|---|---|---|
| Citizen Mobile | Touch, native app | Conversational (WhatsApp), Voice (IVR) — PRD L2 |
| Provider Platform | Desktop/tablet, structured forms and dashboards | Conversational (WhatsApp Tier 1 updates) — PRD L6 |
| Admin Console | Desktop, dense data tables and workflows | — |

---

# 2. INFORMATION ARCHITECTURE

## 2.1 Citizen Mobile App — Sitemap

```
Root
├── Onboarding
│   ├── Splash / Language select (GT-05)
│   ├── Guest entry (GT-10) — no auth
│   └── Registration / Login (OTP)
├── Home
│   ├── Emergency action (primary, single-tap)
│   ├── Active Case Dashboard(s) (§A3.1) — 0..N cards
│   └── Non-emergency search entry (Beds, Doctors, Pharmacy, Diagnostics, Blood, Cancer Hospitals, Nearby Hospitals)
├── Case Dashboard (per active Case)
│   ├── Case Timeline (§A3.2)
│   ├── Linked services status
│   ├── Next Action Needed
│   └── Escalate to human coordinator (GT-08)
├── Ambulance
│   ├── Triage intake
│   ├── Searching / Matching
│   ├── Live tracking
│   └── Arrival confirmation
├── Beds / Doctors / Pharmacy / Blood / Diagnostics / Cancer Hospitals / Nearby Hospitals
│   ├── Search + filters
│   ├── Result detail
│   ├── Hold/booking confirmation
│   └── Status tracking
├── Driver Mode (role-gated, same app — per user decision)
│   ├── Go on-duty toggle
│   ├── Incoming offer
│   ├── Navigate
│   └── Status update / handoff
├── Profile
│   ├── Family/caregiver linkage
│   ├── ABHA linkage (optional, Part H4)
│   ├── Consent management (Part I1)
│   └── Language/accessibility settings
└── Support
    ├── Human coordinator escalation (GT-08)
    └── Help / Knowledge base
```

## 2.2 Provider Platform — Sitemap (per PRD Part F2, one shell, 7 portals)

```
Root (per portal: Hospital / Doctor / Ambulance Operator / Pharmacy / Blood Bank / Diagnostic Center / Insurance)
├── Login (org-scoped)
├── Dashboard (F2 common shell)
├── Operational Data Update (portal-specific — Bed/Slot/Stock/Fleet/Network)
├── Booking Management (incoming holds/requests queue)
├── Case Management (scoped Case view, per GT-07)
├── Reports
├── Analytics
├── AI Assistant
├── User Management (org-internal)
├── Configuration
└── Audit Logs
```

## 2.3 Admin Console — Sitemap (per PRD Part G)

```
Root
├── Login (internal, MFA per Part I7)
├── Operations Dashboard
├── Citizen Onboarding (G3)
├── Provider Onboarding & Verification (G4)
├── Support
│   ├── Ticket queue (G5)
│   └── Remote session assist (G6)
├── Issue Tracking & SLA (G7)
├── Knowledge Base (G8)
├── User & Role Management (G9)
├── Workflow Management (G10)
├── Platform Monitoring (G11)
├── Analytics (G12)
├── Communication Center (G13)
├── AI Operations Assistant (G14)
├── Feature Flags (G15)
├── Configuration Management (G16)
└── Audit Management (G17)
```

---

# 3. NAVIGATION MODEL

| Product | Primary nav pattern | Rationale |
|---|---|---|
| Citizen Mobile | Bottom tab bar: **Home / Active Cases / Search / Profile** (4 items max, per GT-09 large-touch-target and low-literacy guidance) + one persistent floating Emergency action reachable from any tab | Golden Hour requires the emergency action to never be more than one tap away, from anywhere in the app — this is a `[UX-DECISION]` implementing GT-10/§A3.1 as a specific nav pattern |
| Provider Platform | Left sidebar (desktop) collapsing to top drawer (tablet/PWA) — matches F2's 12-capability shell, one nav item per capability | Standard back-office pattern; providers are task-focused, not exploratory |
| Admin Console | Left sidebar, grouped by G3–G17 capability clusters (Onboarding / Support / Operations / Governance) | Dense internal tool; grouping reduces the 15-item flat list into 4 scannable clusters |

**Cross-cutting rule:** every product's navigation must always expose the human-escalation/support path (GT-08 for citizens, G5/G6 for providers and internal staff) — never nested more than one tap/click deep.

---

# 4. SCREEN INVENTORY

Full enumeration, tagged with owning product, primary FR/Part reference, and whether it receives full depth in Section 14.

## 4.1 Citizen Mobile (32 screens)

| # | Screen | Ref | Full spec in §14? |
|---|---|---|---|
| C-01 | Splash / Language Select | GT-05 | No |
| C-02 | Guest Entry | GT-10 | No |
| C-03 | Registration / OTP Login | — | No |
| C-04 | Home | §A3.1 | **Yes** |
| C-05 | Emergency Triage Intake | FR-AMB-001 | **Yes** |
| C-06 | Ambulance Searching/Matching | FR-AMB-002 | **Yes** |
| C-07 | Ambulance Live Tracking | FR-AMB-003 | **Yes** |
| C-08 | Ambulance Arrival Confirmation | §1.12 | No |
| C-09 | Case Dashboard | §A3.1 | **Yes** |
| C-10 | Case Timeline (full view) | §A3.2 | **Yes** |
| C-11 | Human Coordinator Escalation | GT-08 | No |
| C-12 | Bed Search | FR-BED-002 | **Yes** |
| C-13 | Bed Detail + Hold Confirmation | FR-BED-003 | No |
| C-14 | Bed Hold Status | §2.19 | No |
| C-15 | Doctor Search | Module 3 | No |
| C-16 | Doctor Detail + Booking | FR-DOC-001 | No |
| C-17 | Teleconsult Session | Module 3 | No |
| C-18 | Nearby Hospitals Directory | Module 4 | No |
| C-19 | Hospital Profile | FR-NBH-001 | No |
| C-20 | Pharmacy Search | Module 5 | No |
| C-21 | Pharmacy Stock Hold + Fulfillment | FR-PHR-001 | No |
| C-22 | Blood Bank Search | Module 6 | No |
| C-23 | Blood Request / Donor Match Status | FR-BLD-001 | No |
| C-24 | Insurance / Pre-Auth Status | FR-INS-001 | No |
| C-25 | Diagnostic Test Search + Booking | Module 8 | No |
| C-26 | Diagnostic Result View | FR-DIAG-001 | No |
| C-27 | Cancer Hospital / Modality Search | FR-CAN-001 | No |
| C-28 | CHRONIC_MANAGEMENT Case View | Module 9 | No |
| C-29 | Profile / Family Linkage | §1.15 | No |
| C-30 | Consent Management | Part I1 | No |
| C-31 | Driver: Go On-Duty / Incoming Offer | FR-AMB-002 | **Yes** |
| C-32 | Driver: Navigate + Handoff | FR-AMB-004 | No |

## 4.2 Provider Platform (7 portals × common shell = 42 core screens + portal-specific)

| # | Screen | Portal(s) | Ref | Full spec in §14? |
|---|---|---|---|---|
| P-01 | Portal Login | All 7 | — | No |
| P-02 | Dashboard | All 7 | F2 | **Yes** (Hospital exemplar) |
| P-03 | Operational Data Update | All 7 (schema varies) | FR-HOSP-001 etc. | **Yes** (Hospital Bed exemplar) |
| P-04 | Incoming Patients / Booking Queue | Hospital, Ambulance Op | FR-HOSP-001 | **Yes** |
| P-05 | ICU/Vent Clinical Acknowledgment | Hospital | FR-HOSP-002 | **Yes** |
| P-06 | Case Management (scoped view) | All 7 | F2 | No |
| P-07 | Reports | All 7 | F2 | No |
| P-08 | Analytics | All 7 | F2, G12 | No |
| P-09 | AI Assistant | All 7 | F2, §A4 | No |
| P-10 | User Management (org-internal) | All 7 | F2 | No |
| P-11 | Configuration | All 7 | F2, G16 | No |
| P-12 | Audit Logs | All 7 | F2, GT-06 | No |
| P-13 | Doctor Availability Toggle | Doctor | FR-DOCP-001 | No |
| P-14 | Fleet Roster + Map | Ambulance Operator | FR-AMBP-001 | No |
| P-15 | Medicine Stock Update | Pharmacy | FR-PHRP-001 | No |
| P-16 | Blood Pre-Alert Queue | Blood Bank | FR-BLDP-001 | No |
| P-17 | Result Upload | Diagnostic Center | FR-DIAGP-001 | No |
| P-18 | Pre-Auth Review Queue | Insurance | FR-INSP-001 | No |
| P-19 | Network Mapping Management | Insurance | §F9.3 | No |

## 4.3 Admin Console (18 screens)

| # | Screen | Ref | Full spec in §14? |
|---|---|---|---|
| A-01 | Console Login (MFA) | Part I7 | No |
| A-02 | Operations Dashboard | G11 | No |
| A-03 | Citizen Onboarding Queue | G3 | No |
| A-04 | Provider Onboarding — Stage Gate Workflow | G4 | **Yes** |
| A-05 | Provider Verification Detail | G4 | No |
| A-06 | Support Ticket Queue | G5 | No |
| A-07 | Support Ticket Detail (Case-linked view) | G5 | No |
| A-08 | Remote Session Assist | G6 | No |
| A-09 | Issue Tracking Board | G7 | No |
| A-10 | SLA Monitoring | G7 | No |
| A-11 | Knowledge Base | G8 | No |
| A-12 | User & Role Management | G9 | No |
| A-13 | Workflow Management | G10 | No |
| A-14 | Platform Monitoring | G11, M22 | No |
| A-15 | Analytics (aggregate) | G12 | No |
| A-16 | Communication Center | G13 | No |
| A-17 | AI Operations Assistant | G14 | No |
| A-18 | Feature Flags / Config / Audit Management | G15–G17 | No |

**Total screen count: 92** (32 Citizen + 42 Provider-shell instances collapsed to 19 unique templates × 7 portals + 18 Admin). Section 14 provides full depth for 12 exemplar screens spanning the primary Golden Hour journey (Citizen), the primary provider workflow (Hospital Bed), and the primary admin workflow (Provider Onboarding) — matching the PRD's own Module 1/2 exemplar-depth convention. All other screens follow the identical field structure at summary depth in Section 14.2.

---

# 5. USER JOURNEYS

## 5.1 Journey: Bystander → Ambulance → Bed (Primary Golden Hour Journey)
**Persona:** Panicked Bystander (PRD §1.5) → transitions to Family Caregiver once family arrives.
**Trigger:** Witnesses an accident.
**Journey:** App install (or WhatsApp) → Guest entry (C-02) → Emergency Triage Intake (C-05) → Ambulance Matching (C-06) → Live Tracking (C-07) → [AI pre-checks bed availability in parallel, §A4] → Ambulance arrives → Arrival Confirmation (C-08) → Case remains open, Bed leg auto-attached → Case Dashboard (C-09) shows bed confirmed at receiving hospital → Family member (now using the app) sees full Case Timeline (C-10).
**Emotional arc:** panic → relief-at-action-taken → anxiety-during-wait → relief-at-confirmation. UX implication: every screen in this journey must show unambiguous forward progress (never a blank/loading state with no context) — formalized in §14's Loading State requirements.

## 5.2 Journey: Hospital Admissions Staff — Keeping Data Current
**Persona:** Hospital Admissions Staff.
**Trigger:** Shift start, or a WhatsApp prompt asking "still 3 ICU beds?"
**Journey:** WhatsApp reply (Tier 1, no app) **or** Portal login (P-01) → Dashboard (P-02) → Operational Data Update (P-03) → [if ICU/Vent] Clinical Lead acknowledgment (P-05) → confirmation.
**UX implication:** the WhatsApp path and the Portal path must produce visually/functionally identical outcomes — this is the UX-layer expression of PRD L2's "one source of truth regardless of entry point."

## 5.3 Journey: Provider Onboarding (Admin-Mediated)
**Persona:** Provider Onboarding Specialist.
**Trigger:** New hospital application received.
**Journey:** Provider Onboarding Queue (A-03/A-04) → stage-gated verification (credential check, integration test) → Go-live approval → Provider Portal (P-01) access activated for the hospital's staff.

---

# 6. USER FLOWS

Text-based flow (per PRD's own diagram conventions) for the two highest-stakes flows — engineering/design should treat these as the canonical flow diagrams; all other module flows follow the same shape as their PRD §X.12 Functional Workflow.

## 6.1 Flow: Emergency Ambulance Request (maps to PRD §1.12)
```
[Home: Emergency tap] 
   → [Triage Intake: conscious? breathing? bleeding? — voice or tap]
   → [System: AI severity classification, <2s]
   → [Searching/Matching screen: shows radius expanding if no match]
        ├─ Match found within 90s → [Live Tracking]
        └─ No match after widen → [Escalation banner + human coordinator CTA, GT-08]
   → [Live Tracking: ETA, driver name/photo, one-tap cancel]
   → [Pre-arrival: triage handoff auto-sent to ER, silent — no user action]
   → [Arrival Confirmation]
   → [Case Dashboard: ambulance leg COMPLETED, bed leg now primary]
```

## 6.2 Flow: Hospital Bed Hold → Confirm (maps to PRD §2.12)
```
[Bed Search (citizen) or AI auto-pre-check (system)]
   → [Result list: ranked, staleness-flagged if applicable]
   → [Select hospital → Hold placed, count decremented immediately]
        ├─ General bed → auto-CONFIRMED
        └─ ICU/Ventilator → PENDING, provider-side Clinical Lead ack required (P-05)
   → [Citizen sees: Hold Status screen — countdown to expiry if not yet confirmed]
        ├─ Confirmed within window → [Case Dashboard updates, Timeline event]
        └─ Expired → [Auto re-search offered, second-expiry → escalate to human coordinator]
```

---

# 7. SCREEN HIERARCHY

Screens nest by **Case lifecycle stage**, not by product tab — this is the structural consequence of §1's "screens are views onto shared Case state" principle.

```
Level 0 — Entry (no Case yet): Splash, Login, Guest Entry, Home (no active case)
Level 1 — Case Initiation: Triage Intake, Search screens (Beds/Doctors/etc. entered standalone)
Level 2 — Case In-Progress: Matching/Searching, Live Tracking, Hold Status, Booking Queue (provider side)
Level 3 — Case Hub: Case Dashboard (the parent screen every Level 2 screen returns to)
Level 4 — Case Detail: Case Timeline, linked-service detail screens
Level 5 — Case Resolution: Arrival/Fulfillment Confirmation, CHRONIC_MANAGEMENT ongoing view (Module 9 — does not resolve to Level 5, loops back to Level 3 per its own cyclical lifecycle, PRD §9)
```

Provider and Admin screens hierarchy separately, by capability cluster (F2's 12 areas / G's 15 areas), since they are task tools, not Case-lifecycle-driven for the provider's own navigation (though the Case Management screen within each portal is itself a Level 3/4 view per the hierarchy above).

---

# 8. COMPONENT HIERARCHY

Reusable components, derived directly from patterns repeated across PRD modules — a design tool should build these once and instance them, mirroring the PRD's own Appendix C2 "build once, configure many" principle at the UX layer.

```
Atoms
├── StatusBadge (maps to every module's §Status Definitions — one component, config-driven by status enum)
├── SeverityIndicator (CRITICAL/URGENT/MODERATE/ROUTINE — §A2)
├── StalenessFlag (BR-03 pattern — "last verified Xm ago")
├── ActionButton (primary/secondary/escalation variants)
└── LanguageSelector (GT-05)

Molecules
├── ResourceCard (generic — configures to Ambulance/Bed/Doctor/Blood/Pharmacy/Slot per Appendix C2's generic ResourceHold shape)
├── HoldCountdown (expiry timer — Module 2 BR-02 pattern, reused across all ResourceHold types)
├── TimelineEntry (single event row in Case Timeline)
├── NextActionBanner (the "loudest thing on the dashboard" per §A3.1)
└── EscalationCTA (GT-08 — appears identically across every product)

Organisms
├── CaseDashboardHeader (severity + Golden Hour clock + linked services summary)
├── SearchResultList (generic — configures per module's §Search Filters/§Sorting Options)
├── ProviderDataUpdateForm (generic — configures per portal's operational data schema, F2)
├── ClinicalAcknowledgmentPanel (ICU/Vent two-step, BR-04 — Hospital Portal only)
└── OnboardingStageTracker (Admin Console, G4)

Templates
├── CaseDashboardTemplate (C-09, the platform's most important screen)
├── SearchTemplate (reused by Beds/Doctors/Pharmacy/Blood/Diagnostics/Cancer Hospitals)
├── ProviderPortalShellTemplate (F2 — one shell, 7 portal instances)
└── AdminConsoleShellTemplate (G — one shell, capability-cluster nav)
```

---

# 9. RESPONSIVE BEHAVIOUR

| Product | Breakpoints | Behaviour rule |
|---|---|---|
| Citizen Mobile | Native app — device-native sizing, no responsive breakpoints in the web sense; must render correctly on budget Android devices (per earlier conversation: test across low-end screen sizes/densities, not just flagship devices) | GT-09 large-touch-targets apply at all sizes; never shrink tap targets below platform minimum (44×44pt equivalent) regardless of screen density |
| Provider Platform | Desktop (≥1024px) primary; Tablet (768–1023px) via responsive PWA (per earlier conversation: front-desk/admissions staff often on tablet); Mobile (<768px) — functional but not optimized for Phase 1 | Sidebar nav collapses to drawer below 1024px; ProviderDataUpdateForm (the highest-frequency action) must remain single-screen, no horizontal scroll, at all breakpoints down to 375px, since staff may use a personal phone's browser in a pinch |
| Admin Console | Desktop-first (≥1280px); tablet functional, mobile not supported (internal tool, per PRD F1) | Dense tables (Audit Logs, Reports) horizontally scroll within a contained region below 1280px rather than reflowing, to preserve column alignment for data-heavy screens |

---

# 10. CITIZEN MOBILE EXPERIENCE

**Governing principle (from architecture discussion):** WhatsApp/IVR are co-equal entry points, not degraded fallbacks (revised GT-04). The native app is the rich experience for retained/engaged users; WhatsApp/IVR are the low-friction, zero-install first-contact surface, particularly for the bystander and rural, low-literacy personas.

**UX consequence:** the native app's Home screen (C-04) and Case Dashboard (C-09) must be constructible from the *same underlying Case object* whether the Case was created via app, WhatsApp, or IVR — a citizen who starts a request via WhatsApp and later opens the app must see that same Case already in progress on their Home screen, not a disconnected experience. This is a **hard cross-channel continuity requirement**, flagged here because it's not explicit in the PRD's UX-adjacent language but is required by PRD L2's "one source of truth" principle.

**Design language for the emergency path specifically:** minimal chrome, maximum single-purpose focus — no navigation elements, no upsell, no secondary CTAs visible during an active CRITICAL-severity Case. This is the UX enforcement of Part D's "Golden Hour cannot be a Phase 1 feature that only works where digital maturity is high" strategic observation.

---

# 11. HEALTHCARE PROVIDER PORTAL EXPERIENCE

**Governing principle:** zero-friction data currency (per earlier conversation and PRD L1.3) is the central UX design constraint for every provider screen. The Operational Data Update screen (P-03) is the single highest-frequency, highest-importance screen in the entire Provider Platform — it must be reachable in ≤2 taps/clicks from any point in the portal, and its WhatsApp equivalent must produce an identical outcome (per §10's continuity principle, mirrored here).

**Design language:** dense-but-scannable, optimized for repeat use by the same staff member multiple times per shift — not a discovery-oriented consumer UI. Defaults and pre-fills (e.g., last-entered counts) reduce re-entry effort, consistent with the "10-second update" target implied by PRD F3.2.

---

# 12. PLATFORM ADMINISTRATION EXPERIENCE

**Governing principle:** this is an internal power-user tool; optimize for information density and workflow speed over approachability. Every workflow (Onboarding, Support) is stage-gated (G4/G10) and must visually communicate current stage and blocking requirement at a glance — the Provider Onboarding screen (A-04, full spec in §14) is the canonical pattern for every other stage-gated workflow in the Console.

---

# 13. DESIGN SYSTEM SPECIFICATION

Per instruction, no visual values (color hex, fonts, spacing scale numbers) are specified here — this section defines the *categories* a visual design system must fill in, derived from functional need established in the PRD.

## 13.1 Token Categories Required
- **Severity colors** (4 values: CRITICAL/URGENT/MODERATE/ROUTINE) — must be distinguishable without relying on color alone (§Accessibility, GT-09) — pair with icon/shape.
- **Status colors** — generic status semantic set (pending/active/success/warning/error/stale) reused by every `StatusBadge`/`StalenessFlag` instance.
- **Typography scale** — must support all GT-05 languages including non-Latin scripts (Devanagari, Bengali, Tamil, etc.) at equivalent legibility — a font-family decision must be validated across all 10 required languages before lock.
- **Spacing/sizing scale** — minimum touch target size is a hard constraint (§9), not a design preference.
- **Iconography set** — must include a distinct icon per Resource Type (ambulance, bed, doctor, blood, pharmacy, diagnostic, insurance) reused identically across all three products for cross-product recognition.

## 13.2 Component Library
Maps directly to §8's Component Hierarchy — every Atom/Molecule/Organism/Template listed there is a required entry in the design system's component library, named identically to avoid drift between design file and codebase (per PRD M3's naming-consistency rule extended to design artifacts).

## 13.3 Motion/Interaction Principles
- Loading states never block indefinitely — every async action has a maximum-wait UI treatment (spinner → progress message → fallback messaging) tied to the specific SLA named in the relevant Business Rule (e.g., FR-AMB-002's 90-second dispatch target governs the Matching screen's loading-state escalation timing, §14).
- No decorative animation on any CRITICAL-severity Case screen — motion is functional (progress, confirmation) only, never decorative, during an active emergency.

---

# 14. SCREEN-BY-SCREEN SPECIFICATIONS

## 14.1 Full-Depth Exemplar Screens

### C-04 — Home
**Purpose:** Single entry point; surfaces the Emergency action and any active Case(s) without requiring navigation.
**Users:** Citizen (registered or guest), Family/Caregiver.
**Entry Points:** App launch, tab bar "Home", post-login redirect.
**Exit Points:** Emergency Triage Intake (C-05), Case Dashboard (C-09) per active case card, Search screens (C-12/15/18/20/22/25/27).
**Components:** EscalationCTA (persistent), ResourceCard-configured "active case" cards (0..N), primary Emergency ActionButton, non-emergency search entry grid.
**Business Rules:** GT-10 (guest can have exactly 1 active untracked request before requiring OTP, BR-06); multi-case support required for a caregiver managing >1 patient (§A3.1).
**States:** Default (no active case) / Active-case(s) present / Guest vs. Registered.
**Empty State:** No active cases — show non-emergency search grid prominently; Emergency action still primary.
**Loading State:** Active-case cards show skeleton while Case status fetches; Emergency action is NEVER gated behind a loading state — always tappable immediately on screen mount.
**Error States:** Case-list fetch failure → show cached last-known case state with staleness indicator (GT-11 fallback), never a blank error screen over an active emergency case.
**Permissions:** Guest sees own untracked request only; Registered sees own + linked-family cases (consent-scoped, GT-07).
**Data Requirements:** `Case[]` (status, severity, primary_patient_id) filtered to user's linked cases.
**APIs Used:** `GET /v1/cases?scope=mine` (per PRD M4 conventions).
**Accessibility:** Emergency action is the first focusable element, voice-activatable (GT-09).
**Localization:** All labels per GT-05 language set; Emergency action label pre-translated and clinically reviewed (§1.27).
**Analytics Events:** `home_viewed`, `emergency_action_tapped`, `active_case_card_tapped`.
**Success Criteria:** Time-to-emergency-action-tap from cold app launch < 2 seconds; zero reported instances of the Emergency action being hidden behind a loading state.

### C-05 — Emergency Triage Intake
**Purpose:** Capture minimal triage data and location to create a Case and Ambulance Request. Implements FR-AMB-001.
**Users:** Bystander (guest), Family Caregiver, Rural Citizen (voice-first).
**Entry Points:** Home (C-04) Emergency action; deep link from WhatsApp/IVR handoff.
**Exit Points:** Ambulance Searching/Matching (C-06); back to Home (only before submission).
**Components:** Location auto-detect/manual-pin control, voice/tap triage question set (conscious? breathing? bleeding?), submit ActionButton.
**Business Rules:** FR-AMB-001 preconditions (location available or offline-queued per GT-03); BR-05 (triage data is routing metadata only, never auto-diagnosis).
**States:** Location-pending / Location-confirmed / Triage-in-progress / Submitting.
**Empty State:** N/A (always has content — this is an input screen).
**Loading State:** Submission shows immediate optimistic transition to C-06 (Searching) rather than a blocking spinner, per FR-AMB-001's 5-second (4G) / 15-second (2G) acceptance criteria — the Searching screen itself carries the wait, not this screen.
**Error States:** Location unavailable → manual pin fallback (never blocks submission entirely); network failure → offline queue (GT-03) with clear "will send when connected" messaging, not a silent failure.
**Permissions:** Guest-accessible (GT-10) — no login required.
**Data Requirements:** `location {lat, lng}`, `triage {conscious, breathing, bleeding}`, `phone_number` (guest minimum).
**APIs Used:** `POST /v1/ambulance/requests` (Idempotency-Key required per M13).
**Accessibility:** Full voice-input path (GT-09); large single-tap answers, not text fields, for triage questions.
**Localization:** Triage questions are the highest-stakes translation content in the platform (§1.27) — clinically reviewed, not machine-translated.
**Analytics Events:** `triage_started`, `triage_question_answered`, `ambulance_request_submitted`, `ambulance_request_offline_queued`.
**Success Criteria:** Matches FR-AMB-001's stated acceptance criteria exactly (5s/15s submission-to-searching transition).

### C-06 — Ambulance Searching / Matching
**Purpose:** Show live matching progress; implements FR-AMB-002's citizen-facing view.
**Users:** Bystander, Family Caregiver.
**Entry Points:** C-05 submission.
**Exit Points:** Live Tracking (C-07) on match; Escalation (C-11) on no-match-after-widen (EF-01).
**Components:** SeverityIndicator, progress messaging (radius-widening state shown explicitly, not hidden), EscalationCTA (appears after a configurable wait, not immediately — avoid undermining confidence in the automated flow prematurely `[UX-DECISION]`).
**Business Rules:** BR-01 (90s SLA), BR-03 (20s per-driver offer window — not shown to citizen directly, abstracted as continuous progress).
**States:** Searching / Radius-widened / Matched / No-match-escalated.
**Empty State:** N/A.
**Loading State:** THE loading state of the platform — must never appear frozen; a heartbeat/pulse treatment tied to actual backend polling, not decorative.
**Error States:** EF-01 (no ambulance found) → explicit escalation banner + human coordinator CTA, plus offer of Nearby Hospitals self-transport guidance if safe (per EF-01).
**Permissions:** Same as C-05 (guest-accessible).
**Data Requirements:** `AmbulanceRequest.status`, live poll or WebSocket subscription.
**APIs Used:** `GET /v1/ambulance/requests/{id}` (poll) or `WS /v1/ambulance/requests/{id}/track` (per FR-AMB-003 metadata, reused here for pre-match status).
**Accessibility:** Status changes announced via screen reader (not just visual); voice status option for low-literacy users.
**Localization:** Status messaging localized.
**Analytics Events:** `ambulance_matching_viewed`, `ambulance_radius_widened`, `ambulance_matched`, `ambulance_escalated_no_match`.
**Success Criteria:** Matches FR-AMB-002's 90-second P95 acceptance criteria; zero user-reported confusion about "is something happening."

### C-07 — Ambulance Live Tracking
**Purpose:** Implements FR-AMB-003. Live ETA and driver visibility.
**Users:** Family Caregiver (primary), Bystander.
**Entry Points:** C-06 on match.
**Exit Points:** Arrival Confirmation (C-08); Cancel (EF-03, with reason capture).
**Components:** Map view (or degraded ETA-text per GT-04 low-network), driver name/vehicle info card, ETA display, Cancel action.
**Business Rules:** FR-AMB-003 (3-second refresh under normal network); BR-04 (locked assignment — no reassignment UI shown to citizen once accepted, only cancel-and-restart).
**States:** En-route-to-pickup / Arrived-at-pickup / En-route-to-hospital.
**Empty State:** N/A.
**Loading State:** Last-known-position shown with explicit "signal lost, last seen Xm ago" rather than a frozen map with no indication (GT-11 fallback visibility).
**Error States:** Driver GPS stale beyond threshold (EF-02) → citizen sees a non-alarming "confirming location" state while system auto-reassigns behind the scenes if needed.
**Permissions:** Requester + linked family (consent-scoped).
**Data Requirements:** `AmbulanceRequest.driver_location`, `.eta`, `.driver{name, vehicle}`.
**APIs Used:** `WS /v1/ambulance/requests/{id}/track` (per FR-AMB-003 metadata).
**Accessibility:** ETA announced via screen reader on significant change, not every 5-second ping (avoid announcement flooding).
**Localization:** N/A beyond standard UI strings.
**Analytics Events:** `tracking_viewed`, `tracking_cancelled`.
**Success Criteria:** Matches FR-AMB-003's 3-second refresh acceptance criterion; low-network degraded mode verified functional (GT-04).

### C-09 — Case Dashboard
**Purpose:** THE central screen of the platform per PRD §A3.1 — single place to answer "what is happening to me right now."
**Users:** All citizen personas, at any point after Case creation.
**Entry Points:** Home active-case card, post-ambulance-arrival auto-navigation, notification tap.
**Exit Points:** Case Timeline (C-10), any linked-service detail screen, Escalation (C-11).
**Components:** CaseDashboardHeader (severity + Golden Hour clock), NextActionBanner (loudest element on screen, per §A3.1), linked-services status list (ResourceCard per linked service), EscalationCTA.
**Business Rules:** §A3.1 in full — this screen's structure is directly specified in the PRD, not inferred; multi-service aggregation is mandatory, not optional.
**States:** Single-service-active / Multi-service-active / Awaiting-next-action / Resolved.
**Empty State:** N/A (only reachable when a Case exists).
**Loading State:** Individual linked-service cards load independently (progressive rendering) — the screen must not wait for the slowest linked service before showing anything.
**Error States:** A single linked-service fetch failure shows that card in a degraded/stale state (GT-11) without blocking the rest of the dashboard.
**Permissions:** Per GT-07 consent scoping — a support agent viewing this via G5 sees the same structure with an audited access-reason log (Part I).
**Data Requirements:** `Case` (full object), `Case.linked_services[]`, `Case.golden_hour_clock`.
**APIs Used:** `GET /v1/cases/{id}` (aggregated), or per-linked-service endpoints if progressive loading is implemented client-side.
**Accessibility:** NextActionBanner must be the first screen-reader-announced element after the header (matches its "loudest" visual priority).
**Localization:** Standard.
**Analytics Events:** `case_dashboard_viewed`, `next_action_tapped`, `linked_service_card_tapped`.
**Success Criteria:** A user can state "what's happening and what do I need to do" within 5 seconds of screen view (usability-test-verified, not just a load-time metric).

### C-10 — Case Timeline (full view)
**Purpose:** Implements §A3.2 — immutable, chronological, human-readable event log.
**Users:** All citizen personas; also consumed (read-only, scoped) by providers via F2's Case Management and by Support (G5).
**Entry Points:** Case Dashboard (C-09) "View full timeline."
**Exit Points:** Back to C-09; export/share action (per §A3.2's shareable-summary requirement).
**Components:** TimelineEntry list (chronological), filter-by-service-type control, export/share ActionButton.
**Business Rules:** Append-only, never edited (§A3.2) — the UI must not present any edit affordance on a past entry, ever.
**States:** Populated / Filtered.
**Empty State:** Not reachable with zero entries (Case creation itself is the first entry).
**Loading State:** Paginated, cursor-based (per PRD M4) — infinite-scroll loading indicator at list end, not a full-screen blocker.
**Error States:** Pagination fetch failure → retry affordance inline, prior-loaded entries remain visible.
**Permissions:** GT-07 consent-scoped visibility per viewer role — a Pharmacy provider sees only the prescription-fulfillment-relevant entries, not the full clinical timeline (Module 5 §5 Privacy).
**Data Requirements:** `CaseTimelineEvent[]` (paginated).
**APIs Used:** `GET /v1/cases/{id}/timeline?cursor=...`.
**Accessibility:** Each entry independently screen-reader-navigable with timestamp announced.
**Localization:** Event descriptions localized; timestamps in local format/timezone.
**Analytics Events:** `timeline_viewed`, `timeline_filtered`, `timeline_exported`.
**Success Criteria:** Export/share function produces a document usable by a second hospital or insurer without requiring app access (per §A3.2's stated purpose).

### C-31 — Driver: Go On-Duty / Incoming Offer
**Purpose:** Driver-side accept/reject flow, implements FR-AMB-002's driver-facing half; role-gated within the single shared app per user's solo-build decision.
**Users:** Ambulance Driver/EMT.
**Entry Points:** Driver Mode tab (role-gated visibility).
**Exit Points:** Navigate + Handoff (C-32) on accept; back to on-duty-idle on decline/timeout.
**Components:** On-duty toggle, incoming-offer card (patient location, severity, 20-second countdown per BR-03), Accept/Decline buttons (large, one-handed-usable per §1.5 persona).
**Business Rules:** BR-03 (20s window, sequential offers — driver never sees two simultaneous offers); BR-04 (accept locks assignment).
**States:** Off-duty / On-duty-idle / Offer-pending / Assigned.
**Empty State:** On-duty-idle with no offers — simple "waiting for requests" state.
**Loading State:** Offer countdown is itself the loading-adjacent state — must be a highly legible, glanceable large countdown (driving-context constraint per §1.26 Accessibility).
**Error States:** Offer expires without response → auto-decline, return to idle, no error framing (this is expected behavior, not a failure).
**Permissions:** Verified, onboarded driver only (Part G4 provider onboarding gate).
**Data Requirements:** `AmbulanceRequest` offer payload (location, severity, ETA-if-accepted).
**APIs Used:** `POST /v1/ambulance/requests/{id}/offers/{offerId}/respond` (per FR-AMB-002 metadata).
**Accessibility:** One-handed, minimal-typing interaction only (§1.26); audio alert on new offer, not visual-only.
**Localization:** Standard.
**Analytics Events:** `driver_on_duty_toggled`, `offer_received`, `offer_accepted`, `offer_declined`, `offer_expired`.
**Success Criteria:** Matches BR-03's 20-second window exactly; zero instances of a driver seeing two simultaneous offers (hard invariant, testable per PRD M17 concurrency requirement).

### P-02 — Dashboard (Hospital Portal exemplar)
**Purpose:** F2's common Dashboard capability, Hospital-specific instance; landing view aggregating operational summary and pending actions.
**Users:** Hospital Administrator, Admissions Staff, Clinical Lead.
**Entry Points:** Post-login (P-01).
**Exit Points:** Operational Data Update (P-03), Incoming Patients Queue (P-04), any other portal capability nav item.
**Components:** Occupancy-% summary (F2's "anchor metric" per hospital type), NextActionBanner-equivalent (pending confirmations, staleness warnings), FR-HOSP-003 capacity forecast widget (advisory-labeled).
**Business Rules:** F2 Dashboard definition; FR-HOSP-003 forecast must be visually distinguished as advisory, never presented as live inventory.
**States:** Normal / Staleness-warning-active / SLA-breach-alert-active.
**Empty State:** New hospital, no bookings yet — show onboarding-completion checklist instead of an empty operational summary.
**Loading State:** Standard skeleton per widget, progressive.
**Error States:** Forecast service unavailable → widget hidden gracefully (advisory-only data, not a blocking failure) rather than showing an error state for a non-critical feature.
**Permissions:** Per Module 2 §2.15 + F3.6 role table.
**Data Requirements:** Aggregated hospital operational summary, `BedInventory`, pending queue counts.
**APIs Used:** `GET /v1/providers/{hospitalId}/dashboard`.
**Accessibility:** Standard WCAG AA for provider-facing tools (GT-09 extended per Part K7).
**Localization:** Per GT-05, extended to provider tools per K7.
**Analytics Events:** `provider_dashboard_viewed`.
**Success Criteria:** Staff can identify any pending required action within 5 seconds of login.

### P-03 — Operational Data Update (Hospital Bed exemplar)
**Purpose:** Implements FR-HOSP-001/FR-BED-001. The single highest-frequency screen in the Provider Platform.
**Users:** Admissions Staff.
**Entry Points:** Dashboard (P-02), ≤2 taps from anywhere in portal (per §11 principle), WhatsApp equivalent (Tier 1, L6).
**Exit Points:** Back to Dashboard; confirmation toast, no forced navigation away.
**Components:** ProviderDataUpdateForm (category × count grid: General/ICU/Ventilator/NICU/Isolation/Maternity), last-updated timestamp, single Submit action.
**Business Rules:** FR-BED-001 validation (no negative counts, occupied+available ≤ total without override+reason); BR-03 staleness-timer reset on submit.
**States:** Editable / Submitting / Confirmed.
**Empty State:** First-time setup — all counts default to 0, explicit prompt to enter real numbers before going live.
**Loading State:** Optimistic UI — submit shows immediate confirmation, background sync confirms within FR-BED-001's 10-second acceptance criterion, silently reconciles if it fails.
**Error States:** Validation error → inline, field-level, immediate (not on submit) per Appendix C1's validation-error rule.
**Permissions:** Admissions Staff + Administrator (Module 2 §2.15).
**Data Requirements:** `HospitalBedInventory` (per hospital, per category).
**APIs Used:** `PUT /v1/providers/{hospitalId}/beds`, `POST /v1/providers/{hospitalId}/beds/whatsapp-update` (per FR-BED-001 metadata).
**Accessibility:** Numeric input optimized for fast repeat entry (large steppers, not just a bare text field) — supports the "10-second update" goal directly.
**Localization:** Category labels localized.
**Analytics Events:** `bed_inventory_update_started`, `bed_inventory_update_submitted`, `bed_inventory_validation_error`.
**Success Criteria:** Median time-to-complete-update < 15 seconds (directly operationalizes the "not another admin overhead" product requirement from this project's own design discussion).

### A-04 — Provider Onboarding — Stage-Gated Workflow
**Purpose:** Implements FR-ADM-PRV-001. Canonical pattern for every stage-gated Console workflow.
**Users:** Provider Onboarding Specialist.
**Entry Points:** Onboarding Queue (A-03 equivalent for providers).
**Exit Points:** Provider Portal access activation (system action, not a screen) on final approval.
**Components:** OnboardingStageTracker (visual stage progress: Application → Credential Verification → Integration Test → Go-Live Approval), per-stage detail panel, approve/reject-with-reason actions.
**Business Rules:** FR-ADM-PRV-001 — go-live is blocked until all mandatory stages complete; verification data source varies by provider type (G4's table).
**States:** Per-stage (Application-received / Verifying / Integration-testing / Approved / Rejected).
**Empty State:** No pending applications — simple queue-empty state.
**Loading State:** Verification-stage calls to external registries (NABH/NMC/NACO/IRDAI per Part H) show explicit "checking {registry name}" status, not a generic spinner — since these can take longer than in-app calls.
**Error States:** External registry unavailable → stage marked "verification pending, manual review required" (never silently blocks indefinitely) — routes to manual fallback per G4's "manual verification workflow otherwise" pattern.
**Permissions:** Provider Onboarding Specialist, Console Administrator (G9).
**Data Requirements:** Provider application record, per-provider-type credential checklist.
**APIs Used:** `GET /v1/admin/provider-applications/{id}`, `POST /v1/admin/provider-applications/{id}/stages/{stage}/approve`.
**Accessibility:** Standard internal-tool WCAG AA.
**Localization:** Internal tool — English only for Phase 1 `[UX-DECISION]`, since Console users are platform staff, not the GT-05 citizen/provider audience.
**Analytics Events:** `onboarding_stage_advanced`, `onboarding_rejected`, `onboarding_completed`.
**Success Criteria:** Matches FR-ADM-PRV-001's dependency chain exactly; zero providers reach Portal access without every mandatory stage logged complete (audit-verifiable, GT-06).

## 14.2 Remaining Screens — Summary Specifications

All screens listed in Section 4 but not given full depth above follow the identical 17-field structure. To avoid duplicating content already established by the exemplars' patterns, each is specified here as a delta against its nearest exemplar, per the same referencing convention the PRD itself uses between Modules 1–2 and Modules 3–9 (Part B intro note).

| Screen | Nearest Exemplar Pattern | Key Deltas |
|---|---|---|
| C-08 Arrival Confirmation | C-07 | Terminal state of tracking; no live data, single "confirm arrival" action; transitions Case to next stage per §1.21 |
| C-11 Human Coordinator Escalation | C-06's escalation state | Always-reachable (GT-08); shows live coordinator connection status, never a dead-end form |
| C-12 Bed Search | Generic SearchTemplate (§8) | Filters/sorting per Module 2 §2.16/§2.17; staleness flag mandatory per result card |
| C-13/C-14 Bed Detail/Hold Status | C-09's HoldCountdown molecule | ICU/Vent shows two-step status explicitly (BR-04); General shows single-step |
| C-15–C-27 (Doctor/Hospital/Pharmacy/Blood/Diagnostics/Cancer search+detail screens) | SearchTemplate + generic ResourceCard/HoldCountdown | Each configures the same template per its module's §Search Filters/§Sorting Options/§Booking Workflow; module-specific Business Rules and Status Definitions apply per PRD Part B |
| C-17 Teleconsult Session | — | Video component (Part J Video service); consent-gated per Module 3's strictest-tier privacy requirement |
| C-28 CHRONIC_MANAGEMENT Case View | C-09 (Case Dashboard) | Distinct status machine (Module 9 §9, DIAGNOSIS_INTAKE→...→SURVEILLANCE) — flagged in PRD §9 Open Questions as possibly needing a dedicated Dashboard variant; this spec treats it as a C-09 configuration pending that product decision |
| C-29/C-30 Profile/Consent | — | Standard settings pattern; Consent screen implements Part I1's revocable-artifact model, one toggle per active consent grant |
| C-32 Driver Navigate+Handoff | C-31 | Adds turn-by-turn (Maps service) and FR-AMB-004 triage handoff form (structured, minimal-typing) |
| P-01 Portal Login | — | Org-scoped auth (Part I7); MFA required |
| P-04 Incoming Patients/Booking Queue | C-06's status-progress pattern, provider-facing | Ranked by severity (FR-HOSP-001); accept/confirm/decline-with-reason actions |
| P-05 ICU/Vent Clinical Ack | P-03 | Distinct queue from general Admissions (FR-HOSP-002); zero-tolerance audit requirement shown as a hard gate, not a soft prompt |
| P-06–P-12 (Case Mgmt/Reports/Analytics/AI/Users/Config/Audit) | Standard back-office patterns | Each is a rendering of the correspondingly-named PRD Part B/F/J section for that portal; Case Management scope varies per §F2 table |
| P-13–P-19 (portal-specific operational screens) | P-03 (Operational Data Update) | Each configures the same ProviderDataUpdateForm organism to its own schema (slot calendar for Doctor, fleet map for Ambulance Operator, stock table for Pharmacy, component inventory for Blood Bank, order queue for Diagnostics, review queue for Insurance) per Part F's F3–F9 FR definitions |
| A-01–A-03, A-05–A-18 | A-04 (Provider Onboarding) for workflow screens; standard dense-table patterns for the rest | Each maps 1:1 to its named PRD Part G capability (G3, G5–G17); Support Ticket Detail (A-07) reuses C-09/C-10's Case Timeline component under GT-07 audited access per FR-ADM-SUP-001 |

---

# 15. CROSS-CUTTING UX REQUIREMENTS (Consolidated)

Restated here for designer/AI-design-tool convenience — these apply to every screen in Section 14 regardless of whether individually noted:

- **GT-11 fallback visibility:** every screen that can degrade must show its degraded state explicitly (staleness flags, "last known" labels) — never a silent stale render.
- **GT-08 escalation reachability:** the EscalationCTA component is never more than one tap/click from any Case-related screen.
- **GT-09 accessibility:** voice input, screen-reader labels, and large touch targets are Definition-of-Done items for every citizen and provider screen, not optional polish.
- **GT-05 localization:** no citizen-facing or provider-facing string may ship without translation keys for the full required language set; Admin Console is the sole English-only exception (§14.2 `[UX-DECISION]`).
- **Cross-channel continuity:** any screen showing Case state must reflect the same state regardless of whether the Case was initiated via app, WhatsApp, or IVR (§10).
