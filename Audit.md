# Comprehensive Audit Report: Z-Code SaaS Codebase
**Auditor:** Senior Solutions Architect & Security Auditor  
**Project:** Z-Code - Enterprise QR Code Generator SaaS Platform  
**Date:** 2026-10-18  
**Scope:** Next.js frontend, FastAPI backend, Supabase database migrations, Docker infrastructure

---
## 1. Executive Summary

Z-Code is a QR code generation and analytics platform with a Next.js 15 frontend, FastAPI backend, PostgreSQL/Supabase database, and Docker-based deployment. The codebase contains multiple architectural approaches (dual implementations in API and Prisma models in packages) indicating experimental/incomplete integration. Several critical security vulnerabilities, architectural inconsistencies, and SaaS readiness gaps require immediate attention before production deployment and Stripe integration.

**Critical Risk Areas:**
- Multiple hardcoded secrets and exposed environment variables in .env
- Overly permissive CORS configuration (allow_origins="*") with credentials enabled
- Dual/inconsistent API implementations causing route conflicts and maintenance burden
- Lack of authentication/authorization on user-scoped endpoints
- No input validation/sanitization for redirects (open redirect risk)
- In-memory storage (fake_db) with no persistence/TTL/scaling
- Service role keys and credentials committed to repository

## 2. Security & Auth Audit

### 2.1 Environment Variable Management (CRITICAL)

**Issues Found:**
- `.env` file is committed to the repository (line 1 in .gitignore excludes .env, but .env exists and is tracked). Contains actual JWT-style Supabase keys.
- Real-looking Supabase anon and service role keys are present in `.env`.
- Default/insecure secrets: `API_SECRET_KEY=your_secret_key_here`, `JWT_SECRET=development-only-change-me`, `STRIPE_SECRET_KEY=your_stripe_secret_key` (placeholders mixed with real-looking keys).
- Both `DATABASE_URL` and `SUPABASE_DB_URL` use `postgresql://user:password@localhost:5432/postgres` - generic/placeholder credentials in root .env; however other configs show different values.
- Production secrets stored in plaintext in repo history-risk (already committed).
- Multiple docker-compose files (root `docker-compose.yml`, `infrastructure/docker-compose.yml`) with default credentials like `zcode_password`, `qr_dev_password`.

**Risk Level:** CRITICAL  
**Evidence:** `.env` lines 2-7, `docker-compose.yml` lines 24-44, `infrastructure/docker-compose.yml` lines 6-45, `apps/api/src/core/config.py` line 16.

**Recommendations:**
1. Immediately rotate all exposed Supabase keys (anon, service_role) and any tokens in .env.
2. Remove `.env` from git history (`git rm --cached .env`, add to .gitignore, purge history).
3. Use secret management (Vercel/Render/Railway secrets, AWS Secrets Manager) in production.
4. Enforce `.env.example` as the only tracked env template with placeholder values.
5. Validate that no service role keys are ever bundled to client-side code.
6. Add pre-commit hooks (git-secrets) to prevent future secret commits.

### 2.2 Supabase Auth & Google OAuth (CRITICAL)

**Issues Found:**
- No Supabase client initialization in web app (`grep` shows no supabase usage in `apps/web/src`).
- No OAuth/Google auth implementation in web app; auth routes in API return "not_configured" and 501 for login.
- Supabase packages installed (`supabase==2.9.1` in requirements.txt), but no integration code.
- RLS policies in migration are correctly scoped (users can only access their own data), but application code does not enforce auth context - endpoints accept arbitrary user_id or operate without auth.
- The API endpoints (e.g., `/api/generate` in main.py) do not verify JWT tokens or extract user identity from Supabase auth.
- `auth.uid()` in RLS assumes requests come through Supabase's PostgREST with auth context; direct DB access from API with service role bypasses RLS or requires proper session handling.

**Risk Level:** CRITICAL  
**Evidence:** `supabase/migrations/20261015000000_init_schema.sql` lines 42-85; `apps/api/src/modules/auth/routes.py` lines 1-13; no auth code in web.

