# Blood Work / Lab Results Tracking — Done (Prompt 12 Execution)

## What Was Built

Full blood work tracking feature: database tables, seed data with 3 historical panels, API routes, Health Coach integration, and a complete UI with marker history charts.

## Files Created

### Database Migrations
- **`supabase/migrations/20260209140000_create_blood_work_tables.sql`**
  - `blood_work_marker_presets` — Global preset markers with reference ranges (no RLS, shared across all users)
  - `blood_work_panels` — Per-user lab panels with test_date, lab_name, notes (RLS 4-policy)
  - `blood_work_results` — Individual marker values per panel with auto-computed flags (RLS 4-policy, CASCADE delete)
  - Indexes on `(user_id, test_date DESC)`, `(panel_id)`, `(user_id, marker_name, created_at DESC)`
  - Seeded **27 marker presets** across 6 categories:
    - Lipid Panel (5): Total Cholesterol, HDL, LDL, Triglycerides, Chol/HDL Ratio
    - Metabolic (4): Glucose (Fasting), HbA1c, Creatinine, Uric Acid
    - Liver (5): AST (GOT), ALT (GPT), GGT, Bilirubin (Total), Alkaline Phosphatase
    - Blood Count (5): Hemoglobin, Hematocrit, WBC, Platelets, RBC
    - Thyroid (3): TSH, Free T4, Free T3
    - Other (4): Vitamin D, B12, Iron, Ferritin

- **`supabase/migrations/20260209140001_seed_blood_work_history.sql`**
  - Pre-loads 3 historical panels via `DO $$` block (auto-detects first user):
    - Panel 1 (2024-06-15): Chol 302, HDL 36, LDL 206, Trig 470, Glucose 94, AST 46, ALT 108
    - Panel 2 (2024-12-10): Chol 302, Trig 470, Glucose 102
    - Panel 3 (2025-06-20): Chol 366, HDL 36, LDL 189, Trig 406, Ratio 10.2, Glucose 110, AST 30, ALT 75
  - Flags computed automatically (high/low/null)

### API Routes
- **`src/app/api/blood-work/route.ts`** — GET (list panels + results), POST (create panel + results), PATCH (update panel), DELETE (cascade results)
- **`src/app/api/blood-work/presets/route.ts`** — GET (list all marker presets, ordered by category + sort_order)

### UI Component
- **`src/components/blood-work/blood-work-section.tsx`** — Full-featured blood work section:
  - Panel list with flagged marker counts and tap-to-detail
  - Latest panel summary card with Normal/Flagged counts + quick-tap flagged badges
  - Marker history chart (recharts LineChart) with ReferenceLine for ref range boundaries
  - Panel detail dialog with results grouped by category, color-coded status (green/orange/red)
  - Add panel dialog with category tabs, large number inputs, marker presets with ref ranges shown
  - Loading skeletons and empty state

### Modified Files
- **`src/components/tabs/health-tab.tsx`** — Added `<BloodWorkSection />` between Medications and Energy/Mood
- **`src/app/api/coach/insights/route.ts`** — Added blood work insights:
  - Fetches latest 2 panels with results
  - Generates "blood work flags" warning for out-of-range markers
  - Generates "improving" / "worsening" insights comparing latest vs previous panel

## Health Coach Queries
```
GET /rest/v1/blood_work_panels?select=*,blood_work_results(*)&order=test_date.desc
GET /rest/v1/blood_work_panels?select=*,blood_work_results(*)&order=test_date.desc&limit=1
GET /rest/v1/blood_work_results?marker_name=eq.MARKER&select=value,unit,created_at,blood_work_panels(test_date)&order=created_at.asc
```

## Build Status
Next.js build passes with no errors.

## Action Required
Run the two SQL migrations in Supabase SQL Editor:
1. `20260209140000_create_blood_work_tables.sql` (tables + presets)
2. `20260209140001_seed_blood_work_history.sql` (historical data)

---

# Food Catalog Database Tables — Done (Prompt 3 Execution)

## Migration Created
**File:** `supabase/migrations/20260209130000_create_food_catalog_and_entries.sql`

### Tables
1. **food_catalog** — Master food database per user
   - Columns: id, user_id, name, name_normalized, source, source_id, barcode, default_portion_g, per_100g (jsonb), times_logged, last_logged, created_at, updated_at
   - RLS: SELECT, INSERT, UPDATE, DELETE scoped to `auth.uid() = user_id`

