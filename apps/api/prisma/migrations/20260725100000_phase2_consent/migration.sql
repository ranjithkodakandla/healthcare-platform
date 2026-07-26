-- Part I1: Consent Service — scoped, revocable, auditable consent artifacts.
CREATE TABLE "shared_services"."consent_grants" (
    "id" TEXT NOT NULL,
    "case_id" TEXT,
    "granter_id" TEXT NOT NULL,
    "grantee_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "scope" JSONB,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_grants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consent_grants_granter_id_grantee_id_purpose_idx" ON "shared_services"."consent_grants"("granter_id", "grantee_id", "purpose");

CREATE INDEX "consent_grants_case_id_idx" ON "shared_services"."consent_grants"("case_id");
