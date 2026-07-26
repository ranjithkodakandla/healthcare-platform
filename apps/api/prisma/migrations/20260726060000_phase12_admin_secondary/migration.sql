-- Phase 12 — Admin secondary surfaces (A-03/A-11/A-16/A-17) + seed rows.

CREATE TABLE IF NOT EXISTS "admin"."citizen_onboarding_flags" (
    "id" TEXT NOT NULL,
    "account_ref" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "issue_label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "flagged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "citizen_onboarding_flags_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "citizen_onboarding_flags_status_flagged_at_idx"
  ON "admin"."citizen_onboarding_flags"("status", "flagged_at");

CREATE TABLE IF NOT EXISTS "admin"."knowledge_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "knowledge_articles_category_idx"
  ON "admin"."knowledge_articles"("category");

CREATE TABLE IF NOT EXISTS "admin"."broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "channels" TEXT[] NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "admin"."ai_ops_suggestions" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_ops_suggestions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_ops_suggestions_status_idx"
  ON "admin"."ai_ops_suggestions"("status");

-- Seeds (idempotent via fixed IDs)
INSERT INTO "admin"."citizen_onboarding_flags"
  ("id","account_ref","display_name","issue","issue_label","status","flagged_at","created_at","updated_at")
VALUES
  ('cof-001','ACC-88421','Priya Sharma','DUPLICATE_ACCOUNT','Possible duplicate account','PENDING', NOW() - INTERVAL '2 hours', NOW(), NOW()),
  ('cof-002','ACC-88455','Ravi Kumar','FAMILY_LINKAGE','Family linkage dispute','IN_REVIEW', NOW() - INTERVAL '5 hours', NOW(), NOW()),
  ('cof-003','ACC-88502','Ananya Reddy','ABHA_MISMATCH','ABHA ID mismatch','PENDING', NOW() - INTERVAL '1 day', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "admin"."knowledge_articles"
  ("id","title","category","body","note","updated_at","created_at")
VALUES
  ('ka-001','How to escalate a CRITICAL ambulance SLA breach','Support playbooks','1. Confirm BR-01 timer. 2. Page on-call ops. 3. Open ISS ticket.','Used by Support Agents', NOW() - INTERVAL '3 days', NOW()),
  ('ka-002','Provider onboarding zero-tolerance A-04 gate','Provider ops','Never skip CREDENTIAL_VERIFICATION or INTEGRATION_TEST.','G4 / FR-ADM-PRV-001', NOW() - INTERVAL '7 days', NOW()),
  ('ka-003','Stale bed inventory remediation','Platform ops','Contact hospital admissions; mark inventory FRESH after verified update.','BR-03', NOW() - INTERVAL '1 day', NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "admin"."broadcasts"
  ("id","title","body","audience","channels","status","created_at","updated_at")
VALUES
  ('bc-001','ICU capacity advisory — Bengaluru','Hospitals reporting elevated ICU occupancy. Prefer alternate routing for ROUTINE cases.','All hospitals (KA)','{IN_APP,WHATSAPP}','SENT', NOW() - INTERVAL '2 days', NOW()),
  ('bc-002','Draft: Golden hour reminder','Reminder: confirm clinical ack within hold window.','Hospital ER coordinators','{IN_APP,SMS}','DRAFT', NOW() - INTERVAL '6 hours', NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "admin"."ai_ops_suggestions"
  ("id","action","confidence","source","status","created_at","updated_at")
VALUES
  ('ai-001','Increase ambulance offer radius for Bengaluru south zone by 2 km',0.82,'Matching latency anomaly','PENDING', NOW() - INTERVAL '40 minutes', NOW()),
  ('ai-002','Flag 3 hospitals with STALE ICU inventory for outreach',0.91,'InventoryStalenessCheckJob','PENDING', NOW() - INTERVAL '15 minutes', NOW()),
  ('ai-003','Dismissed earlier: temporary WhatsApp webhook blip',0.55,'Messaging stub health','DISMISSED', NOW() - INTERVAL '1 day', NOW())
ON CONFLICT ("id") DO NOTHING;
