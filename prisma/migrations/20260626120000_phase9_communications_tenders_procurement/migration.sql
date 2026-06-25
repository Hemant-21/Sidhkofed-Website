-- Phase 9 — Official Communications, Tenders, Procurement Updates.
-- database-schema-design.md Part 13 (models OfficialCommunication / Tender / ProcurementUpdate).
-- PURELY ADDITIVE: three new tables only. No existing table is altered (the back-relations added to
-- users / communication_types / tender_types / procurement_update_types / commodities / districts /
-- blocks / programme_schemes / documents are Prisma-level only; the FK columns live on the NEW
-- tables created here). This keeps `prisma migrate deploy` forward-only and non-destructive.
--
-- onDelete contract (coding-standards §3: masters/linked content RESTRICT, optional refs/authors):
--   official_communications.communication_type_id            -> RESTRICT (protect master ref)
--   official_communications.document_id                      -> RESTRICT (linked document cannot be deleted)
--   official_communications.created_by / updated_by          -> SET NULL
--   tenders.tender_type_id                                   -> RESTRICT
--   tenders.created_by / updated_by                          -> SET NULL
--   procurement_updates.procurement_update_type_id           -> RESTRICT
--   procurement_updates.commodity_id / district_id / block_id / programme_scheme_id / document_id -> RESTRICT
--   procurement_updates.created_by / updated_by              -> SET NULL
--
-- Business rules enforced in the service layer (not the DB): expiry dates are INFORMATIONAL ONLY and
-- never auto-unpublish/auto-archive; highlight expiry only clears the label; procurement is
-- information-only (no transactions/inventory/payments).

-- CreateTable
CREATE TABLE "official_communications" (
    "id" UUID NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_hi" TEXT,
    "summary_en" TEXT,
    "summary_hi" TEXT,
    "body_en" TEXT,
    "body_hi" TEXT,
    "communication_type_id" UUID NOT NULL,
    "reference_number" TEXT,
    "issue_date" DATE,
    "effective_date" DATE,
    "expiry_date" DATE,
    "issuing_authority" TEXT,
    "document_id" UUID,
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

    CONSTRAINT "official_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenders" (
    "id" UUID NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_hi" TEXT,
    "summary_en" TEXT,
    "summary_hi" TEXT,
    "tender_type_id" UUID NOT NULL,
    "tender_number" TEXT,
    "publish_date" DATE,
    "submission_deadline" TIMESTAMP(3),
    "opening_date" TIMESTAMP(3),
    "tender_status" TEXT,
    "gem_url" TEXT,
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

    CONSTRAINT "tenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_updates" (
    "id" UUID NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_hi" TEXT,
    "summary_en" TEXT,
    "summary_hi" TEXT,
    "description_en" TEXT,
    "description_hi" TEXT,
    "procurement_update_type_id" UUID NOT NULL,
    "commodity_id" UUID,
    "rate" DECIMAL(14,2),
    "unit" TEXT,
    "effective_date" DATE,
    "period_start" DATE,
    "period_end" DATE,
    "district_id" UUID,
    "block_id" UUID,
    "location_text" TEXT,
    "programme_scheme_id" UUID,
    "document_id" UUID,
    "status" TEXT,
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

    CONSTRAINT "procurement_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "official_communications_slug_key" ON "official_communications"("slug");
CREATE INDEX "official_communications_publication_state_public_visibility_idx" ON "official_communications"("publication_state", "public_visibility", "archived_at", "published_at");
CREATE INDEX "official_communications_communication_type_id_idx" ON "official_communications"("communication_type_id");
CREATE INDEX "official_communications_issue_date_idx" ON "official_communications"("issue_date");
CREATE INDEX "official_communications_show_on_homepage_display_order_idx" ON "official_communications"("show_on_homepage", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "tenders_slug_key" ON "tenders"("slug");
CREATE INDEX "tenders_publication_state_public_visibility_archived_at_pub_idx" ON "tenders"("publication_state", "public_visibility", "archived_at", "published_at");
CREATE INDEX "tenders_tender_type_id_idx" ON "tenders"("tender_type_id");
CREATE INDEX "tenders_submission_deadline_idx" ON "tenders"("submission_deadline");
CREATE INDEX "tenders_show_on_homepage_display_order_idx" ON "tenders"("show_on_homepage", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_updates_slug_key" ON "procurement_updates"("slug");
CREATE INDEX "procurement_updates_publication_state_public_visibility_arc_idx" ON "procurement_updates"("publication_state", "public_visibility", "archived_at", "published_at");
CREATE INDEX "procurement_updates_procurement_update_type_id_idx" ON "procurement_updates"("procurement_update_type_id");
CREATE INDEX "procurement_updates_commodity_id_idx" ON "procurement_updates"("commodity_id");
CREATE INDEX "procurement_updates_district_id_idx" ON "procurement_updates"("district_id");
CREATE INDEX "procurement_updates_effective_date_idx" ON "procurement_updates"("effective_date");
CREATE INDEX "procurement_updates_show_on_homepage_display_order_idx" ON "procurement_updates"("show_on_homepage", "display_order");

-- AddForeignKey
ALTER TABLE "official_communications" ADD CONSTRAINT "official_communications_communication_type_id_fkey" FOREIGN KEY ("communication_type_id") REFERENCES "communication_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "official_communications" ADD CONSTRAINT "official_communications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "official_communications" ADD CONSTRAINT "official_communications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "official_communications" ADD CONSTRAINT "official_communications_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_tender_type_id_fkey" FOREIGN KEY ("tender_type_id") REFERENCES "tender_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_updates" ADD CONSTRAINT "procurement_updates_procurement_update_type_id_fkey" FOREIGN KEY ("procurement_update_type_id") REFERENCES "procurement_update_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procurement_updates" ADD CONSTRAINT "procurement_updates_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procurement_updates" ADD CONSTRAINT "procurement_updates_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procurement_updates" ADD CONSTRAINT "procurement_updates_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procurement_updates" ADD CONSTRAINT "procurement_updates_programme_scheme_id_fkey" FOREIGN KEY ("programme_scheme_id") REFERENCES "programme_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procurement_updates" ADD CONSTRAINT "procurement_updates_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procurement_updates" ADD CONSTRAINT "procurement_updates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "procurement_updates" ADD CONSTRAINT "procurement_updates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
