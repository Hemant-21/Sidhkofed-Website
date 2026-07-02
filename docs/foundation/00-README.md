# SIDHKOFED CMS — Project Foundation (Phase 1 Readiness)

> **Author:** Lead Software Architect
> **Status:** Foundation / pre-development. **No feature code is produced here.**
> **Goal:** Make the project ready to begin Phase 1 implementation with finalized
> structure, conventions, dependency order, and development rules.

## Source-of-truth precedence (unchanged)

This foundation does **not** redesign anything. It only operationalizes the frozen
contracts. On any conflict, higher wins:

1. `docs/sidhkofed-cms-codex-context.md` — CMS Requirements (scope/behavior)
2. `docs/database-schema-design.md` — Prisma schema, entities, enums, relations
3. `docs/api-specification.md` — single REST API contract (v1)
4. `docs/claude-master-build-context.md` — product/build guardrails

Supporting (non-canonical): `cms-integration-conventions.md`, `codex-infra-handover.md`.

## Deliverables in this folder

| # | Document | Purpose |
|---|---|---|
| 1 | [01-architecture-validation.md](01-architecture-validation.md) | Schema↔API↔build-context consistency report + reconciliation decisions |
| 2 | [02-backend-folder-structure.md](02-backend-folder-structure.md) | Production-ready backend layout, every folder described |
| 3 | [03-module-dependency-graph.md](03-module-dependency-graph.md) | Core vs dependent modules + build/dependency order |
| 4 | [04-coding-standards.md](04-coding-standards.md) | Naming, DTO, Prisma, controller, service, repository, response conventions |
| 5 | [05-environment-variables.md](05-environment-variables.md) | `.env.example` reference and variable contract |
| 6 | [06-development-rules.md](06-development-rules.md) | Migrations, API versioning, schema changes, code review |

The companion file `../../.env.example` is the machine-usable env template.

## Locked technical baseline (derived from frozen docs, not invented)

- **Runtime/language:** Node.js (LTS) + TypeScript (strict).
- **ORM/DB:** Prisma + PostgreSQL (schema doc is Prisma; FTS migration already checked in).
- **API style:** REST, base `/api/v1`, namespaces `public` / `admin` / `auth`, single envelope.
- **Cache/queue:** Redis (master/home cache, sessions/refresh, background jobs).
- **Storage:** private object storage for media/documents; DB stores metadata only.
- **Architecture:** modular monolith, layered per module (routes → controller → validator → service → repository).

> The HTTP framework (Express vs NestJS) is the one remaining open choice; see
> [02-backend-folder-structure.md](02-backend-folder-structure.md) §1. The layout
> below is framework-neutral and works for either with no structural change.

## Acceptance status

- [x] Architecture validated (schema ↔ API ↔ build-context)
- [x] Development structure finalized
- [x] Conventions finalized
- [x] Dependency graph finalized
- [x] Ready to begin Phase 1
