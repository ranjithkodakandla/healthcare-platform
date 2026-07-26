-- Part G4 (Provider Onboarding & Verification) + Part G9 (Console User Management),
-- Phase 3 minimal onboarding slice.
CREATE SCHEMA IF NOT EXISTS "admin";

CREATE TABLE "admin"."provider_applications" (
    "id" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLICATION_INTAKE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin"."provider_onboarding_stages" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewer_id" TEXT,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_onboarding_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_onboarding_stages_application_id_stage_key" ON "admin"."provider_onboarding_stages"("application_id", "stage");

ALTER TABLE "admin"."provider_onboarding_stages" ADD CONSTRAINT "provider_onboarding_stages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "admin"."provider_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "admin"."console_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "firebase_uid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "console_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "console_users_email_key" ON "admin"."console_users"("email");

CREATE UNIQUE INDEX "console_users_firebase_uid_key" ON "admin"."console_users"("firebase_uid");
