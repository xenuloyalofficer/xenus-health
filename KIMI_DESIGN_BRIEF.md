# Xenus Health OS — Complete UI Redesign Brief for Kimi

## Overview
Redesign the entire Xenus Health OS app using the "Acid Lime / Neo-Brutalist" mobile UI style from the reference images.

## Reference Images (in design-references/ui-components/)
1. **air-purifier-dashboard.jpg** — Dashboard layout, circular gauges, metric displays
2. **plant-care-app.jpg** — Card styling, floating effects, progress rings
3. **project-dashboard.jpg** — Stats grid, calendar widget, data viz
4. **health-claims-app.jpg** — Health data layout, metric cards, dark theme
5. **smart-home-app.jpg** — Device controls, toggles, profile card

## Design System Specifications

### Color System
```css
/* Primary Palette */
--accent-lime: #DFFF00;          /* Electric lime - use sparingly for CTAs */
--accent-lime-soft: rgba(223, 255, 0, 0.1);  /* Semi-transparent overlays */

/* Backgrounds */
--bg-primary: #F5F5F0;           /* Off-white (light mode) */
--bg-dark: #1A1A1A;              /* Deep charcoal (dark mode) */
--bg-card-light: #FFFFFF;
--bg-card-dark: #222222;

/* Text */
--text-primary-light: #0F0F0F;   /* Near-black on light */
--text-primary-dark: #FFFFFF;    /* White on dark */
--text-secondary: #888888;       /* Muted gray */

/* Surfaces */
--surface-elevated: rgba(255, 255, 255, 0.8);  /* Glassmorphism base */
--border-subtle: rgba(0, 0, 0, 0.05);
```

### Typography
```css
/* Font: Geometric sans-serif */
font-family: 'Inter', 'SF Pro', 'Manrope', system-ui, sans-serif;

/* Headings */
--text-h1: 32-40px, font-weight: 700, letter-spacing: -0.02em;
--text-h2: 24-28px, font-weight: 600, letter-spacing: -0.01em;

/* Body */
--text-body: 14-16px, font-weight: 500;
--text-caption: 12-13px, font-weight: 400;

/* Data/Metrics (large numerals) */
--text-metric: 48-64px, font-weight: 700, tabular-nums;
--text-metric-label: 12-14px, font-weight: 500, text-secondary;
```

### Component Rules

#### Cards
```css
/* All cards */
border-radius: 24-32px;
padding: 20-24px;
background: white OR subtle gray;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
border: none;

/* Floating/overlapping effect */
margin-bottom: -8px;  /* Slight overlap for depth */
z-index layering;
```

#### Primary Buttons
```css
/* Pill-shaped CTAs */
border-radius: 9999px;  /* Full rounded */
background: #DFFF00;    /* Lime */
color: #0F0F0F;         /* Black text */
padding: 16px 32px;
font-weight: 600;
/* Press state: scale(0.97) */
```

#### Bottom Navigation
```css
/* Floating pill container */
position: fixed;
bottom: 20px;
left: 50%;
transform: translateX(-50%);
background: rgba(255, 255, 255, 0.9);
backdrop-filter: blur(20px);
border-radius: 9999px;
padding: 8px 24px;
display: flex;
gap: 32px;

/* Active state */
.active {
  background: #DFFF00;
  border-radius: 50%;
  padding: 12px;
}
```

#### Progress Indicators (Circular Gauges)
```css
/* Donut charts for momentum, completion % */
width: 120-180px;
height: 120-180px;
stroke-width: 10-12px;
stroke-linecap: round;
fill: transparent;

/* Progress fill */
stroke: #DFFF00;  /* Lime for positive states */

/* Background track */
stroke: rgba(0, 0, 0, 0.05);

/* Animated draw on load */
animation: draw 1s ease-out;
```

#### Input Fields
```css
/* Rounded rectangles */
border-radius: 16px;
background: #F5F5F0;  /* Light gray */
border: none;
padding: 16px 20px;
font-size: 16px;

/* Focus state */
box-shadow: 0 0 0 2px rgba(223, 255, 0, 0.3);
```

#### Pill Tags/Chips
```css
/* Category labels */
display: inline-flex;
align-items: center;
padding: 8px 16px;
border-radius: 9999px;
background: rgba(223, 255, 0, 0.15);
color: #0F0F0F;
font-size: 13px;
font-weight: 500;
```

#### Soft Switches/Toggles
```css
/* Rounded toggle */
width: 52px;
height: 32px;
border-radius: 9999px;
background: #E5E5E5;

/* Active state */
background: #DFFF00;

/* Thumb */
width: 28px;
height: 28px;
border-radius: 50%;
background: white;
box-shadow: 0 2px 4px rgba(0,0,0,0.1);
```

### Layout Patterns

