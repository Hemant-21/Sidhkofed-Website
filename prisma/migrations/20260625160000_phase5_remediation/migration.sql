-- Phase 5 remediation.
--
-- Issue 3 — duplicate-news prevention (database layer):
--   event_news.event_id becomes UNIQUE so an event can be published as news at most once.
--   The redundant non-unique index on event_id is dropped (the unique index also serves lookups).
--   NOTE: if any pre-existing rows already share an event_id this CREATE UNIQUE INDEX will fail;
--   de-duplicate event_news first (keep the earliest row per event_id) before deploying.
--
-- Issue 6 — public-query indexes (scheduled-publishing gate):
--   add the visibility predicate index ending in publish_start_at for events / event_news /
--   documents (documents include the extra is_public column). Existing predicate indexes that
--   end in published_at / publication_date are retained (different sort keys; not redundant).

-- DropIndex
DROP INDEX "event_news_event_id_idx";

-- CreateIndex
CREATE INDEX "documents_pubstate_vis_ispublic_archived_publishstart_idx" ON "documents"("publication_state", "public_visibility", "is_public", "archived_at", "publish_start_at");

-- CreateIndex
CREATE INDEX "events_pubstate_vis_archived_publishstart_idx" ON "events"("publication_state", "public_visibility", "archived_at", "publish_start_at");

-- CreateIndex
CREATE INDEX "event_news_pubstate_vis_archived_publishstart_idx" ON "event_news"("publication_state", "public_visibility", "archived_at", "publish_start_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_news_event_id_key" ON "event_news"("event_id");
