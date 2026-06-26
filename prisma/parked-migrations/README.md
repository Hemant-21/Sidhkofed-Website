# Parked migrations

Migrations here are **valid SQL that is not yet applicable** because they depend on
database objects (tables) that later phases create. They are kept out of
`prisma/migrations/` so that `prisma migrate deploy` against a fresh database **never
fails on a forward reference**.

## `20260624154500_metadata_full_text_search`

Adds metadata `search_vector` (`tsvector`, `simple` config) columns + GIN indexes to the
**content** tables:

- `events`
- `documents`
- `official_communications`
- `procurement_updates`
- `success_stories`

None of those tables exist yet (the content modules are not built — Phase 5+). This
migration was originally checked in with a timestamp (`20260624154500`) that sorts
**before** the migrations that create those tables, so a fresh `migrate deploy` died here
(pre-Phase-5 audit, Issue 1).

### Status (Phase 13 — Global Search)

The content modules have now landed (Phases 5–10). Phase 13 introduced metadata full-text search
via the applied migration
`prisma/migrations/20260626190000_metadata_full_text_search/migration.sql`, which adds the
`search_vector` columns + GIN indexes to the **eight searchable tables that currently exist**:
`events`, `event_news`, `programme_schemes`, `documents`, `official_communications`, `tenders`,
`procurement_updates`, `pages` — exactly the API `content_type` allow-list (spec §5/§14).

This parked file is **retained only for `success_stories`**, which is still not implemented
(Phase 2). When that table lands, add only its `search_vector` column + GIN index in a **new**
migration (timestamped after the table's base migration) and append `success_story` to the
`content_type` allow-list — do not re-add the eight columns already created by the Phase-13 migration.

### Re-introduction procedure (for the remaining `success_stories` surface)

1. Build the `success_stories` model + its base migration (creating the table).
2. Add ONLY the `success_stories` `search_vector` block from this file into a **new** migration folder
   under `prisma/migrations/` with a timestamp **after** that base migration.
3. Add `success_story` to the API `content_type` allow-list (`src/modules/search/search.types.ts`)
   and a surface fragment in `search.repository.ts`.
4. Keep the hand-written raw-SQL style; never index PDF/file bodies (Phase-1 non-goal).

Do **not** simply move this folder back into `prisma/migrations/` with its old timestamp —
that would re-create the ordering bug (and now also collide with the Phase-13 columns).
