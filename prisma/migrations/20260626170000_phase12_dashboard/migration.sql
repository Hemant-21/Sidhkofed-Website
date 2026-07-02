-- Phase 12 — Dashboard (Part 8). Fixed reports + normalized metrics + ingest datasets.
-- Additive only: three new tables + one enum + the FK back-references. No existing table is
-- altered destructively (development-rules §1 additive-first).

-- CreateEnum
CREATE TYPE "DatasetSource" AS ENUM ('cms_derived', 'manual', 'excel');

-- CreateTable
CREATE TABLE "dashboard_reports" (
    "id" UUID NOT NULL,
    "report_key" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_hi" TEXT,
    "description_en" TEXT,
    "description_hi" TEXT,
    "layout_config" JSONB,
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
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_metrics" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "metric_key" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_hi" TEXT,
    "value" DECIMAL(18,4),
    "value_text" TEXT,
    "unit" TEXT,
    "financial_year_id" UUID,
    "reporting_period_id" UUID,
    "source" "DatasetSource" NOT NULL DEFAULT 'manual',
    "dataset_id" UUID,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_datasets" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "source" "DatasetSource" NOT NULL,
    "financial_year_id" UUID,
    "reporting_period_id" UUID,
    "source_file_asset_id" UUID,
    "raw_rows" JSONB,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_at" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_reports_report_key_key" ON "dashboard_reports"("report_key");

-- CreateIndex
CREATE INDEX "dashboard_reports_publication_state_public_visibility_archi_idx" ON "dashboard_reports"("publication_state", "public_visibility", "archived_at", "published_at");

-- CreateIndex
CREATE INDEX "dashboard_reports_show_on_homepage_display_order_idx" ON "dashboard_reports"("show_on_homepage", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_metrics_report_id_metric_key_financial_year_id_rep_key" ON "dashboard_metrics"("report_id", "metric_key", "financial_year_id", "reporting_period_id");

-- CreateIndex
CREATE INDEX "dashboard_metrics_report_id_financial_year_id_reporting_peri_idx" ON "dashboard_metrics"("report_id", "financial_year_id", "reporting_period_id");

-- CreateIndex
CREATE INDEX "dashboard_datasets_report_id_idx" ON "dashboard_datasets"("report_id");

-- AddForeignKey
ALTER TABLE "dashboard_reports" ADD CONSTRAINT "dashboard_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_reports" ADD CONSTRAINT "dashboard_reports_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_metrics" ADD CONSTRAINT "dashboard_metrics_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "dashboard_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_metrics" ADD CONSTRAINT "dashboard_metrics_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_metrics" ADD CONSTRAINT "dashboard_metrics_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "reporting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_metrics" ADD CONSTRAINT "dashboard_metrics_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "dashboard_datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_metrics" ADD CONSTRAINT "dashboard_metrics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_metrics" ADD CONSTRAINT "dashboard_metrics_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_datasets" ADD CONSTRAINT "dashboard_datasets_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "dashboard_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_datasets" ADD CONSTRAINT "dashboard_datasets_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_datasets" ADD CONSTRAINT "dashboard_datasets_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "reporting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_datasets" ADD CONSTRAINT "dashboard_datasets_source_file_asset_id_fkey" FOREIGN KEY ("source_file_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_datasets" ADD CONSTRAINT "dashboard_datasets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
