# SIDHKOFED CMS — Disaster Recovery Plan

## Recovery objectives

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | < 2 hours |
| RPO (Recovery Point Objective) | < 24 hours (last nightly backup) |

These targets assume the automated daily backup is configured and healthy. With offsite S3 backups enabled, RPO can be reduced to < 1 hour by scheduling hourly database backups.

---

## Incident severity levels

| Level | Definition | SLA |
|-------|-----------|-----|
| SEV-1 | Complete outage — public website and admin unreachable | Respond in < 15 min |
| SEV-2 | Partial outage — one service down, others functional | Respond in < 1 hour |
| SEV-3 | Degraded — service up but slow or feature broken | Respond in < 4 hours |

---

## Failure scenarios and recovery procedures

### Scenario 1: Container crash (api / admin / web)

**Symptoms**: One or more containers in `Exited` or `Restarting` state.

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# View exit logs
docker compose -f docker-compose.prod.yml logs --tail=100 <service>

# Restart affected service
docker compose -f docker-compose.prod.yml up -d --no-deps <service>
```

Expected recovery time: < 2 minutes (containers restart automatically with `restart: unless-stopped`).

---

### Scenario 2: Database unreachable

**Symptoms**: `/ready` returns 503, api logs show `ECONNREFUSED postgres:5432`.

```bash
# Check postgres container
docker compose -f docker-compose.prod.yml ps postgres
docker compose -f docker-compose.prod.yml logs --tail=50 postgres

# If container is running but unhealthy, check disk space
df -h /var/lib/docker/volumes

# Restart postgres (in-memory connections only — data is in volume)
docker compose -f docker-compose.prod.yml restart postgres

# Wait for healthy
docker compose -f docker-compose.prod.yml ps postgres
```

If the volume is corrupted:

```bash
# Restore from backup
./scripts/restore.sh --db /opt/sidhkofed/backups/db_latest.sql.gz

# Restart all services
docker compose -f docker-compose.prod.yml up -d
```

---

### Scenario 3: Redis unreachable

**Symptoms**: Session creation fails, cache misses on all requests, logs show `ECONNREFUSED redis:6379`.

Redis is **not** in the critical path for read-only public content (Next.js ISR bypasses Redis). Admin sessions will be lost.

```bash
# Restart Redis
docker compose -f docker-compose.prod.yml restart redis

# Redis AOF persistence means sessions survive restart
```

If the volume is lost, users will need to log in again — no data loss beyond session state.

---

### Scenario 4: Nginx configuration error after update

**Symptoms**: 502 Bad Gateway on all routes, Nginx container in restart loop.

```bash
# Test the current config before applying
docker exec sidhkofed-nginx nginx -t

# If config is bad, roll back nginx.conf via git
git -C /opt/sidhkofed checkout nginx/nginx.conf

# Reload Nginx (graceful, no downtime)
docker exec sidhkofed-nginx nginx -s reload
```

---

### Scenario 5: Bad application deployment

**Symptoms**: 5xx errors spike after a deploy, `/ready` still returns 200.

```bash
# Identify the previous working image tag from CI history or git log
PREV_TAG=main-abc1234

# Roll back (see deployment.md for full procedure)
export IMAGE_TAG=${PREV_TAG}
docker compose -f docker-compose.prod.yml pull api admin web
docker compose -f docker-compose.prod.yml up -d --no-deps api admin web

# Verify
curl -sf https://yourdomain.com/ready | jq .
```

---

### Scenario 6: Full server loss (hardware failure / provider outage)

**RTO**: Up to 2 hours.

```
1. Provision a new server with Docker and Docker Compose.
2. Pull the /opt/sidhkofed code from git.
3. Restore .env.prod from the secrets vault.
4. Download the latest backup from S3:
      aws s3 cp s3://backup-bucket/hostname/db_latest.sql.gz /opt/sidhkofed/backups/
      aws s3 cp s3://backup-bucket/hostname/media_latest.tar.gz /opt/sidhkofed/backups/
5. Run: ./scripts/restore.sh --latest
6. Start services: docker compose -f docker-compose.prod.yml up -d
7. Re-provision TLS certificate.
8. Point DNS to the new server IP.
```

---

### Scenario 7: Compromised credentials / secret rotation

```bash
# 1. Immediately rotate the compromised secret in .env.prod
nano /opt/sidhkofed/.env.prod   # update JWT_SECRET, IP_HASH_SALT, DB password, etc.

# 2. Rotate the DB password (if compromised)
docker exec sidhkofed-postgres \
  psql -U postgres -c "ALTER USER sidhkofed PASSWORD 'new-password';"

# 3. Restart the api (invalidates all existing JWTs automatically for JWT_SECRET rotation)
docker compose -f docker-compose.prod.yml up -d --no-deps api

# 4. Audit recent access logs for anomalous activity
docker logs sidhkofed-nginx --since 24h | grep -v 200
```

---

## Communication template

```
INCIDENT NOTIFICATION — SIDHKOFED CMS
Time:     [UTC timestamp]
Severity: SEV-[1|2|3]
Impact:   [What is affected]
Status:   Investigating / Identified / Resolved
ETA:      [Expected resolution time if known]
Updates:  [Link to status page or Slack channel]
```

---

## Post-incident review checklist

After every SEV-1 or SEV-2 incident, complete a post-mortem within 48 hours:

- [ ] Root cause identified
- [ ] Timeline documented
- [ ] Impact scope assessed (users, data, duration)
- [ ] Immediate mitigation confirmed
- [ ] Long-term fix scheduled or deployed
- [ ] Monitoring/alerting gaps addressed
- [ ] Runbook updated if procedure was missing or incorrect
- [ ] Team notified of learnings
