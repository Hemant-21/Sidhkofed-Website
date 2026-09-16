-- Task 7: retire Website Metrics. The two tables have a circular FK
-- (website_metrics.current_snapshot_id -> website_metric_snapshots,
-- website_metric_snapshots.metric_id -> website_metrics), so drop the pointer constraint first,
-- then both tables (no other table references either of them).
ALTER TABLE "website_metrics" DROP CONSTRAINT IF EXISTS "website_metrics_current_snapshot_id_fkey";
DROP TABLE IF EXISTS "website_metric_snapshots";
DROP TABLE IF EXISTS "website_metrics";
