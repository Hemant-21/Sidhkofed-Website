# Documents Module (+ Knowledge Centre)

The reusable **document repository** for the whole CMS: a document is uploaded once (as a
media asset) and the `Document` record is the governed metadata + lifecycle wrapper that is
linked by reference from anywhere. This module is Phase 5 and the foundation every future
content module (events, communications, procurement, pages, success stories) attaches its
document links to.

> Source of truth: CMS requirements §4.5, `database-schema-design.md` Part 6/Part 13,
> `api-specification.md` §5/§6. The schema, API contract, RBAC, and media infrastructure are
> **unchanged** — this module only adds the `documents` tables and the module slice.

## Architecture

Layered vertical slice (foundation §2/§4), Prisma confined to the repository:

```
routes → controller → validators → service → repository → Prisma
              │                        │
        documents.query.ts      shared services: media, media-usage, audit, cache, publishing
```

| File | Role |
|---|---|
| `documents.routes.ts` | admin + public route wiring; role-based `authorize()` |
| `documents.controller.ts` | admin HTTP (create/list/detail/patch/lifecycle/replace-file) |
| `documents.public.controller.ts` | public HTTP (`/public/documents`, `/public/knowledge-centre`) |
| `documents.query.ts` | query-string → `DocumentFilters` + allow-listed ordering |
| `documents.validators.ts` | Zod request DTOs (create/update/replace-file) |
| `documents.service.ts` | all business logic: lifecycle, master/asset validation, KC rule, versioning, audit, cache |
| `documents.repository.ts` | the only Prisma caller; `where` builder + visibility predicate + junction writers + active-ref check |
| `documents.dto.ts` | summary/detail mappers (admin + public) + compact `DocumentRef` |
| `documents.permissions.ts` | logical `documents.*` permission keys + content mapping |
| `documents.types.ts` | filter/ordering contract + `DOCUMENT_ENTITY` |

## Data model (approved schema — unchanged)

`documents` carries the full publishing-workflow mixin plus document-specific metadata:

`title_en/hi`, `description_en/hi`, `document_type_id` (→ `document_types`, RESTRICT),
`file_asset_id` (→ `media_assets`, RESTRICT — logical ref preserved on replace),
`publication_date`, `language` (`en|hi`), `is_public`, `show_in_knowledge_centre`,
`knowledge_category_id` (→ `knowledge_categories`, SET NULL), `financial_year_id`
(→ `financial_years`, SET NULL), `slug`, `publication_state`, `public_visibility`,
`publish_start_at`, `published_at`, `archived_at`, `highlight_type/start/end`,
`display_order`, `show_on_homepage`, `created_by`, `updated_by`, timestamps.

Junctions landed this phase: `document_commodities`, `document_districts`, `document_tags`
(junction child → `Cascade`; master → `Restrict`).

### Scoping note (module-by-module, additive)

The approved `Document` model also defines `document_programmes` / `document_institutions`
junctions and `events` / `communications` / `procurement_updates` back-relations. Those
target tables **do not exist yet** (programmes/institutions = dependency-graph Tier 7,
events = Tier 10, communications/procurement = Tier 12). Following the codebase's documented
"trim to the relations whose counterparts exist, add the rest additively" process (same as
the media/masters slices), those relations are **omitted now and added when those modules
land**. The `documents` table shape, field names, enums, and onDelete contract are unchanged.
Consequently the `programme`/`institution` Knowledge-Centre filters arrive with those modules;
every other approved filter is implemented now.

## Request flow (create)

```
POST /admin/documents
  validate (zod, strict) →
  service:
    assertLinkableDocumentAsset(file_asset_id)   // exists, not archived, document-like (not image)
    repo.validateReferences(...)                 // every master exists AND is active
    assertKnowledgeCentreRule(showKc, categoryId) // KC tag requires a category
    uniqueSlug(title_en)                          // stable, collision-safe
    $transaction:
      repo.create(documents)
      repo.setCommodities/Districts/Tags(...)     // junctions
      mediaUsageService.registerUsage(file)       // delete-protection for the file asset
    audit.create('document', …)
    cache.delByPrefix('documents:public:')        // invalidate public reads
```

