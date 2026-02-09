-- Update blood work marker presets to female reference ranges
-- (for existing databases that had male values)

UPDATE blood_work_marker_presets SET ref_range_low = 0.6, ref_range_high = 1.1 WHERE marker_name = 'Creatinine';
UPDATE blood_work_marker_presets SET ref_range_low = 12.0, ref_range_high = 16.0 WHERE marker_name = 'Hemoglobin';
UPDATE blood_work_marker_presets SET ref_range_low = 36.1, ref_range_high = 44.3 WHERE marker_name = 'Hematocrit';
UPDATE blood_work_marker_presets SET ref_range_low = 4.0, ref_range_high = 5.0 WHERE marker_name = 'Red Blood Cells';
UPDATE blood_work_marker_presets SET ref_range_low = 50, ref_range_high = 170 WHERE marker_name = 'Iron';
UPDATE blood_work_marker_presets SET ref_range_low = 12, ref_range_high = 150 WHERE marker_name = 'Ferritin';
