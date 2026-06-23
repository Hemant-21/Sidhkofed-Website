# SIDHKOFED Infra And Implementation Handover

## Project Context

SIDHKOFED is being repositioned from a static government-style information site
into a modern, bilingual, public-facing cooperative ecosystem platform for
Jharkhand. The product brief emphasizes clarity, dashboard-like visibility,
public transparency, buyer/cooperative access pathways, capacity building,
procurement, and future ERP/MIS integration.

The active repository for this implementation is `D:\Sidhkofed-Website`.
Earlier planning material referenced `D:\Sidhkofed 2404`; treat that as a stale
or alternate path until the user confirms otherwise.

## Current State

This repository initially contained only:

- `README.md`
- `.gitignore`

No legacy PHP app, admin CMS, MySQL/MariaDB dump, uploads/media directory, or
deployment configuration was present in this workspace during Sprint 0.

## Target Product Shape

The platform should behave as:

- A public institutional dashboard.
- A cooperative ecosystem gateway.
- A governance and transparency portal.
- A bilingual content platform.
- An ERP/MIS-ready frontend, without forcing ERP integration into phase 1.

It should not behave as:

- A PDF dump portal.
- A static brochure site.
- A cluttered government notice board.
- A clone of old NIC-style table-heavy layouts.

## Stack Decision

The stack is intentionally not final yet.

Use the static prototype in this repo for stakeholder review, then decide after
legacy/content audit:

- Prefer Django + Wagtail if the dominant need is CMS publishing, editor
  workflows, bilingual content management, documents, notices, tenders, and
  government-style governance content.
- Prefer Next.js if the dominant need is a highly interactive frontend with a
  separate headless CMS/API layer.
- Avoid a hybrid architecture unless both editorial depth and advanced frontend
  interactivity are confirmed requirements.

CMS scope is now defined in `docs/sidhkofed-cms-codex-context.md`, mirrored from
the shared OneDrive context. Treat it as the canonical CMS behavior document.
The CMS should remain lightweight and public-website focused, with reusable
operations for events/news, documents, communications, tenders, procurement
updates, pages, media, enquiries, dashboard data, masters, users, settings, and
audit log. It must not become ERP, MIS, inventory, accounting, procurement
transaction, beneficiary, or training-attendance software.

## Recommended Service Roles

Even if the first deployment starts small, preserve role separation in the
architecture:

- `LB/Public IP`: public ingress and reverse proxy.
- `APP-1`: application server.
- `APP-2`: optional second app node for HA/scale.
- `DB-1`: primary database server.
- `DB-2`: optional standby/failover node.
- `NFS-1`: shared media and document storage.
- `Redis-1`: cache, sessions, and background queue support when needed.

Public traffic should hit only the ingress/reverse proxy. App servers should
communicate privately with DB, shared storage, Redis, and future ERP/MIS
services. DB and NFS should not be public.

## Rollout Strategy

Phase 1:

- Static/reviewable public portal prototype.
- Confirm sitemap, homepage hierarchy, visual direction, and bilingual behavior.
- Keep data static or CMS-ready.

Phase 2:

- Choose backend/CMS stack after content and legacy audit.
- Implement the lightweight CMS scope defined in
  `docs/sidhkofed-cms-codex-context.md`, starting with Phase 1 modules:
  authentication/roles, masters, events/news, programme/scheme, toolkit,
  institutions, document centre, official communications, tenders, procurement
  updates, pages, menus, media, galleries, videos, enquiries, basic dashboard,
  search, settings, and audit log.

Phase 3:

- Add search, document governance, content workflows, admin roles, and upload
  handling.

Phase 4:

- Add dashboard data boundaries and future ERP/MIS API integrations.

## Operational Checklist

Before production deployment, verify:

- DNS and public IP mapping.
- Reverse proxy and TLS.
- App server environment variables and secrets.
- Database reachability from app servers.
- Firewall, subnet ACL, and upstream routing rules.
- Shared storage/NFS mount readiness for media/documents.
- Backup and restore validation.
- Admin login, uploads, public pages, notices, tenders, search, language switch,
  and forms.

Network troubleshooting rule:

If the DB service is listening and local firewall is open, but app connections
still time out, escalate to subnet routing, ACL, or upstream firewall review
instead of debugging only application code.

## Prompt For Future Codex Sessions

Use this document as the source of truth for the SIDHKOFED revamp context. Treat
the active implementation as an agile build of a bilingual, CMS-ready,
public-facing cooperative ecosystem platform. Preserve the distinction between
phase 1 public portal work and later ERP/MIS integration. Update this document
whenever stack, infrastructure, or deployment decisions change.
For CMS-specific behavior, read `docs/sidhkofed-cms-codex-context.md` first and
use `docs/cms-integration-conventions.md` as the compact implementation naming
guide.
