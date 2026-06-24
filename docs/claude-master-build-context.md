# SIDHKOFED Website — Master Build Context and Strict Implementation Contract

> **Audience:** Claude or any engineer building the website from scratch.
>
> **Status:** Mandatory project context. Read this document in full before writing code. When a requirement conflicts with an implementation preference, this document wins. If a requirement is unclear, preserve the project boundary and ask for a decision; do not invent a broader product.

## 1. Product identity and outcome

Build a modern, responsive, bilingual-ready public website for **SIDHKOFED (Jharkhand Cooperative Federation)**. It is a public institutional dashboard and cooperative ecosystem gateway for Jharkhand.

The website must make SIDHKOFED feel credible, clear, useful, transparent, and contemporary. It should communicate cooperative livelihoods, value chains, public information, training, procurement visibility, institutional partnerships, and future-ready digital services.

The intended product is all of the following:

- A public institutional dashboard.
- A cooperative ecosystem gateway for cooperatives, producer groups, buyers, partners, and citizens.
- A governance and transparency portal for notices, tenders, circulars, reports, and public documents.
- A bilingual content platform with English as the primary language and Hindi as an optional, first-class language.
- A CMS-ready and ERP/MIS-ready frontend, without making Phase 1 dependent on ERP/MIS integration.

It must **not** become:

- a generic static brochure;
- a PDF dump or notice-board-only site;
- an old-style, dense NIC/table-heavy government interface;
- an ERP, MIS, inventory, accounting, payment, procurement-transaction, beneficiary, attendance, certification, or membership-voting application;
- a public event-registration system;
- a drag-and-drop homepage builder.

## 2. Current repository and source-of-truth hierarchy

Active project directory: `D:\Ranchi_web\Sidhkofed-Website`.

Do not rely on older references to `D:\Sidhkofed 2404`; that is stale/alternate planning context unless explicitly reconfirmed.

This repository currently contains a static review prototype, not a production CMS or backend:

```text
Sidhkofed-Website/
├── index.html                         # Current single-page public prototype
├── assets/images/                     # Static/bitmap visual assets
├── src/css/main.css                   # Current design system and responsive CSS
├── src/js/app.js                      # Current client-side prototype interactions
└── docs/
    ├── claude-master-build-context.md # This file
    ├── sidhkofed-cms-codex-context.md # Canonical CMS scope and behavior
    ├── cms-integration-conventions.md # Naming and migration rules
    ├── api-context/                   # Module-level API contracts
    ├── agile-backlog.md                # Delivered/planned sprint scope
    ├── codex-infra-handover.md         # Infrastructure and rollout context
    ├── project-structure.md            # Existing static-prototype conventions
    └── progress-log.md                 # Cross-device work handoff log
```

Use this **canonical precedence order**. A higher-priority document always wins on
conflict; never silently override it from a lower one:

1. Explicit approved user decisions made after this file.
2. **CMS Requirements Document** — `docs/sidhkofed-cms-codex-context.md` (authoritative source of truth for scope and behavior).
3. **`docs/database-schema-design.md`** — approved Prisma schema, entities, enums, relations.
4. **`docs/api-specification.md`** — the single REST API contract (namespaces, envelope, endpoints).
5. **This master context** — product/build behavior and guardrails not covered above.
6. `docs/cms-integration-conventions.md` for prototype-to-CMS naming/mapping; `docs/agile-backlog.md` and `docs/progress-log.md` for work status and handoff.

The older `docs/api-context/*` files are superseded by `docs/api-specification.md`.

Never silently change a canonical field name, module boundary, lifecycle rule, or non-goal because it seems convenient in code.

## 3. Project state, build posture, and non-negotiable content integrity

The existing site is a static stakeholder-review prototype. It already demonstrates visual direction, information architecture, responsive behavior, bilingual switching, client-side filtering, and CMS-ready content surfaces. It does **not** contain production data or backend behavior.

Build from scratch only after retaining these truths:

