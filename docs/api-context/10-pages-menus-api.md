# 10 Pages And Menus API

## Purpose

Expose static/institutional pages and simple menu configuration.

## Public Endpoints

```http
GET /api/pages/{slug}
GET /api/menus?location=header
```

## Admin Endpoints

```http
GET   /api/admin/pages
POST  /api/admin/pages
GET   /api/admin/pages/{id}
PATCH /api/admin/pages/{id}
POST  /api/admin/pages/{id}/publish
POST  /api/admin/pages/{id}/unpublish
POST  /api/admin/pages/{id}/archive
POST  /api/admin/pages/{id}/restore
GET   /api/admin/menus
POST  /api/admin/menus
PATCH /api/admin/menus/{id}
```

## Page Fields

- `id`
- `title_en`
- `title_hi`
- `slug`
- `content_en`
- `content_hi`
- `parent_page_id`
- `display_order`
- `menu_visibility`
- `publication_state`
- `public_visibility`
- `media_ids`
- SEO/social override fields

## Menu Fields

- `id`
- `label_en`
- `label_hi`
- `menu_location`
- `parent_menu_item_id`
- `link_type`
- `linked_record_type`
- `linked_record_id`
- `external_url`
- `display_order`
- `is_visible`
- `open_in_new_tab`

## Validation

- Slug is generated on first creation and stable.
- External URLs must be valid.
- Link type determines required linked fields.

## Permissions

- Public: published/public pages and visible menus only.
- Content Editor: create/edit page drafts and menu drafts if granted.
- Publisher: publish, unpublish, archive, restore pages.
- Super Administrator: full page/menu access.

## Lifecycle Rules

- Policy pages use the same `Page` operation.
- Slugs remain stable after creation.
- Archived pages disappear publicly and can be restored.

## Non-Goals

- Drag-and-drop page builder.
- Separate policy modules.
