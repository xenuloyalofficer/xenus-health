# Health OS — Updated Implementation Plan (v2)
## Based on Current App State — Feb 9, 2026

> **What's already built**: Home dashboard, Exercise page, Body (weight only), Health (nutrition stub + meds + mood/energy), Trends (empty), Sidebar nav
> **Stack**: Next.js App Router + Supabase + Tailwind + shadcn/ui + lime/chartreuse accent
> **Deployed**: xenus-health.vercel.app

---

## IMMEDIATE PRIORITY: Fix What's Broken/Missing

### Prompt 1 — Add Body Measurements Back to Body Page

```
The Body page currently only shows the Weight section with a "Log Weight" form and trend chart placeholder.

We need to add a Body Measurements section below the weight section.

Add a "Measure" button/tab that already exists in the top-right corner — when tapped, it should scroll to or reveal the Body Measurements form below the weight section.

Body Measurements form:
- Date picker (default today)
- Two-column grid of measurement fields (all in cm, numeric inputs):
  Row 1: Neck | Chest
  Row 2: Left Arm | Right Arm
  Row 3: Waist | Hips
  Row 4: Left Thigh | Right Thigh
  Row 5: Left Calf | Right Calf
- Optional: Weight (kg) — in case they want to log weight alongside measurements
- Optional: Notes (text)
- "Save Measurements" button (lime/chartreuse, full width, matching app style)

Database: Use the body_measurements table. If it doesn't exist yet, create it:
- id (uuid, PK, default gen_random_uuid())
- user_id (uuid, FK auth.users, NOT NULL)
- measured_at (date, NOT NULL)
- neck_cm, chest_cm, left_arm_cm, right_arm_cm, waist_cm, hips_cm (numeric, nullable)
- left_thigh_cm, right_thigh_cm, left_calf_cm, right_calf_cm (numeric, nullable)
- weight_kg (numeric, nullable)
- notes (text, nullable)
- created_at (timestamptz, default now())
Add RLS: authenticated users can only CRUD their own rows.

Style: Match the existing card style on the Body page (rounded corners, light background, same spacing). Use the same lime accent for the save button.

The "Measure" pill button in the top-right should toggle/scroll to show this section.
```

### Prompt 2 — Add Sleep Section Back to Health Page

```
The Health page is missing the Sleep tracking section. It should be the FIRST section on the Health page (before Nutrition).

Sleep section requirements:

When NO active sleep session:
- Card with moon icon and "Sleep" title
- "Tap when you're heading to bed" subtitle
- Large "GOING TO SLEEP NOW" button (use a dark/indigo color to differentiate from lime — this is a nighttime action)
- Only show this button after 8pm. Before 8pm, show: "Sleep tracking available after 8pm" or show last night's sleep summary instead.

When there IS an active sleep session (sleep_start exists, sleep_end is null):
- Show elapsed time since sleep_start, updating every minute
- "Good morning! You slept for Xh Ym" message
- "I woke up now" button (lime accent, primary)
- "I woke up earlier" link that opens a time picker
- After confirming wake time: calculate duration, save sleep_end and duration_minutes to the sleep_entries table

Database: If sleep_entries table doesn't exist, create it:
- id (uuid, PK)
- user_id (uuid, FK auth.users, NOT NULL)
- sleep_start (timestamptz, NOT NULL)
- sleep_end (timestamptz, nullable)
- duration_minutes (numeric, nullable)
- quality_rating (integer, nullable, 1-5)
- notes (text, nullable)
- created_at (timestamptz, default now())
Add RLS for user isolation.

Store active sleep session ID in localStorage so it persists across app closes/refreshes.
Check for active sessions on page load.

Edge case: If sleep_start is more than 24 hours ago, prompt user: "Looks like you forgot to log waking up. When did you wake up?"
```

---

## CORE FEATURE: Food & Nutrition System

### Prompt 3 — Food Catalog Database Tables

