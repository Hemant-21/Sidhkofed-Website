import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DashboardReport } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { ReportBlock } from '@/components/dashboard/report-block';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (key: string) =>
  getOneOrNull<DashboardReport>(`${PUBLIC_ENDPOINTS.dashboard}/${encodeURIComponent(key)}`);

export async function generateMetadata({ params }: { params: { report: string } }): Promise<Metadata> {
  const report = await load(params.report);
  if (!report) return { title: 'Report not found' };
  return buildMetadata({
    title: report.title_en,
    description: report.description_en,
    path: report.public_url,
  });
}

export default async function DashboardReportPage({ params }: { params: { report: string } }) {
  const report = await load(params.report);
  if (!report) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Public dashboard', url: '/dashboard' },
          { name: report.title_en, url: report.public_url },
        ]}
      />
      <Breadcrumbs items={[{ label: 'Public dashboard', href: '/dashboard' }, { label: report.title_en }]} />
      <Container className="py-8">
        <ReportBlock report={report} linked={false} />
      </Container>
    </>
  );
}
