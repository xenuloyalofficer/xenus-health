# Health OS — Implementation Plan

## CLI-Ready Prompts for Claude Code

> **Tech Stack**: Next.js (App Router) + Supabase + Tailwind CSS + shadcn/ui
> **Target**: Mobile-first PWA
> **AI Coach Layer**: Claude via OpenClaw (separate concern — reads Supabase data)

---

## Phase 0: Database Foundation
*Get the data layer right before touching any UI.*

### Step 0.1 — Food Catalog & Nutrition Tables

```
Create Supabase database tables for a food/nutrition tracking system. Tables needed:

1. `food_catalog` — master food database that grows as the user logs foods
   - id (uuid, PK)
   - name (text, NOT NULL) — e.g., "Smoked Salmon", "Burrata"
   - name_normalized (text) — lowercase, no accents, for search
   - source (text) — 'user' | 'usda' | 'openfoodfacts'
   - source_id (text, nullable) — external API reference ID
   - barcode (text, nullable) — EAN/UPC for packaged products
   - default_portion_g (numeric) — typical serving size in grams
   - per_100g (jsonb, NOT NULL) — nutrition data per 100g:
     { calories: number, protein_g: number, fat_g: number, carbs_g: number,
       fiber_g: number, sugar_g: number, sodium_mg: number, saturated_fat_g: number,
       cholesterol_mg: number, potassium_mg: number,
       vitamins: { a_ug, c_mg, d_ug, e_mg, k_ug, b1_mg, b2_mg, b3_mg, b6_mg, b12_ug, folate_ug },
       minerals: { calcium_mg, iron_mg, magnesium_mg, zinc_mg, phosphorus_mg, selenium_ug } }
   - times_logged (integer, default 0) — frequency counter for smart sorting
   - last_logged (timestamptz, nullable)
   - user_id (uuid, FK to auth.users) — who added it
   - created_at, updated_at (timestamptz)

2. `food_entries` — daily food log
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, NOT NULL)
   - food_catalog_id (uuid, FK to food_catalog, NOT NULL)
   - food_name (text) — denormalized for quick display
   - portion_g (numeric, NOT NULL)
   - meal_type (text) — 'breakfast' | 'lunch' | 'dinner' | 'snack'
   - nutrition_snapshot (jsonb) — calculated nutrition for this specific entry (portion-adjusted)
   - notes (text, nullable)
   - logged_at (timestamptz, NOT NULL, default now())
   - created_at (timestamptz)

3. `exercise_sessions` — exercise log with timer support
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, NOT NULL)
   - exercise_type (text, NOT NULL) — 'treadmill' | 'vibration_plate' | 'walk' | 'run' | 'strength' | 'bike' | 'yoga'
   - started_at (timestamptz, NOT NULL)
   - ended_at (timestamptz, nullable) — null means session is live
   - duration_minutes (numeric, nullable) — calculated on end, or manual entry
   - notes (text, nullable)
   - calories_burned (numeric, nullable)
   - created_at (timestamptz)

4. `sleep_entries` — sleep tracking
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, NOT NULL)
   - sleep_start (timestamptz, NOT NULL) — when they pressed "going to sleep"
   - sleep_end (timestamptz, nullable) — when they woke up
   - duration_minutes (numeric, nullable) — calculated
   - quality_rating (integer, nullable) — 1-5 morning rating
   - notes (text, nullable)
   - created_at (timestamptz)

5. `medication_entries` — medication tracking
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, NOT NULL)
   - medication_name (text, NOT NULL)
   - status (text, NOT NULL) — 'taken' | 'skipped' | 'late'
   - scheduled_time (text, nullable) — 'morning' | 'afternoon' | 'evening' | 'night'
   - logged_at (timestamptz, NOT NULL, default now())
   - notes (text, nullable)
   - created_at (timestamptz)

6. `medication_presets` — saved medications for quick logging
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, NOT NULL)
   - medication_name (text, NOT NULL)
   - schedule (text[]) — e.g., ['morning', 'evening']
   - dosage (text, nullable) — e.g., "500mg"
   - active (boolean, default true)
   - created_at (timestamptz)

7. `mood_entries` — energy and mood tracking
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, NOT NULL)
   - energy_level (integer, NOT NULL) — 1-5
   - mood_level (integer, NOT NULL) — 1-5
   - notes (text, nullable)
   - logged_at (timestamptz, NOT NULL, default now())
   - created_at (timestamptz)

8. `weight_entries` — weight tracking
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, NOT NULL)
   - weight_kg (numeric, NOT NULL)
   - logged_at (date, NOT NULL)
   - created_at (timestamptz)

9. `body_measurements` — body measurements
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, NOT NULL)
   - measured_at (date, NOT NULL)
   - neck_cm, chest_cm, left_arm_cm, right_arm_cm (numeric, nullable)
   - waist_cm, hips_cm (numeric, nullable)
   - left_thigh_cm, right_thigh_cm (numeric, nullable)
   - left_calf_cm, right_calf_cm (numeric, nullable)
   - weight_kg (numeric, nullable)
   - notes (text, nullable)
   - created_at (timestamptz)

10. `daily_checklist` — daily completion tracking
    - id (uuid, PK)
    - user_id (uuid, FK to auth.users, NOT NULL)
    - date (date, NOT NULL)
    - checklist_data (jsonb) — { sleep: bool, weight: bool, meds: bool, exercise: bool, food: bool, mood: bool, measurements: bool }
    - completion_pct (numeric) — 0-100, calculated
    - momentum_score (numeric, nullable) — 0-100, calculated
    - created_at, updated_at (timestamptz)
    - UNIQUE(user_id, date)

Add appropriate indexes:
- food_catalog: GIN index on name_normalized for text search, index on (user_id, times_logged DESC)
- food_entries: index on (user_id, logged_at DESC)
- exercise_sessions: index on (user_id, started_at DESC)
- All tables: index on user_id

Set up RLS policies: authenticated users can only CRUD their own rows.

Generate the complete SQL migration file.
```

