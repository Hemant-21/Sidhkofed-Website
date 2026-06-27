# SIDHKOFED CMS — Deployment Summary

**Version:** 1.0.0  
**Date:** 2026-06-27  

---

## Architecture Overview

```
Internet
    │
    ▼
┌──────────────────────────────────────────────┐
│  Nginx 1.27 (proxy network)                  │
│  :80 → redirect → :443                       │
│  :443 TLS terminated                         │
│  /          → web:3002   (Public Website)    │
│  /admin/*   → admin:3001 (Admin CMS)         │
│  /api/*     → api:4000   (REST API)          │
│  /files/*   → media volume (static)          │
└──────────────────────────────────────────────┘
         │              │             │
         ▼              ▼             ▼
    ┌─────────┐  ┌──────────┐  ┌─────────┐
    │ api     │  │ admin    │  │ web     │
    │ :4000   │  │ :3001    │  │ :3002   │
    └─────────┘  └──────────┘  └─────────┘
         │
    (backend network — internal only)
         │              │
    ┌─────────┐  ┌──────────┐
    │postgres │  │ redis    │
    │ :5432   │  │ :6379    │
    └─────────┘  └──────────┘
```

All application-to-database communication is on the `backend` internal Docker network (no internet exposure). Only Nginx is on the `proxy` network.

---

## Service Configuration

| Service | Image | CPU | Memory |
|---------|-------|-----|--------|
| api | `ghcr.io/sidhkofed/api:TAG` | — | — |
| admin | `ghcr.io/sidhkofed/admin:TAG` | — | — |
| web | `ghcr.io/sidhkofed/web:TAG` | — | — |
| postgres | `postgres:16-alpine` | — | — |
| redis | `redis:7-alpine` | — | — |
| nginx | `nginx:1.27-alpine` | — | — |

*Resource limits should be tuned per-server based on available RAM and load profile.*

---

## Port Mapping (Host → Container)

| Host Port | Container | Service |
|-----------|-----------|---------|
| 80 | nginx:80 | HTTP (redirects to 443) |
| 443 | nginx:443 | HTTPS |

All other ports (5432, 6379, 4000, 3001, 3002) are internal — not exposed to host.

---

## Volume Mounts

| Volume | Mount Point | Purpose |
|--------|------------|---------|
| `pgdata` | `postgres:/var/lib/postgresql/data` | Database storage |
| `redisdata` | `redis:/data` | Redis persistence |
| `media` | `api:/app/storage` | Uploaded files |
| `./nginx/nginx.conf` | `nginx:/etc/nginx/nginx.conf:ro` | Nginx config |
| `./nginx/ssl` | `nginx:/etc/nginx/ssl:ro` | TLS certificates |

---

## Image Registry

Images are published to GitHub Container Registry (GHCR):

```
ghcr.io/sidhkofed/api:<tag>
ghcr.io/sidhkofed/admin:<tag>
ghcr.io/sidhkofed/web:<tag>
```

Tag format: `{branch}-{sha_short}` (e.g. `main-a8ef1dc`)

---

## CI/CD Pipeline

```
Push to main branch
        │
        ▼
   ci.yml (all 3 workspaces)
   ├── lint
   ├── typecheck
   ├── unit tests + coverage
   └── prisma validate
        │
        ▼ (on tag push)
   release.yml
   ├── version-tag job (compute image tag)
   ├── build-push job (matrix: api, admin, web)
   │   ├── multi-arch: linux/amd64, linux/arm64
   │   └── push to GHCR
   ├── deploy-staging
   │   ├── SSH to staging server
   │   ├── docker compose pull
   │   ├── prisma migrate deploy
   │   └── rolling up (--no-deps --wait)
   ├── smoke-staging
   │   └── curl /ready (5 retries), /health
   └── deploy-production (gated: required reviewers)
       ├── pre-deployment backup
       ├── same rolling update
       └── post-deploy smoke test
```

---

## Rolling Update Procedure (Zero Downtime)

```bash
export IMAGE_TAG=main-<sha>

# 1. Backup
./scripts/backup.sh

# 2. Pull new images
docker compose -f docker-compose.prod.yml pull api admin web

# 3. Migrate (if needed)
docker compose -f docker-compose.prod.yml run --rm migrate

# 4. Rolling restart (one service at a time)
docker compose -f docker-compose.prod.yml up -d --no-deps --wait api
docker compose -f docker-compose.prod.yml up -d --no-deps --wait admin
docker compose -f docker-compose.prod.yml up -d --no-deps --wait web

# 5. Verify
curl -sf https://yourdomain.com/ready | jq .
```

---

## Rollback Procedure

```bash
export IMAGE_TAG=main-<previous-sha>
docker compose -f docker-compose.prod.yml pull api admin web
docker compose -f docker-compose.prod.yml up -d --no-deps api admin web
```

If a migration was applied and is causing issues:
```bash
./scripts/restore.sh --db /opt/sidhkofed/backups/db_latest.sql.gz
docker compose -f docker-compose.prod.yml up -d
```

Target: **production restored to pre-deployment state within 10 minutes**.

---

## First Deployment Steps

```bash
# 1. Clone repository
git clone https://github.com/sidhkofed/sidhkofed-website.git /opt/sidhkofed
cd /opt/sidhkofed

# 2. Create production env file
cp .env.example .env.prod
nano .env.prod  # populate all required values

# 3. TLS
mkdir -p nginx/ssl
# Copy fullchain.pem and privkey.pem to nginx/ssl/
# Enable HTTPS server block in nginx/nginx.conf

# 4. Start and migrate
export IMAGE_TAG=main-<release-sha>
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml run --rm migrate

# 5. Run seed (first time only)
docker compose -f docker-compose.prod.yml exec api node dist/db/seed.js

# 6. Start remaining services
docker compose -f docker-compose.prod.yml up -d

# 7. Verify
curl -sf https://yourdomain.com/health | jq .
```