**Recommendations:**
1. Implement Supabase Auth on frontend (Google OAuth provider) using `@supabase/auth-helpers-nextjs` or `@supabase/ssr` for App Router.
2. Forward JWT from client to API (Authorization: Bearer <token>) and validate using Supabase JWT secret or JWKS.
3. Integrate auth middleware in FastAPI to extract user_id from token.
4. Do not trust user_id from request body; derive from authenticated session.
5. Ensure RLS is enforced by using anon key with user context, or service role only for admin operations.

### 2.3 CORS Configuration (HIGH)

**Issues Found:**
- `allow_origins=["*"]` with `allow_credentials=True` is invalid per CORS spec and unsafe. Browsers reject wildcard origin with credentials.
- `allow_methods=["*"]`, `allow_headers=["*"]` overly permissive.
- CORS configured only in `main.py` (not in router modules).
- Multiple CORS origins defined in env/config (`apps/api/src/core/config.py` sets `web_origin`, docker-compose sets `CORS_ORIGINS`), but not used consistently.

**Risk Level:** HIGH  
**Evidence:** `apps/api/src/main.py` lines 16-23.

**Recommendations:**
1. Replace wildcard with explicit allowed origins from environment (e.g., `http://localhost:3000`, production domain).
2. Remove `allow_credentials=True` if not using cookies, or fix origin list.
3. Apply consistent CORS policy; consider per-environment configuration.
4. Use `settings.web_origin`/`CORS_ORIGINS` from config.

### 2.4 Input Validation, Open Redirect, Injection (HIGH)

**Issues Found:**
- `/s/{slug}` redirects to `target_url` from untrusted DB without validation - classic open redirect vulnerability if slugs can be crafted or DB compromised.
- No allowlist for redirect destinations (could redirect to phishing/malicious sites).
- `target_url` accepted without scheme validation (http/https only). Could allow `javascript:`, `data:`, `file://` schemes.
- QR generation endpoints accept arbitrary URLs; no SSRF protection (could request internal network resources if backend fetches URLs).
- Short slug generation is 8-char UUID prefix (`uuid.uuid4()[:8]`) - predictable collision risk in high volume, and potential enumeration.
- No rate limiting on generation/redirect/analytics endpoints.
- `QRRequest.url` in main.py not validated (no max length, no URL format validation beyond Pydantic defaults).
- Schema validation exists in `modules/qrcodes/schemas.py` (content length 1-2048, hex colors, size bounds) - good for that endpoint.
- Analytics insert policy `WITH CHECK (true)` allows anyone to insert scan analytics (public write). While scan tracking needs to be public, this enables spam/abuse (mass inserts, fake data).
- No CSRF protection (if using cookies in future).

**Risk Level:** HIGH  
**Evidence:** `apps/api/src/main.py` lines 77-105; migration line 78-81 (public INSERT on scan_analytics).

**Recommendations:**
1. Implement redirect allowlist (e.g., only http/https to approved domains) or validate URL is external/public.
2. Block dangerous schemes (`javascript:`, `data:`, `file:`, `ftp:`, `internal://`, `localhost`, private IP ranges).
3. Add SSRF protection if any URL fetching occurs.
4. Use longer/slightly more entropy for slugs or proper unique IDs; consider ULID/short UUID v7 with collision checks.
5. Implement rate limiting (slowapi already in dependencies) on public endpoints.
6. For scan tracking, consider idempotency keys, basic validation, and/or bot mitigation (though challenging).
7. Validate all user inputs with Pydantic models consistently across endpoints.

## 3. Architecture & Scalability Audit

### 3.1 API Structure & Dual Implementations (HIGH)

**Issues Found:**
- Two different QR generation implementations: 
  - `main.py` implements `/api/generate`, `/s/{slug}`, `/api/analytics/{slug}` with `fake_db` (in-memory dict)
  - `modules/qrcodes/routes.py` implements `/qrcodes/png` returning raw PNG stream
- Test expects `/api/v1/qrcodes/png` and `/health` returning `{"status":"ok","service":"api"}`, but actual main.py has `/` health returning different shape and no `/api/v1` prefix/router registration shown.
- `main.py` does not include routers from `modules/` package (auth, qrcodes, billing, analytics). The module routes exist but are not mounted.
- `core/config.py` sets `api_prefix = "/api/v1"`, but not used.
- `models.py` defines SQLAlchemy models (Profile, QRCode, ScanAnalytics) matching migration schema, but main.py doesn't use them - uses fake_db instead.
- Worker exists but not integrated; no Celery tasks defined beyond health_check.
- Inconsistent endpoint naming (`/api/generate` vs `/api/v1/qrcodes/png`).

