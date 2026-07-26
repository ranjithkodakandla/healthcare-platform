-- Phase 11 — Citizen Modules 3–9 search directories (hand-written per ISSUE-005)

CREATE SCHEMA IF NOT EXISTS "doctors";
CREATE SCHEMA IF NOT EXISTS "diagnostics";
CREATE SCHEMA IF NOT EXISTS "insurance";

CREATE TABLE "pharmacy"."pharmacy_registry" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "pharmacy_id" TEXT        NOT NULL UNIQUE,
  "name"        TEXT        NOT NULL,
  "address"     TEXT,
  "city"        TEXT,
  "lat"         FLOAT8,
  "lng"         FLOAT8,
  "is_24x7"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "blood"."blood_bank_stock" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "blood_bank_id"   TEXT        NOT NULL,
  "name"            TEXT        NOT NULL,
  "blood_group"     TEXT        NOT NULL,
  "component"       TEXT        NOT NULL DEFAULT 'WHOLE_BLOOD',
  "units_available" INT         NOT NULL DEFAULT 0,
  "lat"             FLOAT8,
  "lng"             FLOAT8,
  "city"            TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("blood_bank_id", "blood_group", "component")
);
CREATE INDEX "blood_bank_stock_group_idx" ON "blood"."blood_bank_stock" ("blood_group");

CREATE TABLE "doctors"."doctor_profiles" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "name"           TEXT        NOT NULL,
  "specialty"      TEXT        NOT NULL,
  "hospital_name"  TEXT,
  "next_slot_at"   TIMESTAMPTZ,
  "city"           TEXT,
  "lat"            FLOAT8,
  "lng"            FLOAT8,
  "is_teleconsult" BOOLEAN     NOT NULL DEFAULT FALSE,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "doctor_profiles_specialty_idx" ON "doctors"."doctor_profiles" ("specialty");

CREATE TABLE "diagnostics"."diagnostic_offerings" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "center_name"  TEXT        NOT NULL,
  "test_name"    TEXT        NOT NULL,
  "price_inr"    INT         NOT NULL,
  "next_slot_at" TIMESTAMPTZ,
  "city"         TEXT,
  "lat"          FLOAT8,
  "lng"          FLOAT8,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "diagnostic_offerings_test_name_idx" ON "diagnostics"."diagnostic_offerings" ("test_name");

CREATE TABLE "insurance"."insurance_pre_auths" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "case_id"          TEXT,
  "insurer_name"     TEXT        NOT NULL,
  "policy_last4"     TEXT,
  "hospital_name"    TEXT,
  "status"           TEXT        NOT NULL DEFAULT 'SUBMITTED',
  "rejection_reason" TEXT,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "insurance_pre_auths_case_id_idx" ON "insurance"."insurance_pre_auths" ("case_id");

CREATE TABLE "beds"."cancer_centers" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "name"       TEXT        NOT NULL,
  "modalities" TEXT        NOT NULL,
  "city"       TEXT,
  "lat"        FLOAT8,
  "lng"        FLOAT8,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seeds (Bengaluru-centric demo)
INSERT INTO "pharmacy"."pharmacy_registry" ("pharmacy_id","name","address","city","lat","lng","is_24x7") VALUES
  ('pharm-medplus-kor','MedPlus — Koramangala','Koramangala','Bengaluru',12.9352,77.6245,TRUE),
  ('pharm-apollo-ind','Apollo Pharmacy','Indiranagar','Bengaluru',12.9784,77.6408,TRUE),
  ('pharm-fortis','Fortis Pharmacy','Bannerghatta Road','Bengaluru',12.8902,77.5966,FALSE);

INSERT INTO "pharmacy"."pharmacy_stock" ("pharmacy_id","medicine_name","category","stock_count","low_threshold","critical_threshold") VALUES
  ('pharm-medplus-kor','Insulin','Diabetes',40,10,3),
  ('pharm-apollo-ind','Insulin','Diabetes',8,10,3),
  ('pharm-fortis','Insulin','Diabetes',0,10,3),
  ('pharm-medplus-kor','Paracetamol 500mg','Analgesic',200,20,5)
ON CONFLICT ("pharmacy_id","medicine_name") DO NOTHING;

INSERT INTO "blood"."blood_bank_stock"
  ("blood_bank_id","name","blood_group","component","units_available","lat","lng","city") VALUES
  ('bb-redcross','Red Cross Blood Bank','O+','WHOLE_BLOOD',12,12.9716,77.5946,'Bengaluru'),
  ('bb-redcross','Red Cross Blood Bank','O-','WHOLE_BLOOD',2,12.9716,77.5946,'Bengaluru'),
  ('bb-city','City Blood Bank','O+','WHOLE_BLOOD',0,12.9352,77.6245,'Bengaluru'),
  ('bb-city','City Blood Bank','A+','WHOLE_BLOOD',5,12.9352,77.6245,'Bengaluru'),
  ('bb-rotary','Rotary Blood Bank','B+','WHOLE_BLOOD',7,12.9589,77.6494,'Bengaluru');

INSERT INTO "doctors"."doctor_profiles"
  ("name","specialty","hospital_name","next_slot_at","city","lat","lng","is_teleconsult") VALUES
  ('Dr. Anjali Rao','Cardiology','Apollo Hospital', NOW() + INTERVAL '3 hours','Bengaluru',12.8902,77.5966,FALSE),
  ('Dr. Vikram Shah','Cardiology','Fortis Hospital', NOW() + INTERVAL '1 day','Bengaluru',12.8321,77.6836,FALSE),
  ('Dr. Priya Nair','General Physician','St. John''s', NOW() + INTERVAL '5 hours','Bengaluru',12.9280,77.6270,TRUE),
  ('Dr. Arjun Mehta','Neurology','Manipal Hospital', NOW() + INTERVAL '8 hours','Bengaluru',12.9589,77.6494,FALSE),
  ('Dr. Sneha Iyer','Orthopaedics','Sakra World Hospital', NOW() + INTERVAL '2 days','Bengaluru',12.9558,77.6952,FALSE);

INSERT INTO "diagnostics"."diagnostic_offerings"
  ("center_name","test_name","price_inr","next_slot_at","city","lat","lng") VALUES
  ('Apollo Diagnostics','MRI Brain',4500, NOW() + INTERVAL '4 hours','Bengaluru',12.8902,77.5966),
  ('Metropolis','MRI Brain',4200, NOW() + INTERVAL '1 day','Bengaluru',12.9352,77.6245),
  ('SRL Diagnostics','CBC',350, NOW() + INTERVAL '2 hours','Bengaluru',12.9784,77.6408),
  ('Thyrocare','CBC',280, NOW() + INTERVAL '3 hours','Bengaluru',12.9279,77.6271);

INSERT INTO "insurance"."insurance_pre_auths"
  ("case_id","insurer_name","policy_last4","hospital_name","status") VALUES
  (NULL,'Star Health Insurance','4821','Apollo Hospital','UNDER_REVIEW');

INSERT INTO "beds"."cancer_centers" ("name","modalities","city","lat","lng") VALUES
  ('HCG Cancer Centre','Radiation,Chemotherapy','Bengaluru',12.9558,77.6952),
  ('Kidwai Memorial Institute','Surgical Oncology','Bengaluru',12.9279,77.5950),
  ('Narayana Health Cancer','Chemotherapy,Radiation','Bengaluru',12.8764,77.6218);