## Lifecycle & publishing (TASK 9)

Reuses `src/shared/publishing.ts` (the same mixin helper as galleries/videos). Explicit
action endpoints — PATCH never transitions state:

```
POST /admin/documents/:id/publish | unpublish | archive | restore
```

- `publish` sets `published_at` on first publish only; re-asserts the file is present and
  not archived (**cannot publish without an uploaded file**) and the KC rule still holds.
- `archive` hides the record immediately (public predicate excludes `archived_at`).
- `restore` returns it to `unpublished` (never silently re-exposes).
- Scheduled publishing via `publish_start_at`: the public predicate only returns a document
  when `publish_start_at` is null or due. Highlight (`highlight_type` + window) and
  `show_on_homepage` are workflow fields on create/update.

## Version management (TASK 8)

`POST /admin/documents/:id/replace-file` `{ file_asset_id }` swaps the underlying file while
**preserving the logical Document UUID/slug**. The old asset is never physically deleted
(media replace-chain on the media side); this module moves the `media_usages` link from the
old asset to the new one and audits `MEDIA_REPLACE` with `previous_file_asset_id` recorded for
history. No new `Document` is created.

## Knowledge Centre (TASK 5)

`GET /public/knowledge-centre` returns only documents explicitly tagged
`show_in_knowledge_centre = true` (public visibility alone is **not** sufficient). Supported
filters (admin list + public list share the builder):

| Filter | Backing |
|---|---|
| `document_type` (id/slug) | `documents.document_type_id` |
| `knowledge_category` (id/slug) | `documents.knowledge_category_id` |
| `knowledge_centre=true` | `show_in_knowledge_centre` |
| `commodity` (id/slug) | `document_commodities` junction |
| `district` (id/slug) | `document_districts` junction |
| `financial_year` (id/label) | `documents.financial_year_id` |
| `language` (`en\|hi`) | `documents.language` |
| `year`, `date_from`, `date_to` | `documents.publication_date` |
| `search` | bilingual title/description (FTS-ready seam — see below) |
| ordering | `publication_date, published_at, title_en, display_order, created_at` (±) |

`programme` / `institution` filters land with those modules (junctions not yet created).

## RBAC (TASK 10)

Documents are a publishable **P** content resource, so authorization reuses the existing
role-based `authorize()` middleware exactly like galleries/videos (API spec §8 — one content
row covers documents). No RBAC schema change (development-rules §3):

| Action | Super Admin | Content Editor | Publisher |
|---|---|---|---|
| list / detail / create / update | ✅ | ✅ | ✅ |
| publish / unpublish / archive / restore / replace-file | ✅ | — | ✅ |
| public read | public | public | public |

`documents.permissions.ts` documents the logical `documents.view/create/update/publish/
archive/restore` keys and their mapping onto the seeded generic `content.*` permissions
(the foundation deliberately uses shared `content.*` so a new content module needs no
re-seed).

## Audit (TASK 11)

Every state change writes through the cross-cutting `auditService` (module `document`):
`CREATE`, `UPDATE`, `PUBLISH`/`UNPUBLISH`/`ARCHIVE`/`RESTORE`, and `MEDIA_REPLACE` (file
replacement, with prior asset id). Audit failures are logged, never thrown.

## Caching (TASK 12)

Redis via the shared `cacheService` (fail-open):
- Public detail by slug: `documents:public:slug:<slug>`.
- Public listings (documents + knowledge-centre): `documents:public:list:<surface>:<hash>`
  where the hash covers filters + ordering + page.
- **Invalidation:** any create/update/lifecycle/replace calls `delByPrefix('documents:public:')`,
  so public reads never serve stale data. Admin responses are `no-store`.

## Media reuse (TASK 6 — no duplicated upload logic)

