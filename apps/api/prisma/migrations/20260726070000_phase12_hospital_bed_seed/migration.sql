-- Seed bed inventory for HospitalRegistry hospitals so C-18/C-19 show real occupancy locally.
-- Idempotent via ON CONFLICT on (hospital_id, category).

INSERT INTO "beds"."hospital_bed_inventory"
  ("id", "hospital_id", "category", "total_count", "available_count", "occupied_count",
   "staleness_status", "last_updated_at", "last_updated_by", "version")
VALUES
  (gen_random_uuid(), 'hosp-apollo-blr',   'GENERAL',    80, 14, 66, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-apollo-blr',   'ICU',        20,  3, 17, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-apollo-blr',   'VENTILATOR', 10,  0, 10, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-apollo-blr',   'NICU',        8,  2,  6, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-apollo-blr',   'MATERNITY',  15,  5, 10, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-fortis-blr',   'GENERAL',    60,  5, 55, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-fortis-blr',   'ICU',        16,  1, 15, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-fortis-blr',   'VENTILATOR',  8,  1,  7, 'STALE', NOW() - INTERVAL '2 hours', 'seed', 1),
  (gen_random_uuid(), 'hosp-narayana-blr', 'GENERAL',    70,  1, 69, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-narayana-blr', 'ICU',        24,  0, 24, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-narayana-blr', 'VENTILATOR', 12,  0, 12, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-manipal-blr',  'GENERAL',    50, 18, 32, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-manipal-blr',  'ICU',        12,  4,  8, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-manipal-blr',  'MATERNITY',  10,  6,  4, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-sakra-blr',    'GENERAL',    40, 12, 28, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-sakra-blr',    'ICU',        14,  2, 12, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-sakra-blr',    'ISOLATION',   6,  3,  3, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-bgr-pune',     'GENERAL',    55, 20, 35, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-bgr-pune',     'ICU',        10,  3,  7, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-lgh-chennai',  'GENERAL',    90, 22, 68, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-lgh-chennai',  'ICU',        18,  4, 14, 'FRESH', NOW(), 'seed', 1),
  (gen_random_uuid(), 'hosp-lgh-chennai',  'VENTILATOR',  9,  2,  7, 'FRESH', NOW(), 'seed', 1)
ON CONFLICT ("hospital_id", "category") DO UPDATE SET
  "total_count" = EXCLUDED."total_count",
  "available_count" = EXCLUDED."available_count",
  "occupied_count" = EXCLUDED."occupied_count",
  "staleness_status" = EXCLUDED."staleness_status",
  "last_updated_at" = EXCLUDED."last_updated_at",
  "version" = "beds"."hospital_bed_inventory"."version" + 1;
