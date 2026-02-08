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

# Body Measurements Feature — Done

## Files Created
- `supabase/migrations/20260208120000_create_body_measurement_entry.sql` — DB migration
- `src/app/api/measurements/route.ts` — POST endpoint

## Database Table
`body_measurement_entry` with 10 body part measurements (all optional), weight_kg, notes, measurement_date.
