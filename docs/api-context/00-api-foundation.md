# 00 API Foundation

## Purpose

Shared API rules for all SIDHKOFED CMS modules. Module files must follow this
contract unless the full CMS context explicitly says otherwise.

## Naming And Format

- Base path: `/api`.
- Public endpoints: `/api/{resource}`.
- Admin endpoints: `/api/admin/{resource}`.
- Use REST-style plural resources.
- Use `snake_case` for request/response fields.
- Use `kebab-case` for URL path resource names.
- Use query parameters for filters.
- Use JSON request and response bodies.

## Authentication

- Public `GET` endpoints do not require login.
- Admin endpoints require authenticated CMS users.
- Admin permissions follow roles:
  - `super_admin`: full access.
  - `content_editor`: create/edit draft content, no publish/archive powers.
  - `publisher`: publish, unpublish, archive, restore, and edit if granted.

## Pagination

All listing endpoints must paginate.

Query parameters:

```http
page=1
page_size=20
```

Default `page_size`: `20`.
Maximum `page_size`: `100`.

Response shape:

```json
{
  "count": 0,
  "page": 1,
  "page_size": 20,
  "total_pages": 0,
  "results": []
}
```

## Filtering And Sorting

Common filters:

```http
?search=
?status=
?publication_state=
?public_visibility=
?district=
?commodity=
?programme=
?year=
?show_on_homepage=true
```

Common sorting:

```http
?ordering=-published_at
?ordering=display_order
```

Only allow whitelisted filter and ordering fields per module.

## Public Visibility

Public listing/detail endpoints return only records where:

- `publication_state = published`
- `public_visibility = true`
- record is not archived

Admin endpoints may expose draft, unpublished, archived, and non-public records
based on permissions.

## List Vs Detail Rule

List endpoints return summary fields only:

- IDs
- slug
- title
- summary
- type/status
- dates
- lightweight media/document references
- public URL

Detail endpoints may return:

- full bilingual content
- linked records
- galleries
- documents
- dynamic/conditional fields
- audit-safe metadata

## Common Reference Shapes

Media reference:

```json
{
  "id": 1,
  "url": "",
  "title": "",
  "alt_text": "",
  "caption": ""
}
```

Document reference:

```json
{
  "id": 1,
  "title_en": "",
  "title_hi": null,
  "document_type": "",
  "file_url": "",
  "language": "en",
  "publication_date": "2026-06-24"
}
```

Master reference:

```json
{
  "id": 1,
  "name_en": "",
  "name_hi": null,
  "slug": ""
}
```

## Bilingual Fields

- English is primary.
- Hindi fields are optional.
- Store manual Hindi in `*_hi`.
- Do not overwrite manual Hindi with machine translation.
- If visitor-facing fallback translation is used, include:

```json
{
  "translation_source": "manual|automatic|missing"
}
```

## Error Response

Use this shape for validation and application errors:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed.",
    "fields": {
      "title_en": ["This field is required."]
    }
  }
}
```

Common codes:

- `validation_error`
- `not_found`
- `permission_denied`
- `authentication_required`
- `conflict`
- `rate_limited`
- `unsupported_file_type`
- `protected_record`

## Lifecycle Actions

Admin lifecycle endpoints should use explicit actions:

```http
POST /api/admin/{resource}/{id}/publish
POST /api/admin/{resource}/{id}/unpublish
POST /api/admin/{resource}/{id}/archive
POST /api/admin/{resource}/{id}/restore
```

Rules:

- Published records cannot be permanently deleted.
- Archived records are hidden from public APIs.
- Restored records retain original slug.
- Permanent deletion is allowed only for draft, never-published, unlinked records.

## File Uploads

- Upload media/documents once.
- Link by `media_id`, `file_asset_id`, or `document_id`.
- Linked assets cannot be permanently deleted.
- Replacement must preserve the logical record reference.

## Non-Goals

APIs must not support:

- ERP/MIS transaction entry.
- Procurement transaction processing.
- Inventory or accounting.
- Event registration.
- Public enquiry tracking.
- Direct video file hosting.
- User-defined dashboard/report builders.
- Phase 1 PDF full-text indexing.
