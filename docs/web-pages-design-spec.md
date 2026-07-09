# SIDHKOFED Web — Page Design Specification

> Created 2026-06-28. Updated 2026-07-09 using the external homepage-led design review. This document is the single source of truth for the per-page visual design of the web application. Pages are implemented one at a time; each has its own audit checklist before the next page begins.

---

## 1. Design Philosophy

The website must feel like a **Jharkhand government portal**, not a dashboard or admin tool. Key principles extracted from the live SIDHKOFED site and the JSLPS reference:

1. **Narrative before data.** Visitors need to understand who SIDHKOFED is before they see any numbers or lists.
2. **Every page needs context.** A listing page without an intro is a table of data, not a web page.
3. **Government portals use visual hierarchy, not minimal design.** Eyebrow labels, large H2s, muted section bands, and clear CTA buttons make content scannable.
4. **Static content anchors the page; CMS fills the gaps.** When CMS data is absent, the page should still be usable — not show a blank section.
5. **ContactCta on every static page.** Per the reference site pattern, every informational/static page ends with a "For Further Information" block linking to /contact.
6. **Contextual FAQs, not a FAQ dump.** FAQs are categorised in the CMS (via `faq_category`). Each category's FAQs render inline on the relevant page — Membership FAQs on `/membership`, Procurement FAQs on `/procurement`, etc. No separate `/faqs` or `/membership/faqs` route.

---

## 1.1 Review Addendum (2026-07-09)

An external homepage-led design review on 2026-07-09 described the current public site as a strong engineering scaffold wrapped around an unfinished product. The review direction is now part of this spec.

### Protect these strengths

- Shared HSL token system across web + admin
- Skip link, focus rings, reduced motion, and ARIA fundamentals
- EN/HI architecture with Devanagari font support
- Reusable page shells, card patterns, and listing primitives

### Priority issues adopted into this spec

- Homepage hierarchy is too flat; too many sections compete at the same visual weight.
- Leadership is placed too high relative to citizen tasks.
- The hero behaves too much like a slogan board and not enough like a service entry point.
- Hardcoded leaders and headline stats are not acceptable for official-grade public content.
- Hero contrast and CTA contrast need explicit AA-minded review.
- Dark mode must be fully audited or intentionally withheld.

### Delivery order from the review

High:

1. Remove any prototype notice from public production surfaces.
2. Fix hero text contrast.
3. Move stats and leaders out of hardcoded component constants.
4. Demote leadership below task-first homepage content.
5. Rebuild homepage hierarchy and type scale.

Medium:

1. Restore a real hero image on mobile.
2. Consolidate duplicate or overlapping public routes.
3. Rewrite hero copy in plain language.
4. Resolve accent CTA contrast and the dark-mode product decision.
5. Reduce eyebrow overuse and strengthen heading voice.

Low:

1. Remove or rethink decorative Quick Access numerals.
2. Standardise spacing rhythm.
3. Add intentional empty states for sparse datasets.
4. Add automated contrast and axe checks to CI.

## 2. Design System Reference

### Colour tokens (from Tailwind config + globals.css)
| Token | Light | Dark | Usage |
|---|---|---|---|
| `primary` | Forest green | Same | Buttons, icons, active states, borders |
| `primary-foreground` | White | White | Text on green bg |
| `background` | Off-white / ivory | Dark navy | Page bg |
| `surface` | White | Dark surface | Cards, panels |
| `border` | Light grey | Dark grey | Card borders, dividers |
| `muted` | Light grey bg | Darker bg | Section bands, empty states |
| `muted-foreground` | Medium grey | Lighter grey | Subtitles, metadata |
| `foreground` | Near-black | Near-white | Body text, headings |

### Typography
- **H1:** `text-3xl font-bold tracking-tight sm:text-4xl` — page title
- **H2:** `text-xl font-semibold` — section heading within page
- **Eyebrow:** `text-xs font-semibold uppercase tracking-widest text-muted-foreground` — pre-heading label
- **Subtitle:** `text-lg text-muted-foreground mt-3` — below h1
- **Body:** `text-base leading-relaxed text-foreground`
- **Meta:** `text-sm text-muted-foreground`

### Spacing
- Page container: `Container` component (`max-w-7xl mx-auto px-4`)
- Page top padding: `py-10`
- Section spacing within page: `space-y-10` or `mt-10`
- Card gap: `gap-4` (2-col) · `gap-5` (3-col) · `gap-5` (4-col)

### Typography corrections from the review

- The site needs a clearer type scale after the hero; section titles should feel materially larger than body copy.
- Eyebrows should be used selectively, not on nearly every band by default.
- Inter is acceptable for body/UI, but headline treatment should feel more institutional and less generic than a SaaS dashboard.

### Spacing corrections from the review

- Stop treating `py-8 / py-10 / py-12 / py-14` as interchangeable defaults.
- Especially on the homepage, spacing must signal hierarchy through 2-3 deliberate band densities:
  - lead / hero
  - compact utility
  - quieter editorial/supporting

### Shared components already built
| Component | File | Used by |
|---|---|---|
| `ContactCta` | `web/src/components/content/contact-cta.tsx` | About, Vision, OrgGov |
| `CooperativeStructure` | `web/src/components/content/cooperative-structure.tsx` | About, OrgGov |
| `ListingLayout` | `web/src/components/listing/listing-layout.tsx` | All listing pages |
| `HomeSection` | `web/src/components/home/home-section.tsx` | Homepage sections |
| `Breadcrumbs` | `web/src/components/ui/breadcrumb.tsx` | All pages |
| `Container` | `web/src/components/ui/container.tsx` | All pages |
| `SectionHeading` | `web/src/components/ui/section-heading.tsx` | Listing sections |
| `EmptyState` | `web/src/components/feedback/states.tsx` | CMS listing pages |

