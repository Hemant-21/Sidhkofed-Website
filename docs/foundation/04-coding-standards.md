# 4. Coding Standards & Conventions

> Binding conventions for Phase 1. They encode the frozen contracts; they do not
> introduce new product behavior. TypeScript `strict` is mandatory.

## 1. Naming conventions

| Surface | Case | Example |
|---|---|---|
| DB tables / columns | `snake_case` | `event_field_definitions`, `publication_state` |
| Prisma model names | `PascalCase` (+ `@@map`) | `EventFieldDefinition` → `@@map("event_field_definitions")` |
| Prisma field names | `camelCase` (+ `@map`) | `eventTypeId @map("event_type_id")` |
| TS variables/functions | `camelCase` | `buildVisibilityFilter()` |
| TS classes/types/interfaces | `PascalCase` | `EventService`, `CreateEventDto` |
| Constants / enums values in code | `UPPER_SNAKE` for consts; enum **members lower-case** | `MAX_PAGE_SIZE`; `PublicationState.published` |
| API JSON fields | `snake_case` | `start_date`, `cover_media_id` |
| API URL path segments | `kebab-case` | `/admin/official-communications` |
| Query params / filters | `snake_case` | `?event_type=training&show_on_homepage=true` |
| Files | `kebab-case` + role suffix | `events.controller.ts`, `events.repository.ts` |
| Permission keys | `module.action` (lower) | `events.publish`, `documents.archive` |
| Enum values (DB/JSON/filter) | lower-case `snake_case` | `district_union`, `multi_day` (see §C reconciliations) |

**Hard rule:** never rename a canonical CMS field, enum value, module boundary, or
lifecycle term for code convenience. The `@map`/`@@map` layer is the *only* bridge
between `camelCase` (TS) and `snake_case` (DB/API).

## 2. DTO conventions

Three DTO kinds per module, never mixed:

- **Request DTOs** (`Create*Dto`, `Update*Dto`, `*QueryDto`) — validated input only.
  - Accept **only** model-backed fields + related-ID arrays + allowed workflow fields
    (`public_visibility`, `publish_start_at`, `highlight_type`, highlight dates,
    `display_order`, `show_on_homepage`).
  - **Never** accept `publication_state`, `created_by`, `updated_by`, `slug`,
    `published_at`, or audit fields from the client (server-set). Reject unknown keys.
  - `Create` requires the spec's required fields; `Update` is partial (`PATCH`).
- **Response DTOs** — two shapes: **list summary** (lightweight, no dynamic/relation
  bodies) and **detail** (full bilingual content + linked masters/relations).
  Mappers (`*.mapper.ts`) convert entities → response DTOs; controllers return only DTOs.
- **Reference DTOs** — shared compact shapes (`MediaRef`, `DocumentRef`, `MasterRef`)
  from `src/shared/`. Reuse them; do not re-declare per module.

DTOs carry **bilingual pairs** as `*_en` (required where the field is required) +
`*_hi` (always optional). Public responses never include internal notes, audit
fields, storage keys, or unpublished links.

## 3. Prisma conventions

- One Prisma client singleton (`src/db`); **never** instantiate per request.
- Every model maps to snake_case via `@@map`/`@map` (already done in the schema).
- All PKs `uuid`; all FKs explicit `@db.Uuid`. Money/quantities `Decimal`, not float.
- **`onDelete` is intentional, do not "fix" it:** masters & linked content use
  `Restrict` (protect references), junction children use `Cascade`, optional refs use
  `SetNull`. Changing one is a schema change (doc 06).
- Multi-write operations (create-with-junctions, file replace, dataset processing,
  bulk upload) run in `prisma.$transaction`.
- **No raw SQL except** the metadata `search_vector` queries, which use parameterized
  `$queryRaw` only. `search_vector` columns stay out of the Prisma models.
