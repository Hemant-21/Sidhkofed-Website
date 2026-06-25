-- Audit-author foreign keys (pre-Phase-5 audit, Issue 8).
-- `created_by` / `updated_by` / `uploaded_by` were bare UUID columns with no referential
-- integrity. Add proper FKs to `users` with ON DELETE SET NULL so removing a user PRESERVES
-- the historical content (the author simply becomes null) instead of cascading or blocking.
-- The columns are made nullable so SET NULL is legal. `settings.updated_by` was already
-- nullable; it only gains the FK.

-- Make audit-author columns nullable.
ALTER TABLE "media_assets" ALTER COLUMN "uploaded_by" DROP NOT NULL;
ALTER TABLE "galleries" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "galleries" ALTER COLUMN "updated_by" DROP NOT NULL;
ALTER TABLE "videos" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "videos" ALTER COLUMN "updated_by" DROP NOT NULL;

-- Add the foreign keys.
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "videos" ADD CONSTRAINT "videos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "videos" ADD CONSTRAINT "videos_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
