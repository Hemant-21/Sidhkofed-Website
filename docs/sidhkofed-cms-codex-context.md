# SIDHKOFED Lightweight CMS — Codex Context

## 1. Purpose

Build a lightweight, efficient, bilingual-ready CMS for the SIDHKOFED public website.

The CMS must avoid creating separate modules for content that shares the same operational structure. Similar content should be consolidated into reusable operations, differentiated by:

- Type
- Tags
- Conditional fields
- Linked master data
- Public visibility
- Display order
- Status

The CMS is intended for public-facing website content only. It is not an ERP, beneficiary management system, inventory system, accounting system, training attendance system, or procurement transaction system.

---

## 2. Core Design Principles

1. Reuse records instead of duplicating data.
2. Upload documents and media once, then link them to multiple records.
3. Keep listing APIs lightweight.
4. Load detailed relationships only in detail APIs.
5. Use fixed common fields and controlled conditional fields.
6. Keep activity-type configuration simple.
7. Avoid drag-and-drop page builders.
8. Avoid unrestricted dynamic form builders.
9. Avoid approval workflows because all content is pre-approved before entry.
10. Protect published records and linked assets from permanent deletion.
11. Use reusable master data for consistent classification.
12. Keep public-facing content and ERP/MIS operational data separate.
13. Support future ERP/MIS integration without making Phase 1 dependent on it.
14. Keep the homepage mostly hard-coded, with selected dynamic sections.
15. Keep URLs stable after record creation.

---

## 3. Suggested CMS Sidebar

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

---

# 4. Core Operations

## 4.1 Events and News

Use one `Event` operation for all institutional activities.

### Supported event types

Examples:

- Training
- Workshop
- Meeting
- MoU Signing
- Exposure Visit
- Field Visit
- Conference
- Awareness Programme
- Other Institutional Activity

Event types must be configurable by the Super Administrator.

### Common event fields

- `id`
- `title_en`
- `title_hi` optional
- `event_type_id`
- `date_mode`
  - `single_date`
  - `date_range`
- `start_date`
- `end_date` nullable
- `location_text`
- `district_id` nullable
- `block_id` nullable
- `summary_en`
- `summary_hi` optional
- `description_en`
- `description_hi` optional
- `commodity_ids`
- `programme_ids`
- `institution_ids`
- `cover_media_id` nullable
- `gallery_ids`
- `document_ids`
- `publication_state`
- `public_visibility`
- `display_order` nullable
- `highlight_type` nullable
- `highlight_start_at` nullable
- `highlight_end_at` nullable
- `show_on_homepage`
- `slug`
- `created_by`
- `updated_by`
- timestamps

### Event status

Automatically derived from dates unless manually overridden.

Automatic status:

- `upcoming`
- `ongoing`
- `completed`

Manual override status:

- `postponed`
- `cancelled`

Rules:

- Before start date → Upcoming
- Between start and end date → Ongoing
- After end date → Completed
- Single-date event remains ongoing on that date and becomes completed afterward
- Postponed and Cancelled must override automatic calculation
- Postponed events should retain original date and support revised date
- Cancelled events may store a cancellation reason

### Conditional fields

Each event type may define a small number of additional fields.

Do not build a fully dynamic form builder.

Use:

- fixed event common fields
- configurable event type
- limited predefined field types
- event-type-specific field visibility

Supported dynamic field types:

- text
- textarea
- number
- date
- boolean
- select
- multi-select
- institution reference
- programme reference
- commodity reference
- document reference

### Example event-type fields

#### Training

- `training_type_id`
- `participant_count`
- `is_commodity_specific`
- `commodity_ids`
- `institution_ids`
- `toolkit_distributed`
- `toolkit_distribution_summary`

#### Meeting

- `agenda`
- `chairperson`
- `participants_summary`
- `key_decisions`

#### MoU Signing

- `partner_institution_id`
- `mou_purpose`
- `effective_date`
- `validity_period`
- `mou_document_id`

#### Exposure Visit

- `destination`
- `participant_count`
- `host_institution_id`
- `objectives`
- `key_learnings`

#### Field Visit

- `officials_involved`
- `observations`

### Event completion fields

When an event becomes completed, allow optional post-event fields:

- `outcome_summary_en`
- `outcome_summary_hi`
- `key_highlights`
- `final_participant_count`
- `gallery_ids`
- `document_ids`
- `publish_as_news`