### Step 0.2 — Supabase Database Functions

```
Create Supabase database functions for the Health OS app:

1. `calculate_momentum_score(p_user_id uuid, p_date date)` returns numeric
   - Looks at the daily_checklist for the given date (today's completion * 0.4)
   - Plus the average completion_pct over the last 7 days (* 0.4)
   - Plus a streak bonus (* 0.2): consecutive days with completion_pct > 50%, max bonus at 7+ days
   - Returns a score 0-100
   - This should be callable via RPC

2. `get_food_suggestions(p_user_id uuid, p_query text, p_limit integer default 10)` returns table
   - Searches food_catalog where name_normalized ILIKE the query
   - Orders by: exact match first, then starts-with, then contains
   - Within each group, orders by times_logged DESC (most frequently used first)
   - Only returns foods added by this user OR source != 'user'
   - Returns: id, name, default_portion_g, per_100g, times_logged

3. `get_daily_summary(p_user_id uuid, p_date date)` returns jsonb
   - Aggregates all data for a given date into a single JSON object:
   { sleep: { duration_minutes, quality_rating } or null,
     weight: { weight_kg } or null,
     exercise: [{ type, duration_minutes, calories_burned }],
     food: { entries: [...], totals: { calories, protein_g, fat_g, carbs_g } },
     meds: [{ name, status, time }],
     mood: { energy_level, mood_level } or null,
     measurements: {...} or null,
     checklist: { completion_pct, momentum_score } }

4. `get_weekly_trends(p_user_id uuid)` returns jsonb
   - Returns 7-day trends for:
   - avg sleep duration, trend direction
   - weight entries array for chart
   - exercise count and streak
   - avg calories, avg protein
   - avg energy and mood levels
   - momentum score trend

5. `increment_food_logged(p_food_catalog_id uuid)` — trigger function
   - After INSERT on food_entries, increments times_logged and updates last_logged on the referenced food_catalog row

Create all functions with SECURITY DEFINER where appropriate, and set up the trigger for increment_food_logged.
```

