# SIDHKOFED Web — Page Design Specification

> Created 2026-06-28. This document is the single source of truth for the per-page visual design of the web application. Pages are implemented one at a time; each has its own audit checklist before the next page begins.

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

### 4.1 Homepage (`/`) — STATUS: PLANNED

**Template:** A (unique)  
**Current state:** Text hero + 9 data sections (News, Events, Programmes, Services, Comms, Tenders, Documents, Partners)  
**Target:** Split 2-col hero + 8 narrative sections from the legacy prototype

#### Section stack (top → bottom)

**Section 1 — Hero (split 2-col)**
- Background: `bg-gradient-to-b from-primary to-primary/85`
- Left (text column):
  - Eyebrow: "Public cooperative ecosystem"
  - H1: "A modern digital gateway for Jharkhand's cooperative livelihoods."
  - Tagline: "Discover SIDHKOFED activities, forest produce value chains, capacity building, procurement opportunities and public notices."
  - 3 CTA buttons: [Explore Activities → /activities] [View Trainings → /activities/trainings] [Procurement → /procurement]
- Right (visual column):
  - `<Image src="/hero-cooperative.png" />` (copy from `legacy-prototype/assets/images/hero-cooperative.png`)
  - Floating chip: "24 Districts covered" — positioned `absolute bottom-4 left-4` on the image container
- Mobile: single column, image hidden at `<sm`

**Section 2 — KPI Strip** (no change — keep existing `<KpiStrip>`)

**Section 3 — Quick Access (new component: `quick-links.tsx`)**
- Eyebrow: "Fast Pathways"
- H2: "Quick Access"
- 3×3 numbered grid:
  01 ERP / MIS Login → /digital-services
  02 Impact Dashboard → /impact/dashboard
  03 Membership → /membership
  04 Procurement Rates → /procurement
  05 Tenders → /notifications/tenders
  06 Publications → /publications
  07 Buyer Enquiry → /procurement/enquiry
  08 Notices → /notifications/notices
  09 Digital Services → /digital-services
- Card style: large faded number (01–09) + bold label + subtle border, hover scales border to `border-primary`

**Section 4 — About (static editorial, 2-col on lg)**
- Eyebrow: "Institutional Identity"
- H2: "SIDHKOFED as the apex cooperative platform"
- Left column: eyebrow + H2
- Right column: paragraph + 3 benefit bullets + [→ About SIDHKOFED] link
- Background: `bg-muted/40` section band

**Section 5 — Activities & Commodities (CMS: Programmes API)**
- Eyebrow: "Activities & Commodities"
- H2: "Forest economy and cooperative value chains"
- Renders `programmes.items` as `<ProgrammeCard>` grid (3-col)
- API: `getListSafe(programmes, {show_on_homepage: true, page_size: 6})`
- Hidden when `programmes.items.length === 0`

**Section 6 — Capacity Building (CMS: Training events timeline)**
- 2-col layout: text left, timeline right
- Left: Eyebrow "Capacity Building" + H2 + paragraph + [View All Trainings → /activities/trainings]
- Right: 3 training events as `<article>` rows: `[Month badge] Title — District`
- API: `getListSafe(events, {event_type: 'training', page_size: 3, ordering: '-start_date'})`
- Each row: `<time>` chip (e.g. "May") + `<strong>` title + `<small>` district
- If empty: entire right column shows "No upcoming trainings" placeholder

**Section 7 — Governance (2-col muted band)**
- 2-col split: left = Notices, right = Tenders
- Existing `CommunicationCard` + `TenderCard` components
- Same pattern as current, just keep it

**Section 8 — Knowledge Hub (static, 4 cards)**
- Eyebrow: "Knowledge Hub"
- H2: "Acts, SOPs, reports, training materials and publications"
- 4 equal-width cards (static, not CMS):
  - Reports & Research → /publications/reports-research
  - Policies, Guidelines & SOPs → /publications/policies-guidelines-sops
  - Training Materials → /publications/training-materials
  - Forms & Formats → /publications/forms-formats

