import type { Metadata } from 'next';
import { getOneSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DashboardResponse, DashboardReport, KpisResponse } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { LocalizedHeading, LocalizedText } from '@/components/listing/localized-heading';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { ReportBlock } from '@/components/dashboard/report-block';
import { EmptyState } from '@/components/feedback/states';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Public dashboard',
  description: 'Fixed public reports and impact figures, sourced from the CMS.',
  path: '/impact/dashboard',
});

/**
 * Report groups. `DashboardReport` has no `category` field (the 13 reports are a fixed,
 * backend-defined catalog — src/modules/dashboard/dashboard.types.ts → FIXED_DASHBOARD_REPORTS),
 * so grouping is a web-only presentational lookup by `report_key`, not a schema concept.
 * Any report whose key isn't listed here still renders, under the "Other Reports" catch-all
 * below — so a future addition to the backend's fixed-report catalog is never silently dropped.
 */
const REPORT_GROUPS: { titleKey: string; reportKeys: string[] }[] = [
  {
    titleKey: 'page.dashboard.group.training',
    reportKeys: [
      'training_summary',
      'beneficiaries_reached',
      'activities_events_summary',
      'district_geographical_coverage',
    ],
  },
  {
    titleKey: 'page.dashboard.group.procurement',
    reportKeys: ['procurement_summary', 'commodity_wise_activities', 'commodity_wise_toolkit_distribution'],
  },
  {
    titleKey: 'page.dashboard.group.membership',
    reportKeys: [
      'sidhkofed_primary_membership',
      'sidhkofed_nominal_membership',
      'du_primary_membership',
      'du_nominal_membership',
    ],
  },
  {
    titleKey: 'page.dashboard.group.programmes',
    reportKeys: ['programme_scheme_coverage', 'partnerships_mous'],
  },
];

/** Group reports by report_key; any report not in REPORT_GROUPS falls into "Other Reports". */
function groupReports(reports: DashboardReport[]): { titleKey: string; reports: DashboardReport[] }[] {
  const byKey = new Map(reports.map((r) => [r.report_key, r] as const));
  const grouped: { titleKey: string; reports: DashboardReport[] }[] = [];
  const used = new Set<string>();

  for (const group of REPORT_GROUPS) {
    const groupReportsList = group.reportKeys.map((k) => byKey.get(k)).filter((r): r is DashboardReport => Boolean(r));
    groupReportsList.forEach((r) => used.add(r.report_key));
    if (groupReportsList.length > 0) grouped.push({ titleKey: group.titleKey, reports: groupReportsList });
  }

  const other = reports.filter((r) => !used.has(r.report_key));
  if (other.length > 0) grouped.push({ titleKey: 'page.dashboard.group.other', reports: other });

  return grouped;
}

export default async function DashboardPage() {
  const [data, kpis] = await Promise.all([
    getOneSafe<DashboardResponse>(PUBLIC_ENDPOINTS.dashboard),
    getOneSafe<KpisResponse>(PUBLIC_ENDPOINTS.dashboardKpis),
  ]);
  const reports = data?.reports ?? [];
  const groups = groupReports(reports);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Public dashboard' }]} />
      <Container className="py-8">
        <header className="mb-6">
          <LocalizedHeading titleKey="page.dashboard.title" as="h1" />
          <LocalizedText textKey="page.dashboard.subtitle" className="-mt-1 max-w-3xl text-muted-foreground" />
        </header>

        {kpis && kpis.kpis.length > 0 ? (
          <section aria-label="Key performance indicators" className="mb-10">
            <KpiStrip reports={kpis.kpis} />
          </section>
        ) : null}

        {groups.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.titleKey}>
                <LocalizedHeading titleKey={group.titleKey} as="h2" />
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {group.reports.map((report) => (
                    <ReportBlock key={report.report_key} report={report} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
