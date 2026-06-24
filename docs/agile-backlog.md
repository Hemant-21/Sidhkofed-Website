# SIDHKOFED Agile Backlog

## Current Status

The active workspace is `D:\Sidhkofed-Website`. The earlier plan referenced
`D:\Sidhkofed 2404`, but that directory is not the active repository for this
implementation. This repo began with only a `README.md`, so no legacy website,
admin CMS, database dump, or uploads folder were available to audit here.

The prototype is now organized as a static project with `index.html` as the
review entrypoint, `src/css/main.css` for styling, `src/js/app.js` for
interaction, and `assets/images/` for local visual assets.

The full CMS scope is mirrored in `docs/sidhkofed-cms-codex-context.md`.
Compact CMS/backend naming conventions are captured in
`docs/cms-integration-conventions.md` so model names, field names, slugs, and
API payloads stay stable when the prototype is converted.
Module-based API planning context is captured in `docs/api-context/`.

## Working Assumption

Build a static public portal prototype first, then use stakeholder feedback and
legacy-system discovery to decide the final CMS/backend stack.

## Sprint 0: Setup & Audit

Implemented:

- Created project documentation area in `docs/`.
- Captured the workspace mismatch and missing legacy artifacts.
- Preserved the CMS/backend stack decision for a later audit.

Acceptance checks:

- Documentation is standalone.
- Repo can be understood by a future engineer or Codex session.
- Open questions are explicit rather than hidden in implementation.

## Sprint 1: Visual Foundation

Implemented:

- Top utility bar with contact, language switch, accessibility controls, and
  ERP/MIS links.
- Sticky header with SIDHKOFED identity, navigation, and mobile menu.
- Footer with governance, knowledge, and contact link groups.
- Responsive design tokens for color, typography, spacing, buttons, cards, and
  dashboard panels.
- Bilingual-ready text switching for key visible content.

Acceptance checks:

- Layout works on desktop and mobile.
- Header and footer are reusable across page sections.
- Hindi text renders with a Devanagari-capable font stack.

## Sprint 2: Homepage MVP

Implemented:

- Hero section presenting SIDHKOFED as a cooperative ecosystem platform.
- KPI dashboard cards.
- Quick access cards.
- Activities/commodity cards.
- Capacity building section.
- Public impact dashboard preview.
- News/events, procurement/tenders, and knowledge hub previews.

Acceptance checks:

- Homepage communicates identity, impact, services, and transparency.
- Content is static/JSON-like in markup for easy review and later CMS migration.
- ERP/MIS remains a controlled access pathway rather than a full integration.

## Sprint 3: Core Public Pages

Implemented as navigable sections:

- About
- Activities & Commodities
- Members & Cooperatives
- Capacity Building
- Procurement & Trade
- Notices & Tenders
- Knowledge Hub
- Digital Services
- Contact

Acceptance checks:

- Main navigation reaches all priority public areas.
- Notices, tenders, and knowledge items have simple client-side filtering/search.
- Representative content exists for stakeholder review.

## Sprint 3A: Buyer, Seller, And Godown Network

Implemented:

- Added a Trade & Network Access section near Procurement.
- Added static buyer, seller/cooperative, and godown enquiry forms.
- Added representative sample godown cards with district, type, capacity,
  commodity suitability, and availability status.
- Added client-side godown filters and enquiry tabs.
- Added CTAs from Quick Access, Members, Procurement, and Digital Services.

Acceptance checks:

- Forms are clearly prototype-only and do not submit to a backend.
- Godown sample data is visibly representative, not official operational data.
- The future CMS/API sprint should add enquiry storage, email workflow, admin
  review, official godown data, and access controls.

## Sprint 3B: Prototype Review Polish

Implemented:

- Added a prototype review rhythm section to classify stakeholder feedback.
- Added clearer representative-content markers around sample data concepts.
- Added CTAs and deeper review surfaces without introducing backend behavior.

Acceptance checks:

- Stakeholders can use the prototype as a meeting artifact.
- Feedback can be sorted into immediate UI/content, official data, future
  CMS/backend, or ERP/MIS integration categories.

## Sprint 3C: Content And Data Collection

Implemented:

- Added an official-data checklist for identity/contact, public content,
  governance documents, and network data.
- Kept unknown operational information as structured placeholders rather than
  vague production claims.

Acceptance checks:

- The team can collect missing SIDHKOFED material section by section.
- Sample content remains visibly separate from official production data.

## Sprint 3D: Page Depth

Implemented:

- Expanded Members & Cooperatives with directory, onboarding, and category
  concepts.
- Expanded Capacity Building with training calendar, district coverage, and
  materials/gallery concepts.
- Expanded Procurement & Trade with commodity rate board and procurement
  calendar concepts.
- Expanded Knowledge Hub with document tagging expectations.
- Added a CMS decision panel inside Digital Services.

Acceptance checks:

- Priority sections now show the next level of structure for stakeholder review.
- The CMS/backend decision remains deferred until content and workflow needs are
  clearer.

## Future Sprint 4: CMS / Content Model

CMS scope is now defined by `docs/sidhkofed-cms-codex-context.md`.

Primary CMS principles:

- Build a lightweight public-website CMS, not an ERP/MIS system.
- Consolidate similar content into reusable operations differentiated by type,
  tags, linked master data, visibility, display order, and status.
- Use one `Event` operation for training, workshops, meetings, MoUs, visits, and
  news generation.
- Upload documents/media once and link by reference.
- Keep homepage mostly hard-coded with selected dynamic sections.
- Use one `Enquiry` operation with `enquiry_type_id`; buyer/seller/godown tabs
  in the prototype should map into that operation.
- Keep public dashboards fixed-report based; do not build a user-defined report
  builder.

Stack candidates:

- Django + Wagtail for CMS-first institutional publishing.
- Next.js with a headless CMS if frontend interactivity and separate delivery
  are prioritized.
- Hybrid only if ERP/API and editorial needs justify the extra moving parts.

Implementation priority from the CMS context:

- Phase 1: authentication/roles, masters, events/news, programme/scheme,
  toolkit, institutions, document centre, official communications, tenders,
  procurement updates, pages, menus, media, galleries, videos, enquiries, basic
  dashboard, search, settings, and audit log.
- Phase 2: success stories, institutional membership upload, detailed dashboard
  reports, Excel dashboard uploads, Knowledge Centre filtering, translation
  fallback, SEO overrides, and file version rollback.

## Future Sprint 5: Search, Documents & Governance

Planned:

- Full-text search and filters.
- Document categories, tags, dates, archives, and language metadata.
- Governance pages for RTI, policies, reports, circulars, and downloads.

## Future Sprint 6: Dashboards & ERP-Ready Layer

Planned:

- Manual/CMS-managed public dashboard data first.
- API-ready boundaries for procurement, members, trainings, beneficiaries, and
  financial summaries.
- ERP/MIS links remain controlled until integration scope is formally approved.

## Future Sprint 7: Hardening & Launch

Planned:

- Accessibility review.
- Mobile QA.
- Hindi/English content QA.
- SEO metadata and performance checks.
- Deployment checklist for DNS, server roles, DB reachability, shared storage,
  secrets, backups, and smoke tests.
