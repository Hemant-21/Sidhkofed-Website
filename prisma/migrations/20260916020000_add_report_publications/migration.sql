-- AlterTable
ALTER TABLE "financial_years" ADD COLUMN     "current_report_publication_id" UUID;

-- CreateTable
CREATE TABLE "report_publications" (
    "id" UUID NOT NULL,
    "financial_year_id" UUID NOT NULL,
    "calculation_version" INTEGER NOT NULL,
    "fy_start_date" DATE NOT NULL,
    "fy_end_date" DATE NOT NULL,
    "programme_report" JSONB NOT NULL,
    "district_report" JSONB NOT NULL,
    "commodity_report" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_publications_financial_year_id_published_at_idx" ON "report_publications"("financial_year_id", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "financial_years_current_report_publication_id_key" ON "financial_years"("current_report_publication_id");

-- AddForeignKey
ALTER TABLE "financial_years" ADD CONSTRAINT "financial_years_current_report_publication_id_fkey" FOREIGN KEY ("current_report_publication_id") REFERENCES "report_publications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_publications" ADD CONSTRAINT "report_publications_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_publications" ADD CONSTRAINT "report_publications_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

