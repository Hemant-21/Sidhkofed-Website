# SIDHKOFED CMS Integration Conventions

## Source Of Truth

The full CMS scope is now mirrored locally at
`docs/sidhkofed-cms-codex-context.md`, copied from:

`E:\OneDrive\Sidhkofed-Website\Context\CMS\SIDHKOFED_CMS_CODEX_CONTEXT.md`

Treat that full context as canonical for CMS behavior. This file is the compact
implementation naming and integration guide for connecting the static prototype
to that CMS scope.

Module-specific API context is maintained in `docs/api-context/`. Read
`docs/api-context/00-api-foundation.md` before any individual module API file.

## CMS Purpose

Build a lightweight, efficient, bilingual-ready CMS for SIDHKOFED public website
content only.

The CMS is not an ERP, MIS transaction system, beneficiary system, inventory
system, accounting system, procurement transaction system, or training
attendance system. It must support future ERP/MIS integration without making
Phase 1 dependent on ERP/MIS.

## Naming Rules

- Use `snake_case` for CMS/database fields because the supplied CMS context uses
  fields such as `title_en`, `event_type_id`, `publication_state`, and
  `public_visibility`.
- Use `PascalCase` for backend model/class names.
- Use `kebab-case` for public URLs, route slugs, section anchors, and CSS hooks.
- Use `camelCase` only for frontend JavaScript variables and optional API
  adapter objects if the frontend framework later prefers it.
- Do not rename CMS fields casually once forms, APIs, or admin screens depend on
  them.

## Public Prototype To CMS Mapping

| Prototype anchor | CMS operation/model | Notes |
|---|---|---|
| `home` | Homepage fixed composition | Mostly hard-coded; selected dynamic sections only |
| `about` | `Page` | Institutional/static page |
| `activities` | `Commodity`, `ProgrammeScheme`, `Page` | Commodity cards and activity summaries |
| `members` | `InstitutionalMembership`, `Institution` | Institution-wise membership only |
| `capacity` | `Event` | Training is an event type, not a separate module |
| `dashboard` | Dashboard fixed reports | CMS/manual/Excel summary data |
| `procurement` | `ProcurementUpdate`, `Tender` | Public procurement updates, not transactions |
| `trade-network` | `Enquiry`, `Institution`, `ProcurementUpdate` | One enquiry operation with type |
| `godown-network` | Future master/content data if approved | Not in full CMS as a separate core module yet; can be represented as master data or static page content unless officially scoped |
| `notices` | `OfficialCommunication`, `Document`, `Tender` | Notices/circulars/orders share one operation |
| `knowledge` | `Document` | Only documents explicitly tagged for Knowledge Centre appear there |
| `digital-services` | `DigitalService` | External links, open in new tab |
| `content-checklist` | Internal planning only | Not public CMS content |
| `contact` | `Page`, `Settings`, `Enquiry` | Contact content plus enquiry form |

## Core CMS Operations

Use the consolidated operations from the full CMS scope:

- `Event`: training, workshops, meetings, MoU signings, exposure visits, field
  visits, conferences, awareness programmes, and other institutional activities.
- `ProgrammeScheme`: reusable programme/scheme records.
- `Toolkit` and `ToolkitItem`: public-facing toolkit definitions and summary
  distribution data only.
- `Institution`: partners, institutions, buyers, agencies, universities,
  departments, and cooperative organizations.
- `Document`: reusable uploaded document records linked by reference.
- `OfficialCommunication`: notices, circulars, office orders, notifications,
  advisories, and public announcements.
- `Tender`: lightweight tender metadata and GeM links only.
- `ProcurementUpdate`: procurement rates, announcements, schedules, centres, and
  trade opportunities.
- `SuccessStory`: lightweight success stories, optionally sourced from events,
  programmes, or procurement updates.
- `Page`: static and institutional pages.
- `MenuItem`: header, footer, and utility navigation.
- `Enquiry`: one public enquiry operation with type.
- `FAQ`: frequently asked questions.
- `DigitalService`: ERP, MIS, membership application, beneficiary tracking links.
- `InstitutionalMembership`: institution-wise membership records only.
- `Media`, `Gallery`, `Video`: reusable media, galleries, and YouTube videos.
- `DashboardReport` / dashboard data: fixed reports only, no report builder.

## Field Conventions

### Common Content Fields

Use this shared shape where applicable:

```json
{
  "id": 1,
  "title_en": "",
  "title_hi": null,
  "summary_en": "",
  "summary_hi": null,
  "description_en": "",
  "description_hi": null,
  "publication_state": "draft|published|unpublished|archived",
  "public_visibility": true,
  "display_order": null,
  "highlight_type": null,
  "highlight_start_at": null,
  "highlight_end_at": null,
  "show_on_homepage": false,
  "slug": "",
  "created_by": 1,
  "updated_by": 1,
  "created_at": "",
  "updated_at": ""
}
```

