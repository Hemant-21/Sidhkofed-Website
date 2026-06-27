# SIDHKOFED CMS — Operations Manual

## System overview

SIDHKOFED CMS is a headless CMS serving the Sidhkofed federation's digital properties. It consists of three application services plus supporting infrastructure:

| Service | Technology | Port (internal) | Purpose |
|---------|-----------|----------------|---------|
| api | Express + TypeScript + Prisma | 4000 | REST API backend |
| admin | Next.js 14 | 3001 | Admin editorial CMS |
| web | Next.js 14 | 3002 | Public-facing website |
| postgres | PostgreSQL 16 | 5432 | Primary database |
| redis | Redis 7 | 6379 | Session cache + rate limiting |
| nginx | Nginx 1.27 | 80 / 443 | Reverse proxy + TLS termination |

All services run as Docker containers managed by Docker Compose.

---

## Day-to-day operations

### Checking service health

```bash
# Quick status of all containers
docker compose -f docker-compose.prod.yml ps

# API health endpoint
curl -s https://yourdomain.com/health | jq .

# Check all container resource usage
docker stats --no-stream
```

### Viewing logs

```bash
# All services, last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100

# Follow a specific service
docker compose -f docker-compose.prod.yml logs -f api

# Nginx access log (requests)
docker exec sidhkofed-nginx tail -f /var/log/nginx/access.log

# Nginx error log
docker exec sidhkofed-nginx tail -f /var/log/nginx/error.log
```

### Restarting a service

```bash
# Graceful restart (sends SIGTERM, waits for drain, then SIGKILL after 10s)
docker compose -f docker-compose.prod.yml restart api

# Force-recreate (only if restart doesn't work)
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate api
```

---

## Database operations

### Connect to the database

```bash
docker exec -it sidhkofed-postgres \
  psql -U sidhkofed -d sidhkofed_cms
```

### View active connections

```sql
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```

### Kill a long-running query

```sql
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '30 seconds';

SELECT pg_terminate_backend(<pid>);
```

### Run a migration manually

```bash
docker compose -f docker-compose.prod.yml run --rm migrate
```

---

## Redis operations

### Connect to Redis CLI

```bash
docker exec -it sidhkofed-redis redis-cli
```

### Monitor cache hit rate

```bash
docker exec sidhkofed-redis redis-cli info stats | grep -E "keyspace_hits|keyspace_misses"
```

### Flush all cached data (emergency only — all users will re-authenticate)

```bash
docker exec sidhkofed-redis redis-cli FLUSHDB
```

---

## Nginx operations

### Test configuration

```bash
docker exec sidhkofed-nginx nginx -t
```

### Graceful reload (apply config changes without downtime)

```bash
docker exec sidhkofed-nginx nginx -s reload
```

### View rate limit violations

```bash
docker exec sidhkofed-nginx grep "limiting requests" /var/log/nginx/error.log | tail -50
```

---

## Storage operations

### Check media volume usage

```bash
docker system df -v | grep sidhkofed_media
```

### List files in the media volume

```bash
docker run --rm -v sidhkofed_media:/data:ro alpine ls -la /data/
```

### Migrate from local storage to S3

```bash
# 1. Set STORAGE_PROVIDER=s3 and S3_* variables in .env.prod
# 2. Sync existing files to S3
docker run --rm \
  -v sidhkofed_media:/data:ro \
  --env-file .env.prod \
  amazon/aws-cli s3 sync /data/ s3://${S3_BUCKET_NAME}/

# 3. Restart the api
docker compose -f docker-compose.prod.yml up -d --no-deps api
```

---

## Maintenance mode

To serve a maintenance page while the system is offline:

```nginx
# Add to nginx.conf server block:
location / {
    return 503 "Service temporarily unavailable — maintenance in progress";
    add_header Content-Type text/plain;
}
error_page 503 /503.html;
```

Alternatively, replace upstream targets with a static page server.

---

## Updating dependencies

```bash
# Backend
npm update
npx prisma generate
npm test
git add package-lock.json package.json
git commit -m "chore: update backend dependencies"

# Admin
cd admin && npm update
cd web && npm update
```

Run CI before pushing. Never update dependencies directly on the production server.

---

## Log rotation

Docker's `json-file` log driver is configured with:
- `max-size: 20m` — rotate when log file reaches 20 MB
- `max-file: 5` — keep 5 rotated files (100 MB total per container)

No manual log rotation is required.

---

## TLS certificate renewal

```bash
# Test renewal (dry run)
certbot renew --dry-run

# Manual renewal
certbot renew

# The deploy hook (/etc/letsencrypt/renewal-hooks/deploy/sidhkofed.sh)
# copies certs to nginx/ssl/ and reloads Nginx automatically.
```

Check certificate expiry:

```bash
openssl x509 -enddate -noout -in nginx/ssl/fullchain.pem
```

---

## Scaling considerations

SIDHKOFED CMS runs as a single-server deployment. If traffic grows beyond what a single server can handle:

1. **Vertical scaling first**: increase server CPU/RAM and adjust Docker resource limits in `docker-compose.prod.yml`.
2. **Read replicas**: add a PostgreSQL read replica for the API's read-heavy queries.
3. **S3 for media**: switch `STORAGE_PROVIDER=s3` and serve media via a CDN.
4. **Horizontal scaling**: running multiple API instances behind Nginx requires a shared Redis session store and shared media storage (S3) — both are already supported by the application.

---

## Common troubleshooting

| Symptom | First check | Command |
|---------|------------|---------|
| `/ready` returns 503 | postgres/redis health | `docker compose ps` |
| Login returns 401 | JWT_SECRET mismatch | `docker inspect sidhkofed-api \| grep JWT` |
| File upload fails | Storage path/permissions | `docker exec sidhkofed-api ls -la /app/storage` |
| Admin/web shows blank | Next.js build missing | `docker logs sidhkofed-admin` |
| Nginx 502 | Backend container down | `docker compose ps api` |
| High memory on api | Memory limit too low | `docker stats sidhkofed-api` |
| Slow DB queries | Missing indexes | `EXPLAIN ANALYZE <query>` in psql |

---

## Contact and escalation

| Role | Responsibility |
|------|---------------|
| On-call engineer | First responder for SEV-1/2 |
| Backend lead | Escalation for API/DB issues |
| DevOps | Infrastructure, Docker, Nginx, TLS |
| Security | Credential rotation, vulnerability response |

See [disaster-recovery.md](disaster-recovery.md) for incident response procedures.
