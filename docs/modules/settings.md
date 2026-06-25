# Settings Module

Schema-backed, typed key/value configuration for the CMS. Single source of truth for
site/contact/social/footer/SEO/upload/limit settings, with a Redis cache and typed
accessors so the rest of the app never does raw JSON lookups.

## Architecture

```
controller → service → repository → prisma(settings)
                  │
                  ├── settings.catalog.ts  (typed catalog: group, kind, Zod schema, default, storage)
                  ├── Redis cache          (key: settings:resolved)
                  └── audit.service        (SETTINGS_CHANGE)
```

- **Catalog** (`settings.catalog.ts`) is the single source of truth. Each key declares a
  group, a value `kind`, a Zod `schema`, a `default`, and how it is stored (`value_text`
  scalar vs `value_json` array/object). Adding a key here is the only change needed to
  make it readable, writable, validated, typed, and API-exposed.
- **Resolution** = catalog defaults overlaid with stored rows. The resolved map is cached
  in Redis (`CACHE_TTL_SECONDS`) and rebuilt on a cache miss; cache failures fall back to
  the DB so settings never hard-fail.
- **Storage** maps onto the approved `settings` columns (no schema change): scalars →
  `value_text`, arrays/objects → `value_json`.

## Flow (PUT)

1. `PUT /admin/settings/:key` with `{ value }`.
2. Service rejects unknown keys (`404`), validates `value` against the key's Zod schema
   (`422`), encodes to `value_text`/`value_json`, and upserts.
3. Cache invalidated; `SETTINGS_CHANGE` audit recorded with old/new values.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/admin/settings` | All settings grouped by category. |
| GET | `/api/v1/admin/settings/:key` | One setting with metadata; `404` if unknown. |
| PUT | `/api/v1/admin/settings/:key` | Body `{ value }`; validated + audited. |

Categories: `site`, `homepage`, `contact`, `social`, `footer`, `seo`, `uploads`,
`limits`, `translation`. Limits include `limits.video_homepage_limit` (cap 3 featured
homepage videos) and `limits.homepage_highlight_limit`.

## Typed accessors

Used by other modules instead of raw lookups:

```ts
await settingsService.getVideoHomepageLimit();   // number (videos module enforces the cap)
await settingsService.getMaxImageBytes();         // number (media validation)
await settingsService.getAllowedImageTypes();     // string[]
await settingsService.get('site.name');           // typed by key
```

## RBAC

Super Admin only (API spec §6/§8). Enforced by `authenticate` + `authorize(['super_admin'])`.

## Future extension points

- Add a public read endpoint (`/public/settings`) exposing a safe allow-list subset.
- New keys: add to `SETTINGS_CATALOG` only.
- Overlap with env (`uploads.*`, `translation.*`): the settings table is the runtime
  source of truth; env provides bootstrap defaults.
