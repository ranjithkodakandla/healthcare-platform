# DATA_INVENTORY.md — Field Classification Register

**Date:** 2026-07-26  
**Platform:** Rakshak / Sahayak  
**Classification legend**

| Tag | Meaning |
|---|---|
| Public | Safe to expose without auth |
| Internal | Ops / staff only |
| Confidential | Business-sensitive non-PII |
| Personal | Identifies or relates to a natural person |
| Sensitive | Special-category / higher protection (auth secrets, financial) |
| Health | Health status / care coordination data |

Fields may carry multiple tags (e.g. Personal + Health).

---

## 1. Core schema (`core`)

### Case

| Field | Type | Classification | Notes |
|---|---|---|---|
| id | uuid | Internal | Surrogate key |
| caseNumber | string | Internal / Personal* | Pseudonymous case id; treat as Personal when linked |
| caseType | string | Internal | EMERGENCY / PLANNED / … |
| status | string | Internal | Workflow |
| severity | string | Health | Triage outcome |
| primaryPatientId | string? | Personal | Firebase UID or `erased:…` |
| initiatorId | string | Personal | Firebase UID / guest device binding |
| location | json? | Personal + Health | lat/lng/address; phone stripped; may include patientIsChild |
| goldenHourStartedAt | datetime? | Internal | Ops SLA |
| goldenHourTargetDeadline | datetime? | Internal | Ops SLA |
| consentScope | json? | Personal | Case-scoped consent snapshot |
| version | int | Internal | Optimistic lock |
| createdAt / updatedAt | datetime | Internal | |

### CaseTimelineEvent

| Field | Classification | Notes |
|---|---|---|
| id | Internal | |
| caseId | Internal | |
| type | Internal | Domain event name |
| payload | Health / Personal (variable) | May contain triage flags; avoid phones |
| createdAt | Internal | Immutable event time |

---

## 2. Shared services

### AuditLog

| Field | Classification | Notes |
|---|---|---|
| id | Internal | Append-only |
| actor | Personal / Internal | UID or `system:…` |
| action | Internal | e.g. LOGIN, DATA_EXPORT |
| entityType / entityId | Internal | |
| metadata | Confidential / Personal (variable) | Prefer keys-only in exports |
| createdAt | Internal | |

### ConsentGrant

| Field | Classification | Notes |
|---|---|---|
| id | Internal | |
| caseId | Internal | Optional |
| granterId | Personal | Subject UID |
| granteeId | Internal | e.g. PLATFORM |
| purpose | Personal | Versioned purpose string |
| scope | Personal | Version + timestamps |
| grantedAt / revokedAt | Personal | Consent history |
| createdAt | Internal | |

### ResourceCapacity / ResourceHold

| Field | Classification | Notes |
|---|---|---|
| resourceType / owner / capacity | Confidential | Ops |
| caseId on holds | Internal / Personal* | Links to case |
| status / expiresAt | Internal | |

---

## 3. Admin schema

| Model.Field | Classification |
|---|---|
| ProviderApplication.legalName | Confidential / Personal (org) |
| ProviderApplication.providerType / status | Internal |
| ProviderOnboardingStage.reviewerId / notes | Internal / Personal |
| ConsoleUser.email | Personal / Sensitive (auth identity) |
| ConsoleUser.role / firebaseUid | Personal / Internal |
| SupportTicket.requester / body / internalNotes | Personal / Health (possible) |
| SupportTicket.entityRef | Internal / Personal* |
| PlatformIssue.* | Internal |
| FeatureFlag.* | Internal |
| PlatformConfig.* | Internal / Confidential |
| CitizenOnboardingFlag.displayName / accountRef / notes | Personal |
| KnowledgeArticle.* | Public / Internal |
| Broadcast.title / body / audience | Internal (may contain Personal if misused) |
| AiOpsSuggestion.action / confidence | Internal |

---

## 4. Beds / hospitals

| Model.Field | Classification |
|---|---|
| HospitalBedInventory.* counts | Confidential |
| HospitalBedInventory.lastUpdatedBy | Personal / Internal |
| HospitalRegistry.name / address / city / state | Public / Internal |
| HospitalRegistry.lat / lng | Public (facility) |

---

## 5. Ambulance

| Model.Field | Classification |
|---|---|
| AmbulanceDriver.driverUid / displayName | Personal |
| AmbulanceDriver.vehicleReg | Personal / Confidential |
| AmbulanceDriver.lastLat / lastLng / lastPingAt | Personal (location) |
| AmbulanceRequest.caseId / pickupLat / pickupLng | Personal + Health |
| AmbulanceRequest.severity / status | Health / Internal |
| AmbulanceOffer.* | Internal |

---

## 6. Pharmacy / blood / doctors / diagnostics

| Model.Field | Classification |
|---|---|
| PharmacyStock.* | Confidential |
| PharmacyRegistry.* | Public / Internal |
| BloodPreAlert.bloodGroup / reason / caseId | Health / Personal* |
| BloodBankStock.* | Confidential / Public (availability) |
| DoctorProfile.name / specialty / slots | Public / Personal (professional) |
| DiagnosticOffering.* | Public / Confidential |

---

## 7. Client-only / ephemeral

| Field | Where | Classification | Notes |
|---|---|---|---|
| citizen_token / provider/admin tokens | localStorage | Sensitive | Prefer httpOnly cookies (gap) |
| sahayak_guest_phone | localStorage | Personal | Device-only; not sent in case.location |
| sahayak_guest_mode / deviceId | localStorage | Personal / Internal | Guest binding |
| OTP code | Firebase / SMS | Sensitive | Never logged |
| Geolocation permission | Browser | Personal | Used for triage/beds |

---

## 8. AI I/O

| Artifact | Classification | Control |
|---|---|---|
| Raw triage answers | Health | Stored on case; sanitized before LLM |
| Sanitized prompt text | Health (minimized) | Phones/emails/names stripped |
| Severity output | Health | Persisted on Case |
| NIM API key | Sensitive | Secret Manager only |

---

## 9. Messaging

| Artifact | Classification | Control |
|---|---|---|
| Inbound from phone | Personal | Logged masked; `contactRef` hash in location |
| Message body | Personal / Health | Masked in logs; intent parsed server-side |
| Outbound SMS/WA | Personal | Adapter logs masked |

---

## 10. Unused / minimize recommendations

| Item | Status |
|---|---|
| Phone inside `Case.location` | **Removed** from guest API path |
| Mock consent UI | **Replaced** with live `/v1/privacy` |
| Full free-text to LLM | **Sanitized** |
| Duplicate display name demos | Cleared in UX sessions |

---

## 11. Future GDPR tags (reserved)

Add columns later without breaking inventory: `LawfulBasis`, `TransferMechanism`, `EU_ResidencyFlag` on ConsentGrant.scope / PlatformConfig.
