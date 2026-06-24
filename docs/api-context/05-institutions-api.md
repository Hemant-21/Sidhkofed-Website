# 05 Institutions API

## Purpose

Expose reusable partner and institution records. The same institution should be
linked across events, MoUs, schemes, success stories, and homepage logos.

## Public Endpoints

```http
GET /api/institutions
GET /api/institutions/{id}
```

## Admin Endpoints

```http
GET   /api/admin/institutions
POST  /api/admin/institutions
GET   /api/admin/institutions/{id}
PATCH /api/admin/institutions/{id}
POST  /api/admin/institutions/{id}/activate
POST  /api/admin/institutions/{id}/deactivate
```

## List Fields

- `id`
- `name`
- `institution_type`
- `short_description`
- `logo_media`
- `show_on_homepage`
- `homepage_short_label`
- `display_order`

## Detail Fields

- list fields
- `contact_details`
- `website_url`
- related events
- related documents
- related programmes

## Create / Update Payload

- `name`
- `institution_type_id`
- `short_description`
- `contact_details`
- `website_url`
- `logo_media_id`
- `is_active`
- `show_on_homepage`
- `homepage_short_label`
- `display_order`

## Filters

```http
?type=training-institution
?is_active=true
?show_on_homepage=true
```

## Permissions

- Public: active/public institution records only.
- Content Editor: create/edit institution records.
- Publisher/Super Administrator: activate/deactivate records.

## Lifecycle Rules

- Institutions are deactivated instead of deleted when referenced.
- Logos are managed through Media Library references.

## Validation

- Duplicate institution names are not allowed.
- `website_url` must be a valid URL when present.
- Logos must reference Media Library records.

## Non-Goals

- Separate MoU module. MoUs are Institution + Event + Document.
- CRM-style institution management.
