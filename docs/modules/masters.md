# Masters Module (Phase 4)

Reusable reference data for the whole CMS: 16 lookup tables behind **one** generic,
config-driven CRUD pipeline. Every later content module (Events, Documents, Programmes,
Procurement, Memberships, Dashboard, …) references these masters by FK rather than
duplicating classification data.

> Source precedence: CMS requirements §6 → `database-schema-design.md` Part 4/13 →
> `api-specification.md` §4/§5/§8 → build context. This module implements those verbatim;
> it does not redesign schema or API contracts.

## 1. Architecture

A single `MasterDefinition` (see `masters.registry.ts`) declares everything that makes a
master distinct — table, fields, validation, serialization, caching, public exposure. The
generic layers read the definition; **no per-master CRUD is hand-written** (TASK 3):

```
routes → controller → base-master.service → base-master.repository → Prisma
                              │
              base-master.validator · masters.dto · services/cache · audit.service
```

| File | Role |
|---|---|
| `masters.registry.ts` | The 16 `MasterDefinition`s (the only master-specific code). `getMaster(key)`, `MASTER_DEFINITIONS`, `PUBLIC_MASTER_KEYS`. |
| `base-master.service.ts` | `BaseMasterService` — validation orchestration, duplicate prevention, stable slug generation, audit, cache invalidation, admin/public list. |
| `base-master.repository.ts` | `BaseMasterRepository` — the only Prisma caller; generic over the model delegate. |
| `base-master.validator.ts` | `BaseMasterValidator` — shared zod fragments + `standardSchemas()` + `parse`. |
| `masters.dto.ts` | Row → snake_case serializers (standard, commodity, district, block, financial year, reporting period). |
| `masters.controller.ts` | Generic HTTP layer for admin + public. |
| `masters.routes.ts` | `/admin/masters/*` (authenticated) and `/public/masters/*` (open). |
| `masters.permissions.ts` | Named permission keys (`masters.view|create|update|activate|deactivate|restore`). |

### Entities (16)

`event-types`, `training-types`, `commodities`, `districts`, `blocks`, `institution-types`,
`document-types`, `knowledge-categories`, `communication-types`, `tender-types`,
`procurement-update-types`, `faq-categories`, `enquiry-types`, `financial-years`,
`reporting-periods`, `tags`.

Shared shape (Part 4): `id`, `name_en` (UNIQUE), `name_hi?`, `slug` (UNIQUE), `is_active`,
`display_order?`, timestamps. Variants:

- **commodities** add `description_en/hi`, `icon_media_id` (+ media ref in DTO).
- **districts** add `state` (default Jharkhand); **blocks** belong to a district
  (`district_id`), are unique per `(district_id, name_en)`, and are orphan-protected.
- **financial-years** use `label` (e.g. `2025-2026`) + `start_date`/`end_date`, no slug/order,
  no overlapping ranges.
- **reporting-periods** carry `period_type` (`month|financial_year|calendar_year|cumulative`),
  optional `financial_year_id`/`calendar_year`, and `start_date`/`end_date`.
- **tags** are internal-only (no public route).

> Schema note: the master models were added to `prisma/schema.prisma` with content
> back-relations **trimmed** to counterparts that exist this phase (only
> `commodities.icon_media_id → media_assets`, plus District↔Block and FinancialYear↔
> ReportingPeriod). The rest are re-added additively when those content modules land — the
> documented module-by-module process. Migration: `20260625100000_masters`.

## 2. API Endpoints

Admin (bearer token), `master_key` is one of the keys above:

```
GET   /api/v1/admin/masters/:master_key            list (page,page_size,search,ordering,is_active[,district])
POST  /api/v1/admin/masters/:master_key            create  → 201
GET   /api/v1/admin/masters/:master_key/:id        detail
PATCH /api/v1/admin/masters/:master_key/:id         update (partial; slug never accepted)
POST  /api/v1/admin/masters/:master_key/:id/activate
POST  /api/v1/admin/masters/:master_key/:id/deactivate
```

Public (no auth, **active records only**):

```
GET   /api/v1/public/masters/:master_key           e.g. /public/masters/commodities
GET   /api/v1/public/masters/blocks?district=ranchi (or ?district_id=<uuid>)
```

