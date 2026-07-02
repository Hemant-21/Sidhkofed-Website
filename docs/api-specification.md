# SIDHKOFED CMS REST API Specification (v1)

## Status and source precedence

This is the implementation contract for the Phase 1 CMS API. Document precedence
is fixed: **(1)** the CMS Requirements Document (`sidhkofed-cms-codex-context.md`),
**(2)** `database-schema-design.md`, **(3)** this API specification, **(4)**
`claude-master-build-context.md`. A higher-priority document always wins on
conflict. The older module files in `docs/api-context/` are superseded by this
document. No endpoint below requires a new database entity.

Base URL: `/api/v1`. The only namespaces are `/api/v1/public/*`,
`/api/v1/admin/*`, and `/api/v1/auth/*`; there is no un-versioned `/api/...`
contract. API fields use `snake_case`; resource path segments use `kebab-case`;
IDs are UUIDs. Dates use `YYYY-MM-DD`; timestamps use ISO-8601 UTC. Every response
uses the single envelope defined in §1.4 (`{success,data,meta}` /
`{success,data,pagination,meta}` / `{success:false,error,meta}`). For readability,
endpoint tables below omit the `/api/v1` prefix; for example, `POST /auth/login`
means `POST /api/v1/auth/login`.

## 1. Architecture and cross-cutting contract

### 1.1 Namespaces and versioning

| Namespace | Audience | Authentication |
|---|---|---|
| `/api/v1/public/*` | Website and mobile clients | None, except protected submission controls |
| `/api/v1/admin/*` | CMS | Bearer access token |
| `/api/v1/auth/*` | CMS session management | Varies by action |

`v1` is immutable for breaking changes. Additive fields and endpoints are
backward-compatible; breaking changes create `/api/v2` and run in parallel.
The legacy `/api/*` paths, if retained during migration, are redirects/proxies
only and must not become a second contract.

### 1.2 Authentication and authorization

`POST /auth/login` issues a short-lived JWT access token and a rotating refresh
token. Send the access token as `Authorization: Bearer <token>`. Store the
refresh token in a Secure, HttpOnly, SameSite cookie for browser CMS clients; a
native CMS client may store it in secure device storage and submit it in the
refresh request body. Do not put either token in a URL.

Authorization is permission-based, with the seeded role baseline below:

| Role | Baseline |
|---|---|
| Super Admin | All permissions, master/user/settings management, immutable slug override and draft deletion |
| Content Editor | Read masters; create and edit draft content only; upload/reuse media when granted; cannot publish, archive, restore, manage settings/users |
| Publisher | Read/edit where granted, plus publish, unpublish, archive and restore; no user/settings/master administration by default |

Every protected endpoint checks both the named permission (`events.create`,
`documents.archive`, and so on) and ownership/state constraints. A Content
Editor may not alter an already-published record into a draft edit through a
generic PATCH. All state changes create `audit_logs` entries.

### 1.3 Public visibility and lifecycle

A public resource is returned only when `publication_state=published`,
`public_visibility=true`, `archived_at IS NULL`, and `publish_start_at` is null
or due. Details apply the same predicate. Public responses never reveal internal
notes, audit fields, protected asset storage keys, or unpublished links.

Lifecycle actions are explicit: `publish`, `unpublish`, `archive`, and `restore`.
Slugs are generated once on creation and stay stable; only Super Admin may change
one, with an audit entry. Published records cannot be hard-deleted. A hard delete
is only permitted for a draft, never-published, unlinked record and is not a
standard CMS endpoint.

### 1.4 Standard envelopes, errors, pagination, and filtering

There is exactly **one** response envelope across every endpoint (public, admin,
auth). It is mandatory; no alternative response shape exists anywhere in this API.

Single-resource success:

```json
{"success":true,"data":{"id":"uuid","slug":"example"},"meta":{"request_id":"req_..."}}
```

Mutation success may add `message` inside `meta`; `201 Created` includes `Location`.
List success:

```json
{"success":true,"data":[],"pagination":{"page":1,"page_size":20,"total_items":0,"total_pages":0},"meta":{"request_id":"req_..."}}
```

`page` defaults to 1; `page_size` defaults to 20 and is capped at 100. Invalid
pages return an empty list, not an error. Cursor pagination is not needed for v1,
but `meta.next_cursor` may be added later without breaking this contract.

Errors always use:

```json
{"success":false,"error":{"code":"validation_error","message":"Validation failed.","fields":{"title_en":["This field is required."]}},"meta":{"request_id":"req_..."}}
```

`success` is `true` for any 2xx response and `false` for any 4xx/5xx response.
On success `error` is absent; on failure `data`/`pagination` are absent and `error`
is present. `error.fields` is optional and only present for `validation_error`.

Use `400` malformed request, `401` authentication_required, `403`
permission_denied, `404` not_found, `409` conflict/protected_record, `422`
validation_error, `429` rate_limited, and `415` unsupported_file_type. Never
leak authorization-sensitive existence through a public detail response.

