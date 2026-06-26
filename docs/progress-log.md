# SIDHKOFED Progress Log

## Purpose

Use this file to track work when the same repository is edited from multiple
devices. Update it before switching devices, before committing, and after
pulling changes from another machine.

## Session — Phase 15.2: Admin Dashboard & Global Search (admin frontend)

Scope: ONLY the Admin Dashboard and Global Search UI. No other modules, CRUD pages,
forms, editors, or media library. Composes the existing Phase-15.0 shell/providers/
design-system and Phase-15.1 query/CRUD/http layers, and consumes existing backend
contracts (dashboard, search, audit). No backend change; no 15.0/15.1 infrastructure
rewritten. Each feature is a self-contained vertical slice under `admin/src/features/`.

Backend APIs consumed (read-only): `GET /public/dashboard/kpis` (resolved headline
KPIs), `GET /admin/dashboard/reports` (fixed report catalog + publication state),
`GET /admin/audit-logs` (Recent Activity; Super Admin only), `GET /admin/{resource}?page_size=1`
(per-module/state totals read from `pagination.total_items` — the server's count, not a
client tally), and `GET /admin/search` (server-side global search over all publication states).

Added (all under `admin/src/`):
- **Shared infra extensions:** `constants/routes.ts` (+`search`), `constants/api-endpoints.ts`
  (`SEARCH_ENDPOINTS`/`DASHBOARD_ENDPOINTS`/`AUDIT_ENDPOINTS`), `constants/query-keys.ts`
  (`dashboard`/`audit`/`search` namespaces), `constants/permissions.ts`
  (`CONTENT_PERMISSIONS`/`DASHBOARD_PERMISSIONS` key mirrors), and DTO types
  `types/dashboard.ts` + `types/search.ts` (mirror backend dashboard/search/audit shapes 1:1).
- **Dashboard feature** `features/dashboard/`: `api.ts` (fetchers), `hooks.ts`
  (`useDashboardKpis`/`useDashboardReports`/`useRecentActivity`/`useContentCount[s]`),
  `components/` (reusable widgets: `StatCard`, `DashboardCard`, `StatusRow`, `InfoCard`,
  `WarningCard`; sections: `ContentKpiGrid`, `HeadlineKpiGrid`, `QuickActions` (permission-aware),
  `RecentActivity`, `ContentStateSummary` (Draft+Published+Archived table), `ReportStatus`,
  `SystemStatus` (no invented health checks), `SearchShortcut`), and `dashboard-page.tsx`
  (manual + React-Query refresh, per-card loading/error/retry).
- **Search feature** `features/search/`: `api.ts` (`buildSearchQuery`/`searchAdmin`), `hooks.ts`
  (`useSearchResults` min-length-gated, `groupResultsByType`), `content-type-meta.ts`
  (icon/label/admin-route per content type), `search-provider.tsx` (global Ctrl/Cmd+K palette +
  "/" shortcut), `components/` (`SearchModal` on shared `useFocusTrap` — focus trap/ESC/scroll-lock/
  overlay/restore-focus; `SearchResults` grouped; `SearchResultCard`; `SearchFilters` content-type +
  year), and `search-page.tsx` (URL-driven, paginated, full empty/loading/error/no-result states).
- **Routes/shell:** `app/(admin)/dashboard/page.tsx` → `DashboardPage`; new
  `app/(admin)/search/page.tsx` → `SearchPage` (Suspense-wrapped for `useSearchParams`);
  `AdminShell` now wraps children in `SearchProvider`; `Topbar` search button + mobile icon open
  the palette (replaced the disabled placeholder seam).
- **Tests** (+18): search `hooks`/`content-type-meta`/`api`/`use-search-results`(renderHook gating)/
  `search-result-card`(render); dashboard `api`(count reads total_items)/`quick-actions`(permission
  matrix). Covers grouping, min-length gating, permission-aware affordances, and result rendering.

