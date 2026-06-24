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
?type=procurement-rate
?commodity=honey
?district=gumla
?status=active
?year=2026
```

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
