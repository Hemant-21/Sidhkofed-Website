-- Masters module (Phase 4) — database-schema-design.md Part 4 / Part 13.
-- Reusable lookup tables referenced by FK from later content modules. All share the
-- master shape (name_en UNIQUE, slug UNIQUE, is_active, display_order); financial_years
-- and reporting_periods carry their period-specific columns. FKs use ON DELETE RESTRICT
-- so a master in use cannot be removed (activate/deactivate only — no delete endpoint).

-- CreateEnum
CREATE TYPE "ReportingPeriodType" AS ENUM ('month', 'financial_year', 'calendar_year', 'cumulative');

-- CreateTable
CREATE TABLE "event_types" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_types" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commodities" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "description_en" TEXT,
    "description_hi" TEXT,
    "icon_media_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commodities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Jharkhand',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL,
    "district_id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_types" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_categories" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_types" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tender_types" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tender_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_update_types" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_update_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_categories" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_types" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiry_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_years" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporting_periods" (
    "id" UUID NOT NULL,
    "financial_year_id" UUID,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "period_type" "ReportingPeriodType" NOT NULL,
    "calendar_year" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_types_name_en_key" ON "event_types"("name_en");
CREATE UNIQUE INDEX "event_types_slug_key" ON "event_types"("slug");
CREATE UNIQUE INDEX "training_types_name_en_key" ON "training_types"("name_en");
CREATE UNIQUE INDEX "training_types_slug_key" ON "training_types"("slug");
CREATE UNIQUE INDEX "commodities_name_en_key" ON "commodities"("name_en");
CREATE UNIQUE INDEX "commodities_slug_key" ON "commodities"("slug");
CREATE UNIQUE INDEX "districts_name_en_key" ON "districts"("name_en");
CREATE UNIQUE INDEX "districts_slug_key" ON "districts"("slug");
CREATE UNIQUE INDEX "blocks_slug_key" ON "blocks"("slug");
CREATE INDEX "blocks_district_id_idx" ON "blocks"("district_id");
CREATE UNIQUE INDEX "blocks_district_id_name_en_key" ON "blocks"("district_id", "name_en");
CREATE UNIQUE INDEX "institution_types_name_en_key" ON "institution_types"("name_en");
CREATE UNIQUE INDEX "institution_types_slug_key" ON "institution_types"("slug");
CREATE UNIQUE INDEX "document_types_name_en_key" ON "document_types"("name_en");
CREATE UNIQUE INDEX "document_types_slug_key" ON "document_types"("slug");
CREATE UNIQUE INDEX "knowledge_categories_name_en_key" ON "knowledge_categories"("name_en");
CREATE UNIQUE INDEX "knowledge_categories_slug_key" ON "knowledge_categories"("slug");
CREATE UNIQUE INDEX "communication_types_name_en_key" ON "communication_types"("name_en");
CREATE UNIQUE INDEX "communication_types_slug_key" ON "communication_types"("slug");
CREATE UNIQUE INDEX "tender_types_name_en_key" ON "tender_types"("name_en");
CREATE UNIQUE INDEX "tender_types_slug_key" ON "tender_types"("slug");
CREATE UNIQUE INDEX "procurement_update_types_name_en_key" ON "procurement_update_types"("name_en");
CREATE UNIQUE INDEX "procurement_update_types_slug_key" ON "procurement_update_types"("slug");
CREATE UNIQUE INDEX "faq_categories_name_en_key" ON "faq_categories"("name_en");
CREATE UNIQUE INDEX "faq_categories_slug_key" ON "faq_categories"("slug");
CREATE UNIQUE INDEX "enquiry_types_name_en_key" ON "enquiry_types"("name_en");
CREATE UNIQUE INDEX "enquiry_types_slug_key" ON "enquiry_types"("slug");
CREATE UNIQUE INDEX "financial_years_label_key" ON "financial_years"("label");
CREATE UNIQUE INDEX "reporting_periods_slug_key" ON "reporting_periods"("slug");
CREATE INDEX "reporting_periods_financial_year_id_idx" ON "reporting_periods"("financial_year_id");
CREATE UNIQUE INDEX "tags_name_en_key" ON "tags"("name_en");
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- AddForeignKey
ALTER TABLE "commodities" ADD CONSTRAINT "commodities_icon_media_id_fkey" FOREIGN KEY ("icon_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reporting_periods" ADD CONSTRAINT "reporting_periods_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