2. **food_entries** — Daily food log
   - Columns: id, user_id, food_catalog_id (FK), food_name, portion_g, meal_type, nutrition_snapshot (jsonb), notes, logged_at, created_at
   - RLS: SELECT, INSERT, UPDATE, DELETE scoped to `auth.uid() = user_id`

### Indexes
- `food_catalog`: GIN trigram index on `name_normalized` (requires `pg_trgm` extension)
- `food_catalog`: btree on `(user_id, times_logged DESC)` for frequency sorting
- `food_entries`: btree on `(user_id, logged_at DESC)` for recent entries
- `food_entries`: btree on `(user_id, meal_type, logged_at DESC)` for meal filtering

### Trigger Function
- `fn_food_entry_after_insert()` — AFTER INSERT on food_entries:
  - Increments `times_logged` on the referenced food_catalog row
  - Sets `last_logged = now()`
  - Sets `updated_at = now()`

### RPC Function
- `get_food_suggestions(p_user_id, p_query, p_limit)` — Smart search:
  - Searches `name_normalized ILIKE '%query%'`
  - Orders: exact match → starts-with → contains
  - Within each group: `times_logged DESC`
  - Returns: id, name, default_portion_g, per_100g, times_logged

### Action Required
Run the SQL migration in Supabase SQL Editor.

---

# USDA Nutrition API Integration — Already Built (Prompt 4 — No Changes Needed)

The USDA integration was already fully implemented:
- `src/lib/nutrition/usda.ts` — `searchFoods()`, `getFoodDetails()`, `mapUSDAToFoodCatalog()`, Map-based cache
- `src/lib/nutrition/openfoodfacts.ts` — Bonus: OpenFoodFacts integration (barcode + name search)
- `src/lib/nutrition/types.ts` — `NutritionPer100g`, `FoodCatalogInsert`, `calculateNutritionSnapshot()`
- `src/app/api/nutrition/search/route.ts` — Searches personal catalog (RPC) → USDA → OpenFoodFacts
- `src/app/api/nutrition/log/route.ts` — Logs food entry with calculated nutrition snapshot
- `src/app/api/nutrition/save/route.ts` — Saves external food to user's catalog (deduplicates by source_id)

---

# Sleep API Route — Done

