-- ============================================================
-- Seed historical blood work data
-- Uses a DO block to get the first user from auth.users
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
  v_panel1_id uuid;
  v_panel2_id uuid;
  v_panel3_id uuid;
BEGIN
  -- Get the first user (single-user app)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found — skipping blood work seed data';
    RETURN;
  END IF;

  -- Panel 1 (earliest) — ~2024-06-15
  INSERT INTO blood_work_panels (id, user_id, test_date, lab_name, notes)
  VALUES (gen_random_uuid(), v_user_id, '2024-06-15', NULL, 'Baseline labs')
  RETURNING id INTO v_panel1_id;

  INSERT INTO blood_work_results (user_id, panel_id, marker_name, category, value, unit, ref_range_low, ref_range_high, flag) VALUES
    (v_user_id, v_panel1_id, 'Total Cholesterol', 'Lipid Panel', 302, 'mg/dL', 0, 200, 'high'),
    (v_user_id, v_panel1_id, 'HDL Cholesterol',   'Lipid Panel', 36,  'mg/dL', 40, 60, 'low'),
    (v_user_id, v_panel1_id, 'LDL Cholesterol',   'Lipid Panel', 206, 'mg/dL', 0, 100, 'high'),
    (v_user_id, v_panel1_id, 'Triglycerides',      'Lipid Panel', 470, 'mg/dL', 0, 150, 'high'),
    (v_user_id, v_panel1_id, 'Glucose (Fasting)',  'Metabolic',   94,  'mg/dL', 70, 100, NULL),
    (v_user_id, v_panel1_id, 'AST (GOT)',          'Liver',       46,  'U/L',   0, 35, 'high'),
    (v_user_id, v_panel1_id, 'ALT (GPT)',          'Liver',       108, 'U/L',   0, 35, 'high');

  -- Panel 2 (middle) — ~2024-12-10
  INSERT INTO blood_work_panels (id, user_id, test_date, lab_name, notes)
  VALUES (gen_random_uuid(), v_user_id, '2024-12-10', NULL, 'Follow-up labs')
  RETURNING id INTO v_panel2_id;

  INSERT INTO blood_work_results (user_id, panel_id, marker_name, category, value, unit, ref_range_low, ref_range_high, flag) VALUES
    (v_user_id, v_panel2_id, 'Total Cholesterol', 'Lipid Panel', 302, 'mg/dL', 0, 200, 'high'),
    (v_user_id, v_panel2_id, 'Triglycerides',      'Lipid Panel', 470, 'mg/dL', 0, 150, 'high'),
    (v_user_id, v_panel2_id, 'Glucose (Fasting)',  'Metabolic',   102, 'mg/dL', 70, 100, 'high');

  -- Panel 3 (most recent) — ~2025-06-20
  INSERT INTO blood_work_panels (id, user_id, test_date, lab_name, notes)
  VALUES (gen_random_uuid(), v_user_id, '2025-06-20', NULL, 'Latest labs')
  RETURNING id INTO v_panel3_id;

  INSERT INTO blood_work_results (user_id, panel_id, marker_name, category, value, unit, ref_range_low, ref_range_high, flag) VALUES
    (v_user_id, v_panel3_id, 'Total Cholesterol',     'Lipid Panel', 366,  'mg/dL', 0, 200, 'high'),
    (v_user_id, v_panel3_id, 'HDL Cholesterol',       'Lipid Panel', 36,   'mg/dL', 40, 60, 'low'),
    (v_user_id, v_panel3_id, 'LDL Cholesterol',       'Lipid Panel', 189,  'mg/dL', 0, 100, 'high'),
    (v_user_id, v_panel3_id, 'Triglycerides',          'Lipid Panel', 406,  'mg/dL', 0, 150, 'high'),
    (v_user_id, v_panel3_id, 'Cholesterol/HDL Ratio',  'Lipid Panel', 10.2, '',      0, 5.0, 'high'),
    (v_user_id, v_panel3_id, 'Glucose (Fasting)',      'Metabolic',   110,  'mg/dL', 70, 100, 'high'),
    (v_user_id, v_panel3_id, 'AST (GOT)',              'Liver',       30,   'U/L',   0, 35, NULL),
    (v_user_id, v_panel3_id, 'ALT (GPT)',              'Liver',       75,   'U/L',   0, 35, 'high');

  RAISE NOTICE 'Seeded 3 blood work panels for user %', v_user_id;
END;
$$;