- Select **explicit columns** for list endpoints (summary only); never `SELECT *` on
  wide bilingual tables. Use the partial/public indexes from schema Part 11.
- Schema edits go only through `prisma migrate` (doc 06) — never `db push` against a shared DB.

## 4. Controller conventions

- HTTP-only: parse request → call validator → call **service** → return enveloped DTO.
- **No business logic, no Prisma, no cross-module data access** in controllers.
- Always return through the shared envelope builder. Status codes follow §1.4:
  `201` create (+ `Location`), `200` read/patch/action, `204` logout, `202` async export.
- Throw typed errors (§5) and let the error middleware format them; never hand-craft error JSON.
- Controllers are thin enough to be generated from the API paths (per API spec §9).

## 5. Service conventions

Services own everything the controller doesn't:

- **Lifecycle:** publish/unpublish/archive/restore transitions; set `published_at` on
  first publish only; enforce "published records never hard-deleted" and the
  draft-only/unlinked delete rule.
- **RBAC + ownership/state:** check the named permission **and** state constraints
  (e.g. a Content Editor cannot edit a published record into a draft via PATCH).
- **Visibility:** apply the public predicate (`published && public_visibility &&
  !archived && publish_start_at due`) on every public read.
- **Master activation:** reject inactive-master references on create/update.
- **Media usage:** write/remove `media_usages` transactionally on every link/unlink.
- **Audit:** record every state-changing action via `audit.service`.
- **Domain rules:** dynamic-field validation, derived `event_status`, ≤3 homepage
  videos, toolkit `total_quantity` auto-calc, knowledge-centre tag requirement, etc.
- Throw typed errors; never return HTTP shapes. Services are unit-tested.

## 6. Repository conventions

- The **only** Prisma caller for its module. Returns entities/aggregates, not DTOs.
- Encapsulates the visibility filter as a reusable `where` builder; public vs admin
  queries differ only by that filter.
- Applies the **ordering/filter allow-list** (reject unknown → `422`); never passes
  arbitrary client fields into Prisma `where`/`orderBy`.
- Enforces pagination (`page`, `page_size≤100`); invalid page → empty list, not error.
- No cross-module reads: needs another aggregate → call that module's service.

## 7. API response conventions

Exactly one envelope, everywhere (public/admin/auth):

```jsonc
// single
{"success": true, "data": { /* ... */ }, "meta": {"request_id": "req_..."}}
// list
{"success": true, "data": [ /* ... */ ], "pagination": {"page":1,"page_size":20,"total_items":0,"total_pages":0}, "meta": {"request_id":"req_..."}}
// error
{"success": false, "error": {"code":"validation_error","message":"Validation failed.","fields":{"title_en":["This field is required."]}}, "meta": {"request_id":"req_..."}}
```

Rules:
- `success` = `true` for 2xx, `false` for 4xx/5xx. On success `error` absent; on
  failure `data`/`pagination` absent. `error.fields` only on `validation_error`.
- Error `code` ∈ `{validation_error, authentication_required, permission_denied,
  not_found, conflict, protected_record, rate_limited, unsupported_file_type}` →
  HTTP `{422, 401, 403, 404, 409, 409, 429, 415}` / `400` malformed.
- Every response carries `meta.request_id`; mutations may add `meta.message`.
- Caching: public GET = ETag/`If-None-Match`; admin + enquiry = `no-store`.
- Lists = summary DTO only; details = full DTO. Compact refs for media/documents/masters.
- Dates `YYYY-MM-DD`; timestamps ISO-8601 UTC; IDs UUID.

## 8. General

- Lint + format (ESLint + Prettier) enforced in CI; `strict` TS, no implicit `any`.
- No secrets in code — only via `src/config` (doc 05). No `console.log` in request
  paths; use the structured logger.
- Tests colocated for units (`*.test.ts`), integration in `tests/`; cover normal,
  empty, error, and permission-boundary cases (build-context Definition of Done).
