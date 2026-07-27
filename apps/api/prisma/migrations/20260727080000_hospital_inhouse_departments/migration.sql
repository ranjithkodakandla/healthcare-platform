-- Hospital in-house sub-unit management (Doctors / Diagnostics): a hospital admin
-- can now own and CRUD Doctor and Diagnostic Offering rows directly, scoped to their
-- own hospitalId, the same "in-house department" model already implicit in
-- AmbulanceDriver.operator_id / PharmacyStock.pharmacy_id / BloodPreAlert &
-- BloodBankStock.blood_bank_id (those three are reused as-is — a hospital's own
-- ambulance/pharmacy/blood-bank department simply sets that column to its own
-- hospitalId, no schema change needed there). Nullable: existing directory-only rows
-- (no owning hospital) remain valid.
ALTER TABLE "doctors"."doctor_profiles"
  ADD COLUMN IF NOT EXISTS "hospital_id" TEXT;

CREATE INDEX IF NOT EXISTS "doctor_profiles_hospital_id_idx"
  ON "doctors"."doctor_profiles" ("hospital_id");

ALTER TABLE "diagnostics"."diagnostic_offerings"
  ADD COLUMN IF NOT EXISTS "hospital_id" TEXT;

CREATE INDEX IF NOT EXISTS "diagnostic_offerings_hospital_id_idx"
  ON "diagnostics"."diagnostic_offerings" ("hospital_id");
