# App Server Prep

This checklist prepares only the SIDHKOFED app server. It assumes PostgreSQL 18 will live on a separate database server and uploaded files will live on a separate NFS/SMB storage server.

No Docker, no Redis, and no paid services are required.

## Target Services

| App | Runtime path | Internal port | Start command |
| --- | --- | ---: | --- |
| Backend API | `C:\Sites\SIDHKOFED\api` | 4010 | `npm.cmd run start` |
| Admin CMS | `C:\Sites\SIDHKOFED\admin` | 3001 | `npm.cmd run start` |
| Public website | `C:\Sites\SIDHKOFED\web` | 3002 | `npm.cmd run start` |

Only IIS should be public on ports 80 and 443. The Node ports must stay bound to localhost or blocked from public access.

## Install On App Server

Install these manually:

- Windows Server with IIS.
- Node.js 22 LTS or Node.js 20 LTS.
- Git.
- IIS URL Rewrite.
- IIS Application Request Routing.
- PostgreSQL client tools matching the database server major version.
- A Windows service runner such as NSSM, WinSW, or PM2 configured as a Windows service.

Use `npm.cmd`, not `npm`, when configuring commands from PowerShell-based tooling. This avoids the Windows execution-policy issue caused by `npm.ps1`.

## IIS Features

Enable:

- Web Server.
- Static Content.
- Default Document.
- HTTP Errors.
- Request Filtering.
- URL Rewrite.
- Application Request Routing proxy support.
- IIS Management Console.

In IIS Application Request Routing, enable proxying.

## Folder Layout

Create stable folders outside any user profile:

```text
C:\Sites\SIDHKOFED\api
C:\Sites\SIDHKOFED\admin
C:\Sites\SIDHKOFED\web
C:\Sites\SIDHKOFED\env
C:\Sites\SIDHKOFED\logs
```

Recommended env file locations:

```text
C:\Sites\SIDHKOFED\env\api.env
C:\Sites\SIDHKOFED\env\admin.env
C:\Sites\SIDHKOFED\env\web.env
```

Copy values from:

```text
deploy\env\api.env.production.example
deploy\env\admin.env.production.example
deploy\env\web.env.production.example
```

Do not put inline comments after values in real env files.

## Service Account

Create or choose one Windows service account for the Node services.

Grant it:

- Read/execute on `C:\Sites\SIDHKOFED\api`.
- Read/execute on `C:\Sites\SIDHKOFED\admin`.
- Read/execute on `C:\Sites\SIDHKOFED\web`.
- Read on `C:\Sites\SIDHKOFED\env`.
- Modify/write on `C:\Sites\SIDHKOFED\logs`.
- Modify/read/write on the mounted NFS/SMB media storage path.
- Network access to the PostgreSQL server on TCP 5432.

## Backend API Env

Key app-server values in `C:\Sites\SIDHKOFED\env\api.env`:

```env
NODE_ENV=production
APP_PORT=4010
API_BASE_PATH=/api/v1
PUBLIC_WEBSITE_URL=https://www.example.gov.in

DATABASE_URL=postgresql://sidhkofed_app:<password>@<db-server>:5432/sidhkofed_cms?schema=public
DIRECT_URL=postgresql://sidhkofed_app:<password>@<db-server>:5432/sidhkofed_cms?schema=public

STORAGE_PROVIDER=local
STORAGE_LOCAL_ROOT=\\nfs-server\sidhkofed-storage
STORAGE_PUBLIC_BASE_URL=https://www.example.gov.in/api/v1/public/media

SCHEDULER_ENABLED=true
RATE_LIMIT_ENABLED=true
```

Keep these private and strong:

```env
JWT_SECRET=
SEED_SUPERADMIN_PASSWORD=
IP_HASH_SALT=
```

Do not configure `REDIS_URL`.

## Frontend Env

Admin CMS, `C:\Sites\SIDHKOFED\env\admin.env`:

