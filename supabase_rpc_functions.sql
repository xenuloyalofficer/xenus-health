-- =============================================================================
-- Health OS — 3 Missing Supabase RPC Functions
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- 1. get_daily_summary(p_user_id uuid, p_date date) → jsonb
-- =============================================================================

CREATE OR REPLACE FUNCTION get_daily_summary(p_user_id uuid, p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_sleep jsonb;
  v_weight jsonb;
  v_exercise jsonb;
  v_food jsonb;
  v_meds jsonb;
  v_mood jsonb;
  v_measurements jsonb;
  v_food_entries jsonb;
  v_food_totals jsonb;
  v_completion_pct int;
  v_done int := 0;
  v_total int := 5; -- sleep, meds, exercise, food, energy (required items)
BEGIN
  -- Sleep: look for sleep ending on p_date (slept last night, woke today)
  SELECT jsonb_build_object(
    'duration_minutes', s.duration_minutes,
    'quality_rating', COALESCE(s.quality_rating, 0)
  ) INTO v_sleep
  FROM sleep_entries s
  WHERE s.user_id = p_user_id
    AND s.sleep_end::date = p_date
    AND s.duration_minutes IS NOT NULL
  ORDER BY s.sleep_end DESC
  LIMIT 1;

  -- If no sleep ending today, check sleep starting yesterday evening
  IF v_sleep IS NULL THEN
    SELECT jsonb_build_object(
      'duration_minutes', s.duration_minutes,
      'quality_rating', COALESCE(s.quality_rating, 0)
    ) INTO v_sleep
    FROM sleep_entries s
    WHERE s.user_id = p_user_id
      AND s.sleep_start::date = p_date - 1
      AND s.duration_minutes IS NOT NULL
    ORDER BY s.sleep_start DESC
    LIMIT 1;
  END IF;

  IF v_sleep IS NOT NULL THEN v_done := v_done + 1; END IF;

  -- Weight
  SELECT jsonb_build_object('weight_kg', w.weight_kg) INTO v_weight
  FROM weight_entries w
  WHERE w.user_id = p_user_id
    AND w.logged_at::date = p_date
  ORDER BY w.logged_at DESC
  LIMIT 1;

  -- Exercise sessions
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'type', e.exercise_type,
      'duration_minutes', COALESCE(e.duration_minutes, 0),
      'calories_burned', COALESCE(e.calories_burned, 0)
    )
  ), '[]'::jsonb) INTO v_exercise
  FROM exercise_sessions e
  WHERE e.user_id = p_user_id
    AND e.started_at::date = p_date
    AND e.duration_minutes IS NOT NULL;

  IF v_exercise != '[]'::jsonb THEN v_done := v_done + 1; END IF;

  -- Food entries and totals
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object('id', f.id, 'logged_at', f.logged_at)), '[]'::jsonb),
    jsonb_build_object(
      'calories', COALESCE(SUM((f.nutrition_snapshot->>'calories')::numeric), 0),
      'protein_g', COALESCE(SUM((f.nutrition_snapshot->>'protein_g')::numeric), 0),
      'fat_g', COALESCE(SUM((f.nutrition_snapshot->>'fat_g')::numeric), 0),
      'carbs_g', COALESCE(SUM((f.nutrition_snapshot->>'carbs_g')::numeric), 0)
    )
  INTO v_food_entries, v_food_totals
  FROM food_entries f
  WHERE f.user_id = p_user_id
    AND f.logged_at::date = p_date;

  IF v_food_entries IS NULL THEN v_food_entries := '[]'::jsonb; END IF;
  IF v_food_totals IS NULL THEN
    v_food_totals := '{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0}'::jsonb;
  END IF;

  v_food := jsonb_build_object('entries', v_food_entries, 'totals', v_food_totals);
  IF v_food_entries != '[]'::jsonb THEN v_done := v_done + 1; END IF;

  -- Medications logged today
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', m.medication_name,
      'status', m.status,
      'time', COALESCE(m.scheduled_time, 'unscheduled')
    )
  ), '[]'::jsonb) INTO v_meds
  FROM medication_entries m
  WHERE m.user_id = p_user_id
    AND m.logged_at::date = p_date;

  IF v_meds != '[]'::jsonb THEN v_done := v_done + 1; END IF;

  -- Mood / Energy
  SELECT jsonb_build_object(
    'energy_level', mo.energy_level,
    'mood_level', mo.mood_level
  ) INTO v_mood
  FROM mood_entries mo
  WHERE mo.user_id = p_user_id
    AND mo.logged_at::date = p_date
  ORDER BY mo.logged_at DESC
  LIMIT 1;

  IF v_mood IS NOT NULL THEN v_done := v_done + 1; END IF;

  -- Body measurements
  SELECT to_jsonb(bm.*) - 'id' - 'user_id' - 'created_at' INTO v_measurements
  FROM body_measurements bm
  WHERE bm.user_id = p_user_id
    AND bm.logged_at::date = p_date
  ORDER BY bm.logged_at DESC
  LIMIT 1;

  -- Completion percentage
  v_completion_pct := CASE WHEN v_total > 0 THEN ROUND((v_done::numeric / v_total) * 100) ELSE 0 END;

  -- Build final result
  result := jsonb_build_object(
    'sleep', v_sleep,
    'weight', v_weight,
    'exercise', v_exercise,
    'food', v_food,
    'meds', v_meds,
    'mood', v_mood,
    'measurements', v_measurements,
    'checklist', jsonb_build_object(
      'completion_pct', v_completion_pct,
      'momentum_score', v_completion_pct  -- simplified; real momentum uses 7-day history
    )
  );

  RETURN result;
