-- PROVIDER_UAT_REPORT.md Finding #7: hold-expiry config was keyed by bed category
-- (General/ICU) instead of case severity, contradicting PRD §2.8 BR-02
-- ("30 min for CRITICAL cases, 2 hours for PLANNED") and Part J's named config keys
-- BED_HOLD_EXPIRY_MIN_CRITICAL / BED_HOLD_EXPIRY_MIN_PLANNED. It also meant the
-- ICU/Ventilator window (5 min) was shorter than General (10 min) even though
-- ICU/Vent requires the extra BR-04 clinical-acknowledgment step — operationally
-- backwards, not just a labeling issue.
UPDATE admin.platform_config
SET label = 'CRITICAL bed hold expiry', value = '30 min'
WHERE group_key = 'hold_expiry' AND label = 'General bed hold expiry';

UPDATE admin.platform_config
SET label = 'PLANNED bed hold expiry', value = '120 min'
WHERE group_key = 'hold_expiry' AND label = 'ICU/Ventilator hold expiry';
