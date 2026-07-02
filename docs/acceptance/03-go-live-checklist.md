# SIDHKOFED CMS — Go-Live Checklist

**Version:** 1.0.0  
**Date:** 2026-06-27  

Complete every item in order. Do not proceed to the next section unless all items in the current section are checked.

---

## Section 1 — Code and Build Verification

- [ ] All CI jobs green on the release branch (lint, typecheck, unit tests, Prisma validate)
- [ ] No `npm audit --audit-level=high` failures in any of the three workspaces
- [ ] `npx tsc --noEmit` exits 0 in all three workspaces (api, admin, web)
- [ ] Admin workspace: 0 lint errors (`cd admin && npm run lint`)
- [ ] Backend: 868 unit tests pass, 0 failures
- [ ] Prisma schema validates: `npx prisma validate`
- [ ] Docker images build locally for api, admin, web without errors
- [ ] All three Docker images pushed to GHCR with versioned tag (not only `latest`)
- [ ] Trivy scan complete — no CRITICAL CVEs in final image layers
- [ ] Package versions bumped to 1.0.0 in `package.json`, `admin/package.json`, `web/package.json`
- [ ] Git tag `v1.0.0` created and pushed

---

## Section 2 — Server Preparation

- [ ] Production server provisioned (Ubuntu 22.04 LTS **or Windows Server 2019/2022 with WSL2** — see `docs/ops/windows-server-deployment.md`; minimum 2+ vCPU, 4 GB RAM, 40 GB SSD)
- [ ] **If Windows Server:** WSL2 enabled with Ubuntu 22.04 installed (`wsl --install -d Ubuntu-22.04`); Docker Engine installed inside WSL2; Windows Firewall ports 80 and 443 opened
- [ ] Docker Engine and Docker Compose V2 installed (inside WSL2 on Windows)
- [ ] Firewall: ports 80 and 443 open; all other ports closed to internet
- [ ] Git repository cloned to `/opt/sidhkofed/` (inside WSL2 filesystem on Windows)
- [ ] `.env.prod` created from `.env.example` and populated with all production values
- [ ] `JWT_SECRET` is at least 32 random characters, unique to production
- [ ] `IP_HASH_SALT` is at least 8 random characters
- [ ] `POSTGRES_PASSWORD` is a strong random password (16+ chars)
- [ ] SMTP credentials configured and `EMAIL_ENABLED=true`
- [ ] `PUBLIC_WEBSITE_URL` set to the production domain
- [ ] `CAPTCHA_PROVIDER` configured (or set to `none` if not required)
- [ ] `STORAGE_PROVIDER` set (`local` or `s3`); if `s3`, credentials and bucket configured

---

## Section 3 — TLS and Nginx

- [ ] TLS certificate obtained (Let's Encrypt via Certbot, or commercial CA)
- [ ] Certificate placed at `nginx/ssl/fullchain.pem`
- [ ] Private key placed at `nginx/ssl/privkey.pem`
- [ ] HTTPS server block uncommented in `nginx/nginx.conf`
- [ ] HTTP → HTTPS redirect enabled in `nginx/nginx.conf`
- [ ] `docker exec sidhkofed-nginx nginx -t` passes without errors
- [ ] Certbot auto-renewal hook configured to reload Nginx on renewal

---

## Section 4 — Database Initialisation

- [ ] `docker compose -f docker-compose.prod.yml up -d postgres redis` (start DB first)
- [ ] Wait for postgres health check to pass: `docker compose ps`
- [ ] Run migrations: `docker compose -f docker-compose.prod.yml run --rm migrate`
- [ ] Verify: `docker compose -f docker-compose.prod.yml exec api npx prisma migrate status`
- [ ] Run seed (first deployment only): `docker compose -f docker-compose.prod.yml exec api node dist/db/seed.js`

---

## Section 5 — Service Launch

- [ ] `docker compose -f docker-compose.prod.yml up -d` (start all services)
- [ ] All containers reach healthy status: `docker compose -f docker-compose.prod.yml ps`
- [ ] `GET /live` returns 200
- [ ] `GET /ready` returns 200 (DB + Redis connected)
- [ ] `GET /health` returns `{"status":"healthy"}`
- [ ] Public website homepage loads without errors: `curl -sf https://yourdomain.com/`
- [ ] Admin CMS login page loads: `curl -sf https://yourdomain.com/admin/login`
- [ ] API public settings endpoint responds: `curl -sf https://yourdomain.com/api/v1/public/settings`

---

## Section 6 — First-Use Verification

- [ ] Log in to Admin CMS with superadmin credentials from seed
- [ ] **Change superadmin password immediately after first login**
- [ ] Submit a test enquiry from the public website
- [ ] Confirm enquiry appears in Admin CMS (Enquiries module)
- [ ] Confirm email notification received at `EMAIL_ENQUIRY_RECIPIENT`
- [ ] Upload a test media file; confirm it appears at `/files/<filename>`
- [ ] Create a draft event, publish it, verify it appears on the public website
- [ ] Check audit log shows the above actions

---

## Section 7 — Post-Launch Operations

- [ ] Automated backup scheduled:
  - **Linux / WSL2:** `0 2 * * * /opt/sidhkofed/scripts/backup.sh >> /var/log/sidhkofed-backup.log 2>&1` (crontab inside WSL2)
  - **Windows PowerShell:** Task Scheduler running `.\scripts\backup.ps1` daily at 02:00 (see `docs/ops/windows-server-deployment.md`)
- [ ] First backup completed and verified: `./scripts/backup.sh --verify` (or `.\scripts\backup.ps1 -Verify` on Windows)
- [ ] External uptime monitor configured (e.g. UptimeRobot on `GET /ready`)
- [ ] Alert for HTTP 5xx spike configured on Nginx logs
- [ ] Log retention policy confirmed (Docker json-file: max 20 MB × 5 files per container)
- [ ] Disaster recovery runbook location communicated to on-call team
- [ ] Support handover meeting scheduled with operations team

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| DevOps Engineer | | | |
| Product Owner | | | |
| Operations | | | |

**Go-Live authorised on:** _______________