#### Card-Based Architecture
- Generous padding: 20-24px internal
- Gap between cards: 16px
- Cards float with subtle shadow depth

#### Floating Elements
- Negative margins for overlap: `margin-bottom: -8px`
- z-index layering for depth
- Position: relative for stacking context

#### Glassmorphism Overlays
```css
backdrop-filter: blur(20px);
background: rgba(255, 255, 255, 0.8);
border-radius: 24px;
border: 1px solid rgba(255, 255, 255, 0.2);
```

#### Horizontal Scroll Sections
```css
overflow-x: auto;
scroll-snap-type: x mandatory;
-webkit-overflow-scrolling: touch;

/* Items */
scroll-snap-align: start;
flex-shrink: 0;
```

#### Header Pattern
- Profile/avatar: top-left
- Notifications: top-right
- Large greeting text below

## Screens to Redesign

### 1. Home Tab (Dashboard)
**Reference:** air-purifier-dashboard.jpg + project-dashboard.jpg

**Layout:**
```
┌─────────────────────────────┐
│ [Avatar]  [🔔]              │  ← Header
│ Good morning, Maria!        │
├─────────────────────────────┤
│                             │
│   ╭──────────────────╮      │
│   │  MOMENTUM SCORE  │      │  ← Large circular gauge
│   │       78%        │      │     (lime ring)
│   ╰──────────────────╯      │
│                             │
├─────────────────────────────┤
│ Today's Summary      [▼]    │
├─────────────────────────────┤
│ ┌──────────┐ ┌──────────┐  │
│ │ Sleep    │ │ Weight   │  │  ← 2x2 metric grid
│ │  7h 23m  │ │  68.2kg  │  │     (rounded cards)
│ └──────────┘ └──────────┘  │
│ ┌──────────┐ ┌──────────┐  │
│ │ Exercise │ │ Calories │  │
│ │  30 min  │ │  1,840   │  │
│ └──────────┘ └──────────┘  │
├─────────────────────────────┤
│ Next Action                 │
│ ┌─────────────────────────┐ │  ← Prominent CTA card
│ │ 🏃 Treadmill 30m   [→]  │ │     (lime accent)
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Today's Checklist           │
│ ┌─────────────────────────┐ │  ← Swipeable cards
│ │ 😴 Sleep         [✓]    │ │     (swipe to complete)
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ⚖️ Weight        [○]    │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Elements:**
- Circular momentum gauge (centered, large)
- 2x2 metric grid (sleep, weight, exercise, calories)
- Prominent "Next Action" card with lime background
- Swipeable checklist items

### 2. Exercise Tab
**Reference:** plant-care-app.jpg (card style) + smart-home-app.jpg (controls)

**Layout:**
```
┌─────────────────────────────┐
│ Exercise         [+ Manual] │
├─────────────────────────────┤
│ Active Session              │  ← Shows if timer running
│ ┌─────────────────────────┐ │
│ │ 🏃 Treadmill    [STOP]  │ │  ← Fixed bar if active
│ │      00:14:32           │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Quick Start                 │
│ ┌─────────┐ ┌─────────┐     │
│ │ 🏃      │ │ 🌊      │     │  ← Exercise type grid
│ │Treadmill│ │Vibration│     │     (large cards)
│ │Last:2d  │ │Plate    │     │
│ └─────────┘ └─────────┘     │
│ ┌─────────┐ ┌─────────┐     │
│ │ 🚶      │ │ 🏃      │     │
│ │  Walk   │ │   Run   │     │
│ └─────────┘ └─────────┘     │
└─────────────────────────────┘
```

**Timer Overlay (when active):**
- Full-screen
- Large digital timer: `00:14:32` (MM:SS)
- Exercise icon + name at top
- Pause/Resume button
- Stop button (lime, prominent)

### 3. Body Tab
**Reference:** health-claims-app.jpg (data layout)

**Layout:**
```
┌─────────────────────────────┐
│ Body            [History ▼] │
├─────────────────────────────┤
│ Weight                      │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │        68.2             │ │  ← Large metric
│ │          kg             │ │
│ │    [7-day sparkline]    │ │
│ │                         │ │
│ │  [Log Weight]           │ │  ← Lime button
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Measurements    (Weekly)    │
│ ┌─────────────────────────┐ │
│ │ Last: 2 weeks ago       │ │
│ │                         │ │
│ │ Neck  Waist  Hips       │ │  ← Mini metric grid
│ │ 35cm  78cm   98cm       │ │
│ │                         │ │
│ │ [Update Measurements]   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 4. Health Tab
**Reference:** smart-home-app.jpg (device cards)

**Sections:**

**Sleep Card:**
- State-based design
- Night mode: Dark background, moon icon, "Going to Sleep" button
- Morning: Sleep duration display, quality rating (5 stars)

