# Phase 17.2 — API Contract Remediation

> **Scope:** Verify each API-related production-audit finding against the **frozen
> architecture** and remediate **only genuine contract violations**. The architecture
> documents are the source of truth; the audit report is not. Precedence (highest first):
> `sidhkofed-cms-codex-context.md` → `database-schema-design.md` → `api-specification.md`
> → `claude-master-build-context.md`.
>
> No API was redesigned. No route renamed. No response envelope, DTO, publishing, or RBAC
> rule changed. No Prisma model was added in this pass (see Finding 5 for why the one item
> that *would* require a model is scoped out, not silently dropped).

## 1. Audit findings reviewed — verdicts

| # | Finding | Architecture verdict | Action |
|---|---|---|---|
| 1 | `GET /public/home` aggregate missing | **Required** — codex §15.8 ("one aggregated homepage endpoint"), api-spec §5 *Home* row, master-build §10.3 | **Implemented** |
| 2 | Public Galleries missing | **Required** — api-spec §5 (`GET /public/galleries`, `…/{slug}`), master-build §10.3 | **Implemented** |
| 3 | Public Videos missing | **Required** — api-spec §5 (`GET /public/videos`, `…/{slug}`), master-build §10.3 | **Implemented** |
| 4 | Success Stories module missing | **Intentionally deferred to Phase 2** — codex §22, master-build §8.1 ("normally Phase 2"); no backing table in the implemented schema | **Rejected (documented)** |
| 5 | Enquiries module missing | **Genuine Phase-1 gap** — codex §22, schema-design §, api-spec §6, master-build §8.3. Not an "API contract deviation" but a **missing module + database entity** | **Confirmed gap; scoped as its own slice** (see §4) |

The audit was correct on 1–3 and 5, and **wrong on 4** (it recommended building Success
Stories; the highest-priority document explicitly defers it).

## 2. Implemented fixes

All three are **additive** public read surfaces over **already-existing** entities/services.
They introduce no new tables, reuse the single public-visibility predicate
(`src/shared/visibility.ts` — published + `public_visibility` + not archived + due), the
standard `{success,data,pagination,meta}` envelope, the shared pagination/ordering helpers,
and per-module Redis caching with invalidation on admin writes.

### Finding 1 — `GET /public/home`
- New module `src/modules/home/` (`home.service.ts`, `home.controller.ts`, `home.routes.ts`).
- **Composes existing per-module `publicList` services** — no direct Prisma, no duplicated
  queries (codex §15.8/§15.10). Sections: dashboard KPIs, news, events, communications,
  tenders, programmes, partners (institutions), digital services, and **≤3** featured videos.
- Every section is curated by the `show_on_homepage` workflow flag and fetched in parallel.
- Each section's cache key lives under its module's `:public:` prefix, so an admin edit to a
  module invalidates the matching home section automatically (no new cross-module wiring).
- **Success Stories section is intentionally omitted** (Phase 2 — Finding 4). The shape is
  additive; the section can be slotted in when that module ships without breaking the contract.
- Mounted **after** `/public/home/partners` so the specific partners sub-route is not shadowed.

### Finding 2 — `GET /public/galleries`, `GET /public/galleries/{slug}`
- Added `galleryRepository.publicList` + `findPublicBySlug` (visibility predicate), public
  DTOs (`toPublicGallerySummaryDto`/`toPublicGalleryDetailDto`), public query parser
  (`show_on_homepage` filter; ordering `display_order,-published_at`), public controller, and
  `galleryPublicRouter`. List is the lightweight cover + `image_count` shape; detail returns
  ordered images/captions.
- Public DTOs expose **only** presentation fields — never `publication_state`,
  `public_visibility`, `archived_at`, audit/`created_by` fields (api-spec §1.3).
- Wired `invalidatePublicCache()` into every gallery admin mutation (create/update/lifecycle/
  image add/update/remove/reorder).

### Finding 3 — `GET /public/videos`, `GET /public/videos/{slug}`
- Added `videoRepository.publicList` + `findPublicBySlug`, public DTO (`toPublicVideoDto` —
  YouTube id/url + derived thumbnail only, never a hosted file), public query parser, public
  controller, and `videoPublicRouter`. Wired cache invalidation into create/update/lifecycle.

## 3. Rejected finding — Success Stories (architecture justification)

- **codex §22 Implementation Priority** lists **Success Stories under Phase 2** (Phase 1 list
  does not include it).
- **master-build §8.1** describes `SuccessStory` as *"lightweight optional content, normally
  Phase 2."*
- The implemented `prisma/schema.prisma` has **no `SuccessStory` model** (the design doc
  defines the table for forward-readiness, but the requirements doc defers the feature).