All list endpoints accept `page`, `page_size`, `search` where listed and
`ordering` only from each endpoint's allow-list. Reject unknown filters and
ordering values with `422`; do not pass arbitrary client fields to Prisma.
Repeated relation filters accept comma-separated UUIDs/slugs, OR within a field
and AND across fields unless documented otherwise.

Common references are compact:

```json
{"id":"uuid","slug":"lac","name_en":"Lac","name_hi":null}
```

Media references expose `id`, `url`, `file_name`, `mime_type`, `title`,
`alt_text`, `caption`, `width`, and `height`. Document references expose `id`,
`slug`, bilingual title, document type, `file_url`, language and publication date.

### 1.5 Search and caching

`GET /public/search` queries schema-backed PostgreSQL metadata search vectors;
it searches editorial text and document metadata only—never PDF content. It
uses a query length of 2–120 characters and returns lightweight, paginated
results. Cache public master lists and public GET responses with ETag/
`If-None-Match`; admin and enquiry responses are `no-store`.

## 2. Authentication APIs

| Endpoint | Request / validation | Response and permission |
|---|---|---|
| `POST /auth/login` | `{email,password}`. Email is normalized; password required; only active users may sign in. Apply IP/account throttling and generic invalid-credential messages. | `200 {success:true,data:{access_token,expires_in,token_type:"Bearer",user}}`; refresh cookie set. Public. Write login audit and `last_login_at`. |
| `POST /auth/refresh` | Browser: refresh cookie; native client: `{refresh_token}`. Reject expired, reused, revoked or malformed tokens; rotate on success. | Same token/user payload as login. Public token operation. |
| `POST /auth/logout` | Refresh cookie or `{refresh_token}`. Idempotent. | `204`; revoke current refresh token and clear browser cookie. Authenticated/valid-refresh-token caller. |
| `GET /auth/me` | No body; valid bearer token required. | `200 {success:true,data:{id,email,full_name,preferred_language,is_active,roles,permissions}}`. Authenticated user. |

Never return `password_hash`, role junction rows, or token values from `me`.

## 3. Shared admin resource pattern

For every publishable resource marked **P** below, the standard admin endpoints
exist in addition to its module-specific endpoints:

```text
GET /admin/{resource}        POST /admin/{resource}
GET /admin/{resource}/{id}   PATCH /admin/{resource}/{id}
POST /admin/{resource}/{id}/publish
POST /admin/{resource}/{id}/unpublish
POST /admin/{resource}/{id}/archive
POST /admin/{resource}/{id}/restore
```

Create returns `201`; PATCH is partial and returns `200`. Create/PATCH accepts
only model-backed fields and related-ID arrays. It may accept workflow fields
(`public_visibility`, `publish_start_at`, `highlight_type`, highlight dates,
`display_order`, `show_on_homepage`) but cannot transition publication state;
the action endpoint does that. `created_by`/`updated_by` are server-set.
`highlight_type` is one of `new | latest | important | urgent | featured` (null/omitted
= no highlight); the scheduler clears the label when `highlight_end_at` passes and never
unpublishes the record.

Publish validates required public fields and scheduled date rules; archive hides
the record immediately. Restore returns it to its pre-archive publication state.
All action endpoints return the updated admin representation.

## 4. Master data APIs

Admin master route: `GET|POST /admin/masters/{master_key}`;
`GET|PATCH /admin/masters/{master_key}/{id}`;
`POST /admin/masters/{master_key}/{id}/activate|deactivate`.
Super Admin has create/update/activation; Content Editor and Publisher have
read-only dropdown access. No delete endpoint exists. `POST` requires
`name_en`; `slug` is server-generated unless Super Admin supplies a valid unique
one. `name_hi`, `display_order`, and `is_active` are optional. Duplicate
`name_en`/slug is `409`; deactivation preserves references.

| Master key | Extra writable fields / validation | Public route |
|---|---|---|
| `event-types`, `training-types`, `institution-types`, `document-types`, `knowledge-categories`, `communication-types`, `tender-types`, `procurement-update-types`, `faq-categories`, `enquiry-types` | shared fields only | `/public/masters/{key}` where required by a public filter/form |
| `commodities` | `description_en`, `description_hi`, `icon_media_id` | `/public/masters/commodities` |
| `districts` | `state` (defaults Jharkhand) | `/public/masters/districts` |
| `blocks` | `district_id` required; list filters `district_id`/`district` | `/public/masters/blocks` |
| `financial-years` | `label`, `start_date`, `end_date` required; label unique, start <= end | `/public/masters/financial-years` |
| `reporting-periods` | `period_type` in `month\|financial_year\|calendar_year\|cumulative` required; `start_date`/`end_date` required except for `cumulative`; `calendar_year` required for `calendar_year`; `financial_year_id` required for `month`/`financial_year` and dates must fit that year | `/public/masters/reporting-periods` |
| `tags` | shared fields; internal document classification only | none by default |

Public master responses include active values only and may be filtered by
`district`. They are unpaginated only when the server-defined list is small;
otherwise they follow standard pagination.