Design notes: dashboard is fixed (no widget/report builder); KPIs are backend-resolved or
backend-counted totals (no frontend KPI math). Search is fully server-side (no client index/filter/
re-rank); results group only for scannability and preserve backend ranking. Permission-aware
affordances (`usePermissions`/`<Can>`) hide what the user can't use — backend stays the security
boundary. Recent Activity self-restricts to Super Admin instead of surfacing a 403. Result cards
render only backend-provided fields (no invented publication-state/highlight). Admin results deep-
link to the reserved admin route `${route}/${id}` (module detail pages land in later phases).

Verified (in `admin/`): `tsc --noEmit` ✓, `next lint` ✓ (no warnings), `vitest` 46 passed
(28 baseline + 18 new), `next build` ✓ (`/dashboard` + `/search` compile).

Commit/push status: not committed (left for review).

## Sync Protocol

1. Before starting work, run `git pull` and read the latest entries in this file.
2. Add a short "Session Start" entry with device/location and intended task.
3. Before stopping, add a "Session End" entry with what changed, what remains,
   and whether changes were committed/pushed.
4. Push commits before moving to another device whenever possible.
5. If work is unfinished and uncommitted, note the exact files touched and next
   safe step.

## Current Snapshot

- Repo: `D:\Sidhkofed-Website`
- Branch: `main`
- Remote: `origin/main`
- Current project state: Static SIDHKOFED prototype plus CMS/API planning docs.
- Prototype entrypoint: `index.html`
- Core docs:
  - `docs/agile-backlog.md`
  - `docs/sidhkofed-cms-codex-context.md`
  - `docs/cms-integration-conventions.md`
  - `docs/api-context/`

## Active Work

| Area | Status | Notes |
|---|---|---|
| Static prototype | Relocated | Moved to `legacy-prototype/`; open `legacy-prototype/index.html`. |
| CMS scope | Context ready | Full CMS context mirrored in repo docs. |
| API context | In progress | Module-based API context has been drafted. |
| Backend implementation | Foundation done | Infra only (Express+TS+Prisma+Redis+BullMQ+storage+health). See foundation/07. |

## Open Decisions

| Decision | Current Leaning | Notes |
|---|---|---|
| CMS/backend stack | Django/Wagtail or API-first Django | Final decision pending implementation planning. |
| Godown handling | Enquiry/static or future master | Full CMS context does not yet define a separate Godown module. |
| Frontend evolution | Static prototype first | Convert later to templates/framework after backend direction is locked. |

## Blockers / Risks

| Item | Impact | Next Action |
|---|---|---|
| Official SIDHKOFED content/data pending | Prototype still contains representative content | Collect logo, contacts, notices, tenders, documents, photos, and membership/network data. |
| Backend stack not finalized | CMS implementation not started | Review CMS/API context and choose implementation stack. |

## Running Log

### 2026-06-24 - Codex Session

Type: Session End  
Device: Current workspace  
Branch: `main`

Completed:

- Built static SIDHKOFED prototype structure.
- Added CMS source context and compact CMS integration conventions.
- Added module-based API context under `docs/api-context/`.
- Added this multi-device progress log.

Files of interest:

- `index.html`
- `src/css/main.css`
- `src/js/app.js`
- `docs/api-context/`
- `docs/progress-log.md`

Next suggested step:

- Review and commit/push the latest documentation changes so another device can
  start from the same context.

## Entry Template

### YYYY-MM-DD - Short Session Title

Type: Session Start / Session End / Decision / Blocker  
Device:  
Branch:  

Changed:

- 

Decisions:

- 

Open items:

- 

Commit/push status:

- 

---

### 2026-06-25 - Backend foundation (infrastructure) implemented

Type: Session End
Device: Windows / d:\Ranchi_web\Sidhkofed-Website
Branch: anant-dev

Changed:

- Bootstrapped Node.js + Express + TypeScript (strict) backend at the repo root
  per docs/foundation/02. Relocated the static prototype to `legacy-prototype/`
  to free `src/`.
- Added: package.json, tsconfig.json, .eslintrc.cjs, .prettierrc, docker-compose.yml
  (postgres + redis), .env (local, gitignored).
