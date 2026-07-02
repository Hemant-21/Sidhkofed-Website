# Events & Event News Module (Phase 6)

> One `Event` operation for **all** institutional activities (training, workshop, meeting, MoU
> signing, exposure visit, field visit, conference, awareness programme, …), differentiated by a
> configurable **event type** and a controlled **dynamic-field** schema — never a per-subtype
> module (CMS requirements §4.1, AC#1). News is **derived** from completed events, not an
> independent data-entry operation (AC#3/#4).

## 1. Architecture

Layered vertical slice (`routes → controller → validator → service → repository → Prisma`), matching
every other content module:

```
src/modules/events/
├── events.routes.ts            admin (+ event-type field-definitions) + public routers
├── events.controller.ts        admin HTTP (CRUD, lifecycle, complete, cancel, publish-as-news)
├── events.public.controller.ts public HTTP (list/detail, Redis-cached)
├── events.service.ts           business rules (status, dynamic fields, relationships, completion)
├── events.repository.ts        the ONLY Prisma caller; junction writers; reference validation
├── events.validators.ts        Zod request DTOs (create/update/complete/cancel)
├── events.query.ts             query-string → framework-free filters + ordering allow-list
├── events.dto.ts               summary / detail / public mappers (+ EventRef)
├── events.status.ts            pure date→status derivation
├── events.dynamic-fields.ts    pure controlled dynamic-field validator
├── events.permissions.ts       logical permission keys (map onto seeded content.*)
├── field-definitions/          Super-Admin event-type field schema (sub-resource)
└── news/                        derived Event News module (own slug + lifecycle)
```

Reuses existing infrastructure unchanged: Auth/RBAC middleware, Audit service, Media service +
media-usage tracking, Cache (Redis), the publishing-workflow helpers, the shared visibility
predicate, pagination/ordering/list-query helpers, and `src/shared/validation.ts`.

## 2. Business rules

- **Status** (`events.status.ts`): derived from dates unless `status_override=true` —
  before start → `scheduled` (UI "Upcoming"), within range (inclusive) → `ongoing`, after end →
  `completed`; single-date events are `ongoing` on the day, `completed` after. Manual override may
  only be `postponed` or `cancelled` (API spec §6, §C1).
- **Date mode**: `single | range | multi_day`; `end_date` required for range/multi_day and cannot
  precede `start_date` (§C2).
- **Dynamic fields** (`events.dynamic-fields.ts`): `dynamic_values` JSONB is validated against the
  **active** `event_field_definitions` for the event's type — allowed keys only, declared data
  type, required fields, and select-option constraints. Approved data types are exactly
  `text | textarea | number | date | boolean | select`. Extended types (multi-select / reference /
  file / datetime) are intentionally **not** supported: adding them is a reviewed `FieldDataType`
  enum change (development-rules §3), not a silent extension.
- **Completion** (`complete` action): captures `outcome_summary_en/hi`, `key_highlights`,
  `final_participant_count`, male/female/other counts, completion remarks, `completed_date`, and
  may append completion galleries/documents. **Duplicate completion is blocked** (409 once
  `completed_date` is set).
- **Cancellation** (`cancel` action): sets `status_override=true`, `event_status=cancelled`, stores
  a reason and an optional revised start date; the original `start_date` is retained.
- **Relationships** (shared, reusable): `commodity_ids`, `programme_ids`, `institution_ids`,
  `document_ids`, `gallery_ids` (M2M junctions) plus scalar `training_type_id`, `district_id`,
  `block_id`, `cover_media_id`. `block` must belong to the chosen `district`; when linked
  programmes declare permitted training types, the event's `training_type_id` must be in that set
  (API spec §6). *Future Toolkit linkage* is deliberately deferred (Toolkits out of Phase 6 scope).
- **Cover media**: must be an image, non-archived; a `media_usages` row is written transactionally
  so the asset cannot be hard-deleted while linked.

## 3. Event News (derived)

- `POST /admin/events/{id}/publish-as-news` requires a **completed** event + publish permission and
  creates one `event_news` record (201) with its own stable slug and lifecycle, prefilled from the
  event but fully overridable (title/summary/body/cover/publish date/homepage/highlight).
- News never mutates the source event; the link is immutable. "Remove from News" = the standard
  `archive` lifecycle on the news record (hidden publicly, restorable).
- Public event detail exposes only **published** news links.

## 4. Workflow & lifecycle

Standard publishing mixin: `draft → published → unpublished → archived` via explicit action
endpoints (publish/unpublish/archive/restore). `published_at` set on first publish only; slug is
generated once and immutable; published records cannot be hard-deleted. Scheduled publishing via
`publish_start_at` (the visibility predicate gates it). Highlight expiry never unpublishes.

## 5. RBAC

Reuses the seeded generic `content.*` permission set (no RBAC schema change):

| Action | Super Admin | Content Editor | Publisher |
|---|---|---|---|
| list/detail | ✓ | ✓ | ✓ |
| create / PATCH | ✓ | ✓ (`content.create`/`content.update`) | ✓ (`content.update`) |
| publish/unpublish/archive/restore | ✓ | — | ✓ |
| complete / cancel | ✓ | — | ✓ |
| publish-as-news | ✓ | — | ✓ (`content.publish`) |
| event-type field definitions | ✓ | — | — |

## 6. API

Public (`/api/v1/public`): `GET /events`, `GET /events/{slug}`, `GET /news`, `GET /news/{slug}`.
Filters — events: `event_type, event_status, district, block, commodity, programme, institution,
date_from, date_to, year, show_on_homepage`; ordering `start_date,-start_date,-published_at,
display_order`. News: `event, year, show_on_homepage`; ordering `-news_published_at,
-published_at,display_order`.

Admin (`/api/v1/admin`): standard **P** routes at `/events` plus
`/events/{id}/complete|cancel|publish-as-news`; `/news` PATCH + lifecycle;
`/event-types/{event_type_id}/field-definitions` (GET/POST, PATCH/{id}, activate|deactivate).

## 7. Caching

Public list/detail responses are Redis-cached under `events:public:*` / `news:public:*` and
invalidated on every admin write (create/update/lifecycle/complete/cancel/publish-as-news), fail-open.

## 8. Audit

Every state change writes one `audit_logs` row via the shared audit service: `create`, `update`,
`publish/unpublish/archive/restore`, `EVENT_COMPLETED`, `EVENT_CANCELLED`, and `NEWS_PUBLISH`.
Media attach/detach is captured through `media_usages` + the update audit entry.

## 9. Tests

Pure unit tests (DB-free, CI-runnable): `events.status.test.ts` (date→status),
`events.dynamic-fields.test.ts` (controlled-field engine), `events.repository.test.ts`
(`buildWhere` filters/predicate), `events.validators.test.ts` (date-mode/override/strictness).
