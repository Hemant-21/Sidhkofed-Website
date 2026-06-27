# SIDHKOFED CMS — Remaining Risks

**Version:** 1.0.0  
**Date:** 2026-06-27  

---

## Risk Matrix

| ID | Risk | Likelihood | Impact | Score | Status |
|----|------|-----------|--------|-------|--------|
| R-01 | Production SMTP failure | Medium | Low | Medium | Mitigated |
| R-02 | Single-server hardware failure | Low | High | Medium | Mitigated |
| R-03 | Disk space exhaustion | Low | High | Medium | Mitigated |
| R-04 | Large image upload performance | Low | Medium | Low | Accepted |
| R-05 | Dependency vulnerability | Medium | Medium | Medium | Mitigated |
| R-06 | JWT secret leak | Low | Critical | Medium | Mitigated |
| R-07 | Database corruption | Very Low | Critical | Low | Mitigated |
| R-08 | SMTP credential brute force | Low | Medium | Low | Mitigated |
| R-09 | Rate limit bypass via proxy | Low | Medium | Low | Mitigated |
| R-10 | Content data entry error | Medium | Low | Low | Accepted |

---

## Detail

### R-01: Production SMTP Failure

**Likelihood:** Medium  
**Description:** The custom SMTP implementation may fail silently with non-standard SMTP server configurations.  
**Impact:** Enquiry notifications not delivered to operators. Enquiries are still saved to the database.  
**Mitigation:** Email failure is fail-open. Errors logged at ERROR level. Operators can view all enquiries in Admin CMS without email.  
**Action:** Verify SMTP before go-live. Replace with nodemailer in Phase 18.

---

### R-02: Single-Server Hardware Failure

**Likelihood:** Low (< 1% annualised for a modern cloud VM)  
**Description:** All services run on a single server. Hardware failure results in complete downtime.  
**Impact:** RTO up to 2 hours; RPO up to 24 hours (last backup).  
**Mitigation:** Nightly database and media backups with S3 offsite option. Documented disaster recovery procedure. Tested restore procedure.  
**Action:** Configure S3 backup to reduce RPO to < 1 hour via hourly schedule.

---

### R-03: Disk Space Exhaustion

**Likelihood:** Low (depends on media upload volume)  
**Description:** Media uploads accumulate on the `media` Docker volume. If disk fills, uploads fail and potentially crash the database if the data partition is shared.  
**Impact:** Service degradation or outage.  
**Mitigation:** Nginx enforces 64 MB per-file limit. Docker json-file logging limited (100 MB per container). Database backup prunes files older than 7 days; media backup prunes files older than 30 days.  
**Action:** Configure disk space alert at 75% utilisation. Consider migrating to S3 (`STORAGE_PROVIDER=s3`) for unbounded media storage.

---

### R-04: Large Image Upload Performance

**Likelihood:** Low  
**Description:** Without thumbnail generation, large original images (up to 64 MB) are served to all public website visitors.  
**Impact:** Slow page loads on mobile/slow connections for image-heavy pages.  
**Mitigation:** Editorial policy: upload appropriately-sized images. Nginx serves with immutable cache headers.  
**Action:** Image processing pipeline in Phase 18.

---

### R-05: Dependency Vulnerability

**Likelihood:** Medium (npm packages receive CVEs regularly)  
**Description:** A vulnerability may be discovered in one of the ~150 npm dependencies after release.  
**Impact:** Depends on severity and exploitability.  
**Mitigation:** `security.yml` GitHub Actions workflow runs `npm audit --audit-level=high` and Trivy container scans on schedule. SAST (Semgrep, CodeQL) catches common patterns.  
**Action:** Review and patch monthly, or immediately on CRITICAL CVEs. Configure Dependabot for automatic PRs.

---

### R-06: JWT Secret Leak

**Likelihood:** Low  
**Description:** If `JWT_SECRET` is compromised, all active sessions can be forged.  
**Impact:** Unauthorised admin access.  
**Mitigation:** `JWT_SECRET` is in `.env.prod` (never committed). Min 32 characters enforced at startup by Zod schema. Rotating requires restarting the API (all existing tokens invalidated immediately).  
**Action:** Store `.env.prod` in a secrets vault (HashiCorp Vault, AWS Secrets Manager, or equivalent). Rotate every 90 days.

---

### R-07: Database Corruption

**Likelihood:** Very Low (PostgreSQL is highly stable)  
**Description:** Filesystem corruption or abrupt container kill could corrupt the PostgreSQL data directory.  
**Impact:** Data loss; service outage.  
**Mitigation:** PostgreSQL WAL-based durability. Docker `restart: unless-stopped`. Nightly pg_dump backups (separate from the data directory).  
**Action:** Monitor `pgdata` volume health. Verify backup with `./scripts/backup.sh --verify` weekly.

---

### R-08: Rate Limit Bypass via Distributed Proxies

**Likelihood:** Low  
**Description:** Sophisticated attackers using distributed proxies (each from a different IP) could bypass per-IP rate limits.  
**Impact:** Enquiry spam; possible database growth.  
**Mitigation:** CAPTCHA on enquiry submission provides a second layer that is not bypassable by IP rotation. Email deduplication also applies.  
**Action:** Enable CAPTCHA (`CAPTCHA_PROVIDER=recaptcha` or `hcaptcha`) in production.

---

### R-09: Rate Limit Bypass via Trusted Proxy Header Spoofing

**Likelihood:** Low  
**Description:** If `TRUST_PROXY` is set incorrectly, an attacker could spoof `X-Forwarded-For` headers and bypass rate limiting.  
**Impact:** Rate limit evasion.  
**Mitigation:** Nginx terminates connections and sets `X-Real-IP`; Express trusts exactly one proxy hop.  
**Action:** Verify `TRUST_PROXY` value matches the Docker network topology (default: `1`).

---

### R-10: Content Data Entry Error

**Likelihood:** Medium (human error is always possible)  
**Description:** Editors may publish incorrect, outdated, or misleading content.  
**Impact:** Reputational risk; public misinformation.  
**Mitigation:** Publish lifecycle (draft → review → publish) with separate Content Editor and Publisher roles. Audit log records all mutations. Published records can be unpublished quickly.  
**Action:** Editorial policy: Publisher reviews all content before publishing.

---

## Risk Register Maintenance

This register should be reviewed:
- Before each major deployment
- After any security incident
- Quarterly by the operations lead

Update `Likelihood` and `Status` fields as mitigations are applied or new risks emerge.