## File Created
`src/app/api/sleep/route.ts`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sleep?limit=30&offset=0&from=&to=` | List sleep entries (paginated, filterable by date range) |
| `POST` | `/api/sleep` | Create a sleep entry |
| `PATCH` | `/api/sleep` | Update a sleep entry (pass `id` in body) |
| `DELETE` | `/api/sleep?id=<uuid>` | Delete a sleep entry |

## Database Columns Used
`id`, `user_id`, `bedtime` (timestamptz), `wake_time` (timestamptz), `quality` (int 1-5), `notes` (text), `sleep_date` (date), `created_at` (timestamptz)

## Key Decisions
- **Auth:** Uses `supabase.auth.getUser()` from server client (cookie-based session). Returns 401 if not authenticated.
- **Validation:** Zod v4 (`zod/v4`) for request body validation. ISO datetime for bedtime/wake_time, ISO date for sleep_date.
- **sleep_date default:** If `sleep_date` is not provided on POST, it defaults to the date portion of `bedtime`.
- **RLS:** All queries include `.eq("user_id", userId)` as defense-in-depth alongside Supabase RLS policies.
- **Pagination:** GET supports `limit` (1-100, default 30), `offset` (default 0), returns `count` via Supabase exact count.
- **Date filtering:** GET supports optional `from` and `to` query params to filter by `sleep_date` range.
- **Pattern:** Follows existing `/api/healthz` pattern — uses `createClientServer()`, `NextResponse.json()`, try/catch error handling.

---

# UI Restructure — Tab Navigation — Done

## Navigation Structure

### Layout
- **Desktop (md+):** Sticky top nav bar with icon+label buttons for each tab
- **Mobile (<md):** Fixed bottom nav bar with icon+label, content area has bottom padding to avoid overlap
- All tabs rendered simultaneously (hidden when inactive) to preserve timer state across tab switches

### Tabs
| Tab | Content |
|-----|---------|
| **Home** | Greeting, Momentum score, Today's Checklist (status indicators linking to tabs), Next Treadmill card, Trends, Insights |
| **Exercise** | Exercise type grid with START/STOP timers, active timer banner, completed sessions, manual entry dialog |
| **Body** | Weight quick-add + trend placeholder, full body measurements grid form |
| **Health** | Sleep state machine (inline), Medications, Food, Energy/Mood — all as inline card forms |

### Key Architecture Decisions
- **Single-page tab navigation** (client-side state) instead of Next.js file-based routing — feels more app-like
- **All tabs always mounted** (`hidden` class toggle, not conditional render) — preserves exercise timer state when switching tabs
- **Exercise timer persisted in localStorage** (`health-os-exercise-timer`) — survives page refresh
- **Sleep state persisted in localStorage** (`health-os-sleep-tracking`) — unchanged from previous
- `/dashboard` now redirects to `/` (backward compat)

## Files Created
- `src/components/layout/app-shell.tsx` — Main shell with responsive nav (bottom mobile, top desktop)
- `src/components/tabs/home-tab.tsx` — Home dashboard tab
- `src/components/tabs/exercise-tab.tsx` — Exercise tracking with live timers
- `src/components/tabs/body-tab.tsx` — Weight + body measurements
- `src/components/tabs/health-tab.tsx` — Sleep, meds, food, energy/mood

## Files Modified
- `src/app/page.tsx` — Now renders AppShell (was redirect to /dashboard)
- `src/app/dashboard/page.tsx` — Now redirects to / (was the main dashboard)
- `src/app/layout.tsx` — Updated metadata title to "Health OS"

## Preserved (unchanged)
- All API routes (`/api/sleep`, `/api/weight`, `/api/exercise`, `/api/food`, `/api/energy`, `/api/medication`, `/api/measurements`)
- `src/components/dashboard/trends-snapshot.tsx` — Reused in Home tab
- `src/components/dashboard/insights-preview.tsx` — Reused in Home tab
- `src/components/forms/quick-add-dialog.tsx` — Still available but no longer primary entry point
- All shadcn/ui components

## Exercise Tab Features
- 7 exercise types: Treadmill, Vibration Plate, Walk, Run, Strength, Bike, Yoga
- One-tap START on any type starts a live timer
- Timer shown both on the active card and in a prominent banner at top
- STOP button auto-POSTs to `/api/exercise` with calculated duration
- Other exercise types disabled while one is active
- Timer state persisted in localStorage (survives refresh)
- Manual entry dialog for logging past exercises
- Completed sessions list shows today's logged exercises

## Health Tab Features
- Sleep: Full state machine (none -> sleeping -> woke) with quality rating, inline in card
- Medications: Inline form with name, status (taken/skipped/late), date
- Food: Inline form with description, optional calories, date
- Energy/Mood: Inline form with energy (1-10), mood (1-10), notes, date

---

# Previous Feature Log

_(Earlier entries preserved below for reference)_

---

# Sleep Form → API Connection — Done

## Files Modified
- `src/components/forms/quick-add-dialog.tsx` — Wired sleep form to `POST /api/sleep`
- `src/app/layout.tsx` — Added `<Toaster />` for toast notifications
- `src/components/ui/sonner.tsx` — Added via `shadcn add sonner`

## What Changed
- Sleep form inputs now have controlled state (`bedtime`, `wakeTime`, `quality`)
- On submit, the form calls `POST /api/sleep` with ISO-formatted datetime values
- Success: shows "Sleep entry saved" toast, resets form, closes dialog
- Error: shows error message from API (or generic fallback) in error toast
- Client-side validation: requires bedtime and wake time before submitting
- Added `sonner` package and `<Toaster />` to root layout for toast rendering

---

# Weight API Route — Done

## File Created
`src/app/api/weight/route.ts`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/weight` | Create a weight entry |

## Request Body (POST)
```json
{
  "date": "2025-01-15",
  "weight_kg": 70.5,
  "notes": "Optional note"
}
```

## Database Columns Used
`id`, `user_id`, `date` (date), `weight_kg` (numeric), `notes` (text), `created_at` (timestamptz)

---

# Exercise API Route — Done

## File Created
`src/app/api/exercise/route.ts`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/exercise` | Create an exercise entry |

## Request Body (POST)
```json
{
  "date": "2026-02-08",
  "duration_minutes": 30,
  "exercise_type": "Treadmill",
  "distance_km": 2.5,
  "calories_burned": 200,
  "notes": "Felt great"
}
```

Required: `date`, `duration_minutes`, `exercise_type`
Optional: `distance_km`, `calories_burned`, `notes`

---

# Medication API Route — Done

## File Created
`src/app/api/medication/route.ts`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/medication` | Create a medication entry |

