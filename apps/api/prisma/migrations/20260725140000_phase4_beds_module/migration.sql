-- Phase 4 — Beds Module (FR-BED-001, Module 2)
-- Schema: beds
-- Tables: hospital_bed_inventory
-- Hand-written per ISSUE-005 caution (never --shadow-database-url against a live DB).

CREATE SCHEMA IF NOT EXISTS "beds";

CREATE TABLE "beds"."hospital_bed_inventory" (
  "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "hospital_id"      TEXT        NOT NULL,
  "category"         TEXT        NOT NULL,
  "available_count"  INTEGER     NOT NULL DEFAULT 0,
  "occupied_count"   INTEGER     NOT NULL DEFAULT 0,
  "total_count"      INTEGER     NOT NULL DEFAULT 0,
  "staleness_status" TEXT        NOT NULL DEFAULT 'FRESH',
  "last_updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "last_updated_by"  TEXT,
  "version"          INTEGER     NOT NULL DEFAULT 1,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "hospital_bed_inventory_pkey" PRIMARY KEY ("id")
);

-- Enforce one row per (hospital, category) — the uniqueness invariant for
-- BedInventoryService.upsert operations.
CREATE UNIQUE INDEX "hospital_bed_inventory_hospital_id_category_key"
  ON "beds"."hospital_bed_inventory" ("hospital_id", "category");

-- Indexes for the two primary access patterns:
-- (1) GET /v1/providers/{hospitalId}/beds — fetch all categories for a hospital
CREATE INDEX "hospital_bed_inventory_hospital_id_idx"
  ON "beds"."hospital_bed_inventory" ("hospital_id");

-- (2) InventoryStalenessCheckJob — find FRESH rows older than threshold
CREATE INDEX "hospital_bed_inventory_staleness_status_idx"
  ON "beds"."hospital_bed_inventory" ("staleness_status");
