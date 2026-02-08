# Xenus Health OS — Complete UI Redesign Brief for Kimi

## Overview
Redesign the entire Xenus Health OS app using the visual design language from the reference images.

## Reference Images (in design-references/ui-components/)
1. **air-purifier-dashboard.jpg** — Dashboard layout inspiration, circular progress, card grid
2. **plant-care-app.jpg** — Card styling, progress rings, dark mode toggle
3. **project-dashboard.jpg** — Home screen cards, stats layout, calendar widget
4. **health-claims-app.jpg** — Data visualization, metric cards, dark theme
5. **smart-home-app.jpg** — Device controls, toggle switches, profile card

## Design System to Extract

### Color Palette
```
Primary Accent: #D4FF00 (lime/neon green)
Background Dark: #0A0A0A or #111111
Background Light: #FFFFFF or #F5F5F5
Card Dark: #1A1A1A or #222222
Card Light: #FFFFFF with subtle shadow
Text Primary: #FFFFFF (on dark) / #000000 (on light)
Text Secondary: #888888 or #666666
Border: #333333 (dark) / #E5E5E5 (light)
Success: #D4FF00 (same as primary)
Warning: #FFB800
Error: #FF4444
```

### Typography
- Font: Inter or Geist (already in project)
- Headings: 24-32px, font-weight 600-700
- Body: 14-16px, font-weight 400
- Small/Caption: 12px, font-weight 400
- Numbers/Stats: 36-48px, font-weight 700, tabular-nums

### Components

#### Cards
- Border-radius: 24px (large) or 16px (medium)
- Padding: 20-24px
- Shadow (light mode): 0 4px 20px rgba(0,0,0,0.08)
- Border (dark mode): 1px solid #333333

#### Buttons
- Primary: bg #D4FF00, text black, rounded-full or rounded-2xl
- Secondary: bg transparent, border 1px #333333, text white
- Icon buttons: 48-56px circular, centered icon

#### Progress Indicators
- Circular rings for momentum score, completion %
- Stroke width: 8-12px
- Rounded caps
- Animated on load

#### Toggle Switches
- Circular track
- Lime green when ON
- Smooth transition

## Screens to Redesign

### 1. Home Tab (Home Dashboard)
**Current:** Greeting, Momentum Score, Checklist, Next Treadmill Session, Trends

**New Design:**
- **Profile Header**: Avatar + greeting + notification bell (like smart-home-app.jpg)
- **Momentum Score Card**: Large circular progress ring (like air-purifier-dashboard.jpg filter status)
- **Daily Stats Grid**: 2x2 grid of metric cards showing:
  - Sleep duration
  - Weight (if logged today)
  - Exercise count
  - Food calories
- **Next Action Card**: Prominent, lime green accent, clear CTA
- **Today's Checklist**: Swipeable cards (like plant-care-app.jpg plant cards)
- **Trends Preview**: Mini sparkline charts

### 2. Exercise Tab
**Current:** Exercise type cards, timer overlay

**New Design:**
- **Active Session Bar**: Fixed bottom when timer running (lime green accent)
- **Exercise Grid**: Large cards with icons, last session info
- **Timer Overlay**: Full-screen, large digital timer MM:SS
- **Session History**: List of today's completed sessions
- **Quick Stats**: Total duration, calories burned

### 3. Body Tab
**Current:** Weight form, Measurements form

**New Design:**
- **Weight Section**: 
  - Large current weight display
  - 7-day sparkline chart
  - "Log Weight" button (lime green)
- **Measurements Section**:
  - Visual body diagram or measurement grid
  - Last measurement date
  - "Update Measurements" card
- **Progress Photos**: Placeholder section (future feature)

### 4. Health Tab
**Current:** Sleep, Meds, Food, Energy/Mood sections

**New Design:**
- **Sleep Card**: 
  - State-based: "Going to Sleep" button (night mode styling)
  - Or: Sleep duration display with quality rating
