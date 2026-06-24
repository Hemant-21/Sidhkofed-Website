# 07 Official Communications API

## Purpose

Expose one operation for notices, circulars, office orders, notifications,
advisories, and public announcements.

## Public Endpoints

```http
GET /api/communications
GET /api/communications/{id-or-slug}
```

## Admin Endpoints

```http
GET   /api/admin/communications
POST  /api/admin/communications
GET   /api/admin/communications/{id}
PATCH /api/admin/communications/{id}
POST  /api/admin/communications/{id}/publish
POST  /api/admin/communications/{id}/unpublish
POST  /api/admin/communications/{id}/archive
POST  /api/admin/communications/{id}/restore
```

## List Fields

- `id`
- `slug`
- `title_en`
- `title_hi`
- `communication_type`
- `reference_number`
- `issue_date`
- `expiry_date`
- `issuing_authority`
- `short_description_en`
- `document`
- `highlight_type`

## Detail Fields

- list fields
- `short_description_hi`
- `effective_date`
- `publication_state`
- `public_visibility`
- `highlight_start_at`
- `highlight_end_at`
- `show_on_homepage`
- `display_order`

## Create / Update Payload

- `title_en`
- `title_hi`
- `communication_type_id`
- `reference_number`
- `issue_date`
- `effective_date`
- `expiry_date`
- `issuing_authority`
- `short_description_en`
- `short_description_hi`
- `document_id`
- publication/highlight fields

## Filters

```http
?type=notice
?year=2026
?highlight=important
?show_on_homepage=true
```

## Rules

- Highlight expiry may remove the label.
- Expiry date does not archive/unpublish the record.

## Permissions

- Public: published/public communications only.
- Content Editor: create/edit drafts.
- Publisher: publish, unpublish, archive, restore.
- Super Administrator: full access.

## Lifecycle Rules

- Expired communications stay public unless manually unpublished or archived.
- Archived records disappear publicly and can be restored.

## Validation

- `title_en`, `communication_type_id`, `issue_date`, and `issuing_authority`
  are required.
- `expiry_date` must not be before `issue_date` when supplied.
- `document_id` must reference an existing reusable Document record.

## Non-Goals

- Separate modules for notices, circulars, orders, and advisories.
