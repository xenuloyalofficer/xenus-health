# Blood Work Migration Push — Done

## Problem
`supabase db push` said "Remote database is up to date" but the `blood_work_marker_presets` table didn't exist remotely. The 3 blood work migration files were never being picked up.

## Root Cause
**Two `supabase/` directories existed:**
- `/home/mj/projects/xenus-health/supabase/migrations/` — where the CLI actually looks (4 migrations)
- `/home/mj/projects/xenus-health/my-app/supabase/migrations/` — where the blood work files were stored

The Supabase CLI walks up from `my-app/` to find `supabase/config.toml` at the parent level (`/home/mj/projects/xenus-health/`), so it uses that directory's `supabase/migrations/`. The files in `my-app/supabase/migrations/` were invisible to the CLI.

## Fix
Copied the 3 migration files to the correct location:
```
cp my-app/supabase/migrations/20260209140000_create_blood_work_tables.sql ../supabase/migrations/
cp my-app/supabase/migrations/20260209140001_seed_blood_work_history.sql ../supabase/migrations/
cp my-app/supabase/migrations/20260209150000_update_female_reference_ranges.sql ../supabase/migrations/
```

Then ran `supabase db push` — all 3 applied successfully.

## Verification
- `supabase inspect db table-sizes` confirms all 3 tables exist: `blood_work_marker_presets`, `blood_work_panels`, `blood_work_results`
- REST API query confirms **26 marker presets** across 6 categories with correct female reference ranges:
  - Hemoglobin: 12.0–16.0 g/dL
  - Hematocrit: 36.1–44.3%
  - Creatinine: 0.6–1.1 mg/dL
  - Red Blood Cells: 4.0–5.0 x10⁶/µL
  - Iron: 50–170 µg/dL
  - Ferritin: 12–150 ng/mL

## Note
Seed data (3 historical panels) was skipped because no users exist in the remote DB yet. The `DO $$` block gracefully handles this with `RAISE NOTICE 'No users found — skipping blood work seed data'`. The seed will need to be re-run after a user signs up, or historical data can be entered via the UI.
