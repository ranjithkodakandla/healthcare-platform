# PRIVACY_COMPLIANCE_REPORT.md — Rakshak / Sahayak Platform

**Date:** 2026-07-26  
**Assessor roles:** Chief Privacy Officer · Legal Compliance Architect · Security Architect · Enterprise Governance Lead  
**Primary law:** Digital Personal Data Protection Act, 2023 (India)  
**Also reviewed:** IT Act 2000 · CERT-In logging guidance · OWASP ASVS / Top 10 / API Top 10 / Mobile Top 10 · GCP security practices · SSDF  
**Artifacts:** `DATA_FLOW.md` · `DATA_INVENTORY.md` · `IMPLEMENTATION_MASTER_PLAN.md` Session 31

---

## Verdict

| Audience | Recommendation |
|---|---|
| **Limited pilot / controlled beta (India, asia-south1)** | **CONDITIONAL GO** |
| **Broad public production launch** | **NO-GO** until residual High items below are closed |

Critical application-layer DPDP gaps (consent API + UI, export/erasure, retention config, log masking, AI sanitization, guest phone minimization, audit immutability guard) are implemented. Remaining blockers are primarily **ops/legal** (DPAs, key residency for AI, token storage hardening, formal grievance officer appointment, published privacy policy URL) rather than missing product rights plumbing.

---

## Overall Compliance Score

| Dimension | Score (0–100) | Notes |
|---|---|---|
| **Overall Privacy / Legal / Security Compliance** | **78** | Pilot-ready with conditions |
| DPDP 2023 alignment | 80 | Rights + consent + purpose limitation largely in place |
| Security (OWASP / GCP baseline) | 82 | Helmet, throttle, CORS, CSP, RBAC; token storage residual |
| Audit & accountability | 84 | Append-only middleware + broad action coverage |
| AI privacy | 75 | Sanitization + fallback; cross-border NIM residual |
| Documentation | 90 | DATA_FLOW / INVENTORY / this report |
| GDPR extensibility readiness | 78 | Purpose/version/export/erasure patterns reusable |

---

## DPDP Compliance Matrix

| Obligation (simplified) | Status | Evidence |
|---|---|---|
| Notice before / at collection | ✅ | Public notices API; guest, triage, OTP copy |
| Purpose limitation | ✅ | Emergency / care coordination purposes; consent purposes versioned |
| Data minimization | ✅ / 🟡 | Guest phone not in case.location; messaging `contactRef`; localStorage guest phone remains device-side |
| Consent / legitimate use transparency | ✅ | Accept / list / revoke consents; emergency processing purpose |
| Security safeguards | ✅ / 🟡 | TLS, Cloud SQL, Secret Manager, RBAC, rate limit; no app-layer field encryption |
| Data principal rights (access, correction, erasure) | ✅ | `/v1/privacy/me|export|erasure` + Citizen UI |
| Consent withdrawal | ✅ | DELETE consent + UI toggle |
| Retention | ✅ | Configurable PlatformConfig + location retention job |
| Accountability / audit | ✅ | AuditLog + immutability guard |
| Cross-border transfer governance | 🟡 | Documented; NIM may leave India — needs legal basis before scale |
| Children’s data | 🟡 | Paediatric path flagged; parental consent workflow still thin |
| Grievance redressal | 🟡 | Contact email in notices; officer appointment is legal ops |

---

## Security Findings

### Mitigated / implemented this cycle

- Privacy module APIs with role guards  
- Consent version tracking (`PRIVACY_POLICY:v1.0.0`, `TERMS_OF_SERVICE:v1.0.0`)  
- Export + erasure with audit events  
- Log masking for phones / tokens in messaging  
- AI prompt sanitization before NIM  
- Guest location phone stripping  
- AuditLog update/delete blocked in Prisma middleware  
- Retention defaults + daily coarsening job  

### High Risk Items

