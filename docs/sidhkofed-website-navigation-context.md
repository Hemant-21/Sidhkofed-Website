# SIDHKOFED Public Website Navigation Context

## Purpose

This document defines the approved public navigation structure for the SIDHKOFED website.

Use it as the source of truth when designing:

- Header navigation
- Desktop dropdown menus
- Mobile navigation
- Public page hierarchy
- Route structure
- Homepage navigation links
- CMS menu records

The public navigation must be user-focused and must not mirror the CMS sidebar directly.

---

## 1. Primary Navigation

Display the following items in this order:

1. Home
2. About Us
3. Activities
4. Membership
5. Procurement
6. Impact
7. Publications
8. Notifications

### Header Contact CTA

`Contact Us` is not part of the primary navigation list.

Desktop behaviour:

- Display a distinct `Contact Us` button at the far right of the main header.
- Keep the button visible in the sticky header.
- Link directly to the Contact page.
- Do not open a dropdown.

Mobile behaviour:

- Display `Contact Us` as a highlighted button inside the expanded mobile navigation.
- Do not use a permanently floating overlay button.

---

## 2. Utility Controls

The header utility area must include:

- Global search
- English / हिन्दी language switch
- Accessibility controls
- Light / Dark mode toggle

The following services are deferred and must not be shown in Phase 1:

- ERP
- MIS
- Digital Services

The implementation should allow these services to be added later without redesigning the main navigation.

---

## 3. About Us

### Submenu

1. About SIDHKOFED
2. Vision, Mission, Objectives & Functions
3. Organisation & Governance

### Decisions

- Related institutional topics may be combined on the same page instead of creating many shallow pages.
- Partners and Collaborations must not appear as an About Us submenu item.
- Selected partners and collaboration logos will be displayed on the homepage.

### Suggested routes

```text
/about
/about/vision-mission-objectives-functions
/about/organisation-governance
```

### CMS mapping

Use static Page records and stable slugs.

Menu hierarchy may be represented using the existing menu parent relationship.

---

## 4. Activities

### Submenu

1. Activities Overview
2. Trainings & Capacity Building
3. Workshops & Awareness Programmes
4. Meetings, Visits & Institutional Events
5. Success Stories

### Classification approach

Do not create separate backend operations for each activity submenu.

Use the common Event operation and classify records through:

- Event type
- Training type
- Event status
- District
- Commodity
- Programme or scheme
- Dates
- Public visibility

Suggested event-type mappings:

```text
Trainings & Capacity Building
- training

Workshops & Awareness Programmes
- workshop
- awareness-programme

Meetings, Visits & Institutional Events
- meeting
- field-visit
- exposure-visit
- conference
- mou-signing
- other institutional event types
```

### Toolkit distribution

Toolkit Distribution must not be a separate submenu item.

Display toolkit information:

- Inside related activity detail pages
- Inside training impact sections
- Inside dashboard reports where relevant

### Suggested routes

```text
/activities
/activities/trainings
/activities/workshops-awareness
/activities/institutional-events
/activities/success-stories
```

### Phase 1 fallback

If the Success Stories CMS operation is unavailable, the website may use manually maintained or page-based content until CMS support is completed.

---

## 5. Membership

### Submenu

1. Membership Overview
2. SIDHKOFED Membership
3. District Union Membership
4. Member Directory
5. Membership Process
6. Membership FAQs

### Classification approach

Use the existing membership identifiers:

- Membership level
- Membership type
- District
- District Union
- Status
- Reporting period
- Public visibility

### Page behaviour

SIDHKOFED Membership must distinguish:

- Primary Membership
- Nominal Membership

District Union Membership must distinguish:

- Primary Membership
- Nominal Membership

Use tabs or page sections for these distinctions. Do not create separate top-level submenu items for each type.

### Important scope rule

Membership refers to institutional and cooperative membership.

It does not represent individual beneficiary membership.

### Membership FAQs

Use the Membership FAQ category or its stable slug to filter relevant FAQs.

### Suggested routes

```text
/membership
/membership/sidhkofed
/membership/district-unions
/membership/directory
/membership/process
/membership/faqs
```