### News generation

News must not be a completely separate data-entry operation.

A completed event may be manually published as news.

News-facing fields:

- `news_title_en`
- `news_title_hi` optional
- `news_summary_en`
- `news_summary_hi` optional
- `news_cover_media_id`
- `news_publish_date`
- `news_tags`
- `news_show_on_homepage`
- `news_highlight_type`
- `news_display_order`

Rules:

- Publishing as news is manual
- News remains linked to the original event
- Editors may customize news-facing fields without changing the original event
- Completed events published as news still remain visible in Past Events
- Past Events may show a `News Published` label
- Past Events may link to both Event Detail and News Detail
- Upcoming, ongoing, postponed, cancelled events use Event Detail
- Completed events may appear under Past Events
- Completed events published as news use a separate News Detail presentation

### Event registration

Out of scope.

---

## 4.2 Programme and Scheme Management

Use one reusable `ProgrammeScheme` master-operation.

### Fields

- `id`
- `name_en`
- `name_hi` optional
- `short_code`
- `description_en`
- `description_hi` optional
- `sponsoring_department_or_source`
- `start_date`
- `end_date`
- `is_active`
- `commodity_ids`
- `permitted_training_type_ids`
- `linked_toolkit_ids`
- `public_visibility`
- `display_order`
- timestamps

Rules:

- Can be linked to events, training, toolkit distribution, documents, procurement updates, success stories, and dashboard data
- Deactivation only
- No permanent deletion when referenced
- Duplicate-name validation required

---

## 4.3 Toolkit Management

Use reusable `Toolkit` and `ToolkitItem` records.

### Toolkit fields

- `id`
- `name_en`
- `name_hi` optional
- `programme_scheme_id`
- `commodity_id`
- `is_active`
- `description`
- timestamps

### Toolkit item fields

- `id`
- `toolkit_id`
- `item_name`
- `distribution_basis`
  - `individual`
  - `group`
- `default_quantity_per_unit`
- `default_group_size` nullable
- `unit`
- `display_order`
- `is_active`

### Training-level toolkit distribution summary

Store only public-facing summary data.

Fields:

- `event_id`
- `toolkit_id`
- `distribution_done`
- `distribution_model`
  - `individual`
  - `group`
  - `mixed`
- `participants_covered`
- `distribution_date`
- `remarks`
- item-level summaries:
  - `toolkit_item_id`
  - `distribution_basis`
  - `quantity_per_unit`
  - `number_of_units_or_groups`
  - `total_quantity`
  - `manual_override`

Rules:

- No beneficiary-wise distribution records
- No stock ledger
- No inventory tracking
- No acknowledgement tracking
- Group-based item quantity may be calculated using participant count and group size
- Manual total override should be allowed

---

## 4.4 Partners and Institutions

Use one reusable `Institution` operation for all organizations.

### Institution types

- Government Department
- Training Institution
- University
- NGO
- Corporate Buyer
- Financial Institution
- Technical Agency
- Cooperative Organization
- Other Partner

### Fields

- `id`
- `name`
- `institution_type_id`
- `short_description`
- `contact_details` optional
- `website_url` optional
- `logo_media_id` optional
- `is_active`
- `show_on_homepage`
- `homepage_short_label` optional
- `display_order`
- timestamps

Rules:

- Reuse the same institution in events, MoUs, training, schemes, success stories, and homepage partner logos
- Deactivation only
- Duplicate-name validation required
- Logo stored in Media Library
- External website opens in new tab

### MoU representation

Do not create a duplicate standalone MoU content module.

Represent an MoU through:

- Partner/Institution record
- MoU Signing event
- Linked MoU document

---

## 4.5 Document Management Centre

All public documents must be uploaded once and linked by reference.

### Fixed document types

- Notice
- Circular
- Office Order
- MoU
- Report
- Policy
- Guideline
- SOP
- Training Material
- Form
- Publication
- Other

### Fields

- `id`
- `title_en`
- `title_hi` optional
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
- `knowledge_category_id` nullable
- `publication_state`
- `slug`
- timestamps

### Knowledge Centre categories

- Acts and Rules
- Bye-laws
- Policies and Guidelines
- SOPs and Manuals
- Training Resources
- Research and Reports
- Publications
- Forms and Formats

Rules:

