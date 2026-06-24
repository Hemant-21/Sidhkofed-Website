# 06 Documents API

## Purpose

Upload public documents once and link them by reference across CMS records.
Knowledge Centre visibility is explicit.

## Public Endpoints

```http
GET /api/documents
GET /api/documents/{id-or-slug}
```

## Admin Endpoints

```http
GET   /api/admin/documents
POST  /api/admin/documents
GET   /api/admin/documents/{id}
PATCH /api/admin/documents/{id}
POST  /api/admin/documents/{id}/publish
POST  /api/admin/documents/{id}/unpublish
POST  /api/admin/documents/{id}/archive
POST  /api/admin/documents/{id}/restore
POST  /api/admin/documents/{id}/replace-file
```

## List Fields

- `id`
- `slug`
- `title_en`
- `title_hi`
- `document_type`
- `publication_date`
- `language`
- `file_asset`
- `show_in_knowledge_centre`

## Detail Fields

- list fields
- `commodity_ids`
- `programme_ids`
- `institution_ids`
- `district_ids`
- `financial_year`
- `tags`
- `knowledge_category`
- `publication_state`
- version summary

## Create / Update Payload

- `title_en`
- `title_hi`
- `document_type_id`
- `file_asset_id`
- `publication_date`
- `language`
- `is_public`
- `commodity_ids`
- `programme_ids`
- `institution_ids`
- `district_ids`
- `financial_year_id`
- `tags`
- `show_in_knowledge_centre`
- `knowledge_category_id`
- `publication_state`

## Filters

```http
?type=report
?knowledge_centre=true
?commodity=lac
?district=gumla
?year=2026
?language=hi
```

## Permissions

- Public: published/public documents only.
- Content Editor: upload/edit draft document metadata.
- Publisher: publish, unpublish, archive, restore.
- Super Administrator: same as Publisher plus protected maintenance actions.

## Lifecycle Rules

- Published documents cannot be permanently deleted.
- Archive instead of delete.
- File replacement preserves the document reference and slug.

## Validation

- `knowledge_category_id` is required when `show_in_knowledge_centre = true`.
- File must be uploaded through the file/media pipeline.
- Replacement preserves document ID and slug.

## Non-Goals

- Download tracking.
- Branching document comparison UI.
- Phase 1 PDF full-text indexing.