---

## Phase 1: Food & Nutrition Engine
*The hardest UX problem. Solve it first.*

### Step 1.1 — USDA API Integration Service

```
Create a server-side utility module at /lib/nutrition/usda.ts for querying the USDA FoodData Central API.

Requirements:
- Base URL: https://api.nal.usda.gov/fdc/v1
- The API is free and requires an API key (store in env var USDA_API_KEY)
- Implement these functions:

1. searchFoods(query: string, pageSize: number = 10): Promise<USDASearchResult[]>
   - Endpoint: /foods/search
   - Parameters: query, dataType=["Foundation","SR Legacy"], pageSize
   - Returns array of: { fdcId, description, dataType, brandOwner? }

2. getFoodDetails(fdcId: number): Promise<USDAFoodDetails>
   - Endpoint: /food/{fdcId}
   - Parses the nutrient array into our standard per_100g format:
     { calories, protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg,
       saturated_fat_g, cholesterol_mg, potassium_mg,
       vitamins: { a_ug, c_mg, d_ug, e_mg, k_ug, b1_mg, b2_mg, b3_mg, b6_mg, b12_ug, folate_ug },
       minerals: { calcium_mg, iron_mg, magnesium_mg, zinc_mg, phosphorus_mg, selenium_ug } }
   - Map USDA nutrient IDs to our fields (e.g., nutrient ID 1008 = calories, 1003 = protein, etc.)
   - Handle missing nutrients gracefully (default to null, not 0)

3. mapUSDAToFoodCatalog(usdaFood: USDAFoodDetails): FoodCatalogInsert
   - Converts USDA response to our food_catalog table format
   - Sets source='usda', source_id=fdcId.toString()

Add proper TypeScript types for all USDA API responses.
Add error handling with retry logic (1 retry on 429/500).
Add a simple in-memory cache (Map) for search results to avoid duplicate API calls within the same session.

Reference: https://fdc.nal.usda.gov/api-guide

USDA nutrient number mapping reference:
- 1008: Energy (kcal), 1003: Protein, 1004: Total fat, 1005: Carbs
- 1079: Fiber, 2000: Sugars, 1093: Sodium, 1258: Saturated fat
- 1253: Cholesterol, 1092: Potassium
- Vitamins: 1106: Vit A, 1162: Vit C, 1114: Vit D, 1109: Vit E, 1185: Vit K, 1165: B1, 1166: B2, 1167: B3, 1175: B6, 1178: B12, 1177: Folate
- Minerals: 1087: Calcium, 1089: Iron, 1090: Magnesium, 1095: Zinc, 1091: Phosphorus, 1103: Selenium
```

### Step 1.2 — Open Food Facts Integration

```
Create a server-side utility module at /lib/nutrition/openfoodfacts.ts for querying the Open Food Facts API.

Requirements:
- Base URL: https://world.openfoodfacts.org/api/v2
- No API key needed (free, open source)
- Set User-Agent header to "HealthOS/1.0 (personal-use)"

1. searchByBarcode(barcode: string): Promise<OFFProduct | null>
   - Endpoint: /product/{barcode}
   - Returns null if product not found
   - Parses nutriments object into our standard per_100g format

2. searchByName(query: string, pageSize: number = 10): Promise<OFFSearchResult[]>
   - Endpoint: /search?search_terms={query}&page_size={pageSize}&json=true
   - Returns array of products with basic nutrition data

3. mapOFFToFoodCatalog(product: OFFProduct): FoodCatalogInsert
   - Maps Open Food Facts nutriment fields to our per_100g format
   - OFF uses: energy-kcal_100g, proteins_100g, fat_100g, carbohydrates_100g, fiber_100g, sugars_100g, sodium_100g, saturated-fat_100g
   - For vitamins/minerals: vitamin-a_100g, vitamin-c_100g, vitamin-d_100g, etc.
   - Sets source='openfoodfacts', source_id=barcode
   - Handle missing fields (OFF data can be incomplete)

Add proper TypeScript types.
Rate limit: max 10 requests per minute per user (implement simple throttle).
```

