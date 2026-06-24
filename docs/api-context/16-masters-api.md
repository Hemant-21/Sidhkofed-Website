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

- `event-types`
- `training-types`
- `programme-schemes`
- `toolkits`
- `toolkit-items`
- `commodities`
- `institution-types`
- `institutions`
- `document-types`
- `knowledge-centre-categories`
- `communication-types`
- `tender-types`
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

## Non-Goals

- Arbitrary user-defined masters without product approval.
- Deleting linked master records.