- A document must appear in Knowledge Centre only when `show_in_knowledge_centre = true`
- Public visibility alone must not automatically place it in Knowledge Centre
- Documents may be linked to events, MoUs, official communications, schemes, pages, or success stories
- Public documents open in a new tab for preview
- Show a separate download option
- No download tracking required
- Linked files cannot be permanently deleted
- Replacement should preserve the document reference
- Archive instead of delete
- Keep minimal automatic version history only if simple to implement
- Retain latest 2–3 versions
- Allow rollback to previous version
- Do not build branching or comparison UI

---

## 4.6 Official Communications

Use one operation for:

- Notices
- Circulars
- Office Orders
- Notifications
- Advisories
- Public Announcements

### Fields

- `id`
- `title_en`
- `title_hi` optional
- `communication_type_id`
- `reference_number`
- `issue_date`
- `effective_date` nullable
- `expiry_date` nullable
- `issuing_authority`
- `short_description_en`
- `short_description_hi` optional
- `document_id` nullable
- `publication_state`
- `public_visibility`
- `highlight_type` nullable
- `highlight_start_at` nullable
- `highlight_end_at` nullable
- `show_on_homepage`
- `display_order`
- timestamps

Highlight values:

- New
- Latest
- Important
- Urgent

Rules:

- Highlight tags may expire automatically
- Expiry date does not automatically archive or unpublish the communication
- Record remains public until manually unpublished or archived

---

## 4.7 Tender Management

Tender Management stores only lightweight structured information.

### Fields

- `id`
- `tender_number`
- `title_en`
- `title_hi` optional
- `tender_type_id`
- `publishing_date`
- `submission_deadline`
- `opening_date` nullable
- `status`
- `issuing_authority`
- `short_description_en`
- `short_description_hi` optional
- `gem_url`
- `related_category_or_department`
- `public_visibility`
- `show_on_homepage`
- `highlight_type` nullable
- `display_order`
- timestamps

Rules:

- Do not manage BOQ, corrigendum, clarification, award notice, cancellation notice, or tender document files in CMS
- These remain on GeM
- External GeM links open in new tab
- Expired tender remains public unless manually unpublished or archived

---

## 4.8 Procurement Updates

Use one operation for all public procurement-related updates.

### Update types

- Procurement Rate
- Procurement Announcement
- Procurement Schedule
- Procurement Centre Update
- Trade Opportunity

### Fields

- `id`
- `commodity_id`
- `procurement_update_type_id`
- `rate` nullable
- `unit` nullable
- `effective_date` nullable
- `period_start` nullable
- `period_end` nullable
- `district_id` nullable
- `block_id` nullable
- `location_text` nullable
- `programme_scheme_id` nullable
- `short_description_en`
- `short_description_hi` optional
- `status`
- `document_id` nullable
- `public_visibility`
- `show_on_homepage`
- `highlight_type` nullable
- `display_order`
- timestamps

Rules:

- Rate and unit fields visible only when relevant
- Date and location fields appear conditionally based on update type
- May support public dashboard calculations where data is sufficient

---

## 4.9 Success Stories

Keep Success Stories as a separate lightweight operation.

### Fields

- `id`
- `title_en`
- `title_hi` optional
- `summary_en`
- `summary_hi` optional
- `background_problem_en`
- `background_problem_hi` optional
- `intervention_en`
- `intervention_hi` optional
- `outcomes_en`
- `outcomes_hi` optional
- `quantifiable_impact`
- `commodity_ids`
- `programme_ids`
- `district_id`
- `block_id` nullable
- `institution_ids`
- `source_type` nullable
  - event
  - programme
  - procurement_update
  - independent
- `source_record_id` nullable
- `gallery_ids`
- `video_ids`
- `cover_media_id`
- `publication_state`
- `public_visibility`
- `show_on_homepage`
- `highlight_type`
- `display_order`
- `slug`
- timestamps

Rules:

- Can be created independently
- Can be created from an existing event, programme, or procurement update
- Source data may be prefilled
- Do not duplicate linked context unnecessarily

---

## 4.10 Page Management

Use one operation for static and institutional pages.

Examples:

- About Us
- Vision and Mission
- Objectives
- Organizational Structure
- Contact
- Privacy Policy
- Disclaimer
- Copyright Policy
- Hyperlink Policy
- Accessibility Statement

### Fields