```
Create the database tables needed for the food/nutrition tracking system.

1. food_catalog — master food database that grows as the user logs foods
   - id (uuid, PK, default gen_random_uuid())
   - user_id (uuid, FK auth.users, NOT NULL) — who added it
   - name (text, NOT NULL) — display name, e.g. "Smoked Salmon"
   - name_normalized (text, NOT NULL) — lowercase, trimmed, for search
   - source (text, NOT NULL, default 'user') — 'user' | 'usda' | 'openfoodfacts'
   - source_id (text, nullable) — external API reference
   - barcode (text, nullable) — EAN/UPC
   - default_portion_g (numeric, default 100) — typical serving
   - per_100g (jsonb, NOT NULL) — nutrition per 100g:
     {
       "calories": number,
       "protein_g": number,
       "fat_g": number,
       "carbs_g": number,
       "fiber_g": number,
       "sugar_g": number,
       "sodium_mg": number,
       "saturated_fat_g": number,
       "cholesterol_mg": number,
       "potassium_mg": number
     }
   - times_logged (integer, default 0)
   - last_logged (timestamptz, nullable)
   - created_at (timestamptz, default now())
   - updated_at (timestamptz, default now())

2. food_entries — daily food log
   - id (uuid, PK, default gen_random_uuid())
   - user_id (uuid, FK auth.users, NOT NULL)
   - food_catalog_id (uuid, FK food_catalog, NOT NULL)
   - food_name (text, NOT NULL) — denormalized for display
   - portion_g (numeric, NOT NULL)
   - meal_type (text, NOT NULL) — 'breakfast' | 'lunch' | 'dinner' | 'snack'
   - nutrition_snapshot (jsonb, NOT NULL) — portion-adjusted values
   - notes (text, nullable)
   - logged_at (timestamptz, NOT NULL, default now())
   - created_at (timestamptz, default now())

Indexes:
- food_catalog: GIN index on name_normalized for trigram search (CREATE EXTENSION IF NOT EXISTS pg_trgm)
- food_catalog: btree on (user_id, times_logged DESC)
- food_entries: btree on (user_id, logged_at DESC)
- food_entries: btree on (user_id, meal_type, logged_at DESC)

RLS: Authenticated users CRUD their own rows only.

Also create a trigger function that runs AFTER INSERT on food_entries:
- Increments times_logged on the referenced food_catalog row
- Updates last_logged to now()
- Updates the food_catalog.updated_at

Also create a database function:
get_food_suggestions(p_user_id uuid, p_query text, p_limit int default 10)
RETURNS TABLE(id uuid, name text, default_portion_g numeric, per_100g jsonb, times_logged int)
- Searches food_catalog where user_id = p_user_id AND name_normalized ILIKE '%' || lower(trim(p_query)) || '%'
- Orders by: exact match first, starts-with second, contains third
- Within each group, orders by times_logged DESC
- Limits to p_limit results

Generate the complete SQL migration.
```

### Prompt 4 — USDA Nutrition API Integration

```
Create a server-side utility for querying the USDA FoodData Central API.

File: /lib/nutrition/usda.ts (or wherever the project keeps lib utilities)

USDA API details:
- Base URL: https://api.nal.usda.gov/fdc/v1
- Requires API key from env var NEXT_PUBLIC_USDA_API_KEY or USDA_API_KEY
- Free, no rate limits for reasonable use
- Sign up at: https://fdc.nal.usda.gov/api-key-signup.html

Functions to implement:

1. searchFoods(query: string, pageSize?: number): Promise<USDAFood[]>
   - GET /foods/search?query={query}&dataType=Foundation,SR%20Legacy&pageSize={pageSize || 10}&api_key={key}
   - Returns simplified results: { fdcId, description, dataType }

2. getFoodNutrients(fdcId: number): Promise<NutritionPer100g>
   - GET /food/{fdcId}?api_key={key}
   - Parses the nutrients array and maps to our per_100g format
   - USDA nutrient number mapping:
     1008 → calories (kcal)
     1003 → protein_g
     1004 → fat_g
     1005 → carbs_g
     1079 → fiber_g
     2000 → sugar_g
     1093 → sodium_mg
     1258 → saturated_fat_g
     1253 → cholesterol_mg
     1092 → potassium_mg
   - Extract the "amount" field from each nutrient, default to 0 if not found
   - Return our standard per_100g object

3. searchAndGetNutrients(query: string): Promise<FoodCatalogInsert[]>
   - Convenience: searches, then fetches nutrients for top 5 results
   - Returns array ready to insert into food_catalog table
   - Sets source='usda', source_id=fdcId.toString()

TypeScript types for all inputs/outputs.
Simple error handling: catch and return empty arrays on API errors, log the error.
Add a Map-based cache for search results within the same server request lifecycle.
```

