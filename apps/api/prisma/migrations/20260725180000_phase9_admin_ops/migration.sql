-- Phase 9 — Admin ops models (G5/G7/G15/G16)
-- Hand-written per ISSUE-005.

CREATE TABLE "admin"."support_tickets" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "ticket_number"   TEXT        NOT NULL UNIQUE,
  "requester"       TEXT        NOT NULL,
  "requester_type"  TEXT        NOT NULL,
  "entity_ref"      TEXT,
  "subject"         TEXT        NOT NULL,
  "priority"        TEXT        NOT NULL DEFAULT 'MED',
  "status"          TEXT        NOT NULL DEFAULT 'OPEN',
  "assigned_agent"  TEXT,
  "body"            TEXT,
  "internal_notes"  TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "support_tickets_status_priority_idx" ON "admin"."support_tickets" ("status", "priority");

CREATE TABLE "admin"."platform_issues" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "issue_number"  TEXT        NOT NULL UNIQUE,
  "title"         TEXT        NOT NULL,
  "category"      TEXT        NOT NULL,
  "status"        TEXT        NOT NULL DEFAULT 'OPEN',
  "severity"      TEXT        NOT NULL DEFAULT 'MED',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "platform_issues_status_idx" ON "admin"."platform_issues" ("status");

CREATE TABLE "admin"."feature_flags" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "key"              TEXT        NOT NULL UNIQUE,
  "description"      TEXT        NOT NULL,
  "enabled"          BOOLEAN     NOT NULL DEFAULT FALSE,
  "rollout_percent"  INT         NOT NULL DEFAULT 0,
  "geography"        TEXT        NOT NULL DEFAULT 'Not launched',
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "admin"."platform_config" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "group_key"  TEXT        NOT NULL,
  "label"      TEXT        NOT NULL,
  "value"      TEXT        NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("group_key", "label")
);

-- Seed support tickets (A-06 demo data)
INSERT INTO "admin"."support_tickets"
  ("ticket_number","requester","requester_type","entity_ref","subject","priority","status","assigned_agent","body")
VALUES
  ('TCK-3390','Priya Menon','CITIZEN','CASE-88213','Ambulance arrival delayed, no update','HIGH','OPEN','A. Fernandes','Citizen reports no ETA update for 12 minutes.'),
  ('TCK-3388','Apollo Hospital','PROVIDER','Apollo Hospital, Whitefield','Bed count sync failing via HMS webhook','MED','IN_PROGRESS','R. Iyer','HMS webhook returning 401 intermittently.'),
  ('TCK-3381','Rahul Gupta','CITIZEN','ACC-22884','Cannot link ABHA ID','LOW','RESOLVED','A. Fernandes','Resolved after ABHA OTP retry.'),
  ('TCK-3379','MedPlus Pharmacy','PROVIDER','MedPlus Pharmacy, Koramangala','Stock hold not releasing on cancellation','MED','OPEN',NULL,'Hold stuck after citizen cancelled pharmacy request.'),
  ('TCK-3370','Fatima Sheikh','CITIZEN','ACC-22871','Duplicate case shown on Home screen','LOW','RESOLVED','R. Iyer','Client cache bug; force-refresh fixed.');

-- Seed platform issues (A-09 Kanban)
INSERT INTO "admin"."platform_issues"
  ("issue_number","title","category","status","severity")
VALUES
  ('ISS-512','Bed webhook sync failures — 3 hospitals','PLATFORM_HEALTH','OPEN','HIGH'),
  ('ISS-509','ICU ack SLA breach pattern, Bengaluru','PROVIDER_SUPPORT','OPEN','MED'),
  ('ISS-505','ABHA linkage mismatch edge case','CITIZEN_SUPPORT','IN_PROGRESS','LOW'),
  ('ISS-498','AI matching latency spike, Pune','PLATFORM_HEALTH','IN_PROGRESS','MED'),
  ('ISS-491','IRDAI standard pending confirmation','INSURANCE_INTEGRATION','BLOCKED','LOW'),
  ('ISS-487','Duplicate account merge tool fixed','CITIZEN_SUPPORT','RESOLVED','LOW'),
  ('ISS-480','Fleet map marker clustering fixed','PROVIDER_SUPPORT','RESOLVED','LOW');

-- Seed feature flags (A-18)
INSERT INTO "admin"."feature_flags"
  ("key","description","enabled","rollout_percent","geography")
VALUES
  ('ambulance.multi_state_rollout','Enable ambulance matching in newly onboarded states',TRUE,62,'8 of 14 states'),
  ('insurance.claim_exchange_v2','IRDAI-aligned claim exchange format',TRUE,10,'Pilot: Karnataka'),
  ('teleconsult.booking','Teleconsult booking type (Module 3)',FALSE,0,'Not launched'),
  ('chronic.surveillance_dashboard','CHRONIC_MANAGEMENT dedicated dashboard variant',FALSE,0,'Not launched');

-- Seed platform config (A-18) — BR-01/02/03 defaults
INSERT INTO "admin"."platform_config" ("group_key","label","value")
VALUES
  ('hold_expiry','General bed hold expiry','10 min'),
  ('hold_expiry','ICU/Ventilator hold expiry','5 min'),
  ('staleness','Bed inventory staleness flag','15 min'),
  ('staleness','Ambulance GPS staleness flag','30 sec'),
  ('sla','Ambulance search radius, initial','5 km'),
  ('sla','Ambulance dispatch SLA (BR-01)','90 sec');
