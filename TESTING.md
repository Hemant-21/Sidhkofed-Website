# SIDHKOFED CMS — Testing Guide

## Overview

This document describes the testing strategy, test layout, how to run tests,
and the CI/CD setup for the SIDHKOFED CMS project (backend + admin CMS + public website).

---

## Workspaces

| Workspace | Directory | Runner | Config |
|---|---|---|---|
| Backend API | `/` (root) | Vitest | `vitest.config.ts` |
| Admin CMS (React) | `admin/` | Vitest + jsdom | `admin/vitest.config.ts` |
| Public Website (Next.js) | `web/` | Vitest + jsdom | `web/vitest.config.ts` |

---

## Quick Start

```bash
# Backend unit + scheduler + shared tests (fast — no DB/Redis needed)
npm test

# Backend with coverage report
npm run test:coverage

# Admin CMS tests
cd admin && npm test

# Public website tests
cd web && npm test

# Backend integration tests (requires running Postgres + Redis)
npm run test:integration

# All backend tests (unit + integration) in one pass
RUN_INTEGRATION=1 npm run test:integration
```

---

## Backend Tests

### Unit tests (`src/**/*.test.ts`)

Run in-process with no external dependencies. All Prisma clients, Redis, email
and storage providers are mocked. The `@/` alias resolves to `src/`.

```bash
npx vitest run                    # single run
npx vitest                        # watch mode
npx vitest run --coverage         # with coverage report (output: ./coverage/)
```

