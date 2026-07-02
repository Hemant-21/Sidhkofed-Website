-- Phase 7 — Toolkit, Toolkit Item, Toolkit Distribution Summary, Toolkit Distribution Item.
-- database-schema-design.md Part 6 / Part 13. PURELY ADDITIVE: new enums + new tables only.
-- No existing table is altered (the back-relations added to users / commodities / media_assets /
-- programme_schemes / events are Prisma-level only; the FK columns live on the NEW tables created
-- here). This keeps `prisma migrate deploy` forward-only and non-destructive.
--
-- onDelete contract (coding-standards §3: masters/linked content RESTRICT, optional media SET NULL):
--   toolkits.programme_scheme_id / commodity_id                   -> RESTRICT (protect linked refs)
--   toolkits.cover_media_id                                       -> SET NULL (media-usage tracked)
--   toolkits.created_by / updated_by                              -> SET NULL
--   toolkit_items.toolkit_id                                      -> CASCADE
--   toolkit_distribution_summaries.event_id                       -> CASCADE
--   toolkit_distribution_summaries.toolkit_id                     -> RESTRICT
--   toolkit_distribution_summaries.created_by / updated_by        -> SET NULL
--   toolkit_distribution_items.toolkit_distribution_summary_id    -> CASCADE
--   toolkit_distribution_items.toolkit_item_id                    -> RESTRICT

-- CreateEnum
CREATE TYPE "DistributionBasis" AS ENUM ('individual', 'group');
CREATE TYPE "DistributionModel" AS ENUM ('individual', 'group', 'mixed');

-- CreateTable
CREATE TABLE "toolkits" (
    "id" UUID NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_hi" TEXT,
    "summary_en" TEXT,
    "summary_hi" TEXT,
    "description_en" TEXT,
    "description_hi" TEXT,
    "programme_scheme_id" UUID,
    "commodity_id" UUID,
    "cover_media_id" UUID,
    "slug" TEXT NOT NULL,
    "publication_state" "PublicationState" NOT NULL DEFAULT 'draft',
    "public_visibility" BOOLEAN NOT NULL DEFAULT true,
    "publish_start_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "highlight_type" "HighlightType",
    "highlight_start_at" TIMESTAMP(3),
    "highlight_end_at" TIMESTAMP(3),
    "display_order" INTEGER,
    "show_on_homepage" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "toolkits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toolkit_items" (
    "id" UUID NOT NULL,
    "toolkit_id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "description_en" TEXT,
    "description_hi" TEXT,
    "unit" TEXT,
    "distribution_basis" "DistributionBasis" NOT NULL DEFAULT 'individual',
    "default_quantity_per_unit" DECIMAL(14,2),
    "default_group_size" INTEGER,
    "quantity_summary" DECIMAL(14,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "toolkit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toolkit_distribution_summaries" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "toolkit_id" UUID NOT NULL,
    "distribution_done" BOOLEAN NOT NULL DEFAULT false,
    "distribution_model" "DistributionModel" NOT NULL,
    "participants_covered" INTEGER,
    "distribution_date" DATE,
    "remarks_en" TEXT,
    "remarks_hi" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "toolkit_distribution_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toolkit_distribution_items" (
    "id" UUID NOT NULL,
    "toolkit_distribution_summary_id" UUID NOT NULL,
    "toolkit_item_id" UUID NOT NULL,
    "distribution_basis" "DistributionBasis" NOT NULL,
    "quantity_per_unit" DECIMAL(14,2),
    "number_of_units_or_groups" INTEGER,
    "total_quantity" DECIMAL(14,2),
    "manual_override" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "toolkit_distribution_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "toolkits_slug_key" ON "toolkits"("slug");
CREATE INDEX "toolkits_pubstate_vis_archived_published_idx" ON "toolkits"("publication_state", "public_visibility", "archived_at", "published_at");
CREATE INDEX "toolkits_show_on_homepage_display_order_idx" ON "toolkits"("show_on_homepage", "display_order");

-- CreateIndex
CREATE INDEX "toolkit_items_toolkit_id_display_order_idx" ON "toolkit_items"("toolkit_id", "display_order");

-- CreateIndex
CREATE INDEX "toolkit_distribution_summaries_toolkit_id_idx" ON "toolkit_distribution_summaries"("toolkit_id");
CREATE UNIQUE INDEX "toolkit_distribution_summaries_event_id_toolkit_id_key" ON "toolkit_distribution_summaries"("event_id", "toolkit_id");

-- CreateIndex
CREATE INDEX "toolkit_distribution_items_toolkit_item_id_idx" ON "toolkit_distribution_items"("toolkit_item_id");
CREATE UNIQUE INDEX "toolkit_distribution_items_summary_id_item_id_key" ON "toolkit_distribution_items"("toolkit_distribution_summary_id", "toolkit_item_id");

-- AddForeignKey
ALTER TABLE "toolkits" ADD CONSTRAINT "toolkits_programme_scheme_id_fkey" FOREIGN KEY ("programme_scheme_id") REFERENCES "programme_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toolkits" ADD CONSTRAINT "toolkits_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toolkits" ADD CONSTRAINT "toolkits_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "toolkits" ADD CONSTRAINT "toolkits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "toolkits" ADD CONSTRAINT "toolkits_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toolkit_items" ADD CONSTRAINT "toolkit_items_toolkit_id_fkey" FOREIGN KEY ("toolkit_id") REFERENCES "toolkits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toolkit_distribution_summaries" ADD CONSTRAINT "toolkit_distribution_summaries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "toolkit_distribution_summaries" ADD CONSTRAINT "toolkit_distribution_summaries_toolkit_id_fkey" FOREIGN KEY ("toolkit_id") REFERENCES "toolkits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toolkit_distribution_summaries" ADD CONSTRAINT "toolkit_distribution_summaries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "toolkit_distribution_summaries" ADD CONSTRAINT "toolkit_distribution_summaries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toolkit_distribution_items" ADD CONSTRAINT "toolkit_distribution_items_toolkit_distribution_summary_id_fkey" FOREIGN KEY ("toolkit_distribution_summary_id") REFERENCES "toolkit_distribution_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "toolkit_distribution_items" ADD CONSTRAINT "toolkit_distribution_items_toolkit_item_id_fkey" FOREIGN KEY ("toolkit_item_id") REFERENCES "toolkit_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
