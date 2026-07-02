# SIDHKOFED CMS — Architecture Summary

**Version:** 1.0.0  
**Date:** 2026-06-27  
**Architecture Version:** Final (Frozen)

---

## 1. Product Identity

SIDHKOFED CMS & Public Portal is a lightweight headless CMS delivering a public institutional website for the Jharkhand Cooperative Federation. It is:

- A content management system for cooperative, institutional, and governance content
- A public-facing bilingual portal (English primary; Hindi first-class)
- A transparency and governance gateway (tenders, circulars, reports, procurement)
- A CMS-ready and ERP/MIS-ready platform (Phase 1 has no ERP dependency)

It is **not** an ERP, MIS, beneficiary management system, inventory system, accounting platform, or event registration system.

---

## 2. Three-Tier Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Tier 1 — Presentation                                   │
│  Admin CMS (Next.js 14)    Public Website (Next.js 14)   │
│  Port 3001                 Port 3002                     │
│  Internal-only auth        ISR + public reads             │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────▼─────────────────────────────────┐
│  Tier 2 — API                                            │
│  Express 4 + TypeScript + Prisma ORM                     │
│  Port 4000                                               │
│  JWT auth · RBAC · Rate limiting · CAPTCHA               │
└────────────────────────┬─────────────────────────────────┘
                         │ TCP (internal only)
┌────────────────────────▼─────────────────────────────────┐
│  Tier 3 — Data                                           │
│  PostgreSQL 16             Redis 7                       │
│  Primary data store        Session cache + rate limits   │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Backend Module Map (25 modules)

| Module | Public Endpoints | Admin Endpoints | Scheduler |
|--------|-----------------|-----------------|-----------|
| auth | — | login, refresh, logout, me | — |
| events | list, detail, related | CRUD, lifecycle | event-status.job |
| documents | list, detail | CRUD, lifecycle | — |
| programmes | list, detail | CRUD, lifecycle | — |
| toolkits | list, detail | CRUD, lifecycle | — |
| institutions | list, detail | CRUD, lifecycle | — |
| official-communications | list, detail | CRUD, lifecycle | — |
| tenders | list, detail | CRUD, lifecycle | — |
| procurement-updates | list, detail | CRUD, lifecycle | — |
| pages | detail by slug | CRUD | — |
| menus | by location | CRUD | — |
| galleries | list, detail | CRUD, lifecycle | — |
| videos | list, detail | CRUD, lifecycle | — |
| media | delivery URL | CRUD, upload | — |
| memberships | list, detail | CRUD | — |
| faqs | list | CRUD, lifecycle | — |
| digital-services | list, detail | CRUD, lifecycle | — |
| enquiries | POST (submit) | list, detail, export | — |
| dashboard | KPIs, reports | CRUD, lifecycle, datasets | dashboard-refresh.job |
| search | GET (query) | — | — |
| home | GET (aggregate) | — | — |
| masters | — | CRUD (all master tables) | — |
| users | — | CRUD | — |
| settings | GET (public keys) | CRUD | — |
| audit | — | list, detail | — |

---

## 4. Database Design

### Schema Stats
- **62 Prisma models** across identity, content, media, masters, and analytics domains
- **21 migration files** — versioned, sequential, applied via `prisma migrate deploy`

### Key Design Patterns
1. **`publication_state` enum** — `draft | published | archived` on all publishable entities; enforced at API layer
2. **Bilingual fields** — `*_en` + `*_hi` pairs on all content; public API returns both
3. **Soft delete** — Published records and linked assets are never hard-deleted
4. **URL stability** — `slug` fields set on creation; never mutated
5. **MediaUsage junction** — Assets linked to records via `MediaUsage`; prevents orphan deletion
6. **Tag system** — Reusable `Tag` model linked across content types
7. **Master data** — Shared reference tables (EventType, Commodity, District, etc.) for consistent classification
8. **Audit log** — `AuditLog` table records all admin mutations with before/after state

