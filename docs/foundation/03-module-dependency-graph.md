# 3. Module Dependency Graph & Build Order

> Derived strictly from the schema's foreign keys and the API's module boundaries.
> "Depends on" = needs the other module's **service/data** to exist first (FK
> references, validation lookups, or aggregation). Modules import other modules'
> **services**, never repositories.

## Core modules (foundation — build first)

These have no business dependency on content modules; everything else depends on them.

| Module | Depends on | Provides to everyone |
|---|---|---|
| **RBAC** (roles, permissions) | — | permission keys, role baselines |
| **Users** | RBAC | `created_by`/`updated_by`/`uploaded_by` identities |
| **Auth** | Users, RBAC | bearer/refresh tokens, `auth/me`, login audit |
| **Audit** | Users | append-only `audit_logs` writer (cross-cutting) |
| **Settings** | Users | site/footer/social/translation/upload/enquiry-recipient config |

> RBAC + Users + Auth + Audit + Settings form the platform core. Audit and Settings
> are cross-cutting: every state change writes audit; many services read settings.

## Platform services (not "modules" but required before modules)

`config` → `db (Prisma client)` → `shared (envelope/errors/lifecycle)` →
`middleware (auth/RBAC/error/rate-limit)` → infra `services (storage/cache/mail/search/audit)`.
Build these before any module ships an endpoint.

## Dependent modules

| Module | Depends on |
|---|---|
| **Media** (assets, usages, replace) | Users (uploader); core |
| **Masters** (all 18 lookups) | Media (only `commodities.icon_media_id`) |
| **Galleries** | Media |
| **Videos** | Media |
| **Programmes/Schemes** | Masters (commodities, training-types), Media |
| **Institutions** | Masters (institution-types, districts), Media |
| **Documents** | Masters (document-types, knowledge-categories, financial-years, tags), Media, Programmes, Institutions, (districts/commodities via junctions) |
| **Toolkits** (+items, distribution defs) | Programmes, Masters (commodities), Media |
| **Events** (+field-definitions) | Masters (event-/training-types, districts, blocks), Media, Documents, Galleries, Programmes, Institutions, Toolkits |
| **Event News** | Events |
| **Official Communications** | Masters (communication-types), Documents |
| **Tenders** | Masters (tender-types) |
| **Procurement Updates** | Masters (procurement-update-types, commodities, districts, blocks), Programmes, Documents |
| **Success Stories** | Masters (commodities, districts), Media, soft refs → Events/Programmes/Procurement |
| **Pages** | core only |
| **Menus** | Pages |
| **FAQs** | Masters (faq-categories) |
| **Digital Services** | Media (icon) |
| **Institutional Membership** | Institutions, Masters (districts, reporting-periods) |
| **Enquiries** | Masters (enquiry-types, commodities), Programmes |
| **Dashboard** (reports, metrics, datasets) | Masters (financial-years, reporting-periods), Media (Excel upload), reads Memberships + CMS-derived data |
| **Search** | every searchable content module (read-only over `search_vector`) |
| **Home** | Events, News, Communications, Tenders, Success Stories, Institutions, Videos, Dashboard KPIs (aggregator) |

## Output: dependency / build order (tiers)

Build top-to-bottom. Modules in the same tier are independent of each other.

```text
Tier 0  Platform     config, db, shared, middleware, infra services
Tier 1  RBAC         roles, permissions (+ permission seeder)
Tier 2  Users
Tier 3  Auth · Audit · Settings
Tier 4  Media        media_assets, media_usages, replace/usages
Tier 5  Masters      all 18 lookup tables (+ masters seeder)
Tier 6  Galleries · Videos
Tier 7  Programmes · Institutions
Tier 8  Documents
Tier 9  Toolkits     toolkits, toolkit_items, distribution definitions
Tier 10 Events       events + event_field_definitions
Tier 11 Event News
Tier 12 Official Communications · Tenders · Procurement Updates
Tier 13 Pages · FAQs · Digital Services · Enquiries
Tier 14 Menus · Institutional Membership · Success Stories
Tier 15 Dashboard    reports, metrics, datasets/upload
Tier 16 Search · Home (aggregators — last)
```

### Rationale for non-obvious ordering

- **Masters before all content** — every content create validates FK references against active masters.
- **Media before Masters** — only because `commodities.icon_media_id` references media; otherwise masters are near-foundational.
- **Galleries/Videos before Events** — events link galleries; events should be able to reference real galleries in tests.
- **Documents before Communications/Procurement** — both carry optional `document_id`.
- **Toolkits before Events** — `toolkit_distribution_summaries` reference both `event_id` and `toolkit_id`; events own the distribution sub-resource.
- **Success Stories in Tier 14** — its soft `source_record_id` may point at Events/Programmes/Procurement, which must exist first. (Spec also defers stories to Phase 2.)
- **Search & Home last** — pure read-aggregators over everything already built.

## Cross-module call rule

```text
ALLOWED   events.service → documents.service.assertLinkable(ids)
ALLOWED   any.service     → audit.service.record(...)
FORBIDDEN events.service → documents.repository.*      (never reach into another module's data layer)
```

This keeps module boundaries hard, makes the build order safe, and lets each tier be
tested against stable lower tiers.
