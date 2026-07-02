# SIDHKOFED CMS — Technical Debt Register

**Version:** 1.0.0  
**Date:** 2026-06-27  

---

## Summary

| Severity | Count |
|----------|-------|
| High (production impact possible) | 1 |
| Medium (performance or maintainability) | 3 |
| Low (quality of life) | 4 |
| **Total** | **8** |

---

## TD-001 — Custom SMTP Client

**Severity:** High  
**Location:** `src/services/email.ts`  
**Description:** Enquiry notification emails are sent via a custom minimal SMTP implementation using Node.js `node:tls` and `node:net` built-in modules. While functional, the implementation handles only the most common SMTP handshake flows. Non-standard server responses, STARTTLS upgrade sequences, or multi-line EHLO responses could cause silent failure.  
**Risk:** Enquiry notification emails may silently fail on some SMTP providers.  
**Mitigation:** Failure is fail-open (enquiry submission succeeds); errors logged at ERROR level.  
**Resolution plan:** Phase 18 — replace with `nodemailer` transport. Public interface unchanged.  
**Effort:** 2–4 hours.

---

## TD-002 — Image Processing Not Implemented

**Severity:** Medium  
**Location:** `src/modules/media/media.validation.ts` (2 TODO comments)  
**Description:** Uploaded images are stored at full original resolution. No thumbnail generation, resizing, or metadata stripping occurs.  
**Risk:** Large images impact public page load time. EXIF metadata (GPS, timestamps) may be visible in downloaded files.  
**Mitigation:** Editors instructed to pre-resize images and strip metadata before upload.  
**Resolution plan:** Phase 18 — integrate Sharp.js; generate thumb/medium/full variants; strip metadata on ingest.  
**Effort:** 1–2 days.

---

## TD-003 — Integration Tests Skip in CI

**Severity:** Medium  
**Location:** All `*.integration.test.ts` files (111 tests)  
**Description:** Integration tests that exercise real PostgreSQL and Redis connections are excluded from the CI unit-test job. They require a live database to run.  
**Risk:** Regressions in database query logic or Redis behaviour are not caught until staging deployment.  
**Mitigation:** Staging smoke tests in `release.yml` provide a minimal integration check.  
**Resolution plan:** Phase 18 — add `integration-test` CI job with service containers.  
**Effort:** 4–8 hours.

---

## TD-004 — No E2E Test Suite

**Severity:** Medium  
**Location:** None (missing capability)  
**Description:** There is no automated end-to-end browser test suite (Playwright, Cypress) covering user journeys through the Admin CMS or Public Website.  
**Risk:** UI regressions are caught only by manual testing or by users in production.  
**Mitigation:** Unit test coverage (868 tests) covers business logic. Admin typecheck and lint catch structural regressions.  
**Resolution plan:** Phase 18 — Playwright E2E suite for critical paths: login, publish event, view on public site, submit enquiry.  
**Effort:** 3–5 days.

---

## TD-005 — Package Versions at 0.1.0

**Severity:** Low  
**Location:** `package.json`, `admin/package.json`, `web/package.json`  
**Description:** All three workspace packages are at `0.1.0`. Should be bumped to `1.0.0` before release.  
**Risk:** Misleading version information in deployed containers and npm registry.  
**Resolution plan:** Immediate — bump before git tag `v1.0.0`.  
**Effort:** 15 minutes.

---

## TD-006 — No Automated Accessibility Tests

**Severity:** Low  
**Location:** None (missing capability)  
**Description:** WCAG 2.1 AA compliance has been validated by structural code review only. No axe-core or Playwright accessibility scan runs in CI.  
**Risk:** Dynamic accessibility regressions (focus management, ARIA live regions) may not be caught automatically.  
**Mitigation:** All components use semantic HTML and ARIA patterns. Structural review confirms baseline conformance.  
**Resolution plan:** Phase 18 — `@axe-core/playwright` in E2E suite.  
**Effort:** 1 day.

---

## TD-007 — Email: No Acknowledgement to Enquirer

**Severity:** Low  
**Location:** `src/modules/enquiries/enquiries.service.ts`  
**Description:** The API spec (§6) explicitly states "no acknowledgement email to the user." This is a deliberate constraint but could be confusing to users who expect confirmation.  
**Risk:** Users may submit enquiries multiple times thinking the first one failed.  
**Mitigation:** The public enquiry form should display a clear success message after submission (frontend responsibility).  
**Resolution plan:** No change to API. Ensure public website enquiry form shows a confirmation message on successful 201 response.  
**Effort:** Frontend-only; 2–4 hours.

---

## TD-008 — Hardcoded Docker Network Names

**Severity:** Low  
**Location:** `docker-compose.prod.yml`, `nginx/nginx.conf`  
**Description:** Docker Compose project name defaults to directory name. If the deployment directory is renamed, internal hostnames (e.g. `api`, `postgres`) remain correct, but external container names (used in ops runbooks) may change.  
**Risk:** Ops runbook commands like `docker exec sidhkofed-api ...` may fail if project name changes.  
**Mitigation:** Document the project name in the deployment guide. Use `COMPOSE_PROJECT_NAME=sidhkofed` in `.env.prod`.  
**Resolution plan:** Add `COMPOSE_PROJECT_NAME=sidhkofed` to `.env.prod` and `.env.example`.  
**Effort:** 15 minutes.

---

## Debt Cleared in Phase 17.5

| ID | Description | Resolution |
|----|-------------|-----------|
| TD-B1 | 46 Admin CMS files with committed merge conflict markers | ✅ FIXED — all 46 files resolved; 0 TypeScript errors |
| TD-B2 | Admin typecheck via npm run typecheck reported 0 errors but masked 561 actual errors | ✅ FIXED — direct `npx tsc --noEmit` used; errors identified and resolved |
