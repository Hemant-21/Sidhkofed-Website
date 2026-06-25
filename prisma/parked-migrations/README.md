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

### Re-introduction procedure (when the content modules land)

1. Build the content models + their base migration (creating the five tables above).
2. Copy this `migration.sql` into a **new** migration folder under `prisma/migrations/`
   with a timestamp **after** that base migration, e.g.
   `prisma/migrations/<later_ts>_metadata_full_text_search/migration.sql`.
3. Add each new searchable surface to the API `content_type` allow-list (spec §14).
4. Keep the hand-written raw-SQL style; never index PDF/file bodies (Phase-1 non-goal).

Do **not** simply move this folder back into `prisma/migrations/` with its old timestamp —
that would re-create the ordering bug.
