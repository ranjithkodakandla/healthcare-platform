-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "resource_coordination";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "shared_services";

-- CreateTable
CREATE TABLE "core"."cases" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."case_timeline_events" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_coordination"."resource_capacities" (
    "id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_capacities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_coordination"."resource_holds" (
    "id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "case_id" TEXT,
    "holder_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_services"."audit_log" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_timeline_events_case_id_created_at_idx" ON "core"."case_timeline_events"("case_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "resource_capacities_resource_type_resource_id_key" ON "resource_coordination"."resource_capacities"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "resource_holds_resource_type_resource_id_status_idx" ON "resource_coordination"."resource_holds"("resource_type", "resource_id", "status");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "shared_services"."audit_log"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "core"."case_timeline_events" ADD CONSTRAINT "case_timeline_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "core"."cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