- Keep official data and representative/sample data visibly separate.
- Do not turn unknown information into production-sounding claims.
- Do not publish fictional office details, live tender data, cooperative records, capacities, availability, payment data, beneficiary counts, or ERP links as factual.
- Use explicit labels such as `Representative prototype content`, `Sample rate`, `Indicative capacity`, or `Prototype only` until approved data replaces them.
- When official data is missing, use a structured placeholder or omit the claim; do not fill the gap with vague marketing copy.
- Public forms may be prototyped visually, but must not pretend to submit or create a record until a secure backend exists.

Official material still needed before production includes:

- Official SIDHKOFED logo, legal/public name treatment, government marks, address, phone, email, office hours, map link, social links, policy links, and footer legal text.
- Approved institutional/about content and commodity descriptions.
- Official event, training, impact, dashboard, procurement, cooperative, membership, buyer/seller, godown, partner, and district data.
- Notices, tenders, circulars, office orders, RTI/policy material, reports, acts, bye-laws, SOPs, publications, photographs, videos, and document metadata.

## 4. Experience principles and visual direction

The site must feel like a modern public platform, not an administrative back office.

- Prioritize clarity, hierarchy, generous spacing, readable typography, meaningful cards, strong calls to action, and dashboards that explain rather than decorate.
- Build mobile-first and validate desktop, tablet, and small mobile layouts.
- Use reusable header, footer, section, card, form, filter, dashboard, and status components.
- Preserve a credible institutional tone while avoiding bureaucratic clutter.
- Make transparency content easy to find: notices, tenders, documents, procurement updates, and reports should never be buried.
- Make audience pathways obvious: cooperative/member, buyer, seller, partner, citizen, and internal-service user.
- Use visual assets only with useful alt text and proper licensing/approval.
- Keep content density reasonable. Use filters, summaries, pagination, and detail pages rather than huge undifferentiated lists.

The existing prototype uses a sticky identity header, utility bar, footer, responsive navigation, modern cards, section bands, a public dashboard, and prominent quick-access pathways. Retain the intent even if the production framework changes.

## 5. Required public information architecture

The production site may use real pages/routes rather than the current single-page anchors, but it must preserve these public areas and their meaning:

| Area | Purpose and required behavior |
|---|---|
| Home | Communicate identity, impact, service pathways, featured content, transparency, and current highlights. Layout remains code-controlled; only selected sections are CMS-hydrated. |
| About | Explain SIDHKOFED as the apex cooperative platform, institutional identity, governance, and public purpose. |
| Activities & Commodities | Present value-chain and activity information. Initial commodity concepts: lac, honey, ragi/millets, sal seed, karanj, tamarind, and other approved MFPs. |
| Members & Cooperatives | Explain pathways for MPCS/LAMPS, cooperatives, producer groups, buyers, and partners. Future directory/application workflow is not an uncontrolled public transaction workflow. |
| Capacity Building | Surface trainings/events, calendars, district coverage, learning materials, galleries, and outcomes. Training is an `Event` type in the CMS. |
| Public Dashboard | Show fixed public reports and summary metrics. Start with CMS/manual/Excel-managed summary data; do not imply live ERP data before approved integration. |
| Procurement & Trade | Surface public procurement rates, announcements, schedules, centres, trade opportunities, and tenders. No procurement transactions, payments, inventory, or order execution. |
| Trade & Network Access | Buyer, seller/cooperative, and godown enquiry pathways; sample godown directory/filtering until official data exists. These map to one future `Enquiry` operation, not three separate backend products. |
| Notices & Tenders | Present official communications, tenders, reports, filters, search, dates, and document links. |
| Knowledge Hub | Present explicitly tagged public documents, acts, SOPs, reports, training material, publications, and videos. Public visibility alone does not make a document a Knowledge Hub item. |
| Digital Services | Show controlled links to ERP, MIS, membership, beneficiary tracking, or other approved external services. External services open safely in a new tab. Do not fake integrations. |
| Contact | Display approved office information and a future enquiry route. |

The homepage should include, when approved data exists:

- Hero/identity statement and key calls to action.
- Quick-access links: ERP, MIS dashboard, membership, procurement rates, tenders, digital library, buyer enquiry, seller enquiry, godown network.
- Highlighted activities/commodities.
- Capacity-building/event highlights.
- Fixed impact/KPI dashboard.
- Latest news/events, public procurement/tender highlights, communications, documents, partners, and a maximum of three featured videos.

## 6. Existing prototype interactions to preserve or replace properly

The current client-side prototype implements the following. A new build must retain equivalent accessible behavior where applicable:

- English/Hindi interface language toggle for UI strings.
- Text-size increase/decrease accessibility controls.
- Mobile navigation toggle with appropriate `aria-expanded` state.
- Notices/documents filter buttons and case-insensitive client-side search in the prototype; production must use server/API filtering and search for real data.
- Buyer, seller, and godown tab panels with correct active/selected state.
- Prototype enquiry forms that prevent real submission and show an on-screen prototype confirmation.
- Godown filters by district, availability status, and network type, including an empty state.
- Selecting `Enquire Storage` chooses the matching godown in the godown enquiry form.

Do not ship a production form that only shows a fake success state. Until `POST /api/enquiries` exists securely, label the form as unavailable/prototype or do not expose submission.

## 7. Bilingual, accessibility, and inclusive-design requirements

### 7.1 Bilingual content

- English is primary.
- Store editorial content separately as `*_en` and optional `*_hi` fields.
- UI strings must be translatable and not hardcoded throughout components.
- Manual Hindi always takes priority over machine translation.
- If visitor-facing automatic fallback translation is approved, clearly label it and expose `translation_source: manual|automatic|missing` in the API layer.
- Never overwrite stored manual Hindi with machine translation.
- Official documents remain in their original language; do not claim automatic translated copies exist.
- Ensure typography uses a Devanagari-capable fallback stack and that layout handles Hindi text expansion.

### 7.2 Accessibility baseline

- Use semantic landmarks, headings in correct order, real buttons for actions, native labels, and visible focus states.
- All keyboard interactions must work for navigation, filters, tabs, menus, dialogs, and forms.
- Use `aria-current`, `aria-expanded`, `aria-controls`, `role=tablist/tab/tabpanel`, and status/live regions only where they accurately describe the behavior.
- Give every meaningful image descriptive alt text; decorative images use empty alt text.
- Maintain readable color contrast and do not communicate status by color alone.
- Respect text scaling, responsive reflow, reduced motion preferences, and touch target sizing.
- Show validation errors adjacent to relevant fields and explain errors in text.

## 8. CMS scope and model boundaries

The CMS is lightweight and public-website focused. It is designed for relational data, reusable records, public publishing, documents, media, and fixed dashboards.

### 8.1 Core operations

Implement or reserve the following operations exactly as coherent modules:

- `Event`: all activities—training, workshop, meeting, MoU signing, exposure visit, field visit, conference, awareness programme, etc.
- `ProgrammeScheme`: reusable programme/scheme records.
- `Toolkit` and `ToolkitItem`: public toolkit definitions and summary distribution data only.
- `Institution`: partners, buyers, agencies, universities, departments, cooperative organisations, and other institutions.
- `Document`: reusable uploaded documents linked by reference.
- `OfficialCommunication`: notices, circulars, office orders, notifications, advisories, public announcements.
- `Tender`: structured tender metadata plus GeM link only.
- `ProcurementUpdate`: procurement rates, announcements, schedules, centres, and trade opportunities.
- `SuccessStory`: lightweight optional content, normally Phase 2.
- `Page`: institutional/static pages.
- `MenuItem`: header, footer, and utility navigation.
- `Enquiry`: a single public enquiry record with type.
- `FAQ`.
- `DigitalService`: external ERP/MIS/membership/beneficiary links.
- `InstitutionalMembership`: institution-wise membership only.
- `Media`, `Gallery`, `Video`: reusable media, galleries, and YouTube videos.
- `DashboardReport` / dashboard datasets: fixed reports only.
- Reusable master data, users, audit log, and settings.

### 8.2 Common content shape

Use this shape where relevant; avoid unstructured JSON for normal content:

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