## 5. Public website APIs

All public list/details use the visibility predicate and standard envelope.

| Resource | Endpoints and filters | Summary/detail contract |
|---|---|---|
| Home | `GET /public/home` | Curated aggregate: active headline KPIs, highlighted/latest news and events, communications, tenders, success stories, partner institutions, cards, and max 3 featured videos. Supports `language`; no CMS-internal data. |
| Events | `GET /public/events`, `GET /public/events/{slug}`. Filters: `event_type`, `event_status`, `district`, `block`, `commodity`, `programme`, `date_from`, `date_to`, `year`, `show_on_homepage`; ordering `start_date,-start_date,-published_at,display_order`. | List: title, type, dates, status, location, district, cover, summary, slug. Detail adds description, all linked masters, documents, galleries and validated `dynamic_values`. |
| News | `GET /public/news`, `GET /public/news/{slug}`. Filters `event`, `year`, `show_on_homepage`; ordering `-news_published_at,-published_at,display_order`. | Independent news fields plus compact source-event reference. |
| Programmes | `GET /public/programmes`, `GET /public/programmes/{slug}`. Filters `year`, `show_on_homepage`; ordering `display_order,-published_at,start_date`. | Summary; detail adds description, funding source, dates, cover. |
| Toolkits | `GET /public/toolkits`, `GET /public/toolkits/{slug}`, `GET /public/toolkits/{slug}/distribution-summary`. Filters `commodity`, `programme`; ordering `display_order,-published_at`. | Detail includes ordered `toolkit_items` (with `distribution_basis`). The summary endpoint aggregates published per-event `toolkit_distribution_summaries` and returns `{toolkit,distribution_model_breakdown,total_participants_covered,items:[{id,name_en,unit,distribution_basis,total_quantity}],total_quantity}` — summary figures only, never beneficiary-level data. |
| Institutions | `GET /public/institutions`, `GET /public/institutions/{slug}`, `GET /public/home/partners`. Filters `institution_type`, `district`, `show_on_homepage`; ordering `display_order,name_en`. | Detail has logo, website and approved contact fields. `home/partners` returns a capped lightweight partner list. |
| Documents | `GET /public/documents`, `GET /public/documents/{slug}`. Filters `document_type`, `knowledge_category`, `knowledge_centre`, `programme`, `commodity`, `institution`, `district`, `financial_year`, `language`, `year`; ordering `-publication_date,-published_at,title_en`. | Metadata and safe `file_url`; detail adds all document junction references. `knowledge_centre=true` requires `show_in_knowledge_centre=true`. |
| Communications | `GET /public/official-communications`, `GET /public/official-communications/{slug}`. Filters `communication_type`, `year`, `highlight`, `show_on_homepage`; ordering `-issue_date,-published_at,display_order`. | Includes reference number, dates, authority and optional document. Expiry is informational. |
| Tenders | `GET /public/tenders`, `GET /public/tenders/{slug}`. Filters `tender_type`, `tender_status`, `year`; ordering `-submission_deadline,-publish_date`. | Includes `gem_url`; no tender-file/transaction endpoints. |
| Procurement | `GET /public/procurement-updates`, `GET /public/procurement-updates/{slug}`. Filters `procurement_update_type`, `commodity`, `district`, `block`, `programme`, `date_from`, `date_to`, `year`; ordering `-effective_date,-published_at`. | Includes rate/unit, date range, location and optional document; informational only. |
| Success stories | `GET /public/success-stories`, `GET /public/success-stories/{slug}`. Filters `commodity`, `district`, `year`; ordering `-story_date,-published_at`. | Detail adds full body and cover. |
| Pages/menus | `GET /public/pages/{slug}`, `GET /public/menus?location=header|footer|utility`. | Page returns title/body/meta and stable slug. Menu is a nested active tree; each item resolves a `url` or referenced page route. |
| Galleries/videos | `GET /public/galleries`, `GET /public/galleries/{slug}`, `GET /public/videos`, `GET /public/videos/{slug}`. Filters `show_on_homepage`; ordering `display_order,-published_at`. | Gallery detail has ordered images/captions. Video exposes YouTube URL/id and thumbnail; never a hosted video file. |
| FAQs/services | `GET /public/faqs?faq_category=&search=`, `GET /public/digital-services`. | FAQ ordering by category/display order; service lists external URLs (opened by client in a new tab). |
| Memberships | `GET /public/memberships`, `GET /public/memberships/{slug}`. Filters `institution`, `membership_level`, `membership_type`, `district`, `reporting_period`, `year`; ordering `display_order,join_date`. | Institutional directory only; no personal, voting, or dividend data. `membership_level` (`sidhkofed`/`district_union`) and `membership_type` (`primary`/`nominal`) are independent axes feeding dashboard reports #10–#13. |
| Dashboard | `GET /public/dashboard`, `GET /public/dashboard/kpis`, `GET /public/dashboard/{report_key}`. Filters `financial_year`, `reporting_period`; report may additionally support `month`, `calendar_year`, `cumulative` when its fixed layout supports them. | Active public fixed reports and resolved metrics only. KPI endpoint returns the configured homepage-safe subset, and `/public/home` may embed the same response. |

