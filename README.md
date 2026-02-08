# Personal Health OS

A full-stack health tracking application built with Next.js, Supabase, and shadcn/ui.

## Features

- **Dashboard**: Health cockpit with momentum score, today's checklist, next treadmill session
- **Labs**: Upload and track lab reports with analyte trends
- **Exercise**: Treadmill progression with adaptive planning
- **Sleep & Recovery**: Sleep tracking with energy overlay
- **Body Metrics**: Weight rolling averages and measurements
- **Meds & Symptoms**: Medication adherence and symptom timeline
- **Insights**: Weekly/monthly summaries with explainable scores

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: Supabase PostgreSQL with RLS
- **Auth**: Supabase Auth
- **UI**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts
- **Validation**: Zod

## Quick Start

```bash
# Clone
git clone https://github.com/xenuloyalofficer/xenus-health.git
cd xenus-health/my-app

# Install
npm install

# Setup env
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Push database
supabase db push

# Run dev
npm run dev
```

## Project Structure

```
my-app/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── dashboard/       # Main dashboard
│   │   ├── api/             # API routes
│   │   │   ├── healthz/     # Keepalive endpoint
│   │   │   └── openclaw/    # OpenClaw intake
│   │   └── ...              # Feature screens
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── layout/          # Layout components
│   │   ├── charts/          # Chart components
│   │   └── forms/           # Form components
│   ├── lib/
│   │   ├── db/              # Database client
│   │   ├── engines/         # Treadmill + Momentum engines
│   │   └── validations/     # Zod schemas
│   └── types/               # TypeScript types
├── supabase/
│   └── migrations/          # Database migrations
├── docs/
│   ├── DECISIONS.md         # Architecture decisions
│   ├── RUNBOOK.md           # Operations guide
│   └── UI_SYSTEM.md         # Design system
└── .github/workflows/       # CI/CD
```

## Documentation

- [DECISIONS.md](docs/DECISIONS.md) - Architecture and stack rationale
- [RUNBOOK.md](docs/RUNBOOK.md) - Setup, deployment, troubleshooting
- [UI_SYSTEM.md](docs/UI_SYSTEM.md) - Design system and component patterns

## License

MIT