Use relational tables/references for shared content and relationships. Limited controlled JSON is permitted only for event-type-specific fields, validated against configured event type; do not create a general form builder.

### 8.3 Important module rules

#### Events and news

- Event types include training, workshop, meeting, MoU signing, exposure visit, field visit, conference, awareness programme, and approved institutional activities.
- Key fields include `event_type_id`, `date_mode`, `start_date`, `end_date`, `location_text`, `district_id`, `block_id`, `commodity_ids`, `programme_ids`, `institution_ids`, `cover_media_id`, `gallery_ids`, `document_ids`, status, and controlled conditional fields.
- Status is derived from dates, with manual override for postponed/cancelled.
- Training is not a separate module.
- Post-completion fields (`outcome_summary_en/hi`, `key_highlights`, `final_participant_count`) are first-class columns, editable only once the event is completed.
- Completed events may be manually published as news. News title, summary, cover, and publish date may differ from the event-facing content.
- Event registration is out of scope.
- `highlight_type` canonical values are `new | latest | important | urgent | featured` (null = no highlight); stored lower-case. The same set applies to every highlightable module.
- Toolkits link a `programme_scheme_id` + `commodity_id` + ordered items; per-event (training-level) distribution is recorded in `toolkit_distribution_summaries`/`toolkit_distribution_items` with `distribution_basis` individual/group and `distribution_model` individual/group/mixed. Summary figures only — no beneficiary, stock, or acknowledgement data.
- Success Stories carry `source_type` (`event|programme|procurement_update|independent`) + `source_record_id`; procurement updates carry an informational `status`; programmes carry `short_code`, commodity and permitted-training-type relations.

#### Documents and Knowledge Hub

- Upload once and link by reference.
- Fields include `document_type_id`, `file_asset_id`, `publication_date`, `language`, `is_public`, commodity/programme/institution/district references, financial year, tags, `show_in_knowledge_centre`, and `knowledge_category_id`.
- Knowledge Hub inclusion requires explicit tagging; `is_public` alone is insufficient.
- Linked documents cannot be permanently deleted. Replacement preserves the logical document reference.
- Do not index raw PDF content in Phase 1; search document metadata only.

#### Official communications and tenders

- `OfficialCommunication` handles notices, circulars, orders, notifications, advisories, and announcements.
- Communications use `communication_type_id`, `reference_number`, `issue_date`, `effective_date`, `expiry_date`, `issuing_authority`, and optional linked `document_id`.
- Expiry does not automatically unpublish or archive; an authorised user decides.
- Tenders store structured metadata such as tender number/type, publishing date, submission deadline, opening date, status, and `gem_url`.
- BOQs, corrigenda, clarifications, awards, cancellations, and tender files remain on GeM; external GeM links open in a new tab.

#### Procurement updates

- Use one operation for procurement rate, procurement announcement, procurement schedule, procurement centre update, and trade opportunity.
- Support commodity, update type, rate/unit, effective date, period start/end, district/block/location, programme/scheme, and optional document reference.
- Public display is informational; never implement procurement transaction processing in this site.

#### Enquiries

- Required public fields: `name`, `mobile`, `email`, `enquiry_type_id`, `subject`, `message`.
- Optional public fields: `organization`, `commodity_id`, `programme_scheme_id`.
- Internal fields: submission time, source-IP hash, spam state, archived time, and internal notes.
- Accept text only: no attachment upload.
- Require CAPTCHA, bot protection, rate limiting, repeated-submission protection, server-side validation, and safe logging.
- Show on-screen success only; do not send user acknowledgement email.
- Send submissions to one configurable recipient email.
- Excel export is allowed only for enquiries.

#### Media, galleries, videos

- Media is reusable and may be bulk uploaded; linked media cannot be permanently deleted.
- Galleries reference media rather than copying files.
- Videos are YouTube references/embeds; do not host video files directly.
- Homepage displays at most three featured videos.

#### Membership and dashboards

