# 08 Tenders API

## Purpose

Expose lightweight tender metadata and GeM links. Tender files and procurement
transaction workflows remain outside CMS.

## Public Endpoints

```http
GET /api/tenders
GET /api/tenders/{id-or-slug}
```

## Admin Endpoints

```http
GET   /api/admin/tenders
POST  /api/admin/tenders
GET   /api/admin/tenders/{id}
PATCH /api/admin/tenders/{id}
POST  /api/admin/tenders/{id}/publish
POST  /api/admin/tenders/{id}/unpublish
POST  /api/admin/tenders/{id}/archive
POST  /api/admin/tenders/{id}/restore
```

## List Fields

- `id`
- `slug`
- `tender_number`
- `title_en`
- `title_hi`
- `tender_type`
- `publishing_date`
- `submission_deadline`
- `status`
- `gem_url`
- `highlight_type`

## Detail Fields

- list fields
- `opening_date`
- `issuing_authority`
- `short_description_en`
- `short_description_hi`
- `related_category_or_department`
- publication/highlight fields

## Create / Update Payload

- `tender_number`
- `title_en`
- `title_hi`
- `tender_type_id`
- `publishing_date`
- `submission_deadline`
- `opening_date`
- `status`
- `issuing_authority`
- `short_description_en`
- `short_description_hi`
- `gem_url`
- `related_category_or_department`
- publication/highlight fields

## Filters

```http
?status=active
?type=goods
?year=2026
?show_on_homepage=true
```

## Permissions

- Public: published/public tender metadata only.
- Content Editor: create/edit draft tender metadata.
- Publisher: publish, unpublish, archive, restore.
- Super Administrator: full access.

## Lifecycle Rules

- Expired tenders remain public unless manually unpublished or archived.
- Archived tenders disappear publicly and can be restored.

## Validation

- `gem_url` must be valid when supplied.
- `submission_deadline` should not be before `publishing_date`.

## Non-Goals

- BOQ management.
- Corrigendum/clarification/award/cancellation notice file management.
- Tender document hosting when GeM is the source.
