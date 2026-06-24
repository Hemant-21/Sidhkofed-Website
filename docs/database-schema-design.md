# SIDHKOFED CMS — Phase 1 Database & Prisma Schema Design

> **Source of truth:** `docs/claude-master-build-context.md`.
> **Scope:** Phase 1 public-website CMS. No ERP/MIS/transactional concerns. PostgreSQL + Prisma.
> **Conventions:** UUID PKs everywhere, soft-archive (no hard delete of published/linked records), junction tables for M2M, reusable media/documents, bilingual `*_en` / `*_hi`, controlled JSON only for event-type-specific values.

---

## Part 1 — Architecture Overview

### Main entity groups

1. **Identity & access** — `users`, `roles`, `permissions`, `role_permissions`, `user_roles`. Three seeded roles: Super Admin, Content Editor, Publisher.
2. **Master data** — small, reusable, activate/deactivate-able lookup tables (event types, commodities, districts, blocks, document types, etc.). Referenced by FK, never duplicated.
3. **Core content** — the publishable modules: `events` (+ news, + dynamic fields), `programme_schemes`, `toolkits`/`toolkit_items`, `institutions`, `documents`, `official_communications`, `tenders`, `procurement_updates`, `success_stories`, `pages`, `menu_items`, `faqs`, `digital_services`, `institutional_memberships`, `enquiries`.
4. **Media system** — `media_assets`, `galleries`, `gallery_images`, `videos`, plus polymorphic-free usage tracking via `media_usages`.
5. **Dashboard** — `dashboard_reports` (fixed keys/layouts), `dashboard_metrics`, `dashboard_datasets` (manual + Excel ingest).
6. **Governance** — `audit_logs`, `settings`.

### Core relationships

- Every publishable content record carries the **publishing-workflow mixin** (publication state, visibility, highlight, homepage, slug, audit FKs, timestamps, soft-archive).
- **Events** are the relational hub: many-to-many to commodities, programmes, institutions, documents, galleries; many-to-one to event type, district, block, cover media.
- **Documents** are uploaded once and linked by reference from anywhere; they also self-tag for Knowledge Hub via `knowledge_category_id` + `show_in_knowledge_centre`.
- **Media** is reusable; galleries reference media rather than copying. Usage is tracked so linked media cannot be hard-deleted.

### Junction (M2M) tables

| Junction | Connects |
|---|---|
| `event_commodities` | events ↔ commodities |
| `event_programmes` | events ↔ programme_schemes |
| `event_institutions` | events ↔ institutions |
| `event_documents` | events ↔ documents |
| `event_galleries` | events ↔ galleries |
| `programme_commodities` | programme_schemes ↔ commodities |
| `programme_permitted_training_types` | programme_schemes ↔ training_types |
| `toolkit_distribution_summaries` | events ↔ toolkits (per-event distribution header) |
| `toolkit_distribution_items` | toolkit_distribution_summaries ↔ toolkit_items |
| `document_commodities` | documents ↔ commodities |
| `document_programmes` | documents ↔ programme_schemes |
| `document_institutions` | documents ↔ institutions |
| `document_districts` | documents ↔ districts |
| `document_tags` | documents ↔ tags |
| `gallery_images` | galleries ↔ media_assets (ordered) |
| `role_permissions` | roles ↔ permissions |
| `user_roles` | users ↔ roles |
| `media_usages` | media_assets ↔ any consuming record (usage tracking) |

### Reusable master-data strategy

All masters share the same shape: `id`, `name_en`, `name_hi`, `slug` (unique), `is_active`, `created_at`, `updated_at`, and where useful `display_order`. Rules enforced at app + DB level:

- Unique name/slug per master → prevents duplicates.
- `is_active=false` hides a value from **new-entry** dropdowns but keeps historical FK references intact.
- Masters with dependents are never deleted (FK `ON DELETE RESTRICT`).

### Why certain entities are separated

- **Event vs. Event News** — a completed event can be re-published as news with its *own* title/summary/cover/publish date. Separate `event_news` table keeps the news lifecycle independent of the event lifecycle without duplicating the event.
- **Event dynamic fields** — split into `event_field_definitions` (schema, per event type) + a validated `dynamic_values` JSONB column on the event. This is a *controlled* schema, not a form builder.
- **Media vs. Document** — media = visual/binary assets (images for galleries, covers); document = governed files linked by reference with metadata, financial year, language, Knowledge Hub tagging. Different lifecycle and search rules.
- **Dashboard datasets vs. metrics** — datasets are the raw import/staging unit (manual or Excel); metrics are the normalized values rendered into fixed report layouts.
- **Enquiry** is isolated (single record + type) — buyer/seller/godown map to one operation, not three products.

---

## Part 2 — ER Diagram (text)

```text
users ──< user_roles >── roles ──< role_permissions >── permissions

EventType (master) ──< events
events
 ├── event_field_definitions (via EventType)   [dynamic field schema]
 ├── dynamic_values (JSONB on events)           [controlled values]
 ├──< event_commodities   >── commodities
 ├──< event_programmes    >── programme_schemes
 ├──< event_institutions  >── institutions
 ├──< event_documents     >── documents
 ├──< event_galleries     >── galleries
 ├── district_id  ──> districts
 ├── block_id     ──> blocks
 ├── cover_media_id ──> media_assets
 └──< event_news  (1..* publications of an event as news)

programme_schemes ── (referenced by events, documents, procurement_updates, enquiries)

toolkits ──< toolkit_items

institutions ── institution_type_id ──> institution_types
institutional_memberships ── institution_id ──> institutions

documents
 ├── document_type_id     ──> document_types
 ├── file_asset_id        ──> media_assets
 ├── knowledge_category_id ──> knowledge_categories
 ├── financial_year_id    ──> financial_years
 ├──< document_commodities  >── commodities
 ├──< document_programmes   >── programme_schemes
 ├──< document_institutions >── institutions
 ├──< document_districts    >── districts
 └──< document_tags         >── tags

official_communications ── communication_type_id ──> communication_types
                        └── document_id ──> documents (optional)

tenders ── tender_type_id ──> tender_types

procurement_updates
 ├── procurement_update_type_id ──> procurement_update_types
 ├── commodity_id ──> commodities
 ├── district_id / block_id ──> districts / blocks
 ├── programme_scheme_id ──> programme_schemes
 └── document_id ──> documents (optional)

success_stories ── cover_media_id ──> media_assets
pages (self-contained)        menu_items (self-referencing parent_id)
faqs ── faq_category_id ──> faq_categories
digital_services (self-contained)
enquiries ── enquiry_type_id ──> enquiry_types
          ├── commodity_id ──> commodities (optional)
          └── programme_scheme_id ──> programme_schemes (optional)

media_assets ──< gallery_images >── galleries
media_assets ──< media_usages (usage tracking across modules)
videos (YouTube references)

dashboard_reports
 ├──< dashboard_metrics ── (financial_year_id, reporting_period_id)
 └──< dashboard_datasets ── (financial_year_id, reporting_period_id, source_file_asset_id)

audit_logs ── user_id ──> users
settings (key/value)
```

---

## Part 3 — Database Tables (conventions)

Every **publishable content table** includes this shared mixin (shown once here, omitted from each table below for brevity):

```text
-- Publishing workflow mixin --
slug                 VARCHAR(255) UNIQUE NOT NULL        -- stable, immutable after create
publication_state    publication_state_enum NOT NULL DEFAULT 'draft'
public_visibility    BOOLEAN NOT NULL DEFAULT true
publish_start_at     TIMESTAMPTZ NULL                    -- scheduled publishing
published_at         TIMESTAMPTZ NULL                    -- first time the record became published; never reset
archived_at          TIMESTAMPTZ NULL                    -- soft archive (NULL = not archived)
highlight_type       highlight_type_enum NULL
highlight_start_at   TIMESTAMPTZ NULL
highlight_end_at     TIMESTAMPTZ NULL
display_order        INTEGER NULL
show_on_homepage     BOOLEAN NOT NULL DEFAULT false
created_by           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
updated_by           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
```

Enums:

```text
publication_state_enum : draft | published | unpublished | archived
highlight_type_enum    : new | latest | important | urgent | featured   -- null = no highlight
date_mode_enum         : single | range | multi_day
event_status_enum      : scheduled | ongoing | completed | postponed | cancelled
field_data_type_enum   : text | textarea | number | date | boolean | select
translation_source_enum: manual | automatic | missing
language_enum          : en | hi
audit_action_enum      : create | update | publish | unpublish | archive | restore | media_replace | config_change | login | master_change
dataset_source_enum    : cms_derived | manual | excel
spam_state_enum        : clean | suspected | spam
membership_level_enum  : sidhkofed | district_union          -- canonical: SIDHKOFED, DISTRICT_UNION
membership_type_enum   : primary | nominal                   -- canonical: PRIMARY, NOMINAL
membership_status_enum : active | inactive
distribution_basis_enum: individual | group
distribution_model_enum: individual | group | mixed
story_source_enum      : event | programme | procurement_update | independent
reporting_period_type_enum : month | financial_year | calendar_year | cumulative
```

> **Enum casing:** canonical values are listed in the requirements in upper case
> (`SIDHKOFED`, `NEW`, …); they are stored/transported as lower-case enum members
> (`sidhkofed`, `new`, …) to stay consistent with every other enum in this schema and
> with the API filter values. The mapping is 1:1 and case is the only difference.

Representative full table (the rest follow the same pattern in Part 6):

### events
**Purpose:** Single record for every activity (training, workshop, meeting, MoU, exposure/field visit, conference, awareness programme).

```text
id                 UUID PK DEFAULT gen_random_uuid()
event_type_id      UUID NOT NULL REFERENCES event_types(id) ON DELETE RESTRICT
training_type_id   UUID NULL REFERENCES training_types(id) ON DELETE RESTRICT
title_en           VARCHAR(255) NOT NULL
title_hi           VARCHAR(255) NULL
summary_en         TEXT NULL
summary_hi         TEXT NULL
description_en     TEXT NULL
description_hi     TEXT NULL
date_mode          date_mode_enum NOT NULL DEFAULT 'single'
start_date         DATE NOT NULL
end_date           DATE NULL
location_text      VARCHAR(255) NULL
district_id        UUID NULL REFERENCES districts(id) ON DELETE RESTRICT
block_id           UUID NULL REFERENCES blocks(id) ON DELETE RESTRICT
cover_media_id     UUID NULL REFERENCES media_assets(id) ON DELETE RESTRICT
event_status       event_status_enum NOT NULL DEFAULT 'scheduled'  -- derived from dates; manual override for postponed/cancelled
status_override    BOOLEAN NOT NULL DEFAULT false
dynamic_values     JSONB NULL          -- controlled, validated against event_field_definitions
outcome_summary_en TEXT NULL            -- post-completion; editable only when event_status='completed'
outcome_summary_hi TEXT NULL
key_highlights     TEXT NULL
final_participant_count INTEGER NULL
translation_source translation_source_enum NOT NULL DEFAULT 'manual'
-- + publishing workflow mixin
```

