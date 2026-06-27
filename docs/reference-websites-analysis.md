# Reference Website Analysis — SIDHKOFED Portal Redesign

> Fetched 2026-06-28. Used as design reference for Phase 7 per-page visual improvements.

---

## Site 1 — SIDHKOFED Live Portal

**URL:** https://sidhkofed.jharkhand.gov.in/  
**Tech stack:** Static HTML/CSS, jQuery, NIC-hosted

### Navigation / IA (12 top-level items)

| Top Level | Sub-items |
|---|---|
| Home | — |
| About Us | SIDHKOFED (About, Vision, Mission, Message from Position holders) · Organisation Chart · Organisation Details · Minor Forest Produce |
| Activities | Membership Drives · Membership Format · Trainings · Events |
| Tenders | Tenders · Produce Availability |
| Publications | By Laws (LAMPS, District Union, State Fed) · Detailed Project Report · Reports (Yearly, Financial) · Brochure |
| Notices | — |
| Notifications | — |
| Digi Library | — |
| Dashboards | For Public · For Department |
| Download | Mobile App (Video) · Mobile App (PDF) |
| Contact | — |

### Header Structure

- **Utility bar (topmost strip):** A+ / A / A- text-size buttons · English / Hindi toggle (flag icons `assets/img/en.png`, `assets/img/hi.png`) · Admin login · 5 social media icons (Facebook, Twitter, LinkedIn, YouTube, Instagram)
- **Main header:** SIDHKOFED / Sidho-Kanho logo **LEFT** (`assets/img/Sidho_Kanho_logo.png`) · Jharkhand State emblem **RIGHT** (`assets/img/Jharkhand_logo.png`)
- Contact phone + email in header strip
- Chief Minister photo (`assets/img/cm.jpg`) and Agriculture Minister photo (`assets/img/ah-min.jpg`) displayed in About section

### Hero Section

- 5-image carousel: `assets/img/slider/[1–6].jpg` — field photographs, tribal community imagery
- No text taglines overlaid in HTML (images carry visual narrative on their own)
- Previous / Next navigation buttons

### Homepage Content Sections

1. **"About Our Project"** (H4) — Three-tab/card layout:
   - Principle — 7 cooperative principles (ICA values), icon: `Principle.svg`
   - Vision — org vision statement, icon: `Vision.svg`
   - Values — 6 organizational values, icon: `Values.svg`
2. **"Notifications"** (H5) — Events list (11 dated workshop entries Feb–May 2023) + Latest sub-section + Gallery photo sub-section
3. **"For Further Information"** (H3) — CTA block → /contact (appears at bottom of **every single page**)

**Notable gap:** No KPI / statistics strip on homepage.

### Internal Pages

**About (`/about.html`):**
- Single-column prose, no sidebar
- Bilingual: English body text + Hindi subheading "सिद्धकोफेड की पहचान – लोगो"
- Breadcrumb: Home > About Us
- Describes three-tier structure: LAMPS/PACS → District Unions → SIDHKOFED (State Federation)
- Reg. No. 02/H.Q./2021, formal incorporation 2021
- Logo symbolism: Red dots = Sidho-Kanho identity · Yellow Mahua flowers = forest/agriculture · Blue circles = cooperative unity · Palash = Jharkhand state flower
- "For Further Information" CTA at bottom

**Minor Forest Produce (`/minor_forest_produce.html`):**
- Breadcrumb + H2 heading, body empty/JS-rendered — placeholder pattern

**Notifications (`/notifications.html`):**
- **Table layout:** Sl. No. · Title · Date · PDF (each row has a PDF download link)
- Classic Indian government document listing pattern

### Footer

4 columns:
- **Quick Links:** About SIDHKOFED · Organisation Details · Bylaws of LAMPS · Bylaws of District Union
- **More Links:** Notifications · News Events · Training · Contact Us
- **Contact:** Sameti Bhawan, Kanke Road, Ranchi, Jharkhand – 834008 · 0651-2913012 · sidhokanhofed[at]gmail[dot]com
- **Bottom bar:** © 2024 SIDHKOFED · "Developed By JSAC Ranchi" · Social media icons repeated

### Logo Colour Palette

From the About page logo description:
- **Red** — Sidho-Kanho identity dots
- **Yellow** — Mahua flowers (forest/agriculture symbolism)
- **Blue** — cooperative unity circles
- **Flame orange/red** — Palash flower (Jharkhand state flower)

---

## Site 2 — JSLPS

**URL:** https://jslps.jharkhand.gov.in/  
**Full name:** Jharkhand State Livelihood Promotion Society  
**Tech stack:** ASP.NET (.aspx), custom CSS

### Header Structure

- **Utility bar:** Language selector (EN / Hindi / Arabic) · Phone 0651-2951915, 0651-2951916 · Search input · 4 social media icons · Palash Mart mobile app link · **RTI link prominently in utility bar**
- **Logo:** JSLPS logo **LEFT** · Jharkhand state seal **RIGHT** (`mainLogo-jharkhand.png`)
- Dark (`logo-dark.png`) and light (`logo-light.png`) logo variants available

### Hero Section

5-slide image carousel with mission taglines:
1. "Harnessing Women Power to Eliminate Poverty"
2. "Towards Prosperity"
3. "Making Rural Poor Youth Employable"
4. "Expanding Horizons, Enriching Lives"

