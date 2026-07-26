-- Phase 7 — Hospital Registry + geo-proximity (TD-003)
-- Hand-written per ISSUE-005.
-- Adds beds.hospital_registry: canonical lat/lng per onboarded hospital.
-- CitizenBedSearchService uses a pure-SQL haversine formula for distance sort;
-- PostGIS is NOT required — the formula is accurate to ~0.5% for distances < 100km.

CREATE TABLE "beds"."hospital_registry" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "hospital_id"   TEXT        NOT NULL UNIQUE,
  "name"          TEXT        NOT NULL,
  "address"       TEXT,
  "city"          TEXT,
  "state"         TEXT,
  "lat"           FLOAT8      NOT NULL,
  "lng"           FLOAT8      NOT NULL,
  "provider_type" TEXT        NOT NULL DEFAULT 'HOSPITAL',
  "is_active"     BOOLEAN     NOT NULL DEFAULT TRUE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "hospital_registry_lat_lng_idx"   ON "beds"."hospital_registry" ("lat", "lng");
CREATE INDEX "hospital_registry_hospital_id_idx" ON "beds"."hospital_registry" ("hospital_id");

-- Seed a handful of realistic Bengaluru hospitals so bed search returns real geo data
-- in local dev without needing to call PUT /v1/providers/:id/beds first.
-- Production seeding is handled by the provider-onboarding flow (Stage: GO_LIVE_APPROVAL).
INSERT INTO "beds"."hospital_registry"
  ("id", "hospital_id", "name", "address", "city", "state", "lat", "lng")
VALUES
  (gen_random_uuid(), 'hosp-apollo-blr',    'Apollo Hospital',       'Bannerghatta Road',    'Bengaluru', 'Karnataka', 12.8902, 77.5966),
  (gen_random_uuid(), 'hosp-fortis-blr',    'Fortis Hospital',       'Bommasandra',          'Bengaluru', 'Karnataka', 12.8321, 77.6836),
  (gen_random_uuid(), 'hosp-narayana-blr',  'Narayana Health',       'Hosur Road',           'Bengaluru', 'Karnataka', 12.8764, 77.6218),
  (gen_random_uuid(), 'hosp-manipal-blr',   'Manipal Hospital',      'HAL Airport Road',     'Bengaluru', 'Karnataka', 12.9589, 77.6494),
  (gen_random_uuid(), 'hosp-sakra-blr',     'Sakra World Hospital',  'Marathahalli',         'Bengaluru', 'Karnataka', 12.9558, 77.6952),
  (gen_random_uuid(), 'hosp-bgr-pune',      'Ruby Hall Clinic',      'Sassoon Road',         'Pune',      'Maharashtra', 18.5204, 73.8567),
  (gen_random_uuid(), 'hosp-lgh-chennai',   'Apollo Hospitals',      'Greams Road',          'Chennai',   'Tamil Nadu',  13.0550, 80.2597);