- Membership is institutional only. Classification uses **two independent axes**: `membership_level` (`sidhkofed` | `district_union`) and `membership_type` (`primary` | `nominal`), plus `district_id`, `district_union_id`, `reporting_period_id`, and `status`. This drives the four membership dashboard reports (SIDHKOFED Primary, SIDHKOFED Nominal, DU Primary, DU Nominal). Do not store personal membership/voting/dividend workflows.
- Dashboards use fixed report keys and fixed report layouts, fed by CMS-derived or manual/Excel summary datasets. Reporting-period granularity is Month, Financial Year, Calendar Year, or Cumulative.
- Do not build a user-defined report builder.

## 9. Masters, roles, lifecycle, and audit requirements

### 9.1 Masters

Create reusable masters for event types, training types, programme/schemes, toolkits/items, commodities, institution types, institutions, document types, Knowledge Centre categories, communication types, tender types, procurement update types, enquiry types, FAQ categories, districts, blocks, and financial/reporting periods.

Rules:

- Masters support create, edit, activate, and deactivate.
- Prevent duplicate names.
- Do not delete linked masters.
- Deactivated values must not appear in new-entry dropdowns, but historical records retain their linked values.

### 9.2 Roles

- `super_admin`: full access.
- `content_editor`: create/edit draft content; no publish/archive authority.
- `publisher`: publish, unpublish, archive, restore, and edit only when granted.

### 9.3 Lifecycle

- Publication states: `draft`, `published`, `unpublished`, `archived`.
- Slugs are auto-generated on first creation and remain stable if title changes.
- Normal editors cannot casually edit permanent slugs.
- Published records cannot be permanently deleted.
- Archived records disappear from public listings and public URLs, but can be restored and republished with the original URL.
- Permanent deletion is allowed only for draft, never-published, unlinked records without protected media/document references.
- Scheduled publishing, highlight expiry, and event-status calculation may use a background worker/scheduler.

### 9.4 Audit log

Record create, edit, publish, unpublish, archive, restore, file replacement, media archive, user changes, master changes, and settings changes. Store user, action, module, record ID, timestamp, previous/new status, and a concise change summary.

No internal notification centre or approval workflow is required.

## 10. API contract

`docs/api-specification.md` is the authoritative API contract. The rules below are a
summary; on any conflict the specification (and the schema above it) win.

### 10.1 General API rules

- Base URL: `/api/v1`. The only namespaces are `/api/v1/public/*` (website/mobile),
  `/api/v1/admin/*` (CMS, bearer token), and `/api/v1/auth/*` (session). There is no
  un-versioned `/api/...` contract.
- Use plural REST resources and JSON bodies.
- API fields: `snake_case`; URL resource names: `kebab-case`; query parameters for filtering.
- All listings paginate with default `page_size=20`, maximum `100`.
- One mandatory response envelope everywhere (no alternative shapes):
  - Single: `{"success": true, "data": {}, "meta": {}}`
  - List: `{"success": true, "data": [], "pagination": {"page":1,"page_size":20,"total_items":0,"total_pages":0}, "meta": {}}`
  - Error: `{"success": false, "error": {"code": "", "message": ""}, "meta": {}}`

- Whitelist allowed filter/sort fields per module. Common filters: `search`, `status`, `publication_state`, `public_visibility`, `district`, `commodity`, `programme`, `year`, `show_on_homepage`; common ordering: `-published_at`, `display_order`.
- Public endpoints return only published, publicly visible, non-archived records.
- Lists return summary data only; details return full bilingual content, linked records, galleries, documents, and controlled dynamic fields.
- Cache master data. Keep payloads small.

### 10.2 Reference and error shapes

Media reference:

```json
{"id": 1, "url": "", "title": "", "alt_text": "", "caption": ""}
```

Document reference:

```json
{"id": 1, "title_en": "", "title_hi": null, "document_type": "", "file_url": "", "language": "en", "publication_date": "2026-06-24"}
```

Master reference:

```json
{"id": 1, "name_en": "", "name_hi": null, "slug": ""}
```