### Homepage Content Sections

1. **Three intro cards** — equal-width, with SVG icons:
   - "Who We Are" (`WhoWeAre.svg`) — org description
   - "Our Mission" (`Ourmission.svg`) — mission focus
   - "What We Do" (`whatwedo.svg`) — livelihood activities
2. **About JSLPS** — Full-width prose paragraph (NRLM implementation, poverty targets)
3. **Vision & Mission** — Full-width text, vision + mission statements
4. **Projects Carousel** — Three equal-width project cards: JOHAR · JHIMDI · AAJEEVIKA
5. **Gallery** — 4 image tiles with lightbox (images in `assets/images/gallery/`)
6. **"The Unsung Heroes"** — Success stories section:
   - Profile photos (`the-hero/journey.jpg`, `own-identity.jpg`, `Savonnier.jpg`, `serial-entrepreneur.jpg`)
   - H4 individual names/roles · H6 journey subtitles ("Journey of A House Maker to An Entrepreneur")
   - Brief biography/achievement paragraph

### Internal Pages

**Overview (`/Overview.aspx`):**
- Large hero image banner at top (`Overview.JPG`)
- Full-width prose, 10-point objectives bullet list
- Breadcrumb: About Us > Overview

**Vision & Mission (`/VisionAndMission.aspx`):**
- Vision statement + accompanying photograph
- Mission statement + accompanying photograph

**Contact (`/Contact.aspx`):**
- Contact form: Name / Email / Phone / Subject / Message / Submit
- Address block: Jharkhand State Agriculture Marketing Board Building, ITKI Road, Hehal-834005 Ranchi
- Phone: 0651-2951915, 0651-2951916 · Email: jslps.ranchi@gmail.com

**Careers (`/Careers.aspx`):**
- Table listing 55+ recruitment notices: Sl. No. · Notice Title · Publication Date · Action link
- Table with PDF download per row

### Footer

4 columns:
- **About Us:** About · Skill Development · Social Mobilization · Livelihood Promotion · Team JSLPS
- **Our Information:** Vision & Mission · Tenders · Executive Committee · Guiding Principles · Services
- **Internal Links:** E-Bulletin · Newsletter · Office Documents · Careers · Site Map
- **Important Links:** RTI · Swalekha MIS · NRLM (Aajeevika) · DDU-GKY · RDD Jharkhand

Address block: "Rural Development Department, Jharkhand State Agriculture Marketing Board Building, ITKI Road, Hehal-834005 Ranchi, Jharkhand" · jslps.ranchi@gmail.com

---

## Design Principles Extracted for SIDHKOFED Redesign

| # | Principle | Source | Applied to |
|---|---|---|---|
| 1 | **Dual-logo header** — org seal left, state emblem right | Both | site-header.tsx (Phase 5) |
| 2 | **Utility bar topmost** — A+/A/A- · EN/HI toggle · RTI link | Both | site-header.tsx |
| 3 | **Hero carousel** — 4–5 field/community photos with taglines | Both | homepage hero |
| 4 | **"Trinity" intro cards** — 3 equal-width: Who We Are / Mission / What We Do | JSLPS | homepage section |
| 5 | **Success stories section** — profile photos + names + brief journey | JSLPS | homepage + /activities/success-stories |
| 6 | **Project/activity cards** — equal-width grid for programme areas | JSLPS | activities, procurement pages |
| 7 | **RTI in utility bar + footer** | Both | site-header + site-footer |
| 8 | **Table listing for documents** — Sl. No. · Title · Date · PDF | SIDHKOFED live | notifications, tenders |
| 9 | **"For Further Information" CTA** at bottom of every static page | SIDHKOFED live | all static pages |
| 10 | **Breadcrumb on every page** | Both | all pages (already implemented) |
| 11 | **Bilingual headings** — Hindi subheadings on key static sections | SIDHKOFED live | About page |
| 12 | **Gallery section** on homepage | JSLPS | future homepage section |
| 13 | **KPI strip** (neither reference site has this — enhancement) | New | /impact, homepage |
| 14 | **Logo colour tokens** — Red, Yellow (Mahua), Blue (cooperative) | SIDHKOFED live | design system accent colours |
| 15 | **Bilingual registration info** on About page | SIDHKOFED live | /about |
| 16 | **Three-tier cooperative structure diagram** | SIDHKOFED live About page | /about, /about/organisation-governance |

---

## What Makes These Feel Like Government Portals (Checklist)

- [x] Dual-logo header (org + state emblem)
- [x] Utility bar with A+/A/A- text size
- [x] EN/Hindi language toggle
- [x] RTI link in header and footer
- [x] Social media icons in header utility bar
- [x] Breadcrumb on every page
- [x] "Developed by [government tech body]" in footer
- [x] Full physical address with phone + email in footer
- [x] Table-based document/notice listing with PDF column
- [x] Bilingual page content (key Hindi terms alongside English)
- [x] "For Further Information" → /contact CTA at page bottoms
- [x] Admin login link in utility bar

---

*Fetched by automated agent on 2026-06-28. Pages analyzed: sidhkofed.jharkhand.gov.in/ + /about.html + /minor_forest_produce.html + /notifications.html · jslps.jharkhand.gov.in/ + /Overview.aspx + /VisionAndMission.aspx + /Contact.aspx + /Careers.aspx*
