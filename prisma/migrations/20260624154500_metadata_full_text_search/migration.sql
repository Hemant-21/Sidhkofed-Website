-- Metadata-only full-text search for the Phase 1 public CMS.
--
-- Apply after the Prisma migration that creates the content tables. The `simple`
-- configuration safely tokenizes both English and Hindi metadata. PDF/file bodies
-- are intentionally excluded from Phase 1 search.

ALTER TABLE events
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX events_search_vector_gin_idx ON events USING GIN (search_vector);

ALTER TABLE documents
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX documents_search_vector_gin_idx ON documents USING GIN (search_vector);

ALTER TABLE official_communications
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(body_en, '') || ' ' || coalesce(body_hi, ''))
  ) STORED;
CREATE INDEX official_communications_search_vector_gin_idx ON official_communications USING GIN (search_vector);

ALTER TABLE procurement_updates
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(description_en, '') || ' ' || coalesce(description_hi, ''))
  ) STORED;
CREATE INDEX procurement_updates_search_vector_gin_idx ON procurement_updates USING GIN (search_vector);

ALTER TABLE success_stories
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig, coalesce(title_en, '') || ' ' || coalesce(title_hi, '') || ' ' || coalesce(summary_en, '') || ' ' || coalesce(summary_hi, '') || ' ' || coalesce(body_en, '') || ' ' || coalesce(body_hi, ''))
  ) STORED;
CREATE INDEX success_stories_search_vector_gin_idx ON success_stories USING GIN (search_vector);
