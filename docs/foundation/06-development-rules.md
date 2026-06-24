# 6. Development Rules

> Process guardrails for Phase 1. These protect the frozen contracts and the data
> integrity rules. They are binding for every contributor.

## 1. Migrations

- **Prisma Migrate is the only way the DB shape changes.** Never `prisma db push`
  against a shared/staging/prod database; never hand-edit a generated migration
  after it is applied anywhere.
- Every schema change → `prisma migrate dev --name <verb_noun>` → review the
  generated SQL → commit `schema.prisma` **and** the migration together.
- Migrations are **forward-only** in shared environments. To undo, write a new
  migration. Make them **idempotent and reversible-by-design** where feasible.
- **The metadata `search_vector` migration** (`20260624154500_metadata_full_text_search`)
  is hand-written raw SQL and must be preserved/extended in the same style. Adding a
  searchable surface = add its `search_vector` + GIN index via a new raw-SQL
  migration **and** add the type to the API `content_type` allow-list. Never index
  PDF/file bodies (Phase-1 non-goal).
- **Additive-first:** prefer nullable columns / new tables. Destructive changes
  (drop/rename/retype, FK `onDelete` changes) require an entry in the PR description,
  a data-backfill plan, and a second reviewer. Run against a prod-shaped dump first.
- Seeders are **idempotent** (upsert by natural key) and safe to re-run; they cover
  roles, the permission matrix, base masters, fixed dashboard report keys, settings.
- `onDelete` semantics are part of the contract (Restrict / Cascade / SetNull) — a
  change is a reviewed schema change, not a cleanup.

## 2. API versioning

- The contract is **`/api/v1`** with namespaces `public` / `admin` / `auth` only.
  There is no un-versioned `/api/*` contract (legacy paths, if ever added, are
  redirect/proxy shims, never a second contract).
- **`v1` is immutable for breaking changes.** Allowed without a version bump
  (backward-compatible): adding endpoints, adding **optional** request fields,
  adding response fields, adding filter/ordering allow-list values, adding
  `meta.*`.
- **Breaking** (requires `/api/v2` running in parallel): removing/renaming a field
  or endpoint, changing a type/enum value, making an optional field required,
  changing the envelope, changing an error code mapping, tightening defaults.
- One envelope, everywhere. New error conditions reuse the fixed `error.code` set;
  inventing a new code is a contract change.
- The OpenAPI spec is generated/kept in sync with `docs/api-specification.md`; the
  spec doc wins on any drift.

## 3. Schema changes

- The schema serves the **frozen requirements**, not coding convenience. Before any
  change, re-read the precedence chain (req → schema → api → build-context) and the
  [architecture-validation reconciliations](01-architecture-validation.md#c-naming--enum-reconciliations-resolve-once-here).
- **Never silently** change a canonical field name, enum value, module boundary,
  lifecycle rule, or non-goal. If a change seems needed, it is a decision: record it,
  get sign-off, then update **schema → API spec → affected docs** in the same PR.
- Keep the invariants: UUID PKs; bilingual `*_en`/`*_hi`; publishing-workflow mixin
  on content tables; M2M via junctions; reusable media/documents by reference;
  controlled JSON only for `events.dynamic_values`, dashboard staging, audit
  metadata, report layout. **No module stored as a JSON blob. No ERP/transactional
  tables.**
- New ERP-readiness fields are added later, additive, nullable (`external_ref`-style)
  — never let them mutate CMS lifecycle.
- Any enum/field touched must keep the lower-case enum-value rule and update the
  enum↔label mapping helper.

## 4. Code review

Every PR must satisfy (reviewer checklist):

- **Contract fidelity:** matches the precedence docs; no silent renames; envelope,
  namespaces, filter allow-lists, and error codes respected.
- **Layering:** controller has no business logic/Prisma; repository is the only
  Prisma caller; no cross-module repository access (call the other service).
- **Lifecycle & security boundary:** RBAC permission **and** state/ownership checks;
  public reads apply the visibility predicate; published records can't be
  hard-deleted; `media_usages` written transactionally on link/unlink; audit entry on
  every state change.
- **Validation:** server-side DTO validation; unknown filter/field/ordering rejected
  with `422`; client never sets server-managed fields (`slug`, state, `*_by`,
  `published_at`).
- **Migrations:** schema + migration committed together; destructive changes flagged
  + second reviewer; seeders idempotent.
- **Tests:** unit (service/mapper) + integration cover normal / empty / error /
  permission-boundary; bilingual and pagination paths exercised. CI (lint, type-check,
  tests, `prisma validate`, `migrate diff`) is green.
- **Honesty:** no secrets committed; representative vs official content clearly
  labeled; `docs/progress-log.md` updated for meaningful decisions/handoffs.

**Branching/merge:** feature branch per slice → PR → at least one reviewer (two for
destructive schema/migration changes) → squash on green CI. Do not commit directly to
`main`. Build modules in the [dependency order](03-module-dependency-graph.md); do not
start a tier whose dependencies are unmerged.

## 5. Definition of Done (per build-context §13)

A slice is done when it: matches a documented public purpose and breaches no
non-goal; is responsive/semantic/keyboard-accessible and bilingual where editorial;
has an honest content state; uses stable naming + model/API contracts; respects
publication/visibility/archive rules; validates server-side with abuse protection;
treats media/documents as reusable references; is covered by tests for normal/empty/
error/mobile states; and updates the progress log.