#### Files to change
- `legacy-prototype/assets/images/hero-cooperative.png` → copy to `web/public/hero-cooperative.png`
- `web/src/components/home/hero-search.tsx` → rewrite to split 2-col layout
- `web/src/components/home/quick-links.tsx` → create (numbered Quick Access grid)
- `web/src/app/page.tsx` → new section order, updated Promise.all

#### Audit checklist — Homepage
- [ ] Hero image loads (no broken img `<img>` tag error)
- [ ] Floating "24 Districts" chip is visible over image
- [ ] On mobile: single column, image hidden, text + CTAs visible
- [ ] KPI strip: renders when data present, hidden when absent
- [ ] Quick Access: all 9 numbered cards display, all hrefs correct
- [ ] About editorial: 2-col on `lg`, stacks on mobile
- [ ] Activities section: hidden when no CMS programmes; cards appear when data entered
- [ ] Capacity Building: training timeline shows 3 events; "No upcoming trainings" when empty
- [ ] Governance: notices left, tenders right — both have "View all" links
- [ ] Knowledge Hub: 4 static cards, all 4 links resolve
- [ ] Dark mode: all 8 sections switch without contrast issues
- [ ] Language toggle: all `t()` strings switch to Hindi

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

### 4.5 Activities (`/activities`) — STATUS: PENDING

**Template:** E (Listing + Intro Hybrid)  
**Current state:** `ListingLayout` only — filters + event cards, no context above

**Target:** Add a visual "category quicklinks" banner ABOVE the `ListingLayout`.

#### Category banner (new — above ListingLayout)
```
bg-primary (green band)
  Container.py-8
    h1.text-2xl.font-bold.text-primary-foreground  "Activities"
    p.text-primary-foreground/90  "Trainings, workshops, field visits and events across Jharkhand"
    4 quicklink cards (row, 2-col on mobile, 4-col on desktop):
      [Trainings → /activities/trainings]
      [Workshops & Awareness → /activities/workshops-awareness]
      [Institutional Events → /activities/institutional-events]
      [Success Stories → /activities/success-stories]
    Card style: white bg with primary text, hover bg-white/90
```

The existing `ListingLayout` (with breadcrumbs, filters, results, pagination) follows immediately after, unchanged.

**Important:** Since `ListingLayout` renders its own `<Breadcrumbs>`, the banner does NOT include a breadcrumb — they'd duplicate. The quicklinks banner is purely a visual/navigational intro.

#### Files to change
- `web/src/app/activities/page.tsx` — add banner section above `<ListingLayout>`

#### Audit checklist — Activities
- [ ] Green banner renders above the listing section
- [ ] H1 "Activities" + subtitle visible in banner
- [ ] 4 quicklink cards visible in a row (4-col desktop, 2-col tablet, 1-col mobile)
- [ ] All 4 links resolve: /activities/trainings, /activities/workshops-awareness, /activities/institutional-events, /activities/success-stories
- [ ] ListingLayout still renders below: breadcrumb, filters (Event Type, Status, District, Year), results, cards, pagination
- [ ] Event cards render correctly
- [ ] Dark mode: green banner stays green (bg-primary is colour, not a light/dark token)
- [ ] Mobile: banner text readable, cards stack correctly

---

### 4.6 Notifications (`/notifications`) — STATUS: PENDING

**Template:** D (Hub/Index)  
**Current state:** Plain h1 + 2 nav cards (no icons, no intro sentence)

**Target:** Add icons to nav cards + a one-sentence intro under the heading.

#### Changes
- Add `<Bell className="h-6 w-6 text-primary" />` icon above h2 in the Notices card
- Add `<FileText className="h-6 w-6 text-primary" />` icon above h2 in the Tenders card
- Intro sentence below h1: "Stay updated with official notices, circulars and procurement tenders issued by SIDHKOFED."
- Cards upgrade: add an icon container `<span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Icon /></span>` before the h2

#### Files to change
- `web/src/app/notifications/page.tsx`