### Event

Use one event operation for activities and news.

Important fields:

- `event_type_id`
- `date_mode`
- `start_date`
- `end_date`
- `location_text`
- `district_id`
- `block_id`
- `commodity_ids`
- `programme_ids`
- `institution_ids`
- `cover_media_id`
- `gallery_ids`
- `document_ids`
- `status` derived from dates, with manual override for postponed/cancelled
- `publish_as_news`
- `news_title_en`
- `news_title_hi`
- `news_summary_en`
- `news_summary_hi`
- `news_cover_media_id`
- `news_publish_date`

Rules:

- Training is an event type.
- News is generated manually from completed events.
- Event type fields may use limited controlled dynamic fields.
- Do not build a fully dynamic form builder.
- Event registration is out of scope.

### Document

Documents are uploaded once and linked by reference.

Important fields:

- `document_type_id`
- `file_asset_id`
- `publication_date`
- `language`
- `is_public`
- `commodity_ids`
- `programme_ids`
- `institution_ids`
- `district_ids`
- `financial_year_id`
- `tags`
- `show_in_knowledge_centre`
- `knowledge_category_id`

Rules:

- Public visibility alone does not place a document in Knowledge Centre.
- Linked documents cannot be permanently deleted.
- Replacement must preserve the document reference.
- Phase 1 does not index raw PDF contents.

### OfficialCommunication

Use for notices, circulars, office orders, notifications, advisories, and public
announcements.

Important fields:

- `communication_type_id`
- `reference_number`
- `issue_date`
- `effective_date`
- `expiry_date`
- `issuing_authority`
- `document_id`

Rules:

- Expiry date does not automatically archive/unpublish.
- Records remain public until manually unpublished or archived.

### Tender

Tender records are lightweight.

Important fields:

- `tender_number`
- `tender_type_id`
- `publishing_date`
- `submission_deadline`
- `opening_date`
- `status`
- `gem_url`

Rules:

- BOQ, corrigendum, clarifications, award notices, cancellation notices, and
  tender files remain on GeM.
- External GeM links open in a new tab.

### ProcurementUpdate

Use one operation for public procurement-related updates.

Supported update types:

- Procurement Rate
- Procurement Announcement
- Procurement Schedule
- Procurement Centre Update
- Trade Opportunity

Important fields:

- `commodity_id`
- `procurement_update_type_id`
- `rate`
- `unit`
- `effective_date`
- `period_start`
- `period_end`
- `district_id`
- `block_id`
- `location_text`
- `programme_scheme_id`
- `document_id`

### Enquiry

Use one public enquiry form/operation, not separate public modules for buyer,
seller, and godown.

Required public fields:

- `name`
- `mobile`
- `email`
- `enquiry_type_id`
- `subject`
- `message`

Optional public fields:

- `organization`
- `commodity_id`
- `programme_scheme_id`

Internal fields:

- `submitted_at`
- `source_ip_hash`
- `is_spam`
- `archived_at`
- `internal_notes`

Rules:

- Text only.
- No attachment upload.
- CAPTCHA, rate limiting, bot protection, and repeated-submission protection are
  required.
- Show on-screen success only.
- No acknowledgement email to user.
- Send all submissions to one configurable email address.
- Excel export allowed only for enquiries.

## Masters

Create reusable masters for:

- `EventType`
- `TrainingType`
- `ProgrammeScheme`
- `Toolkit`
- `ToolkitItem`
- `Commodity`
- `InstitutionType`
- `Institution`
- `DocumentType`
- `KnowledgeCentreCategory`
- `CommunicationType`
- `TenderType`
- `ProcurementUpdateType`
- `EnquiryType`
- `FAQCategory`
- `District`
- `Block`
- `FinancialYear` / `ReportingPeriod`

Rules:

- Masters support create/edit/activate/deactivate.
- Prevent duplicate names.
- Do not delete linked masters.
- Deactivated values do not appear in new-entry dropdowns.
- Historical links remain valid.

## CMS Sidebar

Use the supplied sidebar order unless implementation constraints require minor
grouping changes:

1. Dashboard
2. Events & News
3. Programmes & Schemes
4. Toolkits
5. Partners & Institutions
6. Documents
7. Official Communications
8. Tenders
9. Procurement Updates
10. Success Stories
11. Pages
12. Menus
13. Media & Galleries
14. Videos
15. Institutional Membership
16. FAQs
17. Digital Services
18. Enquiries
19. Dashboard Data
20. Masters
21. Users
22. Audit Log
23. Settings

