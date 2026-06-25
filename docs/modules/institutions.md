# Institutions Module (Phase 6)

> One reusable `Institution` operation for all organisations — government departments, training
> institutions, universities, NGOs, corporate buyers, financial/technical agencies, cooperatives,
> and other partners (CMS requirements §4.4). Reused across events, documents, and (future)
> MoUs/memberships. Deactivation/archival only.

## 1. Architecture

Standard layered vertical slice under `src/modules/institutions/`. The repository is the only Prisma
caller. Institutions carry no own junction collections — reverse links are discovered via
`/events?institution=…` and `/documents?institution=…`; only the **logo** is a tracked media
reference (`media_usages`). Defines the shared `MediaRef`/`MasterRef`/`mediaRef` helpers reused by
the events and programmes DTOs.

## 2. Fields & business rules

- `institution_type_id` (required, active master), bilingual `name_*`, `description_*`, `address_*`;
  `website_url` (http/https), `logo_media_id` (image), `district_id` (active master),
  `contact_email` (validated), `contact_phone`.
- Logo must be a non-archived image; tracked in `media_usages` so it cannot be hard-deleted while
  linked.
- Slug generated once, unique, stable.

## 3. Workflow & lifecycle

Full publishing mixin via explicit action endpoints; scheduled publishing; homepage visibility +
display order (drives the homepage partner strip); highlight.

## 4. Relationships

- **Events** ↔ institution via `event_institutions` (managed from the event side).
- **Documents** ↔ institution via `document_institutions` (managed from the document side).
- **Programmes** relate transitively (both link to events/documents); no direct junction.
- **MoU** is represented as Institution + MoU-signing Event + linked Document (no standalone MoU
  module) — future, per requirements §4.4.

## 5. RBAC

Reuses the seeded `content.*` set: read = all CMS roles; create/PATCH = Content Editor + Publisher
(+ Super Admin); lifecycle = Publisher + Super Admin. No RBAC schema change.

## 6. API

Public: `GET /public/institutions`, `GET /public/institutions/{slug}`, and
`GET /public/home/partners` (capped homepage partner list). Filters `institution_type`, `district`,
`show_on_homepage`; ordering `display_order,name_en`.
Admin: standard **P** routes at `/admin/institutions`.

## 7. Caching

Public responses cached under `institutions:public:*`, invalidated on every admin write (fail-open).

## 8. Audit

`create`, `update`, and each lifecycle transition write an `audit_logs` row via the shared service.

## 9. Tests

`institutions.test.ts` — `buildWhere` (public predicate, id-or-slug resolution) and validators
(minimal create, non-http URL rejection, invalid email rejection, strict unknown-key rejection).