- `id`
- `title_en`
- `title_hi` optional
- `slug`
- `content_en`
- `content_hi` optional
- `parent_page_id` nullable
- `display_order`
- `menu_visibility`
- `publication_state`
- `public_visibility`
- `media_ids`
- `seo_title_override` nullable
- `seo_description_override` nullable
- `social_image_override_id` nullable
- timestamps

Rules:

- Slug generated automatically on first creation
- Slug is read-only for Content Editors
- Slug remains stable even when title changes
- Policy pages use the same Page operation
- No separate policy module

---

## 4.11 Menu Management

Use a simple menu configuration.

### Menu locations

- Header
- Footer
- Utility

### Menu item link types

- Static page
- Module listing
- Specific record
- External URL

### Fields

- `id`
- `label_en`
- `label_hi` optional
- `menu_location`
- `parent_menu_item_id` nullable
- `link_type`
- `linked_record_type` nullable
- `linked_record_id` nullable
- `external_url` nullable
- `display_order`
- `is_visible`
- `open_in_new_tab`

Rules:

- External links open in new tab
- Digital Service links open in new tab
- No drag-and-drop page builder required
- Reordering menu items is allowed

---

## 4.12 Enquiry Management

Use one public enquiry form.

### Required public fields

- Name
- Mobile
- Email
- Enquiry Type
- Subject
- Message

### Optional public fields

- Organization
- Commodity
- Programme/Scheme

### Internal fields

- `id`
- `submitted_at`
- `source_ip_hash` or equivalent privacy-safe identifier
- `is_spam`
- `archived_at` nullable
- internal notes optional

Rules:

- Text only
- No attachment upload
- CAPTCHA required
- Rate limiting required
- Basic bot protection required
- Repeated-submission protection required
- On-screen success message only
- No acknowledgement email to user
- All submissions sent to one configurable email address
- No public status tracking
- Enquiry records retained unless manually archived
- Excel export allowed only for Enquiries

Suggested success message:

> Thank you. Your enquiry has been submitted and will be answered soon.

---

## 4.13 FAQ Management

### Fields

- `id`
- `question_en`
- `question_hi` optional
- `answer_en`
- `answer_hi` optional
- `faq_category_id`
- `display_order`
- `public_visibility`
- `linked_page_ids`
- `linked_module_keys`
- timestamps

Rules:

- May appear on dedicated FAQ page
- May also appear on relevant pages such as Membership, Training, Procurement, Schemes, and Digital Services

---

## 4.14 Digital Services

### Fields

- `id`
- `service_name_en`
- `service_name_hi` optional
- `short_description_en`
- `short_description_hi` optional
- `icon_media_id` nullable
- `service_url`
- `login_required`
- `public_visibility`
- `display_order`
- `is_active`

Rules:

- Open service links in new tab
- Examples: ERP, MIS, Membership Application, Beneficiary Tracking

---

## 4.15 Institutional Membership

Maintain institution-wise membership records only.

Do not store individual beneficiary membership here.

### Membership levels

- SIDHKOFED
- District Union

### Membership types

- Primary
- Nominal

### Fields

- `id`
- `institution_name`
- `membership_level`
- `membership_type`
- `district_id`
- `district_union_id` nullable
- `membership_date` nullable
- `status`
- `public_visibility`
- `display_order`
- `reporting_period_id`
- timestamps

Rules:

- Support public directory
- Support dashboard totals
- Support separate reporting for:
  - SIDHKOFED Primary Members
  - SIDHKOFED Nominal Members
  - DU Primary Members
  - DU Nominal Members
- Bulk Excel upload may be supported
- Public visibility configurable per record
- Display order configurable

---

# 5. Media and Gallery

## 5.1 Media Library

Use one reusable Media Library for:

- Images
- Logos
- Icons
- Gallery images

Do not store YouTube videos as files.

### Media fields

- `id`
- `file_path`
- `file_type`
- `file_size`
- `original_filename`
- `title` optional
- `caption` optional
- `source_credit` optional
- `alt_text` optional
- `is_archived`
- timestamps

Rules:

- Bulk image upload required
- Alt text, caption, and source are optional
- Do not require one-by-one image upload
- Linked media cannot be permanently deleted
- Show usage references
- Allow replacement
- Allow archival
- Permanent deletion allowed only when unused and never linked
- Filename or gallery title may be used as fallback descriptive text

---

## 5.2 Photo Galleries

### Required fields

- `id`
- `title`
- `gallery_date`
- `cover_media_id`
- `related_record_type`
- `related_record_id`
- `public_visibility`
- `display_order`