---

## 3. Page Templates

Five templates cover all current pages. Each template has a fixed slot structure.

### Template A — Homepage
Unique multi-section layout. See §4.1 for the full spec.

### Template B — Static Content Page
Used by: About, Vision/Mission, Org Governance, Membership Process, Procurement Enquiry

```
Breadcrumbs
Container.py-10
  header.max-w-3xl
    h1
    p.subtitle
  [optional: registration badge / Hindi subtitle]
  content area.max-w-3xl
    [sections with h2 + body text]
    [optional: CooperativeStructure diagram]
    [optional: navigation cards to sub-pages]
    [bottom: note about browser translate]
  ContactCta.max-w-3xl
```

**Rules for this template:**
- Max content width always `max-w-3xl`
- Section h2s get icon decoration on informational pages (Eye, Crosshair, etc.)
- ContactCta is mandatory on all pages using this template
- Border-l-4 accent box for highlight blocks (Board of Directors, warnings)

### Template C — Listing/Browsing Page
Used by: Activities, Trainings, Workshops, Institutional Events, Tenders, Notices, Membership directory, Publications

```
ListingLayout (handles Breadcrumbs + h1 + subtitle + FilterBar + pagination)
  FilterBar
  ResultsSummary
  [card grid or table]
  PaginationNav
```

**Rules for this template:**
- Never add a ContactCta — listings are functional, not informational
- Filter bar always present; search bar present unless explicitly excluded
- Empty state via `<EmptyState />` component when CMS has no data
- `parentCrumbs` prop required for all pages nested under an index (e.g. Notifications > Tenders)

### Template D — Hub/Index Page
Used by: Notifications, About (partially), Membership overview

```
Breadcrumbs
Container.py-10
  header.max-w-3xl
    h1
    [optional: subtitle]
    [optional: Hindi line / registration badge]
  [optional: intro prose]
  [optional: CooperativeStructure or diagram]
  nav cards grid (1–3 col)
  [optional: ContactCta]
```

**Rules for this template:**
- Nav cards: `group rounded-lg border border-border bg-surface p-5 shadow-sm hover:shadow-md`
- Each card has icon (Lucide), h2, and p description
- Hover: `group-hover:text-primary` on h2
- Icons sit in a `h-10 w-10 rounded-lg bg-primary/10` container

### Template E — Listing + Intro Hybrid
Used by: Membership (intro + nav cards ABOVE the listing), Publications (quicklinks ABOVE listing), Activities (quicklinks banner ABOVE listing)

```
[Intro/Hub section — NOT inside ListingLayout]
  Breadcrumbs
  Container.py-10
    header
    [intro content: cards / quicklinks / prose]
[Listing section — ListingLayout picks up below]
  ListingLayout
```

**Rules:**
- The intro section uses `Container` independently
- `ListingLayout` renders its own breadcrumb, so breadcrumb is ONLY in the intro section — pass `parentCrumbs` in ListingLayout OR suppress the breadcrumb in the intro
- Best approach: page renders the intro block WITHOUT breadcrumb, then `<ListingLayout>` renders its normal breadcrumb flow

---

## 4. Page-by-Page Specifications

### 4.1 Homepage (`/`) — STATUS: ✅ DONE (2026-07-09)

> Implemented 2026-07-09 via direct collaboration; supersedes the original spec text
> below where they differ. The core intent (real search, live stats/leadership, retire
> the ticker, demote leadership, fewer/clearer zones) was carried out in full. What
> differs from the literal spec: the hero keeps its existing `bg-primary` + dot-grid +
> diagonal-image treatment rather than switching to `bg-gradient-to-b from-primary
> to-primary/85` or a plain `<Image src="/hero-cooperative.png"/>` right panel (the
> existing CMS-driven gallery carousel with a static fallback was already better than
> a single static image, so it was kept and just extended to mobile); Quick Access
> kept its existing 6 task tiles rather than being expanded to the spec's 3×3/9-tile
> grid (no corresponding page for 3 of the 9 suggested links existed to justify the
> expansion); and leadership was demoted in position rather than also visually
> "collapsed to a lighter treatment" — the spec offered position-or-treatment as
> alternatives, and moving it below Hero/KPI/Quick Access/Governance was sufficient on
> its own to satisfy "leadership must not outrank citizen tasks" without also needing
> to redesign a component that wasn't itself the problem.

**Template:** A (unique)
**Built — section stack (top → bottom):**

1. **Hero** (`web/src/components/home/hero-search.tsx`) — contrast fixed (the two
   `text-white/45` low-opacity spots, on the sub-headline and stat labels, bumped to
   `/75` and `/70`); a real embedded search box (new
   `web/src/components/home/hero-search-bar.tsx`, submits to `/search?q=...` via
   `router.push`, reusing the existing `/api/v1/public/search` endpoint and `/search`
   page — no new backend work); the hardcoded `STATS` constant replaced by a
   `stats: DashboardMetric[]` prop — the first 3 metrics from the same
   `/public/dashboard/kpis` data `<KpiStrip>` already renders below, so this needed
   zero new backend work (KPI reports are already admin-editable via a
   `show_on_homepage` flag); a `lg:hidden` mobile image band added above the text
   content so the institutional image no longer disappears below `lg` (previously the
   diagonal right panel was `hidden lg:block` with no mobile equivalent at all).
