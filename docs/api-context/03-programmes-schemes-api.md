# 03 Programmes And Schemes API

## Purpose

Expose reusable `ProgrammeScheme` records that can be linked to events,
toolkits, documents, procurement updates, success stories, and dashboard data.

## Public Endpoints

```http
GET /api/programmes
GET /api/programmes/{id-or-slug}
```

## Admin Endpoints

```http
GET   /api/admin/programmes
POST  /api/admin/programmes
GET   /api/admin/programmes/{id}
PATCH /api/admin/programmes/{id}
POST  /api/admin/programmes/{id}/deactivate
POST  /api/admin/programmes/{id}/activate
```

## List Fields

- `id`
- `slug`
- `name_en`
- `name_hi`
- `short_code`
- `description_en`
- `is_active`
- `public_visibility`
- `display_order`

## Detail Fields

Include list fields plus:

- `description_hi`
- `sponsoring_department_or_source`
- `start_date`
- `end_date`
- `commodities`
- `permitted_training_types`
- `linked_toolkits`
- related public documents
- related events

## Create / Update Payload

- `name_en`
- `name_hi`
- `short_code`
- `description_en`
- `description_hi`
- `sponsoring_department_or_source`
- `start_date`
- `end_date`
- `is_active`
- `commodity_ids`
- `permitted_training_type_ids`
- `linked_toolkit_ids`
- `public_visibility`
- `display_order`

## Filters

```http
?is_active=true
?commodity=lac
?public_visibility=true
```

## Permissions

- Public: active and public only.
- Content Editor: create/edit draft-like data if allowed.
- Publisher/Super Administrator: activate/deactivate.

## Lifecycle Rules

- Programmes/schemes are activated or deactivated, not permanently deleted when
  referenced.
- Deactivated records remain valid for historical links.

## Validation

- Duplicate names and duplicate `short_code` values are not allowed.
- Referenced commodities/toolkits/training types must be active for new entries.

## Non-Goals

- Scheme transaction tracking.
- Beneficiary records.