---

## 6. Procurement

### Submenu

1. Procurement Overview
2. Procurement Announcements
3. Upcoming Procurements
4. Buyer / Seller Enquiry

### Procurement Overview

Display the commodities handled or traded by SIDHKOFED within the overview page.

Do not create Commodities as a separate primary navigation item.

The homepage should also show a short glimpse of featured commodities.

### Procurement Announcements

Combine the following public information on one page:

- Procurement rates
- Procurement schedules
- Procurement centre updates
- General procurement announcements

Use tabs or filters based on the procurement update type.

Suggested type identifiers:

```text
procurement-rate
procurement-announcement
procurement-schedule
procurement-centre-update
```

### Upcoming Procurements

Upcoming Procurements is a filtered view of procurement records.

It is not a separate CMS operation or database table.

Derive the view using:

- Procurement update type
- Period start date
- Effective date
- Period end date
- Status
- Publication state
- Public visibility

If the API does not yet provide an upcoming filter, records may be manually curated or filtered temporarily in the website implementation.

### Buyer / Seller Enquiry

Use the common enquiry form.

Differentiate submissions through enquiry type identifiers such as:

```text
buyer
seller
procurement
```

### Suggested routes

```text
/procurement
/procurement/announcements
/procurement/upcoming
/procurement/enquiry
```

---

## 7. Impact

### Submenu

1. Impact Overview
2. Public Dashboard
3. Training & Beneficiary Impact

### Decisions

- District coverage must be displayed within Training & Beneficiary Impact.
- Membership Statistics must not be a separate submenu item.
- Procurement data must be displayed through the Public Dashboard.
- Membership data may remain available as dashboard reports without becoming a separate navigation item.

### Dashboard report coverage

The Public Dashboard may expose fixed reports for:

- Procurement summary
- Training summary
- Beneficiaries reached
- Activities and events
- District coverage
- Commodity-wise activities
- Toolkit distribution
- Programme and scheme coverage
- Partnerships and MoUs
- Membership summaries

### Suggested routes

```text
/impact
/impact/dashboard
/impact/training-beneficiaries
```

---

## 8. Publications

### Submenu

1. Publications Overview
2. Reports & Research
3. Policies, Guidelines & SOPs
4. Training Materials
5. Forms & Formats
6. Media Gallery

### Public naming

The final public label is `Publications`.

Internal CMS and API terminology may continue to use:

- Knowledge Centre
- Knowledge categories
- `show_in_knowledge_centre`

Do not rename internal database fields solely to match the public label.

### Classification approach

Use:

- Document type
- Knowledge category
- Financial year
- Language
- Tags
- Commodity links
- Programme links
- Institution links
- District links
- Public visibility

### Media Gallery

The Media Gallery page must provide:

- Photo Gallery
- Video Gallery

Use tabs or clearly separated sections.

Photos and videos remain separate record types internally.

### Suggested routes

```text
/publications
/publications/reports-research
/publications/policies-guidelines-sops
/publications/training-materials
/publications/forms-formats
/publications/media
```

---

## 9. Notifications

### Submenu

1. Notices
2. Tenders

### Notices classification

The public Notices page must display only communication records classified as public notices.

Use:

- Communication type
- Communication type slug
- Publication state
- Public visibility
- Issue date
- Highlight status

Typical filter:

```text
communication_type.slug = notice
publication_state = published
public_visibility = true
not archived
```

### Internal communications

The following communication types must not appear publicly by default:

- Circulars
- Office Orders

They may remain managed inside the CMS.

Their records should remain unpublished or use:

```text
public_visibility = false
```

Other communication types, such as advisories or public announcements, should only appear publicly when intentionally classified and published as public content.

### Tenders

Tenders remain separate from official communications because they have dedicated metadata such as:

- Tender number
- Tender type
- Publishing date
- Submission deadline
- Opening date
- Tender status
- GeM URL

### Suggested routes

```text
/notifications/notices
/notifications/tenders
```

---

## 10. Home Page Navigation Content

