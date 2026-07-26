# India Healthcare Coordination Platform
## Enterprise Functional Specification — Phase 1
### Prepared for Engineering, Architecture, QA, Hospital Partners & Government Stakeholders

---

## Document Control

| Field | Value |
|---|---|
| Document Type | Functional Specification (Implementation-Ready) |
| Version | 1.0 |
| Scope | Phase 1 — 9 Modules |
| Audience | Engineering, Architecture, QA, Hospital Ops, Government/Regulatory, Insurance Partners |
| Owner | Chief Product Officer |

---

# PART A — PLATFORM ARCHITECTURE & PRODUCT THINKING

This section exists because a PRD that lists nine modules is nine apps stitched together, not a platform. Before any module spec, we define the spine that makes this **one coordinated system**. Every module below is a *service provider* to this spine — it is never the center of the experience. The citizen is never asked to "go use the Ambulance module" and then separately "go use the Bed module." They open **one Case**, and the platform coordinates everyone around it.

## A1. The Core Insight

Uber's atomic unit is a **Trip**. Swiggy's atomic unit is an **Order**. Ours is a **Healthcare Case**.

A Healthcare Case is the single object that:
- Is created the moment a citizen has a medical need (emergency or planned)
- Persists across every service touched during that need (ambulance → hospital → bed → doctor → blood → diagnostics → insurance → pharmacy)
- Has one Case ID, one Timeline, one Dashboard, one source of truth for "what is happening to me/my family member right now"
- Outlives any single module — a case that starts as "Ambulance Request" can silently absorb "Bed Booking," "Blood Requirement," and "Insurance Pre-Authorization" without the user re-entering context

**Product rule that governs the entire document:** No module is allowed to be a dead-end screen. Every module's terminal action ("ambulance dispatched," "bed confirmed," "blood unit reserved") must be capable of writing an event onto a Case Timeline and, where relevant, spawning or attaching to a Case.

## A2. The Healthcare Case Object (Central Entity)

```
HealthcareCase {
  case_id: string (immutable, human-readable e.g. HCC-DL-2026-0000481)
  case_type: enum [EMERGENCY, PLANNED, CHRONIC_MANAGEMENT]
  case_status: enum [INITIATED, IN_PROGRESS, STABILIZED, RESOLVED, CLOSED, CANCELLED]
  severity: enum [CRITICAL, URGENT, MODERATE, ROUTINE]   // drives SLA + AI prioritization
  primary_patient_id: ref(Patient)
  initiator_id: ref(User)          // may differ from patient (family member, bystander)
  created_at, updated_at
  location: { lat, lng, address, geofence_zone }
  linked_services: [ {service_type, service_ref_id, status, linked_at} ]
      // e.g. AMBULANCE:AMB-REQ-118, BED:BED-BOOK-552, BLOOD:BLOOD-REQ-91
  timeline: [CaseTimelineEvent]
  case_owner: ref(CoordinationAgent | AI_COORDINATOR)   // who is "driving" this case
  golden_hour_clock: { started_at, target_deadline, elapsed }
  consent_scope: [data-sharing permissions granted for this case]
}
```

### Why this matters for every module downstream
Every module's Functional Requirements (Part B onward) reference `case_id` as a mandatory field on their core objects. A Bed Booking is never a free-floating booking — it is `BedBooking { case_id, ... }`. This is a deliberate, non-negotiable architectural constraint, not a suggestion, because it is the only way cross-module coordination and the unified Timeline are possible.

## A3. The Two Screens That Become the Center of the Experience

Per your direction, we do **not** design UI/wireframes here. But the functional *existence* of two screens must be specified because every module's requirements depend on them.

### A3.1 Healthcare Case Dashboard (Home Base)
Functional purpose: the single place a citizen (or their family) looks to answer "what is being done for me right now, by whom, and what happens next."

Must functionally support:
- Live status of every linked service (ambulance ETA, bed confirmation state, doctor assigned, blood unit status, insurance pre-auth state) in one aggregated view
- A single "Next Action Needed" surface — if insurance needs a document, if a blood donor needs confirmation, if a bed needs family confirmation, it is the loudest thing on the dashboard, not buried in a module
- Case severity and Golden Hour clock (for emergency cases) prominently computed and displayed
- One-tap escalation to a human coordinator at any time
- Multi-case support (a caregiver managing an elderly parent's chronic case AND a child's vaccination case simultaneously, without confusion)

### A3.2 Case Timeline (Trust & Transparency Layer)
Functional purpose: an immutable, chronologically ordered, human-readable log of every action taken across every module for this case — "Ambulance dispatched 10:42 AM," "Hospital confirmed bed 10:51 AM," "Blood bank matched donor 11:03 AM," "Insurance pre-auth approved 11:20 AM."

Must functionally support:
- Append-only event log (never edited, only appended — required for audit/legal/insurance defensibility)
- Every module MUST emit a `CaseTimelineEvent` on every meaningful state transition (this is repeated as a mandatory Dependency in every module's FR tables in Part B)
- Filterable by service type
- Exportable as a shareable summary (for a second hospital, for insurance claims, for legal/medico-legal cases)

## A4. AI Coordination Layer (Reduces Decision-Making, Doesn't Just List)

This is the philosophical difference between "coordination platform" and "directory app." Directory apps return a list and make the citizen — often in a state of panic — do the triage. A coordination platform makes the decision *with* them or *for* them where safe to do so.

Functional responsibilities of the AI Coordination Layer (cuts across every module):

| Capability | What it does | Which modules it touches |
|---|---|---|
| Case Severity Classification | Uses symptom/trigger input to auto-classify CRITICAL/URGENT/MODERATE/ROUTINE, which sets SLAs across ambulance dispatch, bed prioritization, doctor matching | All |
| Best-Match Ranking (not just nearest) | Ranks ambulance/hospital/bed/doctor not purely by distance but by a composite of distance, capability match, real-time capacity, historical reliability, and insurance-network fit | Ambulance, Beds, Doctors, Diagnostics, Cancer Hospitals |
| Auto-Coordination Chaining | When an ambulance is dispatched for a CRITICAL case, the AI layer proactively checks bed availability at candidate hospitals *before* the ambulance arrives, and pre-alerts blood bank if the triage input suggests likely need (e.g., trauma, obstetric emergency) | Ambulance → Beds → Blood → Doctor (chained) |
| Document/Pre-Auth Drafting | Pre-fills insurance pre-authorization forms using case data already captured, reducing the family's paperwork burden during crisis | Insurance |
| Conversational Intake | Allows a panicked or non-literate caller to describe the situation in natural language (voice, regional language) and have the system extract structured triage data | Ambulance intake, Case creation |
| Anomaly/Fraud Signals | Flags statistically unusual patterns (e.g., repeated blood requests without corresponding hospital admission) for human review | Blood Bank, Insurance |

**Explicit non-goal:** The AI layer never makes the final clinical decision (e.g., which treatment) — it accelerates *logistics and matching* decisions, always leaving clinical judgment to licensed professionals. This boundary is a hard requirement, called out again in each module's Business Rules.

## A5. How the Nine Modules Revolve Around One Case

```
                         ┌─────────────────────────┐
                         │   HEALTHCARE CASE        │
                         │  (Dashboard + Timeline)   │
                         └────────────┬─────────────┘
                                      │
        ┌───────────┬───────────┬────┴────┬───────────┬───────────┐
        │           │           │          │           │           │
   Ambulance   Hospital Beds  Doctors   Blood Bank  Diagnostics  Insurance
        │           │           │          │           │           │
        └─────┬─────┴─────┬─────┴────┬─────┴─────┬─────┴─────┬─────┘
              │           │          │           │           │
        Nearby Hospitals(reference layer)   Pharmacy(fulfillment layer)  Cancer Hospitals(specialized care layer)
```

- **Ambulance, Beds, Doctors, Blood Bank** are the four modules most likely to be *chained automatically* within a single emergency Case by the AI Coordination Layer.
- **Nearby Hospitals** and **Cancer Hospitals** are specialized *discovery* layers that feed candidates into the Bed/Doctor matching engines — they are not silos.
- **Pharmacy** and **Diagnostics** typically attach to a Case *after* stabilization (post-admission prescription fulfillment, ordered tests) — they are fulfillment/follow-through modules.
- **Insurance Mapping** is a cross-cutting utility consulted by Beds, Diagnostics, and Cancer Hospitals modules at decision points (network hospital check, pre-auth), not a standalone journey.

## A6. Design Language, Branding, Visual Style — Explicitly Preserved

Per instruction, this document does not touch UI/visual design. All existing brand guidelines, color system, typography, and component library remain **unchanged and authoritative**; nothing in Part B should be read as a design directive. Where a module below references a "screen" or "surface," it is a *functional* surface (data and behavior it must expose), not a layout.

## A7. Golden Thread Requirements (Apply to Every Module in Part B)

To avoid repeating 500 lines nine times, the following are **standing requirements** that apply to every module unless explicitly overridden. Each module chapter will reference these by ID (GT-01 … GT-10) instead of re-deriving them.

| ID | Standing Requirement |
|---|---|
| GT-01 | Every core transaction object (booking, request, dispatch, reservation) MUST carry a `case_id` (nullable only for non-case flows like passive browsing/search). |
| GT-02 | Every state transition MUST emit a `CaseTimelineEvent` when a `case_id` is present. |
| GT-03 | Every module MUST support offline request queuing on the citizen's device with sync-on-reconnect (India's rural connectivity reality). |
| GT-04 | Every module MUST degrade gracefully on 2G/EDGE networks — text-first responses before rich media, SMS/USSD/IVR fallback for critical actions. **Revised per architecture review:** WhatsApp, SMS, and IVR are first-class product surfaces for both citizens and providers, not merely a degraded fallback for when the native app is unavailable — for the stated tier-2/3 first market, they are frequently the primary trusted channel of adoption (see Part L2). |
| GT-05 | Every module MUST support Hindi, English, and at minimum the 8 highest-population state languages (Bengali, Marathi, Telugu, Tamil, Gujarati, Kannada, Malayalam, Punjabi) at launch for all citizen-facing text and voice prompts. |
| GT-06 | Every module MUST log an immutable audit trail for every write operation (who, what, when, from where) for medico-legal and regulatory defensibility. |
| GT-07 | Every module MUST honor patient consent scoping — data captured for one case is not automatically visible to unrelated providers without explicit or emergency-override consent (see Privacy in each chapter). |
| GT-08 | Every module MUST expose a "human coordinator escalation" action, never leaving a citizen with only automated/self-service options during an active emergency case. |
| GT-09 | Every module's critical citizen-facing actions MUST be accessible to low-literacy and disabled users — large-touch-target flows, voice-first input, screen-reader compatibility (functional requirement, not a UI spec). |
| GT-10 | Every module MUST be able to operate for an "unregistered/bystander" actor (a stranger calling an ambulance for an accident victim) with a lightweight guest flow, because Golden Hour cannot wait for account creation. |
| GT-11 | Every external or non-deterministic dependency (AI ranking, third-party API, push notification, primary database) MUST have a defined, deterministic fallback that degrades quietly and safely rather than failing silently or blocking the user. A fallback firing MUST always be logged/alertable — invisible degradation is treated as a defect with the same severity as an outage. See Part L (Technical Architecture Specification) for the fallback matrix. |

---

# PART B — MODULE SPECIFICATIONS

**Note on treatment depth:** Modules 1 (Ambulance Services) and 2 (Hospital Bed Availability) are treated at full exhaustive depth as the governing template for engineering and QA — these are the two modules that carry the Golden Hour mission most directly and the two most architecturally complex. Modules 3–9 follow the identical 37-section structure and identical FR template, scoped to what is materially different for that module; where a section is functionally identical to the standing Golden Thread requirements (Part A7) or to the equivalent section in Module 1/2, it references that section rather than repeating it verbatim — this is intentional to keep the document navigable rather than a 1990s-style copy-paste artifact, and engineering should treat "see GT-0X" / "see Module 1 §X" as normative, not as a gap.

---

## MODULE 1 — AMBULANCE SERVICES

### 1.1 Module Overview
The Ambulance Services module is the platform's Golden Hour entry point. It coordinates the discovery, dispatch, and real-time tracking of ambulances — private, hospital-owned, government (108/102), and NGO fleets — as a single logical fleet from the citizen's point of view, while abstracting away which operator actually owns the vehicle.

### 1.2 Business Objective
Reduce time-to-dispatch and time-to-hospital-arrival for emergency cases in underserved geographies (villages, tier-2/3 cities) by aggregating fragmented ambulance supply into one bookable, trackable network, and by auto-linking dispatch to downstream bed/doctor/blood coordination so the ambulance is never "just a ride."

### 1.3 Problems Being Solved
- Citizens in rural/tier-2/3 areas don't know which ambulance number to call, or call one that's unavailable/far away, losing critical minutes
- No visibility into ambulance ETA leads to panic-driven duplicate calls to multiple providers, causing wasted dispatches
- Ambulance arrives at a hospital with no bed available, forcing a second transfer (a documented cause of preventable deaths)
- No standardized triage data reaches the hospital before patient arrival, delaying admission-readiness
- Government (108/102) and private fleets operate as disconnected silos with no shared visibility

### 1.4 Stakeholders
Citizen/Patient, Family/Caregiver initiating on behalf of patient, Bystanders (unregistered), Ambulance Operators (private, hospital-owned, government, NGO), Ambulance Drivers/EMTs, Receiving Hospital (ER admission desk), Government Emergency Health Authority (108/102 oversight), Platform Coordination/Ops team, Insurance Provider (for cashless ambulance benefit where applicable).

### 1.5 User Personas
1. **Panicked Bystander** — witnessed a road accident, no app installed, needs fastest possible path to dispatch a nearby ambulance with minimal steps, likely on 2G.
2. **Family Caregiver** — managing an elderly parent's cardiac event at home, has the app, needs medical history auto-attached and wants real-time ETA to share with other family members.
3. **Rural Citizen, Low Literacy** — needs voice/IVR-first flow in a regional language, may not read English/Hindi text confidently.
4. **Ambulance Driver/Operator** — needs a simple accept/reject/navigate/status-update flow usable one-handed while driving, works even with intermittent connectivity.
5. **Hospital ER Coordinator** — needs advance notice of incoming critical patients with triage summary so the bed/ER team can prep before arrival.

### 1.6 Functional Scope
Ambulance discovery (nearest available, by type: Basic Life Support/Advanced Life Support/Neonatal/Mortuary), request creation (case-linked and standalone/guest), dispatch matching and driver assignment, live GPS tracking for requester and receiving hospital, triage data capture at request time, fare/cashless handling reference (not payment processing itself — see Out of Scope), driver-side accept/navigate/status app functions, post-trip case handoff to Hospital Bed module.