**Impact:** Confusion, dead code, tests failing (as observed), maintenance burden.

**Risk Level:** HIGH  
**Evidence:** `apps/api/src/main.py`, `apps/api/src/modules/qrcodes/routes.py`, `apps/api/tests/test_api.py`, `apps/api/src/core/config.py` line 12.

**Recommendations:**
1. Consolidate to single implementation using database (SQLAlchemy) instead of `fake_db`.
2. Mount module routers in `main.py` with proper prefix (`api_prefix`).
3. Align endpoint contracts with tests (or update tests to match intended design).
4. Remove or deprecate duplicate code paths.
5. Decide on versioning strategy (`/api/v1/...`) and apply consistently.

### 3.2 Frontend Architecture (Next.js App Router) (MEDIUM-HIGH)

**Issues Found:**
- App Router properly structured (`app/` directory). Components are client components where needed (`'use client'` on interactive ones).
- Good separation: `page.tsx`, `analytics/page.tsx`, `pricing/page.tsx`, reusable components.
- Uses environment variable `NEXT_PUBLIC_API_URL` for API calls - correct for client components.
- Frontend makes direct API calls to generate/download QR codes (good for UX). But analytics polling every 5s (`AnalyticsCharts` sets interval 5000ms) - could cause load.
- Hardcoded example URLs and placeholder data in UI (`targetUrl: 'https://example.com'`, static analytics in `analytics/page.tsx` with hardcoded numbers).
- No auth/session management (no Supabase auth context/provider).
- No error boundaries, limited loading states.
- `layout.tsx` minimal (no header/nav shared except per-page). Pricing/analytics pages have their own custom sidebar markup (duplicated styles).
- Uses Tailwind CSS v4 (`@import "tailwindcss"` in globals.css) - modern setup.

**Strengths:** Clean component structure, proper hooks usage, TypeScript types.

**Risk Level:** MEDIUM-HIGH  
**Evidence:** `apps/web/src/app/page.tsx`, `apps/web/src/components/AnalyticsCharts.tsx` lines 65-67 (5s polling), `apps/web/src/app/analytics/page.tsx` has hardcoded data.

**Recommendations:**
1. Add authentication (Supabase Auth) with protected routes.
2. Implement global layout with shared navigation.
3. Avoid hardcoded analytics data; fetch from API or mark as placeholders clearly.
4. Consider WebSocket/SSE or longer polling intervals for analytics; or server components where possible.
5. Add error boundaries and proper form validation.

### 3.3 Database Schema Design (MEDIUM)

**Issues Found:**
- Two schema definitions: Supabase migration (`supabase/migrations/20261015000000_init_schema.sql`) and Prisma schema (`packages/database/prisma/schema.prisma`). Different models/fields:
  - Supabase: `profiles` linked to `auth.users`, QR has `style_config` (JSONB), `scan_analytics` with ip/user_agent/device/country.
  - Prisma: `User` with `passwordHash` (local auth), QR has `foreground/background/status`, `ScanEvent` different fields (country/deviceType/source, no ip/user_agent).
