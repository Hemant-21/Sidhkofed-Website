# 13 FAQs And Digital Services API

## Purpose

Expose FAQ content and public digital service links such as ERP, MIS, membership
application, and beneficiary tracking.

## Public Endpoints

```http
GET /api/faqs
GET /api/digital-services
```

## Admin Endpoints

```http
GET   /api/admin/faqs
POST  /api/admin/faqs
PATCH /api/admin/faqs/{id}
GET   /api/admin/digital-services
POST  /api/admin/digital-services
PATCH /api/admin/digital-services/{id}
```

## FAQ Fields

- `id`
- `question_en`
- `question_hi`
- `answer_en`
- `answer_hi`
- `faq_category_id`
- `display_order`
- `public_visibility`
- `linked_page_ids`
- `linked_module_keys`

## Digital Service Fields

- `id`
- `service_name_en`
- `service_name_hi`
- `short_description_en`
- `short_description_hi`
- `icon_media_id`
- `service_url`
- `login_required`
- `public_visibility`
- `display_order`
- `is_active`

## Filters

```http
GET /api/faqs?category=membership
GET /api/faqs?linked_module=procurement
GET /api/digital-services?is_active=true
```

## Rules

- Digital service links open in a new tab.
- FAQ entries may appear on multiple relevant pages/modules.

## Permissions

- Public: visible FAQs and active/public digital services only.
- Content Editor: create/edit FAQ and service drafts.
- Publisher/Super Administrator: publish/archive where applicable.

## Lifecycle Rules

- Digital services are activated/deactivated.
- FAQ visibility is controlled per record.

## Validation

- Digital service URLs must be valid.
- FAQ category must exist and be active for new records.

## Non-Goals

- ERP/MIS authentication through CMS.
- Public support ticket tracking.
