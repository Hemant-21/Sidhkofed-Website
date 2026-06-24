# 02 Events And News API

## Purpose

Expose one `Event` operation for all institutional activities. Training,
workshops, meetings, MoU signings, visits, and awareness programmes are event
types. News is a projection from completed events manually published as news.

## Public Endpoints

```http
GET /api/events
GET /api/events/{id-or-slug}
GET /api/news
GET /api/news/{id-or-slug}
```

## Admin Endpoints

```http
GET    /api/admin/events
POST   /api/admin/events
GET    /api/admin/events/{id}
PATCH  /api/admin/events/{id}
POST   /api/admin/events/{id}/publish
POST   /api/admin/events/{id}/unpublish
POST   /api/admin/events/{id}/archive
POST   /api/admin/events/{id}/restore
POST   /api/admin/events/{id}/publish-as-news
PATCH  /api/admin/events/{id}/news-fields
```

## List Fields

- `id`
- `slug`
- `title_en`
- `title_hi`
- `event_type`
- `start_date`
- `end_date`
- `status`
- `location_text`
- `district`
- `summary_en`
- `summary_hi`
- `cover_media`
- `highlight_type`
- `public_url`

## Detail Fields

Include all list fields plus:

- `description_en`
- `description_hi`
- `date_mode`
- `block`
- `commodities`
- `programmes`
- `institutions`
- `documents`
- `gallery`
- `conditional_fields`
- `outcome_summary_en`
- `outcome_summary_hi`
- `key_highlights`
- `final_participant_count`
- `toolkit_distribution_summary`
- `news`

## Create / Update Payload

Required:

- `title_en`
- `event_type_id`
- `date_mode`
- `start_date`
- `location_text`
- `summary_en`
- `publication_state`
- `public_visibility`

Optional:

- `title_hi`
- `end_date`
- `district_id`
- `block_id`
- `description_en`
- `description_hi`
- `commodity_ids`
- `programme_ids`
- `institution_ids`
- `cover_media_id`
- `gallery_ids`
- `document_ids`
- `conditional_fields`
- highlight/homepage fields

## Filters

```http
?type=training
?status=upcoming
?district=gumla
?commodity=lac
?programme=scheme-code
?year=2026
?show_on_homepage=true
```

## Permissions

- Public: published/public only.
- Content Editor: create/edit drafts.
- Publisher: publish, unpublish, archive, restore, publish as news.
- Super Administrator: configure event types and conditional fields.

## Lifecycle Rules

- Event status is derived from dates unless manually overridden as postponed or
  cancelled.
- Completed events may be manually published as news.
- News-facing content may differ from event-facing content.
- Event registration is out of scope.

## Validation

- `end_date` is required when `date_mode = date_range`.
- `end_date` must not be before `start_date`.
- `slug` is generated on first creation and stable afterward.
- Dynamic fields must match configured event type schema.

## Non-Goals

- Separate Training module.
- Separate News data-entry module.
- Event registration.
- Attendance or certificate APIs.