END;
$$;


-- =============================================================================
-- 2. get_weekly_trends(p_user_id uuid) → jsonb
-- =============================================================================

CREATE OR REPLACE FUNCTION get_weekly_trends(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_sleep jsonb;
  v_weight jsonb;
  v_exercise jsonb;
  v_nutrition jsonb;
  v_mood jsonb;
  v_momentum jsonb;
  v_since date := CURRENT_DATE - 7;
  v_prev_avg_sleep numeric;
  v_curr_avg_sleep numeric;
  v_trend text;
BEGIN
  -- Sleep trends (last 7 days)
  SELECT
    COALESCE(AVG(s.duration_minutes), 0),
    COUNT(*)
  INTO v_curr_avg_sleep, v_sleep
  FROM sleep_entries s
  WHERE s.user_id = p_user_id
    AND s.sleep_start::date >= v_since
    AND s.duration_minutes IS NOT NULL;

  -- Previous 7 days for trend comparison
  SELECT COALESCE(AVG(s.duration_minutes), 0) INTO v_prev_avg_sleep
  FROM sleep_entries s
  WHERE s.user_id = p_user_id
    AND s.sleep_start::date >= v_since - 7
    AND s.sleep_start::date < v_since
    AND s.duration_minutes IS NOT NULL;

  v_trend := CASE
    WHEN v_prev_avg_sleep = 0 THEN 'stable'
    WHEN v_curr_avg_sleep > v_prev_avg_sleep * 1.05 THEN 'up'
    WHEN v_curr_avg_sleep < v_prev_avg_sleep * 0.95 THEN 'down'
    ELSE 'stable'
  END;

  SELECT jsonb_build_object(
    'avg_duration_minutes', ROUND(COALESCE(AVG(s.duration_minutes), 0)),
    'entries', COUNT(*)::int,
    'trend', v_trend
  ) INTO v_sleep
  FROM sleep_entries s
  WHERE s.user_id = p_user_id
    AND s.sleep_start::date >= v_since
    AND s.duration_minutes IS NOT NULL;

  -- Weight entries (raw array for sparkline)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'weight_kg', w.weight_kg,
      'logged_at', w.logged_at::date
    ) ORDER BY w.logged_at ASC
  ), '[]'::jsonb) INTO v_weight
  FROM weight_entries w
  WHERE w.user_id = p_user_id
    AND w.logged_at::date >= v_since;

  -- Exercise
  SELECT jsonb_build_object(
    'sessions_count', COUNT(*)::int,
    'active_days', COUNT(DISTINCT e.started_at::date)::int
  ) INTO v_exercise
  FROM exercise_sessions e
  WHERE e.user_id = p_user_id
    AND e.started_at::date >= v_since
    AND e.duration_minutes IS NOT NULL;

  -- Nutrition averages (aggregate food_entries by day, then average)
  WITH daily_totals AS (
    SELECT
      f.logged_at::date AS day,
      SUM((f.nutrition_snapshot->>'calories')::numeric) AS calories,
      SUM((f.nutrition_snapshot->>'protein_g')::numeric) AS protein_g
    FROM food_entries f
    WHERE f.user_id = p_user_id
      AND f.logged_at::date >= v_since
    GROUP BY f.logged_at::date
  )
  SELECT jsonb_build_object(
    'avg_calories', ROUND(COALESCE(AVG(calories), 0)),
    'avg_protein_g', ROUND(COALESCE(AVG(protein_g), 0))
  ) INTO v_nutrition
  FROM daily_totals;

  -- Mood averages
  SELECT jsonb_build_object(
    'avg_energy', ROUND(COALESCE(AVG(mo.energy_level), 0)::numeric, 1),
    'avg_mood', ROUND(COALESCE(AVG(mo.mood_level), 0)::numeric, 1)
  ) INTO v_mood
  FROM mood_entries mo
  WHERE mo.user_id = p_user_id
    AND mo.logged_at::date >= v_since;

  -- Momentum: per-day completion scores for the last 7 days
  -- For each day, check what fraction of key items were logged
  WITH date_series AS (
    SELECT generate_series(v_since, CURRENT_DATE, '1 day'::interval)::date AS d
  ),
  daily_scores AS (
    SELECT
      ds.d AS date,
      (
        -- sleep logged?
        CASE WHEN EXISTS (
          SELECT 1 FROM sleep_entries s
          WHERE s.user_id = p_user_id
            AND (s.sleep_end::date = ds.d OR (s.sleep_start::date = ds.d - 1 AND s.duration_minutes IS NOT NULL))
        ) THEN 1 ELSE 0 END
        +
        -- exercise logged?
        CASE WHEN EXISTS (
          SELECT 1 FROM exercise_sessions e
          WHERE e.user_id = p_user_id AND e.started_at::date = ds.d AND e.duration_minutes IS NOT NULL
        ) THEN 1 ELSE 0 END
        +
        -- food logged?
        CASE WHEN EXISTS (
          SELECT 1 FROM food_entries f
          WHERE f.user_id = p_user_id AND f.logged_at::date = ds.d
        ) THEN 1 ELSE 0 END
        +
        -- meds logged?
        CASE WHEN EXISTS (
          SELECT 1 FROM medication_entries m
          WHERE m.user_id = p_user_id AND m.logged_at::date = ds.d
        ) THEN 1 ELSE 0 END
        +
        -- mood logged?
        CASE WHEN EXISTS (
          SELECT 1 FROM mood_entries mo
          WHERE mo.user_id = p_user_id AND mo.logged_at::date = ds.d
        ) THEN 1 ELSE 0 END
      )::numeric / 5 * 100 AS momentum_score
    FROM date_series ds
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('date', dsc.date, 'momentum_score', ROUND(dsc.momentum_score))
    ORDER BY dsc.date ASC
  ), '[]'::jsonb) INTO v_momentum
  FROM daily_scores dsc;

  -- Build final result
  result := jsonb_build_object(
    'sleep', v_sleep,
    'weight', v_weight,
    'exercise', v_exercise,
    'nutrition', v_nutrition,
    'mood', v_mood,
    'momentum', v_momentum
  );

  RETURN result;
