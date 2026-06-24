# 14 Enquiries API

## Purpose

Provide one public enquiry endpoint. Buyer, seller, godown, membership,
procurement, and contact enquiries are differentiated by `enquiry_type_id`.

## Public Endpoints

```http
POST /api/enquiries
```

## Admin Endpoints

```http
GET   /api/admin/enquiries
GET   /api/admin/enquiries/{id}
PATCH /api/admin/enquiries/{id}
POST  /api/admin/enquiries/{id}/archive
GET   /api/admin/enquiries/export
```

## Public Payload

Required:

- `name`
- `mobile`
- `email`
- `enquiry_type_id`
- `subject`
- `message`

Optional:

- `organization`
- `commodity_id`
- `programme_scheme_id`

## Internal Fields

- `id`
- `submitted_at`
- `source_ip_hash`
- `is_spam`
- `archived_at`
- `internal_notes`

## Public Success Response

```json
{
  "message": "Thank you. Your enquiry has been submitted and will be answered soon."
}
```

## Validation And Protection

- CAPTCHA required.
- Rate limiting required.
- Bot protection required.
- Repeated-submission protection required.
- No attachments.
- Email/mobile validation required.
- Store privacy-safe IP hash only.

## Admin Filters

```http
?enquiry_type=buyer
?is_spam=false
?archived=false
?date_from=2026-06-01
?date_to=2026-06-30
```

## Permissions

- Public: submit only.
- Content Editor: no default access unless assigned.
- Publisher/Super Administrator: view, annotate, archive, and export enquiries.

## Lifecycle Rules

- Enquiries are retained unless manually archived.
- Public users cannot track enquiry status.
- Excel export is allowed only for enquiries.

## Non-Goals

- Separate buyer/seller/godown enquiry modules.
- Public status tracking.
- Acknowledgement emails to user.
- Attachments.
- Exports for modules other than enquiries.
