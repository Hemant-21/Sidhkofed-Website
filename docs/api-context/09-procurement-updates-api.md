# 09 Procurement Updates API

## Purpose

Expose one operation for public procurement rates, announcements, schedules,
centre updates, and trade opportunities.

## Public Endpoints

```http
GET /api/procurement-updates
GET /api/procurement-updates/{id-or-slug}
```

## Admin Endpoints

```http
GET   /api/admin/procurement-updates
POST  /api/admin/procurement-updates
GET   /api/admin/procurement-updates/{id}
PATCH /api/admin/procurement-updates/{id}
POST  /api/admin/procurement-updates/{id}/publish
POST  /api/admin/procurement-updates/{id}/unpublish
POST  /api/admin/procurement-updates/{id}/archive
POST  /api/admin/procurement-updates/{id}/restore
```

## List Fields

- `id`
- `slug`
- `commodity`
- `procurement_update_type`
- `rate`
- `unit`
- `effective_date`
- `period_start`
- `period_end`
- `district`
- `location_text`
- `short_description_en`
- `status`

## Detail Fields

- list fields
- `block`
- `programme_scheme`
- `short_description_hi`
- `document`
- publication/highlight fields

## Create / Update Payload

- `commodity_id`
- `procurement_update_type_id`
- `rate`
- `unit`
- `effective_date`
- `period_start`
- `period_end`
- `district_id`
- `block_id`
- `location_text`
- `programme_scheme_id`
- `short_description_en`
- `short_description_hi`
- `status`
- `document_id`
- publication/highlight fields

## Filters

```http
?procurement_update_type=procurement-rate
?procurement_update_category=rates-trade
?commodity=honey
?district=gumla
?status=active
?year=2026
```

`procurement_update_category` and `procurement_update_type` compose with AND semantics (both
resolve through the update's `procurement_update_type` relation — see
`16-masters-api.md#procurement-update-category--procurement-update-type`): category alone matches
every update whose type belongs to it; category + type narrows to that type only when it is
actually a child of the given category (an invalid/cross-category pairing returns zero rows, never
a broader result).

## Ordering

- Admin default: `-effective_date` (unchanged).
- Public default: `-published_at`, with null `published_at` sorted last and a stable `id`
  ascending tie-break. `date_from`/`date_to`/`year` filters and the `-effective_date` /
  `effective_date` explicit ordering (used by the Upcoming view) are unaffected.

## Permissions

- Public: published/public procurement updates only.
- Content Editor: create/edit draft updates.
- Publisher: publish, unpublish, archive, restore.
- Super Administrator: full access.

## Lifecycle Rules

- Public procurement updates are content records, not transactions.
- Archived updates disappear publicly and can be restored.

## Validation

- `rate` and `unit` are required only for procurement-rate updates.
- Date and location fields depend on update type.

## Non-Goals

- Procurement transactions.
- Purchase orders.
- Payment processing.