**Medication Tracker:**
- Time groups: Morning | Afternoon | Evening | Night
- Horizontal scrollable medication cards
- Swipe right = Taken (green check)
- Swipe left = Skipped (gray X)

**Food Logger:**
- Today's calories: Large number with circular progress
- Meal list: Breakfast, Lunch, Dinner, Snack
- "Log Food" floating action button

**Mood/Energy:**
- Visual 5-point selector
- Battery icons for energy (empty → full)
- Face expressions for mood (sad → happy)
- Selected state: Lime background

## Animations & Interactions

### Page Load
- Cards fade in with stagger (100ms delay each)
- Progress rings animate draw (1s duration)
- Numbers count up to final value

### Interactions
```css
/* Button press */
transform: scale(0.97);
transition: transform 0.1s ease;

/* Card tap */
box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
transform: translateY(-2px);

/* Swipe gesture */
/* Reveal green checkmark background as user swipes right */
/* Snap to complete when >60% swiped */

/* Progress ring */
stroke-dasharray: 0 100;
animation: draw 1s ease-out forwards;

/* Page transitions */
slide-from-right: 300ms ease-out;
fade: 200ms ease;
```

### Haptic Feedback (already implemented)
- Light (10ms): Selections, toggles
- Medium (25ms): Completions, button presses
- Success (pattern): Achievements, milestones

## Responsive Behavior

### Mobile (375px+)
- Single column layout
- Bottom floating navigation
- Full-width cards

### Tablet (768px+)
- 2-column grid for metrics
- Side navigation option
- Larger touch targets

### Desktop (1024px+)
- Max-width: 480px (mobile-like centered)
- Or max-width: 1200px with sidebar
- Maintains mobile aesthetic

## Health/Wellness Specific Elements

### Data Visualization
- Circular progress rings for: momentum score, daily completion, calorie goals
- Sparkline charts for: weight trend, sleep duration
- Bar charts for: weekly exercise frequency

### Metric Displays
```
┌─────────────────┐
│                 │
│     7h 23m      │  ← Large value
│                 │
│   ────────      │  ← Mini chart
│                 │
│   Sleep         │  ← Label
└─────────────────┘
```

### Status Indicators
- Green dot: Completed today
- Yellow dot: In progress
- Gray dot: Not started
- Red dot: Overdue/missed

## Implementation Files

### Update These
1. `src/app/globals.css` — CSS variables, base styles
2. `tailwind.config.ts` — Extend theme with custom colors
3. `src/components/layout/app-shell.tsx` — Navigation structure
4. `src/components/tabs/home-tab.tsx` — Home redesign
5. `src/components/tabs/exercise-tab.tsx` — Exercise + timer
6. `src/components/tabs/body-tab.tsx` — Weight + measurements
7. `src/components/tabs/health-tab.tsx` — Health sections

### New Components
- `CircularProgress.tsx` — Animated donut chart
- `MetricCard.tsx` — Stat display with label
- `SwipeableCard.tsx` — Checklist items with swipe
- `FloatingNav.tsx` — Bottom pill navigation
- `GlassModal.tsx` — Backdrop blur overlays

## Kimi YOLO Command

When ready, run:

```bash
cd ~/projects/xenus-health/my-app

kimi --yolo "Redesign the Xenus Health OS app following KIMI_DESIGN_BRIEF.md. 
Use the Acid Lime / Neo-Brutalist style from the reference images.
Create the design system first (CSS variables, typography, colors), 
then redesign all 4 tabs with the component specifications.
Reference the visual hierarchy from air-purifier-dashboard.jpg for dashboard layout,
the circular gauge style for metrics, and the card floating effects for interactions." \
  --image design-references/ui-components/air-purifier-dashboard.jpg \
  --image design-references/ui-components/plant-care-app.jpg \
  --image design-references/ui-components/project-dashboard.jpg \
  --image design-references/ui-components/health-claims-app.jpg \
  --image design-references/ui-components/smart-home-app.jpg
```

## Success Checklist
- [ ] CSS variables defined in globals.css
- [ ] Tailwind config extended with lime accent
- [ ] All 4 tabs redesigned with card-based layout
- [ ] Circular progress rings implemented
- [ ] Floating bottom navigation working
- [ ] Glassmorphism overlays for modals
- [ ] Animations: progress draw, button press, card hover
- [ ] Dark mode supported (toggle or auto)
- [ ] Mobile-first (375px), responsive up to desktop
- [ ] All existing functionality preserved
- [ ] TypeScript compiles clean

## Priority Order
1. ✅ Design system (colors, typography, variables)
2. ✅ Layout shell (navigation, page structure)
3. ✅ Home tab (momentum, metrics, checklist)
4. ✅ Exercise tab (timer, session list)
5. ✅ Body tab (weight, measurements)
6. ✅ Health tab (sleep, meds, food, mood)
7. ✅ Animations and polish
8. ✅ Responsive testing