This module **does not upload files**. Editors upload via the existing `POST /admin/media`
(which enforces size from Settings, MIME/extension/magic-byte checks, malware-scan hook,
checksum, and storage write). A document references an already-uploaded asset by
`file_asset_id`; the service only asserts the asset is present, non-archived, and
document-like (PDF/DOC/DOCX/XLS/XLSX/ZIP — not an image). `media_usages` makes the linked
file undeletable while referenced.

## Full-text search readiness (TASK 17)

The keyword `search` filter is an indexed bilingual `ILIKE` over title/description today. The
parked metadata FTS migration (`prisma/parked-migrations/`) adds a `search_vector` GIN column
to `documents` (among the other content tables); when all FTS content tables exist it is
re-introduced and the repository's search seam swaps to a parameterized `$queryRaw` over
`search_vector` with no service/contract change. PDF/file bodies are never indexed (Phase-1
non-goal).

## API surface

```
# Admin (bearer token + RBAC)
GET    /api/v1/admin/documents
POST   /api/v1/admin/documents
GET    /api/v1/admin/documents/{id}
PATCH  /api/v1/admin/documents/{id}
POST   /api/v1/admin/documents/{id}/publish | unpublish | archive | restore
POST   /api/v1/admin/documents/{id}/replace-file        # { file_asset_id }

# Public (no auth; published + visible + not archived + due + is_public)
GET    /api/v1/public/documents
GET    /api/v1/public/documents/{slug}
GET    /api/v1/public/knowledge-centre
```

All responses use the single `{success,data|pagination,meta}` / `{success:false,error,meta}`
envelope. Public responses never expose `created_by`/`updated_by`, internal flags, or storage
keys.

## Business rules enforced (TASK 16)

- Cannot publish without an uploaded, non-archived file.
- Cannot link an archived or image media asset as the document file.
- Cannot reference an inactive master (type / category / FY / commodity / district / tag).
- Cannot create a duplicate slug (auto-suffixed; `slug` is immutable after creation).
- Knowledge-Centre tag requires a knowledge category (create, update-merged-state, publish).
- Linked file assets cannot be hard-deleted (`media_usages`); replacement preserves the
  document and the old asset.

> "Cannot archive default reference documents" and "cannot publish an expired document" have
> no backing field in the approved schema (no `is_default` / `expiry_date` on `documents`) and
> are therefore out of scope for this phase rather than invented; the closest enforced rules
> are above. Task 4's `summary` / `effective_date` / `expiry_date` / `publish_end` fields are
> **not** in the approved `documents` schema and were intentionally not added.

## Seed data (TASK 20)

Document types (Notice, Circular, Office Order, MoU, Report, Policy, Guideline, SOP, Training
Material, Form, Publication, Other) and Knowledge categories (Acts and Rules, Bye-laws,
Policies and Guidelines, SOPs and Manuals, Training Resources, Research and Reports,
Publications, Forms and Formats) are already seeded (`prisma/seed/masters.ts`). Sample
documents are **not** auto-seeded — they require uploaded media assets and approved content
(build-context: representative vs official content must stay honest).

## Tests

- `documents.validators.test.ts` — field/shape + KC rule + strict unknown-field rejection.
- `documents.service.test.ts` — asset linkability, media-usage registration, KC rule,
  publish-requires-file, replace-file usage re-point + audit, cache invalidation, public cache.
- `documents.repository.test.ts` — `where` builder: public predicate, id/slug + label
  resolution, junction filters, date ranges, search.
- `tests/documents.integration.test.ts` (guarded by `RUN_INTEGRATION=1`) — CRUD, RBAC
  (editor cannot publish → 403; publisher can), public visibility, archive, auth required.

## Future integrations

When their modules land, add (additively, no redesign): `document_programmes` /
`document_institutions` junctions + their filters; `EventDocument` / `OfficialCommunication`
/ `ProcurementUpdate` back-references (those modules already reference `document_id`); the
`search_vector` FTS column; and inclusion in `/public/search` and `/public/home`.