2. **KPI Strip** — unchanged.
3. **Quick Access** (`web/src/components/home/quick-links.tsx`) — the decorative `01–06`
   numerals (implying a false ranking) replaced with a per-link Lucide icon in a
   `h-9 w-9 rounded-lg bg-primary/10` container, matching the icon treatment already
   used by `<CategoryCards>` elsewhere on the site. Kept the existing 6 links; did not
   expand to the spec's 9-link 3×3 grid (see note above).
4. **Governance band** (Notices + Tenders) — promoted from its old position near the
   bottom to right after Quick Access, to absorb the "latest updates" job the retired
   ticker used to do, per the spec's own reasoning ("this band becomes more important
   once the moving alert ticker is retired").
5. **Leadership** (`web/src/components/home/leaders-section.tsx`) — demoted from
   position 3 (previously right after the ticker) to position 5, below Hero/KPI/Quick
   Access/Governance, satisfying "must not outrank citizen tasks." Also made
   CMS-driven: a new backend `Leadership` module (`src/modules/leadership/*`, mirrors
   the existing `digital-services` module — bilingual name/govt-role/SIDHKOFED-role,
   photo via the standard media picker, publish workflow, display order, no
   `show_on_homepage` since this section has no other public listing) replaces the
   hardcoded `LEADERS` array; a matching admin CRUD UI
   (`admin/src/features/leadership/`) lets admins manage entries and upload real
   photos. Public endpoint `GET /public/leadership`; the section hides entirely when
   there are zero published entries, same pattern as the conditionally-hidden
   Activities & Commodities section below it.
6. **About editorial** — unchanged.
7. **Activities & Commodities** — unchanged.
8. **Capacity Building** — unchanged.
9. **FAQ** — unchanged content, background alternation adjusted for the new section
   order (was previously adjacent to the old Governance-band position).
10. **Knowledge Hub** — unchanged (4 static cards; not expanded to CMS-driven).
11. **Media Gallery** — unchanged.

**Retired:** the moving red "Alert" ticker (`AnnouncementTicker`) — deleted outright
(`web/src/components/home/announcement-ticker.tsx` and its `ticker-track` CSS
keyframes in `globals.css`), a deliberate product retirement per the review, not
dead code left in place. Its job is now carried by the promoted Governance band.

