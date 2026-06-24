# SIDHKOFED CMS API Context

## Purpose

This folder translates the full CMS scope into module-based API context for
future backend implementation.

Source of truth:

- `docs/sidhkofed-cms-codex-context.md`
- `docs/cms-integration-conventions.md`

## Reading Order

1. `00-api-foundation.md`
2. The module file being implemented
3. The matching section in `docs/sidhkofed-cms-codex-context.md`

## Files

- `00-api-foundation.md` - shared API rules
- `01-homepage-api.md` - aggregated public homepage endpoint
- `02-events-news-api.md` - events, training, activities, and news projection
- `03-programmes-schemes-api.md`
- `04-toolkits-api.md`
- `05-institutions-api.md`
- `06-documents-api.md`
- `07-communications-api.md`
- `08-tenders-api.md`
- `09-procurement-updates-api.md`
- `10-pages-menus-api.md`
- `11-media-galleries-videos-api.md`
- `12-memberships-api.md`
- `13-faqs-digital-services-api.md`
- `14-enquiries-api.md`
- `15-dashboard-api.md`
- `16-masters-api.md`
- `17-users-audit-settings-api.md`

## Non-Negotiables

- Keep listing responses lightweight.
- Put rich relationships only in detail responses.
- Return only published/public records from public APIs.
- Use `snake_case` for API fields unless a future frontend adapter explicitly maps them.
- Do not create separate APIs for activity subtypes that belong under `Event`.
- Do not turn this CMS into ERP/MIS, inventory, accounting, or procurement transaction software.
