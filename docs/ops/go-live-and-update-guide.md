# SIDHKOFED Go-Live And Update Guide

This guide is for the native Windows Server deployment:

```text
Public URL  -> IIS on app server
/api/v1/*   -> Node API on localhost:4010
/cms/*      -> Admin CMS on localhost:3001
/*          -> Public website on localhost:3002
Database    -> PostgreSQL 18 on database server
Storage     -> NFS/SMB share on storage server
```

Use `npm.cmd`, not `npm`, in PowerShell-based deployment commands.

## Fixed Server Paths

Current production layout:

```text
D:\inetpub\SIDHKOFED
  env\
  iis-root\
  logs\
  repo\
    Sidhkofed-Website\
    SIDHKOFED_CMS_UI\
    SIDHKOFED_WEB\
  services\
```

Expected services:

```text
D:\inetpub\SIDHKOFED\services\sidhkofed-api.exe
D:\inetpub\SIDHKOFED\services\sidhkofed-admin.exe
D:\inetpub\SIDHKOFED\services\sidhkofed-web.exe
```

## Go-Live Checklist

1. Confirm DNS points to the app server.

2. Add IIS bindings for the final domain:

```text
www.sidhkofed.jharkhand.gov.in
sidhkofed.jharkhand.gov.in
```

3. Install the SSL certificate in IIS and bind it to HTTPS.

4. Confirm IIS URL Rewrite rules are in this order:

```text
1. API Ready        ^api/v1/ready$   -> http://localhost:4010/ready
2. API to Node      ^api/v1/(.*)     -> http://localhost:4010/api/v1/{R:1}
3. CMS Root         ^cms$            -> http://localhost:3001/cms
4. CMS to Admin     ^cms/(.*)        -> http://localhost:3001/cms/{R:1}
5. Public Web       ^(.*)            -> http://localhost:3002/{R:1}
```

5. Confirm ARR proxy is enabled:

```text
IIS server node -> Application Request Routing Cache -> Server Proxy Settings -> Enable proxy
```

6. Update API env:

```text
D:\inetpub\SIDHKOFED\repo\Sidhkofed-Website\.env
```

Required production values:

```env
NODE_ENV=production
APP_PORT=4010
API_BASE_PATH=/api/v1
PUBLIC_WEBSITE_URL=https://www.sidhkofed.jharkhand.gov.in
STORAGE_PUBLIC_BASE_URL=https://www.sidhkofed.jharkhand.gov.in/api/v1/public/media
REFRESH_COOKIE_SECURE=true
REFRESH_COOKIE_SAMESITE=lax
ENABLE_HTTPS_HEADERS=true
```

7. Update Admin CMS env:

```text
D:\inetpub\SIDHKOFED\repo\SIDHKOFED_CMS_UI\.env.production
```

Required production values:

```env
ENABLE_HTTPS_HEADERS=true
NODE_ENV=production
PORT=3001
BACKEND_ORIGIN=http://localhost:4010
NEXT_PUBLIC_API_BASE_URL=/api/v1
NEXT_PUBLIC_BASE_PATH=/cms
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

8. Update Public Website env:

```text
D:\inetpub\SIDHKOFED\repo\SIDHKOFED_WEB\.env.production
```

Required production values:

```env
ENABLE_HTTPS_HEADERS=true
NODE_ENV=production
PORT=3002
BACKEND_ORIGIN=http://localhost:4010
NEXT_PUBLIC_API_BASE_URL=/api/v1
NEXT_PUBLIC_SITE_URL=https://www.sidhkofed.jharkhand.gov.in
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

9. Rebuild the API:

```powershell
cd D:\inetpub\SIDHKOFED\repo\Sidhkofed-Website
npm.cmd run prisma:deploy
npm.cmd run build
```

10. Rebuild the Admin CMS:

```powershell
cd D:\inetpub\SIDHKOFED\repo\SIDHKOFED_CMS_UI
npm.cmd run build
```

11. Rebuild the Public Website:

```powershell
cd D:\inetpub\SIDHKOFED\repo\SIDHKOFED_WEB
npm.cmd run build
```

12. Restart services:

```powershell
cd D:\inetpub\SIDHKOFED\services
.\sidhkofed-api.exe restart
.\sidhkofed-admin.exe restart
.\sidhkofed-web.exe restart
```

13. Validate from the app server:

```powershell
$url = 'http' + '://localhost:4010/ready'
Invoke-WebRequest $url -TimeoutSec 10

$url = 'https' + '://www.sidhkofed.jharkhand.gov.in/api/v1/ready'
Invoke-WebRequest $url -TimeoutSec 10
```

