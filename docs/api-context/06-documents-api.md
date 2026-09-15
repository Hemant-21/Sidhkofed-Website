# 06 Documents API

## Purpose

Upload public documents once and link them by reference across CMS records. Classification
(Publications vs Notifications, and which Knowledge Category / Communication Type a document
falls under) is entirely derived from the document's `document_type_id` — see the "Document
Type → Knowledge Category / Communication Type" section of `16-masters-api.md`. A document
itself no longer independently chooses a category or a Knowledge Centre toggle.

## Public Endpoints

```http
GET /api/v1/public/documents
GET /api/v1/public/documents/{slug}
GET /api/v1/public/knowledge-centre
```

`/public/knowledge-centre` is `/public/documents` with `document_section=publications` forced —
Publications' data source. Notifications' main listing is `/public/documents?document_section=
notifications` (no separate route).

## Admin Endpoints

```http
GET   /api/v1/admin/documents
POST  /api/v1/admin/documents
GET   /api/v1/admin/documents/{id}
PATCH /api/v1/admin/documents/{id}
POST  /api/v1/admin/documents/{id}/publish
POST  /api/v1/admin/documents/{id}/unpublish
POST  /api/v1/admin/documents/{id}/archive
POST  /api/v1/admin/documents/{id}/restore
POST  /api/v1/admin/documents/{id}/replace-file
```

## Summary Fields (list — admin and public)

- `id`, `slug`, `title_en`, `title_hi`
- `document_type` (compact ref)
- `knowledge_category` (compact ref or null) — **derived** from `document_type`'s parent
- `communication_type` (compact ref or null) — **derived** from `document_type`'s parent
- `document_section: 'publications' | 'notifications'` — **derived**
- `financial_year`, `language`, `publication_date`
- `show_in_knowledge_centre` (bool) — **deprecated, derived** compatibility field, equivalent to
  `document_section === 'publications'`
- `file`, `highlight_type`, `published_at`, `public_url`
- Admin only: `is_public`, `publication_state`, `public_visibility`, `show_on_homepage`,
  `display_order`, `archived_at`, `created_at`, `updated_at`

## Detail Fields

- summary fields, plus `description_en`, `description_hi`, `commodities`, `districts`
- Admin only: `publish_start_at`, `highlight_start_at`, `highlight_end_at`, `created_by`,
  `updated_by`

## Create / Update Payload

- `title_en`, `title_hi`, `description_en`, `description_hi`
- `document_type_id` (required on create) — the sole classification input
- `file_asset_id` (required on create)
- `publication_date`, `language`, `is_public`
- `commodity_ids`, `district_ids`
- `financial_year_id`
- `public_visibility`, `publish_start_at`, `highlight_type`, `highlight_start_at`,
  `highlight_end_at`, `display_order`, `show_on_homepage`
- `show_in_knowledge_centre`, `knowledge_category_id` — **deprecated**: accepted only for backward
  compatibility. A value is rejected with a 422 field error unless it agrees with what
  `document_type_id` derives. Prefer omitting both; the server always persists the derived values
  regardless of what (consistent) value was sent.
- `publication_state` is never accepted here — use the lifecycle actions.

## Filters

```http
?document_type=report                        (id or slug; comma-separated for multiple)
?knowledge_category=research-and-reports      (id or slug)
?communication_type=notice                    (id or slug)
?document_section=publications|notifications
?knowledge_centre=true                        (legacy alias for document_section=publications)
?commodity=lac
?district=gumla
?financial_year=2025-2026
?year=2026                                    (publication_date year)
?date_from=2026-01-01&date_to=2026-06-30
?language=hi
?search=annual+report
?ordering=-publication_date                   (default for public lists)
```

An absent `knowledge_category`/`communication_type` returns all eligible documents in the
selected `document_section`; an absent `document_type` returns all eligible documents in the
selected category. These combine with AND — they never broaden a more specific filter, and a
cross-family combination (e.g. `document_section=notifications` with a Knowledge Category slug)
returns an empty result rather than silently ignoring the conflicting filter.

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

- `document_type_id` must reference an active Document Type whose own parent (Knowledge Category
  or Communication Type) is also active.
- File must be uploaded through the file/media pipeline; must not be an image and must not be
  archived.
- Replacement preserves document ID and slug.

## Non-Goals

- Download tracking.
- Branching document comparison UI.
- Phase 1 PDF full-text indexing.