- `src/config` (Zod env validation + typed config), `src/db/prisma.ts` (singleton),
  `src/services/redis.ts`, `src/jobs/*` (BullMQ foundation, no jobs yet),
  `src/services/storage/*` (local + S3 drivers behind one interface),
  `src/services/audit.ts` (audit hook, log-only foundation),
  `src/shared/*` (logger, errors, envelope, pagination),
  `src/middleware/*` (request-id, pino-http logging, error handler, 404),
  `src/routes/health.routes.ts` (/health, /ready, /live) + `src/routes/index.ts`,
  `src/app.ts`, `src/server.ts`, `scripts/smoke.ts`.
- `prisma/schema.prisma`: datasource + generator + canonical self-contained
  `Setting` model (governance). No content/business models.

Decisions:

- Backend root = `Sidhkofed-Website/`, Prisma at root, source under `src/` (doc 02).
- Added only the governance `Setting` model so `prisma generate` produces a client
  (a model-less schema cannot generate). AuditLog deferred — it relates to `users`
  and would pull in the identity graph; audit foundation logs structurally for now.
- Did NOT apply the existing FTS migration: `20260624154500_metadata_full_text_search`
  is raw SQL that ALTERs content tables (events/documents/…) which do not exist yet.
  It must run AFTER the base content-table migration (a later business-schema
  deliverable). For local foundation bring-up use `prisma db push`; do not
  `migrate deploy` on a fresh DB until the base migration exists.

Verified:

- `npm run build`, `npm run typecheck`, `npm run lint` all clean.
- `npm run smoke`: Redis ✓ (PONG), BullMQ ✓ (enqueue ok), Storage ✓,
  HTTP /live=200 and /health=503-degraded correctly reporting per-dependency status.
  PostgreSQL pending only because no DB server was running locally (Docker daemon
  was not up); connectivity logic uses `$connect` + `SELECT 1` (needs no tables).

Open items:

- Start Postgres (`npm run db:up` once Docker is running) then `npx prisma db push`
  and re-run `npm run smoke` to confirm Prisma connects (expect 5/5, /health=200).
- Next tier (out of this foundation): auth/RBAC, masters, then content modules.

Commit/push status:

- Not committed (left for review).

---

## Session — Phase 4: Master Data Management (Masters module)

Scope: implemented ONLY master data (no business modules), per the approved contracts.

Added/changed:

- `prisma/schema.prisma`: 16 master models + `ReportingPeriodType` enum, copied verbatim
  from schema Part 13 with content back-relations TRIMMED to this phase (only
  `commodities.icon_media_id → media_assets`, District↔Block, FinancialYear↔ReportingPeriod);
  `MediaAsset.commodityIcons` back-relation added.
- `prisma/migrations/20260625100000_masters/migration.sql`: hand-written; verified against
  `prisma migrate diff --from-empty` (FK onDelete clauses match exactly).
- `src/modules/masters/*`: generic framework — registry (16 defs), base service/repository/
  validator, dto, controller, routes, permissions, tests. One config-driven CRUD pipeline.
- `src/services/cache.ts`: reusable fail-open Redis JSON cache (SCAN-based invalidation).
- `src/modules/audit/audit.events.ts`: MASTER_CREATE/UPDATE/ACTIVATE/DEACTIVATE → master_change.
- `src/modules/auth/auth.permissions.ts`: masters.view/create/update/activate/deactivate/restore;
  content_editor + publisher get masters.view.
- `src/routes/index.ts`: mounted `/admin/masters` and `/public/masters`.
- `prisma/seed/masters.ts` (+ index hook): idempotent seed — 24 districts, representative
  blocks, all canonical types, FY 2024–2027, reporting periods.
- `docs/modules/masters.md`: full module doc.

Verified: `npm run typecheck` clean, `npm run lint` clean, `npm run test` 97 passed
(+4 pre-existing skipped), masters suite 18/18. Migration not applied (no DB server in this
environment); apply with `prisma migrate deploy` then `npm run db:seed`.

