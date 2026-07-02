-- Remediation Issue 7 — Document public-listing performance index.
-- Matches the public listing predicate (published + public_visibility + is_public + not
-- archived) followed by the default sort key (publication_date). Keeps the public list and its
-- pagination index-driven instead of a sequential scan + sort. One targeted composite index —
-- deliberately not over-indexed (admin/published_at ordering is already served by the existing
-- `documents_publication_state_public_visibility_archived_at_p_idx`).

-- CreateIndex
CREATE INDEX "documents_publication_state_public_visibility_is_public_arc_idx" ON "documents"("publication_state", "public_visibility", "is_public", "archived_at", "publication_date");
