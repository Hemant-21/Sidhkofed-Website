# SIDHKOFED CMS — Future Enhancements (Phase 18 Roadmap)

**Version:** 1.0.0  
**Date:** 2026-06-27  
**Status:** Planned — not committed

---

## Overview

Phase 18 builds on the stable v1.0.0 foundation. The architecture frozen in Phase 1-17 supports all enhancements listed here without structural changes. No Phase 18 item requires modifying the core API contract, database schema patterns, or application architecture.

---

## Priority 1 — Production Hardening (Carry-forward from v1.0.0 Known Limitations)

### P1-1: Image Processing Pipeline
**What:** Auto-generate thumbnail, medium, and original variants on media upload.  
**How:** Integrate Sharp.js in `src/services/storage/`; replace TODO markers in `media.validation.ts`.  
**Benefit:** Faster page loads; bandwidth savings; CDN-cacheable variants.

### P1-2: Email Transport (nodemailer)
**What:** Replace custom SMTP with nodemailer transport.  
**How:** `npm install nodemailer @types/nodemailer` in API workspace; replace `sendViaSMTP()` body.  
**Benefit:** Battle-tested library; supports OAuth2, connection pooling, STARTTLS.

### P1-3: Integration Test CI Job
**What:** Run 111 currently-skipped integration tests in a dedicated CI job with service containers.  
**How:** Add `integration-test` job to `ci.yml` with `postgres` and `redis` services; set `INTEGRATION=true`.  
**Benefit:** Closes the gap in test coverage for DB and Redis behaviours.

### P1-4: WCAG AA Automated Browser Tests
**What:** axe-core / Playwright accessibility scans in CI.  
**How:** Add `@axe-core/playwright` to the E2E suite; run on critical public pages.  
**Benefit:** Catches dynamic accessibility regressions automatically.

### P1-5: Version Bump + Git Tag
**What:** Bump `package.json` versions to `1.0.0`; create `v1.0.0` git tag.  
**How:** `npm version 1.0.0` in each workspace; `git tag v1.0.0`.

---

## Priority 2 — Feature Enhancements

### P2-1: AI-Powered Search
**What:** Semantic / vector search across CMS content (events, documents, programmes, etc.).  
**How:** Integrate pgvector (PostgreSQL extension); embed content at publish time; expose via `/search?q=`.  
**Benefit:** Richer search relevance; natural language queries.

### P2-2: Advanced Analytics Dashboard
**What:** Real-time usage metrics for content managers (page views, popular content, enquiry trends).  
**How:** Lightweight analytics event capture → timeseries table → admin dashboard panels.  
**Benefit:** Data-driven content decisions without external analytics dependency.

### P2-3: GIS / District Dashboard
**What:** Map-based visualisation of SIDHKOFED activities by district/block.  
**How:** Leverage existing `District` and `Block` master tables; add coordinate data; integrate Leaflet or MapLibre in public website.  
**Benefit:** Visual geographic representation of cooperative activity.

### P2-4: Workflow Automation (Scheduled Actions)
**What:** Content managers set publish/archive dates per record; system applies automatically.  
**How:** The `scheduled_publish_at` field already exists in schema; extend scheduler job to also handle `scheduled_archive_at`.  
**Benefit:** Editorial planning across multiple time zones.

### P2-5: Real-Time Notifications (WebSockets)
**What:** Push notifications to admin users for new enquiries, scheduled publish completions.  
**How:** Add WebSocket gateway to API; emit events on enquiry creation and scheduler completions.  
**Benefit:** Operators notified immediately without polling.

---

## Priority 3 — Integration

### P3-1: SMS Gateway
**What:** SMS notification on enquiry submission (to enquiry recipient mobile).  
**How:** Pluggable SMS provider (Twilio, MSG91, Kaleyra) alongside existing email service.  
**Benefit:** Instant mobile alert for CMS operators.

### P3-2: WhatsApp Integration
**What:** WhatsApp Business API message on enquiry submission.  
**How:** Meta / WABA API integration in the notification service.  
**Benefit:** Preferred channel for India-based operator communication.

### P3-3: PFMS Integration (Public Financial Management System)
**What:** Read tender/procurement data from PFMS API and surface on public website.  
**How:** Scheduled sync job pulls PFMS data into `Tender` / `ProcurementUpdate` tables; public API unchanged.  
**Benefit:** Authoritative procurement data without manual re-entry.

### P3-4: ERP / MIS Integration
**What:** Sync cooperative member data, commodity volumes, and beneficiary counts from ERP/MIS systems.  
**How:** ETL job into dedicated integration tables; public website reads from CMS (not directly from ERP).  
**Benefit:** Keeps Phase 1 boundary intact; ERP is the system of record; CMS is the public face.

### P3-5: Open Data APIs (Public REST)
**What:** Versioned, documented public API for third-party consumers (media, government portals, research).  
**How:** Expose `/api/v1/open/` namespace; API key authentication; rate limiting per key.  
**Benefit:** Enables data re-use; positions SIDHKOFED as an open-data institution.

---

## Priority 4 — Platform Improvements

### P4-1: CDN Integration
**What:** Serve media files and static Next.js assets via CDN.  
**How:** Set `NEXT_PUBLIC_CDN_URL`; configure Nginx or CloudFront to serve from S3 bucket.  
**Benefit:** Global performance; reduces origin server load.

### P4-2: Horizontal API Scaling
**What:** Run multiple API instances behind Nginx load balancer.  
**How:** All prerequisites met: Redis session store (already used), S3 media (already supported), stateless API.  
**Benefit:** Higher throughput; zero-downtime rolling restarts.

### P4-3: PostgreSQL Read Replica
**What:** Route read-heavy queries to a replica; writes go to primary.  
**How:** Add replica `DATABASE_REPLICA_URL`; Prisma supports read replica via `$replica()` client extension.  
**Benefit:** Reduces load on primary; improves read latency.

### P4-4: Full E2E Test Suite (Playwright)
**What:** Automated end-to-end tests for critical user journeys (public user, content editor, publisher).  
**How:** Playwright targeting the public website and Admin CMS; run in CI against a seeded test database.  
**Benefit:** Catches regressions in the full user journey, not just unit and integration level.

---

## Guiding Constraint for Phase 18

**The architecture documents remain frozen for Phase 18.** All enhancements are additive. No Phase 18 work may:
- Change the existing REST API contract without a versioned API upgrade path
- Modify existing Prisma model fields (only additions permitted)
- Introduce client-side metric computation in the dashboard module
- Add ERP/MIS data directly to Phase 1 content modules

When a Phase 18 feature requires a schema change, it must be delivered as a new `prisma migrate` file — never by altering an existing one.