`GET /public/search?q=` accepts `content_type`, `commodity`, `district`,
`programme`, `year`, `page`, and `page_size`. `content_type` is one or more of
`event,news,programme,document,official_communication,tender,procurement_update,success_story,page`
— exactly the surfaces with a backing `search_vector` (spec §14 scope). Each is
metadata/editorial text only; PDF/file bodies are never searched. Result fields are
`content_type,id,slug,title_en,title_hi,summary,publication_date,cover_media,public_url`.
(`faq,digital_service,video,gallery` are intentionally excluded; add `search_vector`
columns first if they are ever required.)

## 6. Admin CMS APIs by module

### Events and derived news

Use the shared **P** pattern at `/admin/events`. Create requires
`event_type_id`, `title_en`, `date_mode`, and `start_date`; `summary_en` and
`location_text` are optional according to the approved schema. `date_mode` is
`single|range|multi_day`; `end_date` is required for `range`/`multi_day` and
cannot precede start. Accept nullable `training_type_id`, `district_id`,
`block_id`, `cover_media_id`; relation arrays `commodity_ids`, `programme_ids`,
`institution_ids`, `document_ids`, `gallery_ids`; and `dynamic_values`.
`block_id` must belong to `district_id` when both are set. Dynamic values must
match active `event_field_definitions` for the chosen type (allowed field keys,
data types, required fields and select options). `event_status` is derived from
dates unless `status_override=true`, in which case it may only be postponed or
cancelled. Post-completion fields `outcome_summary_en`, `outcome_summary_hi`,
`key_highlights`, and `final_participant_count` are accepted only when
`event_status='completed'`; the public event detail returns them when present.

`POST /admin/events/{id}/publish-as-news` requires a completed event and
publisher permission. Body is optional overrides:
`title_en,title_hi,summary_en,summary_hi,body_en,body_hi,cover_media_id,
news_published_at,public_visibility,publish_start_at,show_on_homepage`.
It creates one `event_news` record (`201`) with its own stable slug/lifecycle.
`GET /admin/news`, `GET|PATCH /admin/news/{id}`, and the standard **P** action
routes at `/admin/news/{id}` manage that derived record; they never mutate the
source event.

Super Admin-only controlled-field routes are:

```text
GET|POST /admin/event-types/{event_type_id}/field-definitions
PATCH /admin/event-types/{event_type_id}/field-definitions/{id}
POST /admin/event-types/{event_type_id}/field-definitions/{id}/activate|deactivate
```

They accept only `field_key,label_en,label_hi,data_type,is_required,options,
display_order,is_active`; `options` is required only for `select`.

Example creation request:

```json
{"event_type_id":"uuid","title_en":"Lac cultivation training","date_mode":"single","start_date":"2026-07-15","district_id":"uuid","commodity_ids":["uuid"],"programme_ids":["uuid"],"dynamic_values":{"participant_count":45},"public_visibility":true}
```

### Programme, toolkit, institution, document, communication, tender, procurement, and story

| Module (admin base) | Required create fields | Additional writable fields / validation |
|---|---|---|
| **P** `/admin/programmes` | `title_en` | bilingual summary/description, `short_code`, funding source, start/end dates, cover, and relation arrays `commodity_ids`, `permitted_training_type_ids`. End cannot precede start. Linked toolkits are managed from the toolkit side (`toolkits.programme_scheme_id`). When `permitted_training_type_ids` is set, event create validates `training_type_id` against the chosen programme's permitted set. |
| **P** `/admin/toolkits` | `title_en` | bilingual text, `programme_scheme_id`, `commodity_id`, cover. Nested items and per-event distributions are managed separately. |
| `/admin/toolkits/{toolkit_id}/items` | `name_en` | `GET,POST`; `GET,PATCH,DELETE` on `{item_id}`. Accept description, unit, `distribution_basis` (`individual`/`group`), `default_quantity_per_unit`, `default_group_size`, non-negative `quantity_summary`, `is_active`, display order. Editor may change draft parent; a publisher manages published parent items. |
| `/admin/events/{event_id}/toolkit-distributions` | `toolkit_id`, `distribution_model` | `GET,POST`; `GET,PATCH,DELETE` on `{id}`. Training-level summary only. Accept `distribution_done`, `distribution_model` (`individual`/`group`/`mixed`), `participants_covered`, `distribution_date`, bilingual remarks, and `items:[{toolkit_item_id,distribution_basis,quantity_per_unit,number_of_units_or_groups,total_quantity,manual_override}]`. When `manual_override=false` and basis=`group`, `total_quantity = quantity_per_unit * number_of_units_or_groups`. No beneficiary-level rows, stock ledger, or acknowledgements. |
| **P** `/admin/institutions` | `institution_type_id`, `name_en` | bilingual text, website (valid http/https URL), logo, district, email, phone. Partner homepage display is the normal `show_on_homepage` workflow field. |
| **P** `/admin/documents` | `title_en`, `document_type_id`, `file_asset_id`, `language` | bilingual description, publication date, public flags, knowledge category, FY, and relation arrays `commodity_ids,programme_ids,institution_ids,district_ids,tag_ids`. `knowledge_category_id` is required when knowledge-centre flag is true. Asset must be a permitted document media asset. |
| **P** `/admin/official-communications` | `title_en`, `communication_type_id` | summary/body, reference number, issue/effective/expiry dates, authority, document ID. Validate chronological dates; do not auto-expire. |
| **P** `/admin/tenders` | `title_en`, `tender_type_id` | summary, number, dates, status `open|closed|cancelled|awarded`, valid HTTPS `gem_url`. Opening may not precede publish; deadline is a timestamp. |
| **P** `/admin/procurement-updates` | `title_en`, `procurement_update_type_id` | bilingual content, commodity, decimal rate, unit, effective/period dates, district/block/location, programme, document, `status` (informational, e.g. `active`/`closed`/`upcoming`). Period end cannot precede start; block/district consistency applies. |
| **P** `/admin/success-stories` | `title_en` | bilingual summary/body, commodity, district, cover, story date, and `source_type` in `event|programme|procurement_update|independent` with `source_record_id` (required unless `independent`; validated against the table implied by `source_type`, and source data may be prefilled). |

