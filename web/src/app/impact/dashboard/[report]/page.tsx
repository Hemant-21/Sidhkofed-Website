import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DashboardResponse } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { ReportBlock } from '@/components/dashboard/report-block';

export const revalidate = 300;

const load = () => getOneSafe<DashboardResponse>(PUBLIC_ENDPOINTS.dashboard);

export async function generateMetadata({ params }: { params: { report: string } }): Promise<Metadata> {
  const data = await load();
  const report = data?.reports.find((r) => r.report_key === params.report);
  if (!report) return { title: 'Report not found' };
  return buildMetadata({
    title: report.title_en,
    description: report.description_en ?? null,
    path: `/impact/dashboard/${params.report}`,
  });
}

export default async function DashboardReportPage({ params }: { params: { report: string } }) {
  const data = await load();
  const report = data?.reports.find((r) => r.report_key === params.report);
  if (!report) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Impact', href: '/impact' },
          { label: 'Public Dashboard', href: '/impact/dashboard' },
          { label: report.title_en },
        ]}
      />
      <Container className="py-8">
        <ReportBlock report={report} linked={false} />
      </Container>
    </>
  );
}