### Step 1.3 — Unified Nutrition Search API Route

```
Create a Next.js API route at /app/api/nutrition/search/route.ts that provides a unified food search across all sources.

The search flow (waterfall with priority):

1. First: Search user's personal food_catalog in Supabase (foods they've logged before)
   - Use the get_food_suggestions RPC function
   - These results appear at the top as "Your Foods"

2. Second: Search USDA FoodData Central
   - Only if personal results < 3 matches
   - These results appear as "USDA Database"

3. Third: Search Open Food Facts
   - Only if query looks like a barcode (all digits, 8-13 chars) OR total results still < 5
   - These results appear as "Open Food Facts"

Request: GET /api/nutrition/search?q=smoked+salmon&userId=xxx
Response: { personal: FoodCatalogItem[], usda: FoodCatalogItem[], openfoodfacts: FoodCatalogItem[] }

When the user selects a result from USDA or OFF:
- POST /api/nutrition/save — saves it to food_catalog in Supabase with the source info
- This way it becomes a "personal" food for future searches

Also create:
POST /app/api/nutrition/log/route.ts
- Accepts: { food_catalog_id, portion_g, meal_type, logged_at }
- Calculates nutrition_snapshot by multiplying per_100g values by (portion_g / 100)
- Inserts into food_entries
- Calls increment_food_logged

Add proper error handling, auth checks (get user from Supabase session), and TypeScript types.
```

---

## Phase 2: Home Dashboard Redesign
*The command center. Make it frictionless.*

### Step 2.1 — Swipeable Checklist Component

```
Create a mobile-first swipeable checklist component for the Health OS home page.
File: /components/health/SwipeableChecklist.tsx

Requirements:
- Each checklist item is a card that can be swiped right to mark as complete
- Swipe reveals a green checkmark background
- After full swipe (>60% of width), the item animates to "completed" state
- Completed items show a checkmark icon, muted text, and strikethrough
- Items can be tapped to expand/navigate to their detail page

Checklist items (populated from daily data):
1. Sleep — shows duration if logged, or "Log sleep" if not
2. Weight — shows weight if logged, or "Log weight"
3. Meds — shows status per medication_preset. Each preset is a sub-item that can be individually swiped
4. Exercise — shows session info or "Start exercise"
5. Food — shows meal count and total calories, or "Log food"
6. Energy/Mood — shows levels or "How are you feeling?"
7. Measurements — shows "Weekly" badge, only active on measurement days

Visual design:
- Each item has a colored icon (use the existing icon style from the screenshots)
- Swipe gesture uses framer-motion or CSS touch handlers
- The completion progress bar at the bottom updates in real-time as items are completed
- Mobile-first: large touch targets (min 48px height), thumb-friendly

State management:
- Fetch daily_checklist and related entries on mount
- Optimistic UI: update checklist immediately on swipe, then sync to Supabase
- Use the daily_checklist table to track completion state

Dependencies: Only use what's already in the project (React, Tailwind, shadcn). For swipe gestures, use native touch events or a lightweight solution — no heavy animation libraries.
```

### Step 2.2 — Momentum Score & Insights Panel

