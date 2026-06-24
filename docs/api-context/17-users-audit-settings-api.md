# 17 Users, Audit Log, And Settings API

## Purpose

Support CMS administration: users, roles, audit log, and site settings.

## Admin Endpoints

```http
GET   /api/admin/users
POST  /api/admin/users
GET   /api/admin/users/{id}
PATCH /api/admin/users/{id}
GET   /api/admin/audit-log
GET   /api/admin/settings
PATCH /api/admin/settings
```

## Roles

- `super_admin`
- `content_editor`
- `publisher`

## User Fields

- `id`
- `name`
- `email`
- `role`
- `is_active`
- `last_login_at`

## Audit Log Fields

- `id`
- `user`
- `action`
- `module`
- `record_id`
- `timestamp`
- `previous_status`
- `updated_status`
- `change_summary`

## Settings Fields

- `office_name`
- `address`
- `phone`
- `email`
- `map_link`
- `office_hours`
- `social_media_links`
- `enquiry_recipient_email`
- `enquiry_email_subject_prefix`
- `enable_enquiry_email_notification`
- `footer_important_links`
- `copyright_text`
- `policy_links`
- `government_partner_logos`
- `translation_fallback_enabled`
- `default_language`
- `supported_languages`
- `public_website_url`
- `file_upload_limits`
- `allowed_file_types`

## Rules

- Only Super Administrator manages users and settings.
- Audit log is read-only.
- Track create, edit, publish, unpublish, archive, restore, file replacement,
  media archive, user changes, master changes, and configuration changes.
- No internal notification panel required.

## Permissions

- Super Administrator: full access.
- Content Editor/Publisher: no user/settings management.
- Audit log access is administrative only.

## Lifecycle Rules

- Users are deactivated rather than deleted when they have audit history.
- Audit log entries are append-only.

## Validation

- User email must be unique.
- Settings URLs, file limits, and allowed file types must be validated.

## Non-Goals

- Separate approval workflow.
- Internal CMS notification centre.
- Public audit log.
