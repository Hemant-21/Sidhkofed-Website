-- Phase 13 — Global Search: metadata-only full-text search for the public CMS.
--
-- Adds a STORED, GENERATED `search_vector` (tsvector, `simple` config) column + GIN index to every
-- content surface the API `content_type` allow-list exposes (api-specification.md §5/§14). Because the
-- column is GENERATED ALWAYS, Postgres recomputes it on every INSERT/UPDATE — the index stays in sync
-- automatically through create / update / publish / unpublish / archive / restore / delete, with no
-- manual rebuild and no application code. The `simple` configuration tokenizes English and Hindi
-- metadata uniformly (no language-specific stemming, fully predictable).
--
-- SCOPE: editorial TEXT/METADATA ONLY. PDF/file bodies, OCR, and binary attachments are NEVER indexed
-- (Phase-1 non-goal). These columns are intentionally kept OUT of `schema.prisma` (foundation
-- 04-coding-standards §3) and read exclusively through parameterized `$queryRaw`.
--
-- Surfaces covered (8 — every searchable table that currently exists). `success_stories` is NOT covered
-- because that table is not yet implemented (Phase 2); its parked migration stays parked until it lands.

ALTER TABLE events
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' ||
      coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' ||
      coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX events_search_vector_gin_idx ON events USING GIN (search_vector);

ALTER TABLE event_news
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' ||
      coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' ||
      coalesce(body_en, '') || ' ' || coalesce(body_hi, ''))
  ) STORED;
CREATE INDEX event_news_search_vector_gin_idx ON event_news USING GIN (search_vector);

ALTER TABLE programme_schemes
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' ||
      coalesce(short_code, '') || ' ' ||
      coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' ||
      coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX programme_schemes_search_vector_gin_idx ON programme_schemes USING GIN (search_vector);

ALTER TABLE documents
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' ||
      coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX documents_search_vector_gin_idx ON documents USING GIN (search_vector);

ALTER TABLE official_communications
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' ||
      coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' ||
      coalesce(body_en, '') || ' ' || coalesce(body_hi, ''))
  ) STORED;
CREATE INDEX official_communications_search_vector_gin_idx ON official_communications USING GIN (search_vector);

ALTER TABLE tenders
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' ||
      coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' ||
      coalesce(tender_number::text, ''))
  ) STORED;
CREATE INDEX tenders_search_vector_gin_idx ON tenders USING GIN (search_vector);

ALTER TABLE procurement_updates
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' ||
      coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' ||
      coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX procurement_updates_search_vector_gin_idx ON procurement_updates USING GIN (search_vector);

ALTER TABLE pages
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' ||
      coalesce(body_en, '') || ' ' || coalesce(body_hi, '') || ' ' ||
      coalesce(meta_title_en, '') || ' ' || coalesce(meta_title_hi, '') || ' ' ||
      coalesce(meta_description_en, '') || ' ' || coalesce(meta_description_hi, ''))
  ) STORED;
CREATE INDEX pages_search_vector_gin_idx ON pages USING GIN (search_vector);
