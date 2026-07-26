# Healthcare Coordination Platform — Modules 3–9 FR-ID Expansion

## Companion to `Healthcare-Coordination-Platform-PRD.md`

**Status:** Addendum, not a replacement. `Healthcare-Coordination-Platform-PRD.md` (specifically Part B's Modules 3–9 condensed specifications and Appendix C3) remains the primary source of truth for objectives, problems solved, stakeholders, out-of-scope items, business rules, security/privacy notes, integration points, success metrics, and open questions for each module — none of that is repeated or restated here except where needed for an FR's own context. This document exists solely to satisfy Appendix C3's explicit instruction: *"before implementation sprint planning for any of Modules 3–9, that module should first receive the same full FR-ID-table treatment as Modules 1–2 (target: 15–25 individually numbered FRs per module, matching the density demonstrated in §1.11/§2.11)."*

**Authored by:** Claude Code, Session 8, 2026-07-25 — at the direction of `IMPLEMENTATION_MASTER_PLAN.md` Decision Log item DL-004, which flagged this as required before sprint planning for any of Modules 3–9 and had been open since Session 1.

**Format:** Each FR follows the identical template used for FR-AMB-001 through FR-AMB-004 in the PRD's §1.11 (Priority, Description, Actor, Preconditions, Trigger, Main Flow, Post Conditions, Acceptance Criteria, Dependencies). **FR IDs assigned here are binding per PRD M3 ("ID is binding — never rename") from the moment this document is committed** — treat them with the same permanence as any FR ID in the base PRD.

**What this document does NOT do:** it does not change any Business Rule, Out-of-Scope item, or architectural decision already stated in the base PRD for Modules 3–9. Where an FR below implies a business rule not already stated in the base PRD (e.g., a specific numeric threshold), it is marked `(new, this document)` so a reviewer can distinguish "transcribed from the PRD" from "authored here to fill a gap the condensed spec left implicit." Per this project's own standing rule (PRD wins on conflict), any such new item should be reviewed by whoever owns product decisions before being treated as final — it is a reasonable operationalization, not a rubber-stamped requirement.

---

# MODULE 3 — DOCTOR AVAILABILITY

*(Base spec: PRD Part B, "MODULE 3 — DOCTOR AVAILABILITY". Case-linked status machine: `REQUESTED → CONFIRMED → IN_CONSULTATION → COMPLETED → CANCELLED/NO_SHOW`, per PRD §3 referencing §2.18-2.21's pattern.)*

**FR-DOC-001** *(PRD's own Representative FR, reproduced verbatim for table completeness)*
- Priority: P0
- Description: System shall auto-suggest a specialist match when a Case's severity/triage category implies a specialty (e.g., cardiac symptoms → cardiologist) at the point the Case transitions to `STABILIZED`, using the same AI Best-Match composite scoring as Modules 1-2.
- Actor: AI Coordination Layer
- Preconditions: Case status transitions to `STABILIZED`; triage/severity data present on the Case Timeline
- Trigger: `case.status_changed` event with new status `STABILIZED`
- Main Flow: (1) Event consumed → (2) Triage category mapped to specialty taxonomy → (3) `AiPlatformClient` (M8) scores candidate doctors by specialty-fit, availability, distance, reliability → (4) Top match surfaced to citizen/family as a suggested next action on the Case Dashboard
- Post Conditions: Suggested doctor match visible on Case Dashboard; no booking created automatically (suggestion only, citizen confirms)
- Acceptance Criteria: Suggestion surfaced within 5 seconds of the status transition event; deterministic fallback ranking (GT-11) used if AI Platform unavailable, logged via `ai_fallback_used`
- Dependencies: Case Timeline severity data, GT-01/GT-02, M8

**FR-DOC-002**
- Priority: P0
- Description: System shall allow search for doctors by specialty, location/distance, language spoken, and real-time availability status.
- Actor: Citizen/Patient, Family/Caregiver
- Preconditions: None (search does not require an active Case)
- Trigger: User opens Doctor Search
- Main Flow: (1) User enters/selects specialty and location → (2) System queries doctors with matching specialty within radius → (3) Results filtered by real-time availability status (see FR-DOC-003) and calendar-slot availability → (4) Results ranked by AI Best-Match or user-selected sort
- Post Conditions: Ranked doctor list returned
- Acceptance Criteria: Results returned within 2s P95 for a metro-density search radius
- Dependencies: FR-DOC-003, Module 4 (hospital/clinic location data where doctor is hospital-affiliated)

**FR-DOC-003**
- Priority: P0
- Description: System shall allow a doctor (or their staff) to toggle a real-time availability status (`AVAILABLE`, `WITH_PATIENT`, `IN_SURGERY`, `OFF_DUTY`) distinct from calendar-slot availability, per the PRD's explicit business rule that these two concepts must not be conflated.
- Actor: Doctor, Hospital Scheduling Staff
- Preconditions: Doctor profile exists and is verified (per onboarding process, out of this module's scope)
- Trigger: Doctor/staff updates status via Provider Portal or WhatsApp Tier-1 reply
- Main Flow: (1) Status update submitted → (2) System validates against known state transitions (no direct `IN_SURGERY` → `AVAILABLE` without an intermediate step is NOT enforced — any transition is allowed, this is a manual honesty-based signal) → (3) Status persisted and immediately reflected in search/booking eligibility
- Post Conditions: Doctor's real-time status updated; urgent case-linked matching (FR-DOC-001) only considers `AVAILABLE` doctors
- Acceptance Criteria: Status change reflected in search results within 10 seconds (parity with PRD's FR-BED-001 acceptance pattern)
- Dependencies: L6 Tier 1 (WhatsApp ingestion parity), M14

**FR-DOC-004**
- Priority: P0
- Description: System shall allow booking a scheduled appointment slot from a doctor's published calendar.
- Actor: Citizen/Patient, Family/Caregiver (on behalf)
- Preconditions: Doctor has published open calendar slots
- Trigger: User selects a slot and confirms booking
- Main Flow: (1) User selects slot → (2) `ResourceCoordinationService.createHold()` (Appendix C2 pattern, `resourceType=DOCTOR_SLOT`) reserves the slot → (3) Booking confirmed → (4) `CaseTimelineEvent` emitted if case-linked
- Post Conditions: Appointment status `CONFIRMED`; slot no longer offered to other citizens
- Acceptance Criteria: Slot hold-to-confirm completes atomically; a double-booking attempt on the same slot is rejected per the generic ResourceHold engine's capacity-of-1 guarantee
- Dependencies: Appendix C2/M9 (generic ResourceHold engine), GT-01

**FR-DOC-005**
- Priority: P0
- Description: System shall support a walk-in queue-token booking mode for doctors/clinics that operate on a same-day queue basis rather than fixed scheduled slots.
- Actor: Citizen/Patient
- Preconditions: Doctor/clinic has enabled queue-token mode
- Trigger: User requests a queue token for the current day
- Main Flow: (1) User requests token → (2) System issues the next sequential token number for that doctor/day → (3) Estimated wait time computed from average consultation duration and current queue position → (4) User notified as their turn approaches
- Post Conditions: Token issued with status `CONFIRMED` (queued); status advances to `IN_CONSULTATION` when called
- Acceptance Criteria: Token issuance completes in under 3 seconds; estimated wait time recalculated at least every 5 minutes
- Dependencies: FR-DOC-003 (real-time availability gates whether queue is accepting new tokens)

**FR-DOC-006**
- Priority: P1
- Description: System shall support booking and joining a teleconsultation session with a doctor.
- Actor: Citizen/Patient, Doctor
- Preconditions: Doctor has teleconsult enabled; citizen has app/web access with camera/mic or audio-only fallback
- Trigger: User books a teleconsult slot (same booking pattern as FR-DOC-004, `resourceType=DOCTOR_SLOT` with a `channel=TELECONSULT` attribute)
- Main Flow: (1) Slot booked → (2) At scheduled time, both parties receive a join link/notification → (3) Session established (video, degrading to audio-only per GT-04 on low bandwidth) → (4) Session end triggers consultation-completion flow (FR-DOC-008)
- Post Conditions: Teleconsult session logged with duration; recording/notes handling per the PRD's strictest consent-scoping requirement for this data class
- Acceptance Criteria: Session join succeeds within 10 seconds of scheduled time under normal network; audio-only fallback succeeds under GT-04 low-network conditions
- Dependencies: FR-DOC-004, GT-04, GT-07 (strictest consent-scoping — PRD explicit)

**FR-DOC-007**
- Priority: P0
- Description: System shall allow a doctor to manage their own calendar (define recurring availability windows, block out unavailable dates, override individual slots).
- Actor: Doctor, Hospital Scheduling Staff
- Preconditions: Doctor profile verified and active
- Trigger: Doctor/staff opens calendar management in Provider Portal
- Main Flow: (1) Doctor defines recurring weekly availability template → (2) System generates bookable slots per template → (3) Doctor can block/override individual generated slots
- Post Conditions: Calendar reflects doctor-defined availability; changes propagate to search/booking within the same acceptance window as FR-DOC-003
- Acceptance Criteria: Calendar changes reflected in citizen-facing search within 10 seconds
- Dependencies: F2 (Provider Portal shell), F4 (Doctor Portal)

**FR-DOC-008**
- Priority: P0
- Description: System shall allow a doctor to mark a consultation complete and capture structured consultation notes and (optionally) a prescription.
- Actor: Doctor
- Preconditions: Appointment status `IN_CONSULTATION`
- Trigger: Doctor ends consultation and submits notes
- Main Flow: (1) Doctor enters consultation summary and, if applicable, prescription line items → (2) Appointment status transitions to `COMPLETED` → (3) `CaseTimelineEvent` emitted (summary only — full clinical notes remain consent-scoped per GT-07, never broadcast to the general Timeline view) → (4) If a prescription was entered, `prescription.issued` event emitted for Module 5 consumption
- Post Conditions: Appointment `COMPLETED`; consultation notes stored with strict consent-scoping; prescription (if any) available to Module 5
- Acceptance Criteria: `prescription.issued` event observable by Module 5 within the same session (M6 event-bus discipline)
- Dependencies: GT-07 (strictest consent-scoping, PRD explicit), Module 5 FR-PHR-001 (consumer), M6

**FR-DOC-009**
- Priority: P1
- Description: System shall allow a citizen/patient to cancel or reschedule a booked appointment prior to the scheduled time, subject to a minimum-notice window.
- Actor: Citizen/Patient, Family/Caregiver
- Preconditions: Appointment status `CONFIRMED`, not yet `IN_CONSULTATION`
- Trigger: User initiates cancel/reschedule
- Main Flow: (1) User selects cancel or reschedule → (2) If within minimum-notice window `(new, this document: default 2 hours before slot)`, system requires a reason code and may apply an operator-configurable no-show-adjacent flag → (3) `ResourceHold.releaseHold()` frees the slot → (4) If reschedule, FR-DOC-004 flow re-runs for the new slot
- Post Conditions: Appointment status `CANCELLED`, or `CONFIRMED` against the new slot if rescheduled
- Acceptance Criteria: Slot release-and-re-offer to other citizens completes within the same hold-expiry mechanics as Appendix C2
- Dependencies: Appendix C2/M9

**FR-DOC-010**
- Priority: P1
- Description: System shall detect and record a no-show when a citizen does not join/arrive for a `CONFIRMED` appointment within a grace period after the scheduled time.
- Actor: System, Doctor/Staff (manual override)
- Preconditions: Appointment status `CONFIRMED`; scheduled time has passed
- Trigger: Grace period `(new, this document: default 15 minutes)` elapses without a status transition to `IN_CONSULTATION`
- Main Flow: (1) Grace period timer expires → (2) Appointment status transitions to `NO_SHOW` → (3) Slot released → (4) No-show recorded against citizen's booking-reliability signal (for future rate-limiting/priority decisions, not a punitive citizen-facing score)
- Post Conditions: Appointment `NO_SHOW`; slot available for re-booking
- Acceptance Criteria: Transition occurs automatically without requiring doctor/staff manual action, verified via a scheduled job (M11)
- Dependencies: M11 (background jobs)

**FR-DOC-011**
- Priority: P2
- Description: System shall allow a family member/caregiver to book, view, and manage appointments on behalf of a linked patient, consistent with the "Family/Caregiver linked" role pattern established in Module 1 §1.15.
- Actor: Family/Caregiver (linked)
- Preconditions: Family/caregiver linkage established and consented (per Module 1 pattern; linkage mechanism itself owned by Citizen Onboarding, G3)
- Trigger: Linked caregiver initiates booking for the patient
- Main Flow: Identical to FR-DOC-004/005/006 with `initiator_id` set to the caregiver and `primary_patient_id` set to the linked patient
- Post Conditions: Appointment created under the patient's Case, caregiver recorded as initiator
- Acceptance Criteria: Caregiver sees the appointment in both their own and the patient's Case Dashboard views, per linked-case visibility rules
- Dependencies: G3 (Citizen Onboarding linkage), GT-07

**FR-DOC-012**
- Priority: P1
- Description: System shall display an insurance cashless-network status flag inline within doctor search results where the doctor/clinic is linked to a hospital with known insurer network status.
- Actor: System (display only, sourced from Module 7)
- Preconditions: Module 7 has network data for the doctor's affiliated hospital/clinic
- Trigger: Doctor search results rendered
- Main Flow: (1) Search results assembled → (2) For each result, Module 7's inline network-status API is queried → (3) Cashless flag + last-verified timestamp rendered alongside the doctor listing
- Post Conditions: No state change — read-only display
- Acceptance Criteria: Network status never presented without its last-verified timestamp (Module 7's own business rule, inherited here)
- Dependencies: Module 7 FR-INS-001 (this module's row for the identical inline-display pattern)

**FR-DOC-013**
- Priority: P1
- Description: System shall allow the platform's AI Coordination Layer to attach a post-stabilization doctor-match suggestion to a Case that originated from Module 1 (Ambulance), continuing the same Case rather than requiring a new booking flow.
- Actor: AI Coordination Layer
- Preconditions: Case originated via Module 1 and has reached `STABILIZED`
- Trigger: Same trigger as FR-DOC-001 — this FR clarifies the cross-module continuity requirement explicitly rather than leaving it implicit
- Main Flow: Identical to FR-DOC-001, with the explicit constraint that the existing `case_id` is reused, never a new Case created for the same patient/incident
- Post Conditions: Doctor booking, once confirmed, appears as a `linked_service` entry on the same Case (per PRD Part A2's `linked_services` array concept)
- Acceptance Criteria: No duplicate Case is ever created for a Module 1 → Module 3 continuation, verified via `case_id` continuity in integration tests
- Dependencies: FR-DOC-001, GT-01, Module 1 §1.13 AF-03 (identical cross-module continuity pattern already established there)

**FR-DOC-014**
- Priority: P2
- Description: System shall support multi-language doctor profile data (specialties, bio, languages spoken) to support the "language spoken" search filter named in the base PRD's Functional Scope.
- Actor: Doctor/Staff (data entry), Citizen (consumer)
- Preconditions: None
- Trigger: Doctor profile created/edited; citizen searches with a language filter
- Main Flow: (1) Doctor/staff tags profile with spoken languages → (2) Citizen filters search by language → (3) Only matching doctors returned
- Post Conditions: None (read/filter feature)
- Acceptance Criteria: Language filter is a first-class search parameter, not a post-hoc text search over free-form bio text
- Dependencies: GT-05 (localization)

**FR-DOC-015**
- Priority: P1
- Description: System shall degrade doctor search/booking gracefully under GT-04 low-network conditions, per the same pattern already required of Module 1/2.
- Actor: Citizen/Patient
- Preconditions: Device on a degraded network connection
- Trigger: Search or booking attempted under low bandwidth
- Main Flow: (1) System detects degraded connectivity signal → (2) Search results served from a last-known-good cache with a staleness indicator → (3) Booking (a write action) is not silently cached — it queues per GT-03's offline-queue pattern and confirms on reconnect, never falsely showing "confirmed" while offline
- Post Conditions: User sees an explicit staleness/pending indicator, never a false-confirmation state
- Acceptance Criteria: No booking is ever displayed as `CONFIRMED` to the user before the server has actually confirmed it, even under offline-queue conditions
- Dependencies: GT-03, GT-04

---

# MODULE 4 — NEARBY HOSPITALS

*(Base spec: PRD Part B, "MODULE 4 — NEARBY HOSPITALS". This module is explicitly infrastructure-first — a reference index consumed by Modules 1/2/3/7 — not primarily a standalone citizen destination, per the base PRD's own framing.)*

**FR-NBH-001** *(PRD's own Representative FR, reproduced verbatim for table completeness)*
- Priority: P0
- Description: System shall display, for any hospital profile, a live-linked (not cached-duplicate) summary of current bed/doctor availability sourced in real time from Modules 2 and 3.
- Actor: System (display only)
- Preconditions: Hospital profile exists; Module 2/3 data available for that hospital
- Trigger: Hospital profile viewed
- Main Flow: (1) Profile requested → (2) System calls Module 2's bed-search API and Module 3's doctor-search API scoped to this hospital → (3) Results rendered inline on the profile, never stored as a duplicate "availability" field on this module's own data
- Post Conditions: No state change — read-only aggregation
- Acceptance Criteria: Displayed availability never drifts from Module 2/3's own live data (verified by contract test asserting no local caching beyond request-scoped memory)
- Dependencies: Module 2 FR-BED-002, Module 3 search

**FR-NBH-002**
- Priority: P0
- Description: System shall allow search for hospitals by specialty offered, accreditation, ownership type (government/private/trust), and distance.
- Actor: Citizen/Patient, Family/Caregiver
- Preconditions: None
- Trigger: User opens Hospital Directory search
- Main Flow: (1) User enters filters → (2) System queries hospital profile data matching filters within radius → (3) Results ranked by distance or user-selected sort
- Post Conditions: Ranked hospital list returned
- Acceptance Criteria: Results returned within 2s P95
- Dependencies: FR-NBH-004 (data must be sourced/verified, not solely self-reported)

**FR-NBH-003**
- Priority: P0
- Description: System shall display a full hospital profile (specialties, accreditation, facility type, contact info, operating hours) on request.
- Actor: Citizen/Patient
- Preconditions: Hospital profile exists
- Trigger: User selects a hospital from search results
- Main Flow: (1) Profile requested → (2) Static profile data rendered → (3) Live bed/doctor availability rendered per FR-NBH-001 → (4) Insurance network status rendered per FR-NBH-006
- Post Conditions: None (read-only)
- Acceptance Criteria: Full profile renders in a single request/page load, not multiple round-trips visible to the user as separate loading states beyond a brief live-data spinner
- Dependencies: FR-NBH-001, FR-NBH-006

**FR-NBH-004**
- Priority: P0
- Description: System shall ingest hospital profile data from an independently verifiable source (government hospital registry, NABH accreditation database) as the primary source of truth, with operator-self-reported data treated as supplementary/correctable, per the base PRD's explicit business rule.
- Actor: Platform Ops/Data Team, Government Registry (data source)
- Preconditions: A government/NABH registry data-sharing agreement exists for the relevant state (per the base PRD's flagged Open Question — coverage will be partial, module must function with partial coverage)
- Trigger: Scheduled ingestion job (M11) or manual data-load for a new state's registry feed
- Main Flow: (1) Registry data pulled/ingested → (2) Matched against existing hospital profiles (dedupe by name+location+registration-ID where available) → (3) New/updated profiles created with `source=REGISTRY` flag
- Post Conditions: Hospital profile carries a `data_source` field distinguishing registry-sourced from operator-self-reported data
- Acceptance Criteria: A hospital profile's core identity fields (legal name, registration ID, accreditation status) are never editable by the hospital operator directly — only correction-request submission (FR-NBH-010) is available to operators
- Dependencies: Part H8 (NABH/NABL accreditation source), G4 (onboarding verification, distinct concern but same data trust principle)

**FR-NBH-005**
- Priority: P1
- Description: System shall run a periodic re-verification job on accreditation status, since accreditation can lapse and the platform must not display stale accreditation claims indefinitely (base PRD, Part H8 cross-reference, explicit).
- Actor: System (scheduled job)
- Preconditions: Hospital profile has an accreditation record with a known validity/renewal cycle
- Trigger: Scheduled job (M11), cadence configurable per accreditation type
- Main Flow: (1) Job runs → (2) Queries registry/accreditation source for current status → (3) If lapsed/changed, profile updated and a staleness/change flag surfaces on the profile until operator/ops confirms
- Post Conditions: Accreditation status kept current within the job's cadence; never silently left stale
- Acceptance Criteria: A lapsed accreditation is reflected on the citizen-facing profile within one job cycle, not left indefinitely stale
- Dependencies: FR-NBH-004, M11

**FR-NBH-006**
- Priority: P0
- Description: System shall display an insurance cashless-network status flag inline on hospital search results and profiles, sourced from Module 7, with its mandatory last-verified timestamp.
- Actor: System (display only, sourced from Module 7)
- Preconditions: Module 7 has network data for the hospital
- Trigger: Search results or profile rendered
- Main Flow: Identical pattern to FR-DOC-012, applied at the hospital level
- Post Conditions: No state change
- Acceptance Criteria: Same as FR-DOC-012 — never displayed without a last-verified timestamp
- Dependencies: Module 7 FR-INS-001

**FR-NBH-007**
- Priority: P1
- Description: System shall allow filtering hospital search by facility type (government/private/trust).
- Actor: Citizen/Patient
- Preconditions: None
- Trigger: User applies facility-type filter
- Main Flow: Filter applied to the search query defined in FR-NBH-002
- Post Conditions: None
- Acceptance Criteria: Filter is a first-class query parameter, combinable with all other FR-NBH-002 filters
- Dependencies: FR-NBH-002

**FR-NBH-008**
- Priority: P0
- Description: System shall serve as the candidate-hospital query API consumed directly by Module 1 (Ambulance destination selection) and Module 2 (bed-search source-of-candidates), per the base PRD's explicit framing of this module as infrastructure other modules query rather than duplicate.
- Actor: Module 1 Service, Module 2 Service (internal callers, direct function calls per L4)
- Preconditions: None
- Trigger: Module 1/2 needs a candidate hospital set for matching
- Main Flow: (1) Calling module invokes this module's service interface directly (never a database read into this module's schema, per M1) → (2) Filtered/ranked candidate set returned
- Post Conditions: None — a query-serving role, no state change
- Acceptance Criteria: % of Module 1/2 matching decisions that successfully used this module's candidate set — this is the base PRD's own stated Success Metric for this module, and this FR is the mechanism that makes that metric meaningful
- Dependencies: M1 (module boundary rule), L4

**FR-NBH-009**
- Priority: P2
- Description: System shall allow a hospital operator to submit a data-correction request against their own profile (e.g., incorrect specialty list, outdated contact info), reviewed by Platform Ops before applying, given that core identity/accreditation fields are registry-sourced and not directly operator-editable (FR-NBH-004).
- Actor: Hospital Operator/Staff, Platform Ops (reviewer)
- Preconditions: Hospital profile exists and operator has verified Provider Portal access (G4)
- Trigger: Operator submits a correction request via Provider Portal
- Main Flow: (1) Operator submits proposed change with justification → (2) Request queued for Ops review → (3) Ops approves/rejects → (4) If approved, profile updated with `data_source=OPERATOR_CORRECTED` for the changed field(s)
- Post Conditions: Correction applied or rejected, both audited (GT-06)
- Acceptance Criteria: No operator-submitted change is ever applied without an Ops review step
- Dependencies: G4/G9 (Console review capability), GT-06

**FR-NBH-010**
- Priority: P2
- Description: System shall allow any authenticated user (citizen, operator, ops) to flag a hospital listing as a suspected duplicate or stale entry, feeding a data-quality review queue distinct from the correction-request flow in FR-NBH-009.
- Actor: Citizen, Hospital Operator, Platform Ops
- Preconditions: Hospital profile exists
- Trigger: User submits a "report this listing" action
- Main Flow: (1) Flag submitted with reason category (duplicate/stale/incorrect) → (2) Queued for Ops review → (3) Ops merges/updates/dismisses
- Post Conditions: Flag resolved, audited
- Acceptance Criteria: Flag submission requires no more than one screen/step from the citizen's perspective (low-friction reporting)
- Dependencies: G9 (Ops review tooling)

**FR-NBH-011**
- Priority: P2
- Description: System shall support multi-language hospital profile data (specialty names, facility descriptions) consistent with GT-05.
- Actor: Platform Ops/Data Team
- Preconditions: None
- Trigger: Profile created/edited or citizen views in a non-default language
- Main Flow: Localized fields rendered per the user's selected language; falls back to default language if translation unavailable, never a blank field
- Post Conditions: None
- Acceptance Criteria: No profile field ever renders blank due to missing translation — default-language fallback is mandatory
- Dependencies: GT-05

**FR-NBH-012**
- Priority: P1
- Description: System shall support offline browsing of a last-known-good cached hospital directory (search only, not booking — booking is owned by Modules 2/3), per GT-03.
- Actor: Citizen/Patient
- Preconditions: Directory previously loaded/cached on-device
- Trigger: Device loses connectivity while browsing
- Main Flow: (1) Connectivity lost → (2) Search falls back to on-device cache with a clear "offline / last updated at X" indicator → (3) Any booking action is disabled from this cached view (redirects to Module 2/3's own offline-queue handling)
- Post Conditions: None — read-only fallback
- Acceptance Criteria: Cached browsing never allows a booking action to appear available when actually offline
- Dependencies: GT-03, Module 2/3 (booking ownership)

**FR-NBH-013**
- Priority: P1
- Description: System shall degrade search gracefully under GT-04 low-network conditions with a visible staleness indicator, consistent with the pattern required across every module.
- Actor: Citizen/Patient
- Preconditions: Degraded network connection
- Trigger: Search attempted under low bandwidth
- Main Flow: Same pattern as FR-DOC-015, applied to hospital directory search
- Post Conditions: None
- Acceptance Criteria: Same as FR-DOC-015
- Dependencies: GT-04

**FR-NBH-014**
- Priority: P2
- Description: System shall track a directory data-freshness/accuracy audit score, per the base PRD's own stated Success Metric for this module.
- Actor: System (scheduled job), Platform Ops (consumer of the metric)
- Preconditions: A baseline of registry cross-checks and correction/flag resolution history exists
- Trigger: Scheduled scoring job (M11)
- Main Flow: (1) Job computes a composite score from re-verification job outcomes (FR-NBH-005), correction-request volume/resolution time (FR-NBH-009), and flag volume (FR-NBH-010) → (2) Score surfaced on an Ops/Analytics dashboard (G12)
- Post Conditions: Score available for Ops/Analytics consumption
- Acceptance Criteria: Score recomputed at least weekly
- Dependencies: G12 (Analytics), M11

**FR-NBH-015**
- Priority: P1
- Description: System shall expose insurance network-eligibility as a search filter (not just an inline display per FR-NBH-006), allowing citizens to search specifically for in-network hospitals for their policy.
- Actor: Citizen/Patient
- Preconditions: Citizen has a linked insurance policy (Module 7)
- Trigger: User applies an "in-network for my policy" filter
- Main Flow: (1) Filter applied → (2) System queries Module 7 for the citizen's policy's network hospital list → (3) Search results restricted to that set
- Post Conditions: None
- Acceptance Criteria: Filter respects Module 7's last-verified-timestamp discipline — a hospital whose network status is stale beyond a configurable threshold is excluded from "confirmed in-network" results rather than silently included
- Dependencies: Module 7 FR-INS-001, Module 7 FR-INS-002

---

# MODULE 5 — PHARMACY LOCATOR

*(Base spec: PRD Part B, "MODULE 5 — PHARMACY LOCATOR". Status machine: `SEARCHING → STOCK_CONFIRMED_HOLD → FULFILLED` | `EXPIRED` | `OUT_OF_STOCK`. Stock-hold default expiry: 60 minutes, shorter than bed holds per the base PRD's explicit business rule.)*

**FR-PHR-001** *(PRD's own Representative FR, reproduced verbatim for table completeness)*
- Priority: P0
- Description: System shall allow a case-linked prescription fulfillment search that pre-fills medicine names/quantities from the Module 3 consultation record, ranking pharmacies by stock confirmation + distance.
- Actor: Citizen/Patient, Family/Caregiver
- Preconditions: A `prescription.issued` event exists for the Case (Module 3 FR-DOC-008)
- Trigger: Citizen opens "Fill My Prescription" from the Case Dashboard
- Main Flow: (1) Prescription record pulled → (2) Nearby pharmacies queried for stock confirmation on each line item → (3) Results ranked by full-stock-match confirmation + distance → (4) Citizen selects pharmacy and proceeds to FR-PHR-004 (stock hold)
- Post Conditions: Ranked pharmacy list with per-item stock-confirmation status
- Acceptance Criteria: Search reflects real-time stock status, not a cached snapshot older than the pharmacy's own update interval
- Dependencies: Module 3 prescription record, GT-01

**FR-PHR-002**
- Priority: P1
- Description: System shall allow a standalone medicine search (by name) outside of any case context, for citizens managing chronic-condition refills or general medicine needs.
- Actor: Citizen/Patient
- Preconditions: None
- Trigger: User searches by medicine name without an active case
- Main Flow: (1) Medicine name entered → (2) Pharmacies queried for stock on that item → (3) Results ranked by distance/stock-confirmation
- Post Conditions: Ranked pharmacy list for the searched item
- Acceptance Criteria: Same performance target as case-linked search (FR-PHR-001)
- Dependencies: None (this module's core capability, case-linking is additive per FR-PHR-001)

**FR-PHR-003**
- Priority: P0
- Description: System shall allow search for pharmacies by location and 24-hour-operation status, independent of any specific medicine query.
- Actor: Citizen/Patient
- Preconditions: None
- Trigger: User opens Pharmacy Search
- Main Flow: (1) Location entered → (2) Pharmacies within radius returned, filterable by 24-hour operation → (3) Results ranked by distance
- Post Conditions: None
- Acceptance Criteria: 24-hour filter is a first-class query parameter
- Dependencies: None

**FR-PHR-004**
- Priority: P0
- Description: System shall place an atomic stock hold on selected medicine line items at a chosen pharmacy, using the generic ResourceHold engine, decrementing available stock immediately (same pattern as Module 2's bed-hold BR-01).
- Actor: Citizen/Patient
- Preconditions: Pharmacy has confirmed stock for the requested item(s)
- Trigger: Citizen selects "hold this stock" at a specific pharmacy
- Main Flow: (1) `ResourceCoordinationService.createHold()` invoked with `resourceType=PHARMACY_STOCK` → (2) Atomicity via `SELECT ... FOR UPDATE` on the stock-capacity row (Appendix C2/M9 pattern) → (3) Hold confirmed with a 60-minute default expiry (base PRD's explicit business rule, shorter than bed holds)
- Post Conditions: Stock status `STOCK_CONFIRMED_HOLD`; available count decremented
- Acceptance Criteria: Concurrent hold attempts against the same limited-stock item cannot oversell, per the same concurrency guarantee proven for Phase 1's generic engine
- Dependencies: Appendix C2/M9, Phase 1 ResourceHold engine

**FR-PHR-005**
- Priority: P0
- Description: System shall automatically expire an unfulfilled stock hold after its 60-minute window, releasing the stock back to available inventory.
- Actor: System (scheduled job)
- Preconditions: Hold status `PENDING`/`STOCK_CONFIRMED_HOLD`, past `expires_at`
- Trigger: `ResourceHoldExpiryJob` (Phase 1, M11) — this module configures the same generic job, not a new one
- Main Flow: Identical to the generic engine's expiry mechanics proven in Phase 1
- Post Conditions: Hold status `EXPIRED`; stock count incremented back
- Acceptance Criteria: Expiry occurs within one job cycle of the deadline, verified via the same test pattern as the Phase 1 concurrency test
- Dependencies: Phase 1 `ResourceHoldExpiryJob`

**FR-PHR-006**
- Priority: P0
- Description: System shall allow the citizen to confirm in-store pickup, transitioning the hold to fulfilled status.
- Actor: Citizen/Patient, Pharmacy Staff
- Preconditions: Hold status `STOCK_CONFIRMED_HOLD`, not expired
- Trigger: Citizen arrives and pharmacy staff confirms handover (via Provider Portal or WhatsApp Tier-1 reply)
- Main Flow: (1) Staff marks hold as fulfilled → (2) `CaseTimelineEvent` emitted if case-linked → (3) Hold status `FULFILLED`
- Post Conditions: Transaction closed; stock permanently decremented (not returned to available pool)
- Acceptance Criteria: Fulfillment confirmation available via both Portal and WhatsApp Tier-1 reply, per L2's "co-equal, not fallback" channel principle
- Dependencies: L2, M14

**FR-PHR-007**
- Priority: P1
- Description: System shall handle an out-of-stock outcome by suggesting alternate nearby pharmacies with confirmed stock for the same item(s), never presenting a dead-end.
- Actor: System
- Preconditions: Selected pharmacy lacks stock for one or more requested items
- Trigger: Stock-confirmation check (FR-PHR-001/002) returns a partial or zero match
- Main Flow: (1) Out-of-stock item(s) identified → (2) System queries alternate pharmacies within an expanded radius for the missing item(s) → (3) Alternate suggestions surfaced inline, per Appendix C1's "matching/availability errors must always pair with a next-best-action" rule
- Post Conditions: Status `OUT_OF_STOCK` for the original selection; alternates presented
- Acceptance Criteria: Never a bare "not available" message without at least one next-best-action per Appendix C1
- Dependencies: Appendix C1 (Standard Error Taxonomy)

**FR-PHR-008**
- Priority: P0
- Description: System shall validate a prescription-linked fulfillment request against Module 3's issued prescription record to prevent fraudulent or duplicate fulfillment claims, per the base PRD's explicit business rule.
- Actor: System
- Preconditions: Fulfillment request references a `prescription.issued` record
- Trigger: Fulfillment request submitted (FR-PHR-001 flow)
- Main Flow: (1) Prescription reference validated against Module 3's record (line items, quantities, issuing doctor) → (2) A prescription already marked fulfilled elsewhere is rejected → (3) Only a validated, not-yet-fulfilled prescription proceeds to stock search
- Post Conditions: Prescription marked `IN_FULFILLMENT` once a hold is placed against it, preventing a second concurrent fulfillment attempt
- Acceptance Criteria: A prescription cannot be fulfilled twice, verified by an integration test attempting concurrent fulfillment at two different pharmacies
- Dependencies: Module 3 FR-DOC-008

**FR-PHR-009**
- Priority: P0
- Description: System shall allow a pharmacy operator (independent/non-chain) to manually update medicine stock counts via a lightweight interface (Provider Portal form or WhatsApp Tier-1 structured reply), per the same "partial digital maturity" assumption established for Module 2's hospitals.
- Actor: Pharmacy Operator/Staff
- Preconditions: Pharmacy onboarded (G4, Pharmacy provider type)
- Trigger: Operator updates stock count for an item
- Main Flow: Identical pattern to Module 2's FR-BED-001/L6 Tier 1 WhatsApp ingestion, applied to `resourceType=PHARMACY_STOCK`
- Post Conditions: Stock count updated; reflected in search within the same 10-second acceptance window as Module 2
- Acceptance Criteria: WhatsApp and Portal update paths produce identical downstream state (L2 "one source of truth" principle)
- Dependencies: L2, L6 Tier 1, M14, Module 2 FR-BED-001 (identical pattern reused)

**FR-PHR-010**
- Priority: P2
- Description: System shall support API-integrated stock synchronization for pharmacy chains with existing inventory management systems, as a higher-tier ingestion path than the manual update in FR-PHR-009.
- Actor: Pharmacy Chain's Inventory System (integration), Platform
- Preconditions: Chain has an integration agreement and API/webhook access configured
- Trigger: Chain's inventory system pushes a stock update (webhook) or platform polls on a schedule
- Main Flow: (1) Update received/polled → (2) Mapped to this module's stock-capacity model → (3) Same downstream state as a manual update, keeping L2's single-source-of-truth principle regardless of ingestion tier
- Post Conditions: Stock count updated
- Acceptance Criteria: No divergence in downstream state between Tier 1 (manual) and this tier — same acceptance test as FR-PHR-009
- Dependencies: L6 (tiered, configuration-driven ingestion)

**FR-PHR-011**
- Priority: P1
- Description: System shall restrict prescription-linked consultation/prescription data visibility to the specific fulfilling pharmacy's need-to-know scope (the prescription itself), never exposing the patient's broader medical history, per the base PRD's explicit security/privacy note.
- Actor: System (access control)
- Preconditions: Pharmacy staff accessing a fulfillment request
- Trigger: Pharmacy staff opens a fulfillment request
- Main Flow: Access-control check restricts the visible payload to prescription line items and citizen contact info only — no consultation notes, no broader case history
- Post Conditions: None — an access-scoping guarantee, not a state change
- Acceptance Criteria: Verified via an access-control test asserting a pharmacy-scoped API response never includes consultation-note fields
- Dependencies: GT-07, Module 3 §3 security note (identical consent-scoping principle applied here)

**FR-PHR-012**
- Priority: P2
- Description: System shall support a refill reminder for chronic-condition prescriptions, notifying the citizen when a typical refill interval approaches.
- Actor: System (scheduled job), Citizen/Patient
- Preconditions: A prescription is tagged as a chronic/recurring medication (by the prescribing doctor, Module 3)
- Trigger: Scheduled job (M11) computes approaching refill dates
- Main Flow: (1) Job identifies prescriptions nearing their typical refill interval → (2) Notification sent to citizen → (3) Citizen can initiate FR-PHR-001 directly from the notification
- Post Conditions: None — a proactive notification, not a state change
- Acceptance Criteria: Reminder sent no earlier than 7 days and no later than 1 day before the computed refill date `(new, this document)`
- Dependencies: M11, Module 3 (chronic-medication tagging, a Module 3 data concern)

**FR-PHR-013**
- Priority: P1
- Description: System shall provide a "nearest open 24-hour pharmacy" emergency-oriented quick filter, surfaced prominently for case-linked urgent fulfillment needs.
- Actor: Citizen/Patient
- Preconditions: None
- Trigger: User selects the emergency quick-filter
- Main Flow: Search restricted to pharmacies with `24_hour=true` and currently `OPEN`, ranked purely by distance (no ranking by other factors, given the time-critical framing)
- Post Conditions: None
- Acceptance Criteria: This filter bypasses the default AI Best-Match ranking entirely in favor of pure distance, since the emergency framing prioritizes speed over composite scoring
- Dependencies: FR-PHR-003

**FR-PHR-014**
- Priority: P0
- Description: System shall emit a `CaseTimelineEvent` on fulfillment confirmation (FR-PHR-006) when the fulfillment is case-linked, per GT-02's mandatory-emission rule.
- Actor: System
- Preconditions: Fulfillment is case-linked (has a `case_id`)
- Trigger: Fulfillment confirmed (FR-PHR-006)
- Main Flow: `CaseTimelineEvent` of type `pharmacy.fulfilled` emitted with pharmacy name and item summary (not full prescription detail, consistent with FR-PHR-011's scoping principle applied to the Timeline itself)
- Post Conditions: Timeline updated; visible on Case Dashboard
- Acceptance Criteria: Event appears on the Case Timeline within the same latency target as other modules' timeline events (GT-02 general expectation)
- Dependencies: GT-02, FR-PHR-006

**FR-PHR-015**
- Priority: P1
- Description: System shall track stock-hold accuracy (held-vs-actually-available-at-pickup) as an operational metric, per the base PRD's own stated Success Metric for this module.
- Actor: System (scheduled/analytics job), Platform Ops
- Preconditions: A history of holds and fulfillment/expiry outcomes exists
- Trigger: Scheduled analytics job
- Main Flow: (1) Job compares held-quantity vs. actual-fulfilled-quantity across recent transactions → (2) Accuracy score computed and surfaced to Ops/Analytics (G12)
- Post Conditions: Metric available for Ops/Analytics consumption
- Acceptance Criteria: Computed at least daily
- Dependencies: G12

---

# MODULE 6 — BLOOD BANK

*(Base spec: PRD Part B, "MODULE 6 — BLOOD BANK". Status machines: `STOCK_SEARCH → HELD → CONFIRMED → DISPENSED`; donor-request: `DONOR_MATCHED → DONOR_CONFIRMED → DONATION_COMPLETED`; `EXPIRED/DECLINED`. Donor cooldown: WHO/NACO guideline-based, e.g. 90 days for whole blood, per the base PRD's explicit business rule.)*

**FR-BLD-001** *(PRD's own Representative FR, reproduced verbatim for table completeness)*
- Priority: P1
- Description: System shall automatically create a pre-alert (not a committed request) to blood banks near a candidate hospital when a Case is flagged trauma/obstetric/surgical by the AI Coordination Layer, so component availability can be verified proactively before an explicit request is made.
- Actor: AI Coordination Layer
- Preconditions: Case severity-classified as trauma/obstetric/surgical (Module 1 severity classification)
- Trigger: `case.severity_classified` event with a qualifying category
- Main Flow: (1) Event consumed → (2) Nearby blood banks queried for candidate stock (not held/reserved yet) → (3) Pre-alert notification sent to those blood banks so they can proactively verify component availability → (4) No citizen-facing commitment created at this stage
- Post Conditions: Pre-alert logged; no stock decremented (this is explicitly NOT a hold)
- Acceptance Criteria: Pre-alert reaches candidate blood banks within 30 seconds of the triggering event `(new, this document)`
- Dependencies: Module 1 severity classification, GT-02

**FR-BLD-002**
- Priority: P0
- Description: System shall allow search for blood bank stock by blood type and component (whole blood, platelets, plasma, specific rare types).
- Actor: Citizen/Patient, Family/Caregiver, Hospital Staff
- Preconditions: None
- Trigger: User/staff searches blood availability
- Main Flow: (1) Type/component/location entered → (2) Blood banks with matching component-level stock queried → (3) Results ranked by distance and confirmed-stock status
- Post Conditions: Ranked blood-bank list with component-level detail
- Acceptance Criteria: Component-level (not just "has blood") granularity is mandatory per the base PRD's explicit functional scope
- Dependencies: None

**FR-BLD-003**
- Priority: P0
- Description: System shall allow an explicit blood unit request, either following a pre-alert (FR-BLD-001) or as a standalone request.
- Actor: Citizen/Patient, Family/Caregiver, Hospital Staff (on behalf)
- Preconditions: Candidate blood bank identified with matching component stock
- Trigger: User/staff submits an explicit request
- Main Flow: (1) Request submitted, referencing a `case_id` where applicable → (2) `ResourceCoordinationService.createHold()` invoked with `resourceType=BLOOD_UNIT` → (3) Hold placed, status `HELD`
- Post Conditions: Blood unit(s) held; available stock decremented immediately (base PRD's explicit business rule, same pattern as Module 2 BR-01)
- Acceptance Criteria: Same atomicity guarantee as the Phase 1 generic engine's proven concurrency test
- Dependencies: Appendix C2/M9

**FR-BLD-004**
- Priority: P0
- Description: System shall confirm a held blood unit request, transitioning it toward dispensing.
- Actor: Blood Bank Staff
- Preconditions: Hold status `HELD`, not expired
- Trigger: Blood bank staff confirms unit availability and readiness for dispensing
- Main Flow: `ResourceCoordinationService.confirmHold()` transitions status to `CONFIRMED`
- Post Conditions: Status `CONFIRMED`
- Acceptance Criteria: Confirmation available via Provider Portal or WhatsApp Tier-1 reply (L2)
- Dependencies: Appendix C2/M9, L2

**FR-BLD-005**
- Priority: P0
- Description: System shall automatically expire an unconfirmed blood-unit hold after its configured expiry window, releasing stock back to available inventory, using the same generic expiry job as every other module's resource holds.
- Actor: System (scheduled job)
- Preconditions: Hold status `HELD`, past `expires_at`
- Trigger: `ResourceHoldExpiryJob` (Phase 1, shared across all modules — no module-specific reimplementation per M9's "extend the generic engine, don't fork it" rule)
- Main Flow: Identical to Phase 1's proven expiry mechanics
- Post Conditions: Status `EXPIRED`; stock count incremented back
- Acceptance Criteria: Same acceptance criteria as FR-PHR-005 and Phase 1's own exit criteria
- Dependencies: Phase 1 `ResourceHoldExpiryJob`, M9

**FR-BLD-006**
- Priority: P1
- Description: System shall automatically escalate a rare blood-type match to the widest available search radius when no local stock is confirmed, per the base PRD's explicit business rule.
- Actor: System
- Preconditions: Requested blood type is flagged rare `(new, this document: rare-type list configurable, e.g. AB-negative and below a stock-count threshold)`; no confirmed stock within default radius
- Trigger: Stock search (FR-BLD-002) returns zero confirmed matches within default radius for a rare type
- Main Flow: (1) Zero-match detected → (2) Search radius automatically widened to platform-maximum → (3) If still zero, donor-matching flow (FR-BLD-009) is triggered automatically rather than requiring a separate user action
- Post Conditions: Widened search results returned, or donor-matching initiated
- Acceptance Criteria: Escalation is automatic, not a manual "search wider" action the user must discover
- Dependencies: FR-BLD-009

**FR-BLD-007**
- Priority: P1
- Description: System shall allow a citizen to register as a voluntary blood donor, capturing blood type and eligibility-relevant data.
- Actor: Citizen (as Donor)
- Preconditions: None
- Trigger: User opts into donor registry
- Main Flow: (1) User submits blood type and basic eligibility screening questions → (2) Registration recorded with `eligible=true` pending the cooldown tracking in FR-BLD-008 → (3) Explicit opt-in consent captured for future proactive-match outreach, per the base PRD's flagged Open Question that this consent framework is a Phase 1 launch prerequisite, not an afterthought
- Post Conditions: Donor record created
- Acceptance Criteria: No donor is ever contacted for a match without having explicitly opted into proactive outreach at registration
- Dependencies: GT-07, base PRD §6 Open Questions (donor consent framework)

**FR-BLD-008**
- Priority: P0
- Description: System shall enforce a minimum donation-interval cooldown (WHO/NACO guideline-based, e.g. 90 days for whole blood) on donor eligibility, enforced by the system rather than merely advised, per the base PRD's explicit business rule.
- Actor: System
- Preconditions: Donor has a prior recorded donation
- Trigger: Donor-matching flow considers a candidate donor (FR-BLD-009)
- Main Flow: (1) Candidate donor's last-donation date checked against the component-specific cooldown period → (2) Donors within cooldown are excluded from matching entirely, not merely deprioritized
- Post Conditions: None — an eligibility filter
- Acceptance Criteria: A donor within their cooldown period is never surfaced as a match candidate, verified via a dedicated test case
- Dependencies: FR-BLD-009

**FR-BLD-009**
- Priority: P1
- Description: System shall match and notify eligible voluntary donors when blood bank stock cannot fulfill a request (rare type or general shortage).
- Actor: System, Donor
- Preconditions: Eligible donors exist (FR-BLD-007, FR-BLD-008 filters applied) matching the required blood type/component
- Trigger: FR-BLD-006 escalation, or blood bank staff manually initiates donor search for a shortage
- Main Flow: (1) Eligible donor pool queried → (2) Notification sent to matched donors (never exposing requester identity to the donor at this stage) → (3) Donor status transitions to `DONOR_MATCHED`
- Post Conditions: One or more donors notified
- Acceptance Criteria: Requester never sees donor identity/contact directly — introduction is mediated by the blood bank, per the base PRD's explicit security/privacy rule
- Dependencies: FR-BLD-007, FR-BLD-008, GT-07

**FR-BLD-010**
- Priority: P1
- Description: System shall allow a matched donor to confirm availability and schedule a donation appointment with the blood bank.
- Actor: Donor
- Preconditions: Donor status `DONOR_MATCHED`
- Trigger: Donor responds to match notification
- Main Flow: (1) Donor confirms → (2) Status transitions to `DONOR_CONFIRMED` → (3) Blood bank schedules the donation visit
- Post Conditions: Status `DONOR_CONFIRMED`
- Acceptance Criteria: A donor who declines is recorded as `DECLINED` and excluded from this specific match cycle without penalty to future eligibility
- Dependencies: FR-BLD-009

**FR-BLD-011**
- Priority: P1
- Description: System shall record donation completion, updating the donor's last-donation date for future cooldown enforcement (FR-BLD-008) and the donor-reliability signal referenced in the base PRD's Success Metrics.
- Actor: Blood Bank Staff
- Preconditions: Donor status `DONOR_CONFIRMED`; donor physically donated
- Trigger: Blood bank staff marks donation complete
- Main Flow: (1) Completion recorded → (2) Status transitions to `DONATION_COMPLETED` → (3) Last-donation date updated → (4) Donor's show-up/reliability signal updated (base PRD's explicit Success Metric: "donation show-up rate")
- Post Conditions: Donor record updated; new stock unit potentially added to blood bank inventory (inventory management itself is the blood bank's internal process, out of scope per base PRD)
- Acceptance Criteria: Cooldown period calculated from this exact completion date going forward
- Dependencies: FR-BLD-008

**FR-BLD-012**
- Priority: P0
- Description: System shall allow a blood bank operator to manually update component-level stock counts via Provider Portal or WhatsApp Tier-1 reply, for banks without inventory-system integration.
- Actor: Blood Bank Operator/Staff
- Preconditions: Blood bank onboarded (G4)
- Trigger: Operator updates stock
- Main Flow: Identical pattern to FR-PHR-009/Module 2 FR-BED-001, applied to `resourceType=BLOOD_UNIT` with component-level granularity
- Post Conditions: Stock updated
- Acceptance Criteria: Same L2 parity requirement as every other module's manual-update path
- Dependencies: L2, L6 Tier 1, M14

**FR-BLD-013**
- Priority: P2
- Description: System shall link to NACO/state blood transfusion council registries where available, for blood bank verification and regulatory reporting, per the base PRD's Integration note.
- Actor: Platform Ops, NACO/State Registry (data source)
- Preconditions: A data-sharing relationship exists for the relevant state (base PRD's flagged Open Question — varies by state)
- Trigger: Blood bank onboarding (G4) or scheduled reconciliation job
- Main Flow: Blood bank's registration verified against the registry where integration exists; where it doesn't, manual verification per G4's stage-gated onboarding applies instead
- Post Conditions: Blood bank profile carries a verification-source flag
- Acceptance Criteria: Module functions correctly with partial state-by-state registry coverage, per the base PRD's explicit expectation
- Dependencies: G4

**FR-BLD-014**
- Priority: P1
- Description: System shall dispense a confirmed blood unit, closing the transaction and permanently decrementing stock.
- Actor: Blood Bank Staff
- Preconditions: Hold status `CONFIRMED`
- Trigger: Physical dispensing occurs, staff marks as dispensed
- Main Flow: (1) Staff confirms dispensing → (2) Status transitions to `DISPENSED` → (3) `CaseTimelineEvent` emitted if case-linked
- Post Conditions: Transaction closed
- Acceptance Criteria: Same Timeline-emission discipline as every other module (GT-02)
- Dependencies: GT-02

**FR-BLD-015**
- Priority: P1
- Description: System shall track time-from-request-to-confirmed-unit and rare-type match success rate as operational metrics, per the base PRD's own stated Success Metrics for this module.
- Actor: System (analytics job), Platform Ops
- Preconditions: Request/hold/match history exists
- Trigger: Scheduled analytics job
- Main Flow: Metrics computed from FR-BLD-003 (request) through FR-BLD-004/014 (confirm/dispense) timestamps, and FR-BLD-006/009 (rare-type escalation) outcomes
- Post Conditions: Metrics available for G12 Analytics
- Acceptance Criteria: Computed at least daily
- Dependencies: G12

---

# MODULE 7 — HOSPITAL INSURANCE MAPPING

*(Base spec: PRD Part B, "MODULE 7 — HOSPITAL INSURANCE MAPPING". Explicitly a cross-cutting utility, not a standalone citizen journey — consumed inline by Modules 2/3/5/8/9. Status machine (pre-auth): `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / PARTIALLY_APPROVED / DENIED → CLAIM_INITIATED`.)*

**FR-INS-001** *(PRD's own Representative FR, reproduced verbatim for table completeness)*
- Priority: P0
- Description: System shall display a real-time (or last-verified-timestamped) cashless network-status flag inline wherever a hospital/diagnostic-center/cancer-hospital is shown in search results, sourced from the insurer's network data feed where integrated.
- Actor: System (display only)
- Preconditions: Network data exists (from an integrated insurer feed, or last-verified manual data)
- Trigger: Hospital/diagnostic-center/cancer-hospital shown in any consuming module's search results
- Main Flow: (1) Consuming module requests inline network status for a citizen's linked policy against a specific facility → (2) This module returns status + last-verified timestamp → (3) Consuming module renders it inline
- Post Conditions: None — a shared inline-display service
- Acceptance Criteria: Never rendered without its last-verified timestamp, per the base PRD's explicit business rule
- Dependencies: Modules 2/3/5/8/9 as display consumers, GT-07 for consent on any deeper linkage

**FR-INS-002**
- Priority: P0
- Description: System shall allow a citizen to link one or more insurance policies to their profile.
- Actor: Citizen/Patient
- Preconditions: Citizen has an active account (not applicable to guest/GT-10 flows, which explicitly must not require this)
- Trigger: Citizen adds a policy in profile settings
- Main Flow: (1) Policy number and insurer entered → (2) System validates format/insurer recognition → (3) Policy linked to profile, available for network-status and pre-auth flows
- Post Conditions: Policy linked
- Acceptance Criteria: Multiple policies supported per citizen (FR-INS-012), none of this required to use the guest emergency flow
- Dependencies: GT-10 (must not be a precondition for guest flows)

**FR-INS-003**
- Priority: P0
- Description: System shall allow initiation of a pre-authorization request for a specific Case against a linked policy.
- Actor: Citizen/Patient, Family/Caregiver, Hospital Staff (on behalf, with consent)
- Preconditions: Case exists; citizen has a linked policy; explicit consent captured (FR-INS-004)
- Trigger: Pre-auth initiated from Case Dashboard or Hospital Portal admissions flow
- Main Flow: (1) Pre-auth request created, status `DRAFT` → (2) AI-assisted pre-fill (FR-INS-004) populates available Case data → (3) Citizen/family reviews and submits → (4) Status `SUBMITTED`
- Post Conditions: Pre-auth request created and tracked
- Acceptance Criteria: A pre-auth request always carries a `case_id` reference (GT-01)
- Dependencies: GT-01, FR-INS-004

**FR-INS-004**
- Priority: P0
- Description: System shall AI-assist pre-fill of a pre-authorization request from available Case data (triage, admitting diagnosis category, hospital), reducing family paperwork burden, per the base PRD's explicit functional scope referencing §A4.
- Actor: AI Coordination Layer
- Preconditions: Case has triage/diagnosis-category data available
- Trigger: Pre-auth request initiated (FR-INS-003)
- Main Flow: (1) Available Case Timeline data mapped into pre-auth form fields → (2) Family reviews and edits before submission — pre-fill never auto-submits without explicit review
- Post Conditions: Draft pre-auth form populated
- Acceptance Criteria: Pre-fill accuracy verified against Case data at submission time — the family always has final review, never silent auto-submission
- Dependencies: Part A4 (AI Coordination Layer), FR-INS-005

**FR-INS-005**
- Priority: P0
- Description: System shall require explicit consent before a pre-authorization request is submitted, since it involves sharing health data with a third-party insurer, per the base PRD's explicit business rule and GT-07.
- Actor: Citizen/Patient, Family/Caregiver
- Preconditions: Pre-auth request in `DRAFT` status, ready for submission
- Trigger: User attempts to submit
- Main Flow: (1) Consent prompt presented, specifying exactly what data will be shared with which insurer → (2) Explicit affirmative consent required → (3) Only then does status transition to `SUBMITTED`
- Post Conditions: Consent artifact recorded (Part I1 Consent Service) before submission proceeds
- Acceptance Criteria: No pre-auth submission is ever possible without a corresponding recorded consent grant
- Dependencies: GT-07, Part I1 (Consent Service)

**FR-INS-006**
- Priority: P0
- Description: System shall track pre-authorization status through its full state machine and surface current status to the citizen/family and hospital admissions staff.
- Actor: System, Insurer (status updates), Hospital Admissions Staff
- Preconditions: Pre-auth request `SUBMITTED`
- Trigger: Insurer responds (via integration or manual Ops update) or hospital staff updates status
- Main Flow: (1) Status update received → (2) State transitions per `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / PARTIALLY_APPROVED / DENIED → CLAIM_INITIATED` → (3) `CaseTimelineEvent` emitted on each transition
- Post Conditions: Current status visible on Case Dashboard
- Acceptance Criteria: No skipped states — every transition is explicit and logged
- Dependencies: GT-02

**FR-INS-007**
- Priority: P1
- Description: System shall generate a claims-readiness document checklist for a given pre-authorization/claim, per the base PRD's explicit functional scope.
- Actor: System
- Preconditions: Pre-auth request exists
- Trigger: Pre-auth submitted or claim initiated
- Main Flow: (1) Checklist generated based on insurer/policy type and admission category → (2) Citizen/family sees which documents are outstanding vs. complete
- Post Conditions: Checklist tracked against the pre-auth/claim record
- Acceptance Criteria: Base PRD's own stated Success Metric — "document-checklist completeness rate on first submission" — is measurable directly from this FR's data
- Dependencies: FR-INS-003

**FR-INS-008**
- Priority: P0
- Description: System shall attach a mandatory last-verified timestamp to every displayed network-status flag, never displaying status without it, per the base PRD's explicit business rule (restated here as its own FR since it's foundational to every consuming module's trust in this data).
- Actor: System
- Preconditions: None
- Trigger: Any network-status display (FR-INS-001)
- Main Flow: Enforced at the data-model level — a network-status record without a `last_verified_at` field is not a valid record this module can emit
- Post Conditions: None
- Acceptance Criteria: Verified via a contract test on this module's API response schema requiring the timestamp field as non-nullable
- Dependencies: FR-INS-001

**FR-INS-009**
- Priority: P1
- Description: System shall support a per-insurer integration adapter for insurers with API-accessible network/pre-auth data, with a phased integration list rather than assuming universal day-one coverage, per the base PRD's explicit assumption.
- Actor: Insurer (integration party), Platform
- Preconditions: An integration agreement exists with the specific insurer
- Trigger: Integration configured for a given insurer
- Main Flow: Insurer-specific adapter normalizes their network/pre-auth data into this module's common data model — no consuming module (2/3/5/8/9) is ever aware of which insurer-specific adapter served the data
- Post Conditions: Network/pre-auth data available for that insurer's policies
- Acceptance Criteria: Adding a new insurer adapter never requires changes to any consuming module (M1 boundary discipline applied to this integration point)
- Dependencies: M1

**FR-INS-010**
- Priority: P1
- Description: System shall support a manual/non-integrated insurer fallback workflow (Ops-updated network status, manually-tracked pre-auth status) for insurers without API integration, per GT-11's fallback-first principle.
- Actor: Platform Ops
- Preconditions: Insurer has no API integration (FR-INS-009 not applicable)
- Trigger: Ops manually updates network/pre-auth status from insurer communication (phone/email/portal)
- Main Flow: Same data model and consuming-module interface as FR-INS-009's integrated path — the fallback is invisible to consuming modules, per GT-11's "every fallback is visible [to the user], never silent [in its existence as a fallback]" — here the manual status still carries its own accurate last-verified timestamp so citizens see accurate staleness even for manually-tracked insurers
- Post Conditions: Status available, correctly timestamped
- Acceptance Criteria: A manually-tracked insurer's data is never presented as "real-time" — its last-verified timestamp reflects the actual manual update time, maintaining FR-INS-008's honesty guarantee
- Dependencies: GT-11, FR-INS-008

**FR-INS-011**
- Priority: P1
- Description: System shall provide denial-handling guidance when a pre-authorization is denied, never leaving the family at a dead end, per Appendix C1's error-handling philosophy applied to this module's most consequential failure mode.
- Actor: System
- Preconditions: Pre-auth status transitions to `DENIED`
- Trigger: Denial status received
- Main Flow: (1) Denial reason (where provided by insurer) surfaced clearly → (2) Next-best-action guidance presented (e.g., appeal process pointer, alternate payment/financial-counseling pointer at the hospital) → (3) Human Coordinator escalation available in one tap (GT-08)
- Post Conditions: None — a guidance/escalation surface
- Acceptance Criteria: A denial is never presented as a bare status with no next step
- Dependencies: Appendix C1, GT-08

**FR-INS-012**
- Priority: P1
- Description: System shall support a citizen having multiple linked policies and let them choose which policy to use for a given pre-authorization request.
- Actor: Citizen/Patient
- Preconditions: Citizen has 2+ linked policies (FR-INS-002)
- Trigger: Pre-auth initiation (FR-INS-003)
- Main Flow: Citizen selects which policy applies before proceeding with pre-fill/consent/submission
- Post Conditions: Pre-auth request tied to the selected policy only
- Acceptance Criteria: No pre-auth request is ever ambiguous about which policy it was submitted against
- Dependencies: FR-INS-002, FR-INS-003

**FR-INS-013**
- Priority: P0
- Description: System shall serve the inline network-status API to Modules 2, 3, 5, 8, and 9 as their sole source of insurance-network display data, per the base PRD's explicit integration note and this module's cross-cutting-utility framing (restated as its own FR since it's the mechanism, not just the outcome, of FR-INS-001).
- Actor: Module 2/3/5/8/9 Services (internal callers)
- Preconditions: None
- Trigger: A consuming module needs network-status data for display
- Main Flow: Direct service-interface call per M1/L4 (never a database read into this module's schema by the consumer)
- Post Conditions: None
- Acceptance Criteria: Verified via the same module-boundary contract test pattern as Module 4's FR-NBH-008
- Dependencies: M1, L4

**FR-INS-014**
- Priority: P2
- Description: System shall initiate claims tracking once a pre-authorization is approved and treatment/admission proceeds, transitioning the record to `CLAIM_INITIATED`, without performing actual claims adjudication (explicitly out of scope per the base PRD).
- Actor: Hospital Admissions Staff, System
- Preconditions: Pre-auth `APPROVED` or `PARTIALLY_APPROVED`
- Trigger: Admission/treatment proceeds and hospital staff confirms claim initiation
- Main Flow: (1) Status transitions to `CLAIM_INITIATED` → (2) Claim reference number (from insurer, where provided) recorded → (3) This module's tracking ends here — actual adjudication remains the insurer's own system
- Post Conditions: Claim tracked at the initiation/reference level only
- Acceptance Criteria: This module never attempts to display a claim's adjudication/settlement outcome — that boundary is explicit and tested
- Dependencies: None (explicit out-of-scope boundary, restated as an FR to make the boundary testable)

**FR-INS-015**
- Priority: P1
- Description: System shall provide an insurer-facing (or hospital-insurance-desk-facing) pre-authorization review queue, allowing review/action on submitted pre-auth requests, ties to Part F's provider-portal surface for this module.
- Actor: Insurer Staff / Hospital Insurance Desk Staff
- Preconditions: Pre-auth requests exist in `SUBMITTED`/`UNDER_REVIEW` status
- Trigger: Staff opens the review queue
- Main Flow: (1) Queue lists pending requests, ranked by submission time/urgency → (2) Staff reviews attached Case data (consent-scoped per GT-07) and checklist (FR-INS-007) → (3) Staff actions the request (approve/partially-approve/deny/request-more-info), transitioning status per FR-INS-006
- Post Conditions: Status updated; audited (GT-06)
- Acceptance Criteria: Same audited-access pattern as the base PRD's Part F insurer/support-staff Case-access model (F9)
- Dependencies: Part F (Insurance Portal, F9), GT-06, GT-07

---

# MODULE 8 — DIAGNOSTIC CENTERS

*(Base spec: PRD Part B, "MODULE 8 — DIAGNOSTIC CENTERS". Status machine: `ORDERED → SLOT_BOOKED → SAMPLE_COLLECTED → PROCESSING → RESULT_AVAILABLE → DELIVERED_TO_CASE`.)*

**FR-DIAG-001** *(PRD's own Representative FR, reproduced verbatim for table completeness)*
- Priority: P0
- Description: System shall, upon result availability, push a notification and attach the result document to the originating Case Timeline, visible to the patient/family and the referring doctor if still an active case participant.
- Actor: System, Diagnostic Center Staff (result upload trigger)
- Preconditions: Test order status `PROCESSING`; result document/data ready
- Trigger: Diagnostic center staff uploads result (Module 8 Provider Portal, F8)
- Main Flow: (1) Result uploaded → (2) Status transitions `RESULT_AVAILABLE` → `DELIVERED_TO_CASE` → (3) Notification sent to patient/family and referring doctor (if still active case participant) → (4) Result attached to Case Timeline, consent-scoped (GT-07)
- Post Conditions: Result available on Case Dashboard/Timeline
- Acceptance Criteria: Notification sent within the same session as upload, not batched/delayed
- Dependencies: Module 3 order linkage, GT-02, GT-07

**FR-DIAG-002**
- Priority: P0
- Description: System shall allow search for tests/panels by type across diagnostic centers.
- Actor: Citizen/Patient
- Preconditions: None
- Trigger: User searches for a test/panel by name or category
- Main Flow: (1) Test/panel name entered → (2) Centers offering that test queried → (3) Results ranked by distance/turnaround-time
- Post Conditions: Ranked list of centers offering the test
- Acceptance Criteria: Search covers both individual tests and bundled panels
- Dependencies: None

**FR-DIAG-003**
- Priority: P0
- Description: System shall allow search for diagnostic centers by location, turnaround-time, and accreditation (NABL).
- Actor: Citizen/Patient
- Preconditions: None
- Trigger: User opens Diagnostic Center search
- Main Flow: (1) Filters applied → (2) Centers matching filters within radius returned → (3) Ranked by AI Best-Match or user-selected sort
- Post Conditions: Ranked center list
- Acceptance Criteria: NABL accreditation is a first-class filter, consistent with Module 4's accreditation-trust principle applied here
- Dependencies: Part H8 (NABL accreditation source, same principle as Module 4 FR-NBH-004)

**FR-DIAG-004**
- Priority: P0
- Description: System shall allow booking a center-visit slot for a test.
- Actor: Citizen/Patient
- Preconditions: Center has open slots for the requested test
- Trigger: User selects a slot
- Main Flow: `ResourceCoordinationService.createHold()` with `resourceType=DIAGNOSTIC_SLOT`, same generic engine pattern as Module 3's doctor-slot booking
- Post Conditions: Slot status `SLOT_BOOKED`
- Acceptance Criteria: Same atomicity/no-double-booking guarantee as every other slot-based module
- Dependencies: Appendix C2/M9

**FR-DIAG-005**
- Priority: P1
- Description: System shall allow booking a home-sample-collection slot as an alternative to center-visit, where the diagnostic center offers this service.
- Actor: Citizen/Patient
- Preconditions: Center offers home-collection for the requested test
- Trigger: User selects home-collection option and a time window
- Main Flow: Same hold pattern as FR-DIAG-004 with a `collection_mode=HOME` attribute; actual phlebotomist routing/dispatch logistics explicitly out of scope per the base PRD (Phase 2, would reuse Ambulance-like dispatch patterns)
- Post Conditions: Slot status `SLOT_BOOKED` with home-collection flagged
- Acceptance Criteria: This FR only covers the booking of a collection window, not routing/dispatch of collection staff, consistent with the base PRD's explicit Out of Scope note
- Dependencies: FR-DIAG-004

**FR-DIAG-006**
- Priority: P0
- Description: System shall support case-linked test ordering directly from a Module 3 consultation record.
- Actor: Doctor (orders), Citizen/Patient (books resulting slot)
- Preconditions: Active consultation (Module 3), doctor determines a test is needed
- Trigger: Doctor orders a test during/after consultation
- Main Flow: (1) Doctor creates order referencing the consultation record → (2) Order visible to patient for slot booking (FR-DIAG-004/005) → (3) Order status `ORDERED` until a slot is booked
- Post Conditions: Test order created, linked to Module 3 consultation and the Case
- Acceptance Criteria: A case-linked test order always references the ordering doctor/consultation record for traceability, per the base PRD's explicit business rule
- Dependencies: Module 3 FR-DOC-008, GT-01

**FR-DIAG-007**
- Priority: P1
- Description: System shall support standalone test booking (e.g., routine health checkup) outside of any case/consultation context.
- Actor: Citizen/Patient
- Preconditions: None
- Trigger: User books a test directly without a doctor's order
- Main Flow: Same booking mechanics as FR-DIAG-004, without a Module 3 order reference
- Post Conditions: Test order created, not case-linked (or optionally linked to a `PLANNED`-type case if the citizen wants Timeline tracking)
- Acceptance Criteria: A standalone booking never requires a doctor's order as a precondition
- Dependencies: None

**FR-DIAG-008**
- Priority: P0
- Description: System shall allow diagnostic center staff to update order status through sample collection.
- Actor: Diagnostic Center Staff
- Preconditions: Order status `SLOT_BOOKED`
- Trigger: Sample physically collected (center visit or home collection)
- Main Flow: Staff marks sample collected → status transitions `SAMPLE_COLLECTED`
- Post Conditions: Status `SAMPLE_COLLECTED`
- Acceptance Criteria: Status update available via Provider Portal (F8) or WhatsApp Tier-1 reply, per L2
- Dependencies: L2, M14

**FR-DIAG-009**
- Priority: P0
- Description: System shall allow diagnostic center staff to update order status as sample processing proceeds.
- Actor: Diagnostic Center Staff (or LIS integration, FR-DIAG-011)
- Preconditions: Status `SAMPLE_COLLECTED`
- Trigger: Processing begins/completes
- Main Flow: Status transitions `SAMPLE_COLLECTED` → `PROCESSING` → `RESULT_AVAILABLE`
- Post Conditions: Status reflects current processing stage
- Acceptance Criteria: Citizen sees current stage on Case Dashboard, reducing "what's happening" anxiety consistent with the platform's trust-and-transparency principle (§A3.2)
- Dependencies: §A3.2 (Case Timeline transparency principle)

**FR-DIAG-010**
- Priority: P1
- Description: System shall support PDF-first result document delivery for centers without structured LIS integration, per the base PRD's explicit phased approach ("PDF-first before structured-data-second").
- Actor: Diagnostic Center Staff
- Preconditions: Status `PROCESSING`, result ready
- Trigger: Staff uploads result document (PDF)
- Main Flow: Document uploaded and attached per FR-DIAG-001's flow — this FR specifies the PDF-first ingestion tier explicitly as its own FR since it's the base PRD's stated Phase 1 majority case
- Post Conditions: Result document available
- Acceptance Criteria: PDF delivery works end-to-end without requiring any structured-data integration from the center
- Dependencies: FR-DIAG-001

**FR-DIAG-011**
- Priority: P2
- Description: System shall support structured result-data ingestion via LIS (Lab Information System) integration for centers with that capability, as a higher-tier ingestion path than FR-DIAG-010.
- Actor: Diagnostic Center's LIS (integration), Platform
- Preconditions: Center has LIS integration configured
- Trigger: LIS pushes structured result data
- Main Flow: Structured data mapped into this module's result model, enabling future structured-data features (e.g., trend charts across repeat tests) not available from PDF-only delivery
- Post Conditions: Result available in both structured and (if also provided) document form
- Acceptance Criteria: A center's tier (PDF-only vs. LIS-integrated) never affects the citizen-facing delivery guarantee of FR-DIAG-001 — only the richness of what's available
- Dependencies: FR-DIAG-010

**FR-DIAG-012**
- Priority: P0
- Description: System shall require explicit patient consent, captured at order time, before a result may be delivered to the Case Timeline, since results are highly sensitive, per the base PRD's explicit business rule.
- Actor: Citizen/Patient
- Preconditions: Test order being created (FR-DIAG-004/005/006/007)
- Trigger: Order creation flow
- Main Flow: (1) Consent for Timeline delivery captured as part of order creation → (2) Without this consent, result is still processed but delivered only to a private patient-only view, not the shared Case Timeline visible to linked family/caregivers
- Post Conditions: Consent artifact recorded (Part I1) tied to the order
- Acceptance Criteria: Absence of this consent never blocks the test itself, only its visibility scope — the patient always gets their own result
- Dependencies: GT-07, Part I1

**FR-DIAG-013**
- Priority: P1
- Description: System shall keep the referring doctor visible to a delivered result only while they remain an active participant in the case's care team, per FR-DIAG-001's explicit condition.
- Actor: System (access control)
- Preconditions: Result delivered (FR-DIAG-001)
- Trigger: Result visibility check for the referring doctor
- Main Flow: System checks the doctor's current active-participant status on the case before granting result visibility — a doctor who has been removed from the care team (e.g., case transferred) loses visibility going forward, though historical Timeline entries remain per the append-only principle
- Post Conditions: None — an access-scoping guarantee
- Acceptance Criteria: Verified via a test asserting a removed doctor's API access to new results is denied while the historical Timeline entry itself remains intact (append-only, GT-02)
- Dependencies: GT-02, GT-07

**FR-DIAG-014**
- Priority: P1
- Description: System shall display an insurance cashless-network status flag inline within diagnostic center search results, sourced from Module 7.
- Actor: System (display only)
- Preconditions: Module 7 has network data for the center
- Trigger: Search results rendered
- Main Flow: Identical inline pattern to FR-DOC-012/FR-NBH-006
- Post Conditions: None
- Acceptance Criteria: Same last-verified-timestamp requirement as every other module consuming Module 7
- Dependencies: Module 7 FR-INS-001, FR-INS-013

**FR-DIAG-015**
- Priority: P1
- Description: System shall allow cancellation or rescheduling of a booked test slot prior to sample collection.
- Actor: Citizen/Patient
- Preconditions: Status `SLOT_BOOKED`, not yet `SAMPLE_COLLECTED`
- Trigger: User cancels/reschedules
- Main Flow: Same pattern as Module 3's FR-DOC-009 — slot released via `releaseHold()`, reschedule re-runs FR-DIAG-004/005
- Post Conditions: Status `CANCELLED`, or re-booked against a new slot
- Acceptance Criteria: Same release/re-offer mechanics as every other slot-based module
- Dependencies: Appendix C2/M9, Module 3 FR-DOC-009 (identical pattern reused)

---

# MODULE 9 — CANCER HOSPITALS

*(Base spec: PRD Part B, "MODULE 9 — CANCER HOSPITALS". This module heavily reuses Modules 2/3/4/7 machinery rather than building parallel logic, per the base PRD's explicit framing. Case-level status machine (`CHRONIC_MANAGEMENT` case type): `DIAGNOSIS_INTAKE → SPECIALIST_MATCHED → TREATMENT_PLANNING → ACTIVE_TREATMENT (cyclical) → SURVEILLANCE/FOLLOW_UP → RESOLVED/CLOSED` — materially different from the emergency-case model and must not be force-fit into it, per the base PRD's explicit instruction.)*

**FR-CAN-001** *(PRD's own Representative FR, reproduced verbatim for table completeness)*
- Priority: P0
- Description: System shall allow filtering cancer-hospital search by treatment modality availability (e.g., "has functioning radiation therapy unit with slot within 2 weeks") rather than only bed/specialty-type filters, reusing Module 2's inventory/hold pattern applied to treatment-equipment-slots as the underlying resource type.
- Actor: Citizen/Patient, Family/Caregiver
- Preconditions: Hospital profiles carry treatment-modality availability data (radiation, chemotherapy, surgical oncology, bone marrow transplant)
- Trigger: User searches with a modality-availability filter
- Main Flow: (1) Modality filter applied → (2) System queries treatment-equipment-slot availability (via the generic ResourceHold engine, `resourceType=TREATMENT_SLOT`) alongside standard hospital search → (3) Only hospitals with a genuinely bookable near-term slot for that modality are returned when the filter requires it
- Post Conditions: Filtered results reflecting actual equipment-slot availability, not just "hospital offers this modality in general"
- Acceptance Criteria: A hospital that "offers" radiation therapy but has no bookable slot within the citizen's specified window is excluded from filtered results, not just deprioritized
- Dependencies: Module 2 pattern reuse (Appendix C2/M9), Module 4 hospital profile data

**FR-CAN-002**
- Priority: P0
- Description: System shall match cancer-type-specific specialists/hospitals based on diagnosis category, reusing Module 3's specialist-matching machinery configured for oncology specialties.
- Actor: AI Coordination Layer
- Preconditions: A cancer diagnosis category is known (from intake, FR-CAN-005)
- Trigger: Case reaches `DIAGNOSIS_INTAKE` completion
- Main Flow: Same AI Best-Match composite scoring pattern as Module 3 FR-DOC-001, scoped to oncology specialists/hospitals matching the specific cancer type
- Post Conditions: Case transitions to `SPECIALIST_MATCHED` once a match is confirmed
- Acceptance Criteria: Base PRD's own stated Success Metric — "time from diagnosis-intake to specialist match" — is measurable directly from this FR's timestamps
- Dependencies: Module 3 FR-DOC-001 (identical scoring pattern reused), FR-CAN-005

**FR-CAN-003**
- Priority: P0
- Description: System shall allow booking a radiation therapy treatment slot using the same hold/expiry/atomic-decrement pattern as Module 2's bed booking, per the base PRD's explicit business rule that this scarce, schedulable physical resource follows the identical pattern.
- Actor: Citizen/Patient, Hospital Scheduling Staff (on behalf)
- Preconditions: A radiation therapy slot exists and is available (FR-CAN-001)
- Trigger: Slot selected for booking
- Main Flow: `ResourceCoordinationService.createHold()` with `resourceType=TREATMENT_SLOT`, identical mechanics to every other slot-based module in this expansion
- Post Conditions: Slot held, then confirmed per the standard hold lifecycle
- Acceptance Criteria: Same atomicity/no-double-booking guarantee as the Phase 1 generic engine's proven concurrency test
- Dependencies: Appendix C2/M9

**FR-CAN-004**
- Priority: P1
- Description: System shall coordinate tumor-board/second-opinion requests between the patient's care team and a specialist/hospital tumor board.
- Actor: Citizen/Patient, Family/Caregiver, Specialist/Hospital Tumor Board
- Preconditions: Case has an active oncology care team (FR-CAN-002)
- Trigger: Patient/family or treating specialist requests a second opinion/tumor-board review
- Main Flow: (1) Request submitted with relevant case/diagnostic data (consent-scoped) → (2) Routed to the target tumor board (platform-mediated coordination, not clinical adjudication) → (3) Tumor board's response/recommendation attached to the Case Timeline
- Post Conditions: Second-opinion request tracked to resolution
- Acceptance Criteria: This FR coordinates access/logistics only — it never produces or represents a platform-generated clinical recommendation, consistent with the base PRD's explicit Out of Scope boundary (a genuine open question per the base PRD on whether this is platform-mediated service or referral-only — this FR implements it as platform-mediated coordination of the request/response, not the clinical content itself)
- Dependencies: GT-07, base PRD §9 Open Questions

**FR-CAN-005**
- Priority: P0
- Description: System shall support `CHRONIC_MANAGEMENT` case-type creation with the distinct `DIAGNOSIS_INTAKE → SPECIALIST_MATCHED → TREATMENT_PLANNING → ACTIVE_TREATMENT → SURVEILLANCE/FOLLOW_UP → RESOLVED/CLOSED` status machine, per the base PRD's explicit instruction that this is a first-class `case_type` behavior, not a workaround.
- Actor: Citizen/Patient, Family/Caregiver, Oncology Care Team
- Preconditions: A new cancer diagnosis or suspected-cancer intake begins
- Trigger: Citizen/family or referring provider initiates a `CHRONIC_MANAGEMENT`-type Case
- Main Flow: (1) Case created with `caseType=CHRONIC_MANAGEMENT` → (2) Case status begins at `DIAGNOSIS_INTAKE`, using this module's distinct status enum rather than the emergency-case `CaseStatus` values → (3) Case supports a materially longer lifecycle with periodic re-engagement, per the base PRD's explicit instruction
- Post Conditions: A long-lived Case object exists, correctly typed
- Acceptance Criteria: Engineering must not force-fit this status machine into the emergency-case model, verified by this module's status values being tracked as a distinct, explicitly-typed sub-status field rather than overloading the platform-wide `CaseStatus` enum
- Dependencies: PRD Part A2, DL-006 (this platform's own `CaseType.CHRONIC_MANAGEMENT` value, already reserved in `packages/shared-constants` per Session 4)

**FR-CAN-006**
- Priority: P1
- Description: System shall track treatment-cycle sub-episodes within the `ACTIVE_TREATMENT` status, since treatment is cyclical (multiple sub-episodes) rather than a single continuous event, per the base PRD's explicit status-machine note.
- Actor: Oncology Care Team, System
- Preconditions: Case status `ACTIVE_TREATMENT`
- Trigger: Each treatment cycle/session begins or completes
- Main Flow: (1) Sub-episode recorded (cycle number, modality, date) → (2) `CaseTimelineEvent` emitted per sub-episode, not just once at the top-level status → (3) Case remains `ACTIVE_TREATMENT` across many sub-episodes until the overall treatment plan concludes
- Post Conditions: Sub-episode history visible on Case Timeline
- Acceptance Criteria: A family can see individual treatment-cycle history, not just a single opaque "in treatment" status spanning months
- Dependencies: GT-02, FR-CAN-005

**FR-CAN-007**
- Priority: P1
- Description: System shall support a heavier-weight version of Module 7's pre-authorization flow for high-cost oncology treatment, given typically higher claim values and more complex approval chains, per the base PRD's explicit functional scope.
- Actor: Citizen/Patient, Family/Caregiver, Insurer
- Preconditions: Case is `CHRONIC_MANAGEMENT` type with a treatment plan requiring high-cost modalities
- Trigger: Pre-auth initiated from an oncology Case
- Main Flow: Reuses Module 7's FR-INS-003 through FR-INS-007 flow, extended with oncology-specific document requirements (e.g., staging reports, tumor board recommendation) in the claims-readiness checklist (FR-INS-007)
- Post Conditions: Same pre-auth state machine as Module 7, with oncology-specific checklist content
- Acceptance Criteria: No parallel pre-auth engine is built for this module — it configures Module 7's existing engine, per this module's own stated "heaviest reuse of existing machinery" framing
- Dependencies: Module 7 FR-INS-003 through FR-INS-007

**FR-CAN-008**
- Priority: P1
- Description: System shall schedule surveillance/follow-up appointments once a case transitions from `ACTIVE_TREATMENT` to `SURVEILLANCE/FOLLOW_UP`, reusing Module 3's slot-booking pattern.
- Actor: Oncology Care Team, Citizen/Patient
- Preconditions: Case status transitions to `SURVEILLANCE/FOLLOW_UP`
- Trigger: Care team schedules a follow-up cadence (e.g., quarterly scan)
- Main Flow: Follow-up slots booked using Module 3's `DOCTOR_SLOT` pattern or Module 8's `DIAGNOSTIC_SLOT` pattern for scans, depending on the follow-up type
- Post Conditions: Follow-up appointments tracked against the still-open Case
- Acceptance Criteria: A `SURVEILLANCE/FOLLOW_UP` case is never treated as closed while follow-ups remain scheduled
- Dependencies: Module 3 (slot pattern), Module 8 (scan pattern)

**FR-CAN-009**
- Priority: P1
- Description: System shall send re-engagement notifications for a long-duration case to maintain continuity across the full treatment journey, per the base PRD's own stated Success Metric ("case re-engagement/retention over a full treatment journey").
- Actor: System (scheduled job)
- Preconditions: Case in `SURVEILLANCE/FOLLOW_UP` with a defined follow-up cadence
- Trigger: A scheduled follow-up approaches or is overdue
- Main Flow: (1) Job identifies approaching/overdue follow-ups → (2) Notification sent to patient/family → (3) One-tap path to schedule (FR-CAN-008)
- Post Conditions: None — a proactive notification
- Acceptance Criteria: This module's success is measured by retention over months, a meaningfully different success signal than the emergency modules' speed-only metrics, per the base PRD's explicit framing — this FR is the mechanism that makes that metric actionable rather than passive
- Dependencies: M11, FR-CAN-008

**FR-CAN-010**
- Priority: P0
- Description: System shall enforce especially conservative, granular consent-scoping for cancer diagnosis data, including explicit citizen control over whether close family members see full diagnostic detail versus a summarized status, per the base PRD's explicit security/privacy note that disclosure preferences here are more culturally/personally variable than emergency-case data.
- Actor: Citizen/Patient
- Preconditions: Case is `CHRONIC_MANAGEMENT` type
- Trigger: Patient sets/updates family-visibility preferences
- Main Flow: (1) Patient defines, per linked family member, whether they see full diagnostic detail or a summarized status only → (2) Every family-facing view of this Case respects that per-person scoping → (3) Patient can change scoping at any time, effective immediately
- Post Conditions: Family-visibility preferences recorded and enforced
- Acceptance Criteria: A family member configured for "summarized status only" never receives full diagnostic detail through any surface (Dashboard, Timeline, notifications), verified via a dedicated access-control test
- Dependencies: GT-07 (most conservative application of consent-scoping in the platform, per base PRD's explicit note)

**FR-CAN-011**
- Priority: P1
- Description: System shall support case closure/resolution when treatment concludes successfully or the patient/family elects to close the case, transitioning to `RESOLVED/CLOSED`.
- Actor: Oncology Care Team, Citizen/Patient
- Preconditions: Case in `SURVEILLANCE/FOLLOW_UP` (or, per patient/family election, any prior status)
- Trigger: Care team/patient initiates closure
- Main Flow: (1) Closure initiated with a reason/outcome category → (2) Case transitions to `RESOLVED/CLOSED` → (3) Case moves toward the archival tier per Part I3's data-archival policy, while remaining retrievable for continuity-of-care purposes
- Post Conditions: Case closed, archival-eligible per Part I3
- Acceptance Criteria: A closed case remains retrievable (never deleted) per Part I3's explicit "remaining retrievable for audit/legal/continuity-of-care purposes" requirement
- Dependencies: Part I3 (Data Archival)

**FR-CAN-012**
- Priority: P1
- Description: System shall allow filtering cancer-hospital search by oncology-specific accreditation, distinct from Module 4's general NABH accreditation filter.
- Actor: Citizen/Patient
- Preconditions: Hospital profiles carry oncology-specific accreditation data where it exists
- Trigger: User applies an oncology-accreditation filter
- Main Flow: Filter applied atop Module 4's base search (FR-NBH-002), scoped to oncology-specific credentials
- Post Conditions: None
- Acceptance Criteria: This filter composes with, rather than duplicates, Module 4's existing accreditation search infrastructure
- Dependencies: Module 4 FR-NBH-002, FR-NBH-004

**FR-CAN-013**
- Priority: P2
- Description: System shall support sharing second-opinion documents/records between the originating hospital and a second tumor board/specialist, consent-scoped.
- Actor: Citizen/Patient (consent), Originating Hospital, Second-Opinion Tumor Board
- Preconditions: Second-opinion request initiated (FR-CAN-004) and consented
- Trigger: Records need to move between the two care teams
- Main Flow: (1) Explicit consent captured naming the specific receiving tumor board (not a blanket share) → (2) Relevant records transferred → (3) Access logged (GT-06)
- Post Conditions: Records available to the named second-opinion team only, for the duration/purpose consented
- Acceptance Criteria: No record-sharing occurs without a purpose- and recipient-scoped consent grant (Part I1)
- Dependencies: Part I1, GT-06, GT-07

**FR-CAN-014**
- Priority: P2
- Description: System shall maintain case continuity across multiple treatment centers when a patient's care transfers (e.g., surgery at one hospital, radiation at another), via a referral-chain record on the single Case rather than fragmenting into separate cases.
- Actor: Oncology Care Team (originating and receiving), Citizen/Patient
- Preconditions: Care transfer between centers is planned
- Trigger: Referral/transfer initiated
- Main Flow: (1) Transfer recorded as a `CaseTimelineEvent` with both centers named → (2) Case's active-care-team roster updated → (3) The same `case_id` persists across the transfer, consistent with GT-01's universality principle
- Post Conditions: One continuous Case spanning multiple centers
- Acceptance Criteria: No new Case is ever created for a same-patient, same-treatment-journey transfer between centers
- Dependencies: GT-01, GT-02

**FR-CAN-015**
- Priority: P2
- Description: System shall flag, without resolving, the open product question of whether `CHRONIC_MANAGEMENT` cases need a dedicated Dashboard variant distinct from the emergency Case Dashboard (§A3.1), per the base PRD's explicit instruction that this is a product/UX decision deliberately left unresolved in a non-design document.
- Actor: N/A (a tracking/placeholder FR, not a build target)
- Preconditions: None
- Trigger: N/A
- Main Flow: N/A — this entry exists so the open question is tracked in the FR table rather than only in prose, ensuring it surfaces during Phase 5/9 sprint planning rather than being lost
- Post Conditions: None
- Acceptance Criteria: This FR is resolved by a product decision (tracked as a future Decision Log entry when made), not by engineering choice — do not implement a Dashboard variant against this FR without that decision first
- Dependencies: PRD §A3.1, base PRD §9 Open Questions

---

# Summary Table — FR Count by Module

| Module | FR Count | FR ID Range |
|---|---|---|
| 3 — Doctor Availability | 15 | FR-DOC-001 – FR-DOC-015 |
| 4 — Nearby Hospitals | 15 | FR-NBH-001 – FR-NBH-015 |
| 5 — Pharmacy Locator | 15 | FR-PHR-001 – FR-PHR-015 |
| 6 — Blood Bank | 15 | FR-BLD-001 – FR-BLD-015 |
| 7 — Hospital Insurance Mapping | 15 | FR-INS-001 – FR-INS-015 |
| 8 — Diagnostic Centers | 15 | FR-DIAG-001 – FR-DIAG-015 |
| 9 — Cancer Hospitals | 15 | FR-CAN-001 – FR-CAN-015 |
| **Total** | **105** | |

**Note on FR IDs already referenced elsewhere:** `FR-DOC-001`, `FR-NBH-001`, `FR-PHR-001`, `FR-BLD-001`, `FR-INS-001`, `FR-DIAG-001`, and `FR-CAN-001` were already named in the base PRD as each module's "Representative FR" and in `IMPLEMENTATION_MASTER_PLAN.md`'s Feature Tracker (seeded Session 1). They are reproduced verbatim above (not renumbered or altered) and now sit inside their module's full table rather than standing alone — consistent with M3's "ID is binding, never rename" rule.
