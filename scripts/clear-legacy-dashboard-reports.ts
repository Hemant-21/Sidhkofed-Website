/**
 * One-time cleanup: delete every `DashboardReport` row.
 *
 * Context: the public website's `/impact/dashboard` page and homepage previously read the fixed
 * `DashboardReport`/`DashboardMetric` rows via `/api/v1/public/dashboard*`. That whole concept is now
 * retired — the public routes, the admin report-definition CRUD/lifecycle routes
 * (`/api/v1/admin/dashboard/reports*`), the `seedDashboardReports()` seeder, and the CMS
 * "Dashboard Reports" management page are all removed. `DashboardMetric`/`DashboardDataset` rows were
 * already cleared by `scripts/clear-legacy-dashboard-dummy-data.ts` in a prior cleanup; this script
 * finishes the job by clearing the 13 fixed `DashboardReport` definition rows that were deliberately
 * left in place until the retirement was complete.
 *
 * This script is intentionally NOT wired into `npm run db:seed` or any startup path — it is a
 * one-off, run manually, once, per environment:
 *
 *   npx tsx scripts/clear-legacy-dashboard-reports.ts
 *
 * It targets whatever `DATABASE_URL` is active in the environment it runs in (loaded via
 * `@/config/env` -> `.env`, same as every other script in `scripts/`). Run it ONLY against a
 * database you intend to clear — the local dev DB when developing, and separately, deliberately,
 * against staging/production by whoever owns that environment's deployment.
 *
 * Does NOT drop the `DashboardReport` table/model itself — schema-level removal stays a separate,
 * later cleanup per the existing project convention (see `clear-legacy-dashboard-dummy-data.ts`,
 * which followed the same rule for `DashboardMetric`/`DashboardDataset`).
 */
import { prisma, disconnectDatabase } from '@/db/prisma';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? '(unset)';
  console.log(`Target database: ${databaseUrl}`);

  const reportsBefore = await prisma.dashboardReport.count();
  console.log(`Before: dashboard_reports=${reportsBefore}`);

  const deletedReports = await prisma.dashboardReport.deleteMany({});

  const reportsAfter = await prisma.dashboardReport.count();

  console.log(`Deleted: reports=${deletedReports.count}`);
  console.log(`After: dashboard_reports=${reportsAfter}`);
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