Use the single error envelope:

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Validation failed.",
    "fields": {"title_en": ["This field is required."]}
  },
  "meta": {"request_id": ""}
}
```

Common codes: `validation_error`, `not_found`, `permission_denied`, `authentication_required`, `conflict`, `rate_limited`, `unsupported_file_type`, `protected_record`.

Lifecycle actions use explicit endpoints:

```text
POST /api/v1/admin/{resource}/{id}/publish
POST /api/v1/admin/{resource}/{id}/unpublish
POST /api/v1/admin/{resource}/{id}/archive
POST /api/v1/admin/{resource}/{id}/restore
```

### 10.3 Required public endpoint family

```text
GET /api/v1/public/home
GET /api/v1/public/events                  GET /api/v1/public/events/{slug}
GET /api/v1/public/news                    GET /api/v1/public/news/{slug}
GET /api/v1/public/programmes              GET /api/v1/public/programmes/{slug}
GET /api/v1/public/documents               GET /api/v1/public/documents/{slug}
GET /api/v1/public/official-communications GET /api/v1/public/official-communications/{slug}
GET /api/v1/public/tenders                 GET /api/v1/public/tenders/{slug}
GET /api/v1/public/procurement-updates     GET /api/v1/public/procurement-updates/{slug}
GET /api/v1/public/success-stories         GET /api/v1/public/success-stories/{slug}
GET /api/v1/public/pages/{slug}
GET /api/v1/public/galleries               GET /api/v1/public/galleries/{slug}
GET /api/v1/public/videos                  GET /api/v1/public/videos/{slug}
GET /api/v1/public/memberships
GET /api/v1/public/dashboard               GET /api/v1/public/dashboard/{report_key}
GET /api/v1/public/faqs
GET /api/v1/public/digital-services
GET /api/v1/public/search
POST /api/v1/public/enquiries
```

Example filters: `/api/v1/public/events?event_type=training&district=gumla&event_status=completed`, `/api/v1/public/events?commodity=lac&year=2026`, `/api/v1/public/documents?knowledge_centre=true&document_type=report`, `/api/v1/public/procurement-updates?commodity=honey&district=gumla`.

`GET /api/v1/public/home` is an aggregated, selective endpoint. It may return headline KPIs, highlighted news/events, latest communications, active tenders, featured success stories, selected partners, commodity/programme cards, and up to three featured videos.

## 11. Technology and infrastructure direction

The final stack is not locked. Do not assume a stack without confirmation.

- Prefer **Django + Wagtail** when the dominant need is CMS publishing, bilingual editorial content, documents, notices, tenders, governance content, and editor workflows.
- Prefer **Next.js + a headless CMS/API** only when highly interactive frontend requirements dominate.
- Avoid hybrid architecture unless both editorial depth and advanced frontend interactivity demonstrably justify it.
- The backend should be API-first, use PostgreSQL, relational references, object/managed media storage, server-side validation, role-based permissions, audit logs, responsive admin, bilingual fields, and future full-text database search/search service.

Infrastructure roles to preserve even in a small initial deployment:

- Public ingress/load balancer or reverse proxy; public traffic must not reach DB/storage directly.
- One or more private application servers.
- Primary database and optional standby/failover.
- Private shared media/document storage.
- Redis/cache/session/background-queue service when needed.
- Private future ERP/MIS integration boundaries.

Production checklist: DNS/public IP, reverse proxy/TLS, environment variables/secrets, app-to-DB reachability, firewall/subnet ACL/routing, shared-storage readiness, backups and restore validation, admin login, uploads, public pages, notices, tenders, search, language switch, and form smoke tests.

## 12. Explicit non-goals and forbidden scope expansion

Do not implement any of these unless an explicit later decision changes scope:

- Beneficiary registration, individual participant records, training attendance, certificates, or toolkit beneficiary acknowledgements.
- Inventory, warehousing transaction management, procurement transactions, accounting, payment processing, ERP workflow, MIS transaction entry, member voting, or dividend management.
- Event registration.
- User-defined dashboards/reports or drag-and-drop homepage builders.
- Fully dynamic form builders, approval workflow, or internal CMS notification centre.
- Direct video hosting.
- Phase 1 PDF full-text indexing or document-download analytics.
- Per-image mandatory metadata that blocks normal media operations.
- Automatic archival when a content expiry date passes.
- Public enquiry tracking, enquiry attachments, or acknowledgement email to enquirers.

Godown handling is not yet a dedicated CMS core module. Until officially scoped, treat it as static/approved page content, master data, or an enquiry pathway—not as a full logistics/inventory application.

## 13. Implementation sequence and definition of done

### Phase A — foundation and public experience

1. Confirm stack, routes, component structure, content source strategy, and visual tokens.
2. Rebuild reusable layout: utility bar, sticky header, responsive navigation, footer, language/accessibility controls.
3. Build all required public areas with properly labelled representative content where official material is absent.
4. Make the experience responsive, keyboard accessible, and bilingual-ready.
5. Preserve or improve the current prototype filtering, tab, enquiry, and empty-state behavior.

### Phase B — CMS foundation

1. Authentication, roles, audit logging, settings, and masters.
2. Events/news, programmes, toolkits, institutions, documents, communications, tenders, procurement updates, pages, menus, media/galleries/videos, enquiries, dashboard, search.
3. Implement API contracts module by module, including pagination, visibility, lifecycle, validation, and tests.
4. Replace prototype-only content surfaces with CMS/API-backed content incrementally.

### Phase C — production readiness

1. Replace all samples with approved material.
2. Complete English/Hindi editorial QA.
3. Complete mobile, accessibility, SEO, performance, security, form-protection, upload, backup/restore, and deployment checks.
4. Add approved ERP/MIS integrations only through controlled API boundaries.

Definition of done for every feature:

- It matches a documented public purpose and does not breach a non-goal.
- It is responsive, semantic, keyboard-operable, and supports bilingual content where text is editorial.
- It has an honest content state: official, representative, or unavailable.
- It uses stable naming and model/API contracts.
- Public data respects publication/visibility/archive rules.
- Forms have server-side validation and abuse protection before they are live.
- Files/media are reusable references, not uncontrolled duplicates.
- Tests or manual verification cover normal, empty, error, and mobile states.
- Documentation/progress log is updated when a meaningful decision or handoff changes.

## 14. Working protocol for the build agent

Before changing code:

1. Read this file, then the specific canonical CMS/API document for the feature.
2. Check `docs/progress-log.md` and current Git status/branch; do not overwrite unrelated work.
3. State which source is official data and which content remains representative.
4. Build the smallest complete vertical slice, not a speculative system.
5. Verify desktop/mobile, keyboard interaction, language expansion, empty/loading/error states, and the relevant lifecycle/security boundary.
6. Update `docs/progress-log.md` with changed files, decisions, open items, and commit/push state before handoff.

When uncertainty exists, choose the narrower public-portal interpretation. Do not “helpfully” add ERP, transactional, user-account, or workflow features that have not been approved.

## 15. Canonical references to read for detailed module implementation

- `docs/sidhkofed-cms-codex-context.md`: **CMS Requirements Document** — authoritative source of truth for behavior, fields, acceptance criteria, dashboard/search/settings detail.
- `docs/database-schema-design.md`: approved Prisma schema, entities, enums, relations, indexes (precedence #3).
- `docs/api-specification.md`: the single REST API contract — namespaces, envelope, endpoints, RBAC (precedence #4).
- `docs/audit-critical-fixes.md`: applied Critical/High fixes and the remaining Medium-tier drafts.
- `docs/cms-integration-conventions.md`: naming rules, model mapping, public prototype migration, shared field conventions.
- `docs/api-context/*`: **superseded** by `docs/api-specification.md`; retain for history only.
- `docs/agile-backlog.md`: completed prototype scope and future sprint sequence.
- `docs/codex-infra-handover.md`: architecture, service roles, rollout, and deployment checklist.
- `docs/progress-log.md`: cross-device collaboration protocol and live project status.

---

**Final directive:** build a polished, trustworthy, bilingual public SIDHKOFED platform with clear cooperative-service pathways and transparent public information. Keep the CMS lightweight, relational, reusable, and editorially controlled. Keep ERP/MIS integration future-ready but explicitly out of Phase 1 unless formally approved.