```
Create the Momentum Score display and Insights panel for the Health OS home page.

Files:
- /components/health/MomentumScore.tsx
- /components/health/InsightsPanel.tsx
- /components/health/TrendCharts.tsx

MomentumScore:
- Circular progress ring showing score 0-100
- Color gradient: red (0-30), orange (31-50), yellow (51-70), green (71-100)
- Tappable to expand and show breakdown: { "Today": 33%, "7-day avg": 68%, "Streak": "5 days", "Streak bonus": "+10" }
- Calls calculate_momentum_score RPC on mount

InsightsPanel:
- Renders insight cards from the get_weekly_trends data
- Types of insights:
  a. Streak alerts: "Treadmill streak: 5 days!" (positive, green)
  b. Trend alerts: "Sleep trending up +30min" (positive, green)
  c. Warning alerts: "Weight up 1.2kg this week" (caution, orange)
  d. Predictive: "You usually skip exercise on Mondays" (info, blue)
- Each card has: icon, title, subtitle, "info" button for detail
- Max 3 visible, with "Show more" if there are additional insights

TrendCharts:
- Weight 7-day sparkline chart (use recharts, already likely available in stack)
- Sleep duration 7-day bar chart
- Simple, clean, no axis labels — just the visual trend
- Tap on chart to see full-screen detail

All components must be mobile-first, using Tailwind for styling.
Use the get_weekly_trends Supabase function for data.
```

### Step 2.3 — Next Action Card & Smart Defaults

```
Redesign the "Next Action" card on the Health OS home page.
File: /components/health/NextActionCard.tsx

Requirements:
- Positioned directly below the completion progress bar
- Large, high-contrast card that's impossible to miss
- Shows the NEXT uncompleted checklist item based on time-of-day priority:
  - Morning (before 12pm): Meds → Weight → Food (breakfast)
  - Afternoon (12pm-6pm): Food (lunch) → Exercise → Mood
  - Evening (after 6pm): Food (dinner) → Measurements → Sleep
- Card shows: icon, action name, contextual subtitle, large "Go" button
- Subtitle uses smart defaults:
  - Exercise: "Treadmill 30m" (most frequent exercise type)
  - Food: "Log breakfast" / "Log lunch" / "Log dinner" (time-based)
  - Meds: "Morning dose — Vitamin D, Omega-3" (from presets)
- Tapping "Go" navigates to the appropriate section/page
- If ALL items are complete: show celebratory state "All done today! 🎯"

Time awareness:
- Import time-of-day logic
- "Going to Sleep" button should NOT appear in morning/afternoon
- Default meal types based on current time
```

---

## Phase 3: Exercise Page Overhaul
*Live sessions and persistent timers.*

### Step 3.1 — Exercise Timer with Live Session

```
Rebuild the Exercise page with live session timer support.

Files:
- /app/(dashboard)/exercise/page.tsx
- /components/health/ExerciseCard.tsx
- /components/health/LiveSessionBar.tsx
- /components/health/ExerciseTimer.tsx

ExerciseCard (the grid of exercise types):
- Keep the existing 7 exercise types: Treadmill, Vibration Plate, Walk, Run, Strength, Bike, Yoga
- Each card shows: icon, name, last session info ("Last: 2 days ago, 30m"), Start button
- Start button creates an exercise_session in Supabase with started_at=now(), ended_at=null
- Transition to ExerciseTimer view

ExerciseTimer (active session view):
- Full-screen overlay or page replacement when session is active
- Large digital timer counting up (MM:SS format)
- Exercise type icon and name at top
- Pause/Resume button (tracks total active time)
- Stop button — ends session, calculates duration, saves to Supabase
- Manual entry option: "Add 30 minutes" quick buttons for retroactive logging
- After stopping: brief summary card with duration, option to add notes

LiveSessionBar (persistent across all pages):
- Fixed bar at bottom of screen, above nav
- Shows: exercise type icon, elapsed time (updating every second), Stop button
- Only visible when there's an active session (exercise_sessions where ended_at IS NULL)
- Tapping the bar navigates back to ExerciseTimer
- Uses React Context or Zustand to share live session state across the app
- Timer uses client-side interval but calculates from started_at (server time) to prevent drift

Implementation notes:
- Store active session ID in React Context
- On app load, check for any exercise_sessions with ended_at=NULL for this user
- If found, restore the live session bar with correct elapsed time
- Handle edge case: session started yesterday and never stopped (prompt user)
```

---

## Phase 4: Health Page Improvements
*Reduce friction on every input.*