14. Validate in the browser:

```text
https://www.sidhkofed.jharkhand.gov.in/
https://www.sidhkofed.jharkhand.gov.in/cms/login
```

15. Smoke test:

- CMS login works.
- Dashboard opens at `/cms/dashboard`, not `/cms/cms/dashboard`.
- Public website loads with CSS and images.
- Upload a test image in CMS.
- Confirm original and thumbnails are visible.
- Confirm `/api/v1/auth/refresh` returns quickly, not timeout.

## Database Backup Service

Create the database backup task before public go-live.

Current deployment location: run it on the database server.

Backup script:

```text
D:\SIDHKOFED\scripts\backup-db-windows.ps1
```

Backup folder:

```text
D:\DB-Backups
```

The task account must have:

- Read access to `D:\SIDHKOFED\env\db-backup.env`
- Modify access to `D:\DB-Backups`
- Permission to connect to PostgreSQL using the `DATABASE_URL` in `db-backup.env`

The DB-server backup env file should be:

```text
D:\SIDHKOFED\env\db-backup.env
```

It only needs:

```env
DATABASE_URL=postgresql://sidhkofed_app:YOUR_PASSWORD@127.0.0.1:5432/sidhkofed_cms
```

Manual backup test from the server where the task will run:

```powershell
cd D:\SIDHKOFED\scripts
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\backup-db-windows.ps1
```

Verify latest backup:

```powershell
cd D:\SIDHKOFED\scripts
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\backup-db-windows.ps1 -VerifyLatest
```

If PostgreSQL is installed in a different folder, pass the real path:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\backup-db-windows.ps1 -PgDumpPath "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
```

Create the scheduled backup task from an elevated PowerShell window on the server where backups will run:

```powershell
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument '-NoProfile -ExecutionPolicy Bypass -File "D:\SIDHKOFED\scripts\backup-db-windows.ps1" -EnvFile "D:\SIDHKOFED\env\db-backup.env" -BackupRoot "D:\DB-Backups" -PgDumpPath "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -RetentionDays 7'

$trigger = New-ScheduledTaskTrigger -Daily -At "02:00"

$principal = New-ScheduledTaskPrincipal `
  -UserId "SYSTEM" `
  -LogonType ServiceAccount `
  -RunLevel Highest

Register-ScheduledTask `
  -TaskName "SIDHKOFED Database Backup" `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal
```

Run the task once immediately:

```powershell
Start-ScheduledTask -TaskName "SIDHKOFED Database Backup"
```

Check the result:

```powershell
Get-ScheduledTaskInfo -TaskName "SIDHKOFED Database Backup"
Get-ChildItem D:\DB-Backups
Get-Content D:\DB-Backups\backup.log -Tail 40
```

Expected backup files:

```text
sidhkofed_db_YYYYMMDD-HHMMSS.dump
sidhkofed_latest.dump
backup.log
```

Retention is 7 days.

Do not store the only backup on the same disk forever. Copy `D:\DB-Backups` to storage/NAS/offline backup daily, or configure server-level backup to include it.

## Routine Project Update Procedure

Use this procedure whenever code changes are deployed.

### 1. Take Backup First

Before updating:

```text
PostgreSQL database backup
NFS/SMB storage backup or snapshot
D:\inetpub\SIDHKOFED\env backup
D:\inetpub\SIDHKOFED\services backup
```

At minimum, copy current env and service XML files:

```powershell
Copy-Item D:\inetpub\SIDHKOFED\env D:\inetpub\SIDHKOFED\env-backup -Recurse -Force
Copy-Item D:\inetpub\SIDHKOFED\services D:\inetpub\SIDHKOFED\services-backup -Recurse -Force
```

### 2. Pull Or Copy Updated Code

If using Git:

```powershell
cd D:\inetpub\SIDHKOFED\repo\Sidhkofed-Website
git pull

cd D:\inetpub\SIDHKOFED\repo\SIDHKOFED_CMS_UI
git pull

cd D:\inetpub\SIDHKOFED\repo\SIDHKOFED_WEB
git pull
```

If copying manually, replace source files but keep real `.env`, `.env.production`, logs, and service XML files.

### 3. Install Dependency Changes

Run this only in projects where `package.json` or `package-lock.json` changed:

```powershell
cd D:\inetpub\SIDHKOFED\repo\Sidhkofed-Website
npm.cmd install

cd D:\inetpub\SIDHKOFED\repo\SIDHKOFED_CMS_UI
npm.cmd install

cd D:\inetpub\SIDHKOFED\repo\SIDHKOFED_WEB
npm.cmd install
```