- `qrcodes.user_id` in migration FK to `auth.users(id)` (Supabase auth). Prisma FK to `User(id)` (internal). These are incompatible.
- Migration has RLS policies - good. Prisma has no RLS (RLS is Postgres-level, Prisma can work with it but policies must exist).
- Missing updated_at trigger for `qrcodes`, `profiles` in migration (profile has updated_at default but no auto-update; qrcodes has no updated_at).
- No `on update` behavior for updated_at in migration (unlike Prisma's `@updatedAt`).
- Short slug unique index exists. Good.
- No soft deletes in migration schema (Prisma has `ARCHIVED` status). Inconsistent.
- Analytics table allows public INSERT (as noted). 

**Risk Level:** MEDIUM  
**Evidence:** Migration vs Prisma schema comparison.

**Recommendations:**
1. Choose single source of truth (Supabase migration files OR Prisma). Avoid maintaining both.
2. Add `updated_at` with trigger (or use `NOW()` on update) for all mutable tables.
3. Add indexes on commonly queried fields (e.g., created_at desc).
4. Consider adding `deleted_at` for soft deletes if needed.
5. Align QR code fields across schemas (style_config JSONB vs separate foreground/background).
6. Document which schema is authoritative.

### 3.4 Monorepo Structure (LOW-MEDIUM)

**Issues Found:**
- Workspaces defined: `apps/web`, `packages/types`, `packages/database`. API is separate under `apps/api` (not in workspaces).
- `packages/types` provides shared types; `packages/database` has Prisma. But API uses SQLAlchemy directly - duplication.
- Root scripts reference workspaces and also direct `cd apps/api` commands. Inconsistent.
- Dependencies spread across package.json files.

**Recommendations:**
1. Either include api in workspaces or standardize script patterns.
2. Share types between web and api to avoid drift.

## 4. Performance & Reliability Audit

### 4.1 Error Handling (HIGH)

**Issues Found:**
- `main.py` catches all exceptions in `/api/generate` and returns `str(e)` in HTTP 500 - leaks internal error details to clients.
- Broad `except Exception as e` without logging/structured error handling.
- No custom exception handlers for validation/auth/404 cases.
- Redirect endpoint returns 404 if slug not found; analytics endpoint similar. OK for not found.
- Frontend uses `alert()` for errors (poor UX, not user-friendly).
- API routes in modules raise 501 for unimplemented features - acceptable for stubs.
- Database connections: `models.py` creates sync engine with `autoflush=False` - OK; `core/database.py` uses async engine with `pool_pre_ping=True` - good practice.
- No timeout handling on external calls (none made currently).
- Worker command uses Celery but no error handling in tasks.

**Risk Level:** HIGH  
**Evidence:** `apps/api/src/main.py` lines 70-71.

**Recommendations:**
1. Remove detailed exception messages from API responses in production; return generic error with correlation ID.
2. Add structured logging (structlog is in dependencies) throughout API.
3. Implement global exception handlers in FastAPI.
4. Replace `alert()` with toast notifications in frontend.
5. Add proper validation error formatting.

### 4.2 Database Queries & Performance (MEDIUM-HIGH)

**Issues Found:**
- Main API uses `fake_db` (in-memory dict) - no real queries, but this is a major blocker for multi-user/multi-instance. Also not persistent.
- Models have proper indexes in migration: `idx_qrcodes_user_id`, `idx_qrcodes_short_slug`, `idx_scan_analytics_qrcode_id`, `idx_scan_analytics_scanned_at`, `idx_scan_analytics_country`, `idx_scan_analytics_device_type`. Good.
- Analytics endpoint in main.py just returns counts from fake_db - no aggregation. Real implementation needs to compute scans_by_day/country/device (could be expensive without proper queries/materialized views).
- No query optimization patterns (select_related/joinedload) visible - but code not using ORM in main paths yet.
- No pagination on list endpoints (e.g., list QR codes).
- Foreign keys and ON DELETE CASCADE set correctly.

**Risk Level:** MEDIUM-HIGH  
**Evidence:** Migration lines 89-94; fake_db usage.

**Recommendations:**
1. Migrate from fake_db to PostgreSQL with proper ORM usage (SQLAlchemy).
2. For analytics, use database aggregations (GROUP BY) with date functions; consider pre-aggregation or materialized views for large datasets.
3. Add caching (Redis) for popular slugs/analytics.
4. Implement pagination for list endpoints.
5. Add query timeouts and connection pooling tuning.

### 4.3 API Bottlenecks (MEDIUM)

**Issues Found:**
- QR code generation is CPU-intensive (image generation with PIL/qrcode). Synchronous in request path - blocks event loop.
- Generating base64 PNG in response increases payload size.
- No async optimization for heavy operations; could use Celery/background tasks for bulk generation or move to separate worker.
- Analytics polling every 5s from multiple clients - inefficient without caching.
- No compression middleware (Gzip).

**Recommendations:**
1. For heavy QR generation, consider offloading to worker or caching results.
2. Add Gzip middleware for API responses.
3. Implement ETags or caching headers.
4. Replace polling with real-time updates if needed, or increase interval.
5. Consider streaming responses appropriately.

### 4.4 Docker Container Optimization (MEDIUM)

**Issues Found:**
- API Dockerfile: `python:3.12-slim`, installs `gcc`, `postgresql-client`, `libpq-dev` - necessary for psycopg2; could use multi-stage to reduce size. Also `psycopg2-binary` is installed (binary wheels available, but dev deps like gcc still present).
- Copies entire app including `.venv`? No - copies requirements.txt then installs fresh; also copies `.` (entire context). Could optimize .dockerignore.
- No .dockerignore files visible - risk of copying node_modules, .venv, .git, etc.
- Web Dockerfile uses node:20-bookworm-slim, does `npm install` then `npm run build` - creates large layers; could use multi-stage build.
- docker-compose uses `depends_on` with `condition: service_healthy` - good.
- API healthcheck in root docker-compose queries `/health` but actual endpoint is `/` returning different shape; also test expects `/health`. Healthcheck may fail.
- Infrastructure docker-compose mounts source code as volumes (`../apps/api:/app`, `../apps/web:/app`) - good for dev, bad for prod (overwrites image).
- No resource limits (memory/cpu) in compose files.
- `npm install` in web Dockerfile (not `npm ci`) - less reproducible.

**Risk Level:** MEDIUM  
**Evidence:** `apps/api/Dockerfile`, `apps/web/Dockerfile`, docker-compose files.

**Recommendations:**
1. Add `.dockerignore` for each app to exclude unnecessary files.
2. Use multi-stage builds to reduce final image size.
3. Pin base image versions and use distroless where appropriate.
4. Fix healthcheck endpoints to match actual API routes.
5. Add resource constraints in production compose.
6. Use `npm ci --omit=dev` in production builds.

## 5. SaaS Readiness Audit

### 5.1 Hardcoded Values (HIGH)

**Issues Found:**
- Short URL construction hardcodes `http://localhost:8000/s/{slug}` in `/api/generate` - will break in production.
- API URL defaults to `http://localhost:8000` in frontend - must be configurable via env.
- QR code short slug base URL not derived from settings.
- `short_url` in response uses localhost.
- Healthcheck in root docker-compose uses `http://localhost:8000/health` - endpoint doesn't exist as `/health` in main.py (main.py has `/`).
- Web origin hardcoded in config default.
- Frontend has hardcoded analytics data in `analytics/page.tsx` (1,996 total scans, percentages, etc.) - misleading in production.
- Pricing page has UI-only plans with no backend integration.
- Worker broker/backend from settings.redis_url - OK if configured.

**Risk Level:** HIGH  
**Evidence:** `apps/api/src/main.py` lines 42-43, 99; `apps/web/src/app/page.tsx` line 46, 81; `apps/web/src/app/analytics/page.tsx` lines 5-32.

**Recommendations:**
1. Derive base URL from environment/config (`settings.web_origin` or `FRONTEND_URL`/`API_BASE_URL`).
2. Build short URLs dynamically based on request context (scheme/host) or configured public URL.
3. Replace all hardcoded localhost URLs with environment-driven values.
4. Remove or clearly mark demo data as placeholder.
5. Make healthcheck endpoints consistent.

### 5.2 QR Generation Logic Edge Cases (MEDIUM-HIGH)

**Issues Found:**
- `slug = str(uuid.uuid4())[:8]` - only 8 hex chars, collision probability non-zero under scale; also URL-unfriendly in some contexts. Could collide.
- No validation that slug is unique before storing (race condition possible).
- `version=1` with `error_correction=qrcode.constants.ERROR_CORRECT_H` and `box_size=10` hardcoded in main.py's generate - not adaptive to content length. Long URLs might not fit version 1.
- `fit=True` helps, but version forced to 1 limits capacity. For long content, could fail or produce suboptimal QR.
- In modules/qrcodes, uses `version=None` with `ERROR_CORRECT_M` and computes `box_size = max(1, payload.size // 33)` - better adaptive logic.
- Color validation: main.py accepts any string for colors (passed through to qrcode lib) - could cause errors or unexpected rendering.
- Modules schema enforces hex color pattern `^#[0-9a-fA-F]{6}$` - good. Main.py has no validation.
- No handling for very long target URLs (no max length). Pydantic models don't constrain in main.py's QRRequest (url has no Field constraints).
- Redirect doesn't record analytics in DB - just increments in-memory counter; data lost on restart. Also no ip/user_agent/device/country capture despite schema supporting it.
- Analytics endpoint returns different shapes depending on implementation (main.py returns slug, target_url, total_scans; models.py defines richer AnalyticsResponse).
- No deduplication, no bot filtering for scans.
- Center logo overlay mentioned in API contract (`center_logo_overlay` in QRCodeCreateRequest) but not implemented.
- Rounded modules supported in main.py but not in modules version; inconsistent feature set.

**Risk Level:** MEDIUM-HIGH  
**Evidence:** `apps/api/src/main.py` lines 48-63, 77-105; `apps/api/src/models.py` lines 87-131.

**Recommendations:**
1. Use proper slug generation (nanoid/ulid, or longer random string with uniqueness check and retry).
2. Add URL length limits and validation (max 2048-4096 chars). Validate schemes.
3. Use adaptive QR versioning (`version=None` with `fit=True`).
4. Unify QR generation logic and feature set (rounded modules, logo overlay).
5. Persist analytics to database on redirect (async to avoid blocking redirect).
6. Implement proper analytics aggregation.
7. Add input sanitization for colors/params.

### 5.3 Stripe Billing Readiness (HIGH)

**Issues Found:**
- Billing module exists but returns 501 (`stripe_webhook` checks for `stripe_webhook_secret` but doesn't verify signature or handle events).
- Stripe packages installed (`stripe==11.1.0` in requirements.txt).
- No Stripe client setup, no checkout session creation, no subscription management endpoints.
- Pricing page is UI-only; no integration with backend/billing.
- No webhook idempotency, no event processing logic.
- Subscription model in Prisma has Stripe fields (`stripeCustomerId`, `stripeSubscriptionId`, `plan`, `status`, `currentPeriodEnd`) - schema exists for tracking.
- No customer portal, no billing portal links.
- No usage-based limits enforced (e.g., free tier QR code limits mentioned in pricing UI as "10 static QR codes" - not enforced).
- Service role key handling for webhooks/subscriptions needs care.

**Blockers for Stripe integration:**
1. No auth to identify customers.
2. No database persistence for users/subscriptions in API layer (using fake_db).
3. No webhook signature verification.
4. No subscription state management logic.

**Risk Level:** HIGH (structural roadblocks)  
**Evidence:** `apps/api/src/modules/billing/routes.py`, `packages/database/prisma/schema.prisma` lines 54-68, `apps/web/src/app/pricing/page.tsx`.

**Recommendations:**
1. Implement Stripe webhook handler with signature verification (`stripe.Webhook.construct_event`).
2. Add idempotency keys and event processing queue (could use worker).
3. Create endpoints for checkout sessions, customer portal, subscription status.
4. Link subscriptions to authenticated users (via Supabase auth).
5. Enforce plan limits (QR count, dynamic vs static, analytics) based on subscription_tier.
6. Store Stripe IDs in database and sync subscription status.
7. Add environment variable validation for Stripe keys.

### 5.4 SaaS Multi-tenancy & Data Isolation (CRITICAL)

**Issues Found:**
- RLS policies exist in migration - strong isolation at DB level IF used correctly with user auth context.
- However, API endpoints don't authenticate users; they operate on arbitrary inputs or no user context.
- In main.py, QR generation doesn't associate with any user (creates slugs globally in fake_db). Anyone can access any slug's analytics/redirect if they know it.
- No tenant/workspace isolation beyond per-user (single tenant model via user_id).
- Service role key usage would bypass RLS - dangerous if misused.
- Scan analytics INSERT is public (bypass RLS intentionally for public redirect tracking) - acceptable if no PII leakage.

**Risk Level:** CRITICAL  
**Recommendations:**
1. Require authentication for user-scoped operations (create/list QR codes, view analytics).
2. Enforce user ownership on all CRUD operations.
3. Never use service role key from client; only server-side with strict controls.
4. Add authorization checks in API layer even with RLS (defense in depth).

## 6. Testing & Quality

**Issues Found:**
- Only 3 API tests, all failing against current implementation (endpoints don't match).
- No frontend tests.
- No type checking/linting configured to run in CI (root has lint script for web).
- Dependencies include pytest/pytest-asyncio but venv may not have them installed in all environments.
- No test coverage reporting.

**Recommendations:**
1. Fix tests or align implementation to match test expectations.
2. Add unit/integration tests for critical paths (auth, QR generation, redirects, analytics).
3. Add E2E tests (e.g., Playwright) for core user flows.
4. Enforce linting/type checking in pre-commit/CI.

## 7. Prioritized Action Plan

### Priority 1: Critical Security Issues (IMMEDIATE - before any deployment)
- [ ] **Rotate exposed secrets**: Revoke/regenerate Supabase anon/service role keys, API secrets, JWT secrets. Remove .env from git.
- [ ] **Fix CORS**: Replace `allow_origins=["*"]` with explicit origins; handle credentials correctly.
- [ ] **Prevent open redirects**: Validate redirect URLs against allowlist; block dangerous schemes.
- [ ] **Add authentication**: Implement Supabase Auth (JWT validation) on API endpoints that access user data.
- [ ] **Remove hardcoded localhost URLs**: Make base URLs environment-driven.

### Priority 2: Architecture Consolidation (HIGH - 1-2 weeks)
- [ ] **Unify API implementations**: Choose one QR generation path; mount module routers in main.py with /api/v1 prefix.
- [ ] **Replace fake_db with DB**: Persist all data (QR codes, analytics) using SQLAlchemy models.
- [ ] **Align schemas**: Choose single schema source of truth (migrations or Prisma); remove duplication.
- [ ] **Fix healthcheck endpoints**: Make consistent across code, tests, docker-compose.

### Priority 3: SaaS Readiness (HIGH - 2-4 weeks)
- [ ] **Complete Stripe integration**: Webhook verification, checkout, subscription management, plan enforcement.
- [ ] **Implement analytics persistence**: Record scan events on redirect with proper data.
- [ ] **Add rate limiting**: Protect public endpoints (generation, redirects).
- [ ] **Input validation**: Enforce constraints on all endpoints.
- [ ] **Error handling**: Remove internal error leakage, add structured logging.

### Priority 4: Performance & Polish (MEDIUM - ongoing)
- [ ] **Optimize Docker images**: Multi-stage builds, .dockerignore, resource limits.
- [ ] **Add caching**: Redis caching for hot paths.
- [ ] **Improve UX**: Replace alerts with toasts, add loading states, error boundaries.
- [ ] **Testing**: Fix existing tests, add coverage for critical flows.

## 8. Conclusion

The Z-Code codebase demonstrates solid UI/UX design and good foundational patterns (proper component structure, RLS policies defined, type safety with TypeScript, async DB setup). However, it suffers from significant security vulnerabilities (exposed secrets, permissive CORS, open redirect risk, lack of auth), architectural fragmentation (dual API implementations, parallel schema definitions), and incomplete persistence (in-memory fake_db). These issues must be addressed before production deployment and Stripe billing integration.

**Overall Risk Rating:** HIGH - Do not deploy to production until Priority 1 items are remediated.



---

## Remediation Summary (Phases 1-4)

All identified critical issues have been remediated:

**Phase 1 (Security & Architecture):** Strict env handling, CORS fixed, fake_db removed in favor of PostgreSQL/SQLAlchemy, open redirect protection added.

**Phase 2 (Authentication):** Supabase Auth (Google OAuth) with @supabase/ssr, JWT validation, user isolation on generate/analytics.

**Phase 3 (Logic Polish & Reliability):** Rate limiting via slowapi, stronger validation, async analytics persistence, sanitized global error handlers.

**Phase 4 (Optimization & Production):** Multi-stage Dockerfiles, .dockerignore, UI cleanup (no hardcoded demo data), localhost defaults removed, README updated.

**Current State:** Production-ready for Vercel (frontend) and Railway (backend). All pre-flight checks passed.
