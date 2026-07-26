-- Optional org / portal login fields for admin-created provider applications.
ALTER TABLE "admin"."provider_applications"
  ADD COLUMN IF NOT EXISTS "org_id" TEXT,
  ADD COLUMN IF NOT EXISTS "portal_email" TEXT;

CREATE INDEX IF NOT EXISTS "provider_applications_org_id_idx"
  ON "admin"."provider_applications" ("org_id");