Document replacement is `POST /admin/documents/{id}/replace-file` with
`{file_asset_id}`. It validates a document-like, non-archived asset, atomically
updates `file_asset_id`, creates usage records, retains the logical document ID,
and audits `media_replace`; it does not create a new Document.

### Pages, menus, FAQ, digital services, memberships

| Module | Endpoints and requirements |
|---|---|
| Pages | **P** `/admin/pages`; create requires `title_en`. Accept body and page-only meta title/description fields. Slug is the public route key and protected as described above. |
| Menus | `GET|POST /admin/menu-items`; `GET|PATCH|DELETE /admin/menu-items/{id}`; `POST /admin/menu-items/reorder`. Require bilingual label and `location=header|footer|utility`; allow `url` or `page_id` (at least one), parent, new-tab and order. Validate referenced page, no self/cyclic parent and URL scheme. Only Super Admin may delete; deletion cascades child rows per schema, so response must require an explicit `confirm=true`. |
| FAQs | **P** `/admin/faqs`; create requires `question_en`, `answer_en`; optional category/bilingual text/order. Public filters category/search. |
| Digital services | **P** `/admin/digital-services`; create requires `title_en`, `external_url`; validate https URL and optional icon. |
| Memberships | **P** `/admin/memberships`; create requires `institution_id`, `membership_level` in `sidhkofed|district_union`, `membership_type` in `primary|nominal`; accept `membership_number`, `district_id`, `district_union_id` (required when `membership_level=district_union`), `reporting_period_id`, `status`, join date and notes. `POST /admin/memberships/bulk-upload` accepts CSV/XLSX rows with those same fields, validates every row before one transaction creates the records, and returns `{created_count,skipped_count,errors:[{row,fields}]}`. The uploaded file is processed in-memory and is not persisted as a new import entity; clients correct invalid rows and retry. |

### Enquiries

`POST /public/enquiries` accepts exactly `name,mobile,email,enquiry_type_id,
subject,message` and optional `organization,commodity_id,programme_scheme_id`,
plus an opaque `captcha_token`. Reject attachments and unknown fields. Validate
email, normalized mobile number, active enquiry type and referenced masters,
trimmed length bounds, CAPTCHA score/challenge, honeypot, request origin and a
deduplication fingerprint. Rate limit by IP hash and email/mobile fingerprint
(recommended 5/hour/IP and 3/hour/contact; tune in deployment). Store only the
privacy-safe IP hash; mark suspicious traffic in `spam_state`. Return `201
{success:true,data:{id,submitted_at},meta:{message:"Enquiry submitted."}}` without an
acknowledgement email to the user. A configured recipient notification is a
server-side integration, not an API response.

Admin: `GET /admin/enquiries`, `GET /admin/enquiries/{id}`, `PATCH
/admin/enquiries/{id}`, `POST /admin/enquiries/{id}/archive`, and `GET
/admin/enquiries/export?format=xlsx`. PATCH accepts only `internal_notes` and
`spam_state`; never public contact edits. Filters: `enquiry_type,spam_state,
archived,date_from,date_to,commodity,programme,search`. Archive is idempotent.
Export is asynchronous when the result is large: `202 {success:true,data:{job_id,status}}`;
otherwise returns a streamed XLSX attachment. Enquiry export is the only v1 data
export endpoint. Publisher and Super Admin may manage it; editors have no
default access.

### Media, galleries, and video

