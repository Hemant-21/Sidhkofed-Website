# Manual Production Configuration Reference

Use this file when configuring IIS, Windows services, PostgreSQL, and NFS/SMB manually. It points to the source files and lines that control production behavior.

## Deployment Docs And Env Templates

| Area | File and line |
| --- | --- |
| App server prep checklist | `docs/ops/app-server-prep.md` |
| Go-live and routine update guide | `docs/ops/go-live-and-update-guide.md` |
| Native IIS/non-Docker runbook | `docs/ops/iis-native-deployment.md` |
| Native local PostgreSQL setup | `docs/ops/native-postgres-local-setup.md` |
| Backend production env template | `deploy/env/api.env.production.example` |
| Admin CMS production env template | `deploy/env/admin.env.production.example` |
| Public website production env template | `deploy/env/web.env.production.example` |
| Legacy Docker/WSL guide, not used for current deployment | `docs/ops/windows-server-deployment.md` |

## Backend API

| Setting or behavior | File and line |
| --- | --- |
| Production start command: `npm.cmd run start` -> `node dist/src/server.js` | `package.json:12` |
| Build command | `package.json:11` |
| Prisma migration deploy command | `package.json:23` |
| Seed command | `package.json:27` |
| API listens on configured port | `src/server.ts:47` |
| Startup log prints configured port and base path | `src/server.ts:49` |
| API routes are mounted under `API_BASE_PATH` | `src/app.ts:101` |
| App config reads `APP_PORT` and `API_BASE_PATH` | `src/config/index.ts:16` |
| App config reads `DATABASE_URL` | `src/config/index.ts:23` |
| App config reads `JWT_SECRET` | `src/config/index.ts:33` |
| App config reads `STORAGE_LOCAL_ROOT` | `src/config/index.ts:58` |
| Login rate-limit config | `src/config/index.ts:108` |
| Env validation for `APP_PORT` and `API_BASE_PATH` | `src/config/env.ts:46` |
| Env validation for `DATABASE_URL` | `src/config/env.ts:52` |
| Env validation for cache TTL | `src/config/env.ts:57` |
| Env validation for `JWT_SECRET` | `src/config/env.ts:60` |
| Env validation for `STORAGE_LOCAL_ROOT` | `src/config/env.ts:78` |
| Env validation for login rate limits | `src/config/env.ts:126` |
| Prisma datasource uses `DATABASE_URL` | `prisma/schema.prisma:7` |

## Redis Removal

Redis is not a production dependency. See `docs/ops/redis-removal.md`.

| Setting or behavior | File and line |
| --- | --- |
| Refresh sessions are stored in PostgreSQL | `src/modules/auth/token.service.ts:34` |
| Refresh-session validation reads PostgreSQL | `src/modules/auth/token.service.ts:99` |
| Refresh-session Prisma model | `prisma/schema.prisma:70` |
| Refresh-session migration | `prisma/migrations/20260903180000_auth_refresh_sessions_postgres/migration.sql:1` |
| In-process cache implementation | `src/services/cache.ts:15` |
| In-process rate-limit implementation | `src/middleware/rate-limit.ts:41` |
| In-process scheduler implementation | `src/jobs/scheduler/scheduler.ts:52` |
| Readiness checks PostgreSQL and storage only | `src/routes/health.routes.ts:38` |

## NFS/SMB Storage

| Setting or behavior | File and line |
| --- | --- |
| Local storage root env template | `.env.example:65` |
| Runtime config mapping | `src/config/index.ts:60` |
| Local storage resolves the configured root path | `src/services/storage/local.storage.ts:33` |
| Upload writes create parent directories | `src/services/storage/local.storage.ts:49` |
| Upload writes bytes to filesystem | `src/services/storage/local.storage.ts:52` |
| Public media streaming uses storage read stream when available | `src/modules/media/media.service.ts:322` |

## Admin CMS Frontend

| Setting or behavior | File and line |
| --- | --- |
| Dev port is 3001 | `../SIDHKOFED_CMS_UI/package.json:8` |
| Build command | `../SIDHKOFED_CMS_UI/package.json:9` |
| Production start command uses port 3001 | `../SIDHKOFED_CMS_UI/package.json:10` |
| Browser API base path comes from `NEXT_PUBLIC_API_BASE_URL` | `../SIDHKOFED_CMS_UI/src/config/env.ts:14` |
| CMS deployment base path comes from `NEXT_PUBLIC_BASE_PATH` | `../SIDHKOFED_CMS_UI/src/config/env.ts:16` |
| API client uses configured base URL | `../SIDHKOFED_CMS_UI/src/lib/api/client.ts:33` |
| Upload API client uses configured base URL | `../SIDHKOFED_CMS_UI/src/lib/api/client.ts:44` |

## Public Website Frontend

| Setting or behavior | File and line |
| --- | --- |
| Dev port is 3002 | `../SIDHKOFED_WEB/package.json:8` |
| Build command | `../SIDHKOFED_WEB/package.json:9` |
| Production start command uses port 3002 | `../SIDHKOFED_WEB/package.json:10` |
| Server-side API origin comes from `BACKEND_ORIGIN` | `../SIDHKOFED_WEB/src/config/env.ts:15` |
| Browser API base path comes from `NEXT_PUBLIC_API_BASE_URL` | `../SIDHKOFED_WEB/src/config/env.ts:16` |
| Server API URL combines backend origin and base path | `../SIDHKOFED_WEB/src/config/env.ts:22` |
| Public site URL comes from `NEXT_PUBLIC_SITE_URL` | `../SIDHKOFED_WEB/src/config/env.ts:24` |
| Browser API client uses configured base URL | `../SIDHKOFED_WEB/src/lib/api/client.ts:15` |

## Manual Service Targets

| Service | Working directory | Command | Expected port |
| --- | --- | --- | --- |
| API | `C:\Sites\SIDHKOFED\api` | `npm.cmd run start` | 4010 |
| Admin CMS | `C:\Sites\SIDHKOFED\admin` | `npm.cmd run start` | 3001 |
| Public website | `C:\Sites\SIDHKOFED\web` | `npm.cmd run start` | 3002 |

Use `npm.cmd`, not `npm`, when configuring commands from PowerShell-based tooling. This avoids the Windows execution-policy issue caused by `npm.ps1`.