| ID | Finding | Status |
|---|---|---|
| PRIV-H1 | Auth tokens in `localStorage` (XSS → session theft) | **Open** — migrate to httpOnly Secure cookies / BFF |
| PRIV-H2 | NVIDIA NIM may process health-adjacent text outside India without documented transfer instrument | **Open** — legal + prefer India-region model or disable NIM in prod until DPA |
| PRIV-H3 | Published Privacy Policy / Terms URLs and Data Fiduciary registration details not yet linked as canonical legal pages | **Open** — legal content ops |

### Medium Risk Items

| ID | Finding | Status |
|---|---|---|
| PRIV-M1 | No application-level field encryption for location / triage JSON (relies on Cloud SQL CMEK/disk) | Documented residual |
| PRIV-M2 | Timeline payloads retained after erasure (care continuity vs full erasure tension) | By design (GT-02); redaction path documented |
| PRIV-M3 | MFA enrollment UX thin for privileged admin roles | Residual from auth roadmap |
| PRIV-M4 | Support agents can view ticket free text containing Personal/Health | Need need-to-know + ticket retention enforcement job |
| PRIV-M5 | Children’s emergency path lacks explicit guardian consent artifact | Add guardian purpose grant |

### Low Risk Items

| ID | Finding | Status |
|---|---|---|
| PRIV-L1 | Marketing consent purpose defined but unused | OK (future) |
| PRIV-L2 | Portability is JSON-only (GDPR-ready, not FHIR) | Acceptable Phase 1 |
| PRIV-L3 | Driver location pings retention job not yet separate from case location job | Backlog |

---

## Privacy Findings (product)

| Area | Result |
|---|---|
| Screens | Guest + triage notices; OTP policy checkbox; Account consent + rights pages |
| APIs | Privacy controller under `/v1/privacy/*`; citizen guest phone minimization |
| DB fields | Classified in `DATA_INVENTORY.md` |
| AI | Sanitized inputs; admin AI suggestions human-reviewed status field |
| Third parties | Inventory in `DATA_FLOW.md` §5 |

---

## Implemented Fixes (Session 31)

1. `apps/api/src/shared-services/privacy/*` — notices, consents, export, erasure, retention  
2. Retention job + PlatformConfig defaults  
3. Citizen `privacyApi` + `/account/consent` + `/account/privacy`  
4. OTP Privacy/Terms acceptance + post-login consent grant  
5. Guest + triage plain-language emergency notices  
6. Messaging log masking + inbound `contactRef` hash  
7. Case AI sanitization; citizen location phone strip  
8. Prisma AuditLog immutability middleware  
9. Compliance docs: DATA_FLOW, DATA_INVENTORY, this report  

---

## Remaining Gaps (before unconditional production GO)

1. Legal: publish Privacy Policy / Terms; appoint Grievance Officer; Data Fiduciary notices.  
2. Engineering: httpOnly cookie session (PRIV-H1).  
3. AI: India-hosted model or contractual transfer + DPIA for NIM (PRIV-H2).  
4. Children: guardian consent purpose on paediatric cases (PRIV-M5).  
5. Ops: CERT-In incident runbook + log sink retention proof; CMEK confirmation.  
6. Redeploy API + Citizen with privacy endpoints live on Cloud Run.

---

## Recommendations

1. Treat privacy endpoints as release-blocking for any public marketing push.  
2. Disable live NIM in production until transfer basis is signed; keep local triage fallback.  
3. Schedule cookie-session migration as next security sprint.  
4. Add annual retention policy review in Admin Console UI.  
5. Extend Playwright with consent accept → export → erasure happy path.

---

## GO / NO-GO (Legal · Privacy · Security)

| Decision | Scope |
|---|---|
| **CONDITIONAL GO** | Controlled India pilot on `asia-south1` with known test cohorts, privacy features deployed, NIM optional/fallback, no sale of personal data, privacy@ contact staffed |
| **NO-GO** | Unrestricted consumer launch / multi-state scale until PRIV-H1–H3 closed and legal notices published |

**Assessor sign-off posture:** Platform is **substantially closer to DPDP readiness** than pre-Session 31 (consent was mock; no export/erasure). Do **not** market as “fully DPDP certified” without independent legal counsel review of notices and transfer arrangements.
