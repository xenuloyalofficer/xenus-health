# Decisions

## Stack Rationale

### Next.js 15 + App Router
- Server components for initial data loads
- Client components for interactive forms
- Built-in API routes for OpenClaw integration

### Supabase
- PostgreSQL for relational health data
- Built-in Auth with RLS for security
- Real-time subscriptions for live updates
- Free tier sufficient for personal use

### shadcn/ui + Tailwind
- Rapid UI development with pre-built accessible components
- Customizable design tokens
- Mobile-first responsive by default

### Zod
- Runtime validation for all data entry
- Type safety from database to frontend
- Clear error messages for validation failures

## Privacy & Security

### Data Ownership
- All health data stored in user's Supabase project
- No third-party analytics or tracking
- RLS policies enforce strict data isolation

### LLM Usage Policy
- **DISABLED BY DEFAULT**
- Deterministic engines only (no black-box scoring)
- Any LLM features require explicit opt-in
- All insights explainable with data references

## Module Boundaries

### Engines (Deterministic)
- Treadmill Progression: Rule-based adaptation
- Health Momentum: Weighted component scoring
- No LLM calls in critical paths

### UI Layer
- Dashboard: Read-only overview
- Forms: Validated data entry
- Charts: Time-series visualization

### API Layer
- RESTful endpoints
- Idempotency for OpenClaw intake
- Audit logging on all writes

## Heartbeat Rationale

Supabase free tier pauses after 7 days of inactivity. For a health tracking app, this is unacceptable.

**Solution:**
- `/api/healthz` endpoint with DB query
- GitHub Actions workflow (2x/week)
- Alternative: UptimeRobot/cron-job.org
- Audit log tracks all pings

**Recovery:** See RUNBOOK.md for unpausing steps.
