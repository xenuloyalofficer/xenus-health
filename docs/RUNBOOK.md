# Runbook

## Local Development Setup

### Prerequisites
- Node.js 18+
- Supabase CLI
- Git

### 1. Clone and Install
```bash
git clone https://github.com/xenuloyalofficer/xenus-health.git
cd xenus-health/my-app
npm install
```

### 2. Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 3. Database Setup
```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 4. Run Dev Server
```bash
npm run dev
```

Open http://localhost:3000

---

## Supabase Project Setup

### 1. Create Project
- Go to https://app.supabase.com
- New Project → Name: "xenus-health"
- Region: Frankfurt (eu-central-1)
- Plan: Free Tier

### 2. Get Connection Strings
- Project Settings → API
- Copy `anon` and `service_role` keys
- Add to `.env.local`

### 3. Enable Auth
- Authentication → Providers
- Enable Email provider
- Configure email templates (optional)

---

## Heartbeat Setup

### Option A: GitHub Actions (Recommended)
1. Copy `.github/workflows/keepalive.yml`
2. Update URL to your deployed app
3. Commit and push

### Option B: UptimeRobot (Alternative)
1. Create free account at uptimerobot.com
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://your-app.vercel.app/api/healthz`
   - Interval: 30 minutes
3. Optional: Add email alerts

### Option C: cron-job.org (Alternative)
1. Create account at cron-job.org
2. New cron job:
   - URL: `https://your-app.vercel.app/api/healthz`
   - Schedule: Every 12 hours

---

## Troubleshooting

### Supabase Paused
**Symptoms:** API returns 503, healthz fails

**Recovery:**
1. Go to https://app.supabase.com
2. Select your project
3. Click "Restore Project"
4. Wait 2-3 minutes
5. Verify `/api/healthz` returns 200

### Database Connection Errors
**Check:**
```bash
supabase status
```

**Fix:**
```bash
supabase stop
supabase start
```

### Build Failures
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run build
```

---

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Vercel
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## Monitoring

### Health Check
```bash
curl https://your-app.vercel.app/api/healthz
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-08T...",
  "db": "connected"
}
```

### Audit Log Query
View keepalive pings:
```sql
SELECT * FROM audit_log 
WHERE source = 'keepalive' 
ORDER BY created_at DESC 
LIMIT 10;
```
