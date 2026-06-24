# 11 Media, Galleries, And Videos API

## Purpose

Provide reusable media, photo galleries, and YouTube video records. Do not host
video files directly.

## Public Endpoints

```http
GET /api/galleries
GET /api/galleries/{id}
GET /api/videos
GET /api/videos/{id}
```

## Admin Endpoints

```http
GET    /api/admin/media
POST   /api/admin/media
POST   /api/admin/media/bulk-upload
PATCH  /api/admin/media/{id}
POST   /api/admin/media/{id}/archive
POST   /api/admin/media/{id}/replace-file
GET    /api/admin/galleries
POST   /api/admin/galleries
PATCH  /api/admin/galleries/{id}
GET    /api/admin/videos
POST   /api/admin/videos
PATCH  /api/admin/videos/{id}
```

## Media Fields

- `id`
- `file_path`
- `file_type`
- `file_size`
- `original_filename`
- `title`
- `caption`
- `source_credit`
- `alt_text`
- `is_archived`

## Gallery Fields

- `id`
- `title`
- `gallery_date`
- `cover_media_id`
- `related_record_type`
- `related_record_id`
- `public_visibility`
- `display_order`
- `location`
- `short_description`
- `media_ids`

## Video Fields

- `id`
- `youtube_url`
- `youtube_video_id`
- `title`
- `source_channel_name`
- `thumbnail_url`
- `related_record_type`
- `related_record_id`
- `video_date`
- `short_description`
- `public_visibility`
- `show_on_homepage`
- `display_order`
- `homepage_start_date`
- `homepage_end_date`

## Validation

- YouTube URL must be valid.
- Extract and store `youtube_video_id`.
- Fetch thumbnail automatically when possible.
- Linked media cannot be permanently deleted.

## Permissions

- Public: public galleries/videos only.
- Content Editor: upload media and create/edit galleries/videos.
- Publisher: publish/archive gallery and video records where applicable.
- Super Administrator: full access including unused permanent deletion.

## Lifecycle Rules

- Linked media cannot be permanently deleted.
- Media may be archived or replaced.
- YouTube videos are linked/embedded, not uploaded.

## Non-Goals

- Direct video hosting.
- Mandatory per-image metadata.
- Document/media download analytics.
