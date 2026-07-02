# SIDHKOFED CMS — Operations Summary

**Version:** 1.0.0  
**Date:** 2026-06-27

---

## System Overview

| Component | Technology | Port | Managed By |
|-----------|-----------|------|-----------|
| API | Express 4 + Node 20 | 4000 (internal) | Docker Compose |
| Admin CMS | Next.js 14 | 3001 (internal) | Docker Compose |
| Public Website | Next.js 14 | 3002 (internal) | Docker Compose |
| Database | PostgreSQL 16 | 5432 (internal) | Docker Compose |
| Cache | Redis 7 | 6379 (internal) | Docker Compose |
| Reverse Proxy | Nginx 1.27 | 80, 443 (public) | Docker Compose |

All services run as Docker containers; managed via `docker-compose.prod.yml`.

---

## Daily Operations Checklist

```bash
# Morning health check
curl -sf https://yourdomain.com/health | jq .
docker compose -f docker-compose.prod.yml ps

# Check for overnight errors
docker compose -f docker-compose.prod.yml logs --since 12h api | grep '"level":50'

# Verify backup ran
ls -la /opt/sidhkofed/backups/ | tail -5
```

---

## Health Monitoring

| Endpoint | Purpose | Expected Response |
|---------|---------|------------------|
| `GET /live` | Process alive | 200 `{"status":"live"}` |
| `GET /ready` | DB + Redis ready | 200 `{"status":"ready"}` |
| `GET /health` | Aggregate JSON | 200 `{"status":"healthy","checks":{"db":"ok","redis":"ok"}}` |

Configure your uptime monitor to probe `GET /ready` every 60 seconds.

---

## Backup Schedule

| Backup Type | Schedule | Retention | Location |
|-------------|---------|-----------|---------|
| Database | Daily at 02:00 | 7 days | `/opt/sidhkofed/backups/db/` |
| Media files | Daily at 02:00 | 30 days | `/opt/sidhkofed/backups/media/` |
| Offsite (S3) | Daily | Configurable | `s3://$S3_BACKUP_BUCKET/` |

Cron entry:
```
0 2 * * * /opt/sidhkofed/scripts/backup.sh >> /var/log/sidhkofed-backup.log 2>&1
```

---

## Incident Response Quick Reference

| Symptom | First Action | Command |
|---------|-------------|---------|
| `/ready` returns 503 | Check DB/Redis containers | `docker compose ps` |
| Login fails with 401 | Check JWT_SECRET in env | `docker inspect sidhkofed-api \| grep JWT` |
| File upload fails | Check storage volume perms | `docker exec sidhkofed-api ls -la /app/storage` |
| Admin CMS blank page | Check admin container logs | `docker compose logs admin` |
| Nginx 502 on all routes | Check api/admin/web containers | `docker compose ps` |
| High API error rate | Check api error logs | `docker compose logs --tail=200 api` |
| Disk space low | Check volume sizes | `docker system df -v` |

Full incident response: see `docs/ops/disaster-recovery.md`.

---

## Operational Documents

| Document | Purpose |
|---------|---------|
| `docs/ops/deployment.md` | Full deployment guide, rolling update, rollback |
| `docs/ops/operations-manual.md` | Day-to-day ops, DB/Redis/Nginx commands |
| `docs/ops/backup-restore.md` | Backup/restore procedures |
| `docs/ops/monitoring.md` | Health checks, logging, alerts |
| `docs/ops/disaster-recovery.md` | Failure scenarios, RTO/RPO, communication template |
| `docs/ops/production-checklist.md` | Pre/post-deployment checklists |

---

## Key Operational Facts

- **RTO:** < 2 hours (full server loss)
- **RPO:** < 24 hours (nightly backup); < 1 hour (with hourly backup schedule)
- **Restart policy:** All containers `restart: unless-stopped` — auto-restart on crash
- **Log retention:** Docker json-file; 20 MB × 5 files per container (100 MB max)
- **TLS renewal:** Certbot; configure deploy hook to reload Nginx automatically
- **Migrations:** Run via `docker compose run --rm migrate`; never skip on update
- **Zero-downtime update:** Rolling service-by-service update (api → admin → web)
- **Rollback time:** < 10 minutes (pull previous image tag + redeploy)