**Also fixed as part of this pass (review priority-1 item):** the stale
`footer.prototypeNotice` disclaimer ("Representative prototype content — official
data pending approval.") removed from `site-footer.tsx` and the dictionary — it was
still live in production despite the review calling it out by name for removal.

#### Files changed
- `web/src/components/home/hero-search.tsx`, `web/src/components/home/hero-search-bar.tsx` (new)
- `web/src/components/home/quick-links.tsx`
- `web/src/components/home/leaders-section.tsx`
- `web/src/components/home/announcement-ticker.tsx` (deleted)
- `web/src/components/layout/site-footer.tsx`
- `web/src/app/page.tsx`, `web/src/app/globals.css`, `web/src/i18n/dictionary.ts`
- `web/src/lib/types/content.ts`, `web/src/lib/api/endpoints.ts` (`Leader` type, `/public/leadership`)
- `src/modules/leadership/*` (new backend module), `prisma/schema.prisma`, `prisma/seed/leadership-defaults.ts`, `src/routes/index.ts`
- `admin/src/features/leadership/*`, `admin/src/app/(admin)/leadership/*` (new admin CRUD UI)

#### Audit checklist — Homepage
- [x] Hero image loads, including on mobile (previously absent below `lg`)
- [x] Hero contains a real search box, submitting to `/search`
- [x] Hero headline/stat contrast fixed (no `/45`-opacity white)
- [x] Hero stats are live (`/public/dashboard/kpis`), not hardcoded — hidden when empty
- [x] KPI strip: renders when data present, hidden when absent
- [x] Quick Access: icons replace decorative ranking numerals; all hrefs correct
- [x] Leadership does not outrank Quick Access/KPIs/Governance content, and is now
      CMS-driven end-to-end (verified live: `GET /public/leadership` → 3 seeded
      leaders → rendered on the homepage in the correct position)
- [x] About/Activities/Capacity Building sections: unchanged, still correct
- [x] Governance band promoted; carries the "latest updates" job the ticker used to
- [x] Ticker removed — no moving marquee/red alert badge remains
- [x] Knowledge Hub: 4 static cards, all links resolve
- [x] Footer prototype notice removed
- [x] Dark mode: all touched styling is token-based except the hero's bespoke
      opacity-based whites, which were the one area re-checked directly against a
      dark-mode render
- [x] Language toggle: leadership bilingual fields switch via `pickText`; hero search
      labels/placeholder switch via `t()`

---

### 4.2 About (`/about`) — STATUS: ✅ DONE (2026-06-28)

**Template:** D (Hub/Index)  
**Changes applied:**
- Hindi subtitle added: `सिद्धो-कान्हो कृषि एवं वनोपज राज्य सहकारी संघ, झारखण्ड`
- Registration badge: "Reg. No. 02/H.Q./2021"
- `<CooperativeStructure>` diagram under "Cooperative Structure" heading
- 3 navigation cards: Vision, Org Governance, Membership
- `<ContactCta>` at bottom

#### Audit checklist — About
- [ ] H1 "About SIDHKOFED" + registration badge chip inline
- [ ] Hindi subtitle renders in Devanagari (not garbled)
- [ ] 3 body paragraphs visible below header
- [ ] "Cooperative Structure" h2 + CooperativeStructure diagram visible (3 boxes + 2 arrows)
- [ ] 3 navigation cards (Vision, Org & Governance, Membership) at bottom of content
- [ ] ContactCta visible at page bottom
- [ ] Dark mode: badge, diagram boxes, nav cards all legible
- [ ] Mobile: diagram boxes fill width, no overflow

---

### 4.3 Vision, Mission, Objectives & Functions (`/about/vision-mission-objectives-functions`) — STATUS: ✅ DONE (2026-06-28)

**Template:** B (Static Content)  
**Changes applied:**
- Section headings with icon decoration: Eye (Vision), Crosshair (Mission), ListChecks (Objectives), Workflow (Functions)
- Each heading in a `border-b border-border` separator row
- Objectives as bullet list, Functions as bold-title + description bullets
- Browser translate note
- `<ContactCta>` at bottom

#### Audit checklist — Vision/Mission
- [ ] H1 "Vision, Mission, Objectives & Functions" visible
- [ ] 4 sections each have icon + heading in bordered row
- [ ] Vision: 1 paragraph
- [ ] Mission: 1 paragraph
- [ ] Objectives: 6 bullet points
- [ ] Functions: 5 bullets (title: desc pattern)
- [ ] Browser translate note box visible
- [ ] ContactCta at bottom
- [ ] Dark mode: icon containers (bg-primary/10) visible in dark
- [ ] Mobile: no overflow from icon + heading row

---

### 4.4 Organisation & Governance (`/about/organisation-governance`) — STATUS: ✅ DONE (2026-06-28)

**Template:** B (Static Content)  
**Changes applied:**
- H1 + subtitle
- "Organisational Structure" section with CooperativeStructure diagram
- "Board of Directors" in `border-l-4 border-primary bg-primary/5` highlight box
- "Governance Framework" bullet list
- "Right to Information" section with external link button (ExternalLink icon)
- Browser translate + Publications link note
- `<ContactCta>` at bottom

#### Audit checklist — Org Governance
- [ ] H1 "Organisation & Governance" visible
- [ ] CooperativeStructure diagram visible below "Organisational Structure" h2
- [ ] Board of Directors: text inside green left-border highlight box
- [ ] Governance framework: 3 bullet points
- [ ] RTI section: "Apply on RTI Portal" button with external link icon
- [ ] RTI button opens `https://rtionline.gov.in/` in new tab
- [ ] Browser translate note with /publications link
- [ ] ContactCta at bottom
- [ ] Dark mode: highlight box bg-primary/5 works in dark
- [ ] Mobile: highlight box padding adequate

---

### 4.5 Activities (`/activities`) — STATUS: ✅ DONE (2026-07-09)

> Implemented 2026-07-09 via direct collaboration; supersedes the original spec text below where they differ. The original spec described a green `bg-primary` banner with white cards embedded inside it. What was actually built follows the pattern established on Publications instead: a neutral `LocalizedHero` title band, then a **separate** `bg-muted/40` "Browse by Category" band below it — visually closer to Template E/D hybrids elsewhere on the site, and consistent with Procurement/Notifications/Impact built the same session.

**Template:** E (Listing + Intro Hybrid)
**Built:**
- `Breadcrumbs` → `<LocalizedHero titleKey="page.activities.title" subtitleKey="page.activities.subtitle" />` (matches Publications' hero band exactly)
- A `bg-muted/40` "Browse by Category" band (`<CategoryCards>`, shared component also used by Procurement/Notifications/Impact) with 4 cards:
  - Trainings → `/activities?event_type=training#listing`
  - Workshops & Awareness → `/activities?event_type=workshop#listing`
  - Institutional Events → `/activities?event_type=meeting#listing`
  - Success Stories → `/activities/success-stories` (separate page — no backing `event_type` in the Events API, so it can't be a same-page filter like the other three)
- The listing itself (`id="listing"`, breadcrumb-adjacent `FilterBar` with Event Type/Status/District/Year, `ResultsSummary`, event card grid, `PaginationNav`) is the page's own default/unfiltered view — there is no separate "Activities Overview" card, since the base page already is that view (a rule applied consistently across Activities/Procurement/Notifications/Impact).
- **Query-param sync:** category cards are plain `<Link href="/activities?event_type=training#listing">` links. `FilterBar` reads the same `event_type` query param via `useQueryParams()`, so clicking a card and picking the same value in the filter dropdown are indistinguishable — the URL is the single source of truth, no custom sync logic needed.

#### Files changed
- `web/src/app/activities/page.tsx`
- `web/src/components/listing/category-cards.tsx` (shared)

#### Audit checklist — Activities
- [x] Hero band renders above the category band, matching Publications' visual treatment
- [x] 4 category cards visible in a row (4-col desktop, 2-col tablet, 1-col mobile)
- [x] Category cards act as same-page filters (Trainings/Workshops/Institutional) or link to a dedicated page (Success Stories)
- [x] Listing below: breadcrumb, filters (Event Type, Status, District, Year), results, cards, pagination
- [x] Category cards and event-type filter remain synchronized via the shared `event_type` URL param
- [x] Event cards render correctly
- [x] Dark mode: token-based (`bg-muted/40`, `bg-surface`, `border-border`) — correct in both themes automatically
- [x] Mobile: band text readable, cards stack correctly

---

### 4.6 Notifications (`/notifications`) — STATUS: ✅ DONE (2026-07-09)

> Implemented 2026-07-09 via direct collaboration; supersedes the original spec text below where they differ. The original spec assumed Notices and Tenders could stay as two static nav cards with icons added. During implementation, backend investigation showed Notices and Tenders are genuinely separate content types — different endpoints/DTOs (`official-communications` vs `tenders`) — which opened up the same same-page category-filtering pattern already used on Activities/Publications, so the page went further than the original minimal-icon spec.

**Template:** E (Listing + Intro Hybrid) — reclassified from D (Hub/Index); the page now has its own listing, not just nav cards.
**Built:**
- `Breadcrumbs` → `<LocalizedHero titleKey="page.notifications.title" subtitleKey="page.notifications.subtitle" />`
- A `bg-muted/40` "Browse by Category" band (`<CategoryCards>`) with 4 cards:
  - Notice → `/notifications?communication_type=notice#listing`
  - Circular → `/notifications?communication_type=circular#listing`
  - Public Announcement → `/notifications?communication_type=public-announcement#listing`
  - Tenders → `/notifications/tenders` (separate page — its own dedicated listing/filters, a different backend endpoint from communications)
- Notices is the page's own default/unfiltered listing (no separate "Notices" card — same "don't card the default state" rule as Activities/Procurement/Impact); Notice/Circular/Public Announcement are 3 of 6 real `communication-types` master values curated onto cards, the other 3 (Office Order, Notification, Advisory) remain dropdown-only in the `FilterBar`, mirroring how Procurement curates 2 of 6 `procurement-update-types` onto cards.
- Same query-param-sync mechanism as Activities: cards and `FilterBar` both read/write `communication_type` in the URL.

#### Files changed
- `web/src/app/notifications/page.tsx`
- `web/src/components/listing/category-cards.tsx` (shared)

#### Audit checklist — Notifications
- [x] Hero band + "Browse by Category" band render, matching Activities/Publications treatment
- [x] 4 category cards: Notice, Circular, Public Announcement (same-page filters) + Tenders (separate page)
- [x] Listing below (Notices, the default view): breadcrumb, filters (Type, Year), results, cards, pagination
- [x] Category cards and `communication_type` filter remain synchronized via the shared URL param
- [x] Tenders card links to `/notifications/tenders`, which has its own separate filters
- [x] Dark mode: token-based styling, correct in both themes automatically
- [x] Mobile: band text readable, cards stack correctly

---

### 4.7 Publications (`/publications`) — STATUS: PENDING

**Template:** E (Listing + Intro Hybrid)  
**Current state:** `ListingLayout` only — filters (category, type) + document cards

**Target:** Add a category quicklinks strip ABOVE the listing, and treat this page as the reference implementation for same-page category filtering used elsewhere (especially Activities).

#### Category quicklinks (new — above ListingLayout)
```
Container.py-8.border-b.border-border
  h2 text-muted-foreground "Browse by category"
  5 cards (row, wrapping):
    [Reports & Research → /publications/reports-research]
    [Policies, Guidelines & SOPs → /publications/policies-guidelines-sops]
    [Training Materials → /publications/training-materials]
    [Forms & Formats → /publications/forms-formats]
    [Media Gallery → /publications/media]
  Card style: border border-border bg-surface p-4, hover border-primary, text-sm font-medium
```

The existing `ListingLayout` (with "Publications" heading, filters, document cards) follows unchanged.

#### Files to change
- `web/src/app/publications/page.tsx`

#### Audit checklist — Publications
- [ ] "Browse by category" heading + 5 quicklink cards visible above filter bar
- [ ] All 5 links resolve (even if destination pages are stubs)
- [ ] Card hover state: border changes to primary colour
- [ ] ListingLayout below: h1 "Publications", filters (knowledge category, type), cards, pagination
- [ ] Document cards render correctly
- [ ] Dark mode: quicklink cards visible in dark surface
- [ ] Mobile: 5 cards wrap to 2-col then 1-col

---

### 4.8 Membership Process (`/membership/process`) — STATUS: PENDING

**Template:** B (Static Content)  
**Current state:** `prose` class wrapper with flat h2 headings and ul/ol lists — correct content, poor visual hierarchy

**Target:** Replace the Application Process ordered list with numbered step cards. Types of Membership and Eligibility sections remain as prose.

#### Numbered step cards (replaces the `<ol>` in Application Process)
```
<div class="space-y-4">
  [Step card × 6]:
    <div class="flex gap-4 rounded-lg border border-border bg-surface p-5">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        1
      </span>
      <div>
        <p class="font-semibold text-foreground">Obtain the Application Form</p>
        <p class="mt-1 text-sm text-muted-foreground">Available from the SIDHKOFED office or the Downloads section.</p>
      </div>
    </div>
```

Steps:
1. Obtain the Application Form — from SIDHKOFED office or Downloads section
2. Complete the Form — society details, address, registration number, office bearers
3. Attach Required Documents — Registration Certificate, Bye-laws, Latest Audit Report, AGM resolution
4. Submit with Membership Fee — to Sameti Bhawan, Kanke Road, Ranchi – 834008, with prescribed fee
5. Board Approval — application placed before Board of Directors at next scheduled meeting
6. Receive Membership Certificate — issued upon Board approval

Types of Membership + Eligibility sections stay as explicit prose (not inside `prose` class — use same explicit styling as About pages).

Add `<ContactCta>` at bottom (currently has a Contact section inside prose — replace it with ContactCta).

#### Files to change
- `web/src/app/membership/process/page.tsx`

#### Audit checklist — Membership Process
- [ ] H1 "Membership Process" visible
- [ ] "Types of Membership" section: 3 bullet items (Primary, Nominal, District Union)
- [ ] "Eligibility" section: 4 bullet items
- [ ] "Application Process" section: 6 numbered step cards (not a plain ol list)
- [ ] Step cards: green numbered circle + title + description
- [ ] Steps 1–6 all visible and correctly worded
- [ ] ContactCta at bottom (replaces the old "Contact" prose section)
- [ ] Dark mode: step card circle bg-primary still green in dark mode
- [ ] Mobile: step cards full-width, no overflow

---

### 4.9 Membership (`/membership`) — STATUS: PENDING

**Template:** E (Listing + Intro Hybrid)  
**Current state:** `ListingLayout` — filters (level, type, district) + membership table only

**Target:** Intro paragraph + navigation cards above the listing, plus inline Membership FAQs below the listing.

#### Page structure (top → bottom)

```
[1] Intro section — Container.py-10 (no breadcrumb here — ListingLayout handles it)
      brief intro paragraph (3 membership levels explained in 2 sentences)
      nav cards grid (2-col, then 3-col on lg):
        [SIDHKOFED Members → /membership/sidhkofed]
        [District Unions → /membership/district-unions]
        [Member Directory → /membership/directory]
        [Membership Process → /membership/process]

[2] ListingLayout (unchanged — renders h1, breadcrumb, filters, table, pagination)

[3] FAQ section — Container.py-10 (below the listing)
      h2 "Frequently Asked Questions"
      accordion list — API: getListSafe(faqs, {faq_category: 'membership', page_size: 20})
      bilingual: question = pickText(q.question_en, q.question_hi)
                 answer  = pickText(q.answer_en,   q.answer_hi)
      hidden entirely when faqs.items.length === 0
```

**Note on h1:** The `ListingLayout` renders the h1 "Membership" — the intro section above has NO h1, only nav cards + prose. This avoids duplicate headings.

**Note on `/membership/faqs` route:** No longer needed as a separate page. FAQs render inline here. Remove from navigation config and sitemap.

#### FAQ accordion component pattern
Each FAQ item is a disclosure widget (`<details>`/`<summary>` or a stateful button):
```tsx
<div className="divide-y divide-border rounded-lg border border-border">
  {faqs.map(faq => (
    <details key={faq.id} className="group px-5 py-4">
      <summary className="cursor-pointer list-none font-medium text-foreground
                          marker:hidden group-open:text-primary">
        {pickText(faq.question_en, faq.question_hi)}
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {pickText(faq.answer_en, faq.answer_hi)}
      </p>
    </details>
  ))}
</div>
```

#### Files to change
- `web/src/app/membership/page.tsx` — add intro section above ListingLayout + FAQ section below

#### Audit checklist — Membership
- [ ] Intro: 4 nav cards visible above filter bar (no /faqs card)
- [ ] Nav card links: /membership/sidhkofed, /membership/district-unions, /membership/directory, /membership/process all resolve
- [ ] ListingLayout renders below: h1 "Membership", breadcrumb, filters (level, type, district), table, pagination
- [ ] No duplicate h1 headings
- [ ] FAQ section visible below the listing when CMS has membership FAQs
- [ ] FAQ section hidden when no FAQ data
- [ ] FAQ accordions expand/collapse on click
- [ ] FAQ text is bilingual (switches with language toggle)
- [ ] Dark mode: nav cards, FAQ container, accordion items all legible
- [ ] Mobile: nav cards stack to 2-col, FAQ items full-width

---

### 4.10 Procurement Enquiry (`/procurement/enquiry`) — STATUS: ✅ DONE

> Note: the Maps-link requirement is satisfied by a more robust mechanism than the literal suggestion below — see "Built" for what actually shipped.

**Template:** B (Static Content)
**Built:** `EnquiryForm` (filtered to Buyer/Seller/Storage Enquiry types + a Commodity field) alongside `<OfficeContactCard>`, which renders live contact info sourced from `Settings → Contact` (backend `SETTINGS_CATALOG`, exposed publicly via `GET /public/settings/:group`, allow-listed to `contact` only). `OfficeContactCard` already includes a "View on map" link when `contact.map_url` is set — seeded with the real office location (`https://maps.app.goo.gl/hUMpwZStpAnDRwZs8`) via `prisma/seed/contact-defaults.ts`. This is preferable to a hardcoded Google Maps search-query link: it's admin-editable without a code change and points at the exact verified location rather than a generic address search.

#### Files involved
- `web/src/app/procurement/enquiry/page.tsx`
- `web/src/components/content/office-contact-card.tsx`
- `web/src/components/forms/enquiry-form.tsx`

#### Audit checklist — Procurement Enquiry
- [x] Address row: address text + "View on map" link below it (hidden automatically if `map_url` is ever unset)
- [x] Maps link opens correct location in new tab
- [x] Phone: click-to-call (`tel:` link) works
- [x] Email: mailto link works
- [x] Card border and bg-surface visible in both light + dark mode
- [x] Mobile: card full-width, padding comfortable

---

### 4.11 Procurement (`/procurement`) — STATUS: ✅ DONE (2026-07-09)

> Not present in the original spec — built this session together with Activities/Notifications/Impact, following the same pattern. Documented here for completeness.

**Template:** E (Listing + Intro Hybrid)
**Built:**
- `Breadcrumbs` → `<LocalizedHero titleKey="page.procurement.title" subtitleKey="page.procurement.subtitle" />`
- A `bg-muted/40` "Browse by Category" band (`<CategoryCards>`) with 4 cards:
  - Upcoming Procurements → `/procurement?upcoming=true#listing` (a date-based view — `upcoming` isn't a `procurement-update-type` value, it's read by the Timing filter's boolean-style option)
  - Procurement Rate → `/procurement?procurement_update_type=procurement-rate#listing`
  - Procurement Centre Update → `/procurement?procurement_update_type=procurement-centre-update#listing`
  - Buyer/Seller/Storage Enquiry → `/procurement/enquiry` (separate page — its own form, not a listing filter; see §4.10)
- "Announcements" is intentionally excluded from the cards — `/procurement` itself is already that default, unfiltered view (same "don't card the default state" rule as Activities/Notifications/Impact).
- Procurement Rate and Procurement Centre Update are curated from the real `procurement-update-types` master data (`masters.ts` → `PROCUREMENT_UPDATE_TYPES`, 6 values total; the rest remain dropdown-only in the `FilterBar`).
- Listing below (`id="listing"`): `FilterBar` with Timing/Type/Commodity/District/Year, `ResultsSummary`, procurement card grid, `PaginationNav`.

#### Files involved
- `web/src/app/procurement/page.tsx`
- `web/src/components/listing/category-cards.tsx` (shared)

#### Audit checklist — Procurement
- [x] Hero band + "Browse by Category" band render, matching Activities/Notifications/Publications treatment
- [x] 4 category cards: Upcoming, Procurement Rate, Procurement Centre Update (same-page filters) + Buyer/Seller/Storage Enquiry (separate page)
- [x] Listing below (all procurement updates, the default view): filters, results, cards, pagination
- [x] Category cards and `procurement_update_type`/`upcoming` filters remain synchronized via the shared URL params
- [x] Dark mode: token-based styling, correct in both themes automatically
- [x] Mobile: band text readable, cards stack correctly

---

### 4.12 Impact / Dashboard (`/impact`, `/impact/dashboard`) — STATUS: ✅ DONE (2026-07-09)

> Not present in the original spec — built this session. Documented here for completeness.

**Template:** Impact overview is a trimmed hybrid; `/impact/dashboard` is a standalone reporting page (closest to Template C).
**Built:**
- The primary nav item (`config/navigation.ts`, key `impact`) is now labelled **"Dashboard"** and links straight to `/impact/dashboard` — not `/impact`.
- `/impact/dashboard`: `Breadcrumbs` → heading → `<KpiStrip>` (if KPI data present) → the 13 fixed public reports (`FIXED_DASHBOARD_REPORTS`, `src/modules/dashboard/dashboard.types.ts`) grouped into 4 theme sections via a web-only `REPORT_GROUPS` lookup by `report_key` (the backend has no report `category` field): Training & Capacity, Procurement, Membership, Programmes & Partnerships, plus a defensive "Other Reports" catch-all for any future unmapped key. Each group renders as a card grid (`<ReportBlock>`), 2-col on `lg`.
- `/impact` itself is an intentionally orphaned stub — `LocalizedHero` + KPI strip + a single "Public Dashboard" category card pointing at `/impact/dashboard`. It was trimmed down from a fuller "Training & Beneficiary" listing once that data was recognised as redundant with Activities' own Trainings category (same `event_type=training` data). No longer linked from nav; kept in place rather than deleted, consistent with this session's "defer cleanup of orphaned pages" precedent (see also `/activities/trainings`, `/notifications/notices` as historical listing pages, `/dashboard` as a pre-existing unrelated duplicate route).

#### Files involved
- `web/src/app/impact/page.tsx`
- `web/src/app/impact/dashboard/page.tsx`
- `web/src/config/navigation.ts`

#### Audit checklist — Impact / Dashboard
- [x] Primary nav "Dashboard" item links to `/impact/dashboard`
- [x] `/impact/dashboard`: KPI strip renders when data present
- [x] All 13 fixed reports render, grouped into the 4 theme sections (verified live — zero reports fall into "Other")
- [x] `/impact` stub still renders (hero + KPI strip + one Dashboard card), reachable only by direct URL
- [x] Dark mode: token-based styling, correct in both themes automatically
- [x] Mobile: report cards stack to 1-col

## 5. FAQ Placement Strategy

FAQs in the CMS have a `faq_category` (MasterRef). The decision is to render FAQs **inline on the page they belong to**, not on a separate `/faqs` route.

### Pages with inline FAQ sections

| Page | FAQ category slug | Position | API call |
|---|---|---|---|
| `/membership` | `membership` | Below listing | `getListSafe(faqs, {faq_category: 'membership'})` |
| `/procurement` | `procurement` | Below announcements | `getListSafe(faqs, {faq_category: 'procurement'})` |
| `/membership/process` | `membership` | Below step cards | Same call as /membership — reuse data |

Add more pages as new FAQ categories are created in the CMS. The `faq_category` slug is set by admins in the Masters → FAQ Categories table.

### Reusable pattern

The FAQ section renders identically on every page that uses it:
```tsx
{faqs.items.length > 0 && (
  <Container className="py-10">
    <h2 className="mb-6 text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
    <div className="divide-y divide-border rounded-lg border border-border">
      {faqs.items.map(faq => (
        <details key={faq.id} className="group px-5 py-4">
          <summary className="cursor-pointer list-none font-medium text-foreground marker:hidden group-open:text-primary">
            {pickText(faq.question_en, faq.question_hi)}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {pickText(faq.answer_en, faq.answer_hi)}
          </p>
        </details>
      ))}
    </div>
  </Container>
)}
```

**Data type:** `Faq` from `web/src/lib/types/content.ts` — fields: `id`, `slug`, `question_en`, `question_hi`, `answer_en`, `answer_hi`, `faq_category`, `highlight_type`  
**Endpoint:** `PUBLIC_ENDPOINTS.faqs` = `/public/faqs`  
**Language helper:** `pickText(en, hi)` from `web/src/lib/utils.ts`

### Removed routes (previously planned, now cancelled)
- ~~`/membership/faqs`~~ — FAQ inline on `/membership` instead
- No other standalone FAQ routes planned

---

## 7. Component Inventory

### Existing (no changes needed)
| Component | Location | Status |
|---|---|---|
| `ContactCta` | `web/src/components/content/contact-cta.tsx` | ✅ Built |
| `CooperativeStructure` | `web/src/components/content/cooperative-structure.tsx` | ✅ Built |
| `ListingLayout` | `web/src/components/listing/listing-layout.tsx` | ✅ Built |
| `HomeSection` | `web/src/components/home/home-section.tsx` | ✅ Built |
| `KpiStrip` | `web/src/components/dashboard/kpi-strip.tsx` | ✅ Built |
| `EventCard`, `NewsCard`, `ProgrammeCard`, etc. | `web/src/components/cards/` | ✅ Built |
| `EmptyState` | `web/src/components/feedback/states.tsx` | ✅ Built |

### To create (for homepage)
| Component | Location | Purpose |
|---|---|---|
| `QuickLinks` | `web/src/components/home/quick-links.tsx` | 3×3 numbered Quick Access grid |

### Hero (modify existing)
| Component | Current | Target |
|---|---|---|
| `HeroSearch` | `web/src/components/home/hero-search.tsx` | Rewrite into split 2-col layout |

---

## 8. Implementation Order

Pages are implemented one at a time. Each audit checklist must be manually verified before moving to the next.

| Priority | Page | Status | Template | Effort | Notes |
|---|---|---|---|---|---|
| — | Homepage | ✅ DONE (2026-07-09) | A (unique) | — | Hero contrast/search/mobile-image + live stats, new Leadership module (backend+admin), ticker retired, sections reordered — see §4.1 |
| 4 | Publications | 🔴 PENDING | E (hybrid) | Low | 5 category quicklinks above listing |
| 5 | Membership Process | 🔴 PENDING | B (static) | Medium | Numbered step cards + ContactCta |
| 6 | Membership | 🔴 PENDING | E (hybrid) | Medium | Intro + nav cards + inline FAQs |
| — | About | ✅ DONE | D (hub) | — | Diagram + Hindi + badge + CTA |
| — | Vision/Mission | ✅ DONE | B (static) | — | Icon headings + CTA |
| — | Org Governance | ✅ DONE | B (static) | — | Diagram + highlight box + RTI + CTA |
| — | Activities | ✅ DONE (2026-07-09) | E (hybrid) | — | Hero + "Browse by Category" band (4 cards) above same-page-filtered listing — see §4.5 |
| — | Notifications | ✅ DONE (2026-07-09) | E (hybrid) | — | Hero + "Browse by Category" band (Notice/Circular/Public Announcement + separate Tenders page) — see §4.6 |
| — | Procurement | ✅ DONE (2026-07-09) | E (hybrid) | — | Hero + "Browse by Category" band (Upcoming/Rate/Centre-Update + separate Enquiry page) — see §4.11 |
| — | Procurement Enquiry | ✅ DONE | B (static) | — | Live Settings-driven Maps link via `OfficeContactCard` — see §4.10 |
| — | Impact / Dashboard | ✅ DONE (2026-07-09) | Hybrid / C | — | Nav renamed "Dashboard" → `/impact/dashboard`; 13 reports grouped into 4 theme sections + KPI strip — see §4.12 |

**Removed from plan:** `/membership/faqs` (standalone page cancelled — FAQs inline on /membership per §5)

---

## 9. Universal Audit Criteria

These apply to every page, regardless of template, before the page is marked done.

### A — Structure
- [ ] Breadcrumb: hierarchy correct (e.g. Home > Notifications > Tenders)
- [ ] H1: exactly one h1 per page, correct text
- [ ] Subtitle: present below h1 (except for very simple hub pages)

### B — Dark Mode
- [ ] Page background switches from off-white to dark navy
- [ ] All cards switch from white to dark surface
- [ ] Text remains legible (no white-on-white or black-on-black)
- [ ] Icons retain their colour (primary green, muted grey)
- [ ] Border lines visible in dark mode
- [ ] No half-shipped dark-mode controls or scripts remain exposed without a full contrast audit

### C — Responsive / Mobile (375px viewport)
- [ ] No horizontal scroll / overflow
- [ ] Text readable without zooming (min 14px equivalent)
- [ ] Multi-col grids stack appropriately
- [ ] CTA buttons full-width on mobile if needed
- [ ] Key institutional imagery does not disappear entirely on mobile for marquee sections

### D — Links & Navigation
- [ ] All `<Link>` components resolve (no 404)
- [ ] External links: `target="_blank"` + `rel="noopener noreferrer"` present
- [ ] "View All" links resolve
- [ ] Breadcrumb parent links resolve
- [ ] No duplicate or overlapping routes remain exposed as competing first-class destinations unless intentionally canonicalised

### E — Language Toggle
- [ ] All `t()` dictionary strings switch to Hindi on toggle
- [ ] Page headings that are hardcoded English stay English (they have browser translate)
- [ ] Filter labels, button text, aria-labels switch

### F — CMS / Data
- [ ] CMS sections show `<EmptyState />` when no data (never blank/broken)
- [ ] Pagination only shows when `total_pages > 1`
- [ ] Results summary reflects correct count
- [ ] Public-facing institutional facts (leaders, stats, official notices of state) are not trapped in hardcoded component constants unless explicitly temporary and documented

---

*Last updated: 2026-07-09 | Maintained in `docs/web-pages-design-spec.md`*