## API Naming

Use REST-style endpoints. Listing endpoints return lightweight summaries; detail
endpoints return full relationships.

Detailed endpoint contracts live in `docs/api-context/`.

Suggested public endpoints:

```http
GET /api/events
GET /api/events/{id-or-slug}
GET /api/news
GET /api/news/{id-or-slug}
GET /api/programmes
GET /api/programmes/{id-or-slug}
GET /api/documents
GET /api/documents/{id-or-slug}
GET /api/communications
GET /api/communications/{id-or-slug}
GET /api/tenders
GET /api/tenders/{id-or-slug}
GET /api/procurement-updates
GET /api/procurement-updates/{id-or-slug}
GET /api/success-stories
GET /api/success-stories/{id-or-slug}
GET /api/pages/{slug}
GET /api/galleries
GET /api/galleries/{id}
GET /api/videos
GET /api/videos/{id}
GET /api/memberships
GET /api/dashboard
GET /api/dashboard/{report-key}
GET /api/faqs
GET /api/digital-services
GET /api/search
GET /api/home
POST /api/enquiries
```

Example filters:

```http
GET /api/events?type=training&district=gumla&status=completed
GET /api/events?commodity=lac&year=2026
GET /api/documents?knowledge_centre=true&type=report
GET /api/procurement-updates?commodity=honey&district=gumla
GET /api/search?q=lac&type=event&year=2026
```

## Frontend Attribute Mapping

Current prototype attributes should map as follows:

- `data-i18n`: stable UI translation key. CMS-managed content should eventually
  move into `*_en` / `*_hi` fields.
- `data-category`: temporary frontend filter; maps to CMS type/category IDs.
- `data-type`: temporary content type marker; maps to operation-specific type
  masters.
- `data-enquiry-tab`: temporary prototype UI state; future CMS uses
  `enquiry_type_id`.
- `data-enquiry-panel`: temporary prototype UI state.
- `data-district`: temporary frontend filter; future CMS uses `district_id`.
- `data-status`: temporary frontend filter; future CMS uses status fields.

## Bilingual Rules

- English is primary.
- Hindi fields are optional.
- Manual Hindi content takes priority.
- If Hindi is missing, visitor-facing machine translation may be shown only if
  clearly labeled as automatically translated.
- Do not overwrite stored Hindi fields with machine translation.
- Uploaded official documents remain in their original language.

## Slug And Lifecycle Rules

- Slugs are generated automatically on first creation.
- Normal content editors cannot edit permanent slugs.
- Slugs remain stable when titles change.
- Published records cannot be permanently deleted.
- Archived records disappear from public listings and public URL access, but can
  be restored and republished with the original URL.
- Permanent deletion is allowed only for draft, never-published, unlinked records
  without protected media/document references.

## Non-Goals

Do not build these in the CMS:

- Beneficiary registration
- Individual participant records
- Training attendance
- Certificate generation
- Toolkit beneficiary acknowledgements
- Inventory management
- Procurement transaction processing
- Accounting or payment processing
- ERP/MIS transaction entry
- Event registration
- User-defined dashboard reports
- Drag-and-drop homepage builder
- Fully dynamic form builder
- Approval workflow
- Internal CMS notification centre
- Direct video hosting
- PDF full-text indexing in Phase 1
- Document download analytics
- Public enquiry tracking
- Enquiry attachments
- User acknowledgement emails

## Implementation Priority

### Phase 1

- Authentication and roles
- Masters
- Events and News
- Programme/Scheme
- Toolkit
- Partners/Institutions
- Document Centre
- Official Communications
- Tenders
- Procurement Updates
- Pages
- Menus
- Media Library
- Galleries
- Videos
- Enquiries
- Basic dashboard
- Search
- Settings
- Audit log

### Phase 2

- Success Stories
- Institutional Membership upload
- Detailed dashboard reports
- Excel dashboard uploads
- Knowledge Centre filtering
- Translation fallback
- SEO overrides
- File version rollback

## Migration Rule From Prototype To CMS

1. Keep public section anchors stable where possible.
2. Replace hardcoded prototype cards/lists with CMS listing endpoints.
3. Convert buyer/seller/godown prototype tabs into one `Enquiry` operation with
   `enquiry_type_id`.
4. Convert training content into `Event` records with Training event type.
5. Convert notices/circulars/orders into `OfficialCommunication`.
6. Convert knowledge hub files into `Document` records explicitly tagged with
   `show_in_knowledge_centre`.
7. Convert procurement rate/schedule/centre/trade blocks into
   `ProcurementUpdate`.
8. Keep homepage layout mostly code-controlled and hydrate only selected dynamic
   sections from `GET /api/home`.
