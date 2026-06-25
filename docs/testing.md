# Testing

## Unit tests (default — no database)

```bash
npm test            # vitest run — all unit suites (src/**/*.test.ts) + skipped integration suites
npm run test:watch  # watch mode
```

Unit suites are pure and DB-free (mappers, validators, `buildWhere`, status/dynamic-field engines).
The integration suites under `tests/` self-skip unless `RUN_INTEGRATION=1`, so the default run stays
green without any infrastructure.

## Integration tests (HTTP + Prisma + Redis against a dedicated test database)

Integration suites (`tests/*.integration.test.ts`) exercise the real Express app, Prisma, and Redis.
They run against a **dedicated, throwaway** database — never the development database and never a
remote/shared one.

| | Development | Integration tests |
|---|---|---|
| Database | `sidhkofed_cms` | `sidhkofed_test` |
| Login role | `sidhkofed` (superuser) | `test` / `test` |
| Connection | `.env` `DATABASE_URL` | pinned in `vitest.config.ts` → `postgresql://test:test@localhost:5432/sidhkofed_test` |

### One command

```bash
npm run db:up                              # start Postgres + Redis (once)
RUN_INTEGRATION=1 npm run test:integration # create+migrate+seed the test DB, then run the suites
```

`test:integration` runs `db:test:setup` first, so the test database is created, migrated, and seeded
automatically — **no manual database edits required**. Without `RUN_INTEGRATION=1` the suites skip
(but the DB is still prepared).

### How the test database is created

- **Fresh Docker volume:** `scripts/db/01-init-test-db.sql` is mounted into
  `/docker-entrypoint-initdb.d/` (see `docker-compose.yml`) and the Postgres entrypoint runs it once
  at first init — creating the `test` role and the `sidhkofed_test` database with the correct
  public-schema ownership.
- **Existing volume:** `npm run db:test:create` streams the same script into the running container's
  `psql` over stdin (idempotent — safe to re-run), so you do **not** need to recreate the volume.

### Migrations & seed isolation

`scripts/db/with-test-env.ts` injects `DATABASE_URL`/`DIRECT_URL` for `sidhkofed_test` into the
Prisma CLI child process. Because `src/config` and Prisma load `.env` with dotenv — which never
overrides an already-set variable — the injected test URL wins while every other variable (JWT
secret, seed super-admin, storage URL, …) still comes from `.env`. The wrapper refuses to run unless
the target URL is a `*_test` database, so a misconfiguration can't point migrations at dev/prod.

### Scripts

| Script | Purpose |
|---|---|
| `db:test:create` | Create the `test` role + `sidhkofed_test` DB (idempotent). |
| `db:test:migrate` | `prisma migrate deploy` against `sidhkofed_test`. |
| `db:test:seed` | Seed roles/permissions/masters into `sidhkofed_test`. |
| `db:test:setup` | create → migrate → seed (run by `test:integration`). |
| `db:test:reset` | Drop and rebuild `sidhkofed_test` from scratch. |
| `test:integration` | `db:test:setup` then run the suites. |
| `test:integration:only` | Run the suites without re-preparing the DB. |

### Overriding the connection

If your local Postgres differs, set `TEST_DATABASE_URL` (and keep `vitest.config.ts` in sync) and the
matching `TEST_DB_*`/admin credentials used by `db:test:create`. The default credentials match
`docker-compose.yml` (`sidhkofed` superuser) and `vitest.config.ts` (`test` login role).
