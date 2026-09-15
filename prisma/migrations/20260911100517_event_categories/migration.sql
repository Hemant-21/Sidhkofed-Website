-- Event Category master (parents Event Type; an Event keeps exactly one Event Type,
-- and inherits its category through that type — no eventCategoryId on events).
-- Backfills existing event_types into deterministic categories before enforcing NOT NULL,
-- mirroring the blocks/districts parent-child pattern (ON DELETE RESTRICT, in-use masters
-- cannot be removed — activate/deactivate only).

-- CreateTable
CREATE TABLE "event_categories" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_categories_name_en_key" ON "event_categories"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "event_categories_slug_key" ON "event_categories"("slug");

-- Seed deterministic fallback categories (align with the website's pre-existing
-- trainings / workshops-awareness / institutional-events groupings).
INSERT INTO "event_categories" ("id", "name_en", "name_hi", "slug", "is_active", "display_order", "created_at", "updated_at") VALUES
    (gen_random_uuid(), 'Trainings', 'प्रशिक्षण', 'trainings', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Workshops & Awareness', 'कार्यशाला एवं जागरूकता', 'workshops-awareness', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Institutional Activities', 'संस्थागत गतिविधियाँ', 'institutional-activities', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable (nullable first so existing rows can be backfilled)
ALTER TABLE "event_types" ADD COLUMN     "event_category_id" UUID;

-- Backfill existing event_types by slug into the matching category.
UPDATE "event_types" SET "event_category_id" = (SELECT "id" FROM "event_categories" WHERE "slug" = 'trainings')
    WHERE "slug" IN ('training');

UPDATE "event_types" SET "event_category_id" = (SELECT "id" FROM "event_categories" WHERE "slug" = 'workshops-awareness')
    WHERE "slug" IN ('workshop', 'awareness-programme');

UPDATE "event_types" SET "event_category_id" = (SELECT "id" FROM "event_categories" WHERE "slug" = 'institutional-activities')
    WHERE "slug" IN ('meeting', 'mou-signing', 'exposure-visit', 'field-visit', 'conference', 'other-institutional-activity');

-- Any event type not covered by the mapping above (future/unexpected rows) falls back to Institutional Activities.
UPDATE "event_types" SET "event_category_id" = (SELECT "id" FROM "event_categories" WHERE "slug" = 'institutional-activities')
    WHERE "event_category_id" IS NULL;

-- AlterTable (enforce NOT NULL now that every row is backfilled)
ALTER TABLE "event_types" ALTER COLUMN "event_category_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "event_types_event_category_id_idx" ON "event_types"("event_category_id");

-- AddForeignKey
ALTER TABLE "event_types" ADD CONSTRAINT "event_types_event_category_id_fkey" FOREIGN KEY ("event_category_id") REFERENCES "event_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