END;
$$;


-- =============================================================================
-- 3. get_food_suggestions(p_user_id uuid, p_query text, p_limit int) → table
-- =============================================================================

CREATE OR REPLACE FUNCTION get_food_suggestions(
  p_user_id uuid,
  p_query text,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  default_portion_g numeric,
  per_100g jsonb,
  times_logged int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query_lower text := LOWER(TRIM(p_query));
BEGIN
  RETURN QUERY
  SELECT
    fc.id,
    fc.name,
    fc.default_portion_g,
    fc.per_100g,
    COALESCE(fc.times_logged, 0)::int AS times_logged
  FROM food_catalog fc
  WHERE fc.user_id = p_user_id
    AND (
      fc.name_normalized ILIKE '%' || v_query_lower || '%'
      OR fc.name ILIKE '%' || p_query || '%'
    )
  ORDER BY
    -- Exact match first
    CASE WHEN fc.name_normalized = v_query_lower THEN 0
    -- Starts with query second
    WHEN fc.name_normalized LIKE v_query_lower || '%' THEN 1
    -- Contains query third
    ELSE 2
    END,
    -- Within each group, most frequently logged first
    COALESCE(fc.times_logged, 0) DESC,
    fc.name ASC
  LIMIT p_limit;
END;
$$;


-- =============================================================================
-- Grant execute permissions to authenticated users
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_daily_summary(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_trends(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_food_suggestions(uuid, text, int) TO authenticated;


-- =============================================================================
-- 4. water_entries table
-- =============================================================================

CREATE TABLE IF NOT EXISTS water_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount_ml integer NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_entries_user_logged
  ON water_entries (user_id, logged_at DESC);

ALTER TABLE water_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own water entries"
  ON water_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water entries"
  ON water_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own water entries"
  ON water_entries FOR DELETE
  USING (auth.uid() = user_id);