Not implemented (correctly out of scope): Events, News, Programmes, Toolkits, Documents,
Institutions, Communications, Tenders, Procurement, Memberships, Dashboard, Search.

Commit/push status: not committed (left for review).

---

## Session — Pre-Phase-5 Remediation (audit Issues 1–11)

Fixed all audited blockers; no new features, no Phase 5.

- **#1 (migration chain):** moved the premature `metadata_full_text_search` migration (ALTERs
  content tables that don't exist yet) to `prisma/parked-migrations/` + README. Active chain
  `init → media → masters → audit_fk_relations` has zero forward references → fresh deploy-safe.
- **#2 (media URLs):** store a stable app delivery endpoint (`/api/v1/public/media/:id/file`),
  never a signed URL; `GET /public/media/:id/file` streams local / 302-redirects S3 signed
  URLs; `GET /admin/media/:id/url` resolves a fresh URL on demand.
- **#3 (upload security):** removed SVG from the registry/policy, reject XML/SVG byte content,
  replaced the fake virus scanner (`media.scanner.ts`) — it can never report a false "clean";
  enabled-but-unconfigured uploads are rejected, disabled = explicit "unscanned" + security log.
- **#4 (upload policy):** validation now uses the configured `uploads.allowed_*_types`
  (Settings/env) allow-list; no hardcoded acceptance.
- **#5 (rate limiting):** Redis fixed-window limiter (`middleware/rate-limit.ts`) on login
  (5/15m), refresh + logout (30/15m), uploads (configurable). 429 + structured logs, fail-open.
- **#6 (media-usage atomicity):** gallery/video create + cover/thumbnail changes now register
  media usage inside `prisma.$transaction`.
- **#7 (storage readiness):** boot fails when storage health check fails; removed `gcs` from the
  provider enum so an unimplemented provider fails config validation.
- **#8 (audit FK fields):** `created_by/updated_by/uploaded_by` are now nullable `User`
  relations with `onDelete: SetNull` (migration `20260625110000_audit_fk_relations`); services
  pass null, not ''.
- **#9 (route validation):** shared `uuidParam`/`requireUuidParams` (422 not 500) wired via
  `router.param` on media/gallery/video/masters; P2023/P2000/P2005/P2006 backstop in the error
  handler.
- **#10 (audit reliability):** audit writes go through `auditRepository.create`; failures emit
  an alertable `audit_write_failed` error log (alert:true) without breaking the operation.
- **#11 (gallery list):** list query returns a summary (cover + image_count via `_count`), not
  every image; detail keeps the full collection.

Verified: `prisma validate` ✓, `tsc --noEmit` ✓, `eslint` ✓, `vitest` 107 passed (+10 new),
active migration chain forward-reference-free. Live `migrate deploy` not run here (no local
Postgres/Docker); apply with `prisma migrate deploy` then `npm run db:seed`.

Commit/push status: not committed (left for review).

---

## Session — Phase 7: Architecture Compliance Remediation (audit Issues 1–12)

Compared each Phase-7 audit finding against the frozen docs and fixed only genuine violations.

Fixed:
- **#1 Prisma client out of sync** — regenerated (`prisma generate`); the toolkits models now
  exist in the client, typecheck clean. No business logic changed.
- **#5 RBAC** — API spec §1.2/§8 mandates module-named permissions. Seeded + enforced
  `programmes.*`, `toolkits.*`, `toolkit_items.*`, `toolkit_distributions.*`; routes for those 4
  modules now check the named keys; generic `content.*` kept for the still-unconverted modules.
  Super Admin bypass preserved. **Requires `npm run db:seed` (idempotent) so existing editor/
  publisher users gain the new grants.**
- **#6 Content-editor edit restriction** — new `shared/content-guard.ts`; non-publishers may edit
  drafts only (Programme/Toolkit by own state; Item by parent toolkit; Distribution by parent
  event). Actor authz threaded via `AuditContext.authz`.
- **#7 Public toolkit visibility** — added `isPubliclyVisible` companion to `shared/visibility.ts`;
  public toolkit DTO no longer surfaces a draft/archived/future-scheduled linked programme.