`POST /admin/media` is multipart `file` plus optional `title,alt_text,caption`.
It creates a `media_assets` row after server-side MIME sniffing, size/type limit,
checksum calculation and object storage write. Response omits `storage_key`.
`POST /admin/media/bulk-upload` accepts multiple files and returns per-file
accepted/rejected results. `GET /admin/media` filters `mime_type,archived,
search,used_by`; `GET|PATCH /admin/media/{id}` changes descriptive metadata;
`POST /admin/media/{id}/archive` soft-archives; `GET /admin/media/{id}/usages`
returns `media_usages` references. `POST /admin/media/{id}/replace-file` accepts
multipart file and creates a new media asset with `replaced_by_id` chain, then
returns both old/new references. A used asset cannot be hard-deleted.

Galleries use the **P** pattern at `/admin/galleries`. Create requires
`title_en`; accepts description, cover and standard workflow. Images use
`GET|POST /admin/galleries/{gallery_id}/images`, `PATCH|DELETE
/admin/galleries/{gallery_id}/images/{image_id}`, and reorder endpoint. An image
body is `{media_id,display_order,caption_en,caption_hi}`; duplicate gallery/media
pairs are `409`.

Videos use the **P** pattern at `/admin/videos`. Create requires `title_en` and
`youtube_url`; service validates an accepted YouTube watch/share/embed URL,
extracts the 11-character `youtube_id`, normalizes the canonical URL, and rejects
other hosts. `thumbnail_media_id` is optional. At publish time, enforce no more
than three currently public `show_on_homepage=true` videos; return `409` if the
cap would be exceeded.

`POST /admin/videos/validate-url` is a stateless pre-check the CMS form calls
before create/update so the editor gets instant feedback. Body `{youtube_url}`;
it applies the same accepted-host/URL parsing, and on success returns
`200 {success:true,data:{valid:true,youtube_id,canonical_url,thumbnail_url}}` (the derived
`https://i.ytimg.com/vi/{youtube_id}/hqdefault.jpg`), or
`422 {success:false,error:{code:"validation_error",fields:{youtube_url:[...]}}}` on a rejected
host/format. It creates no record and requires `videos.create`.

### Dashboard

Dashboard reports are fixed, code-referenced records. `GET|POST /admin/dashboard/reports`,
`GET|PATCH /admin/dashboard/reports/{id}`, and standard lifecycle routes manage
the report definition (Super Admin for create/layout; Publisher for lifecycle).
Create requires unique `report_key,title_en`; `layout_config` is an approved
fixed presentation descriptor, never a user-defined report builder.