### Step 4.1 — Smart Medication Logging

```
Rebuild the medication section with preset-based swipe logging.

Files:
- /components/health/MedicationTracker.tsx
- /components/health/MedicationSetup.tsx

MedicationTracker (daily view):
- Reads from medication_presets to show today's medication schedule
- Groups by time of day: Morning, Afternoon, Evening, Night
- Each medication shows: name, dosage, status icon
- Swipe right to mark as "Taken" (green check)
- Swipe left to mark as "Skipped" (grey X)
- Long press for options: "Taken late", add notes
- Auto-creates medication_entries on swipe
- Shows completion progress: "2/4 medications taken"

MedicationSetup (one-time config, accessed from settings):
- Form to add medication presets:
  - Medication name (text input with autocomplete from past entries)
  - Dosage (text)
  - Schedule: multi-select for time of day
  - Active toggle
- Edit/delete existing presets
- This is the ONLY place where typing is required — daily logging is swipe-only

On first use (no presets configured):
- Show friendly onboarding: "Add your medications once, then log them daily with a swipe"
- Link to MedicationSetup
```

### Step 4.2 — Redesigned Food Entry

```
Rebuild the food logging UI with search-first, minimal-typing approach.

Files:
- /components/health/FoodLogger.tsx
- /components/health/FoodSearchInput.tsx
- /components/health/FoodNutritionCard.tsx
- /components/health/MealSummary.tsx

FoodSearchInput:
- Large search field at top
- As user types, debounced search (300ms) calls /api/nutrition/search
- Results appear in 3 sections:
  1. "Your Foods" — personal catalog, sorted by frequency
  2. "USDA" — if needed
  3. "Open Food Facts" — if needed
- Each result shows: food name, calories per 100g, protein per 100g
- Selecting a result opens FoodNutritionCard

FoodNutritionCard (expanded entry view):
- Shows selected food with full nutrition breakdown
- Portion input: number field with +/- buttons, defaults to default_portion_g
- Quick portion buttons: "100g", "200g", "serving" (if default_portion defined)
- Real-time calculation: as portion changes, all nutrition values update
- Meal type selector: Breakfast, Lunch, Dinner, Snack (auto-selected by time of day)
- "Log" button saves to food_entries
- Nutrition display: big number for calories, smaller for protein/fat/carbs, expandable for vitamins/minerals

MealSummary:
- Shows at top of Food page, summarizing today's logged meals
- Grouped by meal type
- Running totals: Total calories, Protein g, Fat g, Carbs g
- Tap a logged entry to edit portion or delete

FoodLogger (page wrapper):
- Shows MealSummary at top
- FoodSearchInput below
- Recent foods quick-select: horizontal scrollable row of last 10 unique foods logged
- "Common meals" section: if the user frequently logs the same foods together, suggest them as a group (future enhancement — just leave a placeholder)
```

### Step 4.3 — Mood & Energy Visual Selector

```
Replace the numeric 1-10 inputs for Energy and Mood with visual selectors.
File: /components/health/MoodEnergyLogger.tsx

Requirements:
- Energy: 5 battery icons from empty to full
  - Level 1: empty battery, red — "Exhausted"
  - Level 2: 25% battery, orange — "Low"
  - Level 3: 50% battery, yellow — "Moderate"
  - Level 4: 75% battery, green — "Good"
  - Level 5: full battery, bright green — "Energized"

- Mood: 5 face expressions
  - Level 1: very sad face — "Awful"
  - Level 2: slightly sad — "Not great"
  - Level 3: neutral — "Okay"
  - Level 4: slightly happy — "Good"
  - Level 5: big smile — "Great"

- Tapping an icon selects it with a subtle scale animation
- Optional notes field below (collapsed by default, "Add a note..." trigger)
- "Log" button saves to mood_entries
- If already logged today, show the existing entry with "Update" option

Use SVG or lucide-react icons. Make the icons LARGE (64px+) and thumb-friendly. 5-point scale instead of 10-point — more consistent data, easier to tap.
```