- **#8 Unknown query filters** — `assertKnownQueryKeys` → 422 on unknown params (programmes/toolkits).
- **#9 Duplicate programme names** — case-insensitive `programmeRepository.nameExists` (codex §4.2),
  independent of slug uniqueness.
- **#11 Public distribution summary** — replaced full-history in-memory reduce with DB `groupBy`
  aggregates + one metadata lookup; API shape unchanged.
- **#12 Tests** — +25 unit (content-guard, isPubliclyVisible, query allow-list, RBAC catalog,
  public-programme-leak DTO, DB-aggregation assembly) + a guarded toolkits integration suite;
  extended programmes integration (duplicate-name 409, editor-edit-published 403, unknown-param 422).

False positives (implementation already matches the frozen architecture — no change):
- **#3 Toolkit→Programme/Commodity mandatory:** frozen `database-schema-design.md` defines both FKs
  as `NULL`/optional (line 381/1464, "AC#8"); making them required would violate the schema.
- **#10 Distribution eligibility (event type/category):** the Event model has no `category` and no
  documented event-type gate for distributions; existing checks (event exists, toolkit non-archived,
  active item membership, unique (event,toolkit)) are the real eligibility the architecture defines.

ARCHITECTURE CONFLICTS — reported, NOT changed (need architect sign-off):
- **#2 ProgrammeScheme classification:** codex-context §4.2 (precedence #2) frames it as a
  "master-operation" (`is_active`, "Deactivation only") — Master Data; `database-schema-design.md`
  (#3) + `api-specification.md` (#4) model it as **Publishable Content** (full publishing-workflow
  mixin), which is what the implementation follows. Same tension applies to `Institution`. Converting
  to master lifecycle would destructively redesign two built modules — escalated rather than guessed.
- **#4 Audit FK policy:** `database-schema-design.md` lines 156–157 mandate audit columns
  `NOT NULL … ON DELETE RESTRICT`; the approved Pre-Phase-5 migration `20260625110000_audit_fk_relations`
  intentionally made them nullable + `ON DELETE SET NULL` (documented rationale: preserve history on
  user deletion). Per the brief, reported instead of silently reverting; the new toolkit/distribution
  models follow the same applied SET NULL convention for consistency.

Verified: `prisma validate` ✓, `tsc --noEmit` ✓ (src), `eslint` ✓, `vitest` 319 passed / 53 skipped
(+25 new). Live `migrate deploy` not run (no local Postgres). Schema unchanged → no new migration.

Commit/push status: not committed (left for review).

---

## Session — Phase 15.1: Shared CMS Infrastructure (admin frontend, CRUD hook layer)

Scope: reusable CMS infrastructure only — no module/business pages. Built the keystone
data-access tier that lets future module pages (Events, Documents, …) be composed from
config rather than re-writing CRUD/list/lifecycle plumbing. Composes the existing Phase-15.0
foundation (`lib/api/crud-factory`, `constants/query-keys`, `lib/query`, toast/dialog
providers) — nothing in 15.0 or the backend was modified.

Added (all under `admin/src/`):
- **Shared types** `types/crud.ts` — `ResourceConfig`, `EntityRef`/`RelationOption`,
  `FilterFieldDef`/`FilterState`/`FilterController`, `BulkActionDef`/`BulkResult`,
  `MediaSelectable`/`DocumentSelectable`. Exported via `types/index.ts`.
- **Server-error mapping** `lib/api/server-errors.ts` — `toFormSubmitResult`,
  `extractFieldErrors`, `fieldErrorMessage`, `errorMessage` (maps a 422 `fields` map onto
  the reusable `<Form>` wrapper; everything else → form-level banner). Exported via `lib/api`.
- **CRUD React Query hooks** `hooks/crud/`: `useResourceApi` (memoized client),
  `useCrudList` (keepPreviousData paging), `useCrudDetail` (id-gated), `useCrudCreate`,
  `useCrudUpdate`, `useCrudDelete`, lifecycle `usePublish/useUnpublish/useArchive/useRestore`
  (+ `useLifecycleActions` aggregate), `useBulkAction` (settle-all fan-out + summary toast),
  `useFilters` (URL-synced, allow-listed, server-side filtering + reset), `useCrudSearch`
  (debounced inline search). Re-exported through `hooks/index.ts`.
