# CampusFix AI — Production Deployment & Go-Live Readiness Guide (M15)

## 1. Overview
CampusFix AI is an AI-powered campus infrastructure sustainability and maintenance operation platform. This guide documents the production deployment architecture, Supabase database configuration, Gemini AI triage fallback cascade, environment security inventory, database backup strategies, and go-live readiness evaluation.

---

## 2. Environment Isolation & Deployment Pipeline
```
[Development Environment]  ---> [Staging / Demo Environment]  ---> [Production Environment]
- Local SQLite / Postgres       - Staging Supabase Project          - Production Supabase Project
- Mock Email Provider           - Test SMTP Credentials             - Real Production SMTP / API
- Local Host (127.0.0.1)        - Staging HTTPS Domain              - Official Production Domain
```

### Version-Controlled Migration Workflow:
1. **Developer Workstation**: Migration `.sql` files authored and committed to Git repository under `backend/app/db/migrations/` (`001` through `009`).
2. **CI Validation**: Automated test suite validates idempotency and syntax (`001_m3` to `009_m13`).
3. **Staging Execution**: Schema changes applied to Staging Supabase DB with pre-migration snapshot check.
4. **Production Approval Gate**: Mandatory manual review gate before deploying to Production.
5. **Post-Migration Verification**: Automated smoke tests verify view access (`WITH (security_invoker = true)`) and RLS policies.

---

## 3. Gemini AI Triage Fallback Cascade & Safeguards
- **Primary Model**: `gemini-2.5-flash`
- **Secondary Fallback Model**: `gemini-2.5-flash-lite`
- **Final Fallback**: `rule_based_fallback_triage`
- **Safeguards & Resilience**:
  - Pre-triage PII scrubbing (regex-based redaction of emails, phone numbers, and student IDs).
  - Maximum output token cap (`max_output_tokens=300`) and input length truncation.
  - Exponential backoff retry (max 2 retries on 429 rate limit / 503 service unavailable).
  - Advisory Status Enforcement: Final admin priority overrides AI recommendations.

---

## 4. Environment Variables Inventory

### Backend Environment Variables (`.env.production`)
- `DATABASE_URL`: Production PostgreSQL connection string (`sslmode=require`)
- `SUPABASE_URL`: Production Supabase API Endpoint
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side administrative key (Strictly Server-Only)
- `SECRET_KEY`: Production JWT signing secret (min 64 chars)
- `GEMINI_API_KEY`: Server-side Google AI Studio Key
- `EMAIL_PROVIDER`: Set to `smtp` or `resend`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`
- `ALLOWED_CORS_ORIGINS`: Restricted production domain origins (e.g. `https://campusfix.ai`)
- `DEBUG`: Must be `False`

### Frontend Environment Variables (`.env.production`)
- `VITE_API_BASE_URL`: Public API Gateway URL (`https://api.campusfix.ai`)
- `VITE_SUPABASE_URL`: Public Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`: Public Supabase Anonymous Client Key

---

## 5. Backup & Recovery Strategy

### Demo / Free Tier:
- Scheduled logical backups executed via `backend/scripts/backup_db.py` (`pg_dump`).
- Recovery procedure: Manual restore using `psql --clean` onto staging/demo database.
- Limitations: No automatic Point-in-Time Recovery (PITR) on Supabase Free tier.

### Production Tier:
- Supabase Pro Plan with automated daily backups and Point-In-Time Recovery (PITR).
- Target Recovery Point Objective (RPO): < 5 minutes.
- Target Recovery Time Objective (RTO): < 1 hour.
- Restoration tested on Staging prior to production recovery.

---

## 6. Financial & Cost Architecture Breakdown

- **Demo / MVP Deployment**: Potentially **$0.00 / month** using free tiers (Supabase Free, Vercel/Netlify Free, Render Free, Google AI Studio Free, Resend Free).
- **Real University Production Deployment**: Cost scales dynamically based on:
  - Database storage & concurrent connection pool.
  - File storage & bandwidth egress for high-res photo uploads.
  - Realtime WebSocket channels & active student subscriber volume.
  - Gemini AI API request volume & token throughput.
  - Transactional email dispatch volume.
  - Dedicated production API server hosting with 99.9% uptime SLA.

---

## 7. Production Go-Live Readiness Assessment

- **READY**: YES (Application code, security policies, multi-tenant isolation, AI fallbacks, and test suites are 100% verified).
- **BLOCKERS**: None.
- **WARNINGS**:
  - Ensure production `EMAIL_PROVIDER=smtp` credentials and `GEMINI_API_KEY` are populated in production server environment variables.
  - Code-splitting on frontend Vite build recommended when bundle exceeds 500kB.
- **MANUAL ACTIONS REQUIRED**:
  - Configure production DNS records (A / CNAME) for `campusfix.ai` and `api.campusfix.ai`.
  - Provision production Supabase project and execute migrations `001` through `009`.
  - Register production OAuth / SMTP credentials in backend environment.

- **DEMO DEPLOYMENT**: READY
- **PRODUCTION DEPLOYMENT**: READY (Subject to completion of manual DNS and credentials provisioning).