(All other content tables in Part 6 use the same column/datatype/constraint discipline.)

---

## Part 4 — Master Tables

Shared shape for all masters:

```text
id          UUID PK DEFAULT gen_random_uuid()
name_en     VARCHAR(150) NOT NULL
name_hi     VARCHAR(150) NULL
slug        VARCHAR(160) UNIQUE NOT NULL
is_active   BOOLEAN NOT NULL DEFAULT true
display_order INTEGER NULL
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE (name_en)
```

| Master table | Extra columns / notes |
|---|---|
| `event_types` | — |
| `training_types` | — (used only when event_type = training) |
| `commodities` | `description_en/hi TEXT`, `icon_media_id UUID NULL` |
| `districts` | `state VARCHAR(100) DEFAULT 'Jharkhand'` |
| `blocks` | `district_id UUID NOT NULL REFERENCES districts(id)` (block belongs to district) |
| `institution_types` | — |
| `document_types` | — |
| `knowledge_categories` | — (Knowledge Hub categories) |
| `communication_types` | — |
| `tender_types` | — |
| `procurement_update_types` | — |
| `faq_categories` | — |
| `enquiry_types` | — |
| `financial_years` | `label VARCHAR(9) UNIQUE` e.g. `2025-2026`, `start_date DATE`, `end_date DATE` |
| `reporting_periods` | `period_type reporting_period_type_enum` (`month`/`financial_year`/`calendar_year`/`cumulative`), `start_date`, `end_date`, `calendar_year INTEGER NULL`, `financial_year_id UUID` — supports dashboard period granularity Month / Financial Year / Calendar Year / Cumulative |
| `tags` | free-form labels for documents/knowledge hub |

**Activation/deactivation strategy:** `is_active` flag (never delete). App filters new-entry dropdowns to `is_active=true`; existing FK links survive deactivation. FKs use `ON DELETE RESTRICT` so a master in use cannot be removed.

---

## Part 5 — User & RBAC Schema

### users
```text
id              UUID PK
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
full_name       VARCHAR(150) NOT NULL
preferred_language language_enum NOT NULL DEFAULT 'en'
is_active       BOOLEAN NOT NULL DEFAULT true
last_login_at   TIMESTAMPTZ NULL
created_at / updated_at TIMESTAMPTZ
```

### roles
```text
id          UUID PK
key         VARCHAR(50) UNIQUE NOT NULL   -- super_admin | content_editor | publisher
name_en     VARCHAR(100) NOT NULL
description TEXT NULL
is_system   BOOLEAN NOT NULL DEFAULT true -- seeded roles cannot be deleted
created_at / updated_at
```

### permissions
```text
id          UUID PK
key         VARCHAR(100) UNIQUE NOT NULL  -- e.g. events.create, events.publish, documents.archive
module      VARCHAR(50) NOT NULL
action      VARCHAR(30) NOT NULL          -- create | update | publish | unpublish | archive | restore | delete_draft | manage
description TEXT NULL
UNIQUE (module, action)
```

### role_permissions (junction)
```text
id            UUID PK
role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE
permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
UNIQUE (role_id, permission_id)
```

### user_roles (junction)
```text
id        UUID PK
user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
role_id   UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
UNIQUE (user_id, role_id)
```

**Role mapping (seeded):**
- `super_admin` → all permissions.
- `content_editor` → `*.create`, `*.update` (draft only, enforced in service layer); **no** publish/archive.
- `publisher` → `*.publish`, `*.unpublish`, `*.archive`, `*.restore`, plus `*.update` where granted.

---

## Part 6 — Core Content Tables

Each table below adds the **publishing-workflow mixin** + bilingual fields. Only distinctive columns are listed.

### events
See Part 3 (full definition).

### event_field_definitions
**Purpose:** Controlled, per-event-type field schema (NOT a form builder).
```text
id            UUID PK
event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE
field_key     VARCHAR(60) NOT NULL          -- machine key used in events.dynamic_values
label_en      VARCHAR(150) NOT NULL
label_hi      VARCHAR(150) NULL
data_type     field_data_type_enum NOT NULL
is_required   BOOLEAN NOT NULL DEFAULT false
options       JSONB NULL                    -- only for data_type='select'
display_order INTEGER NOT NULL DEFAULT 0
is_active     BOOLEAN NOT NULL DEFAULT true
created_at / updated_at
UNIQUE (event_type_id, field_key)
```
`events.dynamic_values` (JSONB) is validated server-side against the active definitions for that event type.

### event_news
**Purpose:** Publish a completed event as news, with independent editorial fields/lifecycle.
```text
id            UUID PK
event_id      UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT
title_en      VARCHAR(255) NOT NULL
title_hi      VARCHAR(255) NULL
summary_en    TEXT NULL
summary_hi    TEXT NULL
body_en       TEXT NULL
body_hi       TEXT NULL
cover_media_id UUID NULL REFERENCES media_assets(id) ON DELETE RESTRICT
news_published_at TIMESTAMPTZ NULL
-- + publishing workflow mixin (own slug, own state)
```

### programme_schemes
```text
id UUID PK
title_en VARCHAR(255) NOT NULL ; title_hi VARCHAR(255) NULL
short_code VARCHAR(60) NULL
summary_en/hi TEXT ; description_en/hi TEXT
funding_source VARCHAR(255) NULL
start_date DATE NULL ; end_date DATE NULL
cover_media_id UUID NULL REFERENCES media_assets(id)
-- + mixin
```
Junctions: `programme_commodities` (↔ commodities), `programme_permitted_training_types`
(↔ training_types). Toolkits link via `toolkits.programme_scheme_id` (one programme → many toolkits).

### toolkits
```text
id UUID PK
title_en/hi ; summary_en/hi ; description_en/hi
programme_scheme_id UUID NULL REFERENCES programme_schemes(id)   -- AC#8: Programme + Commodity + Items
commodity_id UUID NULL REFERENCES commodities(id)
cover_media_id UUID NULL REFERENCES media_assets(id)
-- + mixin
```

### toolkit_items
**Purpose:** Public toolkit definition lines + summary distribution data only (no beneficiary records).
```text
id UUID PK
toolkit_id UUID NOT NULL REFERENCES toolkits(id) ON DELETE CASCADE
name_en VARCHAR(255) NOT NULL ; name_hi VARCHAR(255) NULL
description_en/hi TEXT
unit VARCHAR(50) NULL
distribution_basis distribution_basis_enum NOT NULL DEFAULT 'individual'  -- AC#9: individual | group
default_quantity_per_unit NUMERIC(14,2) NULL
default_group_size INTEGER NULL             -- used when basis = group
quantity_summary NUMERIC(14,2) NULL         -- catalogue-level summary number, not individual records
is_active BOOLEAN NOT NULL DEFAULT true
display_order INTEGER NOT NULL DEFAULT 0
created_at / updated_at
```

### toolkit_distribution_summaries
**Purpose:** Training-level (per-event) toolkit distribution summary — public summary figures only.
No beneficiary-wise records, no stock ledger, no acknowledgements.
```text
id UUID PK
event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE
toolkit_id UUID NOT NULL REFERENCES toolkits(id) ON DELETE RESTRICT
distribution_done BOOLEAN NOT NULL DEFAULT false
distribution_model distribution_model_enum NOT NULL    -- individual | group | mixed
participants_covered INTEGER NULL
distribution_date DATE NULL
remarks_en/hi TEXT NULL
created_by / updated_by / created_at / updated_at
UNIQUE (event_id, toolkit_id)
```

### toolkit_distribution_items
**Purpose:** Item-level lines under a distribution summary (summary figures only).
```text
id UUID PK
toolkit_distribution_summary_id UUID NOT NULL REFERENCES toolkit_distribution_summaries(id) ON DELETE CASCADE
toolkit_item_id UUID NOT NULL REFERENCES toolkit_items(id) ON DELETE RESTRICT
distribution_basis distribution_basis_enum NOT NULL
quantity_per_unit NUMERIC(14,2) NULL
number_of_units_or_groups INTEGER NULL
total_quantity NUMERIC(14,2) NULL           -- auto = quantity_per_unit * units_or_groups unless manual_override
manual_override BOOLEAN NOT NULL DEFAULT false
UNIQUE (toolkit_distribution_summary_id, toolkit_item_id)
```

### institutions
```text
id UUID PK
institution_type_id UUID NOT NULL REFERENCES institution_types(id) ON DELETE RESTRICT
name_en/hi ; description_en/hi
website_url VARCHAR(500) NULL
logo_media_id UUID NULL REFERENCES media_assets(id)
district_id UUID NULL REFERENCES districts(id)
contact_email VARCHAR(255) NULL ; contact_phone VARCHAR(30) NULL
-- + mixin
```

### documents
```text
id UUID PK
title_en VARCHAR(255) NOT NULL ; title_hi VARCHAR(255) NULL
description_en/hi TEXT
document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE RESTRICT
file_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT   -- logical ref preserved on replace
publication_date DATE NULL
language language_enum NOT NULL DEFAULT 'en'
is_public BOOLEAN NOT NULL DEFAULT true
show_in_knowledge_centre BOOLEAN NOT NULL DEFAULT false   -- explicit Knowledge Hub tag
knowledge_category_id UUID NULL REFERENCES knowledge_categories(id) ON DELETE RESTRICT
financial_year_id UUID NULL REFERENCES financial_years(id)
-- + mixin
```
Junctions: `document_commodities`, `document_programmes`, `document_institutions`, `document_districts`, `document_tags`.

