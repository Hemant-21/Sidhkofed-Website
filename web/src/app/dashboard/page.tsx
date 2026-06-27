import type { Metadata } from 'next';
import { getOneSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DashboardResponse } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { LocalizedHeading, LocalizedText } from '@/components/listing/localized-heading';
import { ReportBlock } from '@/components/dashboard/report-block';
import { EmptyState } from '@/components/feedback/states';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Public dashboard',
  description: 'Fixed public reports and impact figures, sourced from the CMS.',
  path: '/dashboard',
});

// Fixed public reports only (codex §13). Figures are resolved server-side by the
// backend; the website never computes a metric.
export default async function DashboardPage() {
  const data = await getOneSafe<DashboardResponse>(PUBLIC_ENDPOINTS.dashboard);
  const reports = data?.reports ?? [];

  return (
    <>
      <Breadcrumbs items={[{ label: 'Public dashboard' }]} />
      <Container className="py-8">
        <header className="mb-6">
          <LocalizedHeading titleKey="page.dashboard.title" as="h1" />
          <LocalizedText textKey="page.dashboard.subtitle" className="-mt-1 max-w-3xl text-muted-foreground" />
        </header>

        {reports.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {reports.map((report) => (
              <ReportBlock key={report.report_key} report={report} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
