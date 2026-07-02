# SIDHKOFED CMS — Deployment Guide

## Architecture overview

```
Internet
   │
   ▼
Nginx :80/:443  ─────────────────────────────────┐
   │                                             │
   ├── /api/*          → api:4000 (Express)      │  proxy
   ├── /admin/*        → admin:3001 (Next.js)    │  network
   ├── /               → web:3002 (Next.js)      │
   └── /files/*        → media volume (local)    │
                                                 │
api:4000  ──────── postgres:5432   ──────────────┘
          └──────── redis:6379      backend network
```

All five application containers share an **internal backend network** that has no direct internet access. Only Nginx is published on host ports 80/443.

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker Engine | 25.0 |
| Docker Compose plugin | 2.24 |
| Git | 2.x |
| curl | any |
| openssl | any (for TLS) |

---

## First-time server setup

```bash
# 1. Install Docker (Debian/Ubuntu)
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# 2. Clone the repository
git clone https://github.com/sidhkofed/sidhkofed-cms.git /opt/sidhkofed
cd /opt/sidhkofed

# 3. Create the production environment file
cp .env.example .env.prod
# Edit every variable — there are no defaults for secrets.
nano .env.prod

# 4. Create the TLS certificate directory
mkdir -p nginx/ssl
# Place your certificate chain and private key:
#   nginx/ssl/fullchain.pem
#   nginx/ssl/privkey.pem
# (Let's Encrypt: see TLS section below)

# 5. Create the backup directory
mkdir -p /opt/sidhkofed/backups
```

---

## TLS certificate provisioning (Let's Encrypt / Certbot)

```bash
# Install Certbot standalone mode (before starting Nginx)
apt install certbot -y
certbot certonly --standalone -d yourdomain.com

# Copy to the expected paths
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/fullchain.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   nginx/ssl/privkey.pem

# Auto-renew hook (add to /etc/letsencrypt/renewal-hooks/deploy/)
cat > /etc/letsencrypt/renewal-hooks/deploy/sidhkofed.sh <<'EOF'
#!/bin/bash
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/sidhkofed/nginx/ssl/fullchain.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   /opt/sidhkofed/nginx/ssl/privkey.pem
docker exec sidhkofed-nginx nginx -s reload
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/sidhkofed.sh
```

Then **uncomment the TLS server block** in [nginx/nginx.conf](../../nginx/nginx.conf) and remove the plain HTTP block.

---

## Building Docker images

Images are built in CI and published to GHCR. To build locally:

```bash
# Backend API
docker build -t ghcr.io/sidhkofed/api:local .

# Admin CMS
docker build -t ghcr.io/sidhkofed/admin:local ./admin

# Public Website
docker build -t ghcr.io/sidhkofed/web:local ./web
```

---

## First deployment

```bash
cd /opt/sidhkofed

# Pull all images
IMAGE_TAG=latest docker compose -f docker-compose.prod.yml pull

# Start infrastructure first (postgres + redis)
docker compose -f docker-compose.prod.yml up -d postgres redis

# Wait for postgres to be healthy
docker compose -f docker-compose.prod.yml ps postgres

# Run migrations (creates schema on first run)
docker compose -f docker-compose.prod.yml run --rm migrate

# Start everything
docker compose -f docker-compose.prod.yml up -d

# Verify all containers are healthy
docker compose -f docker-compose.prod.yml ps
```

---

## Rolling update (zero-downtime)

```bash
cd /opt/sidhkofed
export IMAGE_TAG=main-abc1234   # the tag from CI

# 1. Take a pre-deployment backup
./scripts/backup.sh

# 2. Pull new images
docker compose -f docker-compose.prod.yml pull api admin web

# 3. Run migrations (idempotent — safe to run even if no schema changes)
docker compose -f docker-compose.prod.yml run --rm migrate

# 4. Replace containers one at a time (nginx keeps serving during each restart)
docker compose -f docker-compose.prod.yml up -d --no-deps --wait api
docker compose -f docker-compose.prod.yml up -d --no-deps --wait admin
docker compose -f docker-compose.prod.yml up -d --no-deps --wait web

# 5. Verify
curl -sf http://localhost/ready | jq .
```

The `--wait` flag causes `compose up` to block until the container's health check is healthy.

---

## Rollback

```bash
cd /opt/sidhkofed
export IMAGE_TAG=main-previous-sha   # the previous known-good tag

# If migrations were applied and are backward-incompatible, restore DB first:
./scripts/restore.sh --latest

# Pull the previous images
docker compose -f docker-compose.prod.yml pull api admin web

# Redeploy
docker compose -f docker-compose.prod.yml up -d --no-deps api admin web
```

If you cannot restore to a clean state with the previous image, see [disaster-recovery.md](disaster-recovery.md).

---

## Environment variable management

- Never commit `.env.prod` to git.
- Store the production `.env.prod` in a secrets vault (e.g. HashiCorp Vault, AWS SSM Parameter Store, or Bitwarden Secrets Manager) and pull it to the server during the deploy step.
- Rotate `JWT_SECRET` and `IP_HASH_SALT` by updating `.env.prod` and restarting `api`. Existing JWT sessions will be invalidated on rotation — plan for a maintenance window.

---

## Viewing logs

```bash
# All containers (last 100 lines, follow)
docker compose -f docker-compose.prod.yml logs --tail=100 -f

# API only
docker compose -f docker-compose.prod.yml logs -f api

# Nginx access log
docker exec sidhkofed-nginx tail -f /var/log/nginx/access.log
```

---

## Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /live` | Liveness — returns 200 if the process is running |
| `GET /ready` | Readiness — checks DB + Redis connectivity |
| `GET /health` | Aggregate JSON with per-dependency detail |

---

## Stopping and starting

```bash
# Graceful stop (SIGTERM → containers drain in-flight requests)
docker compose -f docker-compose.prod.yml stop

# Restart without destroying volumes
docker compose -f docker-compose.prod.yml start

# Remove containers + networks (volumes preserved)
docker compose -f docker-compose.prod.yml down
```

---

## Automated backups via cron

```bash
# Run backup daily at 02:00 AM server time
crontab -e
# Add:
0 2 * * * /opt/sidhkofed/scripts/backup.sh >> /var/log/sidhkofed-backup.log 2>&1
```