### official_communications
```text
id UUID PK
title_en/hi ; summary_en/hi ; body_en/hi
communication_type_id UUID NOT NULL REFERENCES communication_types(id) ON DELETE RESTRICT
reference_number VARCHAR(120) NULL
issue_date DATE NULL ; effective_date DATE NULL ; expiry_date DATE NULL
issuing_authority VARCHAR(255) NULL
document_id UUID NULL REFERENCES documents(id) ON DELETE RESTRICT
-- + mixin   (expiry never auto-unpublishes)
```

### tenders
```text
id UUID PK
title_en/hi ; summary_en/hi
tender_type_id UUID NOT NULL REFERENCES tender_types(id) ON DELETE RESTRICT
tender_number VARCHAR(120) NULL
publish_date DATE NULL ; submission_deadline TIMESTAMPTZ NULL ; opening_date TIMESTAMPTZ NULL
tender_status VARCHAR(40) NULL          -- open | closed | cancelled | awarded (metadata only)
gem_url VARCHAR(500) NULL               -- external; opens new tab. BOQ/corrigenda stay on GeM
-- + mixin
```

### procurement_updates
```text
id UUID PK
title_en/hi ; summary_en/hi ; description_en/hi
procurement_update_type_id UUID NOT NULL REFERENCES procurement_update_types(id) ON DELETE RESTRICT
commodity_id UUID NULL REFERENCES commodities(id)
rate NUMERIC(14,2) NULL ; unit VARCHAR(50) NULL
effective_date DATE NULL ; period_start DATE NULL ; period_end DATE NULL
district_id UUID NULL REFERENCES districts(id) ; block_id UUID NULL REFERENCES blocks(id)
location_text VARCHAR(255) NULL
programme_scheme_id UUID NULL REFERENCES programme_schemes(id)
document_id UUID NULL REFERENCES documents(id)
status VARCHAR(40) NULL                  -- informational, e.g. active | closed | upcoming
-- + mixin   (informational only — no transactions)
```

### success_stories
```text
id UUID PK
title_en/hi ; summary_en/hi ; body_en/hi
commodity_id UUID NULL REFERENCES commodities(id)
district_id UUID NULL REFERENCES districts(id)
cover_media_id UUID NULL REFERENCES media_assets(id)
story_date DATE NULL
source_type story_source_enum NOT NULL DEFAULT 'independent'  -- event | programme | procurement_update | independent
source_record_id UUID NULL              -- soft polymorphic ref (target table implied by source_type); null when independent
-- + mixin
```

### pages
```text
id UUID PK
title_en/hi
body_en TEXT NULL ; body_hi TEXT NULL
meta_title_en/hi VARCHAR(255) NULL ; meta_description_en/hi TEXT NULL
-- + mixin   (slug is the public route key)
```

### menu_items
```text
id UUID PK
label_en VARCHAR(120) NOT NULL ; label_hi VARCHAR(120) NULL
location VARCHAR(20) NOT NULL          -- header | footer | utility
url VARCHAR(500) NULL                  -- internal path or external URL
page_id UUID NULL REFERENCES pages(id) ON DELETE SET NULL
parent_id UUID NULL REFERENCES menu_items(id) ON DELETE CASCADE   -- self-referencing tree
opens_new_tab BOOLEAN NOT NULL DEFAULT false
display_order INTEGER NOT NULL DEFAULT 0
is_active BOOLEAN NOT NULL DEFAULT true
created_by / updated_by / created_at / updated_at
```

### faqs
```text
id UUID PK
faq_category_id UUID NULL REFERENCES faq_categories(id) ON DELETE RESTRICT
question_en/hi ; answer_en/hi
display_order INTEGER
-- + mixin
```

### digital_services
```text
id UUID PK
title_en/hi ; description_en/hi
external_url VARCHAR(500) NOT NULL     -- ERP/MIS/membership; opens new tab
icon_media_id UUID NULL REFERENCES media_assets(id)
-- + mixin
```

### institutional_memberships
**Purpose:** Institution-wise membership only (no personal/voting/dividend data).
Two orthogonal classification axes (spec §4.15, AC#18) feed dashboard reports #10–#13.
```text
id UUID PK
institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT
membership_level membership_level_enum NOT NULL   -- sidhkofed | district_union
membership_type  membership_type_enum  NOT NULL   -- primary | nominal
membership_number VARCHAR(120) NULL
district_id UUID NULL REFERENCES districts(id) ON DELETE RESTRICT          -- geographic district
district_union_id UUID NULL REFERENCES institutions(id) ON DELETE RESTRICT -- the DU org (when level=district_union)
reporting_period_id UUID NULL REFERENCES reporting_periods(id)
status membership_status_enum NOT NULL DEFAULT 'active'
join_date DATE NULL
notes_en/hi TEXT NULL
-- + mixin
-- INDEX (membership_level, membership_type, reporting_period_id)  -- powers reports #10–#13
```
> **DU modeling decision (confirm before seeding):** `district_union_id` references
> `institutions` (a District Union is an organisation already modeled as an Institution).
> If DUs should be a dedicated master, add a `district_unions` table and repoint the FK —
> but do **not** collapse level back into a single field.

### enquiries
**Purpose:** Single public enquiry record (buyer/seller/godown all map here).
```text
id UUID PK
enquiry_type_id UUID NOT NULL REFERENCES enquiry_types(id) ON DELETE RESTRICT
name VARCHAR(150) NOT NULL
mobile VARCHAR(20) NOT NULL
email VARCHAR(255) NOT NULL
subject VARCHAR(255) NOT NULL
message TEXT NOT NULL
organization VARCHAR(255) NULL
commodity_id UUID NULL REFERENCES commodities(id)
programme_scheme_id UUID NULL REFERENCES programme_schemes(id)
-- internal
submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
source_ip_hash VARCHAR(128) NULL          -- hashed, not raw IP
spam_state VARCHAR(20) NOT NULL DEFAULT 'clean'   -- clean | suspected | spam
internal_notes TEXT NULL
archived_at TIMESTAMPTZ NULL
created_at / updated_at
```
(No slug/highlight/homepage mixin — enquiries are not public content. No attachments. Excel export allowed.)

---

## Part 7 — Media System

### media_assets
**Purpose:** Reusable images/files; bulk-uploadable; cannot be hard-deleted while referenced.
```text
id UUID PK
storage_key VARCHAR(500) NOT NULL UNIQUE   -- object storage path
url VARCHAR(700) NOT NULL
file_name VARCHAR(255) NOT NULL
mime_type VARCHAR(120) NOT NULL
file_size_bytes BIGINT NOT NULL
width INTEGER NULL ; height INTEGER NULL
title VARCHAR(255) NULL
alt_text VARCHAR(500) NULL
caption VARCHAR(500) NULL
checksum VARCHAR(128) NULL                  -- dedupe / integrity
replaced_by_id UUID NULL REFERENCES media_assets(id)  -- file replacement chain
archived_at TIMESTAMPTZ NULL
uploaded_by UUID NOT NULL REFERENCES users(id)
created_at / updated_at
```

### galleries
```text
id UUID PK
title_en/hi ; description_en/hi
cover_media_id UUID NULL REFERENCES media_assets(id)
-- + mixin
```

### gallery_images (junction, ordered)
```text
id UUID PK
gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE
media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT
display_order INTEGER NOT NULL DEFAULT 0
caption_en VARCHAR(500) NULL ; caption_hi VARCHAR(500) NULL
UNIQUE (gallery_id, media_id)
```

### videos
**Purpose:** YouTube references only (no direct hosting; homepage shows ≤3 featured).
```text
id UUID PK
title_en/hi ; description_en/hi
youtube_id VARCHAR(40) NOT NULL
youtube_url VARCHAR(500) NOT NULL
thumbnail_media_id UUID NULL REFERENCES media_assets(id)
-- + mixin  (show_on_homepage used for the ≤3 featured rule, enforced in service layer)
```

### media_usages (usage tracking)
**Purpose:** Track where each media asset is used so deletion can be blocked; supports archival reporting.
```text
id UUID PK
media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT
entity_type VARCHAR(60) NOT NULL    -- 'event' | 'document' | 'gallery' | ...
entity_id UUID NOT NULL
field VARCHAR(60) NOT NULL          -- 'cover_media_id' | 'file_asset_id' | ...
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE (media_id, entity_type, entity_id, field)
```

---

## Part 8 — Dashboard Module

### dashboard_reports
**Purpose:** Fixed report definitions (fixed keys + fixed layouts; not user-defined).
```text
id UUID PK
report_key VARCHAR(80) UNIQUE NOT NULL     -- stable, code-referenced
title_en/hi ; description_en/hi
layout_config JSONB NULL                   -- fixed layout descriptor (allowed: presentation config, not content)
display_order INTEGER
is_active BOOLEAN NOT NULL DEFAULT true
-- + mixin (publication/visibility for public exposure)
```

### dashboard_metrics
**Purpose:** Normalized metric values rendered into report layouts.
```text
id UUID PK
report_id UUID NOT NULL REFERENCES dashboard_reports(id) ON DELETE CASCADE
metric_key VARCHAR(80) NOT NULL
label_en VARCHAR(150) NOT NULL ; label_hi VARCHAR(150) NULL
value NUMERIC(18,4) NULL
value_text VARCHAR(255) NULL               -- for non-numeric display values
unit VARCHAR(50) NULL
financial_year_id UUID NULL REFERENCES financial_years(id)
reporting_period_id UUID NULL REFERENCES reporting_periods(id)
source dataset_source_enum NOT NULL DEFAULT 'manual'
dataset_id UUID NULL REFERENCES dashboard_datasets(id) ON DELETE SET NULL
display_order INTEGER NOT NULL DEFAULT 0
created_by / updated_by / created_at / updated_at
UNIQUE (report_id, metric_key, financial_year_id, reporting_period_id)
```

### dashboard_datasets
**Purpose:** Ingest unit for manual entry or Excel import; staging before metrics are derived.
```text
id UUID PK
report_id UUID NOT NULL REFERENCES dashboard_reports(id) ON DELETE RESTRICT
source dataset_source_enum NOT NULL        -- cms_derived | manual | excel
financial_year_id UUID NULL REFERENCES financial_years(id)
reporting_period_id UUID NULL REFERENCES reporting_periods(id)
source_file_asset_id UUID NULL REFERENCES media_assets(id)   -- uploaded Excel
raw_rows JSONB NULL                        -- parsed Excel rows (controlled, tabular staging)
row_count INTEGER NOT NULL DEFAULT 0
status VARCHAR(20) NOT NULL DEFAULT 'pending'  -- pending | processed | failed
processed_at TIMESTAMPTZ NULL
created_by UUID NOT NULL REFERENCES users(id)
created_at / updated_at
```
JSON note: `raw_rows` is permitted because it is transient tabular import staging, not a stored content module; the durable, queryable values live in `dashboard_metrics`.

---

## Part 9 — Audit Logging

### audit_logs
**Purpose:** Immutable record of every state-changing action.
```text
id UUID PK
user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL   -- NULL = system/scheduler
action audit_action_enum NOT NULL          -- create|update|publish|unpublish|archive|restore|media_replace|config_change|master_change|login
module VARCHAR(60) NOT NULL                -- entity name, e.g. 'events'
record_id UUID NULL                        -- affected record
previous_state VARCHAR(40) NULL
new_state VARCHAR(40) NULL
change_summary TEXT NULL                    -- concise human-readable diff
metadata JSONB NULL                         -- optional structured detail (changed field keys)
ip_hash VARCHAR(128) NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```
Audit logs are append-only (no update/delete in app layer). Indexed on `(module, record_id)`, `(user_id)`, `(action)`, `(created_at)`.

### settings
```text
id UUID PK
key VARCHAR(120) UNIQUE NOT NULL           -- e.g. 'enquiry_recipient_email'
value_text TEXT NULL
value_json JSONB NULL
description TEXT NULL
updated_by UUID NULL REFERENCES users(id)
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

## Part 10 — Publishing Workflow

### Fields (in mixin)
`publication_state`, `publish_start_at`, `published_at`, `archived_at`, `public_visibility`, `highlight_type`, `highlight_start_at`, `highlight_end_at`, `display_order`, `show_on_homepage`, `slug`.

### Lifecycle rules

1. **States:** `draft → published → unpublished → archived` (restore returns to `published`/`unpublished`).
2. **Slug:** generated on first create from title; **immutable** thereafter for normal editors (only super_admin may change, and the change is audited). Slug uniqueness enforced per table.
3. **Scheduled publishing:** record stays `draft`/queued with `publish_start_at` in the future; a background worker flips to `published` when `now() >= publish_start_at`. On the first transition to `published`, it sets `published_at=now()` if it is still `NULL`; unpublish, restore, and rescheduling never overwrite that value.
4. **Public exposure:** a record is publicly returned **iff** `publication_state='published' AND public_visibility=true AND archived_at IS NULL AND (publish_start_at IS NULL OR publish_start_at <= now())`.
5. **Highlight:** active when `highlight_type` set and `now()` within `[highlight_start_at, highlight_end_at]`; expiry handled by scheduler (clears highlight, does **not** archive).
6. **Homepage:** `show_on_homepage=true` surfaces in `/api/home` aggregations, subject to the same visibility predicate; per-section caps (e.g. ≤3 videos) enforced in service layer.
7. **Archive vs. delete:** archived records leave public listings/URLs but are restorable with the original slug. **Published records can never be hard-deleted.** Permanent deletion is allowed only for `draft`, never-published, unlinked records with no protected media/document references (checked via `media_usages` and FK references).
8. **Expiry dates** (communications/tenders) are informational only — never auto-unpublish/auto-archive.

---

## Part 11 — Indexing Strategy

| Index | Table(s) | Why |
|---|---|---|
| `UNIQUE (slug)` | every content table | Stable lookup by slug for `/{resource}/{slug}`; enforces immutability uniqueness. |
| `(publication_state, public_visibility, archived_at, published_at)` | all content | Core public-visibility predicate plus stable newest-first ordering; lets public list queries skip drafts/archived fast. |
| partial `WHERE publication_state='published' AND archived_at IS NULL` | events, communications, tenders, documents | Smaller, hot index for the public read path (high read traffic). |
| `(show_on_homepage, display_order)` partial on published | homepage-eligible tables | Powers `/api/home` aggregation cheaply. |
| `(start_date)`, `(end_date)` | events | Date filters, calendar, status derivation. |
| `(publish_date)`, `(submission_deadline)` | tenders | Sort/filter by deadline. |
| `(publication_date)` | documents | Knowledge Hub / listing ordering. |
| `(issue_date)`, `(effective_date)`, `(expiry_date)` | official_communications | Date filters. |
| `(effective_date)`, `(period_start, period_end)` | procurement_updates | Rate-period queries. |
| FK columns: `event_type_id`, `district_id`, `block_id`, `commodity_id`, `document_type_id`, etc. | all | Join/filter performance; avoids seq scans on filtered lists (`?district=`, `?type=`). |
| Junction PKs + reverse index e.g. `(commodity_id, event_id)` | all junctions | Both-direction traversal (events-by-commodity and commodities-of-event). |
| `(report_id, financial_year_id, reporting_period_id)` | dashboard_metrics | Reporting queries by period. |
| `(media_id)`, `(entity_type, entity_id)` | media_usages | Delete-protection lookups + "where is this asset used". |
| `(module, record_id)`, `(created_at)`, `(user_id)` | audit_logs | Audit trail retrieval per record / per user / time range. |
| GIN `to_tsvector(title_en || summary_en || description_en)` (+ Hindi) | events, documents, communications, procurement_updates, success_stories | Phase 1 full-text search over **metadata/editorial text** (not PDF bodies). One generated `search_vector tsvector` column per searchable table + GIN index. |
| GIN on `dynamic_values`, `raw_rows` | events, dashboard_datasets | Optional containment queries on JSONB if needed. |

### Prisma raw-SQL migration — metadata full-text search

Prisma does not model generated `tsvector` columns or their GIN indexes. Create this as a checked-in migration (for example, `prisma/migrations/<timestamp>_metadata_full_text_search/migration.sql`) after Prisma has created the five base tables. The `simple` configuration is deliberate: it tokenizes both English and Hindi metadata without assuming an unavailable Hindi stemming dictionary. PDF/file bodies remain out of scope.

```sql
-- Metadata-only search vectors. Do not add file/PDF extraction here.
ALTER TABLE events
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX events_search_vector_gin_idx ON events USING GIN (search_vector);

ALTER TABLE documents
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX documents_search_vector_gin_idx ON documents USING GIN (search_vector);

ALTER TABLE official_communications
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(body_en, '') || ' ' || coalesce(body_hi, ''))
  ) STORED;