### Optional fields

- `location`
- `short_description`

Rules:

- Multiple images per gallery
- Gallery may appear inside linked content
- Gallery may also appear on a separate public Photo Gallery page

---

## 5.3 YouTube Video Management

Do not upload or store video files.

### Fields

- `id`
- `youtube_url`
- `youtube_video_id`
- `title`
- `source_channel_name`
- `thumbnail_url`
- `related_record_type` nullable
- `related_record_id` nullable
- `video_date`
- `short_description` optional
- `public_visibility`
- `show_on_homepage`
- `display_order`
- `homepage_start_date` nullable
- `homepage_end_date` nullable

Rules:

- Allow videos from any YouTube channel
- Validate YouTube URL
- Extract video ID automatically
- Fetch thumbnail automatically
- Reject malformed or unsupported links
- Embed using YouTube player
- Separate public Video Gallery page
- Link videos to Events, News, Training, Schemes, or Success Stories
- Homepage may display multiple selected videos
- Maximum 3 videos shown on homepage
- If more than 3 are selected, use lowest display-order values first

---

# 6. Reusable Masters

Create masters for:

- Event Type
- Training Type
- Programme/Scheme
- Toolkit
- Toolkit Item
- Commodity
- Institution Type
- Partner/Institution
- Document Type
- Knowledge Centre Category
- Communication Type
- Tender Type
- Procurement Update Type
- Enquiry Type
- FAQ Category
- District
- Block
- Financial Year / Reporting Period

Rules:

- Create
- Edit
- Activate
- Deactivate
- Duplicate prevention
- No deletion for linked masters
- Deactivated values do not appear in new-entry dropdowns
- Historical links remain valid
- Blocks may share names across different districts
- District and Block data should be seeded during setup
- Commodity list is small and does not require bulk upload
- Training types are few and do not require bulk upload

---

# 7. User Roles and Permissions

## Super Administrator

- Full access
- Manage users
- Manage masters
- Configure event types and conditional fields
- Create/edit/publish/unpublish/archive/restore content
- Manage settings
- Manage dashboard uploads
- View audit log

## Content Editor

- Create content
- Edit content
- Save as draft
- Cannot publish
- Cannot archive published content
- Cannot edit permanent slug
- Cannot manage users or system configuration

## Approver/Publisher

- Publish
- Unpublish
- Archive
- Restore archived records
- Edit content if permission is granted
- No separate approval workflow

---

# 8. Publishing and Record Lifecycle

## Publication states

- Draft
- Published
- Unpublished
- Archived

No approval states are required.

## Scheduled publication

- Allow `publish_start_at`
- Content may automatically become published at start date/time
- Manual publish override allowed to authorized roles
- End date does not automatically unpublish or archive content

## Archive behavior

Archived records:

- remain in CMS
- are removed from public listings
- are unavailable at public URL
- can be restored
- retain original slug
- may be republished using original URL

## Permanent deletion rules

Published records cannot be permanently deleted.

Permanent deletion allowed only when:

- record is a draft
- record has never been published
- record has no links
- record has no protected media/document references

Reusable master data supports deactivation only.

---

# 9. Highlight Configuration

Use one common highlight model for supported content.

### Values

- New
- Latest
- Important
- Urgent
- Featured

### Fields

- `highlight_type`
- `show_on_homepage`
- `highlight_start_at`
- `highlight_end_at`
- `display_order`

Rules:

- Highlight expiry may automatically remove the label
- Highlight expiry does not unpublish the underlying record
- Homepage selection may use this configuration

---

# 10. Bilingual and Translation Behavior

Primary language: English.

Hindi fields remain optional.

Rules:

- Manual Hindi content takes priority
- If Hindi content is missing, website may display machine-translated Hindi
- Machine-translated content must show:
  - `स्वचालित अनुवाद`
  - or `Automatically Translated`
- Uploaded official documents remain in their original language
- Do not overwrite stored Hindi fields with automatic translation
- Translation should be visitor-facing fallback only

---

# 11. SEO and Social Sharing

Generate default metadata automatically.

Defaults:

- SEO title = record title
- Meta description = summary
- Social title = record title
- Social description = summary
- Social image = cover image
- Slug generated automatically

Optional overrides:

- SEO title
- SEO description
- Social title
- Social description
- Social image

Rules:

