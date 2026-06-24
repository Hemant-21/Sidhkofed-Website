# 01 Homepage API

## Purpose

Provide one aggregated public endpoint for the mostly hard-coded homepage. CMS
controls only selected dynamic sections.

## Public Endpoints

```http
GET /api/home
```

## Admin Endpoints

Homepage content is managed through source modules, not a page builder.

Useful admin reads:

```http
GET /api/admin/home/preview
GET /api/admin/home/configuration
```

## Response Sections

`GET /api/home` may include:

- `headline_kpis`
- `highlighted_events`
- `latest_communications`
- `active_tenders`
- `featured_success_stories`
- `selected_partners`
- `featured_commodities`
- `featured_programmes`
- `featured_videos`
- `digital_services`

## Response Shape

```json
{
  "headline_kpis": [],
  "highlighted_events": [],
  "latest_communications": [],
  "active_tenders": [],
  "featured_success_stories": [],
  "selected_partners": [],
  "featured_commodities": [],
  "featured_programmes": [],
  "featured_videos": [],
  "digital_services": []
}
```

## Rules

- Do not build a drag-and-drop homepage builder.
- Return at most 3 featured videos.
- Use `display_order` where multiple records are featured.
- Return only published/public records.
- Keep payload lightweight; link to detail endpoints for full data.

## Permissions

- Public: access to `GET /api/home`.
- Content Editor: no direct layout editing; manage source module records.
- Publisher/Super Administrator: control visibility and highlighting through
  source modules.

## Validation

- Featured videos must be limited to 3.
- Homepage sections must ignore non-public, unpublished, or archived records.
- Source module records must validate through their own module APIs.

## Non-Goals

- Editable layout sections.
- Arbitrary widgets.
- User-defined dashboard/report blocks.
