# CMS Review & Web Architecture Decisions — 2026-06-27

> **Session scope:** Architectural review of the Web ↔ CMS relationship, admin UI bug fixes,
> branding implementation, and scoping decisions for the next phase of development.
>
> **Status legend:** ✅ Done · 🔲 Pending · 🔁 Ongoing decision

---

## 1. Architectural Decision — Web / CMS Split

### Decision
The CMS transitions from a **page-builder** to a **pure headless data API**.
The web app takes full ownership of page layout, copy, and navigation.

### What stays in the CMS (data API)
- All structured records: Events, Tenders, Documents, News, Programmes, Toolkits,
  Institutions, Digital Services, KPIs, Masters / Taxonomies
- Media assets (images, videos, files) — fetched by web pages on demand
- FAQs — editors update these frequently; must remain CMS-editable
- Digital Services — external portal links change without code deploys
- Site Settings (contact details, social links, email config)
- Announcements / Banners — TBD

### What moves to web code
- All page layouts, templates, and written copy → JSX/HTML in web components
- Navigation links → hardcoded TypeScript config (no longer CMS menu items)
- Static pages (About Us, Vision & Mission, Contact, Policy pages) → proper `page.tsx` files

### What gets removed from the backend + admin
| Item | Backend | Admin screen |
|---|---|---|
| Pages module | `src/modules/pages/` + Prisma `Page` model | Pages nav entry + CRUD screens |
| Menus module | `src/modules/menus/` + Prisma `MenuItem` model | Menus nav entry + CRUD screens |
| Public routes | `/public/pages`, `/public/menus` | — |
| Web catch-all | — | `web/src/app/pages/[slug]/page.tsx` |

### Bilingual strategy
**next-intl** adopted for the web app.
- Static page copy → locale JSON files (`en.json`, `hi.json`)
- Dynamic CMS data → retains `_en` / `_hi` fields; web uses `pickText()` or next-intl interpolation

### Rollout order (user-confirmed)
1. **Navigation** — hardcode in web, remove CMS menu dependency
2. **Static pages** — write in JSX/HTML, wire next-intl
3. **Remove page builder** — delete Pages + Menus modules from backend and admin

> User will share a rough plan document for this rollout.

---

## 2. Phase Scope Change — Success Stories → Phase 1

Previously deferred to Phase 2. Confirmed moved to Phase 1.

### Current state
| Layer | State |
|---|---|
| Admin nav entry | ✅ Present |
| Admin page | ✅ Present — shows "Phase 2 coming soon" placeholder |
| Backend module (`src/modules/success-stories/`) | 🔲 Does not exist |
| Prisma `SuccessStory` model | 🔲 Does not exist |
| Search integration | 🔲 Parked — SQL ready in `prisma/parked-migrations/` |
| Admin feature screens | 🔲 Not built |
| Public web pages | 🔲 Not built |

### Build checklist
- [ ] Add `SuccessStory` Prisma model (fields per codex §4.9)
- [ ] Run base migration to create `success_stories` table
- [ ] Add `search_vector` GIN index in a **separate** migration after the base (use SQL from `prisma/parked-migrations/20260624154500_metadata_full_text_search/`)
- [ ] Add `success_story` to `content_type` allow-list in `src/modules/search/search.types.ts`
- [ ] Add surface fragment in `search.repository.ts`
- [ ] Build `src/modules/success-stories/` — routes, controller, service (follow events/programmes pattern)
- [ ] Mount admin + public routes in `src/routes/index.ts`
- [ ] Build `admin/src/features/success-stories/` — list, create, edit pages
- [ ] Build `web/src/app/success-stories/` — listing page + `[slug]` detail page
- [ ] Add seed records if needed

---

## 3. CMS Admin UI Fixes — Completed ✅

### Fix 1 — Main content area padding
**File:** `admin/src/components/navigation/admin-shell.tsx`
**Change:** Added `p-6` to `<main>` element. Was completely missing; affected every CMS page.

### Fix 2 — Masters: Reporting Periods + Financial Years ordering error
**Root cause:** `MasterList` always sent `ordering=display_order` as default, but these two
masters have `hasDisplayOrder: false` in the backend registry.