### Core Entity Domains
| Domain | Key Models |
|--------|-----------|
| Identity | User, Role, Permission, RolePermission, UserRole |
| Content | Event, Document, Programme, Toolkit, Institution, OfficialCommunication, Tender, ProcurementUpdate, Page, Faq, DigitalService |
| Media | MediaAsset, Gallery, GalleryImage, Video, MediaUsage |
| Membership | InstitutionalMembership |
| Dashboard | DashboardReport, DashboardMetric, DashboardDataset |
| Navigation | MenuItem |
| Enquiry | EnquiryType, Enquiry |
| Masters | EventType, TrainingType, Commodity, District, Block, InstitutionType, DocumentType, KnowledgeCategory, CommunicationType, TenderType, ProcurementUpdateType, FaqCategory, FinancialYear, ReportingPeriod, Tag |
| Config | Setting, AuditLog |

---

## 5. API Design

- **Base URL:** `/api/v1`
- **Auth:** Bearer JWT in `Authorization` header
- **Envelope:** `{ data, pagination?, meta? }` for lists; `{ data }` for single items; `{ error, code, details? }` for errors
- **Pagination:** `page` + `page_size` query params on all list endpoints
- **Filtering:** Module-specific filter keys (search, status, date ranges, type, tag, etc.)
- **Ordering:** `ordering` query param (prefix `-` for descending)
- **Lifecycle:** `/publish`, `/unpublish`, `/archive`, `/restore` sub-routes on publishable resources
- **Bilingual:** All public endpoints return `*_en` and `*_hi` fields

---

## 6. Security Architecture

- **Authentication:** JWT HS256; 15-minute access token + 30-day refresh token; refresh rotation
- **Authorisation:** RBAC — User → UserRole → Role → RolePermission → Permission (granular per-module)
- **Rate limiting:** Redis-backed; IP-hashed (no raw IPs stored); per-endpoint limits
- **CAPTCHA:** Pluggable service; enquiry submission requires verification
- **Password hashing:** bcrypt with 12 rounds; dedicated `/change-password` and `/reset-password` endpoints
- **Security headers:** Helmet (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- **CORS:** Configurable per-environment via `CORS_ORIGINS`

---

## 7. Admin CMS Architecture

Built on Next.js 14 App Router:
- **Feature barrel pattern:** Each module has `features/<name>/` with page, form, API hooks, types, and tests
- **Data fetching:** TanStack Query (React Query) for server state; React Hook Form for form state
- **Auth:** Cookie-based session; `<AuthGuard>` HOC on all admin routes
- **Permission model:** `<Can permission="module.action">` component for conditional rendering
- **Shared components:** `DataTable`, `PageHeader`, `Card`, `Badge`, `Button`, `Modal`, `Select`, `Input`, `Label`, `Skeleton`, `EmptyState`, `ErrorState`

---

## 8. Public Website Architecture

Built on Next.js 14 App Router:
- **ISR:** Static generation with `revalidate` intervals for published content
- **SEO:** Per-route `generateMetadata()`, `robots.ts`, `sitemap.ts`
- **Bilingual:** Locale switching at component level; URL structure unchanged
- **SSR fetch:** `BACKEND_ORIGIN` env var for internal Docker fetch (bypasses Nginx)

---

## 9. Architecture Constraints (Frozen)

These constraints are non-negotiable and must not be changed in Phase 18 or beyond without explicit sign-off:

1. No drag-and-drop page builder
2. No unrestricted dynamic form builder
3. No approval workflows (content is pre-approved before CMS entry)
4. No ERP/MIS functionality in Phase 1
5. No public event registration system
6. Published records are never permanently deleted
7. URL slugs are immutable after creation
8. The dashboard is fixed (backend-driven metrics; no client-side aggregation)
9. API spec is the single contract — frontend never invents a shape
10. The CMS is for public-facing website content only