- `search.types.ts` forward-references `success_story` as a search `content_type`, and
  api-spec §14 already states those columns must be added *first* if/when the surface ships —
  confirming the deferral is deliberate, not an omission.

**Decision:** Do **not** implement. Building it now would contradict the highest-priority
document and add an unrequested Phase-2 module. When Success Stories is formally scheduled, it
needs: `SuccessStory` Prisma model + migration + `search_vector`, admin **P** module, public
`/public/success-stories(+/{slug})`, a `home.aggregate` section, search indexing, scheduler/
publishing wiring, RBAC, and tests.

## 4. Confirmed gap — Enquiries (scoped as its own slice)

Enquiries **is** Phase 1 (codex §22, schema-design `enquiries` table, api-spec §6,
master-build §8.3), and the supporting infrastructure already exists (recipient-email setting,
per-IP/contact rate-limit config, background queue). The implemented `prisma/schema.prisma`
has the `EnquiryType` **master** but **no `Enquiry` submission table** and no module.

Unlike Findings 1–3, this is **not** a contract deviation over an existing entity — it is a
full module that requires a **new Prisma entity + migration** plus a security-sensitive write
path. It is therefore confirmed as a genuine gap and scoped as a dedicated slice rather than
half-built in this read-only remediation. Required scope (api-spec §6):

- `Enquiry` model + migration; `POST /public/enquiries` accepting exactly
  `name,mobile,email,enquiry_type_id,subject,message` (+ optional `organization,commodity_id,
  programme_scheme_id`, opaque `captcha_token`); reject attachments/unknown fields; CAPTCHA,
  honeypot, origin + dedup fingerprint, per-IP/contact rate limiting, privacy-safe IP hash,
  `spam_state`; `201 {id,submitted_at}` with no acknowledgement email.
- Admin: `GET /admin/enquiries`, `GET /admin/enquiries/{id}`, `PATCH` (`internal_notes`,
  `spam_state` only), `POST …/{id}/archive`, `GET …/export?format=xlsx` (the only v1 export);
  RBAC: Super Admin + Publisher (editors none).
- Audit logging, `no-store` responses, and search exclusion (enquiries are never indexed).

## 5. API consistency review (existing + new endpoints)

- **Response envelope:** new endpoints use the single `success`/`paginated` helpers — verified.
- **Pagination:** `page`/`page_size` (default 20, max 100) via shared `resolvePageParams`.
- **Filtering/ordering:** allow-listed; unknown filters/ordering → `422`
  (`assertKnownQueryKeys` + `resolveOrdering`). Galleries/videos public filter = `show_on_homepage`.
- **Public visibility:** new reads delegate to the single `publicVisibilityWhere()` predicate;
  no draft/unpublished/archived/future/hidden leakage. Public DTOs omit internal/audit fields.
- **Permissions:** new routes are public reads only; **no admin/RBAC/publishing path changed.**
- **Audit logging:** all content mutations still go through the existing `auditService` — the
  cache-invalidation additions are post-audit and bypass nothing.

## 6. Files changed

**New:** `src/modules/home/{home.service,home.controller,home.routes,home.service.test}.ts`;
`src/modules/galleries/{gallery.public.controller,gallery.query,gallery.public.service.test}.ts`;
`src/modules/videos/{video.public.controller,video.query,video.public.service.test}.ts`;
this document.

**Modified:** `src/routes/index.ts` (mount `/public/home`, `/public/galleries`,
`/public/videos`); `src/modules/galleries/{gallery.repository,gallery.dto,gallery.service,
gallery.routes,gallery.service.test}.ts`; `src/modules/videos/{video.repository,video.dto,
video.service,video.routes,video.service.test}.ts`.

## 7. Verification

- `npm run typecheck` → 0 errors. `npm run build` → success. `eslint` (new files) → clean.
- `vitest run src` → **89 files / 753 tests pass** (no regressions) + **26** new/updated tests
  (galleries/videos/home public reads, visibility, envelope, no-leak, video ≤3 cap, 404).
- Integration suites under `tests/` require a live Postgres/Redis (`RUN_INTEGRATION=1`) and are
  unchanged; the new code is exercised by unit suites with mocked Prisma/Redis.

## 8. Remaining risks

1. **Enquiries (Phase 1) not yet implemented** — §4. Highest-priority follow-up; needs a schema
   migration + DB-backed tests.
2. **Success Stories (Phase 2)** — intentionally absent; revisit when scheduled (§3).
3. New public read paths verified by unit tests only in this environment (no DB). Run
   `npm run test:integration` against a provisioned DB before release to exercise the live
   visibility predicate end-to-end.
