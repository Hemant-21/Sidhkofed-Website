-- Procurement Update Category master (parents Procurement Update Type; a Procurement Update
-- keeps exactly one Procurement Update Type, and inherits its category through that type — no
-- procurementUpdateCategoryId on procurement_updates).
-- Backfills the 6 existing procurement_update_types into 3 deterministic categories before
-- enforcing NOT NULL, mirroring the event_categories/event_types migration
-- (20260911100517_event_categories): ON DELETE RESTRICT, in-use masters cannot be removed —
-- activate/deactivate only.

-- CreateTable
CREATE TABLE "procurement_update_categories" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_update_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "procurement_update_categories_name_en_key" ON "procurement_update_categories"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_update_categories_slug_key" ON "procurement_update_categories"("slug");

-- Seed deterministic fallback categories (align with prisma/seed/masters.ts PROCUREMENT_UPDATE_CATEGORIES).
INSERT INTO "procurement_update_categories" ("id", "name_en", "name_hi", "slug", "is_active", "display_order", "created_at", "updated_at") VALUES
    (gen_random_uuid(), 'Rates & Trade', 'दरें एवं व्यापार', 'rates-trade', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Announcements & Schedules', 'घोषणाएँ एवं कार्यक्रम', 'announcements-schedules', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Achievements', 'उपलब्धियाँ', 'achievements', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable (nullable first so existing rows can be backfilled)
ALTER TABLE "procurement_update_types" ADD COLUMN     "procurement_update_category_id" UUID;

-- Backfill existing procurement_update_types by slug into the matching category.
UPDATE "procurement_update_types" SET "procurement_update_category_id" = (SELECT "id" FROM "procurement_update_categories" WHERE "slug" = 'rates-trade')
    WHERE "slug" IN ('procurement-rate', 'trade-opportunity');

UPDATE "procurement_update_types" SET "procurement_update_category_id" = (SELECT "id" FROM "procurement_update_categories" WHERE "slug" = 'announcements-schedules')
    WHERE "slug" IN ('procurement-announcement', 'procurement-schedule', 'procurement-centre-update');

UPDATE "procurement_update_types" SET "procurement_update_category_id" = (SELECT "id" FROM "procurement_update_categories" WHERE "slug" = 'achievements')
    WHERE "slug" IN ('procurement-achievement');

-- Any procurement update type not covered by the mapping above (future/unexpected rows) falls
-- back to Announcements & Schedules.
UPDATE "procurement_update_types" SET "procurement_update_category_id" = (SELECT "id" FROM "procurement_update_categories" WHERE "slug" = 'announcements-schedules')
    WHERE "procurement_update_category_id" IS NULL;

-- AlterTable (enforce NOT NULL now that every row is backfilled)
ALTER TABLE "procurement_update_types" ALTER COLUMN "procurement_update_category_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "procurement_update_types_procurement_update_category_id_idx" ON "procurement_update_types"("procurement_update_category_id");

-- AddForeignKey
ALTER TABLE "procurement_update_types" ADD CONSTRAINT "procurement_update_types_procurement_update_category_id_fkey" FOREIGN KEY ("procurement_update_category_id") REFERENCES "procurement_update_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
