# Native PostgreSQL Local Setup

Local development no longer uses Docker. Use a normal PostgreSQL installation or a reachable PostgreSQL database server.

## Expected Local Defaults

| Item | Value |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `5432` |
| Development database | `sidhkofed_cms` |
| Development login | `sidhkofed` |
| Development password | `sidhkofed_dev_password` |
| Test database | `sidhkofed_test` |
| Test login | `test` |
| Test password | `test` |

## Create Databases

From the backend project root:

```powershell
cd "D:\SIDHKOFED Website and CMS\Sidhkofed-Website"
npm.cmd run db:setup
```

This uses native `psql`, not Docker. If your PostgreSQL admin login is not `postgres`, run the SQL files manually with your admin user:

```powershell
psql -U <admin-user> -d postgres -v ON_ERROR_STOP=1 -f scripts/db/00-init-dev-db.sql
psql -U <admin-user> -d postgres -v ON_ERROR_STOP=1 -f scripts/db/01-init-test-db.sql
```

## Apply Migrations And Seed

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:deploy
npm.cmd run db:seed
```

## Start The API

```powershell
npm.cmd run dev
```

The local `.env` points to:

```text
postgresql://sidhkofed:sidhkofed_dev_password@127.0.0.1:5432/sidhkofed_cms?schema=public
```

Change `.env` if your native PostgreSQL host, port, database, or password differs.