CREATE INDEX official_communications_search_vector_gin_idx ON official_communications USING GIN (search_vector);

ALTER TABLE procurement_updates
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX procurement_updates_search_vector_gin_idx ON procurement_updates USING GIN (search_vector);

ALTER TABLE success_stories
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(body_en, '') || ' ' || coalesce(body_hi, ''))
  ) STORED;
CREATE INDEX success_stories_search_vector_gin_idx ON success_stories USING GIN (search_vector);

-- event_news (spec §14 search scope)
ALTER TABLE event_news
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(body_en, '') || ' ' || coalesce(body_hi, ''))
  ) STORED;
CREATE INDEX event_news_search_vector_gin_idx ON event_news USING GIN (search_vector);

-- programme_schemes
ALTER TABLE programme_schemes
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX programme_schemes_search_vector_gin_idx ON programme_schemes USING GIN (search_vector);

-- tenders
ALTER TABLE tenders
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(tender_number, ''))
  ) STORED;
CREATE INDEX tenders_search_vector_gin_idx ON tenders USING GIN (search_vector);

-- pages
ALTER TABLE pages
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(body_en, '') || ' ' || coalesce(body_hi, ''))
  ) STORED;
CREATE INDEX pages_search_vector_gin_idx ON pages USING GIN (search_vector);
```

The nine searchable surfaces (events, event_news, documents, official_communications,
tenders, programme_schemes, procurement_updates, success_stories, pages) match the public
`content_type` allow-list in the API spec. PDF/file bodies remain out of scope.

Keep `search_vector` out of the Prisma models; access it only through parameterized `$queryRaw` search queries. The public search predicate must still enforce the standard published/visible/not-archived/schedule-due filter for each searched table.

---

## Part 12 — PostgreSQL Design Review

**Normalization**
- Properly normalized: masters separated, M2M via junctions, no repeating groups. Bilingual handled with paired columns (acceptable, simpler than a translations table for a fixed 2-language set).
- Controlled denormalization: `event_status` is derived but stored (with `status_override`) to avoid recompute on every read; refreshed by scheduler. Justified for read-heavy public APIs.
- JSON is confined to `events.dynamic_values` (controlled), `dashboard_datasets.raw_rows` (transient staging), `layout_config`, and audit `metadata`. No module is stored as a JSON blob.

**Performance bottlenecks & mitigations**
- Public list endpoints filter on the visibility predicate constantly → partial indexes on `published AND not archived` keep the hot path small at 100k+ records.
- M2M filters (`?commodity=lac`) → composite reverse indexes on junctions prevent scan-then-join blowups.
- Full-text search → generated `search_vector` + GIN; keep it on metadata only (Phase 1 non-goal: PDF indexing).
- Homepage aggregation hits many tables → use partial homepage indexes + application-level cache (Redis) for `/api/home` and cache master data.

**Future ERP integration**
- CMS tables carry no ERP/transactional state. Add nullable `external_ref` / `erp_source_id` columns *later* via additive migration; never let ERP writes mutate CMS lifecycle. Integrate through a separate schema/service boundary, read-only into dashboards via `dashboard_datasets(source='cms_derived')` style ingestion.
- UUID PKs make cross-system references safe (no sequence collisions).

**Scalability (100k+ content, millions of media refs, high read)**
- `media_usages` will be the largest table (millions of rows) — it's narrow and well-indexed; consider partitioning by `entity_type` if it grows beyond ~50M.
- `audit_logs` grows unbounded → range-partition by `created_at` (monthly) and archive old partitions.
- Read replicas for public APIs; writes to primary. Connection pooling (PgBouncer) given API-first traffic.
- Keep payloads small (lists = summary columns only) as the API contract specifies; avoid `SELECT *` on wide bilingual tables.

---

## Part 13 — Complete Prisma Schema

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────── Enums ───────────────
enum PublicationState { draft published unpublished archived }
enum HighlightType    { new latest important urgent featured }   // null = no highlight
enum DateMode         { single range multi_day }
enum EventStatus      { scheduled ongoing completed postponed cancelled }
enum FieldDataType    { text textarea number date boolean select }
enum TranslationSource{ manual automatic missing }
enum Language         { en hi }
enum AuditAction      { create update publish unpublish archive restore media_replace config_change master_change login }
enum DatasetSource    { cms_derived manual excel }
enum SpamState        { clean suspected spam }
enum MembershipLevel  { sidhkofed district_union }
enum MembershipType   { primary nominal }
enum MembershipStatus { active inactive }
enum DistributionBasis { individual group }
enum DistributionModel { individual group mixed }
enum StorySource      { event programme procurement_update independent }
enum ReportingPeriodType { month financial_year calendar_year cumulative }

// ─────────────── Users & RBAC ───────────────
model User {
  id                String   @id @default(uuid()) @db.Uuid
  email             String   @unique
  passwordHash      String   @map("password_hash")
  fullName          String   @map("full_name")
  preferredLanguage Language @default(en) @map("preferred_language")
  isActive          Boolean  @default(true) @map("is_active")
  lastLoginAt       DateTime? @map("last_login_at")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  userRoles  UserRole[]
  auditLogs  AuditLog[]
  @@map("users")
}

model Role {
  id          String   @id @default(uuid()) @db.Uuid
  key         String   @unique
  nameEn      String   @map("name_en")
  description String?
  isSystem    Boolean  @default(true) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  rolePermissions RolePermission[]
  userRoles       UserRole[]
  @@map("roles")
}

model Permission {
  id          String  @id @default(uuid()) @db.Uuid
  key         String  @unique
  module      String
  action      String
  description String?
  rolePermissions RolePermission[]
  @@unique([module, action])
  @@map("permissions")
}

model RolePermission {
  id           String @id @default(uuid()) @db.Uuid
  roleId       String @map("role_id") @db.Uuid
  permissionId String @map("permission_id") @db.Uuid
  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@unique([roleId, permissionId])
  @@map("role_permissions")
}

model UserRole {
  id     String @id @default(uuid()) @db.Uuid
  userId String @map("user_id") @db.Uuid
  roleId String @map("role_id") @db.Uuid
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Restrict)
  @@unique([userId, roleId])
  @@map("user_roles")
}

// ─────────────── Masters ───────────────
model EventType {
  id           String  @id @default(uuid()) @db.Uuid
  nameEn       String  @unique @map("name_en")
  nameHi       String? @map("name_hi")
  slug         String  @unique
  isActive     Boolean @default(true) @map("is_active")
  displayOrder Int?    @map("display_order")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  events           Event[]
  fieldDefinitions EventFieldDefinition[]
  @@map("event_types")
}

model TrainingType {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  events Event[]
  permittedInProgrammes ProgrammePermittedTrainingType[]
  @@map("training_types")
}

model Commodity {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  iconMediaId String? @map("icon_media_id") @db.Uuid
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  iconMedia MediaAsset? @relation(fields: [iconMediaId], references: [id])
  eventCommodities EventCommodity[]
  documentCommodities DocumentCommodity[]
  toolkits Toolkit[]
  procurementUpdates ProcurementUpdate[]
  successStories SuccessStory[]
  enquiries Enquiry[]
  programmeCommodities ProgrammeCommodity[]
  @@map("commodities")
}

model District {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  state String @default("Jharkhand")
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  blocks Block[]
  events Event[]
  institutions Institution[]
  procurementUpdates ProcurementUpdate[]
  successStories SuccessStory[]
  documentDistricts DocumentDistrict[]
  institutionalMemberships InstitutionalMembership[]
  @@map("districts")
}

model Block {
  id String @id @default(uuid()) @db.Uuid
  districtId String @map("district_id") @db.Uuid
  nameEn String @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  district District @relation(fields: [districtId], references: [id], onDelete: Restrict)
  events Event[]
  procurementUpdates ProcurementUpdate[]
  @@unique([districtId, nameEn])
  @@map("blocks")
}

model InstitutionType {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  institutions Institution[]
  @@map("institution_types")
}

model DocumentType {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  documents Document[]
  @@map("document_types")
}

model KnowledgeCategory {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  documents Document[]
  @@map("knowledge_categories")
}

model CommunicationType {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  communications OfficialCommunication[]
  @@map("communication_types")
}

model TenderType {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  tenders Tender[]
  @@map("tender_types")
}

model ProcurementUpdateType {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  procurementUpdates ProcurementUpdate[]
  @@map("procurement_update_types")
}

model FaqCategory {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  faqs Faq[]
  @@map("faq_categories")
}

model EnquiryType {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int? @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  enquiries Enquiry[]
  @@map("enquiry_types")
}

model FinancialYear {
  id String @id @default(uuid()) @db.Uuid
  label String @unique          // e.g. 2025-2026
  startDate DateTime @map("start_date") @db.Date
  endDate DateTime @map("end_date") @db.Date
  isActive Boolean @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  reportingPeriods ReportingPeriod[]
  documents Document[]
  dashboardMetrics DashboardMetric[]
  dashboardDatasets DashboardDataset[]
  @@map("financial_years")
}

model ReportingPeriod {
  id String @id @default(uuid()) @db.Uuid
  financialYearId String? @map("financial_year_id") @db.Uuid
  nameEn String @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  periodType ReportingPeriodType @map("period_type")   // month | financial_year | calendar_year | cumulative
  calendarYear Int? @map("calendar_year")
  startDate DateTime @map("start_date") @db.Date
  endDate DateTime @map("end_date") @db.Date
  isActive Boolean @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  financialYear FinancialYear? @relation(fields: [financialYearId], references: [id])
  dashboardMetrics DashboardMetric[]
  dashboardDatasets DashboardDataset[]
  institutionalMemberships InstitutionalMembership[]
  @@map("reporting_periods")
}

model Tag {
  id String @id @default(uuid()) @db.Uuid
  nameEn String @unique @map("name_en")
  nameHi String? @map("name_hi")
  slug String @unique
  isActive Boolean @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  documentTags DocumentTag[]
  @@map("tags")
}

// ─────────────── Events ───────────────
model Event {
  id              String   @id @default(uuid()) @db.Uuid
  eventTypeId     String   @map("event_type_id") @db.Uuid
  trainingTypeId  String?  @map("training_type_id") @db.Uuid
  titleEn         String   @map("title_en")
  titleHi         String?  @map("title_hi")
  summaryEn       String?  @map("summary_en")
  summaryHi       String?  @map("summary_hi")
  descriptionEn   String?  @map("description_en")
  descriptionHi   String?  @map("description_hi")
  dateMode        DateMode @default(single) @map("date_mode")
  startDate       DateTime @map("start_date") @db.Date
  endDate         DateTime? @map("end_date") @db.Date
  locationText    String?  @map("location_text")
  districtId      String?  @map("district_id") @db.Uuid
  blockId         String?  @map("block_id") @db.Uuid
  coverMediaId    String?  @map("cover_media_id") @db.Uuid
  eventStatus     EventStatus @default(scheduled) @map("event_status")
  statusOverride  Boolean  @default(false) @map("status_override")
  dynamicValues   Json?    @map("dynamic_values")
  outcomeSummaryEn String? @map("outcome_summary_en")
  outcomeSummaryHi String? @map("outcome_summary_hi")
  keyHighlights   String?  @map("key_highlights")
  finalParticipantCount Int? @map("final_participant_count")
  translationSource TranslationSource @default(manual) @map("translation_source")
  // publishing mixin
  slug             String  @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt   DateTime? @map("publish_start_at")
  publishedAt      DateTime? @map("published_at")
  archivedAt       DateTime? @map("archived_at")
  highlightType    HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt   DateTime? @map("highlight_end_at")
  displayOrder     Int?     @map("display_order")
  showOnHomepage   Boolean  @default(false) @map("show_on_homepage")
  createdById      String   @map("created_by") @db.Uuid
  updatedById      String   @map("updated_by") @db.Uuid
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  eventType    EventType @relation(fields: [eventTypeId], references: [id], onDelete: Restrict)
  trainingType TrainingType? @relation(fields: [trainingTypeId], references: [id], onDelete: Restrict)
  district     District? @relation(fields: [districtId], references: [id], onDelete: Restrict)
  block        Block?    @relation(fields: [blockId], references: [id], onDelete: Restrict)
  coverMedia   MediaAsset? @relation("EventCover", fields: [coverMediaId], references: [id])
  commodities  EventCommodity[]
  programmes   EventProgramme[]
  institutions EventInstitution[]
  documents    EventDocument[]
  galleries    EventGallery[]
  news         EventNews[]
  toolkitDistributions ToolkitDistributionSummary[]

  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@index([startDate])
  @@index([showOnHomepage, displayOrder])
  @@index([eventTypeId])
  @@index([districtId])
  @@map("events")
}

model EventFieldDefinition {
  id           String   @id @default(uuid()) @db.Uuid
  eventTypeId  String   @map("event_type_id") @db.Uuid
  fieldKey     String   @map("field_key")
  labelEn      String   @map("label_en")
  labelHi      String?  @map("label_hi")
  dataType     FieldDataType @map("data_type")
  isRequired   Boolean  @default(false) @map("is_required")
  options      Json?
  displayOrder Int      @default(0) @map("display_order")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  eventType EventType @relation(fields: [eventTypeId], references: [id], onDelete: Cascade)
  @@unique([eventTypeId, fieldKey])
  @@map("event_field_definitions")
}

model EventNews {
  id           String   @id @default(uuid()) @db.Uuid
  eventId      String   @map("event_id") @db.Uuid
  titleEn      String   @map("title_en")
  titleHi      String?  @map("title_hi")
  summaryEn    String?  @map("summary_en")
  summaryHi    String?  @map("summary_hi")
  bodyEn       String?  @map("body_en")
  bodyHi       String?  @map("body_hi")
  coverMediaId String?  @map("cover_media_id") @db.Uuid
  newsPublishedAt DateTime? @map("news_published_at")
  slug             String  @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt   DateTime? @map("publish_start_at")
  publishedAt      DateTime? @map("published_at")
  archivedAt       DateTime? @map("archived_at")
  highlightType    HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt   DateTime? @map("highlight_end_at")
  displayOrder     Int?     @map("display_order")
  showOnHomepage   Boolean  @default(false) @map("show_on_homepage")
  createdById      String   @map("created_by") @db.Uuid
  updatedById      String   @map("updated_by") @db.Uuid
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  event     Event @relation(fields: [eventId], references: [id], onDelete: Restrict)
  coverMedia MediaAsset? @relation("NewsCover", fields: [coverMediaId], references: [id])
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@index([newsPublishedAt])
  @@map("event_news")
}

// ─────────────── Event junctions ───────────────
model EventCommodity {
  id String @id @default(uuid()) @db.Uuid
  eventId String @map("event_id") @db.Uuid
  commodityId String @map("commodity_id") @db.Uuid
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  commodity Commodity @relation(fields: [commodityId], references: [id], onDelete: Restrict)
  @@unique([eventId, commodityId])
  @@index([commodityId, eventId])
  @@map("event_commodities")
}
model EventProgramme {
  id String @id @default(uuid()) @db.Uuid
  eventId String @map("event_id") @db.Uuid
  programmeSchemeId String @map("programme_scheme_id") @db.Uuid
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  programmeScheme ProgrammeScheme @relation(fields: [programmeSchemeId], references: [id], onDelete: Restrict)
  @@unique([eventId, programmeSchemeId])
  @@index([programmeSchemeId, eventId])
  @@map("event_programmes")
}
model EventInstitution {
  id String @id @default(uuid()) @db.Uuid
  eventId String @map("event_id") @db.Uuid
  institutionId String @map("institution_id") @db.Uuid
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  institution Institution @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  @@unique([eventId, institutionId])
  @@index([institutionId, eventId])
  @@map("event_institutions")
}
model EventDocument {
  id String @id @default(uuid()) @db.Uuid
  eventId String @map("event_id") @db.Uuid
  documentId String @map("document_id") @db.Uuid
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  document Document @relation(fields: [documentId], references: [id], onDelete: Restrict)
  @@unique([eventId, documentId])
  @@index([documentId, eventId])
  @@map("event_documents")
}
model EventGallery {
  id String @id @default(uuid()) @db.Uuid
  eventId String @map("event_id") @db.Uuid
  galleryId String @map("gallery_id") @db.Uuid
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  gallery Gallery @relation(fields: [galleryId], references: [id], onDelete: Restrict)
  @@unique([eventId, galleryId])
  @@index([galleryId, eventId])
  @@map("event_galleries")
}

// ─────────────── ProgrammeScheme ───────────────
model ProgrammeScheme {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  shortCode String? @map("short_code")
  summaryEn String? @map("summary_en")
  summaryHi String? @map("summary_hi")
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  fundingSource String? @map("funding_source")
  startDate DateTime? @map("start_date") @db.Date
  endDate DateTime? @map("end_date") @db.Date
  coverMediaId String? @map("cover_media_id") @db.Uuid
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  coverMedia MediaAsset? @relation("ProgrammeCover", fields: [coverMediaId], references: [id])
  events EventProgramme[]
  documents DocumentProgramme[]
  procurementUpdates ProcurementUpdate[]
  enquiries Enquiry[]
  toolkits Toolkit[]
  commodities ProgrammeCommodity[]
  permittedTrainingTypes ProgrammePermittedTrainingType[]
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@map("programme_schemes")
}

model ProgrammeCommodity {
  id String @id @default(uuid()) @db.Uuid
  programmeSchemeId String @map("programme_scheme_id") @db.Uuid
  commodityId String @map("commodity_id") @db.Uuid
  programmeScheme ProgrammeScheme @relation(fields: [programmeSchemeId], references: [id], onDelete: Cascade)
  commodity Commodity @relation(fields: [commodityId], references: [id], onDelete: Restrict)
  @@unique([programmeSchemeId, commodityId])
  @@index([commodityId, programmeSchemeId])
  @@map("programme_commodities")
}

model ProgrammePermittedTrainingType {
  id String @id @default(uuid()) @db.Uuid
  programmeSchemeId String @map("programme_scheme_id") @db.Uuid
  trainingTypeId String @map("training_type_id") @db.Uuid
  programmeScheme ProgrammeScheme @relation(fields: [programmeSchemeId], references: [id], onDelete: Cascade)
  trainingType TrainingType @relation(fields: [trainingTypeId], references: [id], onDelete: Restrict)
  @@unique([programmeSchemeId, trainingTypeId])
  @@map("programme_permitted_training_types")
}

// ─────────────── Toolkit ───────────────
model Toolkit {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  summaryEn String? @map("summary_en")
  summaryHi String? @map("summary_hi")
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  programmeSchemeId String? @map("programme_scheme_id") @db.Uuid
  commodityId String? @map("commodity_id") @db.Uuid
  coverMediaId String? @map("cover_media_id") @db.Uuid
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  programmeScheme ProgrammeScheme? @relation(fields: [programmeSchemeId], references: [id])
  commodity Commodity? @relation(fields: [commodityId], references: [id])
  coverMedia MediaAsset? @relation("ToolkitCover", fields: [coverMediaId], references: [id])
  items ToolkitItem[]
  distributions ToolkitDistributionSummary[]
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@map("toolkits")
}

model ToolkitItem {
  id String @id @default(uuid()) @db.Uuid
  toolkitId String @map("toolkit_id") @db.Uuid
  nameEn String @map("name_en")
  nameHi String? @map("name_hi")
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  unit String?
  distributionBasis DistributionBasis @default(individual) @map("distribution_basis")
  defaultQuantityPerUnit Decimal? @map("default_quantity_per_unit") @db.Decimal(14,2)
  defaultGroupSize Int? @map("default_group_size")
  quantitySummary Decimal? @map("quantity_summary") @db.Decimal(14,2)
  isActive Boolean @default(true) @map("is_active")
  displayOrder Int @default(0) @map("display_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  toolkit Toolkit @relation(fields: [toolkitId], references: [id], onDelete: Cascade)
  distributionItems ToolkitDistributionItem[]
  @@map("toolkit_items")
}

model ToolkitDistributionSummary {
  id String @id @default(uuid()) @db.Uuid
  eventId String @map("event_id") @db.Uuid
  toolkitId String @map("toolkit_id") @db.Uuid
  distributionDone Boolean @default(false) @map("distribution_done")
  distributionModel DistributionModel @map("distribution_model")
  participantsCovered Int? @map("participants_covered")
  distributionDate DateTime? @map("distribution_date") @db.Date
  remarksEn String? @map("remarks_en")
  remarksHi String? @map("remarks_hi")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  toolkit Toolkit @relation(fields: [toolkitId], references: [id], onDelete: Restrict)
  items ToolkitDistributionItem[]
  @@unique([eventId, toolkitId])
  @@index([toolkitId])
  @@map("toolkit_distribution_summaries")
}

model ToolkitDistributionItem {
  id String @id @default(uuid()) @db.Uuid
  toolkitDistributionSummaryId String @map("toolkit_distribution_summary_id") @db.Uuid
  toolkitItemId String @map("toolkit_item_id") @db.Uuid
  distributionBasis DistributionBasis @map("distribution_basis")
  quantityPerUnit Decimal? @map("quantity_per_unit") @db.Decimal(14,2)
  numberOfUnitsOrGroups Int? @map("number_of_units_or_groups")
  totalQuantity Decimal? @map("total_quantity") @db.Decimal(14,2)
  manualOverride Boolean @default(false) @map("manual_override")
  summary ToolkitDistributionSummary @relation(fields: [toolkitDistributionSummaryId], references: [id], onDelete: Cascade)
  toolkitItem ToolkitItem @relation(fields: [toolkitItemId], references: [id], onDelete: Restrict)
  @@unique([toolkitDistributionSummaryId, toolkitItemId])
  @@map("toolkit_distribution_items")
}

// ─────────────── Institution ───────────────
model Institution {
  id String @id @default(uuid()) @db.Uuid
  institutionTypeId String @map("institution_type_id") @db.Uuid
  nameEn String @map("name_en")
  nameHi String? @map("name_hi")
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  websiteUrl String? @map("website_url")
  logoMediaId String? @map("logo_media_id") @db.Uuid
  districtId String? @map("district_id") @db.Uuid
  contactEmail String? @map("contact_email")
  contactPhone String? @map("contact_phone")
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  institutionType InstitutionType @relation(fields: [institutionTypeId], references: [id], onDelete: Restrict)
  logoMedia MediaAsset? @relation("InstitutionLogo", fields: [logoMediaId], references: [id])
  district District? @relation(fields: [districtId], references: [id])
  events EventInstitution[]
  documents DocumentInstitution[]
  memberships InstitutionalMembership[] @relation("MembershipInstitution")
  duMemberships InstitutionalMembership[] @relation("MembershipDistrictUnion")
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@map("institutions")
}

// ─────────────── Document ───────────────
model Document {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  documentTypeId String @map("document_type_id") @db.Uuid
  fileAssetId String @map("file_asset_id") @db.Uuid
  publicationDate DateTime? @map("publication_date") @db.Date
  language Language @default(en)
  isPublic Boolean @default(true) @map("is_public")
  showInKnowledgeCentre Boolean @default(false) @map("show_in_knowledge_centre")
  knowledgeCategoryId String? @map("knowledge_category_id") @db.Uuid
  financialYearId String? @map("financial_year_id") @db.Uuid
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  documentType DocumentType @relation(fields: [documentTypeId], references: [id], onDelete: Restrict)
  fileAsset MediaAsset @relation("DocumentFile", fields: [fileAssetId], references: [id], onDelete: Restrict)
  knowledgeCategory KnowledgeCategory? @relation(fields: [knowledgeCategoryId], references: [id])
  financialYear FinancialYear? @relation(fields: [financialYearId], references: [id])
  commodities DocumentCommodity[]
  programmes DocumentProgramme[]
  institutions DocumentInstitution[]
  districts DocumentDistrict[]
  tags DocumentTag[]
  events EventDocument[]
  communications OfficialCommunication[]
  procurementUpdates ProcurementUpdate[]
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@index([publicationDate])
  @@index([showInKnowledgeCentre])
  @@map("documents")
}

model DocumentCommodity {
  id String @id @default(uuid()) @db.Uuid
  documentId String @map("document_id") @db.Uuid
  commodityId String @map("commodity_id") @db.Uuid
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  commodity Commodity @relation(fields: [commodityId], references: [id], onDelete: Restrict)
  @@unique([documentId, commodityId])
  @@index([commodityId, documentId])
  @@map("document_commodities")
}
model DocumentProgramme {
  id String @id @default(uuid()) @db.Uuid
  documentId String @map("document_id") @db.Uuid
  programmeSchemeId String @map("programme_scheme_id") @db.Uuid
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  programmeScheme ProgrammeScheme @relation(fields: [programmeSchemeId], references: [id], onDelete: Restrict)
  @@unique([documentId, programmeSchemeId])
  @@map("document_programmes")
}
model DocumentInstitution {
  id String @id @default(uuid()) @db.Uuid
  documentId String @map("document_id") @db.Uuid
  institutionId String @map("institution_id") @db.Uuid
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  institution Institution @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  @@unique([documentId, institutionId])
  @@map("document_institutions")
}
model DocumentDistrict {
  id String @id @default(uuid()) @db.Uuid
  documentId String @map("document_id") @db.Uuid
  districtId String @map("district_id") @db.Uuid
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  district District @relation(fields: [districtId], references: [id], onDelete: Restrict)
  @@unique([documentId, districtId])
  @@map("document_districts")
}
model DocumentTag {
  id String @id @default(uuid()) @db.Uuid
  documentId String @map("document_id") @db.Uuid
  tagId String @map("tag_id") @db.Uuid
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  tag Tag @relation(fields: [tagId], references: [id], onDelete: Restrict)
  @@unique([documentId, tagId])
  @@map("document_tags")
}

// ─────────────── Official Communications ───────────────
model OfficialCommunication {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  summaryEn String? @map("summary_en")
  summaryHi String? @map("summary_hi")
  bodyEn String? @map("body_en")
  bodyHi String? @map("body_hi")
  communicationTypeId String @map("communication_type_id") @db.Uuid
  referenceNumber String? @map("reference_number")
  issueDate DateTime? @map("issue_date") @db.Date
  effectiveDate DateTime? @map("effective_date") @db.Date
  expiryDate DateTime? @map("expiry_date") @db.Date
  issuingAuthority String? @map("issuing_authority")
  documentId String? @map("document_id") @db.Uuid
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  communicationType CommunicationType @relation(fields: [communicationTypeId], references: [id], onDelete: Restrict)
  document Document? @relation(fields: [documentId], references: [id])
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@index([issueDate])
  @@map("official_communications")
}

// ─────────────── Tenders ───────────────
model Tender {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  summaryEn String? @map("summary_en")
  summaryHi String? @map("summary_hi")
  tenderTypeId String @map("tender_type_id") @db.Uuid
  tenderNumber String? @map("tender_number")
  publishDate DateTime? @map("publish_date") @db.Date
  submissionDeadline DateTime? @map("submission_deadline")
  openingDate DateTime? @map("opening_date")
  tenderStatus String? @map("tender_status")
  gemUrl String? @map("gem_url")
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  tenderType TenderType @relation(fields: [tenderTypeId], references: [id], onDelete: Restrict)
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@index([submissionDeadline])
  @@map("tenders")
}

// ─────────────── Procurement Updates ───────────────
model ProcurementUpdate {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  summaryEn String? @map("summary_en")
  summaryHi String? @map("summary_hi")
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  procurementUpdateTypeId String @map("procurement_update_type_id") @db.Uuid
  commodityId String? @map("commodity_id") @db.Uuid
  rate Decimal? @db.Decimal(14,2)
  unit String?
  effectiveDate DateTime? @map("effective_date") @db.Date
  periodStart DateTime? @map("period_start") @db.Date
  periodEnd DateTime? @map("period_end") @db.Date
  districtId String? @map("district_id") @db.Uuid
  blockId String? @map("block_id") @db.Uuid
  locationText String? @map("location_text")
  programmeSchemeId String? @map("programme_scheme_id") @db.Uuid
  documentId String? @map("document_id") @db.Uuid
  status String?                          // informational, e.g. active | closed | upcoming
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  procurementUpdateType ProcurementUpdateType @relation(fields: [procurementUpdateTypeId], references: [id], onDelete: Restrict)
  commodity Commodity? @relation(fields: [commodityId], references: [id])
  district District? @relation(fields: [districtId], references: [id])
  block Block? @relation(fields: [blockId], references: [id])
  programmeScheme ProgrammeScheme? @relation(fields: [programmeSchemeId], references: [id])
  document Document? @relation(fields: [documentId], references: [id])
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@index([effectiveDate])
  @@index([commodityId])
  @@map("procurement_updates")
}

// ─────────────── Success Stories ───────────────
model SuccessStory {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  summaryEn String? @map("summary_en")
  summaryHi String? @map("summary_hi")
  bodyEn String? @map("body_en")
  bodyHi String? @map("body_hi")
  commodityId String? @map("commodity_id") @db.Uuid
  districtId String? @map("district_id") @db.Uuid
  coverMediaId String? @map("cover_media_id") @db.Uuid
  storyDate DateTime? @map("story_date") @db.Date
  sourceType StorySource @default(independent) @map("source_type")
  sourceRecordId String? @map("source_record_id") @db.Uuid
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  commodity Commodity? @relation(fields: [commodityId], references: [id])
  district District? @relation(fields: [districtId], references: [id])
  coverMedia MediaAsset? @relation("StoryCover", fields: [coverMediaId], references: [id])
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@map("success_stories")
}

// ─────────────── Pages & Menu ───────────────
model Page {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  bodyEn String? @map("body_en")
  bodyHi String? @map("body_hi")
  metaTitleEn String? @map("meta_title_en")
  metaTitleHi String? @map("meta_title_hi")
  metaDescriptionEn String? @map("meta_description_en")
  metaDescriptionHi String? @map("meta_description_hi")
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  menuItems MenuItem[]
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@map("pages")
}

model MenuItem {
  id String @id @default(uuid()) @db.Uuid
  labelEn String @map("label_en")
  labelHi String? @map("label_hi")
  location String          // header | footer | utility
  url String?
  pageId String? @map("page_id") @db.Uuid
  parentId String? @map("parent_id") @db.Uuid
  opensNewTab Boolean @default(false) @map("opens_new_tab")
  displayOrder Int @default(0) @map("display_order")
  isActive Boolean @default(true) @map("is_active")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  page Page? @relation(fields: [pageId], references: [id], onDelete: SetNull)
  parent MenuItem? @relation("MenuTree", fields: [parentId], references: [id], onDelete: Cascade)
  children MenuItem[] @relation("MenuTree")
  @@index([location, displayOrder])
  @@map("menu_items")
}

// ─────────────── FAQ & Digital Services ───────────────
model Faq {
  id String @id @default(uuid()) @db.Uuid
  faqCategoryId String? @map("faq_category_id") @db.Uuid
  questionEn String @map("question_en")
  questionHi String? @map("question_hi")
  answerEn String @map("answer_en")
  answerHi String? @map("answer_hi")
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  faqCategory FaqCategory? @relation(fields: [faqCategoryId], references: [id])
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@map("faqs")
}

model DigitalService {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  externalUrl String @map("external_url")
  iconMediaId String? @map("icon_media_id") @db.Uuid
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  iconMedia MediaAsset? @relation("ServiceIcon", fields: [iconMediaId], references: [id])
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@map("digital_services")
}

// ─────────────── Institutional Membership ───────────────
model InstitutionalMembership {
  id String @id @default(uuid()) @db.Uuid
  institutionId String @map("institution_id") @db.Uuid
  membershipLevel MembershipLevel @map("membership_level")   // sidhkofed | district_union
  membershipType MembershipType @map("membership_type")      // primary | nominal
  membershipNumber String? @map("membership_number")
  districtId String? @map("district_id") @db.Uuid
  districtUnionId String? @map("district_union_id") @db.Uuid
  reportingPeriodId String? @map("reporting_period_id") @db.Uuid
  status MembershipStatus @default(active)
  joinDate DateTime? @map("join_date") @db.Date
  notesEn String? @map("notes_en")
  notesHi String? @map("notes_hi")
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  institution Institution @relation("MembershipInstitution", fields: [institutionId], references: [id], onDelete: Restrict)
  districtUnion Institution? @relation("MembershipDistrictUnion", fields: [districtUnionId], references: [id], onDelete: Restrict)
  district District? @relation(fields: [districtId], references: [id], onDelete: Restrict)
  reportingPeriod ReportingPeriod? @relation(fields: [reportingPeriodId], references: [id])
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@index([membershipLevel, membershipType, reportingPeriodId])
  @@map("institutional_memberships")
}

// ─────────────── Enquiries ───────────────
model Enquiry {
  id String @id @default(uuid()) @db.Uuid
  enquiryTypeId String @map("enquiry_type_id") @db.Uuid
  name String
  mobile String
  email String
  subject String
  message String
  organization String?
  commodityId String? @map("commodity_id") @db.Uuid
  programmeSchemeId String? @map("programme_scheme_id") @db.Uuid
  submittedAt DateTime @default(now()) @map("submitted_at")
  sourceIpHash String? @map("source_ip_hash")
  spamState SpamState @default(clean) @map("spam_state")
  internalNotes String? @map("internal_notes")
  archivedAt DateTime? @map("archived_at")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  enquiryType EnquiryType @relation(fields: [enquiryTypeId], references: [id], onDelete: Restrict)
  commodity Commodity? @relation(fields: [commodityId], references: [id])
  programmeScheme ProgrammeScheme? @relation(fields: [programmeSchemeId], references: [id])
  @@index([submittedAt])
  @@index([spamState])
  @@map("enquiries")
}

// ─────────────── Media System ───────────────
model MediaAsset {
  id String @id @default(uuid()) @db.Uuid
  storageKey String @unique @map("storage_key")
  url String
  fileName String @map("file_name")
  mimeType String @map("mime_type")
  fileSizeBytes BigInt @map("file_size_bytes")
  width Int?
  height Int?
  title String?
  altText String? @map("alt_text")
  caption String?
  checksum String?
  replacedById String? @map("replaced_by_id") @db.Uuid
  archivedAt DateTime? @map("archived_at")
  uploadedById String @map("uploaded_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  replacedBy MediaAsset? @relation("MediaReplace", fields: [replacedById], references: [id])
  replaces MediaAsset[] @relation("MediaReplace")
  usages MediaUsage[]
  galleryImages GalleryImage[]
  // back-relations
  eventCovers Event[] @relation("EventCover")
  newsCovers EventNews[] @relation("NewsCover")
  programmeCovers ProgrammeScheme[] @relation("ProgrammeCover")
  toolkitCovers Toolkit[] @relation("ToolkitCover")
  institutionLogos Institution[] @relation("InstitutionLogo")
  documentFiles Document[] @relation("DocumentFile")
  storyCovers SuccessStory[] @relation("StoryCover")
  serviceIcons DigitalService[] @relation("ServiceIcon")
  commodityIcons Commodity[]
  galleryCovers Gallery[] @relation("GalleryCover")
  videoThumbnails Video[] @relation("VideoThumb")
  datasetFiles DashboardDataset[] @relation("DatasetFile")
  @@map("media_assets")
}

model Gallery {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  coverMediaId String? @map("cover_media_id") @db.Uuid
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  coverMedia MediaAsset? @relation("GalleryCover", fields: [coverMediaId], references: [id])
  images GalleryImage[]
  events EventGallery[]
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@map("galleries")
}

model GalleryImage {
  id String @id @default(uuid()) @db.Uuid
  galleryId String @map("gallery_id") @db.Uuid
  mediaId String @map("media_id") @db.Uuid
  displayOrder Int @default(0) @map("display_order")
  captionEn String? @map("caption_en")
  captionHi String? @map("caption_hi")
  gallery Gallery @relation(fields: [galleryId], references: [id], onDelete: Cascade)
  media MediaAsset @relation(fields: [mediaId], references: [id], onDelete: Restrict)
  @@unique([galleryId, mediaId])
  @@map("gallery_images")
}

model Video {
  id String @id @default(uuid()) @db.Uuid
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  youtubeId String @map("youtube_id")
  youtubeUrl String @map("youtube_url")
  thumbnailMediaId String? @map("thumbnail_media_id") @db.Uuid
  slug String @unique
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  displayOrder Int? @map("display_order")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  thumbnailMedia MediaAsset? @relation("VideoThumb", fields: [thumbnailMediaId], references: [id])
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@index([showOnHomepage, displayOrder])
  @@map("videos")
}

model MediaUsage {
  id String @id @default(uuid()) @db.Uuid
  mediaId String @map("media_id") @db.Uuid
  entityType String @map("entity_type")
  entityId String @map("entity_id") @db.Uuid
  field String
  createdAt DateTime @default(now()) @map("created_at")
  media MediaAsset @relation(fields: [mediaId], references: [id], onDelete: Restrict)
  @@unique([mediaId, entityType, entityId, field])
  @@index([entityType, entityId])
  @@map("media_usages")
}

// ─────────────── Dashboard ───────────────
model DashboardReport {
  id String @id @default(uuid()) @db.Uuid
  reportKey String @unique @map("report_key")
  titleEn String @map("title_en")
  titleHi String? @map("title_hi")
  descriptionEn String? @map("description_en")
  descriptionHi String? @map("description_hi")
  layoutConfig Json? @map("layout_config")
  displayOrder Int? @map("display_order")
  isActive Boolean @default(true) @map("is_active")
  publicationState PublicationState @default(draft) @map("publication_state")
  publicVisibility Boolean @default(true) @map("public_visibility")
  publishStartAt DateTime? @map("publish_start_at")
  publishedAt DateTime? @map("published_at")
  archivedAt DateTime? @map("archived_at")
  highlightType HighlightType? @map("highlight_type")
  highlightStartAt DateTime? @map("highlight_start_at")
  highlightEndAt DateTime? @map("highlight_end_at")
  showOnHomepage Boolean @default(false) @map("show_on_homepage")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  metrics DashboardMetric[]
  datasets DashboardDataset[]
  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@map("dashboard_reports")
}

model DashboardMetric {
  id String @id @default(uuid()) @db.Uuid
  reportId String @map("report_id") @db.Uuid
  metricKey String @map("metric_key")
  labelEn String @map("label_en")
  labelHi String? @map("label_hi")
  value Decimal? @db.Decimal(18,4)
  valueText String? @map("value_text")
  unit String?
  financialYearId String? @map("financial_year_id") @db.Uuid
  reportingPeriodId String? @map("reporting_period_id") @db.Uuid
  source DatasetSource @default(manual)
  datasetId String? @map("dataset_id") @db.Uuid
  displayOrder Int @default(0) @map("display_order")
  createdById String @map("created_by") @db.Uuid
  updatedById String @map("updated_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  report DashboardReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
  financialYear FinancialYear? @relation(fields: [financialYearId], references: [id])
  reportingPeriod ReportingPeriod? @relation(fields: [reportingPeriodId], references: [id])
  dataset DashboardDataset? @relation(fields: [datasetId], references: [id], onDelete: SetNull)
  @@unique([reportId, metricKey, financialYearId, reportingPeriodId])
  @@map("dashboard_metrics")
}

model DashboardDataset {
  id String @id @default(uuid()) @db.Uuid
  reportId String @map("report_id") @db.Uuid
  source DatasetSource
  financialYearId String? @map("financial_year_id") @db.Uuid
  reportingPeriodId String? @map("reporting_period_id") @db.Uuid
  sourceFileAssetId String? @map("source_file_asset_id") @db.Uuid
  rawRows Json? @map("raw_rows")
  rowCount Int @default(0) @map("row_count")
  status String @default("pending")
  processedAt DateTime? @map("processed_at")
  createdById String @map("created_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  report DashboardReport @relation(fields: [reportId], references: [id], onDelete: Restrict)
  financialYear FinancialYear? @relation(fields: [financialYearId], references: [id])
  reportingPeriod ReportingPeriod? @relation(fields: [reportingPeriodId], references: [id])
  sourceFileAsset MediaAsset? @relation("DatasetFile", fields: [sourceFileAssetId], references: [id])
  metrics DashboardMetric[]
  @@map("dashboard_datasets")
}

// ─────────────── Audit & Settings ───────────────
model AuditLog {
  id String @id @default(uuid()) @db.Uuid
  userId String? @map("user_id") @db.Uuid
  action AuditAction
  module String
  recordId String? @map("record_id") @db.Uuid
  previousState String? @map("previous_state")
  newState String? @map("new_state")
  changeSummary String? @map("change_summary")
  metadata Json?
  ipHash String? @map("ip_hash")
  createdAt DateTime @default(now()) @map("created_at")
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  @@index([module, recordId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}

model Setting {
  id String @id @default(uuid()) @db.Uuid
  key String @unique
  valueText String? @map("value_text")
  valueJson Json? @map("value_json")
  description String?
  updatedById String? @map("updated_by") @db.Uuid
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("settings")
}
```

