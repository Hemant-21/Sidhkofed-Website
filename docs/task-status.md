# SIDHKOFED Website — Task Status
_Last verified: 2026-06-30 by repo audit_

## ✅ DONE — Backend, Admin & CMS (Tasks 1–13)
- 886 backend tests green, 320 admin tests green
- All data seeds: districts, blocks, institution types, memberships (24 DUs + apex)
- RBAC, auth, all API modules, admin UI fixes (padding, sidebar scroll/collapse, masters bug)
- Logos + favicon in place: `web/public/logo-sidhkofed.png`, `logo-jharkhand.png`, `favicon.png`

## ✅ DONE — Task 14: Membership Page Redesign
- `/membership` — full page: membership types, 5-step process, fee table, forms, member directory
- Member Directory: 3-level interactive tree (SIDHKOFED → 24 DU → 4,454 primary)
  - Click 4,454 → full-width accordion grid of 24 district cards
  - Implemented as `'use client'` `MemberHierarchy` component
- FAQ section (CMS-driven, `faq_category=membership`, `<details>` accordion, hidden when empty)
- Membership sub-menu removed from nav (direct link only)
- ContactCta removed from page

## ✅ DONE — Task 15: Web Cleanup
- `web/src/lib/api/menus.ts` deleted
- `MenuItem`, `PageDetail` types removed
- `menus`, `pages` endpoints removed
- `pages/[slug]/` catch-all route deleted
- `layout.tsx` no longer fetches menus
- **Correction (2026-07-01):** this was originally marked done but 4 files survived the
  cleanup (`pages/[slug]/page.tsx`, `lib/api/menus.ts`, `components/details/cms-page.tsx`,
  `components/layout/menu-link.tsx`), still referencing the deleted `PageDetail`/`MenuItem`
  types and `PUBLIC_ENDPOINTS.pages`/`.menus`. Found via a real `tsc --noEmit` run (not the
  IDE's stale hints) while working on an unrelated Publications fix. All 4 deleted, no
  remaining references, `web/` now type-checks clean.

## ✅ DONE — Tasks 16–21: Route Restructure + Sub-pages
All routes moved and sub-pages built:

| Old path | New path | Status |
|---|---|---|
| `/dashboard` | `/impact/dashboard` | ✓ |
| `/tenders` | `/notifications/tenders` | ✓ |
| `/official-communications` | `/notifications/notices` | ✓ |
| `/knowledge-centre` | `/publications` | ✓ |
| `/memberships` | `/membership` | ✓ |
| `/procurement-updates` | `/procurement/announcements` | ✓ |

Sub-pages built:
- `/procurement/announcements`, `/upcoming`, `/enquiry`
- `/impact/dashboard`, `/training-beneficiaries`
- `/publications/reports-research`, `/policies-guidelines-sops`, `/training-materials`, `/forms-formats`, `/media`
- `/notifications/notices`, `/tenders`
- `/about/vision-mission-objectives-functions`, `/organisation-governance`

Redirects in `web/next.config.mjs`: 6 old-path → new-path redirects ✓  
`viewAllHref` values in `app/page.tsx` updated to new paths ✓  
`parentCrumbs` added to moved listing pages ✓  
Dictionary key mismatches in pages resolved ✓

## ✅ DONE — Phase 5: Branding
- SIDHKOFED logo + Jharkhand govt logo in site header and footer
- Favicon updated
- Theme toggle (`theme-toggle.tsx`) in header

## ✅ DONE — Phase 6: Bug Fixes
- `@tailwindcss/typography` installed and wired in `tailwind.config.ts`
- `event_type_slug` → `event_type` fixed in all activities sub-pages
- Admin RBAC test updated (`'System Settings'`, `'Restricted to Super Admin'`)
- Document payload test fixed (`.toBe('2026-05-01')` not ISO timestamp)
- Dark mode CSS variables in `globals.css`

## ✅ DONE — Phase 7: Homepage Redesign
- `HeroSearch` rewritten: split 2-col, `hero-cooperative.png`, stat chips, carousel
- `QuickLinks` component: numbered 9-item grid
- Homepage section order: Hero → KPI Strip → Quick Links → (further sections)
- `hero-cooperative.png` in `web/public/`

## ✅ DONE — Task 22: Orphaned Membership Sub-pages Deleted
Deleted 5 route folders: `membership/sidhkofed`, `district-unions`, `directory`, `process`, `faqs`.
Only `membership/page.tsx` remains.

## ✅ DONE — Task 23: Final Audit
- `npx tsc --noEmit` clean on all 3 packages (web, admin, backend)
- Sitemap updated: removed 5 dead membership sub-pages, added `/privacy-policy` and `/disclaimer`
- Footer nav `/pages/privacy-policy` and `/pages/disclaimer` updated to `/privacy-policy` and `/disclaimer`
- Static `/privacy-policy` and `/disclaimer` pages created (prose layout, same header pattern)
- No stale references to old route paths found in code
- All primary nav hrefs verified against existing route folders

## ✅ DONE — Publications Improvements (2026-07-01)
- Publications dropdown removed from primary nav (`web/src/config/navigation.ts`) — now a
  direct link to `/publications`; the "Browse by Category" cards on the index page replace
  the old sub-menu
- **Bug fixed — category cards led to empty listings:** sub-pages were filtering with both
  the wrong query-param key (`knowledge_category_slug` instead of the backend-accepted
  `knowledge_category`) and the wrong slug values (short guesses like `'reports'` instead of
  the real `slugify()`-derived slugs, e.g. `research-and-reports`). Fixed in all 4 sub-pages
  (`reports-research`, `policies-guidelines-sops`, `training-materials`, `forms-formats`).
  Real DB slugs always come from `slugify(nameEn)` in `src/utils/slug.ts` — never assume a
  short hand-picked slug.
- **Redesigned "Browse by Category" (2026-07-01, second pass):** an 8-card version was
  tried first but rejected — mixing query-param cards (stay on `/publications`) with
  dedicated-subpage cards (`/publications/training-materials`, a different `ListingLayout`
  page) made the UI feel inconsistent when clicking between cards. Per explicit user
  direction, narrowed to exactly 4 cards, all staying on the same `/publications` page via
  `?knowledge_category=<slug>#listing` (anchor-scrolls to the listing section instead of
  navigating away): Bye-laws, Training Resources, SOPs & Manuals, Media Gallery (the only
  one that links to a real separate page, `/publications/media`, since galleries/videos
  aren't documents). The `document_type` filter was also removed from the listing's
  `FilterBar` — category is now the only filter dimension on this page.
  `Container` (`web/src/components/ui/container.tsx`) gained an optional `id` prop to
  support the `#listing` anchor target.
- The 4 dedicated sub-pages (`reports-research`, `policies-guidelines-sops`,
  `training-materials`, `forms-formats`) still exist and still work — they're linked from
  the homepage "Knowledge Hub" section and `sitemap.ts`, just no longer from Browse by
  Category.

## ⏸️ PAUSED — Media Gallery (`/publications/media`)
Still the static "coming soon" placeholder. Backend has `GET /public/galleries` (list +
slug detail, with `images[]`) and `GET /public/videos` (YouTube-only, thumbnail computed as
`https://i.ytimg.com/vi/{id}/hqdefault.jpg`). Web app has no `videos` endpoint entry, no
`GallerySummary` list-item type, no `Video` type yet — all still need to be added before
building this page out.

---

## 🔲 MANUAL CHECKS STILL NEEDED (browser only)
- Dark mode toggle works; all surfaces switch (header, cards, footer)
- Dark mode persists on refresh
- Old URLs redirect correctly (`/dashboard` → `/impact/dashboard`, etc.)
- Mobile nav drawer opens, accordions expand, CTA visible

---

## Notes
- Monorepo: `admin/` (CMS, port 3001), `web/` (public, port 3002), `src/` (Express 4, port 4000)
- `web/src/config/navigation.ts` — single source of truth for all nav (hardcoded, no CMS)
- FAQ filter param: `faq_category=membership` (NOT `category_slug`) — backend uses `faq_category`
- `MemberHierarchy` is `'use client'`; rest of `/membership/page.tsx` is server component
- `cn()` utility lives at `@/utils/cn` (not `@/lib/utils`)
- Slug for `<details>` peer: named groups `group/l2`, `peer/l3` etc. require Tailwind v3.2+
