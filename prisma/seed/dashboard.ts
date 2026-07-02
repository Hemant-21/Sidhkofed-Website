/**
 * Idempotent dashboard seeder (development-rules §1 — "fixed dashboard report keys").
 *
 * The public dashboard is a FIXED set of predefined reports (CMS requirements §13). This seeder
 * upserts exactly those 13 report definitions by their stable `report_key`. Reports are created as
 * `draft` so a Publisher decides public exposure; re-running never changes a report's publication
 * state or its admin-managed visibility/order. `layout_config` is a bounded fixed-layout descriptor,
 * never a user-defined report builder.
 */
import type { PrismaClient } from '@prisma/client';
import { FIXED_DASHBOARD_REPORTS } from '@/modules/dashboard/dashboard.types';

export async function seedDashboardReports(
  prisma: PrismaClient,
  superAdminUserId: string,
): Promise<void> {
  for (const r of FIXED_DASHBOARD_REPORTS) {
    const layoutConfig = { layout: 'fixed', default_source: r.defaultSource };
    await prisma.dashboardReport.upsert({
      where: { reportKey: r.reportKey },
      // Re-runs keep editor-managed fields (publication state, visibility, order, layout) intact;
      // only the canonical title is reconciled to the catalog.
      update: { titleEn: r.titleEn },
      create: {
        reportKey: r.reportKey,
        titleEn: r.titleEn,
        displayOrder: r.displayOrder,
        layoutConfig,
        isActive: true,
        publicationState: 'draft',
        createdById: superAdminUserId,
        updatedById: superAdminUserId,
      },
    });
  }
  console.log(`  ✓ dashboard reports: ${FIXED_DASHBOARD_REPORTS.length} (fixed keys)`);
}
