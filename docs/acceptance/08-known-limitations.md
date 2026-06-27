# SIDHKOFED CMS — Known Limitations

**Version:** 1.0.0  
**Date:** 2026-06-27

---

## Summary

The following limitations are known at time of v1.0.0 release. None are production blockers. All are either by design (scoped out of Phase 1), deferred to Phase 18, or require production-environment verification.

---

## L-1: Image Thumbnail Generation (Deferred)

**Description:** Uploaded images are stored and served at their original resolution. Thumbnail variants are not auto-generated on upload.

**Impact:** Large original images are served to all clients regardless of display size. This may affect page load performance for image-heavy pages on slow connections.

**Root cause:** Deferred by design to keep Phase 1 scope contained. TODO markers in `src/modules/media/media.validation.ts`.

**Workaround:** Editors should upload appropriately-sized images (max 64 MB; Nginx enforces limit). Recommended: resize before upload.

**Resolution:** Phase 18 — add Sharp.js image processing pipeline to generate thumbnail, medium, and full variants on upload.

---

## L-2: Image EXIF/Metadata Stripping (Deferred)

**Description:** EXIF metadata (GPS coordinates, camera make/model, timestamps) is not stripped from uploaded images.

**Impact:** Published images may contain private metadata visible to public users who download them.

**Root cause:** Deferred alongside L-1.

**Workaround:** Editors should strip metadata before upload using a tool such as ExifTool.

**Resolution:** Phase 18 — integrate Sharp.js pipeline (same as L-1); `sharp(input).withMetadata(false)` removes EXIF on process.

---

## L-3: Email Transport (Custom SMTP, Unverified with Production Credentials)

**Description:** The enquiry notification email service uses a custom minimal SMTP client built on Node.js `node:tls` and `node:net` built-in modules rather than the `nodemailer` library.

**Impact:** The implementation is functional and passes unit tests, but has not been end-to-end tested with a production SMTP server. Edge cases in SMTP server handshake responses (non-standard line endings, multi-line EHLO responses, STARTTLS upgrade) may cause silent failure.

**Root cause:** `nodemailer` was not included in the original dependency list. A minimal implementation was built to avoid adding an unplanned dependency.

**Workaround:** Email failure is fail-open — enquiry submission succeeds regardless. Failed emails are logged at ERROR level.

**Action required before go-live:** Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_ENQUIRY_RECIPIENT`, `EMAIL_ENABLED=true` in `.env.prod`, submit a test enquiry, and confirm email arrives.

**Resolution:** Phase 18 — replace custom SMTP with `nodemailer` transport. Public interface (`sendEnquiryNotification`) unchanged.

---

## L-4: Integration Tests Skip in CI

**Description:** 111 of 979 tests are marked as integration tests and skip automatically in CI (they require live PostgreSQL + Redis connections).

**Impact:** Integration behaviour (real DB queries, Redis commands, cross-module data flows) is not verified in the unit-test CI job.

**Root cause:** By design — integration tests require a seeded database and cannot run in a lightweight CI environment without a persistent test DB.

**Workaround:** Integration tests are covered by:
1. The staging smoke test in `release.yml` (probes `/ready` and `/health`)
2. Manual integration test runs on the staging environment

**Resolution:** Phase 18 — add a dedicated integration test CI job with a fresh PostgreSQL + Redis service container (similar to the backend service containers already in `ci.yml`).

---

## L-5: No Automated WCAG AA Browser Validation

**Description:** Accessibility compliance (WCAG 2.1 AA) has been validated by structural code review only. No automated browser-level accessibility test (axe-core, Playwright + aria-query) runs in CI.

**Impact:** Dynamic accessibility issues (focus traps, ARIA live regions, screen reader announcements) are not automatically verified.

**Workaround:** All components use semantic HTML, ARIA labels, visible focus states, and accessible colour contrast tokens. Structural review indicates conformance.

**Resolution:** Phase 18 — add `@axe-core/playwright` to the E2E test suite.

---

## L-6: Single-Server Deployment

**Description:** v1.0.0 is architected for a single-server Docker Compose deployment. There is no multi-host clustering, load balancer pool, or database replication.

**Impact:** Maintenance windows require brief downtime. Hardware failure of the single server triggers a full disaster recovery scenario (RTO < 2h).

**Root cause:** By design for Phase 1 (single-server is appropriate for expected traffic volume).

**Workaround:** Regular nightly backups with S3 offsite. RTO < 2h documented in disaster recovery guide.

**Resolution:** Phase 18+ — S3 media (already supported), PostgreSQL read replica, horizontal API scaling. All prerequisites are architecturally supported.

---

## L-7: No Real-Time Notifications

**Description:** The Admin CMS has no real-time push notifications (WebSockets, SSE) for events such as new enquiry submissions.

**Impact:** Editors must manually refresh the enquiries page to see new submissions.

**Resolution:** Phase 18 — WebSocket or SSE notification channel for enquiry alerts.

---

## L-8: Package Versions at 0.1.0

**Description:** `package.json` versions across all three workspaces are `0.1.0` at time of code freeze.

**Action required:** Bump to `1.0.0` in `package.json`, `admin/package.json`, and `web/package.json` before creating the `v1.0.0` git tag.