### 1.7 Out of Scope (Phase 1)
- In-app payment gateway processing (fare display and payment *method selection* only; actual settlement integrates with existing payment rails, not built here)
- Ambulance fleet maintenance/vehicle-health management (operator's own systems)
- Air ambulance / inter-state critical transfer logistics (Phase 2)
- In-ambulance telemedicine video consultation (Phase 2, flagged in Future Enhancements)

### 1.8 Business Rules
- BR-01: A CRITICAL severity request must attempt dispatch match within 90 seconds of submission or auto-escalate to the widest available radius and to a human coordinator.
- BR-02: Government (108/102) ambulances, where integrated, are always offered at zero cost to the citizen and must be surfaced ahead of paid private options in the ranking for CRITICAL cases, subject to real ETA being competitive within a configurable threshold (default: within 5 minutes of the fastest paid option).
- BR-03: A driver cannot be shown two active dispatch offers simultaneously; offers are sequential with a 20-second accept window before moving to the next candidate.
- BR-04: Once a driver accepts, the case is locked to that ambulance; reassignment requires explicit cancellation with reason code.
- BR-05: Triage data entered by the requester is never used to auto-diagnose; it is transport/routing metadata only (ties to AI Layer non-goal in A4).
- BR-06: An unregistered/guest requester (GT-10) can create and track exactly one active request; a second concurrent request from the same device requires minimal registration (phone OTP) to prevent abuse.

### 1.9 Assumptions
- A baseline GPS/location signal is available on the requester's device or can be manually pinned on a low-connectivity map cache.
- Ambulance operators integrate via a driver-side app or, for smaller operators, a lightweight SMS/IVR-based accept/reject interface.
- Government fleet integration depends on state-level API/data-sharing agreements being in place per state — module must function with partial state coverage.

### 1.10 User Stories (Representative Set)
- As a bystander with no app, I want to trigger an ambulance request via a single tap or toll-free call so that I don't lose time to registration.
- As a family caregiver, I want to see live ETA and driver details so I can prepare the household and inform other relatives.
- As an ER coordinator, I want to see incoming critical patients' triage summary 10+ minutes before arrival so my team can be admission-ready.
- As an ambulance driver, I want turn-by-turn navigation and one-tap status updates so I can focus on driving, not data entry.
- As a rural citizen, I want to speak my emergency in my language and have the system understand it, because I cannot type quickly in a crisis.

### 1.11 Detailed Functional Requirements

**FR-AMB-001**
- Priority: P0
- Description: System shall allow a guest (unregistered) user to create an ambulance request using only phone number and pinned/detected location.
- Actor: Bystander/Guest
- Preconditions: Device has location services or manual pin capability; network available (or offline queue per GT-03)
- Trigger: User taps "Request Ambulance" or dials toll-free IVR number
- Main Flow: (1) Location captured/pinned → (2) Minimal triage prompt (conscious? breathing? bleeding?) via tap or voice → (3) System auto-classifies severity via AI layer → (4) System creates guest Case (case_type=EMERGENCY) and Ambulance Request linked to it → (5) Dispatch matching begins per FR-AMB-002
- Post Conditions: Ambulance Request object created with status=SEARCHING; CaseTimelineEvent emitted
- Acceptance Criteria: Request created and matching initiated within 5 seconds of triage completion on 4G; within 15 seconds on 2G with cached UI
- Dependencies: GT-01, GT-03, GT-10, AI Coordination Layer (severity classification)

**FR-AMB-002**
- Priority: P0
- Description: System shall rank and sequentially offer the request to eligible ambulances using the AI Best-Match Ranking (not pure nearest-distance).
- Actor: System (AI Coordination Layer), Ambulance Operator
- Preconditions: Request status=SEARCHING; at least one ambulance is ON_DUTY within configured max radius
- Trigger: Request creation (FR-AMB-001) or manual re-search after decline
- Main Flow: (1) Query all ON_DUTY ambulances within radius → (2) Score by ETA, vehicle-type match to triage severity, operator reliability score, government-priority rule (BR-02) → (3) Offer to top-ranked driver with 20s accept window (BR-03) → (4) On decline/timeout, offer next-ranked → (5) On accept, lock assignment (BR-04)
- Post Conditions: Request status=ASSIGNED with driver/vehicle detail; CaseTimelineEvent emitted
- Acceptance Criteria: For CRITICAL severity in a zone with ≥1 available ambulance, an accepted assignment occurs within 90 seconds P95
- Dependencies: BR-01, BR-02, BR-03, BR-04

**FR-AMB-003**
- Priority: P0
- Description: System shall provide live GPS tracking of the assigned ambulance to the requester and, if linked, to the receiving hospital's ER coordinator view.
- Actor: Requester, Hospital ER Coordinator
- Preconditions: Request status=ASSIGNED or EN_ROUTE
- Trigger: Driver app sends location ping (target interval: every 5 seconds while en route)
- Main Flow: (1) Driver location received → (2) ETA recalculated → (3) Pushed to requester's tracking view and, if a receiving hospital is set, to hospital's incoming-patient view
- Post Conditions: Tracking data available; no timeline event per ping (would flood timeline — only status-transition pings are logged per GT-02)
- Acceptance Criteria: Location refresh visible to requester within 3 seconds of driver-side ping under normal network; degrade to last-known + static ETA under GT-04 low-network conditions
- Dependencies: GT-02, GT-04

**FR-AMB-004**
- Priority: P1
- Description: System shall allow the driver/EMT to submit a brief structured triage handoff (vitals if available, suspected condition category) before arrival at hospital, visible to the receiving ER.
- Actor: Ambulance Driver/EMT
- Preconditions: Request status=EN_ROUTE and receiving hospital designated
- Trigger: EMT opens handoff form on driver app
- Main Flow: (1) EMT enters/updates vitals and condition category → (2) System pushes to Hospital ER Coordinator's incoming queue → (3) CaseTimelineEvent emitted → (4) If Hospital Bed module has an active bed hold for this case, bed team is notified simultaneously
- Post Conditions: ER has pre-arrival visibility
- Acceptance Criteria: Handoff data visible on hospital side within 10 seconds of EMT submission
- Dependencies: Module 2 (Hospital Beds) integration, GT-02

*(Additional FRs — cancellation, re-routing on hospital-full, multi-patient mass-casualty mode, government-fleet fallback, fare display — follow the identical template and are catalogued in Appendix B1 for brevity; engineering should treat Appendix B1 as equally normative.)*

> ### Added for AI Implementation
> **Implementation metadata for FR-AMB-001 to FR-AMB-004** (does not alter the requirements above; see Part M for conventions referenced below)
>
> | FR | Services | Entities | Events Produced | Events Consumed | APIs | Background Jobs | Feature Flags | Config Keys |
> |---|---|---|---|---|---|---|---|---|
> | FR-AMB-001 | `AmbulanceService`, `CaseService`, `AiMatchingService` (via `AiPlatformClient`, see M8) | `Case`, `AmbulanceRequest` | `case.created`, `ambulance_request.created` | — | `POST /v1/ambulance/requests` | — | `ff.ambulance.guest_flow` | `AMB_TRIAGE_TIMEOUT_MS`, `AMB_MAX_SEARCH_RADIUS_KM` |
> | FR-AMB-002 | `AmbulanceService`, `AmbulanceMatchingService` | `AmbulanceRequest`, `ResourceHold` (see Appendix C2) | `ambulance_request.assigned`, `ambulance_request.offer_declined` | `ambulance_request.created` | `POST /v1/ambulance/requests/{id}/offers/{offerId}/respond` | `AmbulanceOfferExpiryJob` (BullMQ, see M11) | `ff.ambulance.ai_ranking` (fallback: deterministic ranking per GT-11/L5) | `AMB_OFFER_WINDOW_SEC=20`, `AMB_DISPATCH_SLA_SEC=90` |
> | FR-AMB-003 | `AmbulanceTrackingService` | `AmbulanceRequest.location_ping` (append-only, not on core entity — see M6) | `ambulance.location_updated` (not persisted to Timeline, GT-02 exception) | — | `WS /v1/ambulance/requests/{id}/track` | `LocationPingIngestJob` | — | `AMB_PING_INTERVAL_SEC=5` |
> | FR-AMB-004 | `AmbulanceService`, `CaseService`, `BedsService` (direct call, see L4) | `TriageHandoff` | `case.triage_handoff_submitted` | — | `POST /v1/ambulance/requests/{id}/handoff` | — | — | — |
>
> **Idempotency:** FR-AMB-001 request creation MUST accept an `Idempotency-Key` header; duplicate submissions within 5 minutes return the original `case_id` rather than creating a second case (see M13).
> **Acceptance test hints:** simulate offer-decline chain (3 declines → 4th driver accepts within SLA); simulate AI matching timeout → assert fallback ranking used and `ai_fallback_used` logged (GT-11).

### 1.12 Functional Workflow (Primary — Critical Emergency)
1. Request initiated (registered user or guest) → 2. Triage captured → 3. AI severity classification → 4. Case created, Dashboard/Timeline instantiated → 5. Ambulance matched and dispatched → 6. AI layer pre-checks candidate hospital bed availability in parallel → 7. Live tracking begins → 8. Pre-arrival triage handoff to ER → 9. Arrival confirmed, ambulance leg closed → 10. Case remains open, now driven by Hospital Bed / Doctor modules.

### 1.13 Alternate Flows
- AF-01: Requester designates a specific known hospital instead of accepting AI-recommended hospital — system still runs bed-availability pre-check for that hospital.
- AF-02: Registered user with saved medical profile — triage step is pre-populated from profile, requester only confirms/edits.
- AF-03: Case originates from an already-open Case (e.g., created via Doctor Availability module for a home visit that escalates) — ambulance request attaches to existing case_id rather than creating a new case.

### 1.14 Exception Flows
- EF-01: No ambulance available within max radius → system escalates to human coordinator, widens radius automatically, and offers cross-reference to Nearby Hospitals module for self-transport guidance if transport is safe and time-critical.
- EF-02: Driver accepts but fails to move (stale GPS) beyond threshold (default 3 min) → auto-flag, offer reassignment to requester, penalize operator reliability score.
- EF-03: Requester cancels after driver en route → require cancellation reason, notify driver immediately, log for operator-fairness reporting (a cancellation fee reference may apply per business policy, out of scope for payment processing itself).
- EF-04: Guest user's device loses connectivity entirely mid-request → offline queue (GT-03) retries; if unrecoverable within SLA, SMS/IVR fallback channel is invoked.

### 1.15 User Permissions
| Role | Create Request | View Own Tracking | View Others' Requests | Accept/Reject Dispatch | Edit Triage | View Full Case |
|---|---|---|---|---|---|---|
| Guest | Yes (limited: 1 active) | Yes | No | No | Yes (own) | No (limited case view) |
| Registered Citizen | Yes | Yes | Family-linked only, with consent | No | Yes (own) | Yes (own cases) |
| Family/Caregiver (linked) | Yes, on behalf | Yes | Linked patient only | No | Yes | Yes (linked cases) |
| Ambulance Driver | No | N/A | Assigned requests only | Yes | No | Triage/handoff subset only |
| Hospital ER Coordinator | No | Incoming-case tracking only | Incoming cases only | No | No | Relevant case subset |
| Government Oversight | No | Aggregate/anonymized | Aggregate | No | No | Aggregate/audit only |
| Platform Coordinator (Ops) | Yes (on behalf) | Yes | Yes (escalated cases) | Can force-reassign | Yes | Yes |

### 1.16 Search Filters
Vehicle type (BLS/ALS/Neonatal/Mortuary), distance radius, government vs. private, insurance cashless-eligible, availability now vs. scheduled (for non-emergency transfer bookings).

### 1.17 Sorting Options
Default: AI Best-Match (ETA + reliability + type-fit composite). Alternates: Nearest first, Lowest fare first (non-emergency only), Government-fleet-first.

### 1.18 Booking Workflow
Covered fully in §1.11 (FR-AMB-001, FR-AMB-002) and §1.12. Non-emergency scheduled ambulance booking (e.g., planned hospital transfer) follows the same object model with `case_type=PLANNED` and a scheduled_time field, and skips the 90-second SLA rule (BR-01 does not apply to PLANNED cases).

### 1.19 Tracking Workflow
Covered in FR-AMB-003.

### 1.20 Notifications
| Event | Recipient | Channel |
|---|---|---|
| Request created | Requester | Push/SMS confirmation |
| Ambulance assigned | Requester, linked family | Push + SMS (fallback) |
| Driver en route / ETA updates | Requester | Push (throttled, not every ping) |
| Triage handoff submitted | Hospital ER Coordinator | Push/in-app queue alert |
| No ambulance found / escalated | Requester, Human Coordinator | Push + SMS + coordinator dashboard alert |
| Arrival confirmed | Requester, linked family, Hospital | Push + Timeline entry |

### 1.21 Status Definitions
`SEARCHING → ASSIGNED → EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → EN_ROUTE_TO_HOSPITAL → ARRIVED_AT_HOSPITAL → COMPLETED` | `CANCELLED_BY_REQUESTER` | `CANCELLED_BY_OPERATOR` | `NO_AMBULANCE_FOUND`

### 1.22 Error Handling
Standard error taxonomy applied platform-wide (see Appendix C): validation errors (missing location), matching errors (no supply), integration errors (driver-app timeout), consistency errors (double-assignment attempt — must be prevented by optimistic locking on the request object, not merely handled after the fact).

### 1.23 Edge Cases
- Two bystanders independently report the same accident and create two separate requests for what is effectively one patient — system should surface a "possible duplicate nearby request" prompt to the coordinator/dispatch layer based on geo-time proximity, and allow merge into a single case.
- Ambulance en route is itself involved in a delay/breakdown — driver must be able to flag this, triggering automatic reassignment without requester having to re-request from scratch.
- Mass casualty event (multiple patients, one incident) — module must support one incident generating multiple linked cases sharing an `incident_id` for coordinator-level aggregate view.

### 1.24 Offline Behaviour
Per GT-03: request creation is queued locally and submitted on reconnect; last-known-good ambulance list is cached for browsing (not booking) offline; guest flow supports SMS-based request creation as a true offline-network fallback.

### 1.25 Low Network Behaviour
Per GT-04: text/SMS-first request confirmation; map/live-tracking degrades to periodic ETA text updates instead of continuous GPS render; IVR fallback for the entire request-and-track flow.

### 1.26 Accessibility
Per GT-09: voice-first triage input, large single-tap "Emergency" primary action, screen-reader labels on all status text, high-contrast mode compatibility (functional flag exposed to design system, not designed here).

### 1.27 Localization
Per GT-05, plus: triage prompts must be pre-translated and clinically reviewed (not machine-translated live) given the safety criticality of misunderstanding a triage question.

### 1.28 Security Requirements
- End-to-end encrypted transmission of location and triage data.
- Driver app authentication via operator-issued credentials with periodic re-verification.
- Rate-limiting/anti-abuse on guest request creation to prevent prank-dispatch flooding (tied to EF and BR-06).

### 1.29 Privacy Requirements
- Triage data is scoped to the active case and the assigned driver/receiving hospital only (GT-07); not visible to unrelated operators who declined/weren't offered the request.
- Location trail is retained per a defined retention policy (recommend: 90 days operational, then anonymized for analytics) — **flagged as Open Question, needs legal/regulatory input, see §1.37**.

### 1.30 Audit Requirements
Per GT-06: every assignment, reassignment, cancellation, and status transition logged with actor, timestamp, and geo-tag; immutable, exportable for medico-legal review.

### 1.31 Reporting Requirements
Operator-level reliability/SLA compliance reports; government-fleet utilization reports; zone-level "ambulance desert" heatmaps (areas with chronic no-supply) to inform fleet expansion — this heatmap is a *product-level* strategic output, not just an ops report.

### 1.32 Analytics
Time-to-dispatch, time-to-hospital-arrival, decline rate per operator, cancellation reasons distribution, severity-classification accuracy (validated retrospectively against actual hospital triage where available — critical feedback loop to improve the AI layer).

### 1.33 Integration Requirements
Hospital Bed module (bed pre-check, ER handoff), Case/Timeline core service, Notification service (push/SMS/IVR), Government 108/102 dispatch systems (state-by-state), Map/routing provider, Insurance module (cashless eligibility flag).

### 1.34 External APIs
Map/geocoding & routing provider (e.g., Google Maps Platform or equivalent India-optimized provider), SMS/IVR gateway (India-licensed telecom aggregator), State government emergency dispatch APIs (where available), push notification service.

### 1.35 Future Enhancements
In-ambulance telemedicine video link to receiving ER physician; air ambulance and inter-state critical transfer; predictive pre-positioning of ambulances using demand forecasting (weather, event-based); wearable-triggered auto-request (fall detection).

### 1.36 Success Metrics
- Median time-to-dispatch acceptance (target <90s for CRITICAL, tracked by zone)
- Median time-to-hospital-arrival vs. regional baseline
- % of critical cases where receiving hospital had bed pre-confirmed before ambulance arrival (this is the coordination-quality metric, not just a speed metric)
- Zone coverage: % of villages/tier-2-3 towns with <15 min median ETA

### 1.37 Open Questions
- OQ-01: Data retention policy for location trails — needs legal sign-off per state data protection norms (DPDP Act compliance).
- OQ-02: Liability model when platform-recommended ambulance is delayed/unavailable — needs legal/insurance structuring, not a pure product decision.
- OQ-03: Government fleet API availability varies drastically by state — phased rollout sequencing needs a state-readiness scoring exercise before national expansion.
- OQ-04: Should mass-casualty `incident_id` aggregation be visible to citizens (transparency) or coordinator-only (avoid panic amplification)?

---

## MODULE 2 — HOSPITAL BED AVAILABILITY

### 2.1 Module Overview
Coordinates real-time visibility and reservation of hospital beds (General, ICU, Ventilator-equipped, Neonatal/NICU, Isolation, Maternity) across a network of participating hospitals, converting the current phone-call-and-hope process into a live, bookable inventory system tied to the Healthcare Case.

### 2.2 Business Objective
Eliminate the "ambulance arrives, no bed" failure mode; give hospitals a live demand signal to manage capacity; give citizens (and the Ambulance module) a trustworthy real-time view of where a bed genuinely exists right now, not a stale directory listing.

### 2.3 Problems Being Solved
- Hospitals under-report or don't update bed availability, causing wasted transfers
- No visibility into ICU/ventilator-specific capacity, which is often the actual bottleneck, not general beds
- Families make 10+ phone calls during a crisis with no aggregated view
- No mechanism to "hold" a bed for an ambulance en route, so beds are lost to a walk-in between confirmation and arrival

### 2.4 Stakeholders
Citizen/Patient, Family/Caregiver, Hospital Bed Management/Admissions team, Hospital Administrator (inventory owner), Ambulance module (consumer), Insurance Provider (network/cashless check), Government Health Authority (public hospital capacity oversight, especially relevant during epidemics/mass events).

### 2.5 User Personas
1. **Family Member Under Pressure** — needs the fastest possible confirmed bed, not a list of "maybe available" hospitals.
2. **Hospital Admissions Staff** — needs a low-friction way to update bed counts (not a burdensome separate system) integrated with their existing HMS where possible.
3. **AI Coordination Layer (system persona)** — needs structured, trustworthy real-time data to make pre-check and ranking decisions for Ambulance module.
4. **Government Health Officer** — needs aggregate regional capacity view during surges (e.g., epidemic, disaster).

### 2.6 Functional Scope
Real-time bed inventory ingestion (manual hospital-side update + HMS integration where available), bed search/filter by type and specialty, bed hold/reservation with expiry, bed confirmation workflow, case-linked bed booking, cross-module bed pre-check consumption (by Ambulance module), capacity surge reporting.

### 2.7 Out of Scope (Phase 1)
- Full hospital management system (patient records, billing, discharge workflows) — this module is inventory/coordination only, explicitly NOT hospital management software (per Product Philosophy).
- Bed-level physical asset tracking (specific bed/room numbers) — Phase 1 tracks capacity counts by category, not individual bed IDs.
- Inter-hospital patient transfer logistics beyond the initial booking (handled jointly with Ambulance module, not owned here).

### 2.8 Business Rules
- BR-01: A bed marked AVAILABLE and held for a case is decremented from public-facing available count immediately upon hold, not upon confirmation, to prevent overbooking.
- BR-02: A hold expires after a configurable window (default 30 minutes for CRITICAL cases, 2 hours for PLANNED) if not confirmed by hospital admissions, auto-releasing the bed back to available inventory.
- BR-03: Hospitals that fail to update inventory for >X hours (default 6) are flagged as STALE and deprioritized in ranking until refreshed, rather than silently shown as available/unavailable incorrectly.
- BR-04: ICU/Ventilator beds require a two-step confirmation (system hold + explicit clinical-team acknowledgment) given their criticality, unlike General beds which can auto-confirm on hold.
- BR-05: Government hospital capacity, where integrated, must be shown alongside private capacity without bias in default ranking (unlike Ambulance's BR-02 government-priority rule — bed ranking optimizes for match/urgency, not ownership).

### 2.9 Assumptions
- Not all hospitals will have real-time HMS integration at launch; manual update via a lightweight hospital-side app/SMS/portal is a mandatory parallel path (assume partial digital maturity).
- Hospitals are willing to expose live capacity data — this requires a participation/incentive model (business, not engineering, concern) but the module must be built assuming variable participation levels.

### 2.10 User Stories
- As a family member, I want to see which hospitals near me actually have an ICU bed available right now, not just a hospital directory.
- As admissions staff, I want a 10-second way to update our bed counts so the platform reflects reality without adding to our workload.
- As the Ambulance module (system), I want to query bed availability for candidate hospitals before dispatch confirmation so I can route intelligently.
- As a government health officer, I want an aggregate dashboard of regional ICU capacity during a surge event.

### 2.11 Detailed Functional Requirements

**FR-BED-001**
- Priority: P0
- Description: System shall allow hospital admissions staff to update bed category counts (available/occupied/total) in near real time.
- Actor: Hospital Admissions Staff
- Preconditions: Hospital onboarded and authenticated on platform
- Trigger: Manual update action, or automated HMS webhook where integrated
- Main Flow: (1) Staff opens bed update surface → (2) Adjusts counts per category → (3) System timestamps and validates (counts cannot be negative, occupied+available cannot exceed total without override+reason) → (4) Public-facing inventory updated
- Post Conditions: Inventory reflects new counts; staleness timer reset
- Acceptance Criteria: Update reflected in search results within 10 seconds; validation errors returned instantly for illogical inputs
- Dependencies: BR-03

**FR-BED-002**
- Priority: P0
- Description: System shall allow a citizen (or the Ambulance module on their behalf) to search hospitals with available beds of a specified category within a radius, ranked by AI Best-Match.
- Actor: Citizen/Family, Ambulance module (system-to-system)
- Preconditions: At least the searching device's location known
- Trigger: Search initiated, or automated pre-check call from Ambulance FR-AMB-002
- Main Flow: (1) Query hospitals within radius with category>0 available → (2) Filter STALE hospitals per BR-03 (shown but flagged, not hidden) → (3) Rank by composite score (distance, insurance-network fit if case has insurance data, specialty match, staleness penalty) → (4) Return ranked list
- Post Conditions: None (read operation) unless followed by hold (FR-BED-003)
- Acceptance Criteria: Results returned within 2 seconds P95
- Dependencies: FR-BED-001, Module 7 (Insurance) for network-fit scoring

**FR-BED-003**
- Priority: P0
- Description: System shall allow placing a time-limited hold on a bed category slot, decrementing available count immediately.
- Actor: Citizen/Family, Ambulance module, Hospital Admissions Staff (manual override)
- Preconditions: Selected hospital has available>0 for requested category
- Trigger: "Reserve/Hold Bed" action
- Main Flow: (1) Atomic decrement of available count (optimistic locking to prevent race condition double-booking) → (2) Hold object created with expiry timer per BR-02 → (3) For ICU/Ventilator, clinical-acknowledgment task created per BR-04 → (4) CaseTimelineEvent emitted → (5) Hospital admissions queue notified
- Post Conditions: Hold status=PENDING_CONFIRMATION (or CONFIRMED for General beds per BR-04)
- Acceptance Criteria: Zero double-booking incidents under concurrent load (verified via load-test with simultaneous hold attempts on last-available-bed scenario)
- Dependencies: BR-01, BR-02, BR-04, GT-01, GT-02

*(Additional FRs — hold expiry/auto-release job, confirmation by admissions, cancellation, surge/epidemic mode broadcast, HMS webhook ingestion spec — catalogued in Appendix B2, equally normative.)*

> ### Added for AI Implementation
> **Implementation metadata for FR-BED-001 to FR-BED-003**
>
> | FR | Services | Entities | Events Produced | Events Consumed | APIs | Background Jobs | Feature Flags | Config Keys |
> |---|---|---|---|---|---|---|---|---|
> | FR-BED-001 | `BedInventoryService` | `HospitalBedInventory` | `bed_inventory.updated` | — | `PUT /v1/providers/{hospitalId}/beds`, `POST /v1/providers/{hospitalId}/beds/whatsapp-update` (Tier 1 ingestion, see L6/M14) | `InventoryStalenessCheckJob` (marks STALE per BR-03) | `ff.provider.whatsapp_updates` | `BED_STALE_THRESHOLD_HOURS=6` |
> | FR-BED-002 | `BedSearchService`, `AiMatchingService` | (read-only; queries `HospitalBedInventory`, `InsuranceNetworkMap`) | — | — | `GET /v1/beds/search` | — | `ff.beds.ai_ranking` | `BED_SEARCH_RADIUS_KM_DEFAULT` |
> | FR-BED-003 | `ResourceCoordinationService` (Appendix C2, shared engine — do not duplicate hold logic per module, see M9) | `ResourceHold` | `resource_hold.created`, `resource_hold.confirmed` | `case.severity_classified` (for ICU/Vent routing, BR-04) | `POST /v1/beds/{hospitalId}/holds`, `POST /v1/beds/holds/{id}/confirm` | `ResourceHoldExpiryJob` (generic, shared across Ambulance/Beds/Blood/Cancer per Appendix C2) | — | `BED_HOLD_EXPIRY_MIN_CRITICAL=30`, `BED_HOLD_EXPIRY_MIN_PLANNED=120` |
>
> **Concurrency requirement:** FR-BED-003's atomic decrement MUST use `SELECT ... FOR UPDATE` or a version-column optimistic lock on `HospitalBedInventory.available_count` — a race-condition integration test (N concurrent hold requests against a count of 1, assert exactly one success) is a Definition-of-Done blocker for this FR (see M17).
> **Acceptance test hints:** verify hold expiry auto-releases inventory (BR-02); verify ICU/Ventilator holds cannot reach CONFIRMED without a logged Clinical Lead acknowledgment (BR-04, zero-tolerance audit check per FR-HOSP-002).

### 2.12 Functional Workflow
1. Search/pre-check triggered (by citizen or Ambulance module) → 2. Ranked hospital list with live category counts → 3. Hold placed on selection → 4. Available count decremented, expiry timer starts → 5. (ICU/Vent) clinical acknowledgment required → 6. Confirmation → 7. CaseTimelineEvent + notification to requester/family → 8. On patient arrival, hospital marks OCCUPIED, closing the booking leg of the case.

### 2.13 Alternate Flows
- AF-01: Hold placed automatically by Ambulance module's AI pre-check before requester has even chosen a hospital, then presented to requester as a pre-selected recommendation they can accept or override.
- AF-02: Direct citizen search without any active emergency case (planned admission) — creates case_type=PLANNED, longer hold window applies.

### 2.14 Exception Flows
- EF-01: Hold expires unconfirmed → auto-release, notify requester with option to re-search immediately, escalate to human coordinator if this is the second consecutive expiry for the same case.
- EF-02: Concurrent hold race on last available bed → losing request receives immediate, clear "just became unavailable" response with instant re-ranked alternatives, not a silent failure.
- EF-03: Hospital staff attempts to reduce available count below already-held commitments → system blocks with validation error, forces reconciliation.

### 2.15 User Permissions
| Role | Search | Hold | Confirm | Update Inventory | View Aggregate Regional Data |
|---|---|---|---|---|---|
| Citizen/Family | Yes | Yes (own case) | No | No | No |
| Ambulance Module (system) | Yes | Yes (linked case) | No | No | No |
| Hospital Admissions Staff | Yes (own hospital) | N/A | Yes (own hospital) | Yes (own hospital) | No |
| Hospital Clinical Lead | View | N/A | Yes (ICU/Vent ack) | No | No |
| Government Health Officer | View aggregate | No | No | No | Yes |
| Platform Coordinator | Yes | Yes (escalated) | Force-override w/ reason | No | Yes |

### 2.16 Search Filters
Bed category (General/ICU/Ventilator/NICU/Isolation/Maternity), distance radius, insurance network match, specialty (cardiac ICU vs. general ICU), staleness-excluded toggle.

### 2.17 Sorting Options
Default: AI Best-Match. Alternates: Nearest first, Insurance-network-first, Most-recently-updated-inventory-first (trust signal).

### 2.18 Booking Workflow
See §2.11 FR-BED-003 and §2.12.

### 2.19 Tracking Workflow
Hold status visible on Case Dashboard (PENDING_CONFIRMATION / CONFIRMED / EXPIRED / OCCUPIED); no continuous "tracking" analog to ambulance GPS — status-based, not location-based.

### 2.20 Notifications
| Event | Recipient | Channel |
|---|---|---|
| Hold placed | Requester, Hospital admissions queue | Push + in-app queue |
| ICU/Vent awaiting clinical ack | Hospital clinical lead | Push (high priority) |
| Confirmed | Requester, family, Ambulance module (if linked) | Push + Timeline |
| Hold expiring soon (5 min warning) | Requester | Push |
| Hold expired/released | Requester, Hospital admissions | Push |
| Inventory stale flag raised | Hospital administrator | Push/email to admin |

### 2.21 Status Definitions
`AVAILABLE (inventory-level) ` | Hold: `PENDING_CONFIRMATION → CONFIRMED → OCCUPIED` | `EXPIRED` | `CANCELLED` | Hospital-level: `ACTIVE` | `STALE`

### 2.22 Error Handling
Race-condition handling is the critical error class here (see EF-02); all inventory-mutating operations must be atomic/transaction-safe at the database level, not merely application-logic-checked.

### 2.23 Edge Cases
- Hospital briefly goes offline (power/connectivity) mid-surge — should not silently show as zero-availability; should show "last known, unconfirmed" state distinctly rather than falsely implying no capacity.
- Mass-casualty/epidemic surge causes simultaneous holds across many hospitals from many ambulances — module must support a "surge mode" where hold windows and ranking logic adjust (documented as Future Enhancement trigger, flagged for Phase 1.5 if surge volume in pilot geographies warrants it).

### 2.24 Offline Behaviour
Hospital-side inventory updates queue offline and sync on reconnect (rare but relevant for remote facilities); citizen-side search falls back to last-cached inventory snapshot with an explicit "may be outdated" indicator — never silently stale.

### 2.25 Low Network Behaviour
Per GT-04: text-first bed availability summary before rich hospital profile content loads; SMS confirmation of hold/confirm status as fallback channel.

### 2.26 Accessibility / 2.27 Localization
Per GT-09 and GT-05 respectively; no material deviation from standing requirements.

### 2.28 Security Requirements
Hospital-side inventory update endpoints require hospital-scoped authentication with role-based write permissions (admissions staff vs. clinical lead vs. administrator); HMS webhook ingestion requires signed payloads and IP allowlisting per hospital.

### 2.29 Privacy Requirements
Aggregate regional capacity views (for government) must be de-identified from individual patient/case data — government sees counts and trends, not who is in which bed, unless a specific regulatory reporting requirement (e.g., notifiable disease) explicitly overrides this, which must be modeled as a distinct, audited consent/legal pathway, not a default.

### 2.30 Audit Requirements
Every inventory change, hold, confirmation, and release logged with actor and timestamp; critical for both medico-legal defense and hospital billing/insurance reconciliation disputes.

### 2.31 Reporting Requirements
Hospital-level SLA compliance (update freshness, confirmation speed), regional capacity trend reports, surge-readiness reports for government stakeholders.

### 2.32 Analytics
Hold-to-confirmation conversion rate, hold expiry rate (signals process friction if high), time-to-confirmation by hospital, category-level scarcity heatmaps (which bed types are chronically scarce in which regions — a strategic capacity-planning input for government/investment stakeholders).

### 2.33 Integration Requirements
Ambulance module (pre-check/hold), Insurance module (network-fit scoring), Case/Timeline core, Hospital HMS systems (where available), Government health data reporting systems.

### 2.34 External APIs
Hospital HMS/EHR integration APIs (varies by hospital's existing vendor — HL7/FHIR where available), government health surveillance reporting APIs (for notifiable conditions/surge reporting), SMS gateway.

### 2.35 Future Enhancements
Predictive bed-availability forecasting (using discharge patterns to predict availability 2-6 hours ahead, not just current snapshot); individual bed/room-level tracking; automated HMS bi-directional sync for all onboarded hospitals (removing manual update dependency).

### 2.36 Success Metrics
- % reduction in "arrived with no bed" transfer incidents (the core mission metric for this module)
- Median time from search to confirmed hold
- Inventory freshness (% of hospitals updated within staleness window)
- Hold-to-actual-occupancy accuracy (measures trust reliability of the data)

### 2.37 Open Questions
- OQ-01: Incentive/participation model for hospitals to keep inventory current — a business model question with direct product dependency (an under-incentivized network produces stale, untrustworthy data that undermines the entire module's purpose).
- OQ-02: Should Phase 1 include a manual verification call-back for CRITICAL cases as a trust backstop until data quality is proven at scale?
- OQ-03: Legal liability if a "confirmed" bed hold turns out incorrect due to hospital-side data error — needs contractual terms with onboarded hospitals.

---

## MODULES 3–9 — CONDENSED SPECIFICATIONS

*(These follow the identical 37-section / FR-template structure as Modules 1–2. Sections that are functionally identical to the Golden Thread standing requirements (Part A7) or structurally identical to Module 1/2's treatment are referenced rather than re-written, per the note at the top of Part B. All are equally implementation-normative; QA should treat "see GT-0X" as a literal test-case pointer, not an omission.)*

## MODULE 3 — DOCTOR AVAILABILITY

**Overview & Objective:** Coordinates real-time doctor availability (in-hospital, clinic, home-visit, teleconsult) so a Case can be matched to the right specialist quickly, not just "a doctor is listed."

**Problems Solved:** Directory listings show doctors who aren't actually available; no way to match specialty to symptom severity from the Ambulance/Case triage data; no case-linked continuity (patient repeats history to every new doctor).

**Stakeholders/Personas:** Patient/Family, Doctors (hospital-employed, independent, telemedicine-only), Hospital Scheduling Staff, Insurance (network-doctor check).

**Functional Scope:** Doctor search by specialty/availability/location/language spoken, slot booking (walk-in queue token, scheduled appointment, teleconsult), case-linked doctor assignment (auto-suggested when a Case has an active ambulance/bed leg), doctor-side calendar/availability management.

**Out of Scope:** Doctor licensing/credential verification workflow (assumed handled by an onboarding/compliance process feeding a verified-doctor registry into this module, not built here); e-prescription authoring (feeds Pharmacy module, but prescription UI/clinical documentation itself is Phase 2).

**Key Business Rules:** A doctor's real-time availability status (with patient/in surgery/available) must be distinct from calendar-slot availability — both are tracked, because a "free slot" doctor can still be functionally unavailable right now for an urgent in-person need. Case-linked urgent requests bypass normal queue ranking to the AI-matched best-available specialist.

**Representative FR (FR-DOC-001):** System shall auto-suggest a specialist match when a Case's severity/triage category implies a specialty (e.g., cardiac symptoms → cardiologist) at the point the Case transitions to STABILIZED, using the same AI Best-Match composite scoring as Modules 1-2 (P0; Actor: AI Coordination Layer; Dependency: Case Timeline severity data, GT-01/GT-02).

**Booking/Tracking/Notifications/Status:** Structurally identical pattern to Module 2 (§2.18-2.21): Search → Hold slot/queue-token → Confirm → Status (`REQUESTED → CONFIRMED → IN_CONSULTATION → COMPLETED → CANCELLED/NO_SHOW`).

**Security/Privacy/Audit/Accessibility/Localization/Offline/Low-Network:** Per GT-01 through GT-10, plus: consultation notes are the most sensitive data class in the platform and require the strictest consent-scoping (GT-07) — a teleconsult recording/notes must never be visible outside the specific case's authorized care team without explicit re-consent.

**Integration:** Case/Timeline core, Ambulance (post-stabilization handoff), Beds (in-hospital doctor rounding schedule awareness — Phase 2), Pharmacy (prescription handoff), Insurance (network-doctor check).

**Success Metrics:** Time from Case stabilization to specialist assignment; teleconsult completion rate in low-connectivity zones; no-show rate.

**Open Questions:** Doctor credential/registry source-of-truth ownership (National Medical Commission integration feasibility); teleconsult clinical liability framework.

---

## MODULE 4 — NEARBY HOSPITALS

**Overview & Objective:** The general-purpose hospital discovery layer — functionally the "reference index" that Ambulance (Module 1) and Bed (Module 2) modules query for candidate hospitals, and that citizens use directly for non-emergency exploration (facility info, specialties offered, accreditation).

**Problems Solved:** No single trustworthy, current directory of hospital facilities/specialties/accreditation exists today for citizens to reference during decision-making, especially in tier-2/3 geographies where word-of-mouth is currently the primary discovery mechanism.

**Functional Scope:** Hospital profile data (specialties, accreditation e.g. NABH, facility type govt/private/trust, contact, operating hours), proximity search, specialty-based filtering, cross-reference links into live Bed/Doctor availability (this module never duplicates live capacity data — it always calls Module 2/3 for that, avoiding data-consistency drift between two "availability" sources).

**Out of Scope:** Patient reviews/ratings marketplace (Phase 2 — requires moderation infrastructure and carries reputational-risk considerations needing separate policy design); live bed/doctor data ownership (lives in Modules 2/3, this module only links to it).

**Business Rules:** Hospital profile data must be independently verifiable/sourced (government registry, NABH accreditation database) rather than solely operator-self-reported, given its role as a trust foundation for the entire platform.

**Representative FR (FR-NBH-001):** System shall display, for any hospital profile, a live-linked (not cached-duplicate) summary of current bed/doctor availability sourced in real time from Modules 2 and 3 (P0; Dependency: Module 2 FR-BED-002, Module 3 search).

**Search Filters:** Specialty, accreditation, ownership type (govt/private/trust), distance, insurance network.

**Integration:** Modules 1, 2, 3, 7 (Insurance) as primary consumers/data sources; government hospital registry API.

**Success Metrics:** Directory data freshness/accuracy audit score; % of Ambulance/Bed matching decisions that successfully used this module's candidate set (validates its role as infrastructure, not just a citizen-facing feature).

**Open Questions:** Government hospital registry data quality varies by state — needs a data-partnership and verification workflow before this module can be trusted as ground truth nationally.

---

## MODULE 5 — PHARMACY LOCATOR

**Overview & Objective:** Locates pharmacies with real-time medicine stock visibility, primarily to close the loop after a Case reaches post-admission/discharge stage (prescription fulfillment), and secondarily for standalone/non-case medicine search.

**Problems Solved:** Families run between multiple pharmacies searching for specific medicines/stock during a crisis or for chronic-condition refills; no visibility into which pharmacy actually has a specific prescribed item in stock right now.

**Functional Scope:** Pharmacy search by location/24-hour-operation, medicine-specific stock query (where pharmacy inventory integration exists), prescription-linked fulfillment request (case-linked, pulling the prescription captured in Module 3), reservation/hold on stock (similar pattern to Module 2's bed hold, applied to inventory units).

**Out of Scope:** Home delivery logistics (Phase 2, would require its own delivery-coordination module akin to Ambulance's dispatch pattern); controlled-substance/narcotics dispensing workflow (requires separate regulatory-compliant handling, explicitly flagged, not built in Phase 1).

**Business Rules:** Stock-hold expiry windows are shorter than bed holds (default 60 minutes) given lower criticality/higher inventory turnover; prescription-linked requests must validate against Module 3's issued prescription record to prevent fraudulent/duplicate fulfillment claims.

**Representative FR (FR-PHR-001):** System shall allow a case-linked prescription fulfillment search that pre-fills medicine names/quantities from the Module 3 consultation record, ranking pharmacies by stock confirmation + distance (P0; Dependency: Module 3 prescription record, GT-01).

**Status Definitions:** `SEARCHING → STOCK_CONFIRMED_HOLD → FULFILLED (in-store pickup)` | `EXPIRED` | `OUT_OF_STOCK`

**Security/Privacy:** Prescription data is sensitive health information requiring the same consent-scoping rigor as Module 3's consultation notes (GT-07); pharmacy sees only the specific case's prescription, not the patient's broader medical history.

**Integration:** Module 3 (prescription source), Case/Timeline core, pharmacy inventory management systems (varies by chain vs. independent pharmacy maturity — same "partial digital maturity" assumption as Module 2's hospitals).

**Success Metrics:** Prescription-to-fulfillment time; stock-hold accuracy (held vs. actually available at pickup).

**Open Questions:** Independent (non-chain) pharmacy inventory integration feasibility at tier-2/3 scale — likely requires a lightweight manual-update path analogous to Module 2's hospital fallback.

---

## MODULE 6 — BLOOD BANK

**Overview & Objective:** Coordinates blood/blood-component availability and donor-matching across blood banks and voluntary donor networks, with the tightest coupling to Ambulance/Case severity of any non-primary module (trauma, obstetric emergencies, surgery cases frequently need blood on short notice).

**Problems Solved:** Rare blood-type shortages force families into frantic social-media donor appeals during crises; no coordinated view across blood banks of actual component-level stock (whole blood vs. platelets vs. plasma vs. specific rare types); voluntary donor networks are informal/WhatsApp-group-based with no reliability signal.

**Functional Scope:** Blood bank stock search by type/component, case-linked automatic pre-alert (per AI Coordination Layer §A4 — proactively alerting blood banks for trauma/obstetric-flagged CRITICAL cases before explicit request), voluntary donor registry with eligibility/cooldown tracking, donor-request matching and notification, reservation/hold on stock units.

**Out of Scope:** Blood bank internal lab/testing/processing workflow (this module coordinates availability and requests, not blood-bank internal operations); donor health-screening clinical workflow (assumed handled by blood bank's own process upon donor arrival).

**Business Rules:** A stock hold decrements available units immediately (same pattern as BR-01 in Module 2) and expires per a defined window; donor-matching respects a minimum donation-interval cooldown (WHO/NACO guideline-based, e.g., 90 days for whole blood) enforced by the system, not merely advised; rare blood type matches escalate to widest-radius donor search automatically.

**Representative FR (FR-BLD-001):** System shall automatically create a pre-alert (not a committed request) to blood banks near a candidate hospital when a Case is flagged trauma/obstetric/surgical by the AI Coordination Layer, so component availability can be verified proactively before an explicit request is made (P1; Actor: AI Coordination Layer; Dependency: Module 1 severity classification, GT-02).

**Status Definitions:** `STOCK_SEARCH → HELD → CONFIRMED → DISPENSED` | Donor-request: `DONOR_MATCHED → DONOR_CONFIRMED → DONATION_COMPLETED` | `EXPIRED/DECLINED`

**Security/Privacy:** Donor personal/health eligibility data (e.g., last donation date, deferred status) is sensitive and must not be exposed to requesters — requesters see match confirmation only, never donor identity/health data directly (GT-07), with introduction/contact mediated by the blood bank, not peer-to-peer by default.

**Integration:** Module 1 (Ambulance/Case severity trigger), Module 2 (receiving hospital linkage), blood bank inventory systems, NACO (National AIDS Control Organisation)/state blood transfusion council registries where available.

**Success Metrics:** Time from request to confirmed unit; rare-type match success rate; donor registry growth and reliability (donation show-up rate).

**Open Questions:** Donor privacy/consent framework for proactive matching outreach (opt-in registry design needed before Phase 1 launch, this is a prerequisite not an afterthought); regulatory relationship with state blood transfusion councils varies by state.

---

## MODULE 7 — HOSPITAL INSURANCE MAPPING

**Overview & Objective:** A cross-cutting utility module (not a standalone citizen journey) that maps which hospitals are in-network/cashless for which insurance providers/policies, and surfaces pre-authorization status — consumed by Modules 2, 3, 5, 9 at their decision points rather than being a destination in itself.

**Problems Solved:** Families discover network status only after arriving at a hospital, sometimes forcing a costly out-of-network transfer during a crisis; pre-authorization paperwork delays admission during Golden Hour; no visibility into pre-auth status in one place.

**Functional Scope:** Insurance policy linkage to a citizen's profile, hospital-insurer network mapping data, cashless-eligibility check surfaced inline within Bed/Doctor/Diagnostics/Cancer-Hospital search results (not a separate search), pre-authorization request initiation and status tracking (AI-assisted pre-fill per §A4), claims-readiness document checklist generation.

**Out of Scope:** Actual claims processing/settlement (remains with the insurer's own systems — this module tracks status and facilitates initiation, not adjudication); insurance policy sales/comparison (not an insurance marketplace, explicitly out of the coordination-platform philosophy).

**Business Rules:** Cashless-network status shown to citizens must carry a "last verified" timestamp given how frequently insurer-hospital network agreements change, to avoid the platform being blamed for stale-data-driven denial at admission; pre-authorization requests auto-attach available Case data (triage, admitting diagnosis category, hospital) to reduce family paperwork burden, but require explicit family/patient consent before submission (GT-07) since it involves sharing health data with a third-party insurer.

**Representative FR (FR-INS-001):** System shall display a real-time (or last-verified-timestamped) cashless network-status flag inline wherever a hospital/diagnostic-center/cancer-hospital is shown in search results, sourced from the insurer's network data feed where integrated (P0; Dependency: Modules 2/3/5/8/9 as display consumers, GT-07 for consent on any deeper linkage).

**Status Definitions (Pre-Auth):** `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / PARTIALLY_APPROVED / DENIED → CLAIM_INITIATED`

**Security/Privacy:** Insurance policy numbers and pre-auth health-data payloads are high-sensitivity; strict consent-scoped sharing (GT-07) with the specific insurer only, never broadcast to all network insurers.

**Integration:** Insurance provider APIs (varies significantly by insurer's digital maturity — assume a phased integration list, not universal day-one coverage), Modules 2/3/5/8/9 as inline consumers, Case/Timeline core (pre-auth status as a Timeline event).

**Success Metrics:** % of admissions with cashless status known before arrival (vs. discovered on-site); pre-authorization turnaround time; document-checklist completeness rate on first submission.

**Open Questions:** Insurer API integration coverage/sequencing (which insurers to prioritize for Phase 1 pilot); regulatory considerations (IRDAI) around a third-party platform facilitating pre-auth submission on the citizen's behalf.

---

## MODULE 8 — DIAGNOSTIC CENTERS

**Overview & Objective:** Coordinates discovery and booking of diagnostic tests (lab, imaging) typically as a post-consultation follow-through step in a Case, plus standalone health-checkup booking outside any case context.

**Problems Solved:** Fragmented discovery of which diagnostic center offers a specific test with fastest turnaround/nearest location/insurance coverage; no case-linked continuity (results don't flow back to the referring doctor/case automatically today).

**Functional Scope:** Test/panel search by type, center search by location/turnaround-time/accreditation (NABL), slot booking (home-sample-collection vs. center visit), case-linked test ordering (from Module 3's consultation), result availability notification and delivery back into the Case Timeline/Dashboard.

**Out of Scope:** Actual lab result interpretation/clinical reporting tooling (results are delivered as documents/data into the Case, not clinically analyzed by this module); home-sample-collection logistics dispatch (Phase 2, would reuse Ambulance-module-like dispatch patterns for phlebotomist routing).

**Business Rules:** A case-linked test order must reference the ordering doctor/consultation record (Module 3) for traceability; result delivery to the Case Timeline requires explicit patient consent captured at order time (GT-07), since results are highly sensitive.

**Representative FR (FR-DIAG-001):** System shall, upon result availability, push a notification and attach the result document to the originating Case Timeline, visible to the patient/family and the referring doctor if still an active case participant (P0; Dependency: Module 3 order linkage, GT-02, GT-07).

**Status Definitions:** `ORDERED → SLOT_BOOKED → SAMPLE_COLLECTED → PROCESSING → RESULT_AVAILABLE → DELIVERED_TO_CASE`

**Integration:** Module 3 (order source), Module 7 (insurance/cashless check), Case/Timeline core, diagnostic center LIS (Lab Information System) integration where available.

**Success Metrics:** Order-to-result turnaround time; result-delivery-to-case success rate (measures the "closing the loop" coordination promise, not just booking volume).

**Open Questions:** Standardized result-format ingestion across the highly fragmented diagnostic-center LIS landscape (a significant integration engineering effort, needs a phased standardization approach, likely PDF-first before structured-data-second).

---

## MODULE 9 — CANCER HOSPITALS

**Overview & Objective:** A specialized-care discovery and coordination layer for oncology, reusing the Nearby Hospitals (Module 4) and Bed/Doctor (Modules 2/3) machinery but with cancer-specific matching criteria (cancer type, treatment modality, tumor board availability, specific oncology accreditation) given the materially different decision-making burden a cancer diagnosis places on a family compared to a general admission.

**Problems Solved:** Families with a new cancer diagnosis face an overwhelming, high-stakes hospital-selection decision with no structured way to compare oncology-specific capability (not just "is there a bed") — treatment modality availability (surgical oncology, radiation, chemotherapy, bone marrow transplant), tumor-board/second-opinion access, and specialized-insurance/high-cost-treatment financial planning are the real decision drivers, none served by generic hospital search.

**Functional Scope:** Cancer-type-specific hospital/specialist matching, treatment-modality availability search (radiation therapy slot availability is itself a scarce-resource coordination problem similar to bed/blood), tumor-board/second-opinion request coordination, high-cost-treatment financial/insurance pre-planning support (heavier-weight version of Module 7's pre-auth flow given typically higher claim values and more complex approval chains), case continuity across a long-duration treatment journey (this Case is CHRONIC_MANAGEMENT type, spanning months, unlike Ambulance's minutes-to-hours case lifecycle).

**Out of Scope:** Clinical treatment-protocol recommendation (explicitly a clinical decision, platform coordinates access/logistics only, reinforcing the AI Layer's non-goal boundary from §A4 even more strongly here given the clinical stakes); palliative/hospice care coordination (Phase 2, flagged as a meaningful adjacent need identified during this spec's development — see Future Enhancements).

**Business Rules:** A CHRONIC_MANAGEMENT case type must support a materially longer-lived Case object with periodic re-engagement (treatment cycles, follow-up scans) rather than the close-on-resolution pattern of an emergency case — this is an explicit data-model variance from Modules 1-2's case lifecycle and should be treated as a first-class case_type behavior, not a workaround; radiation-therapy slot booking follows the same hold/expiry/atomic-decrement pattern as Module 2's bed booking (BR-01/02 pattern reused) given it is similarly a scarce, schedulable physical resource.

**Representative FR (FR-CAN-001):** System shall allow filtering cancer-hospital search by treatment modality availability (e.g., "has functioning radiation therapy unit with slot within 2 weeks") rather than only bed/specialty-type filters, reusing Module 2's inventory/hold pattern applied to treatment-equipment-slots as the underlying resource type (P0; Dependency: Module 2 pattern reuse, Module 4 hospital profile data).

**Status Definitions (Case-level, CHRONIC_MANAGEMENT):** `DIAGNOSIS_INTAKE → SPECIALIST_MATCHED → TREATMENT_PLANNING → ACTIVE_TREATMENT (cyclical, multiple sub-episodes) → SURVEILLANCE/FOLLOW_UP → RESOLVED/CLOSED` — materially different from Module 1's minutes-scale status machine, and engineering should not force-fit this into the emergency-case state model.

**Security/Privacy:** Cancer diagnosis is among the most sensitive data categories handled by the platform; consent-scoping (GT-07) must be especially conservative, including explicit control over whether even close family members see full diagnostic detail versus a summarized status, since disclosure preferences around cancer diagnoses are culturally and personally variable in a way emergency-case data typically is not.

**Integration:** Modules 2, 3, 4, 7 (heaviest reuse of existing module machinery of any Phase 1 module — deliberately, to avoid building parallel scarce-resource-booking logic twice), Case/Timeline core with CHRONIC_MANAGEMENT extensions.

**Success Metrics:** Time from diagnosis-intake to specialist match; treatment-modality slot booking success rate; case re-engagement/retention over a full treatment journey (a meaningfully different success signal than the speed-only metrics of the emergency modules).

**Open Questions:** Tumor-board/second-opinion coordination workflow ownership (is this a platform-mediated service or a referral-only pointer to hospital-run tumor boards?); whether CHRONIC_MANAGEMENT case type's long lifecycle needs its own dedicated Dashboard variant distinct from the emergency Case Dashboard described in §A3.1 — flagged as a product decision with UX implications, deliberately not resolved in this non-design document.

---

# PART C — CROSS-CUTTING ENGINEERING APPENDICES

## Appendix C1 — Standard Error Taxonomy (referenced by every module's §Error Handling)
- **Validation Errors** (4xx-class): malformed/missing required input — must return field-level, localized (GT-05) error messages, never generic "something went wrong."
- **Matching/Availability Errors**: no supply found (ambulance/bed/doctor/blood/slot) — must always pair with a next-best-action (widen radius, escalate to human, offer alternative), never a dead-end message.
- **Integration/Timeout Errors**: downstream system (HMS, insurer API, government registry) unresponsive — must degrade to cached/last-known data with a visible staleness indicator rather than blocking the user flow entirely, in line with GT-04.
- **Consistency/Concurrency Errors**: race conditions on scarce-resource holds (beds, blood units, radiation slots) — must be prevented via atomic/transactional operations at the data layer, not merely detected after the fact; user-facing message must always offer immediate re-ranked alternatives per Module 2 EF-02.

## Appendix C2 — Data Model Note on `case_id` Universality
Per GT-01, every scarce-resource-hold object across Modules 1, 2, 5, 6, 9 shares a common abstract shape:

```
ResourceHold {
  hold_id, case_id, resource_type, resource_owner_id,
  status, held_at, expires_at, confirmed_at,
  requires_secondary_ack: boolean   // true for ICU/Vent, false for General beds, etc.
}
```

Engineering should strongly consider implementing this as a shared underlying service/table (a generic "Scarce Resource Coordination Engine") consumed by all five modules rather than five independent booking systems, since the hold/expire/confirm/atomic-decrement pattern (Module 2 §2.11, reused explicitly in Modules 1, 6, 9) is functionally identical across all of them. This is the single highest-leverage architectural recommendation in this document: **build the coordination engine once, configure it five ways** — this is what actually makes the platform "coordinated" at the engineering level, not just at the marketing level.

## Appendix C3 — Chapters Not Yet Expanded to Full FR-Table Depth
Modules 3–9 are specified at chapter/section-summary depth in this version. Before implementation sprint planning for any of Modules 3–9, that module should receive the same full FR-ID-table treatment as Modules 1–2 (target: 15-25 individually numbered FRs per module, matching the density demonstrated in §1.11/§2.11). This is flagged explicitly rather than silently implied, so it is tracked as a concrete next deliverable rather than lost in document scope.

---

# PART L — TECHNICAL ARCHITECTURE SPECIFICATION (MVP → SCALE)

This section is the engineering-facing counterpart to Parts A–K, written for a solo/small founding team building toward a fundable MVP, without requiring a rewrite as the platform scales. It formalizes GT-11 (fallback-first) and the WhatsApp/IVR-first reframing of GT-04, both introduced during architecture review.

## L1. Guiding Principles (in priority order)

1. **Accuracy before speed, speed before polish.** A fast wrong answer (a bed that isn't really available) is worse than a slightly slower correct one. Every optimization in this spec must preserve correctness first.
2. **Every dependency has a fallback; every fallback is visible.** Formalized as GT-11. No silent degradation.
3. **Zero friction for provider data updates.** If updating data feels like admin work, providers stop doing it, and the platform's core trust asset (live, accurate data) collapses. Design for WhatsApp-simple, not portal-first.
4. **Meet citizens where they already are.** WhatsApp, SMS, IVR, and UPI-style single-action confirmation are first-class citizen surfaces, not degraded fallbacks — per the revised GT-04.
5. **Solo-buildable now, extractable later.** Favor direct, synchronous, boring code over distributed patterns until a real operational reason forces the split. Every module boundary is drawn so that splitting it out later is a deployment change, not a rewrite.
6. **India-first, global-ready — but not global-now.** Architecture must not hardcode India-only assumptions into the core data model (currency, phone format, regulatory framework), but no work is spent building out multi-country support until there is a real second market. This is a naming/abstraction discipline now, not a feature build now.

## L2. Citizen & Provider Entry Points (Revised)

| Channel | Citizen use | Provider use | Role |
|---|---|---|---|
| **WhatsApp Business API** | Request ambulance, check case status, confirm bed/blood, receive Timeline updates | Update bed/stock/fleet counts via structured message or one-tap reply | **Primary channel for both**, not a fallback |
| **Native app (React Native)** | Full experience: live tracking map, Case Dashboard, richer search/filter | Full Provider Portal experience for power users | Primary for engaged, retained users |
| **IVR / SMS** | Voice-first request in regional language; SMS status updates | Simple numeric-code stock updates ("Reply 1 for ICU, 2 for General") | Fallback for zero-smartphone/low-literacy citizens and low-digital-maturity providers |
| **Web Provider Portal / Admin Console** | — | Full dashboard, reports, analytics (Part F, G) | Power-user / back-office surface, not the default update path |

All four channels write to the **same Case object and same provider data model** — there is exactly one source of truth regardless of entry point, enforced by having every channel call the same backend API Gateway, never a channel-specific data path.

## L3. High-Level Component Architecture (MVP Shape)

- **Entry layer:** Mobile app (React Native/Expo), WhatsApp Business API webhook, IVR/SMS gateway (Exotel) — all terminate at one **API Gateway**.
- **Backend:** One deployable **NestJS modular monolith** (Part L4's module boundary rules), running on **Cloud Run**, horizontally scaled behind a load balancer (2+ instances minimum from day one — this alone removes the single-point-of-failure risk of "one server").
- **Core spine:** Case Engine + Resource Coordination Engine (Appendix C2) — the only cross-module dependency every module is allowed to take directly.
- **Cross-module communication for MVP:** **Direct, synchronous in-process calls** behind clean interfaces (e.g., `AmbulanceService` calls `BedsService.precheck()` directly) — not an event bus. This is a deliberate simplification from the original design for solo-operability (see L1.5); the event bus is reserved as a **defined seam**, not built now (see L7).
- **Data layer:** One **Cloud SQL (Postgres)** instance, one schema per module, plus a read replica for fallback reads (GT-11). **Memorystore (Redis)** for caching, hold-expiry timers, and rate limiting.
- **AI layer:** A single **AI Platform wrapper service** (Vertex AI / Gemini, per the credits/AI-tier rationale discussed earlier) that every module calls through — never called directly by individual modules — so the fallback behavior (L5) is enforced in one place, not reimplemented per module.

## L4. Module Boundary Rule (Unchanged, Restated)

Modules under `/modules/*` (Ambulance, Beds, Doctors, etc.) may depend on the Case Engine, Resource Coordination Engine, and shared services (Auth, Notifications, AI wrapper) — never on each other's internals. For MVP, calls between modules (e.g., Ambulance → Beds pre-check) are direct function calls through a defined service interface, not database reads into another module's schema. This preserves extractability (L7) while removing the event-bus operational burden until it's actually needed.

## L5. Fallback Matrix (Formalizes GT-11)

| Dependency | Primary | Fallback | Trigger | Visibility |
|---|---|---|---|---|
| AI matching/ranking | Vertex AI/Gemini composite score | Deterministic rule-based ranking (distance + capacity + reliability, no ML) | AI call timeout/error (>2s) | Logged as `ai_fallback_used` event; Platform Monitoring alert if rate exceeds threshold |
| Primary database read | Postgres primary | Read replica, served with a staleness flag if replica lag > threshold | Primary connection failure/latency spike | Staleness flag shown wherever data renders (never silent) |
| Push notification | FCM push | SMS (Exotel) | Push delivery failure or no device token | Delivery-status logged per channel |
| Native app | App UI | WhatsApp / IVR | App unreachable, low network (GT-04) | User always has a path to the same Case, never a dead end |
| Provider HMS integration | Automated API/webhook pull | WhatsApp/SMS manual update prompt | Feed silent for > staleness threshold (Module 2 BR-03 pattern, reused platform-wide) | Provider Portal + Console flag the source as `STALE`, not simply absent |
| Human coordinator escalation (GT-08) | Automated flow | Always-available manual escalation button/IVR option | Any point in any flow | Never conditionally hidden |

## L6. Provider Data Ingestion — Tiered, Configuration-Driven

To satisfy "few simple steps, no admin overhead," ingestion is designed in three tiers, selected during onboarding (Part G4) rather than requiring custom engineering per hospital:

- **Tier 1 — No digital system:** WhatsApp/SMS structured-reply updates (default, works for any provider from day one).
- **Tier 2 — Has an HMS but no API:** scheduled CSV/Excel pull from a shared folder or email, mapped via a **configuration form** (field-name mapping, update frequency) filled out once during onboarding — no bespoke code per hospital.
- **Tier 3 — Has an API or FHIR-compliant HMS:** connects through the Integration Hub's documented REST endpoint or FHIR adapter (Part H6).

All three tiers write into the same schema behind the same staleness/audit rules (Module 2 BR-03, GT-06) — the tier is an ingestion detail, invisible to the rest of the platform.

## L7. Scaling Path (Explicit, No Surprises Later)

1. **MVP (now):** One Cloud Run service, direct in-process module calls, one Postgres instance with per-module schemas, 2+ replicas behind a load balancer.
2. **First real scale trigger (e.g., Ambulance matching latency under load, or a second engineer joining):** Introduce the event bus (Redis Streams — not plain pub/sub, per the durability correction in this review — or Pub/Sub on GCP) *only* for the specific cross-module flows that need decoupling (starting with Ambulance→Beds pre-check). Interface stays the same; only the transport changes.
3. **Later scale trigger (real multi-city load):** Extract Ambulance and Beds (the two highest-load, most latency-sensitive modules) into independently deployed Cloud Run services, each still on the shared Postgres instance initially, then optionally on split databases.
4. **Multi-region / DR (only when justified by real usage, not preemptively):** Add a secondary region for the IVR/SMS fallback path first (since that's the path meant to survive when the primary app path fails), before considering full multi-region app deployment.

No step requires rewriting a module — each step only changes *how* modules are deployed and *how* they talk to each other, never *what* they do.

## L8. Made-in-India, Built-for-Global (Later, Not Now)

No global build work happens now. The only requirement today is that the **data model doesn't quietly bake in India-only assumptions** that would force a rewrite later:

- Phone numbers, addresses, and currency fields stored in internationalized formats (E.164 for phone, ISO 4217 for currency) from day one — costs nothing extra now, prevents a painful migration later.
- Localization (GT-05) already built as a language-pack pattern, not hardcoded strings — adding a tenth language later is content work, not engineering work.
- Regulatory capabilities (Part H) are already modeled as a **configurable capability layer** (Consent Service, Data Classification) rather than DPDP-specific code — a future market's regulatory framework (e.g., GDPR) becomes a new configuration of the same Consent Service, not a new system.
- No other global-readiness work (multi-currency payments, multi-country provider onboarding, additional regulatory integrations) is in scope until there is a funded, named second market.

## L9. Tech Stack Summary (Consolidated)

| Layer | Choice |
|---|---|
| Backend | NestJS (TypeScript), modular monolith |
| Database | Cloud SQL (Postgres), schema-per-module |
| Cache/Queue | Memorystore (Redis) |
| Mobile | React Native (Expo), single app, Android-first |
| Provider/Admin web | Next.js |
| AI | Vertex AI / Gemini, via single wrapper service with fallback |
| Messaging | WhatsApp Business API (primary), Exotel (SMS/IVR fallback) |
| Maps | Google Maps Platform |
| Infra | Google Cloud Platform, asia-south1 (Mumbai), Cloud Run |
| Auth | Firebase Auth or Auth0 |

---

> ### Added for AI Implementation

# PART M — AI IMPLEMENTATION CONTRACT

This part exists so that a coding agent (Claude Code, Codex, Gemini, Cursor, Windsurf, RooCode, OpenHands, or a human engineer) can implement this specification with minimal ambiguity and minimal need to re-derive decisions already made elsewhere in this document. Every rule below is binding for all modules (Part B), all portals (Part F), and the Admin Console (Part G) unless a module explicitly overrides it — and any override must be justified against the Golden Thread requirements (Part A7) and the fallback-first principle (GT-11).

**How to use this Part as a coding agent:** before implementing any FR, read (1) the FR itself in Part B, (2) its "Added for AI Implementation" metadata block if one exists nearby, (3) the relevant convention sections below (M0, M4–M24), and (4) Appendix C2 if the FR involves a scarce-resource hold. Do not invent a different pattern than what is specified here even if it seems locally simpler — consistency across modules is a first-class requirement of this platform (see Part D point 1).

> ### Added for AI Implementation
> ## M0. Contract Preamble — Binding on Every Coding Agent
>
> This entire document (Parts A–M) is the single source of truth. No coding agent (Claude Code, Codex, Gemini, Cursor, Windsurf, RooCode, OpenHands, Cline, or any future LLM-based engineer) may introduce a requirement, entity, API, or architectural pattern that is not derivable from this document. The following rules are binding across every module, portal, and service:
>
> 1. **Source of truth:** this Markdown file is authoritative over any assumption, training-data pattern, or convention an agent might otherwise default to. Where this document specifies a name, shape, or pattern, it wins.
> 2. **No guessing:** if a requirement is ambiguous or two sections appear to conflict, the agent MUST stop and request clarification rather than resolve the ambiguity silently. A resolved-by-assumption ambiguity is a defect even if the resulting code runs.
> 3. **Traceability to FR IDs:** every controller method, service method, and test MUST carry a `// Implements: FR-{ID}` (or `BR-{ID}` / `GT-{ID}` for business/standing rules) comment. Code with no traceable requirement is not part of this specification and should not be generated.
> 4. **Reuse shared services, never duplicate:** before implementing anything, check M20 (Reusable Shared Components). If a capability is listed there, call it — do not reimplement it locally, even partially, even "just for this module."
> 5. **Never duplicate business logic:** a business rule (BR-xx) is implemented exactly once, in the owning module's application layer (M2). Other modules consume it via the owning module's service interface or an emitted event (M6) — never by re-deriving the same logic independently.
> 6. **No placeholder implementations:** `TODO`, `throw new Error("not implemented")`, mock data returned from a production code path, or a hardcoded stub value are not acceptable deliverables for any FR marked P0 or P1. If a dependency is genuinely not yet available, the correct action is the documented fallback (GT-11 / Part L5), not a placeholder.
> 7. **Production-ready code only:** every merged unit includes error handling (M5), logging (M16), tests (M21), and satisfies the Definition of Done (M17) — there is no "first pass, polish later" mode in this specification.
> 8. **Maintain backward compatibility:** once an API version (`/v1/...`) or an event name (M6/M7) is published, it is never changed in a breaking way — new fields are additive and optional; breaking changes require a new version (`/v2/...`) or a new event name, never an in-place mutation of a contract already in use.
> 9. **Preserve module boundaries:** the `/modules/{x}` import restriction (M1) is absolute. An agent that finds itself wanting to import one module's repository into another module has misidentified the correct pattern — the correct pattern is always Part J's shared services, Part A2's Case Engine, or Appendix C2's Resource Coordination Engine.

## M1. Repository & Folder Structure

```
/repo
 ├─ /apps
 │   ├─ /api                    ← NestJS backend (the modular monolith, Part L3)
 │   ├─ /mobile                 ← React Native/Expo app (Citizen + Driver, single app per user decision)
 │   ├─ /provider-portal         ← Next.js (Part F)
 │   └─ /admin-console           ← Next.js (Part G)
 ├─ /packages
 │   ├─ /shared-types            ← generated from OpenAPI spec (see M7); consumed by mobile + web apps
 │   ├─ /shared-constants         ← enums shared across apps: CaseStatus, ResourceType, error codes (M5)
 │   └─ /ui-kit                   ← shared design-system components (provider-portal + admin-console only; mobile has its own)
 └─ /infra
     ├─ /terraform                ← Cloud Run, Cloud SQL, Memorystore definitions
     └─ /migrations                ← see M15
```

Inside `/apps/api/src`, the structure is exactly as defined in the earlier architecture discussion and is restated here as the binding convention:

```
/src
 ├─ /core                      ← Case Engine (Part A2), Timeline (Part A3.2) — GT-01/GT-02 live here
 ├─ /resource-coordination      ← Appendix C2 shared hold/expire/confirm engine — see M9
 ├─ /modules
 │   ├─ /ambulance               ← Module 1
 │   ├─ /beds                    ← Module 2
 │   ├─ /doctors                 ← Module 3
 │   ├─ /hospitals                ← Module 4
 │   ├─ /pharmacy                 ← Module 5
 │   ├─ /blood-bank                ← Module 6
 │   ├─ /insurance                 ← Module 7
 │   ├─ /diagnostics                ← Module 8
 │   └─ /cancer-hospitals            ← Module 9
 ├─ /providers                     ← Part F portal-facing controllers, one folder per portal (F3–F9)
 ├─ /admin                          ← Part G console-facing controllers
 └─ /shared-services                ← Part J: auth, notifications, ai, consent, audit, event-bus, maps
```

**Binding rule (restates L4):** files inside `/modules/{x}` may import from `/core`, `/resource-coordination`, and `/shared-services` only. A lint rule (`eslint-plugin-boundaries` or equivalent, configured in `/apps/api/.eslintrc`) MUST enforce this at build time, not only by convention — a coding agent must not rely on discipline alone.

## M2. Clean Architecture Convention (Per Module)

Every folder under `/modules/{x}` follows the same four-layer internal structure, in this order of dependency (outer depends on inner, never the reverse):

```
/modules/{x}
 ├─ /domain          ← entities, value objects, domain events (no framework imports)
 ├─ /application      ← use-case services (e.g. AmbulanceMatchingService), orchestrates domain + repositories
 ├─ /infrastructure    ← repository implementations (TypeORM/Prisma), external API clients
 └─ /interface          ← controllers (REST), event handlers, WhatsApp/IVR webhook adapters
```

A coding agent implementing a new FR should: define/extend the domain entity first, write the application-layer use case second, wire the controller last. This order is not stylistic — domain and application layers are what get reused when a module is later extracted per L7, so they must never import NestJS HTTP decorators or infrastructure clients directly.

## M3. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Module folder | kebab-case, matches Part B module name | `blood-bank` |
| Entity class | PascalCase, singular, matches Part B/Part L entity name exactly | `ResourceHold`, `AmbulanceRequest` |
| Service class | PascalCase + `Service` suffix | `AmbulanceMatchingService` |
| Domain event | past-tense, dot-namespaced, `{aggregate}.{event}` — see M6 | `ambulance_request.assigned` |
| REST endpoint | `/v1/{resource}/{id?}/{sub-resource?}`, plural nouns, matches FR's "APIs" metadata | `/v1/ambulance/requests/{id}/handoff` |
| Config key | `SCREAMING_SNAKE_CASE`, module-prefixed | `AMB_DISPATCH_SLA_SEC` |
| Feature flag | `ff.{module}.{capability}` | `ff.ambulance.ai_ranking` |
| Background job class | PascalCase + `Job` suffix | `ResourceHoldExpiryJob` |
| Database table | snake_case, module-schema-qualified | `ambulance.ambulance_requests` |
| FR traceability comment | every controller method carries `// Implements: FR-AMB-001` | — |

**Binding rule:** entity, event, and config-key names used in code MUST match the names given in each FR's "Added for AI Implementation" metadata block exactly — a coding agent must not silently rename `AmbulanceRequest` to `AmbulanceBooking` for stylistic reasons, since the FR tables, Appendix C2, and cross-module event contracts all depend on name stability.

## M4. API Design Conventions

- Versioned from day one: all endpoints under `/v1/`.
- Every mutating endpoint (`POST`, `PUT`, `PATCH`) that creates a case-linked or resource-hold object MUST accept and honor an `Idempotency-Key` header (see M13).
- Every response envelope: `{ data, meta, errors }` — `errors` is always an array (empty on success), never a bare string, so a coding agent can write one error-handling code path platform-wide.
- Pagination: cursor-based (`?cursor=...&limit=...`), never offset-based, for any list endpoint expected to grow unbounded (e.g., Case Timeline, Audit Logs).
- Every endpoint that reads scarce-resource availability (beds, blood, slots) MUST include a `data_freshness: { last_updated_at, is_stale }` field in the response per BR-03's staleness pattern — this is not optional per-endpoint, it is a platform-wide response-shape rule.
- OpenAPI spec is the source of truth for `/packages/shared-types` (M1) — generate, never hand-write, the mobile/web TypeScript client types.

## M5. Error Handling Conventions

Reuses and formalizes Appendix C1's error taxonomy into implementable error codes:

| Class | HTTP Status | Error Code Prefix | Example | Handling Rule |
|---|---|---|---|---|
| Validation | 400 | `VALIDATION_` | `VALIDATION_MISSING_LOCATION` | Field-level, localized message (GT-05) required |
| Matching/Availability | 200 (not an error — a valid empty result) with `data: { matches: [] }` and `meta.next_action` | `NO_MATCH_` (in `meta`, not `errors`) | `meta.next_action = "WIDEN_RADIUS"` | MUST always populate `meta.next_action`; never return a bare empty array (Appendix C1 rule: no dead-ends) |
| Integration/Timeout | 200 with `data` from cache + `meta.data_freshness.is_stale=true`, or 503 if no cached data exists at all | `INTEGRATION_TIMEOUT_` | — | Degrade per GT-11 fallback matrix (Part L5); never surface a raw upstream stack trace |
| Consistency/Concurrency | 409 | `CONCURRENCY_CONFLICT_` | `CONCURRENCY_CONFLICT_RESOURCE_ALREADY_HELD` | Response MUST include re-ranked alternatives in `data`, per Module 2 EF-02 |

All error codes live in `/packages/shared-constants/error-codes.ts` as a single enum — a coding agent adding a new error MUST add it there first, never inline a string literal.

## M6. Event Naming & Event Bus Contract

- Naming: `{aggregate_snake_case}.{past_tense_verb}` — e.g. `case.created`, `ambulance_request.assigned`, `resource_hold.expired`.
- Per L3/L4, MVP cross-module calls are **direct synchronous calls, not events**, except for the following, which MUST already be implemented as an in-process event emission (using NestJS `EventEmitter2` or equivalent) even before the durable event bus (L7 Step 2) exists — because these are the flows §A4 defines as auto-coordination chaining and Appendix C2 requires timeline emission for:
  - `case.created`, `case.status_changed`, `case.severity_classified` (GT-02 — every module listening to Case state MUST subscribe to these, never poll)
  - `resource_hold.created`, `resource_hold.confirmed`, `resource_hold.expired` (Appendix C2 shared engine)
- **Migration seam (per L7 Step 2):** the in-process `EventEmitter2` calls MUST be wrapped behind a `EventPublisher` interface (`/shared-services/event-bus`) with a single implementation today (`InProcessEventPublisher`) and a documented second implementation to add later (`RedisStreamsEventPublisher`) — a coding agent must not call `EventEmitter2` directly from module code; always call through this interface, so the L7 migration is a one-file swap.
- Every event payload MUST include `case_id` (nullable only for non-case flows, GT-01) and `occurred_at` (ISO 8601, UTC).

## M7. Contract Testing & Type Generation

- OpenAPI 3.1 spec generated from NestJS decorators (`@nestjs/swagger`) on every build.
- `/packages/shared-types` regenerated from that spec via CI step — mobile and web apps import from this package, never hand-declare API response shapes.
- Contract tests (using the generated OpenAPI spec against a Prism mock or equivalent) run in CI before any deploy — a coding agent changing a response shape MUST update the OpenAPI decorators, not just the TypeScript return type, or the contract test suite will fail by design.

## M8. AI Platform Wrapper Convention (Formalizes L3, L5)

- Single service: `/shared-services/ai/AiPlatformClient` — every module's "AI Assistant"/"AI Coordination Layer" call goes through this one client, never a direct Vertex AI/Gemini SDK call from within a module.
- Every method on `AiPlatformClient` MUST accept a `fallback: () => T` argument and MUST invoke it automatically on timeout (default 2000ms, configurable via `AI_TIMEOUT_MS`) or error — this is the single enforcement point for GT-11's AI fallback rule, so it cannot be forgotten per-module.
- Every fallback invocation MUST emit `ai_fallback_used` with `{ module, method, reason }` for Platform Monitoring (Part G11) — this is not optional logging, it is the mechanism by which GT-11's "invisible degradation is a defect" rule is enforced.
- The AI Coordination Layer's non-goal boundary (§A4: never an autonomous clinical decision) is enforced at this layer via a `capability` enum (`MATCHING_RANKING`, `TRIAGE_INTAKE`, `DOCUMENT_DRAFTING`, `SCHEDULE_OPTIMIZATION`) — a coding agent MUST NOT add a new capability value without an explicit product decision; `CLINICAL_DECISION` is a reserved, permanently disallowed value, enforced by a unit test asserting the enum does not contain it.

## M9. Resource Coordination Engine — Shared Implementation (Formalizes Appendix C2)

- **Binding rule:** Ambulance holds, Bed holds, Blood unit holds, Pharmacy stock holds, and Cancer-hospital treatment-slot holds MUST all be implemented as configurations of the single `/resource-coordination` module's `ResourceHold` entity and `ResourceCoordinationService` — a coding agent MUST NOT create a module-local `BedHold` or `AmbulanceOffer` table that duplicates hold/expire/confirm logic. If a module's hold semantics seem to need something the generic engine doesn't support, that is a signal to extend the generic engine (with a `resource_type`-scoped config), not to fork it.
- `ResourceCoordinationService` exposes exactly four operations: `createHold()`, `confirmHold()`, `releaseHold()` (manual), and the `ResourceHoldExpiryJob` (automatic, per M11) — every module-specific hold flow (FR-BED-003, FR-BLD-001, etc.) composes these four, never reimplements them.
- Atomicity requirement (restated from FR-BED-003's metadata, applies to all resource types): every `createHold()` call MUST be implemented with `SELECT ... FOR UPDATE` or optimistic locking against the owning inventory row. This is a Definition-of-Done blocker (M17) for every FR that calls `createHold()`.

## M10. Configuration & Environment Variable Strategy

- All `(default: X)` values named throughout Part B's Business Rules sections (e.g., Module 1 BR-01's 90 seconds, Module 2 BR-02's 30/120 minutes) MUST be implemented as runtime-configurable values sourced from the Configuration Management service (Part G16), with environment variables as the local/CI override mechanism only — never hardcoded constants in module code.
- Naming: `{MODULE_PREFIX}_{DESCRIPTIVE_NAME}`, matching the Config Keys column in each FR's metadata block.
- A single `/apps/api/src/config/config.schema.ts` (validated with `zod` or `joi` at boot) is the source of truth for every config key across every module — a coding agent adding a new configurable value MUST register it here, and the app MUST fail fast on boot if a required key is missing, never fall back to an undocumented in-code default.

## M11. Background Jobs & Scheduler Conventions

- Queue technology: BullMQ (Redis-backed), per L9.
- Every job class lives in the owning module's `/infrastructure/jobs` folder, registered centrally in `/shared-services/scheduler` for visibility (so Platform Monitoring, G11, can enumerate all scheduled work in one place).
- Retry strategy: exponential backoff, max 3 attempts, dead-letter queue for exhausted jobs — a job landing in the dead-letter queue MUST raise a Platform Monitoring alert (G11), since an unnoticed dead-lettered `ResourceHoldExpiryJob` means inventory silently never releases.
- The generic `ResourceHoldExpiryJob` (M9) is the only job permitted to expire holds — module-specific expiry timers are disallowed for the reason given in M9.

## M12. Caching Strategy

- Redis (Memorystore) is the only cache layer; no in-process memory caches for anything shared across instances (the platform runs 2+ replicas per L3 — an in-process cache would be inconsistent across them).
- Cache keys: `{module}:{entity}:{id}` e.g. `beds:inventory:{hospitalId}`.
- Search result caching (Module 2 FR-BED-002's 2-second P95 target) uses a short TTL (default 10s, `SEARCH_CACHE_TTL_SEC`) — short enough that staleness never contradicts the live-inventory promise the whole platform is built on (Part D point 2).

## M13. Idempotency Guidance

- Every endpoint listed as "mutating + case-linked or resource-hold-linked" in an FR's metadata MUST implement idempotency via the `Idempotency-Key` header (M4), stored in a dedicated `idempotency_keys` table (module-schema-qualified) with a TTL (default 24h).
- This is specifically critical for FR-AMB-001 (guest requests over unreliable networks, per GT-03's offline queue possibly double-submitting on reconnect) and every `createHold()` call (M9) — a coding agent implementing offline-queue sync (GT-03) MUST generate the idempotency key client-side at request-creation time, not at sync time, so a retried offline request never creates a duplicate Case.

## M14. WhatsApp / IVR / SMS Adapter Convention (Formalizes L2, L6)

- All three channels terminate at `/shared-services/messaging`, exposing a single internal interface (`MessagingChannelAdapter`) implemented once per channel (`WhatsAppAdapter`, `IvrAdapter`, `SmsAdapter`) — module code (e.g., `AmbulanceService`) never talks to Exotel or the WhatsApp Business API directly, only to `MessagingChannelAdapter`, so a coding agent adding a new channel later (e.g., a future regional messaging app) implements one adapter, not N module integrations.
- Inbound WhatsApp/SMS messages are parsed into the same DTOs used by the REST API controllers (e.g., a WhatsApp "ICU 2, General 8" reply maps to the same `UpdateBedInventoryDto` as `PUT /v1/providers/{id}/beds`) — this enforces L2's "one source of truth regardless of entry point" rule at the code level, not just conceptually.
- Provider Tier 1 ingestion (L6) — the structured WhatsApp reply parser — lives in `/modules/beds/interface/whatsapp-inbound.handler.ts` (and equivalent per resource-holding module), registered against the shared `MessagingChannelAdapter`, not a standalone script.

## M15. Database Migration Conventions

- One migration tool platform-wide (TypeORM migrations or Prisma Migrate — pick one at project start, do not mix).
- Migrations are schema-qualified and module-owned: a migration touching `beds.*` tables lives in `/modules/beds/infrastructure/migrations`, never in a shared/global migrations folder, so module extraction (L7) can eventually take its migration history with it.
- No migration may alter another module's schema. A migration that needs cross-module data (rare) goes through the owning module's repository, never a raw cross-schema `ALTER`.

## M16. Logging, Audit & Observability Conventions

- Structured JSON logging (never `console.log` strings) via a shared `/shared-services/logging` wrapper — every log line includes `case_id` (if applicable), `module`, `trace_id`.
- `trace_id` is generated at the API Gateway and propagated through every direct in-process call and every event payload (M6), so a coding agent debugging a cross-module chain (Ambulance → Beds pre-check → Blood pre-alert, §A4) can reconstruct the full path from one `trace_id`, per Part K5's observability requirement.
- Every write to a GT-06-audited entity goes through `/shared-services/audit`'s `AuditService.record()` — never a direct log statement — so Part G17's console-level audit search has one consistent data source.
- Health check endpoint (`GET /healthz`) required on every deployable (Part K, Availability) — checks Postgres connectivity, Redis connectivity, and AI Platform reachability (degraded, not failing, if AI is down, per GT-11).

## M17. Definition of Done (Per FR)

A Functional Requirement is not complete until all of the following are true — a coding agent should treat this as the literal exit checklist for any FR implementation task:

1. Domain entity/value objects implemented per M2, named exactly per the FR's metadata block.
2. Application-layer use case implemented, unit-tested (happy path + every Exception Flow listed in the module's §Exception Flows).
3. REST/event/WhatsApp interface implemented per M4/M6/M14 as applicable, matching the FR's "APIs"/"Events" metadata exactly.
4. OpenAPI decorators added; `/packages/shared-types` regenerates without manual edits.
5. Idempotency implemented if the FR is mutating + case/hold-linked (M13).
6. Config keys registered in `config.schema.ts` (M10), no hardcoded defaults.
7. Feature flag wired if listed in metadata, with the documented fallback behavior verified by an automated test (GT-11).
8. Audit logging verified for every state transition (GT-06/M16).
9. Concurrency test written if the FR touches `ResourceHold` or any counted inventory field (M9).
10. Acceptance test hints (from the FR's metadata block, where present) implemented as automated tests, not just manually verified.

> ### Added for AI Implementation
> **Additional Definition of Done items (cross-cutting, apply alongside items 1–10 above):**
> 11. Frontend complete (mobile and/or portal screens per Part F/G, as applicable to the FR) — a backend-only FR with no citizen/provider-facing surface is exempt.
> 12. Database migration written, reviewed against M23, and reversible (a `down` migration exists and has been tested).
> 13. API documented — OpenAPI decorators present (M7); no endpoint ships without a corresponding spec entry.
> 14. Observability added — metrics, tracing, and health-check coverage per M22, not just logging per M16.
> 15. Accessibility verified — automated a11y check (M21) passes for any new citizen/provider-facing surface, per GT-09.
> 16. Localization verified — no hardcoded user-facing string; translation keys present for all GT-05 languages (or explicitly flagged as pending translation content, which is a content gap, not a code gap).
> 17. Performance verified — the FR's stated acceptance criterion (e.g., FR-BED-002's 2-second P95) has a passing automated performance test (M21), not a manual spot-check.
> 18. Security verified — the endpoint(s) introduced by this FR have passed the SAST/DAST pass (M21/Part I10) with no unresolved high-severity findings.
> 19. Deployment verified — the FR has been exercised in a deployed (non-local) environment via the health-check endpoints (M22) before being marked done.

## M18. Implementation Sequencing (Module Dependency Graph)

Build order, respecting the dependency direction established in Part A5/A7 and Appendix C2 — a coding agent or engineering team should not start Module 6 before Module 1's core patterns are proven, since later modules reuse earlier ones' machinery rather than inventing new patterns:

1. **Foundation (blocking everything else):** `/core` (Case Engine), `/resource-coordination` (Appendix C2 engine), `/shared-services/auth`, `/shared-services/audit`, `/shared-services/event-bus` (in-process implementation per M6).
2. **Module 1 (Ambulance) + Module 2 (Beds):** built together, since FR-AMB-004 and §A4's auto-coordination chaining require both to exist — this pair also establishes the reference implementation pattern (`ResourceHold` usage, WhatsApp adapter usage, AI wrapper usage) that Modules 3–9 and Portals F3–F9 will copy.
3. **Hospital Portal (F3) + a minimal Admin Console onboarding flow (G4):** required before any real provider can supply live data — without this, Modules 1–2 have no real inventory to match against.
4. **Module 3 (Doctors), Module 4 (Nearby Hospitals):** next, as they're the next-most load-bearing per §A5.
5. **Remaining modules (5, 6, 7, 8, 9) and remaining portals (F4–F9):** each is additive per Part D point 1's design intent — implement in whatever order matches business priority, since by this point the shared engine (M9), AI wrapper (M8), and messaging adapters (M14) are already proven and each new module is primarily domain-specific logic, not new infrastructure.

**Explicit non-goal for a coding agent:** do not build the durable event bus (L7 Step 2), multi-service deployment (L7 Step 3), or multi-region (L7 Step 4) as part of implementing any Part B module — these are infrastructure milestones triggered by real operational need, not something to preemptively build "since we're implementing the architecture anyway" (see L1.5, L7).

> ### Added for AI Implementation
> ## M19. Module Dependency Matrix
>
> | Module | Depends On | Provides | Consumes (events) | Shared Services Used | Events Published |
> |---|---|---|---|---|---|
> | Core (Case Engine) | — (foundation) | `Case`, `Timeline` to every module | — | Audit, Consent | `case.created`, `case.status_changed`, `case.severity_classified` |
> | Resource Coordination | Core | `ResourceHold` to Ambulance/Beds/Blood/Pharmacy/Cancer | — | Audit | `resource_hold.created`, `.confirmed`, `.expired` |
> | 1. Ambulance | Core, Resource Coordination, Maps, AI Platform, Messaging | Dispatch, tracking, ER handoff | `case.created` | AI, Maps, Messaging, Notifications | `ambulance_request.assigned`, `case.triage_handoff_submitted` |
> | 2. Beds | Core, Resource Coordination, AI Platform, Insurance (read) | Bed search/hold/confirm | `case.severity_classified`, `ambulance_request.assigned` (pre-check) | AI, Messaging (Tier 1 ingestion) | `bed_inventory.updated`, `resource_hold.*` |
> | 3. Doctors | Core, AI Platform | Specialist search/booking | `case.status_changed` (STABILIZED) | AI, Notifications | `doctor_slot.booked` |
> | 4. Nearby Hospitals | Modules 2, 3, Insurance (read) | Hospital directory + live-linked availability | — | Search | — (read-mostly) |
> | 5. Pharmacy | Module 3 (prescription source), Resource Coordination | Stock search/hold/fulfill | `prescription.issued` | Messaging (Tier 1) | `resource_hold.*` (pharmacy-scoped) |
> | 6. Blood Bank | Core (severity trigger), Resource Coordination | Stock/donor matching | `case.severity_classified` (trauma/obstetric flag) | AI, Messaging | `resource_hold.*` (blood-scoped) |
> | 7. Insurance | Core, Consent | Network status, pre-auth | `case.created` (pre-fill) | Consent, Document | `preauth.status_changed` |
> | 8. Diagnostics | Module 3 (order source), Insurance (read) | Test booking, result delivery | `doctor_slot.booked` (order) | Document | `diagnostic_result.delivered` |
> | 9. Cancer Hospitals | Modules 2, 3, 4, 7 | Modality/treatment-slot matching, CHRONIC_MANAGEMENT case handling | `case.severity_classified` | AI, Resource Coordination | `resource_hold.*` (treatment-slot-scoped) |
>
> This table is the authoritative answer to "can Module X import Module Y" — if a dependency is not listed in the "Depends On" column, it is not permitted (M0.9).

> ### Added for AI Implementation
> ## M20. Reusable Shared Components — Never Reimplement
>
> The following capabilities MUST be implemented exactly once, in the location shown, and consumed everywhere else. A coding agent encountering a task that resembles one of these MUST locate and extend the existing implementation rather than write a new one, even a small one:
>
> | Capability | Canonical Location | Never Reimplement In |
> |---|---|---|
> | Authentication | `/shared-services/auth` | Any module or portal |
> | Authorization (RBAC/ABAC) | `/shared-services/auth` (Part I7) | Any module or portal |
> | Notifications (push/SMS/IVR/WhatsApp dispatch) | `/shared-services/messaging` (M14) | Any module |
> | Case / Timeline | `/core` (Part A2, A3.2) | Any module |
> | Resource Hold (bed/ambulance/blood/pharmacy/treatment-slot) | `/resource-coordination` (Appendix C2, M9) | Any module |
> | Audit logging | `/shared-services/audit` (M16) | Any module |
> | Consent management | `/shared-services/consent` (Part I1) | Any module |
> | Search | `/shared-services/search` (Part J) | Modules 3, 4, 5, 6, 8, 9 individually |
> | AI matching / ranking / triage-intake | `/shared-services/ai` — `AiPlatformClient` (M8) | Any module |
> | Rules Engine (BR-xx thresholds) | `/shared-services/rules-engine` (Part J), config-driven per M10 | Any module hardcoding a threshold |
> | Configuration | `/apps/api/src/config` (M10) | Any module-local `.env` read |
> | Document storage (prescriptions, results, pre-auth, consent artifacts) | `/shared-services/documents` (Part J, Document Service) | Modules 3, 5, 7, 8 individually |
> | Maps / geocoding / ETA | `/shared-services/maps` (Part J) | Module 1 or any location-based search |
> | Voice (IVR) | `/shared-services/messaging` → `IvrAdapter` (M14) | Any module |
> | SMS | `/shared-services/messaging` → `SmsAdapter` (M14) | Any module |
> | WhatsApp | `/shared-services/messaging` → `WhatsAppAdapter` (M14) | Any module |
> | Payments | **Not built in Phase 1** (Part B Module 1 §1.7 Out of Scope) — when introduced, must be a shared service, never module-local, per this same principle |
>
> If a coding agent believes a new shared capability is needed that is not listed here, it MUST flag this as an open question (M0.2) rather than build it inline inside a module.

> ### Added for AI Implementation
> ## M21. Testing Strategy
>
> | Test Type | Scope | Required For | Tooling Convention |
> |---|---|---|---|
> | Unit | Domain + application layers (M2) | Every FR (M17 item 2) | Jest, one spec file per service/entity |
> | Integration | Module's infrastructure layer against a real (test) Postgres/Redis | Every FR touching persistence or `ResourceHold` | Testcontainers or equivalent — never mock the database for these |
> | API/Contract | Controller against the generated OpenAPI spec (M7) | Every endpoint | Prism mock validation in CI |
> | Concurrency | `ResourceHold` race conditions (M9, M17 item 9) | FR-BED-003 and every other `createHold()` caller | N-concurrent-request harness against a count-of-1 fixture |
> | End-to-End | Full user journey across modules (e.g., Ambulance request → Beds pre-check → confirmed hold, per §A4 chaining) | The primary Golden Hour flow (Part B §1.12) at minimum | Playwright (web), Detox (mobile) |
> | Failure/Fallback | Every row of the Part L5 fallback matrix | GT-11 compliance | Inject timeout/error, assert fallback fires + `ai_fallback_used`/equivalent logged |
> | Performance/Load | Part K1/K3 targets (P95 latency, 10x surge per Module 1/2 §Edge Cases) | Ambulance matching, Bed search, Resource Hold creation | k6 or equivalent, run in CI on a schedule, not only pre-release |
> | Security | OWASP Top 10 (Part I10), API auth/authz | Every externally-reachable endpoint | Automated SAST/DAST in CI + the vulnerability-management cadence in Part I10 |
> | Accessibility | GT-09 compliance (voice-first, screen-reader labels, large touch targets) | Every citizen-facing and provider-facing screen | Automated a11y linting (axe-core) + manual screen-reader pass before release |
> | Localization | GT-05 compliance (Hindi, English, 8 state languages) | Every citizen-facing string | Snapshot test per locale; missing-translation-key build failure |
> | Golden Path | The single primary journey per module (e.g., Module 1 §1.12) | Every module, before any Exception Flow work begins | Scripted E2E, run first, gates further module work |
> | Chaos | Simulated dependency failure (DB failover, Redis eviction, AI Platform outage) | Foundation layer (M18 step 1) before Module 1/2 go live | Scheduled game-day exercises, not ad hoc |
>
> **Binding rule:** the Golden Path test for a module MUST pass before that module's Exception Flow (§Exception Flows) or Edge Case (§Edge Cases) requirements are implemented — this mirrors M18's sequencing philosophy at the individual-module level.

> ### Added for AI Implementation
> ## M22. Observability Standards (Extends K5, G11, M16)
>
> - **Metrics:** every module emits, at minimum, request count, error rate, and P50/P95/P99 latency per endpoint (RED method), plus module-specific business metrics already named in each module's §Analytics section (e.g., Module 1's time-to-dispatch, Module 2's hold-to-confirmation rate) — these are not separate from the Part B Analytics requirements, they are that requirement's implementation.
> - **Tracing:** distributed tracing via OpenTelemetry, `trace_id` propagated per M16, exported to a tracing backend queryable from Platform Monitoring (G11).
> - **Health endpoints:** `GET /healthz` (liveness — process is up) and `GET /readyz` (readiness — Postgres/Redis/AI Platform reachable, per M16) are required on every deployable, distinct endpoints, not one combined check — Cloud Run's health-check configuration (Part L3) depends on this distinction.
> - **Dashboards:** one dashboard per module (business metrics + RED metrics) plus one platform-wide dashboard (Part K1–K4 targets) — dashboard-as-code (e.g., Grafana JSON checked into `/infra`) so dashboards are versioned alongside the code they observe.
> - **Alerts:** every SLA/BR threshold named in Part B (Module 1 BR-01's 90s, Module 2 BR-02/BR-03) has a corresponding alert rule, per G7's SLA Management capability — an alert with no owning on-call rotation is not considered implemented.

> ### Added for AI Implementation
> ## M23. Database Standards (Extends M15)
>
> - **Entity/table naming:** snake_case, module-schema-qualified (M3/M15), singular domain concept pluralized only at the table level (`ambulance_requests`, not `ambulance_request`).
> - **Audit columns:** every table includes `created_at`, `updated_at` (both `timestamptz`, UTC), `created_by`, `updated_by` (nullable for system-originated rows) — in addition to, not instead of, the append-only Timeline (§A3.2) and Audit Service (M16), since these columns serve row-level debugging while the Timeline/Audit Service serve case-level and compliance-level audit.
> - **Soft delete policy:** case-linked and audit-relevant entities (per Part I3's Data Deletion tension with Timeline immutability) use tokenization/anonymization of PII fields rather than a `deleted_at` soft-delete flag, per Part I3's resolution — a plain soft-delete flag is insufficient for DPDP erasure compliance and MUST NOT be used as the erasure mechanism. Non-PII, non-case operational data (e.g., a discontinued config value) may use conventional soft delete.
> - **Optimistic locking / versioning:** every entity subject to concurrent mutation (M9's `ResourceHold`, `HospitalBedInventory.available_count`) carries a `version` integer column, incremented on every update, checked in the `WHERE` clause of the update statement — this is the concrete implementation of the M9/M17 concurrency requirement.
> - **Foreign keys:** enforced at the database level within a schema (e.g., `ambulance.ambulance_requests.case_id` does NOT reference `core.cases.id` via a hard FK across schemas in the initial implementation, since cross-schema FKs reintroduce the coupling M1's boundary rule is designed to prevent — cross-module references are validated at the application layer via the Case Engine's service interface instead).
> - **Transactions:** every multi-statement mutation within a single module's schema is wrapped in a database transaction; no cross-module distributed transaction is used anywhere in this specification — cross-module consistency is achieved via the event-driven/eventually-consistent pattern (M6), never two-phase commit.
> - **Indexes:** every foreign-key-equivalent column (`case_id`, `hospital_id`, etc.) and every column used in a WHERE clause of a P0 FR's Main Flow (e.g., `HospitalBedInventory.hospital_id + category` for FR-BED-002's search) is indexed; this is a Definition-of-Done item (M17) for any FR with a stated latency acceptance criterion.

> ### Added for AI Implementation
> ## M24. AI Code Generation Guidance
>
> Direct, imperative guidance for any LLM-based coding agent generating code against this specification:
>
> - Never generate duplicate code for a capability listed in M20 — search the existing codebase for the canonical location first.
> - Prefer extending a shared library/service over adding module-local logic, even when the module-local version would be fewer lines of code today.
> - Reuse existing entities exactly as named in Part B's FR metadata blocks and M19's dependency matrix — do not introduce a synonymous entity (e.g., `Booking` alongside `ResourceHold`).
> - Generate production-ready code only, per M0.6/M0.7 — no placeholders, no mocked data paths left in production code.
> - Never invent an API endpoint not implied by an FR's "APIs" metadata or the OpenAPI spec (M7) — if a needed endpoint is missing from the spec, add the OpenAPI decorator and the metadata annotation to the relevant FR first, then implement, so the spec and code never diverge.
> - Never invent a database table not implied by an FR's "Entities" metadata or M19 — if a new entity is genuinely required, it must map to an existing module per the dependency matrix, and its schema must follow M23.
> - Stop and request clarification when requirements conflict, per M0.2 — this includes conflicts between an FR's business logic (Part B, immutable) and any implementation convention in this Part M; Part B always wins in such a conflict, and the conflict itself should be raised, not silently resolved by bending Part B.
> - Always preserve traceability to Functional Requirement IDs, per M0.3, in code comments, commit messages, and test names.



---

# PART D — STRATEGIC OBSERVATIONS (CPO-LEVEL, BEYOND THE BRIEF)

A few things worth naming directly, because a spec document that doesn't challenge its own brief isn't doing its job:

1. **The real product is the Coordination Engine (Appendix C2), not the nine modules.** If this platform is built as nine independent booking systems with a shared login, it will feel exactly like the fragmented status quo it's meant to replace. The Case object and the shared Resource Coordination Engine are the actual intellectual property here.

2. **Data trust is the make-or-break risk, not technology.** Every module (Ambulance supply, Bed inventory, Blood stock, Pharmacy stock, Insurance network status) depends on a third party keeping data current. Phase 1 success depends as much on a hospital/pharmacy/blood-bank participation and incentive model as on engineering — this should be tracked as a parallel Business/Partnerships workstream with the same seriousness as the engineering roadmap.

3. **The CHRONIC_MANAGEMENT case type (Module 9) is architecturally distinct enough that it deserves explicit acknowledgment now, not a retrofit later.** Building the Case model only around emergency's minutes-to-hours lifecycle will force an expensive rework when Cancer Hospitals (and eventually any chronic-disease management) needs a months-long, cyclical case lifecycle.

4. **Missing from Phase 1, worth flagging for Phase 1.5 sequencing discussion:** Mental health crisis coordination and Maternal/Obstetric emergency as a possible dedicated fast-path (obstetric emergencies have a distinct Golden-Hour profile from trauma and may warrant their own AI-classification branch rather than being folded generically into "CRITICAL").

5. **Golden Hour cannot be a Phase 1 feature that only works where digital and hospital participation maturity is high** — which is precisely the opposite of villages/tier-2/3 geographies named as the mission-first target. The offline/low-network/guest-flow requirements (GT-03, GT-04, GT-10) are not edge-case polish; they are the actual product for the stated first market, and should be resourced and tested with that priority, not treated as hardening work done after a metro-first build.

---

# PART E — PRODUCT ECOSYSTEM

Everything in Parts A–D specifies the **Citizen Mobile Application** and remains unchanged and fully authoritative. This section extends the platform definition to the two products required to make the Citizen experience real: someone has to keep availability data current on the provider side (Part F), and someone has to run, verify, and support the network on the operator side (Part G). All three products share one Case, one data model, and the shared services catalogued in Part J — they are three faces of a single platform, not three separate builds.

## E1. Product Ecosystem Overview

| Product | Primary Users | Core Job |
|---|---|---|
| Citizen Mobile Application | Citizens, patients, family/caregivers, bystanders | Create and follow a Healthcare Case (Parts A–D, unchanged) |
| Healthcare Provider Platform | Hospitals, doctors, ambulance operators, pharmacies, blood banks, diagnostic centers, insurers | Keep operational data (beds, slots, stock, fleet) current; execute and close out their leg of a Case |
| Platform Administration Console | Platform operations, support, trust & safety, compliance teams | Onboard and verify citizens/providers, keep the platform healthy, support both sides when coordination breaks down |

## E2. Why a Second and Third Product Are Architecturally Required, Not Optional

Part A established that the Citizen experience depends entirely on trustworthy real-time provider data (bed counts, blood stock, doctor availability). Part B's Open Questions repeatedly flagged this as the central risk (Module 1 §1.37 OQ-01 on liability, Module 2 §2.37 OQ-01 on hospital incentive/participation, Module 6 §6 OQ-01 on donor consent). The Provider Platform (Part F) is the direct product answer to that risk — it is the tool that makes GT-01/GT-02 (case linkage, timeline events) and BR-03-style staleness rules (Module 2 §2.8) enforceable in practice rather than aspirational. The Administration Console (Part G) is the direct product answer to the trust, onboarding, and support burden implied by GT-06 (audit), GT-07 (consent), and the "human coordinator escalation" requirement present in every module (GT-08).

## E3. Shared Foundations Across All Three Products

- All three products consume the same `case_id`-anchored data model (Part A2) and the same Resource Coordination Engine (Appendix C2).
- All three products draw from the same Shared Platform Services catalogue (Part J) rather than building parallel authentication, notification, or search stacks.
- All three products are bound by the same Golden Thread standing requirements (Part A7) where applicable to a provider/admin context — re-scoped per product below where the citizen-facing wording doesn't directly apply (e.g., GT-10's guest flow is citizen-only; GT-06's audit trail applies with equal force to provider and admin actions).

---

# PART F — HEALTHCARE PROVIDER PLATFORM

## F1. Provider Platform Overview
The Healthcare Provider Platform is the set of seven role-specific portals through which every non-citizen stakeholder named in Part A's Target Users list interacts with the platform. Its business objective is singular: **make it cheap and fast enough for a provider to keep their operational data current that the staleness problem named in every Part B module (Module 2 §2.8 BR-03, Module 5, Module 6) stops being the platform's primary failure mode.** Every portal below is a configuration of one common shell, not seven independent applications — see F2.

## F2. The Common Provider Portal Shell (Applies to All Seven Portals)

Per the new requirements, every provider portal must include twelve common capability areas. Rather than repeat generic definitions seven times, this section defines each capability once at the shell level; each portal's chapter (F3–F9) then specifies only what is *materially different* for that provider type — mirroring the referencing convention already established between Modules 1–2 and Modules 3–9 in Part B.

| Capability | Common Functional Definition | Portal-Specific Variance Pattern |
|---|---|---|
| **Dashboard** | Single landing view aggregating: today's operational summary, pending actions requiring provider response (an explicit "Next Action Needed" surface, mirroring the Citizen Case Dashboard's design intent in §A3.1), active case-linked bookings, and alerts (staleness warnings, SLA breaches). | Which operational metric anchors the dashboard varies (bed occupancy % for Hospital, fleet on-duty % for Ambulance, stock-out risk for Pharmacy/Blood Bank). |
| **Real-Time Operational Data Updates** | The provider-side mutation surface for the specific inventory type owned by that provider (see F1 table: beds, consultation slots, blood units, test slots, medicine stock, fleet status). Must support both manual update (low-digital-maturity path) and system/HMS-integration update (webhook ingestion), per the "partial digital maturity" assumption already established in Module 2 §2.9 and reused unchanged here. | Data schema per inventory type (see individual portal FRs). |
| **Availability Management** | Configuration of recurring availability patterns (operating hours, standing capacity, holiday/blackout dates) distinct from moment-to-moment stock/slot updates — this is the "policy" layer sitting above the "live count" layer. | Doctor Portal's calendar-slot model differs structurally from Hospital's category-count model (Module 3 §3 vs. Module 2 §2.11 pattern). |
| **Booking Management** | Provider-side view and action surface for incoming holds/requests generated by the Citizen App's Resource Coordination Engine (Appendix C2): accept, confirm, decline-with-reason, escalate. Mirrors Module 2 §2.11 FR-BED-003's confirmation step and Module 1 §1.11 FR-AMB-002's accept/decline pattern, generalized across all five hold-capable resource types. | Two-step clinical acknowledgment (Module 2 BR-04) applies only to Hospital ICU/Ventilator bookings and Blood Bank rare/urgent matches. |
| **Healthcare Case Management** | Read access (per GT-07 consent scoping) to the subset of an active Case relevant to that provider's leg of coordination — e.g., a Hospital sees triage handoff and bed/doctor legs; a Pharmacy sees only the prescription-fulfillment leg (Module 5 §5, FR-PHR-001). Never full-case visibility by default. | Scope of visible Case fields differs per provider type; defined per portal below. |
| **Notifications** | Provider-side delivery of the notification events already defined per module in Part B (e.g., Module 1 §1.20, Module 2 §2.20) — this is the receiving end of those tables, not a new event catalogue. | Channel mix (push/SMS/email/in-portal queue) configurable per provider based on digital maturity. |
| **Reports** | Scheduled and on-demand operational reports specific to that provider (SLA compliance, utilization, financial reconciliation references). Reuses the Reporting Requirements already defined per module (e.g., Module 1 §1.31, Module 2 §2.31) as the provider-facing rendering of that same data. | Report catalogue per portal, listed below. |
| **Analytics** | Self-service analytics over the provider's own operational and coordination data (reuses Analytics sections already defined per module, e.g. Module 2 §2.32), plus benchmarking against anonymized zone/category peers where the provider opts in. | — |
| **AI Assistant** | A provider-facing instance of the AI Coordination Layer (§A4), scoped to that provider's operations: for a Hospital, this means demand forecasting and staffing/capacity suggestions; for a Doctor, this means intelligent schedule optimization; for a Pharmacy, reorder-point stock suggestions. Same non-goal boundary as §A4 applies without exception: the AI Assistant never makes a clinical decision on the provider's behalf. | Assistant capability set is provider-specific; representative FRs given per portal. |
| **User Management** | Provider-side administrator manages staff accounts, roles, and access within their own organization (e.g., a Hospital Administrator adds Admissions Staff and Clinical Lead users per the roles already defined in Module 2 §2.15). | Role catalogue per portal, extending (not replacing) the permission tables already defined in each Part B module. |
| **Configuration** | Provider-specific settings: operating parameters (hold-expiry windows within platform-permitted bounds, notification preferences, integration credentials for HMS/LIS webhooks). | — |
| **Audit Logs** | Provider-facing view of the immutable audit trail already mandated platform-wide by GT-06, scoped to that provider's own actions and data, exportable for their own compliance/regulatory needs (e.g., NABH audit requests). | — |

## F3. Hospital Portal

### F3.1 Module Overview
The primary operational interface for hospital admissions, clinical, and administrative staff — the provider-side counterpart to Module 2 (Hospital Bed Availability) and a consumer/producer within Module 1 (Ambulance ER handoff, §1.11 FR-AMB-004) and Module 3 (Doctor Availability).

### F3.2 Business Objective
Make real-time bed and capacity accuracy (Module 2 BR-03's staleness rule) achievable within hospital staff's existing workflow constraints, and give hospitals a coordination advantage (advance ER notice, pre-verified insurance status) valuable enough to justify sustained data-currency effort — directly addressing Module 2 §2.37 OQ-01 (hospital participation incentive).

### F3.3 Functional Scope
Bed inventory update (Module 2 FR-BED-001, provider-side rendering), incoming ambulance/ER queue with triage handoff (Module 1 FR-AMB-004 receiving view), bed hold confirmation queue including ICU/Ventilator two-step acknowledgment (Module 2 BR-04), doctor roster/availability visibility (Module 3 cross-reference), insurance network-status self-service management (Module 7 provider-side data source), diagnostic/pharmacy affiliation linkage (Modules 5, 8).

### F3.4 Key Functional Requirements

**FR-HOSP-001**
- Priority: P0
- Description: System shall provide a live Incoming Patients queue showing all Ambulance-module triage handoffs (Module 1 FR-AMB-004) and Bed-module holds (Module 2 FR-BED-003) awaiting this hospital's action, ranked by Case severity.
- Actor: Hospital ER Coordinator, Admissions Staff
- Preconditions: Hospital onboarded and staffed users authenticated
- Trigger: New triage handoff or bed hold created for this hospital
- Main Flow: (1) Event received from Module 1/2 → (2) Queue entry created, ranked by severity → (3) Staff action (acknowledge/confirm/decline-with-reason) → (4) CaseTimelineEvent emitted (GT-02) → (5) Citizen Case Dashboard (§A3.1) updates in real time
- Post Conditions: Queue entry resolved; downstream Case status updated
- Acceptance Criteria: New entries appear in queue within 10 seconds of source event (matches Module 1 FR-AMB-004 acceptance criteria)
- Dependencies: Module 1 FR-AMB-004, Module 2 FR-BED-003, GT-02

**FR-HOSP-002**
- Priority: P0
- Description: System shall require a distinct, auditable clinical-team acknowledgment step for ICU/Ventilator bed confirmations, separate from the Admissions Staff hold-confirmation action.
- Actor: Hospital Clinical Lead
- Preconditions: A PENDING_CONFIRMATION hold exists for an ICU/Ventilator category (Module 2 BR-04)
- Trigger: Hold created
- Main Flow: (1) Task routed to Clinical Lead's queue distinctly from general Admissions queue → (2) Clinical Lead confirms clinical readiness → (3) Only then does hold transition to CONFIRMED
- Post Conditions: Hold status updated per Module 2 §2.21 state machine
- Acceptance Criteria: No ICU/Ventilator hold reaches CONFIRMED status without a logged Clinical Lead acknowledgment (zero-tolerance audit check)
- Dependencies: Module 2 BR-04, GT-06

**FR-HOSP-003**
- Priority: P1
- Description: AI Assistant shall generate a rolling capacity forecast (6-24 hours) using historical discharge patterns and current admission trends, surfaced on the Hospital Dashboard.
- Actor: AI Coordination Layer (provider-scoped instance)
- Preconditions: Sufficient historical data available for the hospital
- Trigger: Scheduled recomputation (e.g., hourly)
- Main Flow: (1) Aggregate historical discharge/admission velocity → (2) Project category-level capacity → (3) Surface as advisory forecast, never as an automatic inventory mutation
- Post Conditions: Dashboard forecast updated; no write to live bed inventory (that remains a human/HMS action per Module 2 FR-BED-001)
- Acceptance Criteria: Forecast clearly labeled advisory; does not alter FR-BED-001 counts
- Dependencies: Module 2 §2.35 (listed there as a Future Enhancement — this FR is the Phase 1 provider-facing seed of that capability, intentionally lightweight)

### F3.5 Reports & Analytics
SLA compliance (Module 2 §2.31 rendered provider-side), NABH-audit-ready occupancy/turnover reports, insurance cashless-conversion reporting (Module 7 cross-reference).

### F3.6 User Permissions
Extends Module 2 §2.15 table with Portal-native roles: Hospital Administrator (full portal config + user management), Admissions Staff (as defined in Module 2), Clinical Lead (as defined in Module 2), Finance/Insurance Desk (Module 7 pre-auth management, new role introduced here).

### F3.7 Integration Requirements
Module 1, Module 2, Module 3, Module 7 (as already specified); HMS/EHR systems (Module 2 §2.34, unchanged); NABH accreditation data reference (Module 4 §4, Business Rules).

## F4. Doctor Portal

### F4.1 Overview & Scope
Provider counterpart to Module 3 (Doctor Availability). Covers calendar/slot availability management (distinct real-time-status vs. calendar-slot distinction already defined in Module 3), consultation queue (in-person/teleconsult), case-linked patient history access (scoped per GT-07), e-prescription issuance (feeding Module 5 per Module 5 FR-PHR-001's dependency).

### F4.2 Key Functional Requirement

**FR-DOCP-001**
- Priority: P0
- Description: System shall allow a doctor to toggle real-time availability status (Available Now / With Patient / In Surgery / Off Duty) independently of pre-set calendar slots, per the dual-tracking model established in Module 3.
- Actor: Doctor
- Preconditions: Doctor authenticated on Portal
- Trigger: Manual toggle or auto-set on consultation start/end
- Main Flow: (1) Status change submitted → (2) Module 3 search/matching index updated → (3) If an urgent Case-linked match is pending for this doctor (Module 3 FR-DOC-001), Booking Management queue reflects updated ETA
- Post Conditions: Doctor's live status reflected platform-wide within 5 seconds
- Acceptance Criteria: Consistent with Module 3 §3 (no separate SLA defined there; this FR establishes it)
- Dependencies: Module 3 FR-DOC-001, GT-02

### F4.3 Case Management Scope
Doctor Portal's Healthcare Case Management view is the most clinically detailed of any provider portal (consultation notes, prior case history where consented) — inherits the strict consent-scoping already flagged as the platform's most sensitive data class in Module 3 §3 (Security/Privacy).

### F4.4 AI Assistant
Schedule optimization (minimize gaps, prioritize AI-matched urgent cases per §A4 into open slots) and structured-note drafting assistance from consultation input — explicitly never autonomous diagnosis or treatment suggestion, consistent with the §A4 non-goal and reinforced by Module 9's stricter clinical boundary.

## F5. Ambulance Operator Portal

### F5.1 Overview & Scope
Provider counterpart to Module 1. Fleet Status management (vehicle type, on-duty/off-duty, current location feed) is the "real-time operational data" for this portal per F1's mapping table. Includes driver/EMT roster management, dispatch offer accept/reject history, and the reliability-score-relevant reporting referenced in Module 1 §1.31.

### F5.2 Key Functional Requirement

**FR-AMBP-001**
- Priority: P0
- Description: System shall allow an operator administrator to manage fleet roster (add/remove vehicles, assign drivers) and view a real-time fleet-status map mirroring what the AI matching engine (Module 1 FR-AMB-002) sees when ranking this operator's vehicles.
- Actor: Ambulance Operator Administrator
- Preconditions: Operator onboarded (Part G onboarding flow) and vehicles registered
- Trigger: Portal login / fleet change
- Main Flow: (1) Administrator views/edits fleet roster → (2) Vehicle location feed (from driver-side app, Module 1 §1.3 driver-side data) rendered → (3) Dispatch offer/accept/decline history surfaced for performance visibility
- Post Conditions: Roster changes reflected in Module 1 FR-AMB-002 matching pool immediately
- Acceptance Criteria: Roster/status changes propagate to matching engine within 10 seconds
- Dependencies: Module 1 FR-AMB-002, BR-03/BR-04

### F5.3 Reports
Operator-level reliability/SLA compliance (Module 1 §1.31, rendered provider-side), decline-rate and cancellation-reason breakdowns for self-improvement.

## F6. Pharmacy Portal

### F6.1 Overview & Scope
Provider counterpart to Module 5. Medicine inventory (stock-on-hand, batch/expiry where relevant) is the operational data mapped in F1. Includes prescription-fulfillment queue (Module 5 FR-PHR-001 receiving view) and stock-hold confirmation mirroring Module 2's confirmation pattern at Pharmacy's shorter hold-expiry window (Module 5 §5, Business Rules, 60-minute default).

### F6.2 Key Functional Requirement

**FR-PHRP-001**
- Priority: P0
- Description: System shall allow pharmacy staff to update medicine-level stock counts, with validation against a controlled-substance flag that routes such items to the explicitly out-of-scope regulated-dispensing workflow (Module 5 §5, Out of Scope) rather than the standard hold/fulfill flow.
- Actor: Pharmacy Staff
- Preconditions: Pharmacy onboarded
- Trigger: Manual stock update or POS-integration webhook
- Main Flow: (1) Stock update submitted → (2) System checks controlled-substance flag → (3) If flagged, item excluded from case-linked auto-hold matching and surfaced with a manual-verification note; otherwise standard Module 5 stock-hold pattern applies
- Post Conditions: Inventory updated; regulated items handled distinctly
- Acceptance Criteria: Zero controlled-substance items enter the automated Module 5 FR-PHR-001 hold flow
- Dependencies: Module 5 §5 (Out of Scope), BR pattern reused from Module 2 BR-01/02

## F7. Blood Bank Portal

### F7.1 Overview & Scope
Provider counterpart to Module 6. Blood/component inventory by type is the operational data. Includes the receiving end of the AI pre-alert mechanism (Module 6 FR-BLD-001) and donor-registry management (eligibility/cooldown tracking per Module 6 Business Rules).

### F7.2 Key Functional Requirement

**FR-BLDP-001**
- Priority: P0
- Description: System shall surface AI-generated pre-alerts (Module 6 FR-BLD-001) in a dedicated queue distinct from explicit stock requests, allowing blood bank staff to proactively verify component availability before a formal request arrives.
- Actor: Blood Bank Staff
- Preconditions: Blood bank onboarded; Case flagged trauma/obstetric/surgical by AI Coordination Layer
- Trigger: Module 6 FR-BLD-001 pre-alert event
- Main Flow: (1) Pre-alert received → (2) Staff verifies/pre-reserves relevant component stock → (3) If a formal request follows, fulfillment is faster because verification is already done
- Post Conditions: Pre-alert acknowledged; stock optionally soft-reserved (not a hard hold, to avoid unnecessary decrement per Module 6 §6 Business Rules distinction between pre-alert and committed request)
- Acceptance Criteria: Pre-alerts distinguishable in UI/queue from committed requests at all times
- Dependencies: Module 6 FR-BLD-001

## F8. Diagnostic Center Portal

### F8.1 Overview & Scope
Provider counterpart to Module 8. Test slot inventory (by test type, equipment, home-collection capacity) is the operational data. Includes order-receiving queue linked to Module 3 consultation orders (Module 8 FR-DIAG-001 dependency) and result-upload workflow that closes the loop back to the Case Timeline.

### F8.2 Key Functional Requirement

**FR-DIAGP-001**
- Priority: P0
- Description: System shall allow diagnostic center staff to upload results against a specific ordered test, triggering the Case Timeline delivery already specified in Module 8 FR-DIAG-001.
- Actor: Diagnostic Center Staff / LIS integration
- Preconditions: An ORDERED or SAMPLE_COLLECTED test exists for this center
- Trigger: Manual upload or LIS webhook
- Main Flow: (1) Result document/data submitted → (2) System validates against order record → (3) Module 8 FR-DIAG-001 delivery triggered
- Post Conditions: Order status transitions to RESULT_AVAILABLE then DELIVERED_TO_CASE (Module 8 §8.11 state machine)
- Acceptance Criteria: Consistent with Module 8's stated turnaround success metric
- Dependencies: Module 8 FR-DIAG-001

## F9. Insurance Portal

### F9.1 Overview & Scope
Provider counterpart to Module 7. Rather than a single "operational data" field, this portal manages network-mapping data (which hospitals/diagnostic centers/cancer hospitals are in-network) and the pre-authorization review queue (Module 7's DRAFT→SUBMITTED→UNDER_REVIEW→APPROVED state machine, insurer-side actions).

### F9.2 Key Functional Requirement

**FR-INSP-001**
- Priority: P0
- Description: System shall allow insurer staff to review and action pre-authorization requests (approve/partially approve/deny/request-more-info) submitted via Module 7 FR-INS-001's linked flow, with all Case data shared strictly per the consent scope captured at submission (GT-07).
- Actor: Insurer Review Staff
- Preconditions: A SUBMITTED pre-authorization request exists
- Trigger: Request submission
- Main Flow: (1) Request appears in review queue with attached, consented Case data → (2) Reviewer actions the request → (3) Status update flows back to Module 7 state machine and Citizen Case Timeline
- Post Conditions: Pre-auth status updated platform-wide
- Acceptance Criteria: No Case data visible to insurer beyond what was explicitly consented at submission (audited per GT-06/GT-07)
- Dependencies: Module 7 FR-INS-001, GT-07

### F9.3 Network Mapping Management
Insurer staff maintain the hospital/provider network list and cashless-eligibility flags consumed by Module 7 FR-INS-001's "last-verified timestamp" display — this portal is the actual data-entry point that keeps that timestamp meaningful rather than perpetually stale.

---

# PART G — PLATFORM ADMINISTRATION CONSOLE

## G1. Console Overview
The internal operations product used by platform staff (not citizens, not providers) to onboard, verify, support, and operate the network described in Parts A, B, and F. Where the Citizen App answers "what is happening to my Case" and the Provider Platform answers "what do I need to action," the Admin Console answers "is the platform, as a whole, healthy, trustworthy, and improving" — it is the operational backbone that makes the trust claims made throughout Parts A/B/F (staleness flags, audit trails, consent scoping, human escalation) actually enforceable rather than aspirational.

## G2. Business Objective
Give platform operations, support, and trust & safety teams the tooling to (a) bring citizens and providers onto the platform with appropriate verification rigor, (b) intervene in real time when automated coordination breaks down (the GT-08 human-escalation requirement present in every Part B module), and (c) maintain the platform's operational and regulatory health at scale.

## G3. Citizen Onboarding

**Functional Scope:** Registration flow management (beyond the guest/lightweight flow already defined in GT-10), identity verification tier configuration, ABHA-linkage support (see Part H4), duplicate-account detection, family/caregiver linkage approval workflows (referenced but not detailed in Module 1 §1.15's "Family/Caregiver linked" role).

**Representative FR (FR-ADM-CIT-001):** System shall allow support staff to manually resolve a flagged duplicate-account or family-linkage-dispute case (e.g., two family members both claiming caregiver status for the same patient), with all resolution actions logged per GT-06.
- Priority: P1; Actor: Customer Support Staff; Dependency: GT-06, GT-07 (consent re-verification on linkage change).

## G4. Healthcare Provider Onboarding & Verification

**Functional Scope:** Provider application intake (per provider type, F3–F9), credential/license verification workflows (e.g., doctor registration against National Medical Commission data per Part H9, hospital NABH/NABL accreditation verification per Part H8), integration readiness checklisting (HMS/LIS webhook setup per Module 2 §2.34, Module 8 §8), go-live approval gate.

**Representative FR (FR-ADM-PRV-001):** System shall provide a structured, stage-gated onboarding workflow for each provider type (Hospital, Doctor, Ambulance Operator, Pharmacy, Blood Bank, Diagnostic Center, Insurer) tracking verification status per required credential, and blocking portal go-live (F3–F9 access) until all mandatory stages are complete.
- Priority: P0; Actor: Provider Onboarding Team; Preconditions: Provider application submitted; Main Flow: (1) Application intake → (2) Credential verification per provider-type checklist → (3) Integration test (sandbox booking/hold cycle) → (4) Go-live approval → (5) Provider Portal (Part F) access activated; Dependencies: Part H (regulatory data sources), GT-06.

**Verification data sources by provider type** (cross-referencing Part B's already-flagged Open Questions rather than introducing new unresolved dependencies): Hospital → NABH/government hospital registry (Module 4 §4.8 Business Rule, Module 4 §4.37 OQ); Doctor → National Medical Commission registry (Module 3 §3 OQ); Diagnostic Center → NABL accreditation (Module 8, referenced); Blood Bank → NACO/state blood transfusion council (Module 6 §6.37 OQ); Insurer → IRDAI registration (Part H10).

## G5. Customer Support & Customer Success

**Functional Scope:** Ticket-based support for both citizens and providers, proactive customer-success outreach for provider engagement/retention (directly addressing the hospital-participation incentive concern raised in Module 2 §2.37 OQ-01 — customer success is a product-level answer to a business-model-level open question), support-agent Case visibility (consent-scoped per GT-07, same as any other actor).

**Representative FR (FR-ADM-SUP-001):** System shall allow a support agent to view a Case's full Timeline (§A3.2) and linked-service statuses when handling a citizen or provider support request, subject to a support-specific consent/access justification being logged (an explicit, audited "reason for access" field distinct from clinical-team consent-scoped access) — this is a controlled variant of GT-07, not an exception to it.
- Priority: P0; Actor: Support Agent; Dependencies: GT-06, GT-07, §A3.2.

## G6. Remote Session Assistance

**Functional Scope:** Screen-share/co-browse capability for support staff to assist low-digital-literacy citizens or providers in real time (directly extends GT-09's accessibility commitment into the support layer — accessibility isn't only a self-service UI property, it's also a "a human can drive your screen with permission" capability), always initiated with explicit citizen/provider consent and time-boxed session logging.

**Representative FR (FR-ADM-RSA-001):** System shall require explicit, timestamped consent from the citizen/provider before a support agent may initiate a remote-assist session, and shall automatically terminate the session after a maximum duration (default 30 minutes) or on user action, whichever is first.
- Priority: P1; Actor: Support Agent, Citizen/Provider; Dependencies: GT-07, GT-06 (session audit).

## G7. Issue Tracking & SLA Management

**Functional Scope:** Internal issue/ticket lifecycle management across citizen support, provider support, and platform-health incidents; SLA definitions and breach alerting that operationalize the SLA references already made throughout Part B (e.g., Module 1 BR-01's 90-second dispatch SLA, Module 2's hold-expiry SLAs) — this is where those module-level SLAs become monitored, alertable operational targets rather than just documented rules.

**Representative FR (FR-ADM-SLA-001):** System shall monitor all module-level SLA thresholds already defined in Part B (e.g., Module 1 BR-01, Module 2 BR-02) in real time and raise an operational alert to the relevant on-duty coordinator when a breach is imminent or has occurred, distinct from the citizen-facing escalation already defined per-module (GT-08) — this is the internal-facing mirror of that citizen-facing guarantee.
- Priority: P0; Dependencies: Module 1 BR-01, Module 2 BR-02, GT-08.

## G8. Knowledge Base
Internal and provider-facing documentation repository (onboarding guides per provider type, troubleshooting for common portal issues, regulatory-compliance reference material drawn from Part H) — a support-enablement capability, not a citizen-facing FAQ (which would be a Citizen App concern, out of scope for this Console section).

## G9. User Management & Role Management (Console-Internal)

**Functional Scope:** Manages Console users themselves (platform ops, support, trust & safety, compliance staff) — distinct from Provider Portal's F2 User Management (which manages a provider's *own* staff) and distinct from the Citizen App's user base entirely. Role catalogue: Support Agent, Customer Success Manager, Provider Onboarding Specialist, Trust & Safety Analyst, Compliance Officer, Platform Operations Engineer, Console Administrator (superuser, itself subject to the strictest audit tier per GT-06).

## G10. Workflow Management
Configuration surface for the stage-gated workflows referenced in G4 (onboarding) and reusable for future internal process needs — built on the shared Workflow Engine (Part J6), not a bespoke Console-only implementation, per the platform's build-once-configure-many principle already established in Appendix C2.

## G11. Platform Monitoring
Operational health view across all Shared Platform Services (Part J) and module-level system status (e.g., is the Ambulance matching engine's P95 latency within the 90-second SLA target from Module 1 BR-01 at a *system-capacity* level, independent of any single request). Feeds the Observability/Monitoring NFRs specified in Part I.

## G12. Analytics (Console-Level)
Platform-wide aggregate analytics rolling up the per-module Analytics sections already defined throughout Part B (e.g., Module 1 §1.32, Module 2 §2.32) into cross-module, cross-region strategic views — the same "ambulance desert heatmap" concept named in Module 1 §1.31 is a Console-level analytics capability as much as an Ambulance-module report.

## G13. Communication Center
Centralized outbound communication tooling for platform-wide announcements (e.g., surge-mode activation referenced in Module 2 §2.23 Edge Cases), regulatory notices to providers, and campaign-style citizen outreach (e.g., blood donor registry growth campaigns referenced in Module 6 §6.36 Success Metrics) — built on the shared Notification Service (Part J).

## G14. AI Operations Assistant
A Console-scoped instance of the AI Coordination Layer (§A4) focused on platform operations rather than a single Case: anomaly detection across the network (extends the Anomaly/Fraud Signals capability already named in §A4's capability table to a platform-wide operational view), staffing/coordinator-load forecasting, and automated first-pass triage of incoming support tickets (routing, not resolving — same non-goal boundary pattern as every other AI Assistant instance in this document).

## G15. Feature Flags
Console-managed feature-flag system enabling phased/geo-scoped rollout — directly relevant to Part B's repeated "phased rollout," "state-by-state," and "pilot geography" language (e.g., Module 1 §1.37 OQ-03, Module 7 §7.37 OQ on insurer integration sequencing). This is the mechanism by which those phasing decisions are actually executed operationally.

## G16. Configuration Management
Platform-wide parameter configuration (default hold-expiry windows referenced throughout Part B as configurable, staleness thresholds, radius defaults) — a single source of truth for the "(default: X)" values scattered throughout every module's Business Rules sections, preventing config drift between modules that should share values.

## G17. Audit Management
Console-level aggregation and search interface over the audit trail mandated by GT-06 across every module and every product (Citizen App, Provider Platform, and the Console itself) — the operational tool that makes GT-06 a queryable, exportable capability for compliance/legal/medico-legal purposes rather than just a logging requirement.

---

# PART H — INDIAN REGULATORY COMPLIANCE (PLATFORM CAPABILITIES)

This section defines platform *capabilities* required to support compliance with the named frameworks. Consistent with the instruction governing this section, nothing below constitutes legal advice or a legal compliance determination — each item should be read as "the platform must be technically capable of X," with actual compliance sign-off remaining a legal/regulatory function outside this specification's scope, and several open questions in Part B (e.g., Module 1 §1.37 OQ-01) are directly narrowed by the capabilities defined here.

## H1. Digital Personal Data Protection Act (DPDP), 2023 — Platform Capabilities
- Consent capture as a first-class, auditable object (not a checkbox side-effect) — formalizes and platform-wides the consent-scoping behavior already required per-module via GT-07 throughout Part B.
- Purpose-limitation enforcement at the data-access layer: every read of personal/health data must be tied to a declared purpose (clinical care, coordination, support per G5, compliance/audit) — technically enforced, not just policy-documented.
- Data Principal (citizen) rights support: access, correction, and erasure request handling workflows (erasure specifically addressed in H1's Data Deletion capability, Part I3).
- Breach notification tooling: detection-to-notification workflow hooks integrated with the Audit Service (Part J) and Console's Platform Monitoring (G11).
- Cross-border data transfer controls: configurable data-residency enforcement (India-only storage/processing by default, given the sensitivity profile established throughout Part B, e.g., Module 9 §9's cancer-diagnosis sensitivity discussion).
- **Directly resolves Module 1 §1.37 OQ-01** (data retention policy for location trails): the platform must expose a configurable, DPDP-aligned retention policy engine rather than hardcoding a retention period per module — retention periods become Configuration Management (G16) parameters with legal sign-off feeding the config, not an engineering decision made in isolation.

## H2. Information Technology Act — Platform Capabilities
- Reasonable security practices per statutory expectation: maps to the Security Requirements already itemized per module throughout Part B (e.g., Module 1 §1.28, Module 2 §2.28) plus the platform-wide expansion in Part I.
- Intermediary-liability-relevant capabilities: content/data handling logs (Audit Service), grievance-officer workflow support (routed through Customer Support, G5, with a distinct escalation path for legal/statutory grievances vs. ordinary support tickets).

## H3. CERT-In Directions — Platform Capabilities
- Security incident logging with the time-synchronized logging retention window CERT-In directions require, implemented via the shared Logging service (Part J) with configurable retention meeting the mandated minimum.
- Incident reporting workflow: a defined internal pathway from Platform Monitoring (G11) detection to the reporting obligation, with Console-level ownership (Trust & Safety Analyst role, G9).

## H4. ABDM Compatibility & ABHA Integration Readiness
- Platform must support citizen linkage of an existing ABHA (Ayushman Bharat Health Account) ID to their Citizen App profile as an optional, consented identity/health-record linkage (extends Citizen Onboarding, G3) — optional, not mandatory, since Part A's guest/bystander flows (GT-10) must continue to function for citizens without an ABHA ID, preserving the Golden Hour "no login required" principle established in Module 1 §1.6.
- Health record retrieval/sharing via ABDM's Health Information Exchange must be modeled as a distinct, explicitly consented data flow (see H5), never a default/automatic pull, consistent with the platform's general consent-scoping posture (GT-07).

## H5. Health Information Exchange & Consent Manager
- Platform must be capable of acting as (or integrating with) an ABDM Consent Manager for the purpose of retrieving/sharing a citizen's linked health records across the platform's own modules (e.g., pulling prior diagnostic results, Module 8, into a new Case with consent) and, longer-term, with external ABDM-participating systems.
- Consent artifacts generated here should reuse the same underlying Consent Service (Part J) already required by DPDP (H1) and GT-07 — one consent model, multiple regulatory/functional consumers, following the same build-once-configure-many principle as Appendix C2.

## H6. HL7 FHIR Interoperability
- Provider-side clinical data exchange (Hospital HMS integration, Module 2 §2.34; Diagnostic LIS integration, Module 8 §8, flagged there as needing "a phased standardization approach, likely PDF-first before structured-data-second") should target FHIR-compliant data structures as the eventual structured-data standard, with the Module 8-flagged PDF-first path treated explicitly as a transitional state, not a permanent architecture.
- The Integration Hub (Part J) should expose FHIR-compliant adapters as a first-class integration pattern for any future HMS/LIS/insurer connection, rather than building bespoke per-provider formats indefinitely.

## H7. IRDAI Integration Considerations
- Insurance Portal (F9) and Module 7's pre-authorization flow must be capable of adapting to insurer-specific submission formats and, where IRDAI mandates specific health-claim-exchange standards (e.g., National Health Claim Exchange direction), integrate against that standard rather than a platform-proprietary format — **directly relevant to Module 7 §7.37's flagged open question on insurer integration sequencing**, since IRDAI-mandated standards would materially simplify that sequencing versus insurer-by-insurer bespoke integration.

## H8. NABH (Hospital Accreditation)
- Already referenced as a trust-data source in Module 4 §4.8 (Nearby Hospitals Business Rules) and as an onboarding-verification input in G4; this section confirms the platform capability required: an accreditation-status field with source-of-truth linkage (NABH registry where API-accessible, manual verification workflow otherwise per G4's stage-gated onboarding) and a periodic re-verification job (accreditation status can lapse — the platform must not display stale accreditation claims indefinitely, mirroring the staleness-handling philosophy already established for bed inventory in Module 2 BR-03).

## H9. National Medical Commission Considerations
- Doctor credential verification (Doctor Portal onboarding, G4) should integrate against NMC's registry where API-accessible; where not, a manual verification workflow with periodic re-check (same staleness-handling pattern as H8) applies. **Directly resolves Module 3's flagged open question on doctor credential/registry source-of-truth ownership** by establishing NMC-first, manual-fallback as the platform's capability posture.

## H10. State Government Integrations
- Given Part B's repeated observation that government fleet/hospital integration maturity varies drastically by state (Module 1 §1.9 Assumptions, Module 1 §1.37 OQ-03, Module 2's government-hospital-inclusion Business Rule BR-05), the platform must be architected for partial, incrementally-onboarded state coverage as a first-class operating mode, not a temporary launch gap — the Integration Hub (Part J) should expose a state-integration-status registry (feeding Feature Flags, G15, for state-by-state rollout gating) rather than assuming uniform national integration at any point in the roadmap.

## H11. Telemedicine Practice Guidelines (Future Support)
- Flagged for Phase 2 alongside the teleconsult capability already noted as present-but-basic in Module 3 (teleconsult booking type listed in Functional Scope) and the in-ambulance telemedicine Future Enhancement in Module 1 §1.35; when teleconsult volume grows, the platform must be capable of enforcing Telemedicine Practice Guidelines-compliant consultation record-keeping (prescription issuance rules, patient identification verification standards) — captured here as a forward-looking capability requirement, not a Phase 1 build item, consistent with its "future support" framing in the source requirements.

---

# PART I — PRIVACY & SECURITY (PLATFORM-WIDE EXPANSION)

Part B established per-module Security/Privacy/Audit sections (e.g., Module 1 §§1.28-1.30) and Part A established GT-06/GT-07 as standing cross-module requirements. This section is the platform-wide expansion those sections already presupposed; every item below governs all three products (Citizen App, Provider Platform, Admin Console) uniformly unless stated otherwise.

## I1. Consent Management
Formalizes GT-07 into a concrete capability: a Consent Service (Part J) issuing scoped, revocable, auditable consent artifacts for every purpose named across this document — case-data sharing with a specific provider (Module 3, Module 9), pre-authorization data sharing with an insurer (Module 7 FR-INS-001), remote-assist session access (G6), and ABDM-linked health record retrieval (H5). One service, many purpose-scoped consumers — the privacy analogue of Appendix C2's resource-coordination-engine principle.

## I2. Data Classification
All platform data must be classified at capture time into tiers (e.g., Public/Internal — provider directory data per Module 4; Sensitive — case/triage data per GT-01; Highly Sensitive — clinical notes (Module 3), cancer diagnosis (Module 9), donor health eligibility (Module 6 §6 Security/Privacy), insurance/financial data (Module 7)) driving differential access-control, encryption, and retention treatment automatically rather than per-module ad hoc decisions.

## I3. Purpose Limitation, Data Retention, Data Deletion, Data Archival, Data Portability
- **Purpose Limitation:** enforced at query-time by the Consent Service (I1) — a query without a matching declared purpose is rejected, not merely logged for after-the-fact review.
- **Data Retention:** module-specific retention periods (e.g., the location-trail retention question flagged as an Open Question in Module 1 §1.37 OQ-01) become centrally configured (G16) parameters governed by DPDP capability (H1), not per-module hardcoded values.
- **Data Deletion:** citizen-initiated erasure requests (DPDP right, H1) must cascade correctly across the Case/Timeline core (§A2) and all linked module records — an explicit technical challenge given the Timeline's "append-only, never edited" design principle (§A3.2); deletion should be implemented as cryptographic erasure or tokenization of personally identifying fields rather than violating Timeline immutability outright, preserving audit/medico-legal defensibility (GT-06) while honoring erasure rights — flagged here as a specific architectural tension worth resolving deliberately rather than accidentally.
- **Data Archival:** closed/resolved Cases (per the various module-specific status machines, e.g., Module 1 §1.21, Module 9 §9's CHRONIC_MANAGEMENT lifecycle) move to a lower-cost archival tier after a configurable inactivity period while remaining retrievable for audit/legal/continuity-of-care purposes.
- **Data Portability:** citizens can export their own Case history (DPDP right) in a structured, ideally FHIR-aligned (H6) format.

## I4. Break Glass Access & Emergency Access
A defined, heavily audited override capability allowing a treating clinician to access a patient's case/consent-scoped data beyond normal GT-07 scoping in a genuine emergency where the patient cannot grant consent (e.g., unconscious patient, no linked family reachable) — this directly resolves a latent gap in Module 1's guest/bystander flow (GT-10) and Module 1 §1.11 FR-AMB-001's unconscious-patient triage scenario, where strict default consent-scoping would otherwise block life-saving data access. Break Glass access must be: time-boxed, logged with mandatory post-hoc justification, and flagged for Trust & Safety review (G5/G9) in every instance — never a silent or standing permission.

## I5. Audit Trails
Consolidates and formalizes GT-06 (repeated in every Part B module) plus G17's Console-level aggregation — a single Audit Service (Part J) as the system of record, with per-module/per-product audit views being renderings of that one service, not independent logging implementations.

## I6. Encryption
Data-at-rest and data-in-transit encryption platform-wide, with Highly Sensitive-tier data (per I2 classification) subject to field-level encryption in addition to standard transport/storage encryption — extends the "end-to-end encrypted transmission of location and triage data" requirement already stated in Module 1 §1.28 to the platform-wide standard it was always implicitly setting.

## I7. Identity & Access Management, RBAC, ABAC, MFA
- **IAM:** a shared Authentication/Authorization service (Part J) underlies all three products, replacing any temptation toward product-specific identity silos.
- **RBAC:** formalizes the many per-module permission tables already defined throughout Part B (e.g., Module 1 §1.15, Module 2 §2.15) plus the Provider Portal (F2) and Console (G9) role catalogues into one coherent role model.
- **ABAC:** layers attribute-based rules atop RBAC where role alone is insufficient — e.g., a Doctor's access to a specific Case (F4.3) depends not just on the "Doctor" role but on the attribute of being an active participant in that specific Case's care team, consistent with GT-07's consent-scoping principle.
- **MFA:** mandatory for all Provider Portal and Admin Console accounts given their access to sensitive/aggregated data; risk-based (step-up) MFA for Citizen App accounts, balanced against the Golden Hour "no login required for guest/bystander" principle (GT-10) which must never be compromised by security friction.

## I8. API Security
All external-facing APIs (Part J's API Gateway) enforce authentication, rate-limiting (extends the anti-abuse rate-limiting already specified for guest ambulance requests in Module 1 BR-06/§1.28 to a platform-wide API policy), input validation, and payload-size/schema constraints.

## I9. Mobile Security
Citizen App and Provider mobile clients: certificate pinning, secure local storage for any offline-queued data (GT-03's offline queue must itself be encrypted at rest on-device, an explicit extension of GT-03 that Part B did not previously make explicit), jailbreak/root detection posture for Highly Sensitive-tier data flows.

## I10. OWASP & Vulnerability Management
Standard OWASP Top 10 mitigation posture across all three products' web/mobile/API surfaces; a defined vulnerability-management lifecycle (scanning cadence, patch SLA tiers by severity) owned operationally through Platform Monitoring (G11) and reported through Audit Management (G17).

---

# PART J — SHARED PLATFORM SERVICES

Appendix C2 already argued that the Resource Coordination Engine should be "built once, configured five ways." This section generalizes that principle to the full services layer underlying all three products (Citizen App, Provider Platform, Admin Console) and every module in Part B. No module or product-specific chapter above should be read as implying a bespoke reimplementation of any of the following — every reference to "authentication," "notification," "AI," "search," "maps," etc. throughout Parts A, B, F, G, H, and I resolves to the corresponding shared service defined here.

| Service | Functional Responsibility | Primary Consumers (illustrative, not exhaustive) |
|---|---|---|
| **Authentication** | Identity verification, session management, MFA (Part I7) | All three products |
| **Authorization** | RBAC/ABAC policy evaluation (Part I7) | All three products |
| **Consent Service** | Scoped, revocable, auditable consent artifacts (Part I1) | GT-07 across all modules; Module 7, Module 9, Part H5 |
| **Notification Service** | Multi-channel (push/SMS/IVR/email) delivery per the notification tables defined in every Part B module (e.g., Module 1 §1.20) | All modules, all three products |
| **AI Platform** | Underlies every AI Coordination Layer instance (§A4, F2's per-portal AI Assistant, G14's Ops Assistant) — one model/inference layer, many scoped applications, same non-goal (no autonomous clinical decisions) enforced centrally rather than per-instance | §A4, F2, G14 |
| **Workflow Engine** | Stage-gated process execution (onboarding per G4, pre-authorization per Module 7, Case status-machine transitions per every module's §Status Definitions) | G4, G10, Module 7, all Case state machines |
| **Rules Engine** | Business-rule evaluation (BR- prefixed rules throughout Part B, e.g., Module 1 BR-01's 90-second SLA, Module 2 BR-03's staleness threshold) — configurable via Configuration Management (G16) rather than hardcoded per module | Every module's Business Rules section |
| **Integration Hub** | HMS/LIS/insurer/government-system adapters, including FHIR-compliant patterns (Part H6) and the state-integration-status registry (Part H10) | Module 2 (HMS), Module 8 (LIS), Module 7 (insurer), Part H |
| **API Gateway** | Single ingress enforcing API Security (Part I8) for all external and inter-product calls | All three products |
| **Event Bus** | Underlies CaseTimelineEvent propagation (GT-02) and cross-module event flows (e.g., Module 1's ambulance dispatch triggering Module 2's bed pre-check per §A4) | Case/Timeline core, all modules |
| **Search** | Powers Module 4's hospital search, Module 3's doctor search, and equivalent discovery surfaces across Modules 5/6/8/9 | Modules 3, 4, 5, 6, 8, 9 |
| **Maps** | Geocoding, routing, ETA calculation (Module 1 §1.34's map/routing provider dependency, generalized as a shared service rather than an Ambulance-module-specific integration) | Module 1, Module 2 (radius search), all location-based search |
| **Voice** | IVR flows (GT-04's low-network fallback, Module 1's toll-free/IVR request path) | GT-04, Module 1, G6 (remote assist) |
| **Video** | Teleconsult (Module 3), future in-ambulance telemedicine (Module 1 §1.35), remote-assist screen-share (G6) | Module 3, G6 |
| **Chat** | In-app messaging for support (G5), provider-citizen coordination messages where applicable | G5, Provider Portal notifications |
| **Document Service** | Handles diagnostic result documents (Module 8), prescription documents (Module 3/5), pre-authorization documents (Module 7), consent artifacts (I1) | Module 3, 5, 7, 8 |
| **Audit Service** | System of record underlying GT-06, Part I5, and G17 | Every module, every product |
| **Logging** | Underlies Platform Monitoring (G11), CERT-In-relevant retention (Part H3) | G11, Part H3 |
| **Monitoring** | Real-time system/SLA health (G11), feeding G7's SLA breach alerting | G7, G11 |
| **Reporting** | Renders the Reports sections already defined per module (e.g., Module 1 §1.31) and per portal (F2) | Every module, every provider portal |
| **Analytics** | Renders the Analytics sections already defined per module (e.g., Module 2 §2.32) and Console-level rollups (G12) | Every module, G12 |

---

# PART K — NON-FUNCTIONAL REQUIREMENTS (PLATFORM-WIDE)

Individual modules in Part B already stated illustrative targets (e.g., Module 1 FR-AMB-002's 90-second P95 dispatch-match target, Module 2 FR-BED-003's zero-double-booking requirement). This section is the platform-wide NFR baseline those targets sit within; module-specific targets remain authoritative for that module and should be read as tightening, never loosening, the baselines below.

## K1. Performance
- P95 API response time: <500ms for read operations, <1.5s for write/transactional operations (scarce-resource holds per Appendix C2 excluded — those inherit their own module-specific targets, e.g., Module 1's 90-second full-match-cycle target, which is a coordination-latency target, not a raw API-latency target).
- Search operations (Module 3, 4, 5, 6, 8, 9): results returned within 2 seconds P95, consistent with the explicit target already stated in Module 2 FR-BED-002.

## K2. Availability
- Core Citizen App emergency-path functionality (ambulance request creation, Module 1 FR-AMB-001) targets 99.99% availability given its Golden Hour mission-criticality — a materially higher bar than the platform's general 99.9% target for non-emergency-path functionality (e.g., Diagnostic Center browsing, Module 8).
- Provider Platform and Admin Console target 99.9% (business-hours-weighted, though 24/7 given hospital/emergency operational reality).

## K3. Scalability
- Horizontal scalability for the Resource Coordination Engine (Appendix C2) sufficient to handle mass-casualty/surge scenarios already flagged as edge cases in Module 1 §1.23 and Module 2 §2.23 — surge capacity planning should be load-tested against multiples (e.g., 10x) of steady-state peak volume, not just steady-state peak.

## K4. Disaster Recovery, Business Continuity, RPO/RTO
- RPO (Recovery Point Objective): near-zero data loss target for active Case data (Case/Timeline core, §A2) given its medico-legal and life-safety criticality; a materially looser RPO is acceptable for Analytics/Reporting data stores.
- RTO (Recovery Time Objective): emergency-path functionality (Module 1 ambulance request creation) targets the shortest RTO tier in the platform given GT-08's "human coordinator escalation must always be available" requirement — the platform's DR posture must ensure that even a full regional outage still leaves *some* path (e.g., IVR fallback per GT-04, IVR being infrastructure-diverse from the primary app stack) to reach emergency coordination.

## K5. Observability & Monitoring
Extends G11 (Console capability) into a platform-wide engineering standard: every shared service (Part J) and every module's critical-path operation (e.g., Module 1 FR-AMB-002's matching cycle) must emit structured telemetry sufficient to reconstruct a full request trace across the Event Bus (Part J) — essential given how many cross-module chains (Ambulance→Bed→Blood per §A4) a single Case can traverse.

## K6. Capacity Planning
Informed directly by the Analytics-derived "ambulance desert heatmap" and category-level scarcity heatmap concepts already named in Module 1 §1.31 and Module 2 §2.32 respectively — capacity planning is explicitly a data-driven, Analytics-fed process (G12), not a separate planning exercise disconnected from the platform's own operational data.

## K7. Accessibility & Localization (Platform-Wide)
Formalizes GT-09 and GT-05 (already standing per-module requirements throughout Part B) as an explicit platform-wide NFR baseline, extended to the Provider Platform (Part F) and Admin Console (Part G) — accessibility and localization are not citizen-app-only concerns; a Provider Portal usable only by highly-literate, English-fluent hospital staff would undermine the tier-2/3 mission stated in Part A just as much as a citizen-facing gap would.

## K8. Offline Support & Low Network Support (Platform-Wide)
Formalizes GT-03 and GT-04 as platform-wide NFRs, with an explicit note that Provider Portal offline behavior (F2's "manual update, low-digital-maturity path" pattern, e.g., Module 2 §2.9's assumption of partial digital maturity) is a distinct but equally important offline-support surface from the Citizen App's offline request-queuing — both trace back to the same underlying principle stated in Part D point 5: these are not edge-case polish, they are the actual product for the stated first market.

## K9. Maintainability, Configurability, Extensibility
- **Maintainability:** direct consequence of Appendix C2's and Part J's build-once-configure-many architecture — a maintainability failure mode this NFR explicitly guards against is exactly the "nine independent booking systems" anti-pattern named as the top strategic risk in Part D point 1.
- **Configurability:** every "(default: X)" value scattered throughout Part B's Business Rules sections must be a Configuration Management (G16) parameter, not a hardcoded constant, enabling per-state/per-region tuning consistent with Part H10's state-by-state integration reality.
- **Extensibility:** the module/portal pattern established across Part B (9 modules) and Part F (7 portals) should itself be treated as an extensible template — Part D point 4's flagged future modules (mental health crisis coordination, dedicated maternal/obstetric fast-path) should be addable as new configurations of the existing Case model, Resource Coordination Engine, and Provider Portal shell, not as ground-up new subsystems.