---

## Phase 5: Sleep Tracking Improvement

### Step 5.1 — Smart Sleep Tracker

```
Rebuild the sleep tracking UX.
File: /components/health/SleepTracker.tsx

Requirements:

"Going to Sleep" flow:
- Show this button only after 8pm (time-aware)
- Large, prominent button with moon icon
- Tapping creates a sleep_entry with sleep_start = now()
- Button text changes to "Sleeping... tap when you wake up"
- Store active sleep session ID in localStorage for persistence across app closes

"Waking Up" flow:
- When user opens app and there's an active sleep session:
  - Show a "Good morning!" card with calculated sleep duration
  - "I woke up now" button (sets sleep_end = now())
  - "I woke up earlier" option with time picker
  - Morning quality rating: 5 stars or the face icons from mood
  - After confirming wake time:
    - Calculate duration
    - Save to Supabase
    - Show sleep duration in today's checklist
    - Clear localStorage

Edge cases:
- Sleep session from 2+ days ago: "It looks like you forgot to log waking up. When did you wake up on [date]?"
- Multiple sleep sessions same day (naps): support it
- Sleep start before midnight, wake after: handle correctly

Visual:
- When sleep is active, the entire Health page header should have a subtle dark/night theme
- Show elapsed sleep time updating every minute
```

---

## Phase 6: Trends & Correlations

### Step 6.1 — Weekly Trends Dashboard

```
Create a comprehensive trends view accessible from the Home page.

Files:
- /app/(dashboard)/trends/page.tsx
- /components/health/WeightChart.tsx
- /components/health/SleepChart.tsx
- /components/health/NutritionChart.tsx
- /components/health/CorrelationCard.tsx

WeightChart:
- Line chart showing weight over last 30 days
- 7-day moving average overlay
- Goal line (if set, future feature — leave placeholder)
- Tap any point for details

SleepChart:
- Bar chart showing sleep duration over last 14 days
- Color-coded: red (<6h), yellow (6-7h), green (7-9h)
- Average line overlay

NutritionChart:
- Stacked bar chart: protein, fat, carbs per day (last 7 days)
- Calorie line overlay
- Daily target line (if set)

CorrelationCard:
- Simple cards showing discovered correlations from the data
- Initially these can be computed client-side from weekly_trends data:
  a. "Sleep vs Exercise": average sleep on exercise days vs non-exercise days
  b. "Mood vs Sleep": correlation between sleep duration and next-day mood
  c. "Weight vs Calories": rolling average comparison
- Display as: "{metric} is {X}% better on days when you {action}"
- Use green/red arrows to show direction

Use recharts for all charts.
Mobile-first: charts should be full-width, swipeable between different time ranges (7d, 14d, 30d).
```

---

## Phase 7: Progressive Enhancement & Polish

### Step 7.1 — Time-Aware UI & Smart Defaults

```
Add time-of-day awareness throughout the Health OS app.
File: /lib/time-awareness.ts + integration into existing components

Functions:
1. getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night'
   - morning: 5am-12pm
   - afternoon: 12pm-6pm
   - evening: 6pm-10pm
   - night: 10pm-5am

2. getDefaultMealType(): 'breakfast' | 'lunch' | 'dinner' | 'snack'
   - breakfast: 5am-11am
   - lunch: 11am-3pm
   - dinner: 5pm-10pm
   - snack: all other times

3. getGreeting(name: string): string
   - "Good morning, {name}!" / "Good afternoon..." / "Good evening..."

4. shouldShowSleepButton(): boolean
   - True if after 8pm OR before 5am

5. getRelevantChecklist(): string[]
   - Returns checklist items in time-appropriate order
   - Morning: meds, weight, breakfast, exercise
   - Afternoon: lunch, exercise, mood
   - Evening: dinner, measurements, sleep

Integrate into:
- Home page greeting
- Checklist item ordering
- Default meal type in food logger
- Sleep button visibility
- Next Action card priority
```