Metrics: `GET|POST /admin/dashboard/reports/{report_id}/metrics`, `PATCH|DELETE
/admin/dashboard/reports/{report_id}/metrics/{id}`. Require `metric_key,label_en`
and exactly one of `value`/`value_text`; accept unit, FY, reporting period,
source, dataset and order. Reporting-period granularity is Month, Financial Year,
Calendar Year, or Cumulative (the `reporting_periods.period_type` set); the
membership reports (#10–#13) read `membership_level`×`membership_type` for the
selected period. The unique report/metric/FY/period combination gives `409` on
duplicates.

Datasets: `GET|POST /admin/dashboard/reports/{report_id}/datasets`; `GET
/admin/dashboard/datasets/{id}`; `POST /admin/dashboard/reports/{report_id}/datasets/upload`.
Manual create accepts source, period and validated tabular rows. Upload is
multipart XLSX/CSV media upload followed by parser validation against report
layout, financial year/reporting period and masters. It creates `dashboard_datasets`
with `pending|processed|failed`, stores controlled `raw_rows`, and creates/updates
durable metrics transactionally when processed. Content Editor needs an explicit
dashboard-data grant; Publisher/Super Admin control public report lifecycle.

### Users, settings, and audit

Super Admin only: `GET|POST /admin/users`, `GET|PATCH /admin/users/{id}`.
Create requires email, full name, password and `role_ids`; email is unique;
password is hashed; no password hash returns. PATCH can change name, language,
active state, roles and password (with strength validation). Deactivate rather
than delete users with history.

Settings: `GET /admin/settings`, `GET|PUT /admin/settings/{key}`. Settings are
schema-backed keys stored in `settings` (`value_text` or `value_json`), including
site/footer text, social links, translation settings, upload restrictions and
enquiry recipient. Validate each known key with an allow-listed typed schema;
reject unknown keys. Suggested groups are `site`, `footer`, `social`, and
`translation`; grouping is a response concern, not new tables.

Audit is read-only: `GET /admin/audit-logs`, `GET /admin/audit-logs/{id}`.
Super Admin only. Filters `module,record_id,user_id,action,date_from,date_to`,
ordering `-created_at,created_at`; payload contains user reference, action,
module, record ID, states, concise change summary, safe metadata and timestamp.

## 7. File upload and storage architecture

1. CMS client sends authenticated multipart upload to the media endpoint; the
server authorizes before accepting bytes, validates type/size by inspection,
computes a checksum and creates a uniquely named private object-storage key.
2. The server records immutable file metadata in `media_assets`, returns a
safe delivery URL (CDN/signed URL policy), and records upload audit data. Files
are stored outside database rows; PostgreSQL stores metadata and references.
3. Images and binary documents share `media_assets`; a Document is the governed
metadata record that points to a file asset. This permits reuse without copies.
4. Linking/unlinking media is transactional with `media_usages` so archive/delete
protection is accurate. A public document/file URL is authorized from the parent
public visibility rule.
5. Replacing a document swaps `documents.file_asset_id` but preserves the
Document UUID/slug and the old asset's history. Replacing a generic media file
creates a new asset and sets the old asset's `replaced_by_id`; callers update
chosen usages deliberately. No linked asset is physically removed by the API.

Run malware scanning/quarantine before public availability, strip unsafe image
metadata where required, use signed direct-upload URLs only when the server can
still enforce completion validation, and apply storage lifecycle/backup policy
outside the API.

## 8. RBAC endpoint matrix

Legend: `R` read, `C/U` create/update draft, `L` lifecycle (publish/unpublish/
archive/restore), `M` full manage; `—` no baseline access. “Publisher U” is
only when the corresponding update permission is granted.

| Endpoint family | Super Admin | Content Editor | Publisher |
|---|---:|---:|---:|
| Auth `me/logout` | R | R | R |
| Public endpoints and enquiry submit | Public | Public | Public |
| Admin list/detail of content, masters, media | M | R | R |
| Events/news/programmes/toolkits/institutions/documents/communications/tenders/procurement/stories/pages/FAQs/services/memberships/galleries/videos: create/PATCH | M | C/U draft | Publisher U |
| Same content lifecycle action endpoints | M | — | L |
| Toolkit items/gallery images | M | C/U on draft parent | Publisher U/L parent |
| Event field definitions | M | — | — |
| Masters activate/deactivate/create/PATCH | M | R | R |
| Media upload/metadata/archive/replace/usages | M | C/U if media grant | C/U/L if media grant |
| Menus create/PATCH/reorder | M | C/U draft configuration only if granted | Publisher U |
| Menu delete | M | — | — |
| Dashboard reports/layout | M | R | R/L if granted |
| Dashboard metrics/datasets/upload | M | C/U if dashboard grant | C/U/L if granted |
| Enquiries list/detail/notes/archive/export | M | — | M |
| Users and settings | M | — | — |
| Audit logs | M | — | — |

The permission seeder should create module/action permissions for each row;
roles are defaults, not a substitute for endpoint permission checks.

## 9. OpenAPI readiness review

- All approved CMS modules are represented: identity/RBAC, masters, events/news,
  programmes, toolkits, institutions, documents/Knowledge Centre, communications,
  tenders, procurement, stories, pages/menus, media/galleries/videos, FAQ,
  digital services, institutional memberships, enquiries, dashboard, settings,
  audit and search.
- Every relationship is expressed as an existing UUID reference or existing
  junction-array; no new entity, transactional ERP/MIS workflow, event
  registration, direct video hosting or PDF-body search is introduced.
- List/detail shapes, server-side filter allow-lists, ETags, stable slugs,
  compact references and protected upload flow are suitable for web and mobile
  clients.
- All write paths map directly to the approved Prisma tables and fields;
  controlled JSON remains limited to `dynamic_values`, dashboard import staging,
  audit metadata and fixed report layout configuration.
- Controllers can be generated from these paths; services must enforce lifecycle,
  RBAC, visibility, master activation, media usage and audit rules; validators
  implement the field/date/URL/file constraints stated above.

## Appendix A — Representative payloads

These concrete examples are illustrative; each module's prose above remains the
authoritative field/validation contract. All examples use the single §1.4
envelope (`success` + `data`/`pagination` or `error`, plus `meta`).

### A.1 Paginated list envelope (e.g. `GET /public/events`)

```json
{
  "success": true,
  "data": [
    {
      "id": "8f1c2e3a-...-uuid",
      "slug": "lac-cultivation-training-gumla-2026",
      "title_en": "Lac cultivation training",
      "title_hi": "लाख खेती प्रशिक्षण",
      "summary_en": "Two-day field training for producer groups.",
      "event_type": {"id": "uuid", "slug": "training", "name_en": "Training", "name_hi": "प्रशिक्षण"},
      "event_status": "completed",
      "date_mode": "range",
      "start_date": "2026-02-10",
      "end_date": "2026-02-11",
      "location_text": "Krishi Bhawan, Gumla",
      "district": {"id": "uuid", "slug": "gumla", "name_en": "Gumla", "name_hi": null},
      "commodities": [{"id": "uuid", "slug": "lac", "name_en": "Lac", "name_hi": null}],
      "cover_media": {"id": "uuid", "url": "https://cdn.example/ev/cover.jpg", "file_name": "cover.jpg", "mime_type": "image/jpeg", "title": null, "alt_text": "Trainees in field", "caption": null, "width": 1600, "height": 900},
      "public_url": "/events/lac-cultivation-training-gumla-2026"
    }
  ],
  "pagination": {"page": 1, "page_size": 20, "total_items": 137, "total_pages": 7},
  "meta": {"request_id": "req_01H/..."}
}
```

### A.2 Detail response (e.g. `GET /public/events/{slug}`)

```json
{
  "success": true,
  "data": {
    "id": "8f1c2e3a-...-uuid",
    "slug": "lac-cultivation-training-gumla-2026",
    "title_en": "Lac cultivation training", "title_hi": "लाख खेती प्रशिक्षण",
    "summary_en": "Two-day field training...", "summary_hi": null,
    "description_en": "<full bilingual body>", "description_hi": null,
    "event_type": {"id": "uuid", "slug": "training", "name_en": "Training", "name_hi": "प्रशिक्षण"},
    "training_type": {"id": "uuid", "slug": "skill", "name_en": "Skill", "name_hi": null},
    "event_status": "completed", "date_mode": "range",
    "start_date": "2026-02-10", "end_date": "2026-02-11", "location_text": "Krishi Bhawan, Gumla",
    "district": {"id": "uuid", "slug": "gumla", "name_en": "Gumla", "name_hi": null},
    "block": {"id": "uuid", "slug": "bishunpur", "name_en": "Bishunpur", "name_hi": null},
    "commodities": [{"id": "uuid", "slug": "lac", "name_en": "Lac", "name_hi": null}],
    "programmes": [{"id": "uuid", "slug": "mfp-2026", "title_en": "MFP Value Chain 2026"}],
    "institutions": [{"id": "uuid", "slug": "jslps", "name_en": "JSLPS"}],
    "documents": [{"id": "uuid", "slug": "training-schedule", "title_en": "Training schedule", "title_hi": null, "document_type": "schedule", "file_url": "https://cdn.example/doc/x.pdf", "language": "en", "publication_date": "2026-02-01"}],
    "galleries": [{"id": "uuid", "slug": "lac-training-gallery", "title_en": "Photos", "cover_media": {"id": "uuid", "url": "https://cdn.example/g/cover.jpg"}, "image_count": 12}],
    "cover_media": {"id": "uuid", "url": "https://cdn.example/ev/cover.jpg", "alt_text": "Trainees", "caption": null, "width": 1600, "height": 900},
    "dynamic_values": {"participant_count": 45, "trainer_name": "..."},
    "translation_source": "manual",
    "highlight_type": null,
    "published_at": "2026-02-12T06:30:00Z",
    "public_url": "/events/lac-cultivation-training-gumla-2026"
  },
  "meta": {"request_id": "req_01HZ/..."}
}
```

### A.3 Create request + 201 response (e.g. `POST /admin/documents`)

```json
// Request
{
  "title_en": "Annual Report 2025-26",
  "title_hi": null,
  "description_en": "SIDHKOFED annual report.",
  "document_type_id": "uuid",
  "file_asset_id": "uuid",
  "publication_date": "2026-05-01",
  "language": "en",
  "is_public": true,
  "show_in_knowledge_centre": true,
  "knowledge_category_id": "uuid",
  "financial_year_id": "uuid",
  "commodity_ids": ["uuid"],
  "programme_ids": ["uuid"],
  "institution_ids": [],
  "district_ids": ["uuid"],
  "tag_ids": ["uuid"]
}
// 201 Created  (Location: /admin/documents/{id})
{"success": true, "data": {"id": "uuid", "slug": "annual-report-2025-26", "publication_state": "draft"}, "meta": {"request_id": "req_..."}}
```

### A.4 Master object (e.g. `GET /public/masters/commodities`)

```json
{
  "success": true,
  "data": [
    {"id": "uuid", "slug": "lac", "name_en": "Lac", "name_hi": "लाख", "description_en": "...", "description_hi": null, "icon_media_id": "uuid", "display_order": 1, "is_active": true}
  ],
  "pagination": {"page": 1, "page_size": 20, "total_items": 7, "total_pages": 1},
  "meta": {"request_id": "req_..."}
}
```

### A.5 Validation-error response (HTTP 422)

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Validation failed.",
    "fields": {
      "title_en": ["This field is required."],
      "end_date": ["Must be on or after start_date."],
      "commodity_ids[0]": ["Commodity not found or inactive."]
    }
  },
  "meta": {"request_id": "req_01HZ/..."}
}
```

### A.6 Other error shapes

```json
// 401
{"success": false, "error": {"code": "authentication_required", "message": "Authentication required."}, "meta": {"request_id": "req_..."}}
// 403
{"success": false, "error": {"code": "permission_denied", "message": "You do not have permission to perform this action."}, "meta": {"request_id": "req_..."}}
// 404
{"success": false, "error": {"code": "not_found", "message": "Resource not found."}, "meta": {"request_id": "req_..."}}
// 409 (e.g. archive/delete of a referenced record)
{"success": false, "error": {"code": "protected_record", "message": "This record is linked and cannot be deleted."}, "meta": {"request_id": "req_..."}}
// 429
{"success": false, "error": {"code": "rate_limited", "message": "Too many requests. Try again later."}, "meta": {"request_id": "req_..."}}
```
