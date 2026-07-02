# SIDHKOFED CMS — Release Notes

**Release:** v1.0.0  
**Date:** 2026-06-27  
**Type:** Initial Production Release  

---

## Overview

Version 1.0.0 is the first production release of the SIDHKOFED CMS & Public Portal. It delivers the complete headless CMS, Admin editorial interface, and public-facing website for the Jharkhand Cooperative Federation (SIDHKOFED). This release is the culmination of 17 development phases.

---

## What's Included

### Backend API (`/api`)
A fully featured REST API built with Express 4 / TypeScript / Prisma ORM, serving 25 content modules:

- **Content modules:** Events & News, Programmes & Schemes, Toolkits, Institutions, Official Communications, Tenders, Procurement Updates, Pages, FAQs, Digital Services, Success Stories (via Events)
- **Media system:** Upload, gallery management, video management; local or S3 storage
- **Membership:** Institutional membership register with product/commodity linking
- **Dashboard:** Fixed report system with nested metrics and dataset upload (Excel import)
- **Masters:** Shared reference data (event types, districts, commodities, institution types, etc.)
- **Enquiries:** Public enquiry submission with CAPTCHA, rate limiting, email notification
- **Search:** Full-text cross-module search
- **Auth:** JWT access/refresh token authentication; bcrypt password hashing
- **RBAC:** Role-based access control with granular per-module permissions
- **Users:** Admin user management (Super Admin only)
- **Settings:** CMS configuration key-value store
- **Audit Log:** Immutable record of all admin actions
- **Scheduler:** 4 background jobs (event status, highlight expiry, scheduled publishing, dashboard refresh)
- **Health:** `/live`, `/ready`, `/health` endpoints for container orchestration

### Admin CMS (`/admin`)
A Next.js 14 App Router editorial interface with:
- 25+ feature modules matching the backend
- Full CRUD with publish/unpublish/archive workflows
- Bilingual content fields (English + Hindi)
- Media library with drag-and-drop upload
- Dashboard data management (datasets + metrics)
- User and role management
- Audit log viewer
- Settings management
- Responsive design, dark/light theme support

### Public Website (`/`)
A Next.js 14 public-facing website with:
- Homepage with dynamic sections (news, events, programmes, stats)
- 20 public content routes (events, documents, programmes, toolkits, institutions, communications, tenders, procurement updates, pages, FAQs, digital services, memberships, galleries, videos, search, contact, dashboard)
- Bilingual support (English / Hindi)
- SEO: robots.txt, sitemap.xml, meta tags, Open Graph
- ISR (Incremental Static Regeneration) for performance

### DevOps & Infrastructure
- Multi-stage Dockerfiles for all three services
- Docker Compose: development + production configurations
- Nginx reverse proxy with security headers and rate limiting
- GitHub Actions: CI, release, and security scanning workflows
- Backup and restore scripts (local + S3)
- Full operational documentation

---

## Database

- **Schema:** 62 models
- **Migrations:** 21 versioned migration files
- **Engine:** PostgreSQL 16

---

## Quality Metrics

| Metric | Value |
|--------|-------|
| Unit tests | 868 passing |
| Test files | 99 |
| TypeScript errors | 0 (all 3 workspaces) |
| ESLint errors | 0 (all 3 workspaces) |
| Coverage (statements) | ≥ 60% |
| Coverage (branches) | ≥ 50% |
| Coverage (functions) | ≥ 60% |
| Coverage (lines) | ≥ 65% |
| Prisma models | 62 |
| Backend modules | 25 |
| Admin features | 25+ |
| Public routes | 20 |

---

## Production Blocker Fixed in this Release

During Phase 17.5 acceptance testing, a production blocker was identified and fixed before release:

**Issue:** 46 Admin CMS source files contained committed git merge conflict markers, causing 561 TypeScript errors and preventing Admin CMS from building.  
**Fix:** All 46 files resolved; 12 residual type mismatches patched. Admin TypeScript: 0 errors.

---

## Known Limitations

1. **Image thumbnails:** Not auto-generated on upload. Full-size images are served. Scheduled for Phase 18.
2. **Image metadata stripping:** EXIF/metadata is not stripped from uploaded images. Scheduled for Phase 18.
3. **Email transport:** Uses a custom minimal SMTP client (Node.js built-ins). Verify with production SMTP credentials before go-live. nodemailer migration scheduled for Phase 18.
4. **Integration tests:** 111 tests skip in unit-only mode (require live PostgreSQL + Redis). Covered by staging smoke tests in the release pipeline.

---

## Breaking Changes

None — this is the initial production release.

---

## Upgrade Path

This is v1.0.0. Future releases will follow semantic versioning:
- Patch (1.0.x): bug fixes, no schema changes
- Minor (1.x.0): additive features, backwards-compatible schema migrations
- Major (x.0.0): breaking API changes, non-backwards-compatible schema changes

---

## Dependency Highlights

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20.x (LTS) | Runtime |
| Express | 4.x | API framework |
| Prisma | 6.x | ORM + migrations |
| Next.js | 14.x | Admin CMS + Public website |
| PostgreSQL | 16 | Database |
| Redis | 7 | Cache + rate limiting |
| Nginx | 1.27 | Reverse proxy |
| Docker | 24+ | Containerisation |
