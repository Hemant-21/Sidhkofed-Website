-- Documents module (Phase 5) — database-schema-design.md Part 6 / Part 13.
-- The reusable document repository / Knowledge Centre. A Document is the governed metadata
-- record that points to ONE file asset (media_assets) and is uploaded once, linked by
-- reference from anywhere. Carries the full publishing-workflow mixin.
--
-- TRIMMED to the relations whose counterpart tables exist in this phase: document_types,
-- media_assets (file asset), knowledge_categories, financial_years, and the
-- commodity/district/tag junctions. The programme/institution junctions and the
-- event/communication/procurement back-references land additively when those modules are
-- built (dependency-graph Tiers 7/10/12). The Document table shape is unchanged from the
-- approved schema.
--
-- onDelete contract (Part 13 verbatim):
--   document_type_id        -> RESTRICT (master in use cannot be removed)
--   file_asset_id           -> RESTRICT (linked file cannot be hard-deleted; archive instead)
--   knowledge_category_id   -> SET NULL (optional ref)
--   financial_year_id       -> SET NULL (optional ref)
--   junction.document_id    -> CASCADE  (junction child follows its parent document)
--   junction.<master>_id    -> RESTRICT (master in use cannot be removed)

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_hi" TEXT,
    "description_en" TEXT,
    "description_hi" TEXT,
    "document_type_id" UUID NOT NULL,
    "file_asset_id" UUID NOT NULL,
    "publication_date" DATE,
    "language" "Language" NOT NULL DEFAULT 'en',
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "show_in_knowledge_centre" BOOLEAN NOT NULL DEFAULT false,
    "knowledge_category_id" UUID,
    "financial_year_id" UUID,
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
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_commodities" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "commodity_id" UUID NOT NULL,

    CONSTRAINT "document_commodities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_districts" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "district_id" UUID NOT NULL,

    CONSTRAINT "document_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_tags" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "document_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_slug_key" ON "documents"("slug");
CREATE INDEX "documents_publication_state_public_visibility_archived_at_p_idx" ON "documents"("publication_state", "public_visibility", "archived_at", "published_at");
CREATE INDEX "documents_publication_date_idx" ON "documents"("publication_date");
CREATE INDEX "documents_show_in_knowledge_centre_idx" ON "documents"("show_in_knowledge_centre");
CREATE INDEX "documents_document_type_id_idx" ON "documents"("document_type_id");
CREATE INDEX "documents_knowledge_category_id_idx" ON "documents"("knowledge_category_id");
CREATE INDEX "documents_financial_year_id_idx" ON "documents"("financial_year_id");

CREATE UNIQUE INDEX "document_commodities_document_id_commodity_id_key" ON "document_commodities"("document_id", "commodity_id");
CREATE INDEX "document_commodities_commodity_id_document_id_idx" ON "document_commodities"("commodity_id", "document_id");

CREATE UNIQUE INDEX "document_districts_document_id_district_id_key" ON "document_districts"("document_id", "district_id");
CREATE INDEX "document_districts_district_id_document_id_idx" ON "document_districts"("district_id", "document_id");

CREATE UNIQUE INDEX "document_tags_document_id_tag_id_key" ON "document_tags"("document_id", "tag_id");
CREATE INDEX "document_tags_tag_id_document_id_idx" ON "document_tags"("tag_id", "document_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_knowledge_category_id_fkey" FOREIGN KEY ("knowledge_category_id") REFERENCES "knowledge_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_commodities" ADD CONSTRAINT "document_commodities_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_commodities" ADD CONSTRAINT "document_commodities_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_districts" ADD CONSTRAINT "document_districts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_districts" ADD CONSTRAINT "document_districts_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