- Slug is immutable after creation for normal users
- No slug redirect management required
- Replacing media or documents must not change public record URL

---

# 12. Homepage Model

Homepage layout remains mostly hard-coded.

Do not build a page builder.

CMS controls only:

- Highlighted Events/News
- Latest Official Communications
- Active Tenders
- Featured Success Stories
- Headline Dashboard Figures
- Selected Partner Logos
- Featured Commodity/Programme Cards
- Featured YouTube Videos

Fixed homepage KPI cards:

- Districts Covered
- Trainings Conducted
- Beneficiaries Reached
- Toolkits Distributed
- Procurement Quantity/Value
- Institutional Members

---

# 13. Public Dashboard

Use a fixed set of predefined reports.

## Fixed reports

1. Procurement Summary
2. Training Summary
3. Beneficiaries Reached
4. Activities/Events Summary
5. District and Geographical Coverage
6. Commodity-wise Activities
7. Commodity-wise Toolkit Distribution
8. Programme/Scheme Coverage
9. Partnerships and MoUs
10. SIDHKOFED Primary Membership
11. SIDHKOFED Nominal Membership
12. DU Primary Membership
13. DU Nominal Membership

## Data sources

### CMS-derived where possible

- Trainings conducted
- Participant count
- Events by type
- District coverage
- Commodity coverage
- Toolkit distribution
- Programme coverage
- Partner involvement
- MoU-signing events

### Manual entry or Excel upload

- Institutional membership summaries
- Beneficiary summaries
- Procurement quantity and value
- Other externally maintained statistics

## Reporting periods

- Financial year
- Calendar year
- Month
- Cumulative total

## Dashboard controls

Fixed report definitions only.

Admin may control:

- Public visibility
- Display order
- Reporting period
- Data upload/update

No user-defined report builder.

---

# 14. Search

Use one global public search.

Search across:

- Events
- News
- Documents
- Official Communications
- Tenders
- Programmes/Schemes
- Success Stories
- Static Pages

Search fields:

- Title
- Summary
- Full content
- Tags
- Commodity
- District
- Programme/Scheme
- Document metadata

Filters:

- Content Type
- Commodity
- District
- Programme/Scheme
- Year

Rules:

- Search only published and public records
- Do not index raw uploaded PDF contents in Phase 1
- Search document title, description, type, tags, and metadata
- Provide header search and dedicated search-results page
- Keep result payload lightweight

---

# 15. API Design

## General API rules

1. Use REST-style endpoints.
2. Listing endpoints return summary data only.
3. Detail endpoints return full content and relationships.
4. Media and documents are referenced by IDs and lightweight URL objects.
5. Use filters through query parameters.
6. Paginate all listing endpoints.
7. Cache master data.
8. Use one aggregated homepage endpoint.
9. Do not return dynamic event fields in listing endpoints unless explicitly requested.
10. Avoid creating a separate endpoint for every activity subtype.

## Suggested public endpoints

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

## Example filters

```http
GET /api/events?type=training&district=gumla&status=completed
GET /api/events?commodity=lac&year=2026
GET /api/documents?knowledge_centre=true&type=report
GET /api/procurement-updates?commodity=honey&district=gumla
GET /api/search?q=lac&type=event&year=2026
```

## Event list response

Return only:

- id
- slug
- title
- event type
- start date
- end date
- status
- location
- district
- summary
- cover image
- highlight
- public URL

## Event detail response

Return:

- all common event fields
- conditional fields
- linked programmes
- linked commodities
- linked institutions
- documents
- gallery
- toolkit summary
- outcome fields
- news link if published as news

## Homepage API

Recommended:

```http
GET /api/home
```

Response may contain:

- headline KPIs
- highlighted news/events
- latest communications
- active tenders
- featured success stories
- selected partners
- featured commodity/programme cards
- up to 3 featured videos

---

# 16. Bulk Upload and Export

## Bulk upload supported where useful

Recommended:

- Dashboard datasets
- Institutional membership records
- Partner/institution list
- Programme/scheme records
- Toolkit items

Not recommended:

- Events
- News
- Tenders
- Official Communications
- Commodities
- Training Types
- Districts
- Blocks

## Bulk upload workflow

1. Download fixed Excel template
2. Upload completed template
3. Validate mandatory fields
4. Validate references
5. Detect duplicates
6. Show row-wise errors
7. Import only valid confirmed data