**Files changed:**
- `admin/src/features/masters/types.ts` — added `hasDisplayOrder?: boolean` and `defaultSort?: string`
  to `MasterTypeConfig`; set `hasDisplayOrder: false, defaultSort: 'label'` on `financial-years`
  and `hasDisplayOrder: false, defaultSort: 'start_date'` on `reporting-periods`
- `admin/src/features/masters/components/master-list.tsx` — reads `config.defaultSort ?? 'display_order'`
  for initial sort and API query; hides the Order column when `config.hasDisplayOrder === false`

### Fix 3 — Sidebar not scrollable
**File:** `admin/src/components/navigation/sidebar.tsx`
**Change:** Added `h-screen sticky top-0 overflow-hidden` to `<aside>`. The nav already had
`flex-1 overflow-y-auto`; it just needed the container to be height-constrained.

### Fix 4 — Sidebar collapsible sections
**File:** `admin/src/components/navigation/sidebar-nav.tsx` — full rewrite.

Behaviour:
- Each labelled section (CONTENT, GOVERNANCE & TRANSPARENCY, etc.) has a clickable header with a `ChevronDown` icon
- Collapsed sections hide their items; chevron rotates `-90deg`
- State persisted to `localStorage` under key `sidebar_sections`
- Icon-rail mode (`collapsed === true`) always shows all icons regardless of section collapse state
- The unlabelled overview section (Dashboard) is never collapsible

### Fix 5 — Official branding / logos
Image files added to `admin/public/` and `web/public/`:
- `logo-sidhkofed.png` — SIDHKOFED circular logo
- `logo-jharkhand.png` — Government of Jharkhand logo (web only)
- `favicon.png` — SIDHKOFED emblem (both apps)

**Files changed:**
| File | Change |
|---|---|
| `admin/src/components/navigation/brand.tsx` | Replaced `<Leaf>` icon placeholder with `<Image src="/logo-sidhkofed.png" />` |
| `web/src/components/layout/site-header.tsx` | SIDHKOFED logo left, Jharkhand Govt logo right; removed "SK" text placeholder |
| `web/src/components/layout/site-footer.tsx` | SIDHKOFED logo in identity column; removed "SK" text placeholder |
| `admin/src/app/layout.tsx` | Added `icons: { icon: '/favicon.png' }` to metadata |
| `web/src/app/layout.tsx` | Added `icons: { icon: '/favicon.png' }` to metadata |

---

## 4. CMS Masters — Review Findings

Reviewed all masters against codex §6. **No gaps found.**

| Master | Key | Status |
|---|---|---|
| Event Type | `event-types` | ✅ |
| Training Type | `training-types` | ✅ |
| Commodity | `commodities` | ✅ |
| Institution Type | `institution-types` | ✅ |
| Document Type | `document-types` | ✅ |
| Knowledge Centre Category | `knowledge-categories` | ✅ |
| Communication Type | `communication-types` | ✅ |
| Tender Type | `tender-types` | ✅ |
| Procurement Update Type | `procurement-update-types` | ✅ |
| Enquiry Type | `enquiry-types` | ✅ |
| FAQ Category | `faq-categories` | ✅ |
| Tags | `tags` | ✅ internal only |
| District | `districts` | ✅ seeded |
| Block | `blocks` | ✅ seeded |
| Financial Year | `financial-years` | ✅ |
| Reporting Period | `reporting-periods` | ✅ |

**Note:** Institution, Programme/Scheme, and Toolkit are correctly implemented as full content
modules rather than simple masters — their complexity (logos, URLs, item hierarchies) exceeds
what the generic master CRUD can handle.

---

## 5. Pending Tasks (Next Sessions)

### Immediate — CMS Admin
- 🔲 Build Success Stories module (see §2 checklist above)

### Web Architecture Rollout
- 🔲 Install and configure `next-intl` in the web app
- 🔲 Create `en.json` / `hi.json` locale files with static page copy
- 🔲 Hardcode navigation in web (replace CMS menu dependency)
- 🔲 Write static pages as `page.tsx` files (About, Contact, Vision, Policy pages)
- 🔲 Remove Pages + Menus modules from backend and admin once web pages are live
- 🔲 User to share rough rollout plan document

### Deferred
- 🔁 Bilingual handling for static copy — next-intl decided; implementation TBD
- 🔁 Announcements / Banners — CMS-driven or web-coded? TBD
