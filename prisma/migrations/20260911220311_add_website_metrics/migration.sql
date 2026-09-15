-- CreateTable
CREATE TABLE "website_metrics" (
    "id" UUID NOT NULL,
    "metric_key" TEXT NOT NULL,
    "report_key" TEXT NOT NULL,
    "measure_key" TEXT NOT NULL,
    "calculation_version" INTEGER NOT NULL,
    "filter_config" JSONB NOT NULL,
    "period_config" JSONB NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_hi" TEXT,
    "placement_key" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "config_revision" INTEGER NOT NULL DEFAULT 1,
    "current_snapshot_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_metric_snapshots" (
    "id" UUID NOT NULL,
    "metric_id" UUID NOT NULL,
    "config_revision" INTEGER NOT NULL,
    "resolved_filters" JSONB NOT NULL,
    "resolved_period" JSONB NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "label_en" TEXT NOT NULL,
    "label_hi" TEXT,
    "definition_note_en" TEXT NOT NULL,
    "definition_note_hi" TEXT,
    "completeness" JSONB NOT NULL,
    "public_scope_policy_version" INTEGER NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" UUID NOT NULL,
    "flagged_for_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "website_metrics_metric_key_key" ON "website_metrics"("metric_key");

-- CreateIndex
CREATE UNIQUE INDEX "website_metrics_current_snapshot_id_key" ON "website_metrics"("current_snapshot_id");

-- CreateIndex
CREATE INDEX "website_metrics_placement_key_is_enabled_is_archived_idx" ON "website_metrics"("placement_key", "is_enabled", "is_archived");

-- CreateIndex
CREATE INDEX "website_metric_snapshots_metric_id_published_at_idx" ON "website_metric_snapshots"("metric_id", "published_at");

-- AddForeignKey
ALTER TABLE "website_metrics" ADD CONSTRAINT "website_metrics_current_snapshot_id_fkey" FOREIGN KEY ("current_snapshot_id") REFERENCES "website_metric_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_metric_snapshots" ADD CONSTRAINT "website_metric_snapshots_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "website_metrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
