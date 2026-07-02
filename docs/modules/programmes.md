# Programme & Scheme Module (Phase 6)

> One reusable `ProgrammeScheme` master-operation (CMS requirements §4.2). Linked to events,
> documents, and (later) toolkits/procurement; deactivation/archival only — never hard-deleted
> while referenced.

## 1. Architecture

Standard layered vertical slice under `src/modules/programmes/` (routes → controller → validator →
service → repository → Prisma), identical in shape to the events/institutions modules. Reuses
Auth/RBAC, Audit, Media + media-usage, Cache, publishing/visibility helpers, and
`src/shared/validation.ts`. The repository is the only Prisma caller and owns the two junction
writers (commodities, permitted training types).

## 2. Fields & business rules

- Bilingual `title_*`, `summary_*`, `description_*`, `objectives_*`, `eligibility_*`, `benefits_*`,
  `application_process_*`; `short_code`, `funding_source`, `start_date`, `end_date`, `cover_media_id`.
- `end_date` cannot precede `start_date` (validated on create and against merged state on PATCH).
- **Relationships**: `commodity_ids` and `permitted_training_type_ids` (M2M junctions, validated for
  master activation). Documents link from the document side (`document_programmes`); events link from
  the event side (`event_programmes`); toolkits link via `toolkits.programme_scheme_id` (future).
  When `permitted_training_type_ids` is set, event creation validates the event's training type
  against the programme's permitted set.
- Cover image must be a non-archived image; tracked in `media_usages`.
- Duplicate-name handling: slug is generated uniquely; title duplication is allowed at the schema
  level but slugs stay stable and unique.

## 3. Workflow & lifecycle

Full publishing mixin (`draft/published/unpublished/archived`) via explicit action endpoints;
stable immutable slug; scheduled publishing via `publish_start_at`; homepage visibility + highlight.

## 4. RBAC

Reuses the seeded `content.*` set: read = all CMS roles; create/PATCH = Content Editor + Publisher
(+ Super Admin); lifecycle = Publisher + Super Admin. No RBAC schema change.

## 5. API

Public: `GET /public/programmes`, `GET /public/programmes/{slug}`. Filters `commodity`, `year`,
`show_on_homepage`; ordering `display_order,-published_at,start_date`.
Admin: standard **P** routes at `/admin/programmes`.

## 6. Caching

Public responses cached under `programmes:public:*`, invalidated on every admin write (fail-open).

## 7. Audit

`create`, `update`, and each lifecycle transition write an `audit_logs` row via the shared service.

## 8. Tests

`programmes.test.ts` — `buildWhere` (public predicate, commodity junction, year range) and
validators (minimal create, end-before-start rejection, strict unknown-key rejection).
