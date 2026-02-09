-- Create sleep_entries table
CREATE TABLE IF NOT EXISTS sleep_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  sleep_start timestamptz NOT NULL,
  sleep_end timestamptz,
  duration_minutes numeric,
  quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can only CRUD their own rows
CREATE POLICY "Users can view their own sleep entries"
  ON sleep_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sleep entries"
  ON sleep_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep entries"
  ON sleep_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep entries"
  ON sleep_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast user lookups ordered by sleep_start
CREATE INDEX IF NOT EXISTS idx_sleep_entries_user_start
  ON sleep_entries (user_id, sleep_start DESC);
