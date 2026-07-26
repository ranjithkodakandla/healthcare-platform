-- P0 Admin: G3 resolution, G5 access justification, G9 deactivate
ALTER TABLE "admin"."citizen_onboarding_flags"
  ADD COLUMN IF NOT EXISTS "resolution" TEXT;

ALTER TABLE "admin"."support_tickets"
  ADD COLUMN IF NOT EXISTS "access_justification" TEXT;

ALTER TABLE "admin"."console_users"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
