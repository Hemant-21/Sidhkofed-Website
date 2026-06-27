import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull, getOneSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { ToolkitDetail, ToolkitDistributionSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { DetailLayout } from '@/components/content/detail-layout';
import { ToolkitArticle } from '@/components/details/toolkit-detail';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (slug: string) => getOneOrNull<ToolkitDetail>(detailPath(PUBLIC_ENDPOINTS.toolkits, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const toolkit = await load(params.slug);
  if (!toolkit) return { title: 'Toolkit not found' };
  return buildMetadata({
    title: toolkit.title_en,
    description: toolkit.summary_en,
    path: toolkit.public_url,
    image: toolkit.cover_media?.url ?? null,
  });
}

export default async function ToolkitDetailPage({ params }: { params: { slug: string } }) {
  const toolkit = await load(params.slug);
  if (!toolkit) notFound();

  const summary = await getOneSafe<ToolkitDistributionSummary>(
    `${detailPath(PUBLIC_ENDPOINTS.toolkits, params.slug)}/distribution-summary`,
  );

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Toolkits', url: '/toolkits' },
          { name: toolkit.title_en, url: toolkit.public_url },
        ]}
      />
      <DetailLayout crumbs={[{ label: 'Toolkits', href: '/toolkits' }, { label: toolkit.title_en }]}>
        <ToolkitArticle toolkit={toolkit} summary={summary} />
      </DetailLayout>
    </>
  );
}