## Export

Excel export allowed only for Enquiries.

---

# 17. Audit Log

Maintain a lightweight audit log.

Track:

- Record created
- Record edited
- Published
- Unpublished
- Archived
- Restored
- File replaced
- Media archived
- User changed
- Master changed
- Configuration changed

Fields:

- user
- action
- module
- record ID
- timestamp
- previous status
- updated status
- brief change summary

No internal notification panel is required.

---

# 18. Settings

Maintain settings for:

- SIDHKOFED office name
- Address
- Phone
- Email
- Map link
- Office hours
- Social media links
- Single enquiry-recipient email
- Enquiry email subject prefix
- Enable/disable enquiry email notification
- Footer important links
- Copyright text
- Policy links
- Government/partner logos
- Translation fallback setting
- Default language
- Supported languages
- Public website URL
- File upload limits
- Allowed file types

Footer structure remains fixed in code.

---

# 19. Non-Goals

Do not build the following in this CMS:

- Beneficiary registration
- Individual participant records
- Training attendance
- Certificate generation
- Toolkit beneficiary acknowledgements
- Inventory management
- Procurement transaction processing
- Accounting
- Payment processing
- ERP workflow
- MIS transaction entry
- Member voting or dividend management
- Event registration
- User-defined dashboard reports
- Drag-and-drop homepage builder
- Fully dynamic form builder
- Approval workflow
- Internal CMS notification centre
- Direct video hosting
- PDF full-text indexing in Phase 1
- Document download analytics
- Per-image mandatory metadata
- Automatic content archival on expiry
- Public enquiry tracking
- Enquiry attachments
- User acknowledgement emails

---

# 20. Suggested Technical Direction

The exact stack may vary, but implementation should support:

- API-first architecture
- PostgreSQL
- Clean relational references
- JSON only for limited dynamic event fields
- Object storage or managed file storage for documents/media
- Background job or scheduler for:
  - scheduled publishing
  - event status calculation
  - highlight expiry
  - YouTube thumbnail extraction
- Server-side validation
- Role-based permissions
- Audit logging
- Responsive admin UI
- Bilingual field support
- Full-text database search or dedicated search service later

Avoid storing all content as unstructured JSON.

Recommended approach:

- relational tables for shared fields and references
- a controlled JSON object for event-type-specific fields
- schema validation based on configured event type

---

# 21. Acceptance Criteria

The implementation is acceptable when:

1. All activity types are created through one Events operation.
2. Training-specific fields appear only for Training events.
3. Completed events can be manually published as news.
4. News-facing content can differ from event-facing content.
5. Documents are uploaded once and linked by reference.
6. Only explicitly tagged documents appear in Knowledge Centre.
7. MoUs connect Institution + Event + Document.
8. Toolkits connect Programme/Scheme + Commodity + Toolkit Items.
9. Group and individual toolkit distribution are supported.
10. No beneficiary-level toolkit data is stored.
11. Tenders store structured data and GeM links only.
12. Official communications share one operation.
13. Procurement rates and announcements share one operation.
14. Media can be bulk uploaded and reused.
15. Linked media/documents cannot be deleted.
16. Videos stream from YouTube.
17. Homepage displays at most 3 featured videos.
18. Institutional membership supports SIDHKOFED/DU and Primary/Nominal classification.
19. Public dashboard uses fixed reports.
20. Manual/Excel summary data can feed dashboard reports.
21. Search covers full CMS text and metadata.
22. PDF file contents are not indexed in Phase 1.
23. English is primary and Hindi is optional.
24. Missing Hindi may use labeled machine translation.
25. Slugs are stable after creation.
26. Published records cannot be permanently deleted.
27. Archived records disappear publicly and can be restored.
28. Enquiries are text-only and sent to one configured email.
29. Enquiries can be exported to Excel.
30. Audit logs capture important changes.
31. Homepage layout is not editable through a page builder.
32. APIs remain small, paginated, and filterable.

---

# 22. Implementation Priority

## Phase 1

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

## Phase 2

- Success Stories
- Institutional Membership upload
- Detailed dashboard reports
- Excel dashboard uploads
- Knowledge Centre filtering
- Translation fallback
- SEO overrides
- File version rollback

## Future integration readiness

Keep API hooks ready for:

- ERP training data
- ERP beneficiary data
- ERP procurement data
- MIS dashboards
- GIS mapping
- Membership systems
