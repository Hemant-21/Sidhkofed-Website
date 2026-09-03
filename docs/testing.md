# Testing

## Unit Tests

```powershell
npm.cmd run test
npm.cmd run test:watch
```

Unit suites are DB-free. Integration suites under `tests/` self-skip unless `RUN_INTEGRATION=1`, so the default run stays green without infrastructure.

## Integration Tests

Integration suites exercise the real Express app and Prisma against a dedicated local PostgreSQL database. Redis is not required.

| | Development | Integration tests |
| --- | --- | --- |
| Database | `sidhkofed_cms` | `sidhkofed_test` |
| Login role | `sidhkofed` / `sidhkofed_dev_password` | `test` / `test` |
| Connection | `.env` `DATABASE_URL` | `vitest.config.ts` test `DATABASE_URL` |

## Native PostgreSQL Setup

Install PostgreSQL locally, make sure `psql` is on `PATH`, then run:

```powershell
npm.cmd run db:setup
```

That command runs:

```powershell
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f scripts/db/00-init-dev-db.sql
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f scripts/db/01-init-test-db.sql
```

If your local PostgreSQL admin user is not `postgres`, run the two `psql` commands manually with your admin login.

## Run Integration Tests

```powershell
$env:RUN_INTEGRATION='1'
npm.cmd run test:integration
```

`test:integration` runs `db:test:setup` first, so the test database is created, migrated, and seeded before the suites run.

## Scripts

| Script | Purpose |
| --- | --- |
| `db:setup` | Create local dev DB/role, then create the test DB/role. |
| `db:seed` | Seed the development database from `.env` `DATABASE_URL`. |
| `db:test:create` | Create the `test` role and `sidhkofed_test` DB. |
| `db:test:migrate` | Run Prisma migrations against `sidhkofed_test`. |
| `db:test:seed` | Seed roles/permissions/masters into `sidhkofed_test`. |
| `db:test:setup` | create -> migrate -> seed. |
| `db:test:reset` | Drop and rebuild `sidhkofed_test`. |
| `test:integration` | Prepare the DB, then run integration suites. |
| `test:integration:only` | Run integration suites without re-preparing the DB. |

## Overriding The Test URL

`scripts/db/with-test-env.ts` injects:

```text
postgresql://test:test@localhost:5432/sidhkofed_test?schema=public
```

Set `TEST_DATABASE_URL` before running the scripts if your local test database uses a different host, port, database, or password. The wrapper refuses to run unless the URL contains `sidhkofed_test`.
