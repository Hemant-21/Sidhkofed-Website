-- Remove the unused Tags feature (document classification tags + their document assignments).
-- Verified before writing this migration: 0 rows in "tags" and 0 rows in "document_tags" in the
-- environment this was authored against. This migration re-verifies that at apply time and
-- refuses to run (rolling back the whole transaction) if either table has since gained data —
-- it must never silently delete real tag usage in an environment where the feature was used.
--
-- Applied inside Prisma's own per-migration transaction. Locks both tables first so a concurrent
-- write cannot race the guard between the count check and the drop. No CASCADE: any dependency
-- on these tables beyond the FK between them will make this fail loudly instead of silently
-- taking something else down with it.

LOCK TABLE "document_tags" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "tags" IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  tag_count INTEGER;
  document_tag_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO document_tag_count FROM "document_tags";
  SELECT COUNT(*) INTO tag_count FROM "tags";
  IF document_tag_count > 0 OR tag_count > 0 THEN
    RAISE EXCEPTION 'Refusing to remove Tags: % tag(s) and % document_tag assignment(s) still exist. This migration only removes the unused Tags feature — back up and clear or migrate this data before retrying.', tag_count, document_tag_count;
  END IF;
END $$;

DROP TABLE "document_tags";
DROP TABLE "tags";
