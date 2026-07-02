-- Phase 12 remediation — Issue 3: dashboard metric uniqueness across NULL dimensions.
--
-- The original unique index (report_id, metric_key, financial_year_id, reporting_period_id) used the
-- default NULLS DISTINCT semantics, so two metrics with the SAME key but a NULL financial_year_id /
-- reporting_period_id were NOT treated as duplicates — letting a report double-count a "cumulative"
-- (period-less) metric. NULLS NOT DISTINCT (PostgreSQL 15+) makes those NULLs collide, so the metric
-- key is unique even when the period dimensions are omitted. The service pre-checks the same key and
-- maps the resulting P2002 to a 409 Conflict for the concurrent (race) case.
--
-- Forward-only and idempotent: drop the previous index (under either the auto-generated name or the
-- mapped name) and recreate it with NULLS NOT DISTINCT under the stable mapped name.

-- DropIndex (previous auto-generated name from the phase-12 migration, if present)
DROP INDEX IF EXISTS "dashboard_metrics_report_id_metric_key_financial_year_id_rep_key";

-- DropIndex (mapped name, if a prior run already created it)
DROP INDEX IF EXISTS "dashboard_metrics_unique";

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_metrics_unique"
  ON "dashboard_metrics"(
    "report_id",
    "metric_key",
    "financial_year_id",
    "reporting_period_id"
  ) NULLS NOT DISTINCT;