- **Tests** (+7): `server-errors.test.ts`, `use-crud-list.test.tsx` (mocked API + QueryClient),
  `use-bulk-action.test.tsx` (ToastProvider; success/failure breakdown + empty no-op).

Design notes: create/update do NOT toast errors (the `<Form>` owns 422 field mapping);
lifecycle/delete/bulk DO toast (explicit user actions). Permission gating stays in `<Can>`/
PermissionButton at the call site — backend remains the security boundary. Filter keys are
allow-listed client-side so non-allow-listed params are never sent (matches API §1.4).

Verified (in `admin/`): `tsc --noEmit` ✓, `next lint` ✓ (no warnings), `vitest` 28 passed (+7).

Remaining for Phase 15.1 (not yet built — composition UI on top of this tier): relationship
selectors (EntitySelector/AsyncSearchSelector/hierarchical/virtualized), media & document
pickers/browser dialogs, rich-text wrapper, publishing-workflow dialog components, detail-view
framework (metadata/audit/relationship cards + timeline), reusable card set, generic
List/Create/Edit/Detail page templates, and skeleton/error component variants. Status badges
(`StatusBadge`/`HighlightBadge`), `<Can>`, DataTable + bulk bar, and the form shell already
exist from 15.0 and are reused as-is.

Commit/push status: not committed (left for review).

---

## Phase 15.3 — Events & News Frontend (admin)

Implemented the complete admin frontend for the two modules **Events** and **Event News**,
consuming the backend contracts exactly (events/news DTOs, validators, dynamic-field engine,
`content.*` RBAC) and built entirely on the 15.0/15.1/15.2 shared infrastructure (DataTable,
form framework, CRUD/lifecycle/filter hooks, feedback states, `<Can>`, dialogs, status badges).

New reusable infra (reference pattern for every later content module):
`admin/src/components/relationships/` — master/relation option hooks (`useMasterOptions`,
`useRelationOptions`, programme/institution/gallery/document wrappers), the shared media picker
dialog (browse library + upload via existing `/admin/media`), and the RHF-bound `CoverMediaField`.

Events (`admin/src/features/events/`): list (server pagination/search/filters/sort/column-select/
bulk publish+archive), create/edit form (bilingual tabs, dynamic type-specific fields rendered
from `event_field_definitions`, relationship multi-selects, cover picker, scheduling/highlight,
read-only slug), detail/view (overview, bilingual content, dynamic values, relationships,
timeline, completion panel), lifecycle (publish/unpublish/archive/restore) + postpone/cancel
(status override) + complete + publish-as-news. Routes: `/events`, `/events/new`,
`/events/[id]`, `/events/[id]/edit`.

News (`admin/src/features/news/`): list, detail/view, edit form (bilingual, cover, publish
scheduling, highlight, read-only slug + immutable linked event). No standalone create — `/news/new`
is an honest guidance page pointing to the event publish-as-news flow. Routes: `/news`,
`/news/[id]`, `/news/[id]/edit`, `/news/new`.

Design fidelity: dynamic fields limited to the backend's six data types; event status is
display-only (never recomputed; `scheduled`→"Upcoming"); HTML bodies rendered as escaped text
(no XSS); filters are the exact backend allow-lists; permission gating via `<Can>` with the
backend as the security boundary. Nav entries + reserved routes already existed in 15.0 (no
sidebar change needed).

Verified (in `admin/`): `tsc --noEmit` ✓, `next lint` ✓ (no warnings/errors),
`vitest` 74 passed (20 files, +28 new), `next build` ✓ (all 8 new routes compile).
No backend files modified (`prisma/schema.prisma` change predates this work and was left
untouched; `package-lock.json` changed only because admin deps were installed to run the build).

Commit/push status: not committed (left for review).