Required environment variables are injected automatically by `vitest.config.ts`
(`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, …) — you do **not** need a `.env`
file for unit tests.

### Integration tests (`tests/**/*.test.ts`)

Hit a real PostgreSQL database and Redis. Each suite:
1. Creates a disposable user (e.g. `it-admin-<timestamp>@sidhkofed.test`).
2. Runs HTTP requests against the full Express app via `supertest`.
3. Cleans up its own records in `afterAll`.

```bash
# Prerequisites
npm run db:up                          # start Docker postgres + redis
npm run db:test:setup                  # create test DB, run migrations, seed

# Run integration tests
RUN_INTEGRATION=1 npm run test:integration:only
```

All suites guard themselves with `describe.skipIf(!RUN)` — if `RUN_INTEGRATION`
is not set they are silently skipped in the standard `npm test` run.

---

## Coverage

Coverage is measured with `@vitest/coverage-v8`. The report is written to `./coverage/`.

```bash
npm run test:coverage
# or
npx vitest run --coverage
```

Thresholds (configured in `vitest.config.ts`):

| Metric | Threshold |
|---|---|
| Statements | 75 % |
| Branches | 70 % |
| Functions | 75 % |
| Lines | 75 % |

Open `coverage/index.html` in a browser for the full interactive report.

---

## Test Layout

```
src/
├── app.security.test.ts          # Security header regression (Phase 17.1)
├── app.envelope.test.ts          # API envelope contract (success/error shapes)
├── modules/
│   ├── auth/
│   │   ├── auth.service.test.ts       # Login/logout/refresh business rules
│   │   ├── auth.permissions.test.ts   # RBAC catalog correctness
│   │   ├── permission.service.test.ts # hasAnyRole / hasAllPermissions
│   │   └── token.service.test.ts      # JWT issue/verify/rotate/revoke
│   ├── enquiries/
│   │   ├── enquiries.test.ts              # buildWhere + query parsers
│   │   ├── enquiries.validators.test.ts   # Zod schema: submit + admin patch
│   │   ├── enquiries.dto.test.ts          # All 4 DTO mapper functions
│   │   ├── enquiries.service.test.ts      # Service: submit, list, patch, archive, export
│   │   └── enquiries.rbac.test.ts         # Role guard: publisher allowed, editor denied
│   ├── dashboard/
│   │   ├── dashboard.rbac.test.ts         # dashboard.* permission catalog
│   │   ├── dashboard.repository.test.ts   # buildReportWhere (public/admin predicates)
│   │   └── ...                            # metrics, reports, datasets, public service
│   ├── events/ …                  # buildWhere, status, validators, dynamic fields
│   ├── search/ …                  # repository, service, dto, validators
│   ├── galleries/ …               # service, public service
│   ├── videos/ …                  # YouTube URL parser, video/public service
│   └── …                          # All other modules
├── services/
│   ├── captcha.test.ts            # none/recaptcha/turnstile provider paths
│   └── email.test.ts              # disabled/no-recipient/no-host guard paths
├── utils/
│   └── xlsx-writer.test.ts        # Valid XLSX output, escaping, column letters
├── shared/
│   ├── content-guard.test.ts      # assertEditableByActor
│   ├── pagination.test.ts         # resolvePageParams + buildPagination
│   ├── publishing.test.ts         # canPublish / assertPublishable
│   └── visibility.test.ts         # public visibility predicate
├── middleware/
│   ├── auth-middleware.test.ts    # authenticate / authorize / authorizePermissions
│   └── validate-params.test.ts   # uuidParam / requireUuidParams
└── jobs/scheduler/                # All scheduler jobs + lock + runner

tests/                             # Integration suites (RUN_INTEGRATION=1)
├── auth.integration.test.ts
├── documents.integration.test.ts
├── events.integration.test.ts
├── enquiries.integration.test.ts  # Public submit + admin CRUD + export (Phase 17.3)
└── … (all other module integration suites)
```

---

## Mocking Strategy

| What | Approach |
|---|---|
| Prisma (DB) | `vi.mock('./module.repository', () => ({ repo: { … } }))` — mock at the repository boundary |
| Redis / cache | `vi.mock('@/services/cache', ...)` or `vi.mock('@/services/redis', ...)` |
| External email SMTP | `vi.mock('@/services/email', ...)` in service tests; real `sendViaSMTP` guarded by `smtp.host` in unit tests |
| External CAPTCHA API | `vi.stubGlobal('fetch', fakeFetch)` — intercept at the global fetch boundary |
| External object storage | `vi.mock('@/services/storage', ...)` |
| Audit service | `vi.mock('@/modules/audit/audit.service', ...)` — fail-open; never breaks assertions |
| Config | `vi.mock('@/config', async (importOriginal) => { const actual = await importOriginal(); return { ...actual, targetConfig: override }; })` |

**Never mock**:
- Zod validators (pure functions — test them directly)
- DTO mappers (pure functions)
- Business rules in services (test them via mocked repos, not further mocked)
- Scheduler logic (real logic, mocked I/O)

---

## Test Fixtures

Common fixture helpers live inside each test file (local scope). Shared state
between tests uses `beforeEach` → `vi.clearAllMocks()` to prevent bleed.

Integration tests seed their own records with timestamped emails
(`it-admin-<Date.now()>@sidhkofed.test`) and clean up in `afterAll`.

---

## Admin CMS Frontend Tests

```bash
cd admin
npm test          # vitest + jsdom, React Testing Library
```

Test layout in `admin/src/`:
- `components/` — UI component unit tests (Button, Dropdown, RelationPicker, Can)
- `features/` — Feature-specific form payload tests, lifecycle action component tests
- `hooks/` — `useCrudList`, `useBulkAction`
- `lib/api/` — Error handling, server error parsing
- `utils/` — CSV, pagination, permission helpers

---

## Public Website Tests

```bash
cd web
npm test
```

Test layout in `web/src/`:
- `components/ui/` — Badge, ExternalLink
- `components/details/` — MembershipTable
- `lib/` — SEO metadata
- `utils/` — Bilingual field selection, date/number formatting

---

## CI Compatibility

All unit tests (`npm test` from the repo root, `npm test` in `admin/`, `npm test` in `web/`)
require **no external services** and are safe to run in any CI environment.

Integration tests require Postgres + Redis and are gated by `RUN_INTEGRATION=1`. They are
intended to run in a CI stage that provisions the database (e.g., via Docker services in
GitHub Actions / GitLab CI).

Example GitHub Actions step:

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: sidhkofed
      POSTGRES_PASSWORD: sidhkofed
      POSTGRES_DB: sidhkofed
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
  redis:
    image: redis:7
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 20
  - run: npm ci
  - run: npm test                   # unit tests — no services needed
  - run: npm run db:test:setup
    env:
      DATABASE_URL: postgresql://sidhkofed:sidhkofed@localhost:5432/sidhkofed?schema=public
  - run: npm run test:integration:only
    env:
      RUN_INTEGRATION: "1"
      DATABASE_URL: postgresql://sidhkofed:sidhkofed@localhost:5432/sidhkofed_test?schema=public
      REDIS_URL: redis://localhost:6379
      JWT_SECRET: ci-jwt-secret-at-least-32-characters-long
```

---

## Adding New Tests

1. **Unit test for a new module**: create `src/modules/<name>/<name>.service.test.ts`.
   - Mock repositories and external services with `vi.hoisted()` + `vi.mock()`.
   - Use `beforeEach(() => vi.clearAllMocks())`.
   - Name tests as `describe('service.method', () => { it('does X when Y', …) })`.

2. **Integration test for a new module**: create `tests/<name>.integration.test.ts`.
   - Guard with `describe.skipIf(!RUN)('...', ...)`.
   - Seed unique records in `beforeAll`, clean up in `afterAll`.

3. **Validator test**: test the Zod schema directly — no mocks needed.

4. **DTO test**: test the mapper function with a hardcoded fixture row — no mocks needed.

---

## Phase 17.3 Coverage Summary

Tests added in Phase 17.3:

| File | Tests Added | Description |
|---|---|---|
| `src/modules/enquiries/enquiries.service.test.ts` | 22 | Service: submit, dedup, CAPTCHA, email fail-open, list, getById, patch (idempotent), archive, exportRows |
| `src/modules/enquiries/enquiries.dto.test.ts` | 14 | All 4 DTO mappers: summary, detail, submit, export |
| `src/modules/enquiries/enquiries.rbac.test.ts` | 6 | Permission constants; role guard: publisher allowed, editor denied |
| `src/utils/xlsx-writer.test.ts` | 11 | Valid XLSX ZIP, required entries, escaping, column letters, shared strings dedup |
| `src/services/captcha.test.ts` | 8 | none provider (no-op), missing token, whitespace token, success/failure response, network error |
| `src/services/email.test.ts` | 4 | EMAIL_ENABLED=false, missing recipient, missing host, SMTP re-throw |
| `src/app.envelope.test.ts` | 7 | 200/401/404/422 canonical envelope shapes; no data on errors |
| `tests/enquiries.integration.test.ts` | 11 | Full HTTP flow: public submit, RBAC, list, detail, patch, archive idempotency, XLSX export |

**Total tests before Phase 17.3**: 785 passing  
**Total tests after Phase 17.3**: 859 passing (+ 74 new)  
**Integration test files**: 14 → 15 (enquiries added)