### Prompt 5 — Nutrition Search API Route

```
Create Next.js API routes for the food search and logging system.

Route 1: GET /api/nutrition/search?q={query}
- Gets the authenticated user from the Supabase session
- Flow:
  1. Search user's personal food_catalog using get_food_suggestions RPC
  2. If personal results < 3, also search USDA using the searchAndGetNutrients function from /lib/nutrition/usda.ts
  3. Return: { personal: FoodItem[], external: FoodItem[] }
- Each FoodItem: { id?, name, default_portion_g, per_100g, source, source_id? }

Route 2: POST /api/nutrition/save-to-catalog
- Body: { name, default_portion_g, per_100g, source, source_id? }
- Saves a food from external search to the user's food_catalog in Supabase
- Sets name_normalized = name.toLowerCase().trim()
- Returns the created food_catalog row

Route 3: POST /api/nutrition/log
- Body: { food_catalog_id, portion_g, meal_type, food_name }
- Calculates nutrition_snapshot: multiply each per_100g value by (portion_g / 100)
- Inserts into food_entries
- Returns the created entry

Route 4: GET /api/nutrition/today?meal_type={optional}
- Returns today's food_entries for the authenticated user
- Grouped by meal_type
- Includes totals: { total_calories, total_protein_g, total_fat_g, total_carbs_g }

All routes must check for authenticated Supabase session.
Follow existing API route patterns in the project.
```

### Prompt 6 — Rebuild the Nutrition UI on Health Page (or Separate Tab)

```
The Nutrition section on the Health page needs to be fully functional with food search, logging, and daily summary.

The current UI has a "Search foods..." input and shows "0 / 2000 cal" with a 0% circle. This needs to become a complete food logging interface.

Requirements:

TOP SECTION — Today's Nutrition Summary:
- Circular progress showing calories consumed vs 2000 cal target
- Below it: three small progress bars or numbers for Protein, Fat, Carbs (in grams)
- Today's logged entries grouped by meal: Breakfast, Lunch, Dinner, Snacks
- Each entry shows: food name, portion, calories
- Tap an entry to edit portion or delete
- Running total updates in real-time

SEARCH & LOG SECTION:
- Search input with magnifying glass icon (already exists)
- On typing (debounced 300ms), call GET /api/nutrition/search?q={query}
- Results appear in a dropdown/sheet:
  - "Your Foods" section — from personal catalog, sorted by frequency
  - "USDA Database" section — from external search
  - Each result shows: name, calories/100g, protein/100g
- Tapping a result:
  - If from personal catalog: opens portion input inline
  - If from USDA: first saves to catalog via POST /api/nutrition/save-to-catalog, then opens portion input

PORTION INPUT (inline expansion, not a modal):
- Shows selected food name
- Portion input in grams with +/- stepper buttons
- Quick portion buttons: "100g", "200g", "Serving" (uses default_portion_g)
- Real-time nutrition preview: as portion changes, shows calculated calories, protein, fat, carbs
- Meal type selector: Breakfast | Lunch | Dinner | Snack
  - Auto-select based on time of day:
    Before 11am → Breakfast
    11am-3pm → Lunch  
    5pm-9pm → Dinner
    Other → Snack
- "Log Food" button (lime accent)
- After logging: clear search, refresh today's summary, show brief success feedback

RECENT FOODS — horizontal scroll row below search:
- Shows last 5-8 unique foods logged (most recent first)
- Tap to quick-log with the same portion as last time (confirm with single tap)

Style: Match existing app style — lime accent buttons, rounded cards, same icon style.
Use existing Supabase client for data fetching.
```

### Prompt 7 — Manual Food Entry (No API Needed)

```
Add a "Create Custom Food" option to the nutrition search.

When searching and no results match, show a link: "+ Create custom food"
Also add a small "+" button next to the search bar for direct access.

Custom food form (slide-up sheet or inline expansion):
- Food name (text, required)
- Default portion size in grams (numeric, default 100)
- Nutrition per 100g:
  - Calories (required)
  - Protein g (required)
  - Fat g (required)
  - Carbs g (required)
  - Fiber g (optional)
  - Sugar g (optional)
  - Sodium mg (optional)
- "Save Food" button

This saves to food_catalog with source='user', then immediately opens the portion/log flow so the user can log it.

Use case: "I ate 400g smoked salmon" — first time, user searches "smoked salmon", either finds it in USDA or creates it manually with the nutrition from the package label. Every subsequent time, it appears in "Your Foods" with one tap.

Also add: when the user is on the portion entry screen for any food, show a small "Edit nutrition" link that lets them correct the per_100g values if the data was wrong. This updates the food_catalog entry.
```

