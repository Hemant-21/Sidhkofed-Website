# SIDHKOFED CMS — Version Manifest

**Release:** v1.0.0  
**Date:** 2026-06-27  
**Git Branch:** v1  
**Git SHA (Phase 17.4):** a8ef1dc  

---

## Application Versions

| Component | Current Version | Target Tag |
|-----------|----------------|-----------|
| Backend API (`package.json`) | 0.1.0 → **1.0.0** | v1.0.0 |
| Admin CMS (`admin/package.json`) | 0.1.0 → **1.0.0** | v1.0.0 |
| Public Website (`web/package.json`) | 0.1.0 → **1.0.0** | v1.0.0 |

> **Action required:** Bump all three `package.json` files to `1.0.0` and create git tag `v1.0.0` before publishing Docker images.

---

## Infrastructure Versions

| Component | Version |
|-----------|---------|
| Node.js | 20.x LTS (Alpine) |
| PostgreSQL | 16-alpine |
| Redis | 7-alpine |
| Nginx | 1.27-alpine |
| Docker Engine | 24+ |
| Docker Compose | V2 (plugin) |

---

## Key Dependency Versions

### Backend (`package.json`)
| Package | Purpose |
|---------|---------|
| express ~4.x | Web framework |
| @prisma/client ^6.x | Database ORM |
| prisma ^6.x | ORM CLI + migrations |
| zod ^3.x | Schema validation |
| jsonwebtoken ^9.x | JWT signing/verification |
| bcryptjs ^2.x | Password hashing |
| helmet ^8.x | Security headers |
| pino ^9.x | Structured logger |
| ioredis ^5.x | Redis client |

### Admin CMS (`admin/package.json`)
| Package | Purpose |
|---------|---------|
| next ^14.x | React framework (App Router) |
| react ^18.x | UI library |
| @tanstack/react-query ^5.x | Server state management |
| react-hook-form ^7.x | Form state management |
| zod ^3.x | Form validation schemas |
| axios ^1.x | HTTP client |
| lucide-react ^0.x | Icon library |
| tailwindcss ^3.x | Utility CSS framework |

### Public Website (`web/package.json`)
| Package | Purpose |
|---------|---------|
| next ^14.x | React framework (App Router + ISR) |
| react ^18.x | UI library |
| tailwindcss ^3.x | Utility CSS framework |

---

## Database Schema Version

| Item | Value |
|------|-------|
| Migration files | 21 |
| First migration | `20260624120000_init_identity_governance` |
| Latest migration | (see `prisma/migrations/` directory) |
| Prisma models | 62 |

---

## Acceptance Phase Versions

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 17.4 | DevOps, Infrastructure & Production Deployment | ✅ Complete (commit: a8ef1dc) |
| Phase 17.5 | Production Acceptance, UAT & Go-Live Certification | ✅ Complete (2026-06-27) |

---

## Docker Image Tags

Images built from this release should be tagged:

```
ghcr.io/sidhkofed/api:1.0.0
ghcr.io/sidhkofed/api:latest
ghcr.io/sidhkofed/admin:1.0.0
ghcr.io/sidhkofed/admin:latest
ghcr.io/sidhkofed/web:1.0.0
ghcr.io/sidhkofed/web:latest
```

The `release.yml` GitHub Actions workflow auto-generates `{branch}-{sha_short}` tags for CI. Manual semantic version tags (`1.0.0`) should be applied from the `v1.0.0` git tag.

---

## Checklist

- [ ] `package.json` bumped to `1.0.0`
- [ ] `admin/package.json` bumped to `1.0.0`
- [ ] `web/package.json` bumped to `1.0.0`
- [ ] Git tag `v1.0.0` created
- [ ] Docker images built and pushed with `1.0.0` tag
- [ ] `CHANGELOG.md` (or release notes) published to GitHub Releases
