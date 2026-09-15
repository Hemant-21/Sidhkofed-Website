# 16 Masters API

## Purpose

Expose reusable master data for consistent classification across CMS modules.

## Public Endpoints

Public master endpoints may expose active values needed for filters:

```http
GET /api/masters/districts
GET /api/masters/commodities
GET /api/masters/programmes
```

## Admin Endpoints

```http
GET   /api/admin/masters/{master-key}
POST  /api/admin/masters/{master-key}
PATCH /api/admin/masters/{master-key}/{id}
POST  /api/admin/masters/{master-key}/{id}/activate
POST  /api/admin/masters/{master-key}/{id}/deactivate
```

## Master Keys

- `event-categories`
- `event-types`
- `training-types`
- `programme-schemes`
- `toolkits`
- `toolkit-items`
- `commodities`
- `institution-types`
- `institutions`
- `document-types`
- `knowledge-categories`
- `communication-types`
- `tender-types`
- `procurement-update-categories`
- `procurement-update-types`
- `enquiry-types`
- `faq-categories`
- `districts`
- `blocks`
- `financial-years`
- `reporting-periods`

## Common Fields

- `id`
- `name_en`
- `name_hi`
- `slug`
- `short_code`
- `display_order`
- `is_active`

## Rules

- Create, edit, activate, deactivate.
- Prevent duplicates.
- Do not delete linked masters.
- Deactivated values disappear from new-entry dropdowns.
- Historical links remain valid.
- District and block data should be seeded during setup.

## Permissions

- Public: active filter masters only where needed.
- Super Administrator: create/edit/activate/deactivate all masters.
- Content Editor/Publisher: read masters for dropdowns.

## Lifecycle Rules

- Deactivate instead of delete when referenced.
- Historical references remain valid.

## Validation

- Duplicate active names/codes are not allowed within the same master.
- Blocks may share names across different districts.

## Event Category → Event Type

`event-types` belongs to exactly one `event-categories` record (`event_category_id`, required on
create; PATCH may reassign it or omit it to keep the current category). An Event still stores only
one `event_type_id` — it inherits its category through the type, never directly.

- Creating or reassigning an event type requires the target event category to exist and be active.
- `event-types` accepts `?event_category_id=` and `?event_category=<slug>` list filters (admin and
  public); `event-categories` has no equivalent child filter.
- Archiving (`POST .../deactivate` or `PATCH { is_active: false }`) is blocked with a 409 when any
  event still references the type directly, or references any of a category's event types,
  regardless of the event's publication or lifecycle state. Reassign the referencing events to
  another type/category first.
- Both archive-guard routes run inside a transaction that row-locks the master before counting
  referencing events, closing the race between a concurrent archive and a concurrent assignment.

## Procurement Update Category → Procurement Update Type

`procurement-update-types` belongs to exactly one `procurement-update-categories` record
(`procurement_update_category_id`, required on create; PATCH may reassign it or omit it to keep
the current category). A Procurement Update still stores only one `procurement_update_type_id` —
it inherits its category through the type, never directly; there is no
`procurement_update_category_id` column on Procurement Updates. Attached documents keep their own
independent Document Type / Publications-Notifications classification, unaffected by this
hierarchy.

- Creating or reassigning a procurement update type requires the target category to exist and be
  active.
- `procurement-update-types` accepts `?procurement_update_category_id=` and
  `?procurement_update_category=<slug>` list filters (admin and public); `procurement-update-categories`
  has no equivalent child filter.
- Archiving (`POST .../deactivate` or `PATCH { is_active: false }`) is blocked with a 409 when any
  procurement update type still parents to the category being archived, or any procurement update
  (any publication/lifecycle state, including drafts and archived) still references the type being
  archived. Reassign the referencing types/updates first.
- Both archive-guard routes run inside a transaction that row-locks the master before counting
  referencing rows, closing the race between a concurrent archive and a concurrent assignment.
- Public/admin Procurement Update list and detail responses expose `procurement_update_type`
  (compact ref) and a derived `procurement_update_category` (compact ref, read via the type's
  parent) alongside it; the public list also accepts a `procurement_update_category` filter
  composed with `procurement_update_type` (see `09-procurement-updates-api.md`).

## Document Type → Knowledge Category / Communication Type

`document-types` belongs to exactly one parent family — a `knowledge-categories` record
(`knowledge_category_id`) OR a `communication-types` record (`communication_type_id`), never
both, never neither. This is the sole authority for whether a Document belongs to Publications
(knowledge category parent) or Notifications (communication type parent); see `06-documents-api.md`.

- Create requires exactly one of `knowledge_category_id` / `communication_type_id` (the other
  omitted or explicitly `null`). Both present, or both absent/null, is a 422.
- PATCH may omit both fields to leave the current parent untouched. To switch families, send BOTH
  the new parent id AND an explicit `null` for the old one in the same request — sending only the
  new field leaves the old parent's id in place (merged against the existing row) and is rejected
  as "both set".
- Creating, reassigning, or reactivating (`POST .../activate`, or `PATCH { is_active: true }`)
  requires the target parent to exist and be active; the check re-runs on reactivation even when
  the parent fields aren't resent, since the stored parent may have gone inactive meanwhile.
- Response adds `knowledge_category_id`, `knowledge_category` (compact ref or null),
  `communication_type_id`, `communication_type` (compact ref or null), and a derived
  `document_section: 'publications' | 'notifications'`.
- `document-types` list/options accept `?knowledge_category_id=` / `?knowledge_category=<slug>`,
  `?communication_type_id=` / `?communication_type=<slug>`, and `?document_section=publications|
  notifications` (admin and public).
- Archiving `document-types` is blocked with a 409 while any Document references it (any
  publication/lifecycle state, including drafts and archived). Archiving `knowledge-categories` is
  blocked while any Document Type still parents to it. Archiving `communication-types` is blocked
  while any Document Type still parents to it OR any legacy Official Communication still
  references it directly (Official Communications keep their own independent
  `communication_type_id` — see `07-communications-api.md`).
- All of the above (create/update/setActive) run inside a transaction that row-locks the
  referenced parent before checking its active state, closing the race between a concurrent
  archive of the parent and a concurrent create/reassignment of a child Document Type.

## Non-Goals

- Arbitrary user-defined masters without product approval.
- Deleting linked master records.