- **Medication Tracker**:
  - Time-of-day groups (Morning/Afternoon/Evening/Night)
  - Swipeable medication cards
  - Progress indicator
- **Food Logger**:
  - Today's meals summary card
  - Calorie progress ring
  - "Log Food" quick action
- **Mood/Energy**:
  - Visual 5-point selectors (battery icons, face expressions)
  - Today's logged state or "How are you feeling?"

### 5. Navigation
**Current:** Bottom nav with 4 tabs

**New Design:**
- **Bottom Tab Bar**: 
  - Icons + labels
  - Active tab: lime green icon
  - Inactive: gray
  - Slight elevation/shadow
- **Floating Action Button**: Optional, for quick logging

## Animation & Interaction Specs

### Micro-interactions
- **Button Press**: scale(0.97) on active
- **Card Tap**: subtle shadow increase
- **Page Transitions**: slide from right
- **Progress Rings**: Draw animation on load (1s duration)
- **Number Changes**: Count-up animation
- **Swipe Actions**: Checkmark/X reveal with haptic feedback

### Haptic Feedback (already implemented)
- Light: Selections, toggles
- Medium: Completions, confirmations
- Success: Achievements, streaks

## Responsive Behavior
- **Mobile (375px+)**: Single column, bottom nav
- **Tablet (768px+)**: 2-column grid for stats, side nav option
- **Desktop (1024px+)**: Max-width container, centered layout

## Implementation Notes

### Files to Modify
1. `src/components/layout/app-shell.tsx` — Navigation structure
2. `src/components/tabs/home-tab.tsx` — Complete redesign
3. `src/components/tabs/exercise-tab.tsx` — Timer + session list
4. `src/components/tabs/body-tab.tsx` — Weight + measurements
5. `src/components/tabs/health-tab.tsx` — Sleep, meds, food, mood
6. `src/app/globals.css` — Update CSS variables for new color scheme
7. `tailwind.config.ts` — Add custom colors, extend theme

### New Components to Create
- `CircularProgress` — Animated ring component
- `MetricCard` — Reusable stat display card
- `SwipeableCard` — For checklist items
- `ToggleButton` — Custom toggle switch
- `VisualSelector` — Battery/face mood selectors

### Design Tokens (add to globals.css)
```css
:root {
  --accent-lime: #D4FF00;
  --bg-dark: #0A0A0A;
  --card-dark: #1A1A1A;
  --text-primary: #FFFFFF;
  --text-secondary: #888888;
  --border-dark: #333333;
}
```

## Success Criteria
- [ ] All 4 tabs redesigned with consistent visual language
- [ ] Lime green accent used consistently for CTAs and highlights
- [ ] Dark mode as default, light mode supported
- [ ] All animations implemented (progress rings, transitions)
- [ ] Mobile-first, works at 375px width
- [ ] Existing functionality preserved (all features still work)
- [ ] TypeScript compiles without errors

## How to Use This Brief with Kimi

```bash
cd ~/projects/xenus-health/my-app

# Start Kimi with image inputs
kimi "Redesign the Xenus Health OS app following this design brief. 
Use the reference images in design-references/ui-components/ to understand 
the visual language. Implement the complete redesign across all 4 tabs." \
  --image design-references/ui-components/air-purifier-dashboard.jpg \
  --image design-references/ui-components/plant-care-app.jpg \
  --image design-references/ui-components/project-dashboard.jpg \
  --image design-references/ui-components/health-claims-app.jpg \
  --image design-references/ui-components/smart-home-app.jpg
```

## Priority Order
1. Update global styles (colors, typography)
2. Redesign Home Tab (most important, first impression)
3. Redesign Exercise Tab (timer interactions)
4. Redesign Body Tab (forms)
5. Redesign Health Tab (cards)
6. Polish animations and interactions
7. Test responsive behavior
8. Final review and cleanup