The homepage should provide entry points to the major public sections without reproducing the entire menu.

Include:

- Featured activities
- Training and capacity-building highlights
- Featured commodities
- Procurement highlights
- Impact KPIs
- Recent publications
- Notices and active tenders
- Selected partners and collaborations
- Success stories, where available
- Contact CTA

### Partners and collaborations

Display selected institutions using:

- Homepage selection flag
- Logo
- Short label
- Display order
- Public visibility

Partners do not require a dedicated primary navigation item.

---

## 11. Contact Page

### Header behaviour

Desktop:

- `Contact Us` appears as a distinct button after the primary navigation.

Mobile:

- `Contact Us` appears as a highlighted button within the expanded menu.

### Contact page content

The page may include:

- Office name
- Address
- Phone
- Email
- Office hours
- Map link
- Social links
- Enquiry form

### Suggested route

```text
/contact
```

### Phase 1 fallback

If CMS enquiry persistence is unavailable, enquiry submissions may temporarily use the configured email or another approved manual process.

The frontend form should remain compatible with the planned Enquiries API.

---

## 12. Global Navigation Behaviour

### Desktop

- Use a sticky main header.
- Keep all eight primary items visible where screen width permits.
- Use dropdowns for submenu items.
- Keep `Contact Us` visually distinct from normal menu links.
- Ensure keyboard navigation works for all dropdowns.

### Mobile

- Use a menu button and expandable navigation panel.
- Show submenu items in accessible accordions.
- Keep `Contact Us` inside the mobile panel as a highlighted action.
- Do not rely on hover interactions.
- Do not display a permanent floating contact overlay.

### Bilingual behaviour

- Menu labels must support English and Hindi.
- Avoid layouts that depend on fixed English text widths.
- Allow dropdown and mobile menu containers to grow for longer Hindi labels.

### Dark mode

Dark mode must apply consistently to:

- Header
- Dropdowns
- Mobile navigation
- Cards
- Forms
- Tables
- Dashboard charts
- Maps
- Focus states
- Borders
- Shadows
- Document and media surfaces

Store visitor theme preference in browser storage and respect the system preference initially.

---

## 13. Final Navigation Tree

```text
Home

About Us
├── About SIDHKOFED
├── Vision, Mission, Objectives & Functions
└── Organisation & Governance

Activities
├── Activities Overview
├── Trainings & Capacity Building
├── Workshops & Awareness Programmes
├── Meetings, Visits & Institutional Events
└── Success Stories

Membership
├── Membership Overview
├── SIDHKOFED Membership
├── District Union Membership
├── Member Directory
├── Membership Process
└── Membership FAQs

Procurement
├── Procurement Overview
├── Procurement Announcements
├── Upcoming Procurements
└── Buyer / Seller Enquiry

Impact
├── Impact Overview
├── Public Dashboard
└── Training & Beneficiary Impact

Publications
├── Publications Overview
├── Reports & Research
├── Policies, Guidelines & SOPs
├── Training Materials
├── Forms & Formats
└── Media Gallery
    ├── Photo Gallery
    └── Video Gallery

Notifications
├── Notices
└── Tenders

Contact Us
└── Header CTA linking to /contact
```

---

## 14. Implementation Constraints

- Do not mirror the CMS sidebar in the public navigation.
- Do not create a separate backend module for every submenu item.
- Use type masters, slugs, dates, status and visibility to produce filtered views.
- Do not expose Circulars and Office Orders publicly by default.
- Do not add ERP, MIS or Digital Services in Phase 1.
- Do not create a separate Commodities top-level menu.
- Do not create a separate Toolkit Distribution submenu.
- Keep URLs stable after launch.
- Keep navigation bilingual-ready.
- Keep the layout accessible in both light and dark modes.
- Manual content may temporarily replace unavailable CMS-driven sections, but frontend components must remain API-ready.

---

## 15. Status

This navigation structure is approved for detailed page planning and website implementation.

Deferred CMS-dependent items:

- Success Stories persistence
- Enquiry persistence
- Dedicated Upcoming Procurements API filter

These items are not blockers for Phase 1 page and component design.
