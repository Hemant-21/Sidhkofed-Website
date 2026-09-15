-- Replace FAQ categories with many-to-many main-page assignments.
-- FaqPageAssignment(faq_id, page_key, display_order) lets one FAQ appear on zero or more
-- registered main pages (see src/modules/faqs/faqs.pages.registry.ts), each with its own
-- independent order. Faq.display_order is kept, but now means only the central /faqs
-- directory order. show_on_homepage is replaced by an ordinary page_key = 'home' assignment.
--
-- Data moves BEFORE the destructive drops below:
--   1. create faq_page_assignments
--   2. backfill every FAQ that had show_on_homepage = true into a 'home' assignment
--   3. deterministically distribute every FAQ across the remaining 9 registered page keys
--      (round-robin by display_order/id), so existing (dummy) FAQs land on representative
--      pages instead of being silently unassigned
--   4. only then drop faq_category_id / show_on_homepage / faq_categories
-- No FAQ content rows are created or deleted by this migration.

-- CreateTable
CREATE TABLE "faq_page_assignments" (
    "id" UUID NOT NULL,
    "faq_id" UUID NOT NULL,
    "page_key" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_page_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "faq_page_assignments_page_key_display_order_faq_id_idx" ON "faq_page_assignments"("page_key", "display_order", "faq_id");

-- CreateIndex
CREATE UNIQUE INDEX "faq_page_assignments_faq_id_page_key_key" ON "faq_page_assignments"("faq_id", "page_key");

-- AddForeignKey
ALTER TABLE "faq_page_assignments" ADD CONSTRAINT "faq_page_assignments_faq_id_fkey" FOREIGN KEY ("faq_id") REFERENCES "faqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: former show_on_homepage = true FAQs become ordinary 'home' assignments,
-- keeping their existing display_order as the initial per-page order.
INSERT INTO "faq_page_assignments" ("id", "faq_id", "page_key", "display_order", "created_at", "updated_at")
SELECT gen_random_uuid(),
       f."id",
       'home',
       ROW_NUMBER() OVER (ORDER BY f."display_order" ASC NULLS LAST, f."id" ASC) - 1,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "faqs" f
WHERE f."show_on_homepage" = TRUE;

-- Backfill: every FAQ (categorised or not) also gets one deterministic assignment onto a
-- representative non-home registered page, distributed round-robin by existing
-- display_order/id, so no existing FAQ silently disappears from every page.
WITH ranked AS (
    SELECT f."id" AS faq_id,
           ROW_NUMBER() OVER (ORDER BY f."display_order" ASC NULLS LAST, f."id" ASC) - 1 AS rn
    FROM "faqs" f
),
page_keys AS (
    SELECT page_key, ordinal - 1 AS idx
    FROM unnest(ARRAY['about','activities','membership','procurement','digital-services','publications','notifications','impact-dashboard','contact'])
         WITH ORDINALITY AS t(page_key, ordinal)
)
INSERT INTO "faq_page_assignments" ("id", "faq_id", "page_key", "display_order", "created_at", "updated_at")
SELECT gen_random_uuid(),
       r.faq_id,
       pk.page_key,
       (r.rn / 9)::int,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM ranked r
JOIN page_keys pk ON pk.idx = r.rn % 9;

-- DropForeignKey
ALTER TABLE "faqs" DROP CONSTRAINT "faqs_faq_category_id_fkey";

-- DropIndex
DROP INDEX "faqs_faq_category_id_idx";

-- DropIndex
DROP INDEX "faqs_show_on_homepage_display_order_idx";

-- AlterTable
ALTER TABLE "faqs" DROP COLUMN "faq_category_id",
DROP COLUMN "show_on_homepage";

-- DropTable
DROP TABLE "faq_categories";