---

## CHECKLIST & HOME PAGE IMPROVEMENTS

### Prompt 8 — Make Checklist Items Interactive

```
The Today's Checklist on the Home page currently shows static items (Sleep, Weight, Meds, Exercise, Food).

Make each checklist item functional:

1. Each item should show its current status:
   - Sleep: "7h 23m" or "--" if not logged
   - Weight: "70.5 kg" or "--"
   - Meds: "2/4 taken" or "--"
   - Exercise: "Treadmill 30m" or "--"
   - Food: "1,245 cal" or "--"

2. Tapping a checklist item navigates to the relevant page/section:
   - Sleep → Health page, sleep section
   - Weight → Body page
   - Meds → Health page, medications section
   - Exercise → Exercise page
   - Food → Health page, nutrition section (or separate food tab if created)

3. When an item has data logged for today, show a checkmark icon (lime green) on the right side

4. The Daily Completion bar at the bottom should calculate from actual logged data:
   - Count items that have at least one entry today
   - completion_pct = (completed_items / total_items) * 100
   - Update the progress bar width and percentage text

5. The "Today's Summary" cards (Sleep, Weight, Exercise, Calories) should also pull real data:
   - Query each table for today's entries
   - Display the values or "--" if nothing logged

6. The NEXT ACTION card should dynamically show the first uncompleted item:
   - Check what's NOT logged today
   - Priority order based on time of day:
     Morning (before noon): Sleep → Weight → Meds → Food
     Afternoon: Food → Exercise → Meds
     Evening: Food → Exercise → Meds → Sleep (if after 8pm)
   - Show the item name and "Tap to get started"
   - Tapping navigates to the right page

Use existing Supabase queries. Fetch all today's data on Home page mount with a single useEffect or React Query hook.
```

---

## EXERCISE IMPROVEMENTS

### Prompt 9 — Exercise Timer & Live Session

```
The Exercise page has Start buttons for each exercise type. Make them functional with a timer.

When user taps "Start" on any exercise:
1. Create an exercise_session in Supabase: { user_id, exercise_type, started_at: now(), ended_at: null }
2. Navigate to or reveal an exercise timer view:
   - Large digital timer counting up: MM:SS (updating every second)
   - Exercise type name and icon at top
   - Calories burned estimate (cal/min × elapsed minutes, updating live)
   - "Stop" button (red/destructive style)
   - "Add Note" optional text input

When user taps "Stop":
1. Set ended_at = now() on the session
2. Calculate duration_minutes = (ended_at - started_at) / 60000
3. Calculate calories_burned = duration_minutes × cal_per_min for this exercise type
4. Save to Supabase
5. Show a brief summary: "Great workout! 30 min treadmill, ~240 cal burned"
6. Return to exercise list

Database: exercise_sessions table (create if not exists):
- id (uuid, PK)
- user_id (uuid, FK auth.users)
- exercise_type (text, NOT NULL)
- started_at (timestamptz, NOT NULL)
- ended_at (timestamptz, nullable)
- duration_minutes (numeric, nullable)
- calories_burned (numeric, nullable)
- notes (text, nullable)
- created_at (timestamptz, default now())

Cal/min rates (store as constants):
- Treadmill: 8, Vibration Plate: 4, Walk: 4, Run: 12, Strength: 6, Bike: 8, Yoga: 3

On app load, check for any active sessions (ended_at IS NULL). If found, restore the timer.

BONUS — Persistent live session bar:
- When a session is active, show a small bar at the bottom of ALL pages (above the sidebar area on mobile):
  "[Exercise icon] Treadmill — 12:34 — Stop"
- Uses React Context to share session state across pages
- Tapping the bar navigates back to the timer view
```

---

## TRENDS PAGE

### Prompt 10 — Populate Trends Page with Charts