### Step 7.2 — Empty States & Onboarding

```
Add meaningful empty states throughout the app.
Files: /components/health/EmptyState.tsx + integration

Create a reusable EmptyState component with:
- Illustration (simple SVG or emoji-based)
- Title
- Description
- CTA button

Apply to:
1. Trends charts with no data: "Log 3 more days to see your weight trend" + Log Weight button
2. Food page first visit: "Start logging what you eat. We'll remember your favorites." + Search food button
3. Insights panel with no insights: "Keep logging for a week and we'll start finding patterns for you"
4. Exercise page no sessions: "Start your first workout to track your progress"
5. Medication page no presets: "Add your medications once, then log them daily with a single swipe" + Set Up button

Each empty state should guide the user to the exact action needed. No dead ends.
```

### Step 7.3 — Haptic Feedback & Micro-interactions

```
Add micro-interactions and haptic feedback throughout Health OS.
File: /lib/haptics.ts + integration into components

Haptic feedback utility:
- Uses navigator.vibrate API (mobile browsers)
- Three levels:
  - light(): 10ms vibration — for selections, toggles
  - medium(): 25ms vibration — for completions, confirmations
  - success(): [10, 50, 20] pattern — for achievements, streaks

Apply to:
1. Checklist swipe completion: medium() on complete, light() as you swipe
2. Exercise session start/stop: medium()
3. Food logged: medium()
4. Momentum score milestone: success() when hitting 80+ or 100
5. Streak achievement: success()

CSS animations to add:
1. Checklist item completion: item slides left slightly, checkmark scales in
2. Momentum ring: animated fill on page load
3. Insight cards: subtle fade-in stagger (100ms between cards)
4. Chart data points: draw-in animation on load
5. Button press: scale(0.97) on active state for tactile feel
6. Number changes (calories, weights): count-up animation

Keep it subtle. These should feel natural, not distracting. Use CSS transitions/animations only — no animation libraries.
```

---

## Phase 8: AI Coach Preparation

### Step 8.1 — Data Export API for AI Coach

```
Create API routes that the AI coach (Claude via OpenClaw) can use to read health data.

Files:
- /app/api/coach/summary/route.ts
- /app/api/coach/history/route.ts
- /app/api/coach/insights/route.ts

GET /api/coach/summary?userId=xxx&date=YYYY-MM-DD
- Returns get_daily_summary for the given date
- If no date, returns today

GET /api/coach/history?userId=xxx&days=30
- Returns daily summaries for the last N days
- Includes: weight array, sleep array, exercise array, nutrition totals per day, mood array
- Compact format optimized for LLM context windows

GET /api/coach/insights?userId=xxx
- Returns computed insights:
  - Current streaks (and what's at risk)
  - Averages vs previous period
  - Correlations discovered
  - Anomalies (unusually high/low values)
  - Medication adherence rate

All endpoints require authentication via API key (env var COACH_API_KEY).
Return JSON with clear field names that an LLM can understand without a schema reference.
Add a "human_readable" field alongside numeric data where helpful:
e.g., { sleep_hours: 7.5, sleep_readable: "7h 30m, above your 7-day average of 6h 45m" }
```

---

## Execution Notes

**Dependency order**: 0.1 → 0.2 → 1.1 → 1.2 → 1.3 → (then 2.x, 3.x, 4.x, 5.x can be parallelized) → 6.1 → 7.x → 8.1

**Each prompt above is designed to be**:
- Self-contained (can be run as a single Claude Code session)
- Specific enough to produce working code
- Small enough to fit in a single context window
- Independent from other steps (after dependencies are met)

**Before running each prompt, prepend this to Claude Code**:

```
Read the project structure and existing code first.
This is a Next.js App Router project with Supabase, Tailwind CSS, and shadcn/ui.
Follow existing code patterns, naming conventions, and file organization.
Use TypeScript throughout. Use existing Supabase client setup.
Mobile-first responsive design. All components must work on 375px width.
```