#### Audit checklist — Notifications
- [ ] H1 "Notifications" visible
- [ ] Intro sentence visible below h1
- [ ] Notices card: Bell icon (in bg-primary/10 container) + h2 "Notices" + description
- [ ] Tenders card: FileText icon + h2 "Tenders" + description
- [ ] Both cards link correctly: /notifications/notices and /notifications/tenders
- [ ] Dark mode: icon containers visible in dark
- [ ] Mobile: 2 cards stack to 1-col

---

### 4.7 Publications (`/publications`) — STATUS: PENDING

**Template:** E (Listing + Intro Hybrid)  
**Current state:** `ListingLayout` only — filters (category, type) + document cards

**Target:** Add a category quicklinks strip ABOVE the listing. Same pattern as Activities.

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

### 4.10 Procurement Enquiry (`/procurement/enquiry`) — STATUS: PENDING (minor)

**Template:** B (Static Content)  
**Current state:** Well-structured contact card with 4 info rows (address, phone, email, hours). Just needs a Google Maps link.

**Target:** Add Google Maps link alongside the address row.

#### Change
Below the address `<span>` in the MapPin row, add:
```tsx
<a
  href="https://maps.google.com/?q=Sameti+Bhawan+Kanke+Road+Ranchi+Jharkhand"
  target="_blank"
  rel="noopener noreferrer"
  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
>
  <Map className="h-3 w-3" /> Open in Google Maps
</a>
```

#### Files to change
- `web/src/app/procurement/enquiry/page.tsx`

#### Audit checklist — Procurement Enquiry
- [ ] Address row: address text + "Open in Google Maps" link below it
- [ ] Maps link opens correct location in new tab
- [ ] Phone: click-to-call (`tel:` link) works
- [ ] Email: mailto link works
- [ ] Card border and bg-surface visible in both light + dark mode
- [ ] Mobile: card full-width, padding comfortable

---

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
| 1 | Homepage | 🔴 PENDING | A (unique) | High | New components + API restructure |
| 2 | Activities | 🔴 PENDING | E (hybrid) | Low | Green banner + 4 quicklinks above listing |
| 3 | Notifications | 🔴 PENDING | D (hub) | Low | Icons on 2 nav cards only |
| 4 | Publications | 🔴 PENDING | E (hybrid) | Low | 5 category quicklinks above listing |
| 5 | Membership Process | 🔴 PENDING | B (static) | Medium | Numbered step cards + ContactCta |
| 6 | Membership | 🔴 PENDING | E (hybrid) | Medium | Intro + nav cards + inline FAQs |
| 7 | Procurement Enquiry | 🔴 PENDING | B (static) | Minimal | Google Maps link only |
| — | About | ✅ DONE | D (hub) | — | Diagram + Hindi + badge + CTA |
| — | Vision/Mission | ✅ DONE | B (static) | — | Icon headings + CTA |
| — | Org Governance | ✅ DONE | B (static) | — | Diagram + highlight box + RTI + CTA |

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

### C — Responsive / Mobile (375px viewport)
- [ ] No horizontal scroll / overflow
- [ ] Text readable without zooming (min 14px equivalent)
- [ ] Multi-col grids stack appropriately
- [ ] CTA buttons full-width on mobile if needed

### D — Links & Navigation
- [ ] All `<Link>` components resolve (no 404)
- [ ] External links: `target="_blank"` + `rel="noopener noreferrer"` present
- [ ] "View All" links resolve
- [ ] Breadcrumb parent links resolve

### E — Language Toggle
- [ ] All `t()` dictionary strings switch to Hindi on toggle
- [ ] Page headings that are hardcoded English stay English (they have browser translate)
- [ ] Filter labels, button text, aria-labels switch

### F — CMS / Data
- [ ] CMS sections show `<EmptyState />` when no data (never blank/broken)
- [ ] Pagination only shows when `total_pages > 1`
- [ ] Results summary reflects correct count

---

*Last updated: 2026-06-28 | Maintained in `docs/web-pages-design-spec.md`*
