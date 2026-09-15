-- Historical assignments are exported before applying this migration.
ALTER TABLE "events" DROP COLUMN "training_type_id";
DROP TABLE "programme_permitted_training_types";
DROP TABLE "training_types";
UPDATE "website_metrics"
SET "filter_config" = "filter_config" - 'trainingTypeId',
    "calculation_version" = CASE WHEN "report_key" = 'training_attendance' THEN 2 ELSE "calculation_version" END,
    "config_revision" = "config_revision" + 1,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "filter_config" ? 'trainingTypeId' OR "report_key" = 'training_attendance';
UPDATE "website_metric_snapshots" SET "flagged_for_review" = true
WHERE "metric_id" IN (SELECT "id" FROM "website_metrics" WHERE "report_key" = 'training_attendance');