There is **no delete endpoint** — masters are deactivated, never deleted (FK `ON DELETE
RESTRICT` protects in-use references). All responses use the single `{success,data,…}`
envelope; lists paginate (default 20, max 100). Ordering and filters are allow-listed;
unknown values return `422`. Duplicate `name_en`/`slug`/`label` returns `409`.

## 3. RBAC

Permission-gated via the existing middleware (`authorizePermissions`). Seeded in
`auth.permissions.ts`:

| Action | Permission | Super Admin | Content Editor | Publisher |
|---|---|:--:|:--:|:--:|
| list/detail | `masters.view` | ✓ (wildcard) | ✓ | ✓ |
| create/update/activate/deactivate | `masters.create`/`.update`/`.activate`/`.deactivate` | ✓ (wildcard) | — | — |

Reads are dropdown access for every CMS role; writes/activation are Super Admin only
(API spec §4/§8). Public routes require no authentication.

## 4. Caching (Redis)

`services/cache.ts` is a fail-open Redis JSON cache. The public **active list** of each
cacheable master is cached under `masters:public:{key}[:filter]`:

- Cacheable set: `commodities`, `districts`, `blocks`, `event-types`, `training-types`,
  `reporting-periods` (TASK 21). Blocks cache per district filter.
- On any create/update/activate/deactivate of a cacheable master, the service calls
  `cache.delByPrefix('masters:public:{key}')` (SCAN-based, non-blocking) to invalidate the
  whole family. A Redis outage degrades to a direct DB read — it never fails a request.

## 5. Audit Flow

Every write records through the centralized `audit.service` (TASK 20). Master events map to
the `master_change` DB action; the precise event is preserved in `change_summary` +
`metadata.event`, with old/new values in metadata and active/inactive transitions in
`previous_state`/`new_state`:

| Operation | Audit event |
|---|---|
| create | `MASTER_CREATE` (newValues) |
| update | `MASTER_UPDATE` (oldValues + newValues) |
| activate | `MASTER_ACTIVATE` (inactive → active) |
| deactivate | `MASTER_DEACTIVATE` (active → inactive) |

## 6. Validation Rules (TASK 18)

- Unique `name_en` (and `slug`) per master → `409`; `label` for financial years.
- Composite unique `(district_id, name_en)` for blocks.
- Inactive-reference protection: a block cannot be attached to an inactive district.
- FK validation: block→district, reporting-period→financial-year existence checks.
- Financial years: `start_date ≤ end_date`, no overlapping ranges.
- Reporting periods: `period_type` required; `financial_year_id` required for
  `month`/`financial_year`; `calendar_year` required for `calendar_year`; period dates must
  fall within the linked financial year; `start_date ≤ end_date`.
- Slugs are generated once and stable; never accepted on update. Deactivation preserves
  references (no hard delete).

## 7. Seeding (TASK 23)

`prisma/seed/masters.ts` (run by `npm run db:seed`, idempotent upserts):
all 24 Jharkhand districts; representative blocks for Ranchi/Gumla/Khunti (full official
block list loaded from approved data later); the canonical event/training/commodity/
institution/document/knowledge/communication/tender/procurement/FAQ/enquiry types;
financial years 2024–2027; and Cumulative / FY / Calendar-Year / Month reporting periods.

## 8. Future Module Dependencies

Masters are Tier 5 — every content module validates FK references against **active** masters:

| Consumer (future) | Masters it depends on |
|---|---|
| Events / News | event-types, training-types, districts, blocks, commodities |
| Programmes | commodities, training-types |
| Institutions | institution-types, districts |
| Documents / Knowledge Hub | document-types, knowledge-categories, financial-years, tags, commodities, districts |
| Official Communications | communication-types |
| Tenders | tender-types |
| Procurement Updates | procurement-update-types, commodities, districts, blocks |
| FAQs / Enquiries | faq-categories, enquiry-types, commodities |
| Memberships / Dashboard | districts, reporting-periods, financial-years |

Deactivated masters stay valid on historical records but are filtered out of new-entry
dropdowns (the public route returns active only); consumers must enforce "active master on
create" using `masters.view` reads.
