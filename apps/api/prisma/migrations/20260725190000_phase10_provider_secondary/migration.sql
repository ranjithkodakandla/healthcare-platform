-- Phase 10 — Provider secondary modules (pharmacy stock, ambulance fleet fields, blood pre-alerts)
-- Hand-written per ISSUE-005.

CREATE SCHEMA IF NOT EXISTS "pharmacy";
CREATE SCHEMA IF NOT EXISTS "blood";

-- Fleet roster fields on existing ambulance drivers (FR-AMBP-001 / P-14)
ALTER TABLE "ambulance"."ambulance_drivers"
  ADD COLUMN IF NOT EXISTS "operator_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "display_name" TEXT,
  ADD COLUMN IF NOT EXISTS "fleet_status" TEXT NOT NULL DEFAULT 'OFF_DUTY';

CREATE INDEX IF NOT EXISTS "ambulance_drivers_operator_id_idx"
  ON "ambulance"."ambulance_drivers" ("operator_id");

CREATE TABLE "pharmacy"."pharmacy_stock" (
  "id"                 UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "pharmacy_id"        TEXT        NOT NULL,
  "medicine_name"      TEXT        NOT NULL,
  "category"           TEXT        NOT NULL,
  "stock_count"        INT         NOT NULL DEFAULT 0,
  "low_threshold"      INT         NOT NULL DEFAULT 10,
  "critical_threshold" INT         NOT NULL DEFAULT 3,
  "last_updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "last_updated_by"    TEXT,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("pharmacy_id", "medicine_name")
);
CREATE INDEX "pharmacy_stock_pharmacy_id_idx" ON "pharmacy"."pharmacy_stock" ("pharmacy_id");

CREATE TABLE "blood"."blood_pre_alerts" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "blood_bank_id" TEXT        NOT NULL,
  "blood_group"   TEXT        NOT NULL,
  "units"         INT         NOT NULL DEFAULT 1,
  "source_type"   TEXT        NOT NULL,
  "urgency"       TEXT        NOT NULL DEFAULT 'ROUTINE',
  "reason"        TEXT        NOT NULL,
  "case_id"       TEXT,
  "status"        TEXT        NOT NULL DEFAULT 'OPEN',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "blood_pre_alerts_bank_status_idx" ON "blood"."blood_pre_alerts" ("blood_bank_id", "status");
CREATE INDEX "blood_pre_alerts_source_type_idx" ON "blood"."blood_pre_alerts" ("source_type");

-- Seed pharmacy stock for local demo org (matches provider portal session fallback)
INSERT INTO "pharmacy"."pharmacy_stock"
  ("pharmacy_id","medicine_name","category","stock_count","low_threshold","critical_threshold")
VALUES
  ('hosp-apollo-blr','Adrenaline 1mg/mL','Emergency',24,10,3),
  ('hosp-apollo-blr','Dopamine 200mg','Critical Care',8,10,3),
  ('hosp-apollo-blr','Morphine 10mg/mL','Analgesic',2,10,3),
  ('hosp-apollo-blr','Amoxicillin 500mg','Antibiotic',140,20,5),
  ('hosp-apollo-blr','Normal Saline 500mL','IV Fluid',60,15,5);

-- Seed fleet drivers for the same demo operator
INSERT INTO "ambulance"."ambulance_drivers"
  ("id","driver_uid","operator_id","display_name","vehicle_reg","vehicle_type","fleet_status","is_on_duty","last_lat","last_lng","last_ping_at")
VALUES
  (gen_random_uuid(),'driver-vijay','hosp-apollo-blr','Vijay S.','KA-01-B','BASIC_LIFE_SUPPORT','EN_ROUTE',TRUE,12.9716,77.5946,NOW()),
  (gen_random_uuid(),'driver-mohan','hosp-apollo-blr','Mohan R.','KA-01-C','ADVANCED_LIFE_SUPPORT','AVAILABLE',TRUE,12.9352,77.6245,NOW()),
  (gen_random_uuid(),'driver-ramesh','hosp-apollo-blr','Ramesh P.','KA-01-D','BASIC_LIFE_SUPPORT','AVAILABLE',TRUE,12.9279,77.6271,NOW()),
  (gen_random_uuid(),'driver-ankit','hosp-apollo-blr','Ankit J.','KA-01-E','PATIENT_TRANSPORT','MAINTENANCE',FALSE,NULL,NULL,NULL),
  (gen_random_uuid(),'driver-suresh','hosp-apollo-blr','Suresh K.','KA-01-F','BASIC_LIFE_SUPPORT','EN_ROUTE',TRUE,12.9784,77.6408,NOW())
ON CONFLICT ("driver_uid") DO UPDATE SET
  operator_id = EXCLUDED.operator_id,
  display_name = EXCLUDED.display_name,
  fleet_status = EXCLUDED.fleet_status,
  is_on_duty = EXCLUDED.is_on_duty,
  last_lat = EXCLUDED.last_lat,
  last_lng = EXCLUDED.last_lng;

-- Seed blood pre-alerts (P-16)
INSERT INTO "blood"."blood_pre_alerts"
  ("blood_bank_id","blood_group","units","source_type","urgency","reason","case_id","status")
VALUES
  ('hosp-apollo-blr','O-',2,'AI_PREALERT','PROACTIVE','Predicted need based on CASE-88213 trauma profile.','CASE-88213','OPEN'),
  ('hosp-apollo-blr','AB+',1,'AI_PREALERT','PROACTIVE','Historical pattern: Saturday evening surge.',NULL,'OPEN'),
  ('hosp-apollo-blr','B+',3,'EXPLICIT_REQUEST','URGENT','CASE-88219 — scheduled surgery 16:00 today.','CASE-88219','OPEN'),
  ('hosp-apollo-blr','O+',4,'EXPLICIT_REQUEST','CRITICAL','CASE-88228 — internal haemorrhage, en route.','CASE-88228','OPEN');