> **FTS note:** `search_vector tsvector` generated columns + GIN indexes are implemented in [`prisma/migrations/20260624154500_metadata_full_text_search/migration.sql`](../prisma/migrations/20260624154500_metadata_full_text_search/migration.sql). They intentionally remain outside the Prisma models because Prisma does not model `tsvector` natively.

---

## Part 14 — API Readiness Validation Checklist

| Public API family | Backed by | Status |
|---|---|---|
| `GET /api/events`, `/events/{id-or-slug}` | `events` + junctions + `event_field_definitions` | ✅ slug + id lookup, filters by type/district/commodity/status/year via indexed FKs |
| `GET /api/news`, `/news/{…}` | `event_news` | ✅ independent editorial fields & lifecycle |
| `GET /api/programmes` | `programme_schemes` | ✅ |
| `GET /api/documents?knowledge_centre=true&type=report` | `documents` + `show_in_knowledge_centre` + `knowledge_category_id` + junctions | ✅ metadata search only (no PDF body) |
| `GET /api/communications` | `official_communications` | ✅ expiry informational only |
| `GET /api/tenders` | `tenders` + `gem_url` | ✅ |
| `GET /api/procurement-updates?commodity=&district=` | `procurement_updates` | ✅ indexed commodity/district |
| `GET /api/success-stories` | `success_stories` | ✅ |
| `GET /api/pages/{slug}` | `pages` | ✅ |
| `GET /api/galleries`, `/videos` | `galleries`/`gallery_images`/`videos` | ✅ ≤3 homepage videos via service rule |
| `GET /api/memberships` | `institutional_memberships` | ✅ institutional only |
| `GET /api/dashboard`, `/dashboard/{report-key}` | `dashboard_reports`/`metrics`/`datasets` | ✅ fixed keys, CMS+manual+Excel |
| `GET /api/faqs`, `/digital-services` | `faqs`, `digital_services` | ✅ |
| `GET /api/search` | per-table `search_vector` GIN | ✅ metadata FTS |
| `POST /api/enquiries` | `enquiries` | ✅ text-only, ip_hash, spam_state, no attachments |
| `GET /api/home` | aggregation over `show_on_homepage` + `highlight_*` | ✅ partial homepage indexes |
| Audit logs | `audit_logs` | ✅ all 10 actions covered by enum |

