-- Phase 6 — Events, Event News, Programme & Scheme, Institutions, and shared relationships.
-- database-schema-design.md Part 6 / Part 13. PURELY ADDITIVE: new enums + new tables only.
-- No existing table is altered (the back-relations added to event_types / commodities /
-- districts / media_assets / documents / ... are Prisma-level only; the FK columns live on the
-- NEW tables created here). This keeps `prisma migrate deploy` forward-only and non-destructive.
--
-- onDelete contract (Part 13 verbatim, scope-trimmed):
--   *.event_type_id / training_type_id / district_id / block_id / institution_type_id  -> RESTRICT
--   *.cover_media_id / logo_media_id / created_by / updated_by                          -> SET NULL
--   event_field_definitions.event_type_id                                               -> CASCADE
--   event_news.event_id                                                                 -> RESTRICT
--   junction.<parent content>_id (event_id / programme_scheme_id / document_id)         -> CASCADE
--   junction.<master / linked content>_id (commodity / institution / document / ...)    -> RESTRICT
--
-- Toolkit distribution, procurement, enquiry, and membership back-relations from Part 13 are
-- intentionally NOT created here (those modules are out of Phase 6 scope); they land additively.

-- CreateEnum
CREATE TYPE "DateMode" AS ENUM ('single', 'range', 'multi_day');
CREATE TYPE "EventStatus" AS ENUM ('scheduled', 'ongoing', 'completed', 'postponed', 'cancelled');
CREATE TYPE "FieldDataType" AS ENUM ('text', 'textarea', 'number', 'date', 'boolean', 'select');
CREATE TYPE "TranslationSource" AS ENUM ('manual', 'automatic', 'missing');

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "event_type_id" UUID NOT NULL,
    "training_type_id" UUID,
    "title_en" TEXT NOT NULL,
    "title_hi" TEXT,
    "summary_en" TEXT,
    "summary_hi" TEXT,
    "description_en" TEXT,
    "description_hi" TEXT,
    "date_mode" "DateMode" NOT NULL DEFAULT 'single',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "location_text" TEXT,
    "district_id" UUID,
    "block_id" UUID,
    "cover_media_id" UUID,
    "event_status" "EventStatus" NOT NULL DEFAULT 'scheduled',
    "status_override" BOOLEAN NOT NULL DEFAULT false,
    "cancellation_reason" TEXT,
    "revised_start_date" DATE,
    "dynamic_values" JSONB,
    "outcome_summary_en" TEXT,
    "outcome_summary_hi" TEXT,
    "key_highlights" TEXT,
    "final_participant_count" INTEGER,
    "participant_male_count" INTEGER,
    "participant_female_count" INTEGER,
    "participant_other_count" INTEGER,
    "completion_remarks_en" TEXT,
    "completion_remarks_hi" TEXT,
    "completed_date" DATE,
    "translation_source" "TranslationSource" NOT NULL DEFAULT 'manual',
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

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_field_definitions" (
    "id" UUID NOT NULL,
    "event_type_id" UUID NOT NULL,
    "field_key" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_hi" TEXT,
    "data_type" "FieldDataType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_news" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_hi" TEXT,
    "summary_en" TEXT,
    "summary_hi" TEXT,
    "body_en" TEXT,
    "body_hi" TEXT,
    "cover_media_id" UUID,
    "news_published_at" TIMESTAMP(3),
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

    CONSTRAINT "event_news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_commodities" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "commodity_id" UUID NOT NULL,

    CONSTRAINT "event_commodities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_programmes" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "programme_scheme_id" UUID NOT NULL,

    CONSTRAINT "event_programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_institutions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,

    CONSTRAINT "event_institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_documents" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,

    CONSTRAINT "event_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_galleries" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,

    CONSTRAINT "event_galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_schemes" (
    "id" UUID NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_hi" TEXT,
    "short_code" TEXT,
    "summary_en" TEXT,
    "summary_hi" TEXT,
    "description_en" TEXT,
    "description_hi" TEXT,
    "objectives_en" TEXT,
    "objectives_hi" TEXT,
    "eligibility_en" TEXT,
    "eligibility_hi" TEXT,
    "benefits_en" TEXT,
    "benefits_hi" TEXT,
    "application_process_en" TEXT,
    "application_process_hi" TEXT,
    "funding_source" TEXT,
    "start_date" DATE,
    "end_date" DATE,
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

    CONSTRAINT "programme_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_commodities" (
    "id" UUID NOT NULL,
    "programme_scheme_id" UUID NOT NULL,
    "commodity_id" UUID NOT NULL,

    CONSTRAINT "programme_commodities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_permitted_training_types" (
    "id" UUID NOT NULL,
    "programme_scheme_id" UUID NOT NULL,
    "training_type_id" UUID NOT NULL,

    CONSTRAINT "programme_permitted_training_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "institution_type_id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "description_en" TEXT,
    "description_hi" TEXT,
    "address_en" TEXT,
    "address_hi" TEXT,
    "website_url" TEXT,
    "logo_media_id" UUID,
    "district_id" UUID,
    "contact_email" TEXT,
    "contact_phone" TEXT,
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

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_programmes" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "programme_scheme_id" UUID NOT NULL,

    CONSTRAINT "document_programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_institutions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,

    CONSTRAINT "document_institutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
CREATE INDEX "events_publication_state_public_visibility_archived_at_publ_idx" ON "events"("publication_state", "public_visibility", "archived_at", "published_at");
CREATE INDEX "events_start_date_idx" ON "events"("start_date");
CREATE INDEX "events_show_on_homepage_display_order_idx" ON "events"("show_on_homepage", "display_order");
CREATE INDEX "events_event_type_id_idx" ON "events"("event_type_id");
CREATE INDEX "events_district_id_idx" ON "events"("district_id");
CREATE INDEX "events_event_status_idx" ON "events"("event_status");

-- CreateIndex
CREATE INDEX "event_field_definitions_event_type_id_idx" ON "event_field_definitions"("event_type_id");
CREATE UNIQUE INDEX "event_field_definitions_event_type_id_field_key_key" ON "event_field_definitions"("event_type_id", "field_key");

-- CreateIndex
CREATE UNIQUE INDEX "event_news_slug_key" ON "event_news"("slug");
CREATE INDEX "event_news_publication_state_public_visibility_archived_at__idx" ON "event_news"("publication_state", "public_visibility", "archived_at", "published_at");
CREATE INDEX "event_news_news_published_at_idx" ON "event_news"("news_published_at");
CREATE INDEX "event_news_event_id_idx" ON "event_news"("event_id");

-- CreateIndex
CREATE INDEX "event_commodities_commodity_id_event_id_idx" ON "event_commodities"("commodity_id", "event_id");
CREATE UNIQUE INDEX "event_commodities_event_id_commodity_id_key" ON "event_commodities"("event_id", "commodity_id");

-- CreateIndex
CREATE INDEX "event_programmes_programme_scheme_id_event_id_idx" ON "event_programmes"("programme_scheme_id", "event_id");
CREATE UNIQUE INDEX "event_programmes_event_id_programme_scheme_id_key" ON "event_programmes"("event_id", "programme_scheme_id");

-- CreateIndex
CREATE INDEX "event_institutions_institution_id_event_id_idx" ON "event_institutions"("institution_id", "event_id");
CREATE UNIQUE INDEX "event_institutions_event_id_institution_id_key" ON "event_institutions"("event_id", "institution_id");

-- CreateIndex
CREATE INDEX "event_documents_document_id_event_id_idx" ON "event_documents"("document_id", "event_id");
CREATE UNIQUE INDEX "event_documents_event_id_document_id_key" ON "event_documents"("event_id", "document_id");

-- CreateIndex
CREATE INDEX "event_galleries_gallery_id_event_id_idx" ON "event_galleries"("gallery_id", "event_id");
CREATE UNIQUE INDEX "event_galleries_event_id_gallery_id_key" ON "event_galleries"("event_id", "gallery_id");

-- CreateIndex
CREATE UNIQUE INDEX "programme_schemes_slug_key" ON "programme_schemes"("slug");
CREATE INDEX "programme_schemes_publication_state_public_visibility_archi_idx" ON "programme_schemes"("publication_state", "public_visibility", "archived_at", "published_at");
CREATE INDEX "programme_schemes_show_on_homepage_display_order_idx" ON "programme_schemes"("show_on_homepage", "display_order");

-- CreateIndex
CREATE INDEX "programme_commodities_commodity_id_programme_scheme_id_idx" ON "programme_commodities"("commodity_id", "programme_scheme_id");
CREATE UNIQUE INDEX "programme_commodities_programme_scheme_id_commodity_id_key" ON "programme_commodities"("programme_scheme_id", "commodity_id");

-- CreateIndex
CREATE INDEX "programme_permitted_training_types_training_type_id_program_idx" ON "programme_permitted_training_types"("training_type_id", "programme_scheme_id");
CREATE UNIQUE INDEX "programme_permitted_training_types_programme_scheme_id_trai_key" ON "programme_permitted_training_types"("programme_scheme_id", "training_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_slug_key" ON "institutions"("slug");
CREATE INDEX "institutions_publication_state_public_visibility_archived_a_idx" ON "institutions"("publication_state", "public_visibility", "archived_at", "published_at");
CREATE INDEX "institutions_institution_type_id_idx" ON "institutions"("institution_type_id");
CREATE INDEX "institutions_district_id_idx" ON "institutions"("district_id");
CREATE INDEX "institutions_show_on_homepage_display_order_idx" ON "institutions"("show_on_homepage", "display_order");

-- CreateIndex
CREATE INDEX "document_programmes_programme_scheme_id_document_id_idx" ON "document_programmes"("programme_scheme_id", "document_id");
CREATE UNIQUE INDEX "document_programmes_document_id_programme_scheme_id_key" ON "document_programmes"("document_id", "programme_scheme_id");

-- CreateIndex
CREATE INDEX "document_institutions_institution_id_document_id_idx" ON "document_institutions"("institution_id", "document_id");
CREATE UNIQUE INDEX "document_institutions_document_id_institution_id_key" ON "document_institutions"("document_id", "institution_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_training_type_id_fkey" FOREIGN KEY ("training_type_id") REFERENCES "training_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_field_definitions" ADD CONSTRAINT "event_field_definitions_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_news" ADD CONSTRAINT "event_news_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_news" ADD CONSTRAINT "event_news_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_news" ADD CONSTRAINT "event_news_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_news" ADD CONSTRAINT "event_news_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_commodities" ADD CONSTRAINT "event_commodities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_commodities" ADD CONSTRAINT "event_commodities_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_programmes" ADD CONSTRAINT "event_programmes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_programmes" ADD CONSTRAINT "event_programmes_programme_scheme_id_fkey" FOREIGN KEY ("programme_scheme_id") REFERENCES "programme_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_institutions" ADD CONSTRAINT "event_institutions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_institutions" ADD CONSTRAINT "event_institutions_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_documents" ADD CONSTRAINT "event_documents_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_documents" ADD CONSTRAINT "event_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_galleries" ADD CONSTRAINT "event_galleries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_galleries" ADD CONSTRAINT "event_galleries_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_schemes" ADD CONSTRAINT "programme_schemes_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "programme_schemes" ADD CONSTRAINT "programme_schemes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "programme_schemes" ADD CONSTRAINT "programme_schemes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_commodities" ADD CONSTRAINT "programme_commodities_programme_scheme_id_fkey" FOREIGN KEY ("programme_scheme_id") REFERENCES "programme_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_commodities" ADD CONSTRAINT "programme_commodities_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_permitted_training_types" ADD CONSTRAINT "programme_permitted_training_types_programme_scheme_id_fkey" FOREIGN KEY ("programme_scheme_id") REFERENCES "programme_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programme_permitted_training_types" ADD CONSTRAINT "programme_permitted_training_types_training_type_id_fkey" FOREIGN KEY ("training_type_id") REFERENCES "training_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_institution_type_id_fkey" FOREIGN KEY ("institution_type_id") REFERENCES "institution_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_logo_media_id_fkey" FOREIGN KEY ("logo_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_programmes" ADD CONSTRAINT "document_programmes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_programmes" ADD CONSTRAINT "document_programmes_programme_scheme_id_fkey" FOREIGN KEY ("programme_scheme_id") REFERENCES "programme_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_institutions" ADD CONSTRAINT "document_institutions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_institutions" ADD CONSTRAINT "document_institutions_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