```
The Trends page currently shows just the 7d/14d/30d toggle and is empty.

Add these chart sections:

1. WEIGHT TREND
   - Line chart showing weight_entries over the selected period
   - 7-day moving average as a dashed overlay line
   - Y-axis: weight in kg (auto-scale to data range)
   - Empty state: "Log at least 2 weights to see your trend"

2. SLEEP DURATION
   - Bar chart showing sleep duration per night
   - Color-coded: red (<6h), yellow (6-7h), green (7-9h)
   - Average line overlay
   - Empty state: "Start tracking sleep to see patterns"

3. CALORIES & MACROS
   - Stacked bar chart: protein (blue), fat (yellow), carbs (orange) in grams per day
   - Calorie line overlay
   - 2000 cal target dashed line
   - Empty state: "Log food to track your nutrition"

4. EXERCISE ACTIVITY
   - Horizontal bar for each day showing minutes exercised
   - Color by exercise type
   - Show streak count: "Current streak: X days"
   - Empty state: "Complete your first workout to start tracking"

5. MOOD & ENERGY
   - Dual line chart: energy (yellow) and mood (green) over time
   - Scale 1-5 on Y axis
   - Empty state: "Log your mood to discover patterns"

Use recharts library (install if not present: npm install recharts).
Data source: Query each Supabase table for the selected period (7/14/30 days).
The 7d/14d/30d toggle should re-fetch data for the selected range.

Each chart should be in its own card with the same styling as other cards in the app.
Charts should be responsive (full width on mobile).
Loading state: show skeleton/shimmer while data loads.
```

---

## MOMENTUM SCORE LOGIC

### Prompt 11 — Calculate Real Momentum Score

```
The Momentum ring on the Home page currently shows 0. Make it functional.

Create a Supabase RPC function or calculate client-side:

calculate_momentum(user_id, date):
  
  Step 1 — Today's completion (40% weight):
  - Check which items are logged today: sleep, weight, meds, exercise, food, mood
  - today_pct = (logged_count / total_trackable_items) * 100
  
  Step 2 — 7-day average (40% weight):
  - For each of the last 7 days, calculate the same completion percentage
  - avg_7d = average of those percentages
  
  Step 3 — Streak bonus (20% weight):
  - Count consecutive days (going backward from yesterday) where completion_pct > 40%
  - streak_bonus = min(streak_days * 15, 100) — caps at 100 for 7+ day streaks
  
  Final score = (today_pct * 0.4) + (avg_7d * 0.4) + (streak_bonus * 0.2)
  Round to nearest integer, clamp 0-100.

Display:
- The circular ring fills proportionally (0 = empty, 100 = full)
- Ring color: gray (0-20), red (21-40), orange (41-60), yellow (61-80), lime/green (81-100)
- Number in center with "MOMENTUM" label and "of 100" subtitle (already styled this way)
- Recalculate on page load and whenever data changes

Also update the Daily Completion bar at the bottom of the checklist to show the real today_pct value.
```

---

## EXECUTION ORDER

Run these prompts in this order:

1. **Prompt 3** — Food catalog database tables (foundation for nutrition)
2. **Prompt 4** — USDA API integration
3. **Prompt 5** — Nutrition API routes
4. **Prompt 1** — Body measurements (quick win, independent)
5. **Prompt 2** — Sleep section (quick win, independent)
6. **Prompt 6** — Nutrition UI rebuild (depends on 3, 4, 5)
7. **Prompt 7** — Manual food entry (depends on 6)
8. **Prompt 8** — Checklist interactivity (depends on data from 1, 2, 6)
9. **Prompt 9** — Exercise timer (independent)
10. **Prompt 10** — Trends charts (independent, but better with data)
11. **Prompt 11** — Momentum score (depends on 8)

---

## PREPEND THIS TO EVERY PROMPT:

```
Read the existing project structure, components, and Supabase client setup before making changes.
This is a Next.js App Router project with Supabase, Tailwind CSS, and shadcn/ui.
The app uses a lime/chartreuse (#d4f505 or similar) accent color throughout.
Navigation is a vertical sidebar on the left with icon-only buttons.
Follow existing code patterns, naming conventions, TypeScript types, and file organization.
Mobile-first responsive design. Test all layouts at 375px width.
Do NOT create new Supabase client instances — use the existing client setup.
Do NOT modify the navigation/sidebar structure.
```
