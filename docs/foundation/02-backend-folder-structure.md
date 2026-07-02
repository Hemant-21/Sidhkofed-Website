# 2. Backend Folder Structure (Production-Ready)

> A modular monolith in Node.js + TypeScript + Prisma. The layout is **framework-
> neutral**: it works unchanged whether the HTTP layer is Express or NestJS.
> This is a structure *plan* — no implementation files are created here.

## 0. Where the backend lives

`prisma/` already exists at `Sidhkofed-Website/` (the FTS migration is checked in),
so the **backend application root is `Sidhkofed-Website/`** and Prisma stays at the
root. New backend source goes under `src/`.

> **Prototype relocation (conscious decision, do before scaffolding `src/`):** the
> Phase-A static review prototype currently occupies `index.html`, `assets/`,
> `src/css/`, `src/js/`. Move it to `legacy-prototype/` (or promote it into a
> separate frontend workspace) so `src/` is free for the API. Do not silently
> overwrite it — it is the approved stakeholder prototype.

## 1. HTTP framework — the one open choice

| Option | Fit | Note |
|---|---|---|
| **Express + this layered layout** (recommended default) | High | Minimal, explicit, matches the task's example folders 1:1. Lowest ceremony for a CMS API. |
| **NestJS** | High | Built-in DI/modules/guards/pipes map cleanly to controller/service/validator/guard. Choose if the team wants opinionated structure. |

Both use the identical folder taxonomy below. Decision owner: backend lead. The rest
of this foundation assumes the **Express** spelling; NestJS equivalents are noted in
parentheses where they differ.

## 2. Top-level tree

```text
Sidhkofed-Website/
├── prisma/
│   ├── schema.prisma                 # the approved schema (Part 13 of schema doc)
│   ├── migrations/                   # incl. existing metadata_full_text_search
│   └── seed/                         # idempotent seeders (roles, permissions, masters, settings)
├── src/
│   ├── config/                       # env loading + typed config objects
│   ├── modules/                      # one folder per CMS module (vertical slices)
│   ├── shared/                       # cross-module building blocks (envelope, errors, base classes)
│   ├── middleware/                   # Express middleware (auth, RBAC, error, rate-limit, etc.)
│   ├── jobs/                         # background scheduler/queue workers
│   ├── validators/                   # cross-cutting/shared validation schemas & helpers
│   ├── services/                     # cross-cutting infra services (storage, cache, mail, search, audit)
│   ├── utils/                        # pure, dependency-free helpers
│   ├── db/                           # Prisma client singleton + tx helpers
│   ├── routes/                       # route aggregation → /api/v1/{public,admin,auth}
│   ├── app.ts                        # build the HTTP app (no listen)
│   └── server.ts                     # bootstrap + listen + graceful shutdown
├── tests/                            # integration/e2e; unit tests live beside source
├── scripts/                          # one-off ops scripts (non-runtime)
├── .env.example                      # env contract (see doc 05)
├── package.json
├── tsconfig.json
└── docs/                             # (existing) canonical contracts + this foundation
```

## 3. Folder purposes

### `prisma/`
The single database contract. `schema.prisma` is the approved Part 13 schema.
`migrations/` is the only way the DB shape changes (see doc 06). `seed/` holds
**idempotent** seeders that create the three roles, the permission matrix, base
masters (event types, districts/blocks, financial years, etc.), fixed dashboard
report keys, and default settings.

### `src/config/`
Loads and **validates** environment variables once at boot (fail fast on missing/
invalid), exposing typed config objects (`db`, `redis`, `jwt`, `storage`, `mail`,
`uploads`, `app`). No other file reads `process.env` directly.

### `src/modules/` — the heart of the system
One self-contained folder per module (vertical slice). Standard module shape:

