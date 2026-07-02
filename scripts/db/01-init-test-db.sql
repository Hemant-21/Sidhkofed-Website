-- Dedicated integration-test database + role (idempotent — safe to run repeatedly).
--
-- WHY: integration tests MUST NOT run against the development database (sidhkofed_cms) or any
-- shared/remote DB. They use a throwaway `sidhkofed_test` database whose connection string is
-- pinned in vitest.config.ts: `postgresql://test:test@localhost:5432/sidhkofed_test`.
--
-- WHEN IT RUNS:
--   * automatically on a FRESH Docker volume — it is mounted into
--     /docker-entrypoint-initdb.d/ by docker-compose.yml and executed once at first init;
--   * on an EXISTING volume — re-run on demand via `npm run db:test:create`, which streams this
--     same file into the container's psql over stdin (no volume recreation required).
--
-- The development database (sidhkofed_cms) is created by POSTGRES_DB and is NEVER touched here.
-- Runs as the superuser (POSTGRES_USER=sidhkofed) so it can create the role, the database, and
-- (re)assign the public-schema ownership the test role needs to run migrations (PG15+ locks the
-- public schema down by default).

-- 1) The least-privilege test login role (matches vitest.config.ts credentials).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'test') THEN
    CREATE ROLE test WITH LOGIN PASSWORD 'test' CREATEDB;
  END IF;
END
$$;

-- 2) The test database, owned by the test role. CREATE DATABASE cannot run inside a transaction
--    or a DO block, so generate-and-execute it only when missing (idempotent).
SELECT 'CREATE DATABASE sidhkofed_test OWNER test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sidhkofed_test')\gexec

-- 3) Ensure the test role can create tables in the new database's public schema.
\connect sidhkofed_test
GRANT ALL ON SCHEMA public TO test;
ALTER SCHEMA public OWNER TO test;
