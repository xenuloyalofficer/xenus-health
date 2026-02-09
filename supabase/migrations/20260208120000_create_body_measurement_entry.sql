-- Drop the old misnamed table if it exists
DROP TABLE IF EXISTS body_measurement_entry;

-- Create the correct body_measurements table
CREATE TABLE IF NOT EXISTS body_measurements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  measured_at date NOT NULL,
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
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- Authenticated users can only CRUD their own rows
CREATE POLICY "Users can view their own body measurements"
  ON body_measurements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body measurements"
  ON body_measurements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body measurements"
  ON body_measurements
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body measurements"
  ON body_measurements
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast user lookups ordered by date
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date
  ON body_measurements (user_id, measured_at DESC);