```text
src/modules/events/
├── events.routes.ts        # path → controller wiring (public + admin)
├── events.controller.ts    # HTTP in/out only; no business logic   (NestJS: controller)
├── events.service.ts       # business rules: lifecycle, RBAC, visibility, audit  (NestJS: provider)
├── events.repository.ts    # the ONLY place Prisma is called for this module
├── events.validators.ts    # request DTO schemas (create/update/query)  (NestJS: pipes/DTOs)
├── events.dto.ts           # response-shaping types (list summary vs detail)
├── events.mapper.ts        # entity → API response (envelope-ready) mapping
├── events.permissions.ts   # named permission keys for this module
└── events.test.ts          # unit tests (service/mapper), colocated
```

Submodules that share an aggregate root live nested (e.g. `events/news/`,
`events/field-definitions/`, `events/toolkit-distributions/`). The full module list
and build order are in [03-module-dependency-graph.md](03-module-dependency-graph.md).

### `src/shared/`
Reusable primitives every module imports: the response **envelope** builder
(`{success,data/pagination,meta}`), the typed **error** classes mapped to the
`§1.4` codes (`validation_error`, `not_found`, `protected_record`, …), the
**publishing-workflow** helpers (visibility predicate, lifecycle transitions),
pagination/ordering allow-list helpers, base repository/service abstractions, and
the compact reference shapes (media ref, document ref, master ref).

### `src/middleware/`
Express middleware: `requestId`, authentication (Bearer verify), authorization
(permission + ownership/state guard), error handler (envelope formatter), request
validation runner, rate limiter, CORS, security headers, ETag/`no-store` cache
policy, and body/upload guards. (NestJS: guards/interceptors/filters — same roles.)

### `src/jobs/`
Background workers (Redis-backed queue + scheduler). Phase-1 jobs:
scheduled-publishing flip, `event_status` recalculation, highlight-expiry clearing,
YouTube thumbnail extraction, async enquiry-export and dashboard-dataset processing.
Workers call module **services**, never repositories directly.

### `src/validators/`
Cross-cutting validation that is not owned by a single module: shared field rules
(slug, bilingual pair, UUID arrays, http/https URL, date-range ordering, YouTube
URL parsing, file MIME/size), and the reusable `ordering`/`filter` allow-list
schema factory. Module-specific request schemas stay in the module's own
`*.validators.ts`.

### `src/services/`
Cross-cutting **infrastructure** services (distinct from module business services):
`storage` (object storage + signed URLs + checksum), `cache` (Redis get/set/ETag),
`mail` (single enquiry-recipient notification), `search` (parameterized `$queryRaw`
over `search_vector`), `audit` (append-only `audit_logs` writer), `hash` (password +
ip hashing). Module services depend on these.

### `src/utils/`
Pure, side-effect-free helpers with no framework or DB dependency: slugify,
date/time, pagination math, string/number coercion, enum<->label mapping (incl. the
§C reconciliations). Trivially unit-testable.

### `src/db/`
The Prisma client singleton (one instance, pooled) and transaction helpers. Imported
only by repositories and the audit/storage services.

### `src/routes/`
Assembles every module's routes under the three namespaces and mounts the `/api/v1`
prefix. Single place that knows the full URL surface.

### `tests/`, `scripts/`
`tests/` holds integration/e2e specs (real DB or testcontainers) covering the
lifecycle/visibility/RBAC boundaries. `scripts/` holds non-runtime operational
scripts (manual backfills, one-off audits).

## 4. Layering rule (enforced)

```text
routes → controller → validator → service → repository → Prisma
                                     │
                          shared/ services/ utils/  (cross-cutting)
```

- A **controller** never touches Prisma and never embeds business rules.
- A **repository** is the only Prisma caller for its module; it returns entities, not HTTP shapes.
- A **service** owns lifecycle, RBAC, visibility, master-activation, media-usage, and audit obligations.
- **Dependencies point downward only.** Modules never import another module's
  repository — they call the other module's **service** (see doc 03).
