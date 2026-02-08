CREATE TABLE IF NOT EXISTS body_measurement_entry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  measurement_date date NOT NULL,
  neck_cm numeric,
  chest_cm numeric,
  left_arm_cm numeric,
  right_arm_cm numeric,
  waist_cm numeric,
  hips_cm numeric,
  left_thigh_cm numeric,
  right_thigh_cm numeric,
  left_calf_cm numeric,
  right_calf_cm numeric,
  weight_kg numeric,
  notes text
);

ALTER TABLE body_measurement_entry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own body measurements"
  ON body_measurement_entry
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