---

# Food API Route — Done

## File Created
`src/app/api/food/route.ts`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/food` | Create a food entry |

---

# Energy API Route — Done

## File Created
`src/app/api/energy/route.ts`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/energy` | Create an energy entry |

---

# Sleep Section — Done (Prompt 2 Execution)

## What Changed (Prompt 2)

### Database Migration Created
**File:** `supabase/migrations/20260209120000_create_sleep_entries.sql`
- `sleep_entries` table: id, user_id, sleep_start (timestamptz), sleep_end, duration_minutes, quality_rating (1-5), notes, created_at
- RLS policies: SELECT, INSERT, UPDATE, DELETE — all scoped to `auth.uid() = user_id`
- Index on `(user_id, sleep_start DESC)`

### Sleep Card Enhancements (`src/components/tabs/health-tab.tsx`)

**Sleep card is now always visible** (was hidden before 8pm when no active session):
- **Before 8pm, no session:** Shows last night's sleep summary (duration, times, quality stars) + "Sleep tracking available after 8pm" note
- **After 8pm, no session:** Shows "GOING TO SLEEP NOW" button in **indigo/dark** color (was lime — plan specifies dark to differentiate as nighttime action)
- **Active session (sleeping):** Elapsed time ticks every minute via `setInterval`. Shows "I WOKE UP NOW" (lime) + "I woke up earlier" link
- **"I woke up earlier" flow:** Expands inline time picker → user picks wake time → calculates duration → PATCHes the API → saves
- **Woke state (rating):** "Good morning! You slept for Xh Ym" + star quality rating + "Complete Sleep Log" button + "I actually woke up earlier" link
- **>24h stale session:** Yellow warning banner: "Looks like you forgot to log waking up. When did you wake up?"
- **Star rating bug fixed:** Was showing stars incorrectly (`val >= sleepQuality`), now correct (`val <= sleepQuality`)

### Already Existed (No Changes Needed)
- Sleep API route (`/api/sleep`) with GET, POST, PATCH, DELETE
- localStorage persistence (`health-os-sleep-tracking`)
- `shouldShowSleepButton()` time-awareness helper (shows after 8pm / before 5am)
- Sleep state machine (none → sleeping → woke)

### Files Changed
| File | Change |
|------|--------|
| `supabase/migrations/20260209120000_create_sleep_entries.sql` | NEW: table + RLS + index |
| `src/components/tabs/health-tab.tsx` | Enhanced sleep card: indigo button, woke-up-earlier, 24h edge case, last-night summary, elapsed ticker |

### Build Status
Next.js build passes with no errors.

### Action Required
Run the SQL migration in Supabase SQL Editor (Dashboard → SQL Editor → New Query).

---

# Body Measurements Feature — Done (Updated: Prompt 1 Execution)

## What Changed (Prompt 1)

### Database Migration Fixed
- **Table renamed:** `body_measurement_entry` → `body_measurements` (matches API route)
- **Column renamed:** `measurement_date` → `measured_at` (matches API route)
- **RLS policies:** Added per-operation policies (SELECT, INSERT, UPDATE, DELETE) scoped to `auth.uid() = user_id`
- **Index added:** `(user_id, measured_at DESC)` for fast lookups

### Body Tab UI Updated (`src/components/tabs/body-tab.tsx`)
- **Added missing calf fields:** L. Calf and R. Calf inputs in the measurement form
- **Added optional weight field:** Weight (kg) input below the measurement grid
- **Reordered fields:** Neck|Chest → L.Arm|R.Arm → Waist|Hips → L.Thigh|R.Thigh → L.Calf|R.Calf
- **Scroll-to-form:** "Measure" button now scrolls smoothly to the form when opened
- **Auto-refresh:** Measurement history refreshes after saving (no page reload needed)

### Already Existed (No Changes Needed)
- API route `/api/measurements` (GET + POST) with Zod validation
- Measurements summary card with expand/collapse
- Measurement history timeline
- Calf fields in expanded summary view

### Files Modified
| File | Change |
|------|--------|
| `supabase/migrations/20260208120000_create_body_measurement_entry.sql` | Rewrote: correct table name, columns, RLS, index |
| `src/components/tabs/body-tab.tsx` | Added calf fields, weight field, scroll behavior, auto-refresh |

### Build Status
Next.js build passes with no errors.

### Action Required
Run the SQL migration in Supabase SQL Editor (Dashboard → SQL Editor → New Query).
