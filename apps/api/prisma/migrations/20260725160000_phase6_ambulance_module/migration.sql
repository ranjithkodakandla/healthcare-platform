-- Phase 6 — Ambulance module (FR-AMB-001–FR-AMB-004)
-- Hand-written per ISSUE-005: never use prisma migrate diff --shadow-database-url against a live DB.
-- Applied via: npx prisma db execute --file ... after: npx prisma migrate resolve --applied ...

CREATE SCHEMA IF NOT EXISTS "ambulance";

CREATE TABLE "ambulance"."ambulance_drivers" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "driver_uid"   TEXT        NOT NULL UNIQUE,
  "vehicle_reg"  TEXT        NOT NULL,
  "vehicle_type" TEXT        NOT NULL DEFAULT 'BASIC_LIFE_SUPPORT',
  "is_on_duty"   BOOLEAN     NOT NULL DEFAULT FALSE,
  "last_lat"     FLOAT8,
  "last_lng"     FLOAT8,
  "last_ping_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "ambulance_drivers_is_on_duty_idx" ON "ambulance"."ambulance_drivers" ("is_on_duty");

CREATE TABLE "ambulance"."ambulance_requests" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "case_id"     TEXT        NOT NULL,
  "driver_id"   UUID,
  "status"      TEXT        NOT NULL DEFAULT 'SEARCHING',
  "pickup_lat"  FLOAT8,
  "pickup_lng"  FLOAT8,
  "severity"    TEXT        NOT NULL DEFAULT 'MODERATE',
  "version"     INT         NOT NULL DEFAULT 1,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ambulance_requests_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES "ambulance"."ambulance_drivers" ("id")
);
CREATE INDEX "ambulance_requests_case_id_idx"  ON "ambulance"."ambulance_requests" ("case_id");
CREATE INDEX "ambulance_requests_status_idx"   ON "ambulance"."ambulance_requests" ("status");

CREATE TABLE "ambulance"."ambulance_offers" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "request_id"    UUID        NOT NULL,
  "driver_id"     UUID        NOT NULL,
  "status"        TEXT        NOT NULL DEFAULT 'PENDING',
  "offered_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "responded_at"  TIMESTAMPTZ,
  "expires_at"    TIMESTAMPTZ NOT NULL,
  CONSTRAINT "ambulance_offers_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES "ambulance"."ambulance_requests" ("id"),
  CONSTRAINT "ambulance_offers_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES "ambulance"."ambulance_drivers" ("id")
);
CREATE INDEX "ambulance_offers_request_id_idx" ON "ambulance"."ambulance_offers" ("request_id");
CREATE INDEX "ambulance_offers_driver_id_idx"  ON "ambulance"."ambulance_offers" ("driver_id");
