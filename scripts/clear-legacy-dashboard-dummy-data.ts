/**
 * One-time cleanup: delete every `DashboardMetric` and `DashboardDataset` row.
 *
 * Context (Stage 7 of the Operational Reports / Website Metrics cutover): the manual
 * metric-entry and Excel/CSV dataset-import admin routes were fully removed
 * (`src/modules/dashboard/dashboard.routes.ts` no longer registers them; `metrics.service.ts`,
 * `datasets.service.ts`, and `dataset-parser.ts` were deleted). The `DashboardMetric`/
 * `DashboardDataset` rows in every environment seeded before this change are dummy/test data with
 * no remaining CMS write path to manage or correct them, so they are cleared rather than kept as
 * stale, unmanageable figures. `DashboardReport` rows (the report DEFINITIONS — title, layout,
 * publication state) are NOT touched; the public dashboard keeps rendering those reports, now with
 * an empty `metrics` array until Operational Reports / Website Metrics populate the fixed layout by
 * other means.
 *
 * FK order: `DashboardMetric.datasetId` references `DashboardDataset` (no cascade configured in
 * `prisma/schema.prisma`), so metrics are deleted before datasets.
 *
 * This script is intentionally NOT wired into `npm run db:seed` or any startup path — it is a
 * one-off, run manually, once, per environment:
 *
 *   npx tsx scripts/clear-legacy-dashboard-dummy-data.ts
 *
 * It targets whatever `DATABASE_URL` is active in the environment it runs in (loaded via
 * `@/config/env` -> `.env`, same as every other script in `scripts/`). Run it ONLY against a
 * database you intend to clear — the local dev DB when developing, and separately, deliberately,
 * against staging/production by whoever owns that environment's deployment (see the delivery notes
 * for this change). It is kept in the repo (not deleted after first use) so it is available for
 * that follow-up run.
 */
import { prisma, disconnectDatabase } from '@/db/prisma';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? '(unset)';
  console.log(`Target database: ${databaseUrl}`);

  const [metricsBefore, datasetsBefore] = await Promise.all([
    prisma.dashboardMetric.count(),
    prisma.dashboardDataset.count(),
  ]);
  console.log(`Before: dashboard_metrics=${metricsBefore}, dashboard_datasets=${datasetsBefore}`);

  // Metrics first: DashboardMetric.datasetId -> DashboardDataset has no ON DELETE CASCADE.
  const deletedMetrics = await prisma.dashboardMetric.deleteMany({});
  const deletedDatasets = await prisma.dashboardDataset.deleteMany({});

  const [metricsAfter, datasetsAfter] = await Promise.all([
    prisma.dashboardMetric.count(),
    prisma.dashboardDataset.count(),
  ]);

  console.log(`Deleted: metrics=${deletedMetrics.count}, datasets=${deletedDatasets.count}`);
  console.log(`After: dashboard_metrics=${metricsAfter}, dashboard_datasets=${datasetsAfter}`);
  console.log('DashboardReport rows were left untouched (report definitions are not dummy data).');
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
