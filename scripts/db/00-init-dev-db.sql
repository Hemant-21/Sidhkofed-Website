-- Native local development database bootstrap.
--
-- Run from the project root with:
--   psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f scripts/db/00-init-dev-db.sql
--
-- This is intentionally plain PostgreSQL/psql. It does not require Docker.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sidhkofed') THEN
    CREATE ROLE sidhkofed WITH LOGIN PASSWORD 'sidhkofed_dev_password';
  ELSE
    ALTER ROLE sidhkofed WITH LOGIN PASSWORD 'sidhkofed_dev_password';
  END IF;
END
$$;

SELECT 'CREATE DATABASE sidhkofed_cms OWNER sidhkofed'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sidhkofed_cms')\gexec

\connect sidhkofed_cms
CREATE EXTENSION IF NOT EXISTS citext;
GRANT ALL ON SCHEMA public TO sidhkofed;
ALTER SCHEMA public OWNER TO sidhkofed;
