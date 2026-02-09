-- ============================================================
-- Blood Work / Lab Results Tracking
-- ============================================================

-- 1. blood_work_marker_presets — predefined markers with reference ranges
-- ============================================================
CREATE TABLE IF NOT EXISTS blood_work_marker_presets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,             -- 'Lipid Panel', 'Metabolic', 'Liver', etc.
  marker_name text NOT NULL,          -- 'Total Cholesterol', 'HDL', etc.
  unit text NOT NULL,                 -- 'mg/dL', '%', 'U/L', etc.
  ref_range_low numeric,
  ref_range_high numeric,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Marker presets are global (no RLS needed — read-only for all users)
-- No user_id column — shared across all users

-- ============================================================
-- 2. blood_work_panels — a lab visit / panel date
-- ============================================================
CREATE TABLE IF NOT EXISTS blood_work_panels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  test_date date NOT NULL,
  lab_name text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blood_work_panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blood work panels"
  ON blood_work_panels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blood work panels"
  ON blood_work_panels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blood work panels"
  ON blood_work_panels FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blood work panels"
  ON blood_work_panels FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_blood_work_panels_user_date
  ON blood_work_panels (user_id, test_date DESC);

-- ============================================================
-- 3. blood_work_results — individual marker values per panel
-- ============================================================
CREATE TABLE IF NOT EXISTS blood_work_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  panel_id uuid REFERENCES blood_work_panels(id) ON DELETE CASCADE NOT NULL,
  marker_name text NOT NULL,
  category text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  ref_range_low numeric,
  ref_range_high numeric,
  flag text,                          -- 'high', 'low', or null (normal)
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blood_work_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blood work results"
  ON blood_work_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blood work results"
  ON blood_work_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blood work results"
  ON blood_work_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blood work results"
  ON blood_work_results FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_blood_work_results_panel
  ON blood_work_results (panel_id);

CREATE INDEX IF NOT EXISTS idx_blood_work_results_user_marker
  ON blood_work_results (user_id, marker_name, created_at DESC);

-- ============================================================
-- 4. Seed marker presets
-- ============================================================

-- Lipid Panel
INSERT INTO blood_work_marker_presets (category, marker_name, unit, ref_range_low, ref_range_high, sort_order) VALUES
  ('Lipid Panel', 'Total Cholesterol', 'mg/dL', 0, 200, 1),
  ('Lipid Panel', 'HDL Cholesterol', 'mg/dL', 40, 60, 2),
  ('Lipid Panel', 'LDL Cholesterol', 'mg/dL', 0, 100, 3),
  ('Lipid Panel', 'Triglycerides', 'mg/dL', 0, 150, 4),
  ('Lipid Panel', 'Cholesterol/HDL Ratio', '', 0, 5.0, 5);

-- Metabolic
INSERT INTO blood_work_marker_presets (category, marker_name, unit, ref_range_low, ref_range_high, sort_order) VALUES
  ('Metabolic', 'Glucose (Fasting)', 'mg/dL', 70, 100, 1),
  ('Metabolic', 'HbA1c', '%', 0, 5.7, 2),
  ('Metabolic', 'Creatinine', 'mg/dL', 0.7, 1.3, 3),
  ('Metabolic', 'Uric Acid', 'mg/dL', 3.5, 7.2, 4);

-- Liver
INSERT INTO blood_work_marker_presets (category, marker_name, unit, ref_range_low, ref_range_high, sort_order) VALUES
  ('Liver', 'AST (GOT)', 'U/L', 0, 35, 1),
  ('Liver', 'ALT (GPT)', 'U/L', 0, 35, 2),
  ('Liver', 'GGT', 'U/L', 0, 55, 3),
  ('Liver', 'Bilirubin (Total)', 'mg/dL', 0.1, 1.2, 4),
  ('Liver', 'Alkaline Phosphatase', 'U/L', 44, 147, 5);

-- Blood Count
INSERT INTO blood_work_marker_presets (category, marker_name, unit, ref_range_low, ref_range_high, sort_order) VALUES
  ('Blood Count', 'Hemoglobin', 'g/dL', 13.0, 17.5, 1),
  ('Blood Count', 'Hematocrit', '%', 38.3, 48.6, 2),
  ('Blood Count', 'White Blood Cells', 'x10³/µL', 4.5, 11.0, 3),
  ('Blood Count', 'Platelets', 'x10³/µL', 150, 400, 4),
  ('Blood Count', 'Red Blood Cells', 'x10⁶/µL', 4.5, 5.5, 5);

-- Thyroid
INSERT INTO blood_work_marker_presets (category, marker_name, unit, ref_range_low, ref_range_high, sort_order) VALUES
  ('Thyroid', 'TSH', 'mIU/L', 0.4, 4.0, 1),
  ('Thyroid', 'Free T4', 'ng/dL', 0.8, 1.8, 2),
  ('Thyroid', 'Free T3', 'pg/mL', 2.3, 4.2, 3);

-- Other
INSERT INTO blood_work_marker_presets (category, marker_name, unit, ref_range_low, ref_range_high, sort_order) VALUES
  ('Other', 'Vitamin D', 'ng/mL', 30, 100, 1),
  ('Other', 'Vitamin B12', 'pg/mL', 200, 900, 2),
  ('Other', 'Iron', 'µg/dL', 65, 175, 3),
  ('Other', 'Ferritin', 'ng/mL', 20, 250, 4);
