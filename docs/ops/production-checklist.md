# SIDHKOFED CMS — Production Checklist

## Pre-deployment checklist

Complete every item before promoting a release to production.

### Code quality
- [ ] All CI jobs green (lint, typecheck, unit tests, Prisma validate)
- [ ] Coverage thresholds pass (60/50/60/65 — statements/branches/functions/lines)
- [ ] No `npm audit --audit-level=high` failures in any workspace
- [ ] Semgrep / CodeQL findings reviewed and triaged
- [ ] No secrets detected by TruffleHog scan

### Build & images
- [ ] Docker images build successfully for all three services (api, admin, web)
- [ ] Images pushed to GHCR with versioned tag (not only `latest`)
- [ ] Trivy scan completed — no CRITICAL CVEs in final image layers
- [ ] Image labels populated (title, version, source, revision)

### Environment & secrets
- [ ] `.env.prod` populated on production server (not committed to git)
- [ ] `JWT_SECRET` is at least 32 characters, random, not reused from development
- [ ] `IP_HASH_SALT` is at least 8 characters, random
- [ ] `POSTGRES_PASSWORD` is a strong random password
- [ ] `DATABASE_URL` points to the production database with correct credentials
- [ ] `REDIS_URL` points to the production Redis instance
- [ ] `EMAIL_ENABLED=true` and SMTP credentials verified (send a test email)
- [ ] `CAPTCHA_PROVIDER` configured if abuse protection is needed
- [ ] `PUBLIC_WEBSITE_URL` set to the production domain
- [ ] `STORAGE_PROVIDER` set and credentials verified (`local` or `s3`)
- [ ] All `SEED_*` variables reviewed (only run seed on first deploy)

### Infrastructure
- [ ] TLS certificate installed at `nginx/ssl/fullchain.pem` + `nginx/ssl/privkey.pem`
- [ ] Nginx HTTPS server block uncommented and HTTP redirect enabled
- [ ] `nginx -t` passes cleanly
- [ ] Production Docker Compose file validated: `docker compose -f docker-compose.prod.yml config`
- [ ] Database volume has sufficient disk space (2× current DB size as headroom)
- [ ] Backup directory exists and cron job is scheduled
- [ ] Last backup verified: `./scripts/backup.sh --verify`

### Database
- [ ] All Prisma migrations applied: `docker compose -f docker-compose.prod.yml run --rm migrate`
- [ ] `prisma migrate status` shows no pending migrations
- [ ] Database is reachable from api container (health check passing)

### Smoke test (on staging before production)
- [ ] `GET /live` returns 200
- [ ] `GET /ready` returns 200
- [ ] `GET /health` returns `"status": "healthy"`
- [ ] Public website homepage loads (200)
- [ ] Admin CMS login page loads (200)
- [ ] API responds to a public endpoint (e.g. `GET /api/v1/public/settings`)
- [ ] File upload works (if using local storage — check `/files/` route)

---

## Deployment steps

```bash
# 1. Pre-deployment backup
./scripts/backup.sh

# 2. Pull new images
export IMAGE_TAG=<tag-from-ci>
docker compose -f docker-compose.prod.yml pull api admin web

# 3. Apply migrations
docker compose -f docker-compose.prod.yml run --rm migrate

# 4. Rolling update
docker compose -f docker-compose.prod.yml up -d --no-deps --wait api
docker compose -f docker-compose.prod.yml up -d --no-deps --wait admin
docker compose -f docker-compose.prod.yml up -d --no-deps --wait web

# 5. Post-deployment verification (see checklist below)
```

---

## Post-deployment checklist

Complete within 15 minutes of every production deployment.

- [ ] `docker compose -f docker-compose.prod.yml ps` — all containers healthy
- [ ] `GET /ready` returns 200 from an external probe
- [ ] Public website loads without errors
- [ ] Admin CMS accessible and login works
- [ ] Check api logs for unexpected errors: `docker compose -f docker-compose.prod.yml logs --tail=100 api`
- [ ] Check Nginx logs for 5xx responses: `docker exec sidhkofed-nginx tail -100 /var/log/nginx/access.log | grep " 5"`
- [ ] Uptime monitor shows green (UptimeRobot, Better Uptime, etc.)
- [ ] Record deployed tag and timestamp in your deployment log

---

## Rollback procedure

If a post-deployment check fails:

```bash
# Identify the previous good tag (check CI history or deployment log)
PREV_TAG=main-<previous-sha>

# Pull and redeploy
export IMAGE_TAG=${PREV_TAG}
docker compose -f docker-compose.prod.yml pull api admin web
docker compose -f docker-compose.prod.yml up -d --no-deps api admin web

# If database migration was applied and is causing issues:
./scripts/restore.sh --db /opt/sidhkofed/backups/db_latest.sql.gz
docker compose -f docker-compose.prod.yml up -d
```

Rollback target: production restored to pre-deployment state within 10 minutes.

---

## Maintenance window checklist

For changes that require downtime (e.g. breaking schema migrations):

- [ ] Communicate maintenance window to users at least 24 hours in advance
- [ ] Put Nginx in maintenance mode (serve a static 503 page)
- [ ] Take a database backup
- [ ] Apply the change
- [ ] Verify in staging first if possible
- [ ] Restore Nginx to production configuration
- [ ] Run post-deployment checklist
- [ ] Send "maintenance complete" notification

---

## First-time production setup

Additional steps required only on the very first deployment:

- [ ] Run database seed if needed: `docker compose -f docker-compose.prod.yml exec api node dist/db/seed.js`
- [ ] Verify superadmin account works with `SEED_SUPERADMIN_EMAIL` credentials
- [ ] **Change the superadmin password immediately after first login**
- [ ] Verify media storage is writable (upload a test file and confirm it appears at the `/files/` URL)
- [ ] Set up the automated backup cron job
- [ ] Configure external uptime monitoring
- [ ] Register TLS auto-renewal hook with Certbot