### 4. Deploy Database Changes

Run this if backend code or Prisma migrations changed:

```powershell
cd D:\inetpub\SIDHKOFED\repo\Sidhkofed-Website
npm.cmd run prisma:deploy
```

Run seed only when seed data changed or the deployment notes explicitly say to run it:

```powershell
npm.cmd run db:seed
```

The seed should not be used as the normal way to reset the admin password.

### 5. Build Updated Projects

Backend:

```powershell
cd D:\inetpub\SIDHKOFED\repo\Sidhkofed-Website
Remove-Item .\dist -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
```

Verify the backend build entry:

```powershell
Test-Path D:\inetpub\SIDHKOFED\repo\Sidhkofed-Website\dist\src\server.js
Select-String "@/" D:\inetpub\SIDHKOFED\repo\Sidhkofed-Website\dist\src\app.js
```

Expected: `Test-Path` returns `True`; `Select-String` returns no output.

Admin CMS:

```powershell
cd D:\inetpub\SIDHKOFED\repo\SIDHKOFED_CMS_UI
Remove-Item .\.next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
```

Public Website:

```powershell
cd D:\inetpub\SIDHKOFED\repo\SIDHKOFED_WEB
Remove-Item .\.next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
```

### 6. Restart Only What Changed

If backend changed:

```powershell
cd D:\inetpub\SIDHKOFED\services
.\sidhkofed-api.exe restart
```

If Admin CMS changed:

```powershell
cd D:\inetpub\SIDHKOFED\services
.\sidhkofed-admin.exe restart
```

If Public Website changed:

```powershell
cd D:\inetpub\SIDHKOFED\services
.\sidhkofed-web.exe restart
```

If shared env/routing changed, restart all three.

### 7. Validate After Update

From app server:

```powershell
$url = 'http' + '://localhost:4010/ready'
Invoke-WebRequest $url -TimeoutSec 10

$url = 'http' + '://localhost:4010/api/v1/auth/refresh'
Invoke-WebRequest $url -Method POST -ContentType "application/json" -Body "{}" -TimeoutSec 10
```

The refresh check should return a fast `401 authentication_required`, not timeout.

Through IIS:

```powershell
$url = 'https' + '://www.sidhkofed.jharkhand.gov.in/api/v1/ready'
Invoke-WebRequest $url -TimeoutSec 10
```

Browser checks:

```text
https://www.sidhkofed.jharkhand.gov.in/
https://www.sidhkofed.jharkhand.gov.in/cms/login
```

### 8. Rollback Procedure

Use rollback if health checks fail and the issue cannot be fixed quickly.

1. Stop affected services:

```powershell
cd D:\inetpub\SIDHKOFED\services
.\sidhkofed-api.exe stop
.\sidhkofed-admin.exe stop
.\sidhkofed-web.exe stop
```

2. Restore previous code/build folders from backup or previous Git revision.

3. Restore database only if migrations changed data incompatibly.

4. Restore NFS/SMB storage only if the failed release changed uploaded file layout.

5. Start services:

```powershell
.\sidhkofed-api.exe start
.\sidhkofed-admin.exe start
.\sidhkofed-web.exe start
```

6. Re-run validation.

## When Rebuild Is Required

Backend rebuild required when:

- TypeScript backend code changes.
- `package.json` or lockfile changes.
- Prisma client/schema changes.
- Build output is missing or stale.

Backend restart only is enough when:

- Only API `.env` runtime values changed.

Admin/Public frontend rebuild required when:

- Any frontend source code changes.
- `next.config.mjs` changes.
- Any `NEXT_PUBLIC_*` value changes.
- `ENABLE_HTTPS_HEADERS` changes.

Frontend restart only is enough when:

- The already-built app has no source/config/env changes that are baked into the build.

## Non-Negotiable Production Values

Keep these aligned:

```env
APP_PORT=4010
BACKEND_ORIGIN=http://localhost:4010
NEXT_PUBLIC_API_BASE_URL=/api/v1
NEXT_PUBLIC_BASE_PATH=/cms
REFRESH_COOKIE_SECURE=true
ENABLE_HTTPS_HEADERS=true
```

WinSW API XML must point to:

```xml
<arguments>D:\inetpub\SIDHKOFED\repo\Sidhkofed-Website\dist\src\server.js</arguments>
```

Do not move the API back to port 4000 for this IIS/ARR deployment.
