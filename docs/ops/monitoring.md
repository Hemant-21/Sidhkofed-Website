# SIDHKOFED CMS — Monitoring

## Health endpoints

The backend API exposes three health endpoints (no authentication required):

| Endpoint | Meaning | Response |
|----------|---------|---------|
| `GET /live` | Liveness — process is running | `200 { "status": "ok" }` |
| `GET /ready` | Readiness — DB + Redis reachable | `200` / `503` |
| `GET /health` | Full aggregate with per-dep detail | JSON object |

### Example `/health` response

```json
{
  "success": true,
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2026-06-27T10:00:00.000Z",
  "dependencies": {
    "database": { "status": "healthy", "latencyMs": 2 },
    "redis":    { "status": "healthy", "latencyMs": 1 }
  }
}
```

Status is `"degraded"` if a non-critical dependency is slow/unavailable, `"unhealthy"` if a critical dependency fails.

---

## Structured logging

All application logs are emitted as JSON to stdout, captured by Docker's `json-file` log driver, and are accessible via:

```bash
# Live tail
docker compose -f docker-compose.prod.yml logs -f api

# Last 500 lines with timestamps
docker compose -f docker-compose.prod.yml logs --tail=500 --timestamps api
```

### Log fields

| Field | Type | Description |
|-------|------|-------------|
| `level` | string | `info`, `warn`, `error`, `debug` |
| `time` | ISO 8601 | Timestamp |
| `msg` | string | Human-readable message |
| `reqId` | string | Unique per-request ID |
| `method` | string | HTTP method |
| `url` | string | Request path (no query params on sensitive endpoints) |
| `statusCode` | number | HTTP response code |
| `responseTime` | number | ms to first byte |
| `userId` | string | Authenticated user ID, or null |
| `err` | object | Error details (stack, code) — error level only |

### Log levels

| Environment | Minimum level |
|-------------|--------------|
| `development` | `debug` |
| `production` | `info` |

---

## Key metrics to monitor

### Infrastructure metrics (Prometheus / node_exporter)

| Metric | Alert threshold |
|--------|----------------|
| CPU usage | > 80% sustained 5 min |
| Memory usage | > 85% |
| Disk usage | > 80% |
| Disk I/O wait | > 20% sustained 5 min |

### Application metrics (derive from logs)

| Metric | How to measure | Alert |
|--------|---------------|-------|
| API error rate (5xx) | `statusCode >= 500` / total req/min | > 1% |
| API p99 latency | `responseTime` 99th percentile | > 2000ms |
| Auth failure rate | `POST /api/v1/auth/login` 401 | > 10/min from same IP |
| DB connection errors | log `"database"` level error | any |
| Redis connection errors | log `"redis"` level error | any |
| Readiness check failures | `GET /ready` 503 | any |

### Database metrics

| Metric | Alert |
|--------|-------|
| Active connections | > 80% of `DB_POOL_MAX` |
| Long-running queries | > 30s |
| Table bloat | > 20% dead tuple ratio |
| Replication lag | > 30s (if replica configured) |

---

## Monitoring stack options

### Minimal (log-based — included by default)

Docker's built-in `json-file` log driver + manual log inspection.

```bash
# Count 5xx errors in the last hour
docker logs sidhkofed-api --since 1h 2>&1 | \
  jq -r 'select(.statusCode >= 500) | .statusCode' | wc -l
```

### Recommended (external stack)

```
Docker containers
     │ logs (stdout)
     ▼
Promtail → Loki → Grafana
     │
     └─ node_exporter → Prometheus → Grafana
```

**Add to docker-compose.prod.yml:**

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.53.0
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - promdata:/prometheus
    networks: [backend]

  grafana:
    image: grafana/grafana:11.1.0
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    ports: ["3000:3000"]
    volumes:
      - grafdata:/var/lib/grafana
    networks: [backend]

volumes:
  promdata:
  grafdata:
```

---

## Alert matrix

| Alert | Severity | Response |
|-------|----------|---------|
| `GET /ready` returns 503 | CRITICAL | Database or Redis is down — see DR plan |
| 5xx rate > 1% for 5 min | HIGH | Check api logs for stack traces |
| API p99 > 2s for 5 min | MEDIUM | Check slow DB queries, Redis hit rate |
| Disk > 80% | MEDIUM | Prune Docker images / extend volume |
| Memory > 85% | MEDIUM | Scale container memory limit |
| Backup cron missing | HIGH | Check `/var/log/sidhkofed-backup.log` |
| TLS cert expiry < 14 days | HIGH | Renew via Certbot |
| npm audit finds CRITICAL CVE | HIGH | Patch and redeploy within 24h |

---

## Uptime monitoring (external)

Use an external uptime monitor (UptimeRobot, Better Uptime, Freshping) to probe:

- `https://yourdomain.com/ready` — HTTP 200 check every 60s
- `https://yourdomain.com/` — HTTP 200 check every 60s
- `https://yourdomain.com/admin/` — HTTP 200 check every 5 min

Configure alerts to page on-call when check fails for 2 consecutive probes.
