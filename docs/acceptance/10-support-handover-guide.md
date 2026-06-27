# SIDHKOFED CMS — Support Handover Guide

**Version:** 1.0.0  
**Date:** 2026-06-27  
**Audience:** Incoming support team / operations engineer

---

## 1. System at a Glance

SIDHKOFED CMS is a headless CMS + public website for the Jharkhand Cooperative Federation. It runs as six Docker containers managed by Docker Compose on a single Linux server (or Windows Server with WSL2 — see `docs/ops/windows-server-deployment.md`).

> **Windows Server note:** If the production server runs Windows, all commands in this guide should be run from the **WSL2 Ubuntu terminal** (type `wsl` in PowerShell to enter it), not from PowerShell directly. PowerShell equivalents for backup/restore are available at `scripts\backup.ps1` and `scripts\restore.ps1`.

**Access points after go-live:**
- Public website: `https://yourdomain.com/`
- Admin CMS: `https://yourdomain.com/admin/`
- API health: `https://yourdomain.com/health`

**Code repository:** GitHub (private) — `sidhkofed/sidhkofed-website`  
**Container images:** GHCR — `ghcr.io/sidhkofed/{api,admin,web}:<tag>`

---

## 2. Credentials and Secrets

All production secrets are stored in `/opt/sidhkofed/.env.prod` on the production server. This file is **never committed to git**.

Key secrets:
- `JWT_SECRET` — signs all admin session tokens
- `POSTGRES_PASSWORD` — database password
- `IP_HASH_SALT` — anonymises IPs in rate limit keys
- SMTP credentials — for enquiry email notifications

If any credential is suspected compromised, follow `docs/ops/disaster-recovery.md` → Scenario 7.

---

## 3. Day-to-Day Operations

### Check system health (< 2 minutes)

```bash
cd /opt/sidhkofed
curl -sf https://yourdomain.com/health | jq .
docker compose -f docker-compose.prod.yml ps
```

### View recent errors

```bash
# API errors (level 50 = error)
docker compose -f docker-compose.prod.yml logs --since 1h api | grep '"level":50'

# Nginx 5xx responses
docker exec sidhkofed-nginx tail -100 /var/log/nginx/access.log | grep " 5"
```

### Restart a misbehaving service

```bash
docker compose -f docker-compose.prod.yml restart api   # or admin, web, nginx
```

### Deploy a new version

See `docs/ops/deployment.md` — Rolling Update section.

---

## 4. Database Operations

```bash
# Connect to database
docker exec -it sidhkofed-postgres psql -U sidhkofed -d sidhkofed_cms

# Run a migration manually
docker compose -f docker-compose.prod.yml run --rm migrate

# Take an ad-hoc backup before risky changes
./scripts/backup.sh --db-only
```

---

## 5. Backup and Restore

Automated nightly backup runs via cron at 02:00:
```
0 2 * * * /opt/sidhkofed/scripts/backup.sh >> /var/log/sidhkofed-backup.log 2>&1
```

To restore the latest backup:
```bash
./scripts/restore.sh --latest
```

Full guide: `docs/ops/backup-restore.md`

---

## 6. Content Admin Guide (for Editorial Team)

The Admin CMS is accessible at `https://yourdomain.com/admin/`. Four roles are available:

| Role | Who | What they can do |
|------|-----|-----------------|
| Super Admin | IT lead | Everything; user and settings management |
| Content Editor | Content team | Create and edit all content; cannot publish |
| Publisher | Senior editor | Everything Editor can do, plus publish/archive |
| Read Only | Observers | View-only access |

**Common editorial tasks:**
- **Publish an event:** Events → open event → click Publish
- **Upload media:** Media Library → Upload → drag files
- **Respond to an enquiry:** Enquiries → open enquiry → add note
- **Check dashboard data:** Dashboard Data → select a report → upload dataset or view metrics
- **Update site settings:** Settings → edit key-value pairs

---

## 7. Escalation Path

| Issue | First Contact | Escalate To |
|-------|--------------|-------------|
| Content question (wrong text, broken link) | Content Editor | Publisher |
| CMS login problem | Publisher | Super Admin |
| Service down (site unreachable) | On-call engineer | Backend Lead |
| Database issue | Backend Lead | DevOps |
| Security incident (breach, credential leak) | Security Lead | Management + DevOps |

---

## 8. Monitoring Setup Required

The following must be set up by the operations team post-handover:

1. **Uptime monitoring:** Configure UptimeRobot (or equivalent) to probe `GET /ready` every 60 seconds. Alert on consecutive failures.

2. **Log aggregation:** Ship Docker json-file logs to a central system (Loki + Grafana, CloudWatch, or Papertrail). Query field `level: 50` for errors.

3. **Disk space alert:** Alert when `/var/lib/docker/volumes` usage exceeds 75%.

4. **Backup verification:** Weekly manual run of `./scripts/backup.sh --verify` and confirmation the output file is non-zero.

---

## 9. Known Support Scenarios

### User cannot log in to Admin CMS
1. Confirm they are using the correct email and password
2. Check if account is active: Admin CMS → Users → find user → verify Is Active = true
3. If locked out of all admin accounts, use the database: `UPDATE "User" SET is_active = true WHERE email = 'admin@example.com'`

### Enquiry emails not arriving
1. Check `EMAIL_ENABLED=true` in `.env.prod`
2. Check `EMAIL_ENQUIRY_RECIPIENT` is set correctly
3. Check api logs for email errors: `docker compose logs api | grep 'email'`
4. Verify SMTP credentials with the mail server provider
5. Enquiries still saved to database even if email fails

### File uploads failing
1. Check storage volume: `docker exec sidhkofed-api ls -la /app/storage`
2. Check disk space: `df -h /var/lib/docker/volumes`
3. Check file size — Nginx enforces 64 MB limit (`client_max_body_size 64m`)

### Public website shows stale content
1. Next.js ISR caches pages. Wait for revalidation period OR restart the web container:
   `docker compose -f docker-compose.prod.yml restart web`
2. If content was published in CMS, check the API: `curl /api/v1/public/<module>`

---

## 10. Reference Documents

| Document | Location |
|---------|---------|
| Architecture summary | `docs/acceptance/06-architecture-summary.md` |
| Deployment guide | `docs/ops/deployment.md` |
| Operations manual | `docs/ops/operations-manual.md` |
| Backup/restore guide | `docs/ops/backup-restore.md` |
| Monitoring guide | `docs/ops/monitoring.md` |
| Disaster recovery | `docs/ops/disaster-recovery.md` |
| Production checklist | `docs/ops/production-checklist.md` |
| API specification | `docs/api-specification.md` |
| Database schema | `docs/database-schema-design.md` |
| Known limitations | `docs/acceptance/08-known-limitations.md` |
| Phase 18 roadmap | `docs/acceptance/09-future-enhancements-phase18.md` |
