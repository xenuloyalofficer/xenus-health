-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. food_catalog — master food database per user
-- ============================================================
CREATE TABLE IF NOT EXISTS food_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  name_normalized text NOT NULL,
  source text NOT NULL DEFAULT 'user',           -- 'user' | 'usda' | 'openfoodfacts'
  source_id text,                                 -- external API reference
  barcode text,                                   -- EAN/UPC
  default_portion_g numeric DEFAULT 100,          -- typical serving
  per_100g jsonb NOT NULL,                        -- nutrition per 100g
  times_logged integer DEFAULT 0,
  last_logged timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE food_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own food catalog"
  ON food_catalog FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own food catalog"
  ON food_catalog FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food catalog"
  ON food_catalog FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food catalog"
  ON food_catalog FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_food_catalog_name_trgm
  ON food_catalog USING gin (name_normalized gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_food_catalog_user_frequency
  ON food_catalog (user_id, times_logged DESC);

-- ============================================================
-- 2. food_entries — daily food log
-- ============================================================
CREATE TABLE IF NOT EXISTS food_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  food_catalog_id uuid REFERENCES food_catalog(id) NOT NULL,
  food_name text NOT NULL,                        -- denormalized for display
  portion_g numeric NOT NULL,
  meal_type text,                                 -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  nutrition_snapshot jsonb NOT NULL,              -- portion-adjusted values
  notes text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own food entries"
  ON food_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food entries"
  ON food_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food entries"
  ON food_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food entries"
  ON food_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_food_entries_user_logged
  ON food_entries (user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_food_entries_user_meal_logged
  ON food_entries (user_id, meal_type, logged_at DESC);

-- ============================================================
-- 3. Trigger: AFTER INSERT on food_entries
--    Increments times_logged, updates last_logged and updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION fn_food_entry_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE food_catalog
  SET
    times_logged = times_logged + 1,
    last_logged = now(),
    updated_at = now()
  WHERE id = NEW.food_catalog_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_food_entry_after_insert ON food_entries;
CREATE TRIGGER trg_food_entry_after_insert
  AFTER INSERT ON food_entries
  FOR EACH ROW
  EXECUTE FUNCTION fn_food_entry_after_insert();

-- ============================================================
-- 4. RPC: get_food_suggestions
--    Searches user's food_catalog with smart ordering:
--    exact match → starts-with → contains, each sorted by frequency
-- ============================================================
CREATE OR REPLACE FUNCTION get_food_suggestions(
  p_user_id uuid,
  p_query text,
  p_limit int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  name text,
  default_portion_g numeric,
  per_100g jsonb,
  times_logged int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_query text := lower(trim(p_query));
BEGIN
  RETURN QUERY
  SELECT
    fc.id,
    fc.name,
    fc.default_portion_g,
    fc.per_100g,
    fc.times_logged
  FROM food_catalog fc
  WHERE fc.user_id = p_user_id
    AND fc.name_normalized ILIKE '%' || v_query || '%'
  ORDER BY
    -- Exact match first
    CASE WHEN fc.name_normalized = v_query THEN 0
    -- Starts with second
         WHEN fc.name_normalized LIKE v_query || '%' THEN 1
    -- Contains third
         ELSE 2
    END,
    -- Within each group, most frequently logged first
    fc.times_logged DESC
  LIMIT p_limit;
END;
$$;
