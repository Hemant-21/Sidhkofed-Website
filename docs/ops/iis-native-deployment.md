# SIDHKOFED Native IIS Deployment

This runbook is for the planned non-Docker production topology:

```text
Internet
  |
  v
IIS on App Server
  |-- /api/v1/*     -> Node API on localhost:4010
  |-- /cms/*        -> Admin Next.js app on localhost:3001
  |-- /*            -> Public Next.js app on localhost:3002

App Server
  |-- Node.js services: api, admin, web
  |-- Mounted NFS/SMB path for media storage

Database Server
  |-- PostgreSQL 18

NFS Server
  |-- shared private upload storage
```

The application uses PostgreSQL for durable application data and refresh sessions, and NFS/SMB storage for uploaded files. Redis is not required.

## Servers

| Server | Responsibility | Public exposure |
| --- | --- | --- |
| App server | IIS, Node API, Admin Next.js, Public Next.js | 80/443 only |
| Database server | PostgreSQL 18 | Only app server can reach 5432 |
| NFS server | Uploaded media/documents | Only app server service account can read/write |

## Prerequisites

Install on the app server:

- Node.js 22 LTS or Node.js 20 LTS.
- Git.
- IIS with URL Rewrite and Application Request Routing.
- A service runner such as NSSM, WinSW, or PM2 configured as a Windows service.
- PostgreSQL client tools matching the database major version for backup/restore operations.

Install on the database server:

- PostgreSQL 18.
- A dedicated database and login role for the CMS.
- Nightly backup tooling and WAL/archive policy according to the server backup standard.

Configure on the NFS/storage server:

- A private share for SIDHKOFED uploads.
- A service account with read/write/modify permission.
- Disk monitoring and backup.

## Recommended Paths

Use stable paths that do not depend on a user profile:

```text
C:\Sites\SIDHKOFED\api
C:\Sites\SIDHKOFED\admin
C:\Sites\SIDHKOFED\web
C:\Sites\SIDHKOFED\env
C:\Sites\SIDHKOFED\logs
\\nfs-server\sidhkofed-storage
```

The Node service account must be able to read the app folders, read env files, write logs, and modify the mounted storage share.

## Build Artifacts

Backend API:

```powershell
cd C:\Sites\SIDHKOFED\api
npm.cmd ci --omit=dev
npm.cmd run build
```

Admin CMS:

```powershell
cd C:\Sites\SIDHKOFED\admin
npm.cmd ci
npm.cmd run build
npm.cmd prune --omit=dev
```

Public website:

```powershell
cd C:\Sites\SIDHKOFED\web
npm.cmd ci
npm.cmd run build
npm.cmd prune --omit=dev
```

The Next.js apps use `output: 'standalone'`, so a later packaging step can copy `.next\standalone`, `.next\static`, and `public` into smaller runtime folders. For the first native deployment, running from the full checked-out folders is acceptable and simpler to validate.

## Environment Files

Use the templates committed with this runbook:

```text
deploy\env\api.env.production.example
deploy\env\admin.env.production.example
deploy\env\web.env.production.example
```

Create real files outside git:

```text
C:\Sites\SIDHKOFED\env\api.env
C:\Sites\SIDHKOFED\env\admin.env
C:\Sites\SIDHKOFED\env\web.env
```

Do not use inline comments in actual `.env` values. The backend validates values strictly, and inline comments become part of the value.

## PostgreSQL 18

The Prisma datasource uses `provider = "postgresql"` and a normal PostgreSQL connection string. Prisma's supported database matrix includes PostgreSQL 18, so no schema-provider change is expected.

Example database setup on the PG18 server:

```sql
CREATE ROLE sidhkofed_app LOGIN PASSWORD '<strong-password>';
CREATE DATABASE sidhkofed_cms OWNER sidhkofed_app;
\connect sidhkofed_cms
CREATE EXTENSION IF NOT EXISTS citext;
```

Use least privilege after migrations are stabilized if your DBA policy requires it. For first deployment, the migration role needs permission to create extensions, tables, indexes, enums, and triggers in the target schema.

Run migrations from the app server:

```powershell
cd C:\Sites\SIDHKOFED\api
npm.cmd run prisma:deploy
```

Run the seed once:

```powershell
npm.cmd run db:seed
```

## Redis

Redis is not required for the native IIS production deployment.

The backend now uses:

- PostgreSQL for refresh-token session state.
- In-process fixed-window rate limiting for the single app server.
- In-process TTL caching for public/content response cache.
- In-process scheduler timers instead of BullMQ repeatable jobs.

Do not configure `REDIS_URL` in production.

## NFS Storage

The current local storage driver works with a mounted network share because it reads and writes through the filesystem.

Set:

```env
STORAGE_PROVIDER=local
STORAGE_LOCAL_ROOT=\\nfs-server\sidhkofed-storage
STORAGE_PUBLIC_BASE_URL=https://<domain>/api/v1/public/media
```

The backend stores media metadata in PostgreSQL and stores bytes under `STORAGE_LOCAL_ROOT` using keys such as:

```text
media/2026/<uuid>.<ext>
```

The service account running the API must have:

- Create directory.
- Create file.
- Read file.
- Replace file.
- Delete file where archive/delete workflows require it.

Before go-live, validate from the app server under the same service account:

```powershell
New-Item -ItemType Directory -Force "\\nfs-server\sidhkofed-storage\health"
Set-Content "\\nfs-server\sidhkofed-storage\health\probe.txt" "ok"
Get-Content "\\nfs-server\sidhkofed-storage\health\probe.txt"
Remove-Item "\\nfs-server\sidhkofed-storage\health\probe.txt"
```

## Windows Services

Create three services:

| Service | Working directory | Command | Port |
| --- | --- | --- | --- |
| `SIDHKOFED API` | `C:\Sites\SIDHKOFED\api` | `npm.cmd run start` | 4010 |
| `SIDHKOFED Admin` | `C:\Sites\SIDHKOFED\admin` | `npm.cmd run start` | 3001 |
| `SIDHKOFED Web` | `C:\Sites\SIDHKOFED\web` | `npm.cmd run start` | 3002 |

Configure each service runner manually with its working directory, environment variables, stdout/stderr log paths, restart policy, and service account.

Example manual API test before installing services:

```powershell
cd C:\Sites\SIDHKOFED\api
npm.cmd run start
```

## IIS Reverse Proxy

Install IIS URL Rewrite and enable ARR proxying.

Suggested routing:

| Incoming path | Target |
| --- | --- |
| `/api/v1/ready` | `http://localhost:4010/ready` |
| `/api/v1/{R:1}` | `http://localhost:4010/api/v1/{R:1}` |
| `/cms` | `http://localhost:3001/cms` |
| `/cms/{R:1}` | `http://localhost:3001/cms/{R:1}` |
| `/{R:0}` | `http://localhost:3002/{R:0}` |

Build the admin app with:

```text
NEXT_PUBLIC_BASE_PATH=/cms
```

Keep the API on port 4010 for this IIS/ARR deployment; port 4000 caused proxy timeouts on the target app server.

## Firewall Rules

Open to internet:

- App server TCP 80.
- App server TCP 443.

Allow internally:

- App server to database server TCP 5432.
- App server to NFS/SMB share ports according to the storage platform.

Do not expose:

- Backend port 4010.
- Admin port 3001.
- Web port 3002.
- Database port 5432 to the internet.

## Backups

Database:

- Use PG18-compatible `pg_dump`/`pg_restore`.
- Run nightly logical backups plus the database server's normal physical/WAL backup policy.
- Test restore to a separate database before go-live.

Storage:

- Back up `\\nfs-server\sidhkofed-storage`.
- Keep database backup and storage backup timestamps aligned.
- For a consistent full backup, pause upload traffic or take a storage snapshot at the same time as the database backup.

## First Deployment Checklist

1. PG18 database exists and app role can connect.
2. NFS path is readable/writable by the API service account.
3. Backend env file has production secrets and service URLs.
4. Admin and web env files point at the production backend origin/site URLs.
5. `npm.cmd run prisma:deploy` succeeds against PG18.
6. `npm.cmd run db:seed` succeeds once.
7. API service starts and `/ready` returns 200.
8. Admin service starts and login succeeds.
9. Public website renders and public API pages load.
10. Upload a test image/document and fetch it through `/api/v1/public/media/:id/file`.
11. IIS HTTPS routing works for public site, admin site, and `/api`.

## Rollback

Before every deployment:

1. Take a PG backup.
2. Snapshot or back up the NFS storage path.
3. Keep the previous build folder intact.

Rollback steps:

1. Stop IIS traffic or switch the site to maintenance mode.
2. Stop the three Node services.
3. Restore the previous build folders.
4. Restore database/storage only if the new release changed data in an incompatible way.
5. Start services.
6. Verify `/ready`, admin login, and key public pages.

## Thumbnail System

The thumbnail system is implemented and runs locally in the API process with the open-source `sharp` package. No paid image service is required.

Image uploads generate:

```text
media/{year}/variants/{media-id}-thumb.webp
media/{year}/variants/{media-id}-card.webp
media/{year}/variants/{media-id}-hero.webp
```

For production, keep `STORAGE_PROVIDER=local` and point `STORAGE_LOCAL_ROOT` at the mounted NFS/SMB path. See [thumbnail-system.md](thumbnail-system.md) for the storage layout and backfill command.