```env
NODE_ENV=production
PORT=3001
BACKEND_ORIGIN=http://localhost:4010
NEXT_PUBLIC_API_BASE_URL=/api/v1
NEXT_PUBLIC_BASE_PATH=/cms
NEXT_PUBLIC_WEBSITE_URL=https://www.example.gov.in
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

Public website, `C:\Sites\SIDHKOFED\env\web.env`:

```env
NODE_ENV=production
PORT=3002
BACKEND_ORIGIN=http://localhost:4010
NEXT_PUBLIC_API_BASE_URL=/api/v1
NEXT_PUBLIC_SITE_URL=https://www.example.gov.in
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

## Build On App Server

Backend:

```powershell
cd C:\Sites\SIDHKOFED\api
npm.cmd ci
npm.cmd run prisma:generate
npm.cmd run build
```

Admin CMS:

```powershell
cd C:\Sites\SIDHKOFED\admin
npm.cmd ci
npm.cmd run build
```

Public website:

```powershell
cd C:\Sites\SIDHKOFED\web
npm.cmd ci
npm.cmd run build
```

After build, production services can run with `npm.cmd run start`.

## Windows Services

Create three Windows services with your chosen service runner.

For each service configure:

- Working directory.
- Command: `npm.cmd`.
- Arguments: `run start`.
- Environment file or equivalent environment variables.
- Run-as account: the service account above.
- Stdout/stderr log paths under `C:\Sites\SIDHKOFED\logs`.
- Restart on failure.
- Start automatically after boot.

Expected service targets:

| Service name | Working directory | Port |
| --- | --- | ---: |
| `SIDHKOFED API` | `C:\Sites\SIDHKOFED\api` | 4010 |
| `SIDHKOFED Admin` | `C:\Sites\SIDHKOFED\admin` | 3001 |
| `SIDHKOFED Web` | `C:\Sites\SIDHKOFED\web` | 3002 |

## IIS Routing

Single-domain deployment:

```text
www.example.gov.in             -> http://localhost:3002
www.example.gov.in/cms         -> http://localhost:3001/cms
www.example.gov.in/cms/*       -> http://localhost:3001/cms/*
www.example.gov.in/api/v1/*    -> http://localhost:4010/api/v1/*
```

The Admin CMS must be built with `NEXT_PUBLIC_BASE_PATH=/cms`.

## Firewall

Allow inbound from internet:

- TCP 80 to IIS.
- TCP 443 to IIS.

Block inbound from internet:

- TCP 4010.
- TCP 3001.
- TCP 3002.
- TCP 5432.

Allow outbound/internal:

- App server to database server TCP 5432.
- App server to NFS/SMB server ports required by the storage platform.

## App Server Validation

Run these from the app server.

Check Node:

```powershell
node --version
npm.cmd --version
```

Check API build:

```powershell
cd C:\Sites\SIDHKOFED\api
npm.cmd run typecheck
npm.cmd run build
```

Check frontend builds:

```powershell
cd C:\Sites\SIDHKOFED\admin
npm.cmd run build

cd C:\Sites\SIDHKOFED\web
npm.cmd run build
```

After the database and storage servers are ready:

```powershell
cd C:\Sites\SIDHKOFED\api
npm.cmd run prisma:deploy
npm.cmd run db:seed
npm.cmd run smoke
```

Then verify:

- API `/ready` returns 200.
- CMS login succeeds.
- Public website loads.
- Test image upload succeeds from CMS.
- Thumbnail files are created under the NFS/SMB storage path.
- Public website can display media only after the linked content is published and visible.

## Source References

| Area | Source |
| --- | --- |
| Full native IIS runbook | `docs/ops/iis-native-deployment.md` |
| Manual env/file reference | `docs/ops/manual-production-reference.md` |
| Backend env template | `deploy/env/api.env.production.example` |
| Admin env template | `deploy/env/admin.env.production.example` |
| Website env template | `deploy/env/web.env.production.example` |
| Thumbnail storage guide | `docs/ops/thumbnail-system.md` |