### Missing fields / recommended improvements

1. **SEO/meta fields** — currently only on `pages`. Recommend adding optional `meta_title_*` / `meta_description_*` to events, news, documents, programmes if public detail pages need per-record SEO. (Add later, additive.)
2. **`published_at` timestamp** — implemented in the publishing mixin and every publishable Prisma model. Set it only when a record first becomes `published`; public latest-first endpoints order by `published_at DESC`, not the scheduled `publish_start_at`.
3. **Soft-archive on masters** — masters use `is_active` (sufficient per spec); no `archived_at` needed.
4. **Translation source coverage** — only `events` carries `translation_source`. If automatic fallback is approved site-wide, promote it into the mixin.
5. **Enquiry recipient config** — handled via `settings.key='enquiry_recipient_email'`. ✅
6. **Rate-limit / CAPTCHA state** — enforced at API/middleware layer, not schema; `source_ip_hash` + `spam_state` support post-hoc review. ✅
7. **`media_usages` population** — must be written transactionally on every link/unlink to keep delete-protection accurate; this is an application-layer obligation, not enforceable purely in schema.
8. **Full-text `search_vector`** — implemented as the checked-in raw-SQL migration above because Prisma lacks native `tsvector` support; it indexes metadata only, never PDF bodies.

### Critical-rules compliance

- ✅ No modules invented beyond the spec; no ERP/transaction tables.
- ✅ M2M via junctions; ✅ media/documents reusable by reference; ✅ JSON only for `events.dynamic_values` (+ justified dashboard staging / audit metadata / layout config).
- ✅ Stable immutable slugs; ✅ published records never hard-deleted (RESTRICT FKs + archive + `media_usages` guard).
- ✅ Bilingual `*_en`/`*_hi`; ✅ RBAC (3 roles); ✅ scheduled publishing, highlight, homepage; ✅ audit logging.
